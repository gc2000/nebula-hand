import { GoogleGenAI, Type } from "@google/genai";
import { PhraseResponse } from "../types";

// Initialize Gemini Client
// Note: API Key is assumed to be in process.env.API_KEY as per instructions
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateCreativePhrases = async (count: number = 3): Promise<string[]> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const response = await ai.models.generateContent({
      model,
      contents: `Generate ${count} short, unique, warm, and poetic phrases about the universe, stardust, connection, time, or love. 
      Keep them under 12 words each. They should feel ethereal and inspiring.
      Do not number them.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phrases: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return ["The universe is within you.", "We are made of star stuff.", "Shine bright like a diamond."];
    
    const data = JSON.parse(jsonText) as PhraseResponse;
    return data.phrases;
  } catch (error) {
    console.error("Failed to generate phrases:", error);
    // Fallback phrases in case of API error or quota issues
    return [
      "In the silence of space, we find our rhythm.",
      "Every atom in you came from a star that exploded.",
      "Gravity is just the universe hugging you.",
      "Look up, and get lost in the dark.",
      "We are the universe experiencing itself."
    ];
  }
};
