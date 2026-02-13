import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "");

async function generateAssets() {
  // Use imagen-3.0-generate-001 for image generation
  const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

  const prompts = [
    { name: "nano-banana", prompt: "A single, tiny, cute pixel-art banana, simple sprite, white background, high quality" },
    { name: "cosmic-rock", prompt: "A small stylized purple space rock, glowing edges, game sprite, white background" }
  ];

  const outputDir = path.join(process.cwd(), "public", "assets", "generated");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (const item of prompts) {
    try {
      console.log(`Generating ${item.name}...`);
      const result = await model.generateContent(item.prompt);
      const response = await result.response;
      
      // Imagen returns the image in the first candidate's data
      const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (imageData) {
        const buffer = Buffer.from(imageData, "base64");
        const fileName = `${item.name}.png`;
        fs.writeFileSync(path.join(outputDir, fileName), buffer);
        console.log(`Saved ${fileName}`);
      } else {
        console.error(`No image data returned for ${item.name}. Response:`, JSON.stringify(response));
      }
    } catch (error) {
      console.error(`Error generating ${item.name}:`, error);
    }
  }
}

generateAssets();
