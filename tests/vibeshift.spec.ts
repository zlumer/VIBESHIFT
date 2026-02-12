import { test, expect } from '@playwright/test';

// Scenario 1: Feed & Play
test('Scenario 1: Feed & Play', async ({ page }) => {
  await page.goto('/');
  
  // Check if feed loads
  const feedContainer = page.locator('main');
  await expect(feedContainer).toBeVisible();

  // Scroll down (simulate swipe)
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(500); // Wait for scroll/snap

  // Tap to focus a game
  const activeSlide = page.locator('.swiper-slide-active');
  const playOverlay = activeSlide.getByText('Tap to Play', { exact: false }).first();
  
  if (await playOverlay.isVisible()) {
      await playOverlay.click();
  } else {
      await activeSlide.click({ force: true });
  }
  
  // Verify iframe loads
  const iframe = activeSlide.locator('iframe').first();
  await expect(iframe).toBeVisible();

  // Mock GAME_OVER from iframe
  await page.evaluate(() => {
      window.postMessage({ type: 'GAME_OVER', score: 1337 }, '*');
  });

  // Verify score is displayed
  const scoreDisplay = page.locator('text=SCORE: 1337');
  await expect(scoreDisplay).toBeVisible();
  
  // Click "EXIT GAME"
  const exitButton = page.locator('button:has-text("EXIT GAME")');
  await expect(exitButton).toBeVisible();
  await exitButton.click();
  await expect(exitButton).not.toBeVisible();
});

// Scenario 2: GameSDK Payment
test('Scenario 2: GameSDK Payment Flow', async ({ page }) => {
  await page.goto('/');
  
  const activeSlide = page.locator('.swiper-slide-active');
  await activeSlide.click({ force: true });

  const consolePromise = new Promise((resolve) => {
      page.on('console', msg => {
          if (msg.text().includes('Payment triggered: 0.1 SOL')) {
              resolve(true);
          }
      });
  });

  // Mock GAME_PAYMENT from iframe
  await page.evaluate(() => {
      window.postMessage({ type: 'GAME_PAYMENT', amount: 0.1 }, '*');
  });

  await consolePromise;
});

// Scenario 3: Vibecoding (Create)
test('Scenario 3: Vibecoding (Create)', async ({ page }) => {
  await page.goto('/create');

  const promptInput = page.locator('input[placeholder*="Describe"]');
  await promptInput.fill('Make a flappy bird clone');

  const submitButton = page.locator('button:has-text("Vibe Code")');
  await submitButton.click();

  const gameIframe = page.locator('iframe');
  await expect(gameIframe).toBeVisible({ timeout: 60000 });

  await expect(page).toHaveURL(/\/create/);
  const iframeSrc = await gameIframe.getAttribute('src');
  expect(iframeSrc).toMatch(/\/games\/(generated|remixed)\//);
});

// Scenario 4: Remix
test('Scenario 4: Remix', async ({ page }) => {
  await page.goto('/');

  const activeSlide = page.locator('.swiper-slide-active');
  await activeSlide.click({ force: true });

  const remixButton = page.locator('button:has-text("REMIX")');
  await expect(remixButton).toBeVisible();
  await remixButton.click();

  await expect(page).toHaveURL(/\/create\?remixId=/);

  const promptInput = page.locator('input[placeholder*="How should we change"]');
  await expect(promptInput).toBeVisible();
  await promptInput.fill('Make it faster');

  const submitButton = page.locator('button:has-text("Remix It")');
  await expect(submitButton).toBeEnabled({ timeout: 10000 });
  await submitButton.click();

  const gameIframe = page.locator('iframe');
  await expect(gameIframe).toBeVisible({ timeout: 60000 });
  const iframeSrc = await gameIframe.getAttribute('src');
  expect(iframeSrc).toMatch(/\/games\/(generated|remixed)\//);
});
