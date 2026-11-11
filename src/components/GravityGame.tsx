import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Flame,
  Heart,
  Trophy,
  RotateCw,
  Rocket,
  Zap,
} from 'lucide-react';
import { StudySet, Card } from '../types';
import { Language, translations } from '../translations';
import { soundEffects } from '../utils/speech';
import { evaluateAnswer } from '../utils/fuzzy';
import { recordStudySession } from '../utils/storage';

interface GravityGameProps {
  set: StudySet;
  lang: Language;
  onBack: () => void;
}

interface Meteor {
  id: string;
  card: Card;
  y: number; // 0% to 100%
  speed: number;
}

export const GravityGame: React.FC<GravityGameProps> = ({ set, lang, onBack }) => {
  const t = translations[lang];

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [currentMeteor, setCurrentMeteor] = useState<Meteor | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null);

  const cardPool = useRef<Card[]>([...set.cards].sort(() => Math.random() - 0.5));
  const poolIdx = useRef(0);

  const getNextCard = (): Card => {
    if (poolIdx.current >= cardPool.current.length) {
      cardPool.current = [...set.cards].sort(() => Math.random() - 0.5);
      poolIdx.current = 0;
    }
    const card = cardPool.current[poolIdx.current];
    poolIdx.current += 1;
    return card;
  };

  const spawnMeteor = () => {
    const card = getNextCard();
    setCurrentMeteor({
      id: `m-${Date.now()}`,
      card,
      y: 5,
      speed: 0.35 + level * 0.1,
    });
    setRevealedAnswer(null);
  };

  useEffect(() => {
    spawnMeteor();
  }, []);

  // Animation frame loop
  useEffect(() => {
    if (isGameOver || !currentMeteor) return;

    const interval = setInterval(() => {
      setCurrentMeteor((prev) => {
        if (!prev) return null;
        const nextY = prev.y + prev.speed;

        // Hit ground!
        if (nextY >= 88) {
          soundEffects.wrong();
          setLives((l) => {
            const nextLives = l - 1;
            if (nextLives <= 0) {
              setIsGameOver(true);
            }
            return nextLives;
          });
          setRevealedAnswer(prev.card.back);

          // Spawn next after brief delay
          setTimeout(() => {
            if (lives > 1) {
              spawnMeteor();
            }
          }, 1200);

          return null;
        }

        return { ...prev, y: nextY };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [currentMeteor, isGameOver, level, lives]);

  const handleShoot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMeteor || isGameOver || !userInput.trim()) return;

    const res = evaluateAnswer(userInput, currentMeteor.card.back);
    if (res.isCorrect) {
      soundEffects.matchSuccess();
      setScore((s) => s + 100 * level);
      setUserInput('');

      // Level up every 300 points
      if ((score + 100) % 300 === 0) {
        setLevel((lv) => lv + 1);
      }

      spawnMeteor();
    } else {
      soundEffects.wrong();
    }
  };

  const restartGame = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setIsGameOver(false);
    setUserInput('');
    cardPool.current = [...set.cards].sort(() => Math.random() - 0.5);
    poolIdx.current = 0;
    spawnMeteor();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 flex flex-col justify-between h-[calc(100vh-5rem)]">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToSet}</span>
        </button>

        <div className="flex items-center gap-6">
          {/* Level */}
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
            <Rocket className="w-4 h-4" />
            <span>{lang === 'vi' ? `Cấp độ ${level}` : `Level ${level}`}</span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1.5 text-xs font-mono font-black text-amber-500">
            <Flame className="w-4 h-4 fill-amber-500" />
            <span>{score} pts</span>
          </div>

          {/* Lives */}
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((heart) => (
              <Heart
                key={heart}
                className={`w-4 h-4 transition ${
                  heart <= lives
                    ? 'text-rose-500 fill-rose-500'
                    : 'text-slate-300 dark:text-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Game Canvas Area */}
      <div className="relative flex-1 my-4 bg-slate-900 rounded-3xl overflow-hidden border-2 border-indigo-900/60 shadow-2xl p-4 flex flex-col justify-between">
        {/* Background stars */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Falling meteor */}
        {!isGameOver && currentMeteor && (
          <div
            className="absolute left-1/2 -translate-x-1/2 transition-all duration-75 w-11/12 max-w-md pointer-events-none"
            style={{ top: `${currentMeteor.y}%` }}
          >
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-700 to-purple-800 border-2 border-indigo-400 shadow-xl shadow-indigo-500/30 text-white text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200 block mb-1">
                {lang === 'vi' ? 'THIÊN THẠCH' : 'ASTEROID'}
              </span>
              <h4 className="text-base sm:text-lg font-extrabold leading-snug">
                {currentMeteor.card.front}
              </h4>
            </div>
          </div>
        )}

        {/* Answer revealed if hit */}
        {revealedAnswer && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 rounded-2xl bg-rose-950/90 border border-rose-500 text-rose-200 text-center text-xs sm:text-sm font-bold shadow-xl animate-bounce">
            {lang === 'vi' ? 'Thiên thạch va chạm! Đáp án đúng là:' : 'Asteroid crashed! Correct was:'}
            <div className="text-white text-base mt-1 font-black">{revealedAnswer}</div>
          </div>
        )}

        {/* Game Over Screen */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-5 z-20">
            <div className="w-16 h-16 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-500">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white">
                {lang === 'vi' ? 'Hết sinh mệnh!' : 'Game Over!'}
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                {lang === 'vi' ? 'Điểm số của bạn:' : 'Your final score:'}
              </p>
              <div className="text-4xl font-black text-amber-400 font-mono mt-2">
                {score} pts
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={restartGame}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md transition"
              >
                {lang === 'vi' ? 'Chơi lại' : 'Play Again'}
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-xs transition"
              >
                {t.backToSet}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* Ground Defense Laser Input */}
        <div className="relative z-10 pt-4">
          <form onSubmit={handleShoot} className="flex gap-2 max-w-xl mx-auto">
            <input
              type="text"
              autoFocus
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={
                lang === 'vi'
                  ? 'Gõ định nghĩa để bắn thiên thạch (Enter)...'
                  : 'Type definition to shoot asteroid...'
              }
              className="flex-1 p-3.5 rounded-2xl bg-slate-800/90 border-2 border-indigo-500/60 focus:border-indigo-400 text-white font-semibold text-sm outline-none shadow-lg placeholder-slate-400"
            />
            <button
              type="submit"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-indigo-500/30 transition active:scale-95 flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>{lang === 'vi' ? 'Bắn' : 'Fire'}</span>
            </button>
          </form>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        {lang === 'vi'
          ? 'Gõ đáp án chính xác trước khi thiên thạch chạm mặt đất. Càng lên cấp độ cao thiên thạch càng rơi nhanh!'
          : 'Type the correct answer before the asteroid hits the ground! Speed increases with each level.'}
      </div>
    </div>
  );
};
