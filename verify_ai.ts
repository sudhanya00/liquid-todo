import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getGeminiModel } from "./src/lib/gemini";

async function testAI() {
    const text = "Buy milk tomorrow";
    const prompt = `User Input: "${text}"\n\nParse this according to the rubric and return ONLY JSON.
  Rubric:
  1. Title: Required.
  2. Due Date: Required.
  3. Priority: Medium default.
  4. Missing Info: Ask if due date missing.
  `;

    try {
        const model = getGeminiModel();
        const result = await model.generateContent(prompt);
        console.log("AI Response:", result.response.text());
    } catch (error) {
        console.error("Error:", error);
    }
}

testAI();
