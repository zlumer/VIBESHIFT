'use server'

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Initialize Gemini
// Ensure GOOGLE_API_KEY is available in environment variables
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '');

export async function generateGame(prompt: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const fullPrompt = `
      Create a simple web game using Kaplay.js (Kaboom.js successor).
      It should be a single HTML file with embedded JavaScript.
      The game should match this description: "${prompt}".

      Requirements:
      1. Use Kaplay.js from CDN: <script src="https://unpkg.com/kaplay@3000.1.17/dist/kaplay.js"></script>
      2. Initialize Kaplay with 'k = kaplay()'.
      3. Include the GameSDK via <script src="/game-sdk.js"></script> (assume it exists in root).
      4. Call window.GameSDK.init() at start.
      5. Call window.GameSDK.game_over(score) when the game ends.
      6. Use simple shapes/colors (rect, circle) instead of loading external sprites, unless using reliable public URLs.
      7. Make it playable with keyboard or mouse.
      8. Output ONLY the HTML code, starting with <!DOCTYPE html>. No markdown ticks.
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let code = response.text();

    // Clean up markdown if present
    code = code.replace(/```html/g, '').replace(/```/g, '');

    // Generate ID and save
    const gameId = `game-${Date.now()}`;
    const publicDir = path.join(process.cwd(), 'public', 'games', 'generated');
    
    // Ensure directory exists
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const filePath = path.join(publicDir, `${gameId}.html`);
    fs.writeFileSync(filePath, code);

    console.log(`Game generated and saved to ${filePath}`);

    // Return the URL
    return { success: true, url: `/games/generated/${gameId}.html`, gameId, code };
  } catch (error) {
    console.error('Error generating game:', error);
    return { success: false, error: 'Failed to generate game.' };
  }
}

export async function remix(originalCode: string, newPrompt: string) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  
      const fullPrompt = `
        You are an expert game developer. 
        I have an existing HTML game using Kaplay.js. 
        I want you to MODIFY it based on these instructions: "${newPrompt}".
  
        Here is the ORIGINAL CODE:
        \`\`\`html
        ${originalCode}
        \`\`\`
  
        Requirements for the REMIX:
        1. Keep the core logic working if not asked to change it.
        2. Ensure Kaplay.js and GameSDK are still included and initialized correctly.
        3. Output ONLY the FULL, VALID HTML code for the new version.
        4. No markdown ticks. Start with <!DOCTYPE html>.
      `;
  
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      let code = response.text();
  
      code = code.replace(/```html/g, '').replace(/```/g, '');
  
      const gameId = `remix-${Date.now()}`;
      const publicDir = path.join(process.cwd(), 'public', 'games', 'remixed');
      
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
  
      const filePath = path.join(publicDir, `${gameId}.html`);
      fs.writeFileSync(filePath, code);
  
      return { success: true, url: `/games/remixed/${gameId}.html`, gameId, code };
    } catch (error) {
      console.error('Error remixing game:', error);
      return { success: false, error: 'Failed to remix game.' };
    }
  }