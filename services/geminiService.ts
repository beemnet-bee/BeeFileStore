
import { GoogleGenAI } from "@google/genai";

export const getFileInsight = async (fileName: string, fileType: string, contentSnippet?: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      You are BeeAI, the assistant for Bee File Store. 
      Analyze the following file information and provide a 2-sentence helpful summary or tip.
      File Name: ${fileName}
      File Type: ${fileType}
      ${contentSnippet ? `Content Preview: ${contentSnippet.substring(0, 500)}` : ''}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "I've analyzed your file! It's safely stored in your Bee Hive.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The bees are busy right now, but your file is safe and sound!";
  }
};
