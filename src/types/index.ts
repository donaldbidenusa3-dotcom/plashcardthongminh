export interface Card {
  id: string;
  front: string;
  back: string;
  hint?: string;
  imageUrl?: string;
  isStarred?: boolean;
  options?: string[]; // Multiple choice options if detected
  correctIndex?: number;
  explanation?: string;
  isAiSuggested?: boolean;
  tags?: string[];
  createdAt: number;
}

export interface StudySet {
  id: string;
  title: string;
  description: string;
  subject: string;
  tags: string[];
  isPublic: boolean;
  folderId?: string;
  cards: Card[];
  createdAt: number;
  updatedAt: number;
  authorName?: string;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdAt: number;
}

export interface CardProgress {
  cardId: string;
  setId: string;
  level: 'new' | 'learning' | 'mastered';
  repetitions: number;
  intervalDays: number;
  easeFactor: number; // default 2.5
  nextReviewDate: string; // YYYY-MM-DD
  lastReviewedAt?: number;
  correctCount: number;
  wrongCount: number;
}

export interface StudyStats {
  totalCardsStudied: number;
  studyTimeMinutes: number;
  currentStreak: number;
  lastStudyDate: string; // YYYY-MM-DD
  dailyGoal: number; // default 20 cards
  history: { date: string; count: number }[]; // Daily card counts
  matchLeaderboard: { setId: string; timeMs: number; date: string }[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'student' | 'teacher';
  language: 'vi' | 'en';
  darkMode: boolean;
}

export type StudyModeType = 'flashcards' | 'learn' | 'test' | 'match' | 'write' | 'gravity';
