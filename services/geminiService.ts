import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const inspectObject = async (objectType: string, color: string, context: string): Promise<string> => {
  if (!apiKey) {
    return "API Key missing. Cannot inspect object.";
  }

  try {
    const prompt = `
      You are the narrator of a 2D platformer game. 
      The player is inspecting a ${color} ${objectType}.
      Context: ${context}.
      
      Provide a short, mysterious, or funny description of this item (max 2 sentences) in Thai language.
      Make it sound like an RPG item description.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No description available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The mystical energies of this object are too complex to decipher right now.";
  }
};

export const getNPCDialogue = async (topic: string): Promise<string> => {
  if (!apiKey) {
    return "Village Headman: I cannot speak without my API Key voice!";
  }

  try {
    const prompt = `
      You are the "Village Headman" (ผู้ใหญ่บ้าน) in a Thai village.
      You are wise, kind, and care deeply about the environment.
      You are teaching the player about waste sorting.
      
      The player asks about: "${topic}".
      
      Provide a short, educational, and encouraging response in Thai language (max 2-3 sentences).
      Explain clearly which bin color this type of waste goes into if applicable.
      
      Waste Types:
      - Hazardous (Red Bin): Batteries, light bulbs, chemicals.
      - General (Blue Bin): Plastic wrappers, foam, dirty tissues.
      - Organic (Green Bin): Food scraps, leaves, fruit peels.
      - Recycle (Yellow Bin): Clean plastic bottles, glass, paper, metal cans.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Village Headman: ...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Village Headman: I am having trouble remembering right now.";
  }
};