import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

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
          icon: { type: Type.STRING, description: "A unique and highly relevant emoji representing the category (e.g. for fruits)" },
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

export async function POST(request: NextRequest) {
  try {
    const { difficulty, levelNumber } = await request.json();

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API_KEY not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

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
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: levelSchema
      }
    });

    const rawData = JSON.parse(response.text!);

    const categories = rawData.categories.map((c: any) => ({
      id: c.id,
      title: c.title,
      icon: c.icon,
      color: c.color,
      description: c.description
    }));

    const words = rawData.categories.flatMap((c: any) =>
      c.words.map((w: string, idx: number) => ({
        id: `${c.id}-${idx}`,
        text: w,
        categoryId: c.id,
        isSolved: false
      }))
    );

    const shuffledWords = [...words].sort(() => Math.random() - 0.5);

    return NextResponse.json({
      difficulty,
      levelNumber,
      categories,
      words: shuffledWords
    });
  } catch (error: any) {
    console.error("Failed to generate level:", error);
    return NextResponse.json({ error: error.message || "Failed to generate level" }, { status: 500 });
  }
}
