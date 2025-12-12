import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { GoogleGenerativeAI } from "@google/generative-ai";

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.log("Available Models:", data.models.map((m: any) => m.name));
        } else {
            console.log("No models found or error structure:", data);
        }
    } catch (e) {
        console.error("Error fetching models:", e);
    }
}

listModels();
