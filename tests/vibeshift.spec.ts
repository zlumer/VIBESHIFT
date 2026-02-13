import { test, expect } from '@playwright/test';

test.describe('Vibeshift Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock wallet and settings
    await page.addInitScript(() => {
      console.log('INIT SCRIPT START');
      
      const mockPkBase58 = '2u3VfD9N2nQG6xS6V7p3uN3G6xS6V7p3uN3G6xS6V7p3';

      // Define PublicKey mock if it doesn't exist to prevent Solana SDK from crashing
      if (!(window as any).PublicKey) {
          (window as any).PublicKey = function(key: string) {
              this.key = key;
              this.toBase58 = () => this.key;
              this.toString = () => this.key;
              this.equals = (other: any) => other && other.toString() === this.toString();
          };
          (window as any).PublicKey.findProgramAddressSync = () => [new (window as any).PublicKey('11111111111111111111111111111111'), 255];
          (window as any).PublicKey.isOnCurve = () => true;
      }

      (window as any).MOCK_DATA = true;
      localStorage.setItem('NEXT_PUBLIC_SKIP_PAYMENT', 'true');
      
      // Basic mock of solana/phantom before any library loads
      const mockSolana: any = {
        isPhantom: true,
        isConnected: true,
        publicKey: new (window as any).PublicKey(mockPkBase58),
        connect: async () => ({ publicKey: new (window as any).PublicKey(mockPkBase58) }),
        disconnect: async () => {},
        on: () => {},
        request: async () => ({})
      };
      (window as any).solana = mockSolana;
      (window as any).phantom = { solana: mockSolana };
      console.log('INIT SCRIPT END');
    });

    // Intercept Supabase calls for games (just in case MOCK_DATA fails)
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
    // Debug log to see what's happening
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    console.log('DOM Content Loaded. URL:', page.url());

    // Wait for the server loading text
    const serverLoading = page.locator('text=Loading Feed...');
    if (await serverLoading.isVisible()) {
        await expect(serverLoading).not.toBeVisible({ timeout: 60000 });
    }

    // Wait for the client loading indicator
    const loadingText = page.locator('text=Vibing the feed...');

    // Log the current state for debugging
    console.log('Checking for feed elements...');
    
    // Wait for either the loading to disappear or the content to appear
    await expect(loadingText).not.toBeVisible({ timeout: 30000 });
    
    // Verify that the title of the mock game is visible
    await expect(page.locator('h2:has-text("Test Game 1")')).toBeVisible({ timeout: 30000 });
    
    // Should show iframe and EXIT GAME button after clicking (focusing)
    // In MOCK_DATA mode, the game might already be active (intercepting click)
    // We try to click the container or just verify iframe if it's already there
    const iframe = page.locator('iframe').first();
    if (await iframe.isVisible()) {
        console.log('Iframe already visible in mock mode');
    } else {
        await page.locator('h2:has-text("Test Game 1")').click({ force: true });
    }
    
    // Wait for the iframe container (activeGameId condition)
    await expect(iframe).toBeVisible({ timeout: 30000 });
    await expect(page.locator('button:has-text("EXIT GAME")')).toBeVisible();
  });

  test('Scenario 2: GameSDK Payment', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const serverLoading = page.locator('text=Loading Feed...');
    if (await serverLoading.isVisible()) {
        await expect(serverLoading).not.toBeVisible({ timeout: 60000 });
    }

    const clientLoading = page.locator('text=Vibing the feed...');
    if (await clientLoading.isVisible()) {
        await expect(clientLoading).not.toBeVisible({ timeout: 60000 });
    }

    // Wait for feed to load and click to focus (starts the game and allows message handling)
    await expect(page.locator('h2:has-text("Test Game 1")')).toBeVisible({ timeout: 30000 });
    const iframe = page.locator('iframe').first();
    if (!(await iframe.isVisible())) {
        await page.locator('h2:has-text("Test Game 1")').click({ force: true });
    }

    // Wait for iframe
    await expect(iframe).toBeVisible({ timeout: 30000 });

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
    // Increase timeout for AI generation
    test.setTimeout(120000);
    
    await page.goto('/create');
    await page.waitForLoadState('domcontentloaded');
    
    await page.locator('#prompt-input').fill('A new test game');
    await page.locator('button:has-text(\"Vibe Code\")').click();

    // Wait for debug info to show a URL (meaning generation finished)
    await expect(page.locator('#debug-gameurl')).not.toHaveText('EMPTY', { timeout: 90000 });
    
    // Now publishing controls should appear
    const titleInput = page.locator('#game-title-input');
    await expect(titleInput).toBeVisible({ timeout: 30000 });
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
    await page.waitForURL(url => url.pathname === '/' || url.toString().endsWith('/'), { timeout: 60000 });
  });

  test('Scenario 4: Remix Flow', async ({ page }) => {
    // Increase timeout for AI generation
    test.setTimeout(120000);

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
    await page.waitForLoadState('domcontentloaded');
    
    // Prompt should be pre-filled or at least visible
    await expect(page.locator('#prompt-input')).toBeVisible({ timeout: 30000 });
    
    // Remix button should be active
    await page.locator('#prompt-input').fill('Remix it with fire');
    // Wait for the button to have the correct text based on remixId presence
    await page.locator('button:has-text(\"Remix It\")').click();

    await expect(page.locator('#debug-gameurl')).not.toHaveText('EMPTY', { timeout: 90000 });
    
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
    await expect(page.locator('#game-title-input')).toBeVisible({ timeout: 30000 });
    await page.locator('#game-title-input').fill('Remixed Title');
    await page.locator('#publish-button').click();
    
    await page.waitForURL(url => url.pathname === '/' || url.toString().endsWith('/'), { timeout: 60000 });
  });
});
