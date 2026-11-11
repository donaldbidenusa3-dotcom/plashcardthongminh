import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Timer,
  Trophy,
  RotateCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { StudySet, Card } from '../types';
import { Language, translations } from '../translations';
import { soundEffects } from '../utils/speech';
import { recordMatchScore, getStudyStats, recordStudySession } from '../utils/storage';

interface MatchModeProps {
  set: StudySet;
  lang: Language;
  onBack: () => void;
}

interface TileItem {
  id: string; // unique tile id
  cardId: string;
  type: 'front' | 'back';
  text: string;
  matched: boolean;
}

export const MatchMode: React.FC<MatchModeProps> = ({ set, lang, onBack }) => {
  const t = translations[lang];

  const [tiles, setTiles] = useState<TileItem[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [wrongPairIds, setWrongPairIds] = useState<string[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const timerRef = useRef<any>(null);

  // Initialize 6 random cards (12 tiles)
  const initGame = () => {
    const selectedCards = [...set.cards]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(6, set.cards.length));

    const tileList: TileItem[] = [];
    selectedCards.forEach((c) => {
      tileList.push({
        id: `f-${c.id}`,
        cardId: c.id,
        type: 'front',
        text: c.front,
        matched: false,
      });
      tileList.push({
        id: `b-${c.id}`,
        cardId: c.id,
        type: 'back',
        text: c.back,
        matched: false,
      });
    });

    // Shuffle tiles
    setTiles(tileList.sort(() => Math.random() - 0.5));
    setSelectedTileId(null);
    setWrongPairIds([]);
    setElapsedMs(0);
    setIsActive(true);
    setIsCompleted(false);
  };

  useEffect(() => {
    initGame();
  }, [set.id]);

  // Timer loop
  useEffect(() => {
    if (isActive && !isCompleted) {
      const startTime = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isCompleted]);

  // Handle tile click
  const handleTileClick = (tile: TileItem) => {
    if (tile.matched || isCompleted) return;

    // First tile clicked
    if (!selectedTileId) {
      setSelectedTileId(tile.id);
      return;
    }

    // Clicked same tile
    if (selectedTileId === tile.id) {
      setSelectedTileId(null);
      return;
    }

    const firstTile = tiles.find((t) => t.id === selectedTileId);
    if (!firstTile) {
      setSelectedTileId(tile.id);
      return;
    }

    // Check if match
    const isMatch =
      firstTile.cardId === tile.cardId && firstTile.type !== tile.type;

    if (isMatch) {
      soundEffects.matchSuccess();
      const updated = tiles.map((t) =>
        t.id === firstTile.id || t.id === tile.id ? { ...t, matched: true } : t
      );
      setTiles(updated);
      setSelectedTileId(null);

      // Check if all matched
      if (updated.every((t) => t.matched)) {
        setIsActive(false);
        setIsCompleted(true);
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
        soundEffects.fanfare();
        recordMatchScore(set.id, elapsedMs);
        recordStudySession(selectedCardsCount, 1);
      }
    } else {
      // Mismatch
      soundEffects.wrong();
      setWrongPairIds([firstTile.id, tile.id]);
      setTimeout(() => {
        setWrongPairIds([]);
        setSelectedTileId(null);
      }, 650);
    }
  };

  const selectedCardsCount = Math.min(6, set.cards.length);
  const remainingCount = tiles.filter((t) => !t.matched).length / 2;

  const seconds = (elapsedMs / 1000).toFixed(1);

  // Leaderboard
  const leaderboard = getStudyStats()
    .matchLeaderboard.filter((l) => l.setId === set.id)
    .slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col justify-between min-h-[calc(100vh-5rem)]">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.backToSet}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-mono font-extrabold text-sm sm:text-base">
            <Timer className="w-4 h-4" />
            <span>{seconds}s</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>
              {remainingCount} {lang === 'vi' ? 'cặp còn lại' : 'pairs left'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid or Victory */}
      {!isCompleted ? (
        <div className="my-auto py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {tiles.map((tile) => {
              const isSelected = selectedTileId === tile.id;
              const isWrong = wrongPairIds.includes(tile.id);

              if (tile.matched) {
                return (
                  <div
                    key={tile.id}
                    className="h-28 sm:h-36 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 opacity-20 pointer-events-none"
                  />
                );
              }

              return (
                <button
                  key={tile.id}
                  onClick={() => handleTileClick(tile)}
                  className={`h-28 sm:h-36 p-4 rounded-2xl border-2 text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center text-center shadow-md select-none active:scale-95 ${
                    isWrong
                      ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-700 dark:text-rose-300 scale-95'
                      : isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950 border-indigo-600 text-indigo-700 dark:text-indigo-300 ring-4 ring-indigo-500/20 scale-102'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:border-indigo-400 hover:shadow-lg'
                  }`}
                >
                  <span className="line-clamp-4 leading-relaxed">{tile.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Victory screen */
        <div className="my-auto py-8 px-4 text-center max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-500 mx-auto">
            <Trophy className="w-8 h-8 animate-bounce" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {lang === 'vi' ? 'Hoàn thành Ghép Cặp!' : 'Match Game Completed!'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'vi' ? 'Thời gian hoàn thành của bạn:' : 'Your final time:'}
            </p>
            <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-3">
              {seconds} giây
            </div>
          </div>

          {/* Personal Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-left space-y-2">
              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                {lang === 'vi' ? 'Kỷ lục cá nhân' : 'Personal Leaderboard'}
              </span>
              {leaderboard.map((record, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs font-semibold py-1 border-b border-slate-100 dark:border-slate-800 last:border-none"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-4 text-slate-400">#{idx + 1}</span>
                    <span>{record.date}</span>
                  </span>
                  <span className="font-mono text-indigo-600 font-bold">
                    {(record.timeMs / 1000).toFixed(1)}s
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={initGame}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md transition active:scale-95"
            >
              <RotateCw className="w-4 h-4" />
              <span>{lang === 'vi' ? 'Chơi lại vòng mới' : 'Play Again'}</span>
            </button>
            <button
              onClick={onBack}
              className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
            >
              {t.backToSet}
            </button>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-slate-400 py-2">
        {lang === 'vi'
          ? 'Nối đúng cặp thuật ngữ và định nghĩa để làm biến mất các thẻ nhanh nhất có thể!'
          : 'Match pairs of terms and definitions to clear the board as fast as possible!'}
      </div>
    </div>
  );
};
