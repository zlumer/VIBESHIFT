import { chromium } from 'playwright';

async function checkApp() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 360, height: 640 },
    isMobile: true
  });

  console.log('Navigating to https://vibeshift-jade.vercel.app/...');
  await page.goto('https://vibeshift-jade.vercel.app/', { waitUntil: 'networkidle' });
  
  // Wait for React to mount and state to initialize
  await page.waitForTimeout(2000);

  console.log('Taking screenshot...');
  await page.screenshot({ path: 'app_check.png' });

  const content = await page.content();
  const hasVibeDodge = content.includes('Vibe Dodge');
  console.log('Contains \"Vibe Dodge\":', hasVibeDodge);

  // Check for black screen by analyzing pixel data would be complex here, 
  // but we can check if the main container has children.
  const slideCount = await page.locator('.swiper-slide').count();
  console.log('Number of slides found:', slideCount);

  await browser.close();
}

checkApp().catch(console.error);
