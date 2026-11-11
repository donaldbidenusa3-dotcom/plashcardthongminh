import React, { useState } from 'react';
import {
  Flame,
  Clock,
  CheckCircle2,
  Trophy,
  CalendarCheck,
  TrendingUp,
  BrainCircuit,
  ArrowLeft,
  Target,
  Sparkles,
} from 'lucide-react';
import { StudyStats, StudySet, CardProgress } from '../types';
import { Language, translations } from '../translations';
import { isCardDue } from '../utils/srs';

interface StatsViewProps {
  stats: StudyStats;
  progresses: Record<string, CardProgress>;
  sets: StudySet[];
  lang: Language;
  onBack: () => void;
  onStartDueReview: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  stats,
  progresses,
  sets,
  lang,
  onBack,
  onStartDueReview,
}) => {
  const t = translations[lang];

  // Calculate mastery distribution across all cards
  let totalCardsInApp = 0;
  sets.forEach((s) => (totalCardsInApp += s.cards.length));

  let masteredCount = 0;
  let learningCount = 0;
  let dueCount = 0;

  Object.values(progresses).forEach((p) => {
    if (p.level === 'mastered') masteredCount += 1;
    else if (p.level === 'learning') learningCount += 1;

    if (isCardDue(p)) dueCount += 1;
  });

  const unstudiedCount = Math.max(0, totalCardsInApp - masteredCount - learningCount);

  // History past 7 days chart simulation
  const last7Days = stats.history.slice(-7);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Quay lại Trang chủ' : 'Back to Home'}</span>
        </button>

        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          <span>{lang === 'vi' ? 'Tiến độ & Thống kê học tập' : 'Study Progress & Stats'}</span>
        </h1>
      </div>

      {/* Due Today Hero Banner */}
      {dueCount > 0 && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <CalendarCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black">
                {lang === 'vi' ? `Bạn có ${dueCount} thẻ cần ôn hôm nay!` : `You have ${dueCount} cards due today!`}
              </h3>
              <p className="text-xs text-white/80 mt-1">
                {lang === 'vi'
                  ? 'Thuật toán lặp lại ngắt quãng (SM-2) nhắc bạn ôn đúng thời điểm để khắc sâu vào trí nhớ dài hạn.'
                  : 'Spaced repetition (SM-2) schedules cards right when you are about to forget them.'}
              </p>
            </div>
          </div>

          <button
            onClick={onStartDueReview}
            className="px-6 py-3 rounded-2xl bg-white text-indigo-600 hover:bg-slate-50 font-extrabold text-sm shadow-lg shadow-black/10 transition active:scale-95 shrink-0"
          >
            {t.startReview}
          </button>
        </div>
      )}

      {/* Top 4 Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-500">
            <Flame className="w-5 h-5 fill-amber-500" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.currentStreak}
            </span>
            <span className="text-xs text-slate-400 font-bold ml-1">{t.days}</span>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              {t.streak}
            </p>
          </div>
        </div>

        {/* Total Cards Studied */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.totalCardsStudied}
            </span>
            <span className="text-xs text-slate-400 font-bold ml-1">{t.cards}</span>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              {t.cardsStudied}
            </p>
          </div>
        </div>

        {/* Study Time */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.studyTimeMinutes}
            </span>
            <span className="text-xs text-slate-400 font-bold ml-1">{t.minutes}</span>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              {t.studyTime}
            </p>
          </div>
        </div>

        {/* Mastered */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {masteredCount}
            </span>
            <span className="text-xs text-slate-400 font-bold ml-1">{t.cards}</span>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              {t.mastered} (SM-2)
            </p>
          </div>
        </div>
      </div>

      {/* Mastery Breakdown */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-indigo-500" />
          <span>{lang === 'vi' ? 'Phân bố độ thuộc bài (Mastery Levels)' : 'Mastery Levels'}</span>
        </h3>

        {/* Horizontal stacked bar */}
        <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${(masteredCount / (totalCardsInApp || 1)) * 100}%` }}
            className="bg-emerald-500 h-full"
            title={`${t.mastered}: ${masteredCount}`}
          />
          <div
            style={{ width: `${(learningCount / (totalCardsInApp || 1)) * 100}%` }}
            className="bg-indigo-500 h-full"
            title={`${t.learning}: ${learningCount}`}
          />
          <div
            style={{ width: `${(unstudiedCount / (totalCardsInApp || 1)) * 100}%` }}
            className="bg-slate-300 dark:bg-slate-600 h-full"
            title={`${t.newCards}: ${unstudiedCount}`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-2 text-xs">
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-emerald-600 font-black text-lg block">{masteredCount}</span>
            <span className="text-slate-500 font-bold">{t.mastered}</span>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
            <span className="text-indigo-600 font-black text-lg block">{learningCount}</span>
            <span className="text-slate-500 font-bold">{t.learning}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-300 font-black text-lg block">
              {unstudiedCount}
            </span>
            <span className="text-slate-400 font-bold">{t.newCards}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
