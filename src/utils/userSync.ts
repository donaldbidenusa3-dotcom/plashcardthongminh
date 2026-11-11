import { StudySet, Folder, StudyStats, CardProgress } from '../types';

export interface UserSyncPayload {
  sets: StudySet[];
  folders: Folder[];
  stats: StudyStats;
  progresses: Record<string, CardProgress>;
}

/**
 * Fetch persistent data for a Google user from the backend
 */
export async function fetchUserData(uid: string): Promise<UserSyncPayload | null> {
  try {
    const res = await fetch(`/api/user-data/${encodeURIComponent(uid)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.found && json.data) {
      return {
        sets: json.data.sets || [],
        folders: json.data.folders || [],
        stats: json.data.stats,
        progresses: json.data.progresses || {},
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch user data from server:', error);
    // Fallback to local storage for this UID if available
    try {
      const local = localStorage.getItem(`quizmaster_account_${uid}`);
      if (local) return JSON.parse(local);
    } catch {}
    return null;
  }
}

/**
 * Persist user data to server and local backup
 */
export async function persistUserData(
  uid: string,
  payload: UserSyncPayload
): Promise<boolean> {
  // Always update local cache for this user immediately
  try {
    localStorage.setItem(`quizmaster_account_${uid}`, JSON.stringify(payload));
  } catch (e) {
    console.warn('Local storage write warning:', e);
  }

  // Push to server
  try {
    const res = await fetch(`/api/user-data/${encodeURIComponent(uid)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to persist user data to server:', error);
    return false;
  }
}
