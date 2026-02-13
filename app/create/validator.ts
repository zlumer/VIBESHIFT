import { chromium } from 'playwright';

export async function validateGameCode(gameUrl: string): Promise<{ valid: boolean; error?: string }> {
  let browser;
  try {
    const isMock = process.env.MOCK_AI === 'true' || process.env.NEXT_PUBLIC_SKIP_PAYMENT === 'true';
    if (process.env.NODE_ENV === 'test' || isMock) {
      console.log('Skipping validator for test/mock mode');
      return { valid: true };
    }

    // We assume the game is already written to public/games/generated/
    // gameUrl is relative, e.g., /games/generated/game-123.html
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const fullUrl = `${baseUrl}${gameUrl}`;

    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Check for basic page load and console errors
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 });
    } catch (err: any) {
      return { valid: false, error: `Page failed to load: ${err.message}` };
    }

    // 2. Check for Kaplay/GameSDK presence and initialization
    const sdkStatus = await page.evaluate(() => {
      return {
        gameSDK: !!(window as any).GameSDK,
        canvasPresent: !!document.querySelector('canvas'),
        title: document.title
      };
    });

    if (!sdkStatus.canvasPresent) {
      return { valid: false, error: 'No canvas element found (Kaplay failed to start?)' };
    }

    if (consoleErrors.length > 0) {
      return { valid: false, error: `Runtime errors: ${consoleErrors.join(', ')}` };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `Validator crashed: ${err.message}` };
  } finally {
    if (browser) await browser.close();
  }
}
