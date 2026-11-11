/**
 * Fuzzy string matching with Levenshtein distance
 */

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
    .replace(/\s+/g, ' ');
}

export function levenshteinDistance(a: string, b: string): number {
  const s1 = a;
  const s2 = b;
  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return track[s2.length][s1.length];
}

export function calculateSimilarity(input: string, target: string): number {
  const normInput = normalizeText(input);
  const normTarget = normalizeText(target);

  if (normInput === normTarget) return 1.0;
  if (!normInput || !normTarget) return 0.0;

  // Exact substring check
  if (normInput.includes(normTarget) || normTarget.includes(normInput)) {
    const minLen = Math.min(normInput.length, normTarget.length);
    const maxLen = Math.max(normInput.length, normTarget.length);
    if (minLen / maxLen >= 0.7) {
      return 0.9;
    }
  }

  const distance = levenshteinDistance(normInput, normTarget);
  const maxLength = Math.max(normInput.length, normTarget.length);
  return Math.max(0, 1 - distance / maxLength);
}

export interface MatchResult {
  isExact: boolean;
  isClose: boolean;
  isCorrect: boolean;
  similarity: number;
}

export function evaluateAnswer(input: string, correctTarget: string): MatchResult {
  const similarity = calculateSimilarity(input, correctTarget);
  const isExact = similarity >= 0.98;
  const isClose = similarity >= 0.82;
  const isCorrect = isExact || isClose;

  return {
    isExact,
    isClose,
    isCorrect,
    similarity: Math.round(similarity * 100),
  };
}
