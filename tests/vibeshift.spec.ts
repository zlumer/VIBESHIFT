import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Inject mock wallet
  await page.addInitScript(() => {
    const mockSolana: any = {
      isPhantom: true,
      isConnected: false, 
      publicKey: null,
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
  await expect(page.locator('.swiper')).toBeVisible({ timeout: 15000 });
  
  // Click to focus/start game
  await page.mouse.click(500, 500);
  
  // Should show iframe
  await expect(page.locator('iframe').first()).toBeVisible({ timeout: 15000 });
  await expect(page.locator('button:has-text(\"EXIT GAME\")')).toBeVisible();
});

test('Scenario 2: GameSDK Payment', async ({ page }) => {
  await page.goto('/');
  await page.mouse.click(500, 500);
  
  // Wait for iframe
  await expect(page.locator('iframe').first()).toBeVisible({ timeout: 15000 });

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
  
  // Bypass UI for wallet connection in this test to avoid hydration issues
  // We already have auto-connect in lib/wallet.tsx now, but we need to ensure 
  // the mock wallet is marked as connected.
  await page.evaluate(() => {
    (window as any).solana.isConnected = true;
    (window as any).solana.publicKey = { 
        toBase58: () => 'MockWalletPublicKey111111111111111111111111',
        toString: () => 'MockWalletPublicKey111111111111111111111111'
    };
  });

  const connectBtn = page.locator('#wallet-button');
  // It might already be connected due to auto-connect effect
  const btnText = await connectBtn.innerText();
  if (btnText.includes('Connect Wallet')) {
    await connectBtn.click();
  }
  
  // Wait for wallet to be connected in UI
  await expect(connectBtn).not.toHaveText('Connect Wallet', { timeout: 15000 });
  
  const publishBtn = page.locator('#publish-button');
  await expect(publishBtn).toBeEnabled({ timeout: 10000 });

  // Mock the publish RPC
  await page.route('**/rest/v1/games', async (route, request) => {
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

  page.on('dialog', d => d.accept());
  await publishBtn.click();
  
  await page.waitForURL(url => url.pathname === '/' || url.toString().endsWith('/'), { timeout: 20000 });
});
