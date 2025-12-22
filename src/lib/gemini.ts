import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

let model: GenerativeModel;

export function getGeminiModel() {
    if (model) return model;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    return model;
}
