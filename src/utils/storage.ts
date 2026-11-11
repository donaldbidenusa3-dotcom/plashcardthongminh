import { StudySet, Folder, CardProgress, StudyStats, UserProfile, Card } from '../types';
import { initialStudySets, initialFolders } from '../data/sampleSets';
import { getTodayDateString, updateStreak } from './srs';

const SETS_KEY = 'quizmaster_sets_v1';
const FOLDERS_KEY = 'quizmaster_folders_v1';
const PROGRESS_KEY = 'quizmaster_progress_v1';
const STATS_KEY = 'quizmaster_stats_v1';
const USER_KEY = 'quizmaster_user_v1';

export function getStudySets(): StudySet[] {
  try {
    const raw = localStorage.getItem(SETS_KEY);
    if (!raw) {
      localStorage.setItem(SETS_KEY, JSON.stringify(initialStudySets));
      return initialStudySets;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading study sets:', e);
    return initialStudySets;
  }
}

export function saveStudySet(set: StudySet): StudySet[] {
  const sets = getStudySets();
  const existingIdx = sets.findIndex((s) => s.id === set.id);
  let updated: StudySet[];
  if (existingIdx >= 0) {
    updated = [...sets];
    updated[existingIdx] = { ...set, updatedAt: Date.now() };
  } else {
    updated = [set, ...sets];
  }
  localStorage.setItem(SETS_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteStudySet(setId: string): StudySet[] {
  const sets = getStudySets().filter((s) => s.id !== setId);
  localStorage.setItem(SETS_KEY, JSON.stringify(sets));
  return sets;
}

export function duplicateStudySet(setId: string): StudySet[] {
  const sets = getStudySets();
  const target = sets.find((s) => s.id === setId);
  if (!target) return sets;

  const clone: StudySet = {
    ...target,
    id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title: `${target.title} (Bản sao)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cards: target.cards.map((c) => ({
      ...c,
      id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    })),
  };

  const updated = [clone, ...sets];
  localStorage.setItem(SETS_KEY, JSON.stringify(updated));
  return updated;
}

export function getFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(initialFolders));
      return initialFolders;
    }
    return JSON.parse(raw);
  } catch (e) {
    return initialFolders;
  }
}

export function saveFolder(folder: Folder): Folder[] {
  const folders = getFolders();
  const existingIdx = folders.findIndex((f) => f.id === folder.id);
  let updated: Folder[];
  if (existingIdx >= 0) {
    updated = [...folders];
    updated[existingIdx] = folder;
  } else {
    updated = [...folders, folder];
  }
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteFolder(folderId: string): Folder[] {
  const folders = getFolders().filter((f) => f.id !== folderId);
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  return folders;
}

export function getAllProgresses(): Record<string, CardProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveCardProgress(progress: CardProgress): void {
  const all = getAllProgresses();
  all[progress.cardId] = progress;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}

export function getStudyStats(): StudyStats {
  const defaultStats: StudyStats = {
    totalCardsStudied: 42,
    studyTimeMinutes: 35,
    currentStreak: 3,
    lastStudyDate: getTodayDateString(),
    dailyGoal: 20,
    history: [
      { date: getTodayDateString(), count: 18 },
    ],
    matchLeaderboard: [],
  };

  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      localStorage.setItem(STATS_KEY, JSON.stringify(defaultStats));
      return defaultStats;
    }
    return JSON.parse(raw);
  } catch (e) {
    return defaultStats;
  }
}

export function recordStudySession(cardsCount: number, minutes: number = 1): StudyStats {
  const stats = getStudyStats();
  const today = getTodayDateString();

  const { newStreak, newDate } = updateStreak(stats.lastStudyDate, stats.currentStreak);

  const history = [...stats.history];
  const todayEntry = history.find((h) => h.date === today);
  if (todayEntry) {
    todayEntry.count += cardsCount;
  } else {
    history.push({ date: today, count: cardsCount });
  }

  // Keep last 30 days
  if (history.length > 30) history.shift();

  const updatedStats: StudyStats = {
    ...stats,
    totalCardsStudied: stats.totalCardsStudied + cardsCount,
    studyTimeMinutes: stats.studyTimeMinutes + minutes,
    currentStreak: newStreak,
    lastStudyDate: newDate,
    history,
  };

  localStorage.setItem(STATS_KEY, JSON.stringify(updatedStats));
  return updatedStats;
}

export function recordMatchScore(setId: string, timeMs: number): void {
  const stats = getStudyStats();
  const leaderboard = [...(stats.matchLeaderboard || [])];
  leaderboard.push({ setId, timeMs, date: new Date().toLocaleDateString('vi-VN') });
  leaderboard.sort((a, b) => a.timeMs - b.timeMs);

  const updated: StudyStats = {
    ...stats,
    matchLeaderboard: leaderboard.slice(0, 10),
  };
  localStorage.setItem(STATS_KEY, JSON.stringify(updated));
}

export function getUserProfile(): UserProfile {
  const defaultUser: UserProfile = {
    id: 'user_local_1',
    name: 'Học viên Chăm Chỉ',
    email: 'student@quizmaster.ai',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'student',
    language: 'vi',
    darkMode: false,
  };

  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : defaultUser;
  } catch (e) {
    return defaultUser;
  }
}

export function saveUserProfile(user: UserProfile): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Export utilities
export function exportToCsv(set: StudySet): void {
  const rows = [
    ['Mặt trước (Term)', 'Mặt sau (Definition)', 'Gợi ý (Hint)', 'Giải thích (Explanation)'],
    ...set.cards.map((c) => [
      `"${c.front.replace(/"/g, '""')}"`,
      `"${c.back.replace(/"/g, '""')}"`,
      `"${(c.hint || '').replace(/"/g, '""')}"`,
      `"${(c.explanation || '').replace(/"/g, '""')}"`,
    ]),
  ];
  const csvContent = '\uFEFF' + rows.map((e) => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${set.title.replace(/[^a-zA-Z0-9\p{L}]/gu, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJson(set: StudySet): void {
  const jsonStr = JSON.stringify(set, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${set.title.replace(/[^a-zA-Z0-9\p{L}]/gu, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToQuizletText(set: StudySet): string {
  // Quizlet export format: Term \t Definition \n
  return set.cards.map((c) => `${c.front}\t${c.back}`).join('\n');
}

export function parseQuizletText(rawText: string): Partial<Card>[] {
  const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    // Try tab separator first, then comma, then hyphen
    let parts = line.split('\t');
    if (parts.length < 2) {
      parts = line.split(' - ');
    }
    if (parts.length < 2) {
      parts = line.split(',');
    }
    const front = (parts[0] || '').trim();
    const back = (parts.slice(1).join(' - ') || '').trim();
    return {
      front,
      back,
    };
  }).filter((c) => c.front && c.back);
}
