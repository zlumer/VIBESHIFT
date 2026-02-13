import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const gameId = searchParams.get('gameId');

  if (!url || !gameId) {
    return NextResponse.json({ error: 'Missing url or gameId' }, { status: 400 });
  }

  try {
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const targetUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    const previewDir = path.join(process.cwd(), 'public', 'previews');
    if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });

    const gifPath = path.join(previewDir, `${gameId}.png`);
    await page.screenshot({ path: gifPath, type: 'png' });
    
    await browser.close();
    return NextResponse.json({ success: true, path: `/previews/${gameId}.png` });
  } catch (err: any) {
    console.error('GIF API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
