
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
          icon: { type: Type.STRING, description: "A unique and highly relevant emoji representing the category (e.g. 🍎 for fruits)" },
          color: { type: Type.STRING, description: "A distinct, vibrant CSS hex color code (e.g. #FF5733) that visually differentiates the category" },
          description: { type: Type.STRING },
          words: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            minItems: 4,
            maxItems: 4
          }
        },
        required: ["id", "title", "icon", "color", "description", "words"]
      },
      minItems: 4,
      maxItems: 6
    }
  },
  required: ["categories"]
};

export async function generateLevel(difficulty: Difficulty, levelNumber: number): Promise<GameLevel> {
  const categoryCount = levelNumber + 3;
  const totalWords = categoryCount * 4;

  const prompt = `
    Generate a game data for an Arabic word sorting game called 'Rabt'.
    Stage: ${difficulty}.
    Level Index: ${levelNumber} of 3.
    Rules:
    - Create ${categoryCount} unique categories of 4 words each (Total ${totalWords} words).
    - Logic should follow Modern Standard Arabic (MSA).
    - Each category MUST have a unique, highly relevant emoji and a distinct, vibrant HEX color that fits the theme.
    - Vary themes: Beginner (concrete nouns like animals, food), Intermediate (abstract nouns/verbs), Expert (literary roots, rare words, historical figures).
    - Ensure strict orthographic accuracy for 'Hamza' and 'Ta Marbuta'.
    - Words should be challenging but related by a clear, logical thread.
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
    color: c.color,
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

  const shuffledWords = [...words].sort(() => Math.random() - 0.5);

  return {
    difficulty,
    levelNumber,
    categories,
    words: shuffledWords
  };
}
