'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { chromium } from 'playwright';
import { validateGameCode } from './validator';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '');

async function generateGif(url: string, gameId: string) {
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 600, height: 400 }
    });
    const page = await context.newPage();
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    console.log(`GIF Gen: Navigating to ${baseUrl}${url}`);
    
    // Construct full URL (Next.js dev or prod)
    try {
        await page.goto(`${baseUrl}${url}`, { timeout: 10000 });
    } catch (e) {
        console.error('GIF Gen page.goto failed:', e);
    }
    
    // Wait for game to load
    await page.waitForTimeout(2000);

    const gifPath = path.join(process.cwd(), 'public', 'previews', `${gameId}.png`); // Using png as placeholder for gif
    const previewDir = path.join(process.cwd(), 'public', 'previews');
    if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true });

    await page.screenshot({ path: gifPath });
    await browser.close();

    return `/previews/${gameId}.png`;
  } catch (err) {
    console.error('GIF Gen error:', err);
    return null;
  }
}

export async function publishGame(gameData: {
  title: string;
  bundleUrl: string;
  creatorWallet: string;
  parentGameId?: string;
  gameId: string;
}) {
  try {
    let gifPreviewUrl = null;
    if (process.env.NODE_ENV !== 'test') {
        gifPreviewUrl = await generateGif(gameData.bundleUrl, gameData.gameId);
    }

    const { data, error } = await supabase
      .from('games')
      .insert({
        title: gameData.title,
        s3_bundle_url: gameData.bundleUrl,
        creator_wallet: gameData.creatorWallet,
        parent_game_id: gameData.parentGameId,
        gif_preview_url: gifPreviewUrl,
        status: 'published'
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, game: data };
  } catch (error: any) {
    console.error('Publish error:', error);
    return { success: false, error: error.message };
  }
}

export async function generateGame(prompt: string) {
  try {
    // 1. Query relevant assets from Supabase
    const keywords = prompt.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const { data: assets } = await supabase
      .from('assets')
      .select('s3_url, tags')
      .or(keywords.map(k => `tags.cs.{${k}}`).join(','));

    const assetContext = assets && assets.length > 0 
      ? `Available Assets (ONLY USE THESE URLs if relevant to the request):\n${assets.map(a => `- URL: ${a.s3_url}, Tags: ${a.tags.join(', ')}`).join('\n')}`
      : "No specific assets found in database.";

    if (process.env.MOCK_AI === 'true') {
      const gameId = `game-${Date.now()}`;
      const publicDir = path.join(process.cwd(), 'public', 'games', 'generated');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      const mockCode = `
<!DOCTYPE html>
<html>
<head>
    <title>Mock Game</title>
    <script src="/game-sdk.js"></script>
</head>
<body style="background: black; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif;">
    <h1 style="color: #a855f7;">Mock Game Generated</h1>
    <p>Prompt: ${prompt}</p>
    <p>Assets found: ${assets?.length || 0}</p>
    <canvas id="mockCanvas" width="360" height="640"></canvas>
    <button id="payBtn" style="background: #a855f7; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Pay 0.1 SOL</button>
    <button id="dieBtn" style="background: #ef4444; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 10px;">Die (Game Over)</script>
    <script>
        console.log("Mock Game Loaded");
        window.GameSDK.init();
        
        document.getElementById('payBtn').onclick = () => {
            window.GameSDK.payment_trigger(0.1);
        };
        
        document.getElementById('dieBtn').onclick = () => {
            window.GameSDK.game_over(Math.floor(Math.random() * 1000));
        };

        window.addEventListener('message', (e) => {
            if (e.data.type === 'PAYMENT_SUCCESS') {
                alert('Game received PAYMENT_SUCCESS!');
            }
        });
    </script>
</body>
</html>`;
      const filePath = path.join(publicDir, `${gameId}.html`);
      fs.writeFileSync(filePath, mockCode);
      return { success: true, url: `/games/generated/${gameId}.html`, gameId, code: mockCode, assetsUsed: assets };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const fullPrompt = `
      Create a fun, hypercasual portrait web game using Kaplay.js (the successor to Kaboom.js).
      The game must be contained in a SINGLE HTML file with all logic in a <script> tag.
      
      MATCH THIS VIBE: "${prompt}"

      ${assetContext}

      TECHNICAL REQUIREMENTS:
      1. Use Kaplay.js: <script src="https://unpkg.com/kaplay@3000.1.17/dist/kaplay.js"></script>
      2. Init: const k = kaplay({ width: 360, height: 640, letterbox: true, global: false });
      3. GameSDK: Include <script src="/game-sdk.js"></script> and call window.GameSDK.init() on load.
      4. Touch Controls: MUST be playable on mobile. Use k.onClick() or k.onMouseDown() for primary actions.
      5. Score: Keep track of a numeric score.
      6. Game Over: Call window.GameSDK.game_over(score) when the player loses.
      7. Assets: Use k.loadSprite("name", "URL") from the provided list. If no relevant assets, use k.add([k.rect(40, 40), k.color(255, 0, 0)]) for placeholders.
      8. UI: Show the score on screen using k.add([k.text("Score: 0"), ...]).
      9. Visuals: Make it colorful and "vibrant". Use a dark background.

      SDK USAGE EXAMPLES:
      - window.GameSDK.init(); // On start
      - window.GameSDK.game_over(score); // On death
      - window.GameSDK.payment_trigger(amount); // To ask for payment (use sparingly)

      KAPLAY.JS TIPS:
      - Use k.onUpdate() for per-frame logic.
      - Use k.onKeyPress() or k.onClick() for controls.
      - The width and height are 360x640.

      OUTPUT FORMAT:
      - Return ONLY the raw HTML starting with <!DOCTYPE html>.
      - No markdown code blocks (no \`\`\`html).
      - Ensure the code is self-contained and bug-free.
    `;

    let code = '';
    let gameId = '';
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      const result = await model.generateContent(retryCount > 0 ? `${fullPrompt}\n\nPREVIOUS ATTEMPT FAILED VALIDATION. PLEASE ENSURE THE CODE IS BUG-FREE AND ALL ASSETS LOAD CORRECTLY.` : fullPrompt);
      const response = await result.response;
      code = response.text();
      code = code.replace(/```html/g, '').replace(/```/g, '');

      gameId = `game-${Date.now()}`;
      const publicDir = path.join(process.cwd(), 'public', 'games', 'generated');
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

      const filePath = path.join(publicDir, `${gameId}.html`);
      fs.writeFileSync(filePath, code);

      console.log(`Validation attempt ${retryCount + 1} for ${gameId}...`);
      const validation = await validateGameCode(`/games/generated/${gameId}.html`);
      
      if (validation.valid) {
        return { success: true, url: `/games/generated/${gameId}.html`, gameId, code, assetsUsed: assets };
      }

      console.warn(`Validation failed: ${validation.error}`);
      retryCount++;
    }

    return { 
      success: false, 
      error: `Failed to generate valid code after ${maxRetries + 1} attempts. Please try a different prompt.` 
    };
  } catch (error) {
    console.error('Error generating game:', error);
    return { success: false, error: 'Failed to generate game.' };
  }
}

export async function remix(originalCode: string, newPrompt: string) {
    try {
      // 1. Query relevant assets for the remix
      const keywords = newPrompt.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      const { data: assets } = await supabase
        .from('assets')
        .select('s3_url, tags')
        .or(keywords.map(k => `tags.cs.{${k}}`).join(','));

      const assetContext = assets && assets.length > 0 
        ? `Available NEW Assets (Use these if they match the remix request):\n${assets.map(a => `- URL: ${a.s3_url}, Tags: ${a.tags.join(', ')}`).join('\n')}`
        : "";

      if (process.env.MOCK_AI === 'true') {
        const gameId = `remix-${Date.now()}`;
        const publicDir = path.join(process.cwd(), 'public', 'games', 'remixed');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        const mockCode = `
<!DOCTYPE html>
<html>
<head>
    <title>Mock Remix</title>
    <script src="/game-sdk.js"></script>
</head>
<body style="background: black; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif;">
    <h1 style="color: #a855f7;">Mock Game Remixed</h1>
    <p>Remix Prompt: ${newPrompt}</p>
    <canvas id="mockCanvas" width="360" height="640"></canvas>
    <script>
        console.log("Mock Remix Loaded");
        window.GameSDK.init();
    </script>
</body>
</html>`;
        const filePath = path.join(publicDir, `${gameId}.html`);
        fs.writeFileSync(filePath, mockCode);
        return { success: true, url: `/games/remixed/${gameId}.html`, gameId, code: mockCode, assetsUsed: assets };
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
      const fullPrompt = `
        You are an expert Kaplay.js developer. 
        I have an existing Kaplay.js game and I want to REMIX it.
        
        INSTRUCTIONS FOR THE REMIX: "${newPrompt}"
  
        ${assetContext}

        ORIGINAL CODE TO MODIFY:
        \`\`\`html
        ${originalCode}
        \`\`\`
  
        REMIX REQUIREMENTS:
        1. Maintain the core game loop but apply the requested changes (speed, colors, theme, assets).
        2. Keep window.GameSDK integration intact.
        3. Use provided NEW Asset URLs if they better fit the new theme.
        4. Output ONLY the FULL new HTML code. No markdown. Start with <!DOCTYPE html>.
      `;
  
      let code = '';
      let gameId = '';
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        const result = await model.generateContent(retryCount > 0 ? `${fullPrompt}\n\nPREVIOUS REMIX FAILED VALIDATION. PLEASE ENSURE THE CODE IS BUG-FREE.` : fullPrompt);
        const response = await result.response;
        code = response.text();
        code = code.replace(/```html/g, '').replace(/```/g, '');

        gameId = `remix-${Date.now()}`;
        const publicDir = path.join(process.cwd(), 'public', 'games', 'remixed');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

        const filePath = path.join(publicDir, `${gameId}.html`);
        fs.writeFileSync(filePath, code);

        console.log(`Validation attempt ${retryCount + 1} for remix ${gameId}...`);
        const validation = await validateGameCode(`/games/remixed/${gameId}.html`);
        
        if (validation.valid) {
          return { success: true, url: `/games/remixed/${gameId}.html`, gameId, code, assetsUsed: assets };
        }

        console.warn(`Remix validation failed: ${validation.error}`);
        retryCount++;
      }

      return { 
        success: false, 
        error: `Failed to generate valid remix after ${maxRetries + 1} attempts.` 
      };
    } catch (error) {
      console.error('Error remixing game:', error);
      return { success: false, error: 'Failed to remix game.' };
    }
  }