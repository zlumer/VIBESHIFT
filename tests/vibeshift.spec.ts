import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Inject mock wallet
  await page.addInitScript(() => {
    const mockSolana: any = {
      isPhantom: true,
      isConnected: true, // Start connected in tests
      publicKey: { 
        toBase58: () => 'MockWalletPublicKey111111111111111111111111',
        toString: () => 'MockWalletPublicKey111111111111111111111111'
      },
      connect: async function() {
          console.log('MOCK WALLET: connect() triggered');
          this.isConnected = true;
          this.publicKey = { 
            toBase58: () => 'MockWalletPublicKey111111111111111111111111',
            toString: () => 'MockWalletPublicKey111111111111111111111111'
          };
          // Return the expected structure
          return { publicKey: { toString: () => 'MockWalletPublicKey111111111111111111111111' } };
      },
      disconnect: async function() { this.isConnected = false; this.publicKey = null; return Promise.resolve(); },
      signTransaction: async (transaction: any) => transaction,
      signAllTransactions: async (transactions: any[]) => transactions,
      signMessage: async () => ({ signature: new Uint8Array([1, 2, 3]) }),
      on: () => {},
      request: async () => ({})
    };
    (window as any).solana = mockSolana;
    (window as any).phantom = { solana: mockSolana };
    localStorage.setItem('NEXT_PUBLIC_SKIP_PAYMENT', 'true');
  });

  // Intercept Supabase calls for games
  await page.route('**/rest/v1/games*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'test-game-1',
          title: 'Test Game 1',
          gif_preview_url: 'https://placehold.co/600x400?text=Game1',
          s3_bundle_url: 'data:text/html,<html><body><h1>Test Game 1</h1><script>window.parent.postMessage({type:\"GAME_INIT\"}, \"*\");</script></body></html>',
          status: 'published'
        }
      ])
    });
  });

  // Intercept Supabase calls for assets (needed for creation)
  await page.route('**/rest/v1/assets*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Mock payment split API
  await page.route('**/api/payment/split', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, txId: 'mock-tx-id' })
    });
  });
});

test('Scenario 1: Feed & Play', async ({ page }) => {
  await page.goto('/');
  // Debug log to see what's happening
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  // Try waiting for any text or button that should be there
  await page.waitForLoadState('networkidle');
  console.log('FINAL URL:', page.url());

  await expect(page.locator('.swiper')).toBeVisible({ timeout: 15000 });
  
  // Should show iframe and EXIT GAME button after clicking (focusing)
  await page.mouse.click(500, 500);
  
  // Wait for the iframe container (activeGameId condition)
  await expect(page.locator('iframe').first()).toBeVisible({ timeout: 60000 });
  await expect(page.locator('button:has-text("EXIT GAME")')).toBeVisible();
});

test('Scenario 2: GameSDK Payment', async ({ page }) => {
  await page.goto('/');
  
  // Wait for feed to load and click to focus (starts the game and allows message handling)
  await expect(page.locator('.swiper')).toBeVisible({ timeout: 15000 });
  await page.mouse.click(500, 500);

  // Wait for iframe
  await expect(page.locator('iframe').first()).toBeVisible({ timeout: 30000 });

  const consolePromise = new Promise((resolve) => {
    page.on('console', msg => {
      if (msg.text().includes('Payment triggered')) resolve(true);
    });
  });

  // Simulate a message from the iframe
  await page.evaluate(() => {
    window.postMessage({ type: 'GAME_PAYMENT', amount: 0.1 }, '*');
  });

  await consolePromise;
});

test('Scenario 3: Create Flow', async ({ page }) => {
  await page.goto('/create');
  
  await page.locator('#prompt-input').fill('A new test game');
  await page.locator('button:has-text(\"Vibe Code\")').click();

  // Wait for debug info to show a URL (meaning generation finished)
  await expect(page.locator('#debug-gameurl')).not.toHaveText('EMPTY', { timeout: 30000 });
  
  // Now publishing controls should appear
  const titleInput = page.locator('#game-title-input');
  await expect(titleInput).toBeVisible({ timeout: 10000 });
  await titleInput.fill('My Test Title');
  
  const publishBtn = page.locator('#publish-button');
  
  // Force the button to be enabled and visible even without a connected wallet
  await page.evaluate(() => {
      // Stub window.alert to prevent blocking
      (window as any).alert = (msg: string) => { console.log('STUBBED ALERT:', msg); };
  });

  // Mock the publish RPC
  await page.route('**/rest/v1/games', async (route, request) => {
      console.log('MOCK SUPABASE: games request', request.method(), request.url());
      if (request.method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'new-id' })
          });
      } else {
          route.continue();
      }
  });

  await publishBtn.click();
  
  // Wait for the redirection
  await page.waitForURL(url => url.pathname === '/' || url.toString().endsWith('/'), { timeout: 30000 });
});

test('Scenario 4: Remix Flow', async ({ page }) => {
  // Mock the parent game for remixing
  await page.route('**/rest/v1/games?id=eq.parent-id', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 'parent-id',
        title: 'Original Game',
        s3_bundle_url: 'data:text/html,<html><body><h1>Original</h1></body></html>'
      }])
    });
  });

  // Use the correct query param name from create/page.tsx: remixId
  await page.goto('/create?remixId=parent-id');
  
  // Prompt should be pre-filled or at least visible
  await expect(page.locator('#prompt-input')).toBeVisible();
  
  // Remix button should be active
  await page.locator('#prompt-input').fill('Remix it with fire');
  // Wait for the button to have the correct text based on remixId presence
  await page.locator('button:has-text(\"Remix It\")').click();

  await expect(page.locator('#debug-gameurl')).not.toHaveText('EMPTY', { timeout: 30000 });
  
  await page.evaluate(() => {
      // Stub window.alert to prevent blocking
      (window as any).alert = (msg: string) => { console.log('STUBBED ALERT:', msg); };
  });

  await page.route('**/rest/v1/games', async (route, request) => {
      if (request.method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'remixed-id' })
          });
      } else {
          route.continue();
      }
  });

  // Fill title if publish controls are visible
  await expect(page.locator('#game-title-input')).toBeVisible({ timeout: 10000 });
  await page.locator('#game-title-input').fill('Remixed Title');
  await page.locator('#publish-button').click();
  
  await page.waitForURL(url => url.pathname === '/' || url.toString().endsWith('/'), { timeout: 30000 });
});
