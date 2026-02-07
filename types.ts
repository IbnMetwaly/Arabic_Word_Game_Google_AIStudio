
export enum Difficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  EXPERT = 'EXPERT'
}

export interface Word {
  id: string;
  text: string;
  categoryId: string;
  isSolved: boolean;
}

export interface Category {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
}

export interface GameLevel {
  difficulty: Difficulty;
  levelNumber: number;
  categories: Category[];
  words: Word[];
}

export interface UserProgress {
  userId: string;
  username: string;
  currentLevel: Difficulty;
  bestTimes: Record<Difficulty, number>; // in seconds
}

export interface AppState {
  user: UserProgress | null;
  gameState: 'LOBBY' | 'PLAYING' | 'COMPLETED' | 'LOADING';
  currentLevel: GameLevel | null;
  currentLevelNumber: number;
  selectedWordIds: string[];
  mistakeCount: number;
  timer: number;
  activeHint?: string | null;
  hintUsedCount: number;
  isMuted: boolean;
}
