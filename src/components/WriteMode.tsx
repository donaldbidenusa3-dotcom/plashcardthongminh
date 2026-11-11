import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Volume2,
  CheckCircle2,
  XCircle,
  Lightbulb,
  RotateCw,
  Trophy,
} from 'lucide-react';
import { StudySet, Card } from '../types';
import { Language, translations } from '../translations';
import { soundEffects, speakText } from '../utils/speech';
import { evaluateAnswer, MatchResult } from '../utils/fuzzy';
import { calculateSM2 } from '../utils/srs';
import { saveCardProgress, recordStudySession } from '../utils/storage';

interface WriteModeProps {
  set: StudySet;
  lang: Language;
  onBack: () => void;
  onOpenExplain: (card: Card) => void;
}

export const WriteMode: React.FC<WriteModeProps> = ({
  set,
  lang,
  onBack,
  onOpenExplain,
}) => {
  const t = translations[lang];

  const [cards, setCards] = useState<Card[]>(() => [...set.cards]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [missedCards, setMissedCards] = useState<Card[]>([]);

  const currentCard = cards[currentIdx];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAnswered || !currentCard || !inputVal.trim()) return;

    const res = evaluateAnswer(inputVal, currentCard.back);
    setMatchResult(res);
    setIsAnswered(true);

    if (res.isCorrect) {
      soundEffects.correct();
      setCorrectCount((prev) => prev + 1);
      const prog = calculateSM2(undefined, currentCard.id, set.id, 5);
      saveCardProgress(prog);
    } else {
      soundEffects.wrong();
      setMissedCards((prev) => [...prev, currentCard]);
      const prog = calculateSM2(undefined, currentCard.id, set.id, 1);
      saveCardProgress(prog);
    }
  };

  const handleOverride = () => {
    if (!isAnswered || matchResult?.isCorrect || !currentCard) return;
    setMatchResult({
      isExact: false,
      isClose: true,
      isCorrect: true,
      similarity: 100,
    });
    setCorrectCount((prev) => prev + 1);
    setMissedCards((prev) => prev.filter((c) => c.id !== currentCard.id));
    soundEffects.correct();
    const prog = calculateSM2(undefined, currentCard.id, set.id, 4);
    saveCardProgress(prog);
  };

  const handleNext = () => {
    if (currentIdx < cards.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setInputVal('');
      setIsAnswered(false);
      setMatchResult(null);
    } else {
      setIsFinished(true);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      soundEffects.fanfare();
      recordStudySession(cards.length, 2);
    }
  };

  const handleRestart = () => {
    setCards([...set.cards]);
    setCurrentIdx(0);
    setInputVal('');
    setIsAnswered(false);
    setMatchResult(null);
    setCorrectCount(0);
    setMissedCards([]);
    setIsFinished(false);
  };

  const handleRetryMissedOnly = () => {
    if (missedCards.length === 0) return;
    setCards(missedCards);
    setCurrentIdx(0);
    setInputVal('');
    setIsAnswered(false);
    setMatchResult(null);
    setCorrectCount(0);
    setMissedCards([]);
    setIsFinished(false);
  };

  if (isFinished) {
    const pct = Math.round((correctCount / cards.length) * 100);

    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {lang === 'vi' ? 'Hoàn thành bài Luyện Viết!' : 'Write Mode Finished!'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {lang === 'vi' ? 'Kết quả chính tả của bạn:' : 'Your spelling accuracy:'}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl space-y-3">
          <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {pct}%
          </div>
          <div className="text-xs font-bold text-slate-500">
            {correctCount} / {cards.length} {lang === 'vi' ? 'từ chính xác' : 'correct'}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {missedCards.length > 0 && (
            <button
              onClick={handleRetryMissedOnly}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-md transition"
            >
              {lang === 'vi' ? `Luyện lại ${missedCards.length} từ sai` : `Retry ${missedCards.length} missed`}
            </button>
          )}

          <button
            onClick={handleRestart}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md transition"
          >
            {t.studyAgain}
          </button>

          <button
            onClick={onBack}
            className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
          >
            {t.backToSet}
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col justify-between min-h-[calc(100vh-5rem)]">
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

          <span className="text-xs font-extrabold text-slate-500">
            {currentIdx + 1} / {cards.length}
          </span>
        </div>

        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${Math.round(((currentIdx + 1) / cards.length) * 100)}%` }}
          />
        </div>
      </div>

      {/* Main Card */}
      <div className="my-auto">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              {t.front}
            </span>
            <button
              onClick={() => speakText(currentCard.front)}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center sm:text-left py-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-relaxed">
              {currentCard.front}
            </h2>
            {currentCard.hint && (
              <p className="mt-2 text-xs sm:text-sm text-slate-400 italic">
                💡 {lang === 'vi' ? 'Gợi ý:' : 'Hint:'} {currentCard.hint}
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                {lang === 'vi' ? 'Gõ đáp án / định nghĩa tiếng Việt:' : 'Type the definition:'}
              </label>
              <input
                type="text"
                autoFocus
                disabled={isAnswered}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={lang === 'vi' ? 'Nhập câu trả lời...' : 'Type answer...'}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-sm font-semibold text-slate-900 dark:text-white outline-none transition"
              />
            </div>

            {!isAnswered ? (
              <button
                type="submit"
                disabled={!inputVal.trim()}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md transition disabled:opacity-40"
              >
                {lang === 'vi' ? 'Kiểm tra' : 'Submit'}
              </button>
            ) : null}
          </form>

          {/* Feedback */}
          {isAnswered && matchResult && (
            <div
              className={`p-5 rounded-2xl border-2 space-y-3 ${
                matchResult.isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {matchResult.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-300">
                        {matchResult.isExact
                          ? lang === 'vi'
                            ? 'Chính xác 100%!'
                            : 'Exact match 100%!'
                          : lang === 'vi'
                          ? `Gần đúng! (${matchResult.similarity}%)`
                          : `Close enough! (${matchResult.similarity}%)`}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-500" />
                      <span className="text-rose-700 dark:text-rose-300">
                        {lang === 'vi' ? 'Chưa chính xác' : 'Incorrect'}
                      </span>
                    </>
                  )}
                </div>

                {!matchResult.isCorrect && (
                  <button
                    onClick={handleOverride}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    {lang === 'vi' ? 'Tôi đã đúng (Ghi đè)' : 'I was right'}
                  </button>
                )}
              </div>

              {/* Reveal answer */}
              {!matchResult.isExact && (
                <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-500">
                    {lang === 'vi' ? 'Đáp án đúng:' : 'Correct:'}{' '}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {currentCard.back}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => onOpenExplain(currentCard)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 text-xs font-bold shadow-sm"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{t.explainCard}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition"
                >
                  {lang === 'vi' ? 'Tiếp tục' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 py-2">
        {lang === 'vi'
          ? 'Chế độ Viết hỗ trợ thuật toán chấp nhận sai chính tả nhẹ (Fuzzy matching) giúp việc gõ linh hoạt hơn.'
          : 'Write Mode uses Levenshtein fuzzy matching to accommodate minor typos.'}
      </div>
    </div>
  );
};
