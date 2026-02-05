import { Difficulty, GameLevel } from "./types";

export async function generateLevel(difficulty: Difficulty, levelNumber: number): Promise<GameLevel> {
  const response = await fetch("/api/generate-level", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ difficulty, levelNumber }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || "Failed to generate level");
  }

  return response.json();
}
