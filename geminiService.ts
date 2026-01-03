
import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, GameLevel, Word, Category } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const levelSchema = {
  type: Type.OBJECT,
  properties: {
    categories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          icon: { type: Type.STRING, description: "A simple emoji representing the category" },
          description: { type: Type.STRING },
          words: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            minItems: 4,
            maxItems: 4
          }
        },
        required: ["id", "title", "icon", "description", "words"]
      },
      minItems: 6,
      maxItems: 6
    }
  },
  required: ["categories"]
};

export async function generateLevel(difficulty: Difficulty): Promise<GameLevel> {
  const prompt = `
    Generate a 4x6 grid game data for an Arabic word sorting game called 'Rabt'.
    Difficulty: ${difficulty}.
    Rules:
    - Create 6 unique categories of 4 words each (Total 24 words).
    - Logic should follow Modern Standard Arabic (MSA).
    - Beginner: Easy 3-4 letter words (Colors, Fruits, Simple Verbs).
    - Intermediate: 4-6 letter words, synonyms, tools, or semantic groups.
    - Expert: Complex morphology (Awzan), literary roots, rare but meaningful vocabulary.
    - Ensure strict orthographic accuracy for 'Hamza' and 'Ta Marbuta'.
    - Output must be in JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: levelSchema
    }
  });

  const rawData = JSON.parse(response.text);
  
  const categories: Category[] = rawData.categories.map((c: any) => ({
    id: c.id,
    title: c.title,
    icon: c.icon,
    description: c.description
  }));

  const words: Word[] = rawData.categories.flatMap((c: any) => 
    c.words.map((w: string, idx: number) => ({
      id: `${c.id}-${idx}`,
      text: w,
      categoryId: c.id,
      isSolved: false
    }))
  );

  // Shuffle words for the grid
  const shuffledWords = [...words].sort(() => Math.random() - 0.5);

  return {
    difficulty,
    categories,
    words: shuffledWords
  };
}
