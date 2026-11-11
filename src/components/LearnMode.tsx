import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles,
  Lightbulb,
  RotateCw,
  Trophy,
  BrainCircuit,
  Volume2,
} from 'lucide-react';
import { StudySet, Card } from '../types';
import { Language, translations } from '../translations';
import { soundEffects, speakText } from '../utils/speech';
import { calculateSM2 } from '../utils/srs';
import { saveCardProgress, recordStudySession } from '../utils/storage';
import { evaluateAnswer } from '../utils/fuzzy';

interface LearnModeProps {
  set: StudySet;
  lang: Language;
  onBack: () => void;
  onOpenExplain: (card: Card) => void;
}

interface LearnCardState {
  card: Card;
  masteryCount: number; // 0 = learning, 1 = familiar, 2 = mastered
  mistakes: number;
}

export const LearnMode: React.FC<LearnModeProps> = ({
  set,
  lang,
  onBack,
  onOpenExplain,
}) => {
  const t = translations[lang];

  // Initialize pool of cards
  const [deck, setDeck] = useState<LearnCardState[]>(() =>
    set.cards.map((c) => ({ card: c, masteryCount: 0, mistakes: 0 }))
  );

  const [currentIdx, setCurrentIdx] = useState(0);
  const [typedInput, setTypedInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Active round cards (the ones that are not yet mastered)
  const remaining = useMemo(
    () => deck.filter((d) => d.masteryCount < 2),
    [deck]
  );
  const masteredCount = useMemo(
    () => deck.filter((d) => d.masteryCount >= 2).length,
    [deck]
  );

  const activeItem = remaining[currentIdx % (remaining.length || 1)] as LearnCardState | undefined;

  // Decide question type: if masteryCount === 0 => Multiple choice; if masteryCount === 1 => Type answer or True/False
  const questionType: 'choice' | 'write' = useMemo(() => {
    if (!activeItem) return 'choice';
    if (activeItem.masteryCount === 1) return 'write';
    return 'choice';
  }, [activeItem]);

  // Generate 4 multiple choice options
  const options = useMemo(() => {
    if (!activeItem) return [];
    if (activeItem.card.options && activeItem.card.options.length >= 4) {
      return activeItem.card.options;
    }
    // Generate distractors from other cards
    const otherBacks = set.cards
      .filter((c) => c.id !== activeItem.card.id)
      .map((c) => c.back)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const all = [activeItem.card.back, ...otherBacks].sort(() => Math.random() - 0.5);
    return all;
  }, [activeItem, set.cards]);

  const correctChoiceIndex = useMemo(() => {
    if (!activeItem) return 0;
    return options.findIndex((opt) => opt === activeItem.card.back);
  }, [activeItem, options]);

  // Handle choice submission
  const handleSelectOption = (idx: number) => {
    if (isAnswered || !activeItem) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === correctChoiceIndex;
    setWasCorrect(isCorrect);

    if (isCorrect) {
      soundEffects.correct();
      // Record SRS
      const prog = calculateSM2(undefined, activeItem.card.id, set.id, 4);
      saveCardProgress(prog);
    } else {
      soundEffects.wrong();
      const prog = calculateSM2(undefined, activeItem.card.id, set.id, 1);
      saveCardProgress(prog);
    }
  };

  // Handle typed write submission
  const handleTypeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isAnswered || !activeItem || !typedInput.trim()) return;

    const evaluation = evaluateAnswer(typedInput, activeItem.card.back);
    const isCorrect = evaluation.isCorrect;

    setIsAnswered(true);
    setWasCorrect(isCorrect);

    if (isCorrect) {
      soundEffects.correct();
      const prog = calculateSM2(undefined, activeItem.card.id, set.id, 5);
      saveCardProgress(prog);
    } else {
      soundEffects.wrong();
      const prog = calculateSM2(undefined, activeItem.card.id, set.id, 1);
      saveCardProgress(prog);
    }
  };

  // Override answer ("Tôi đã đúng")
  const handleOverride = () => {
    if (!isAnswered || wasCorrect || !activeItem) return;
    setWasCorrect(true);
    soundEffects.correct();
    const prog = calculateSM2(undefined, activeItem.card.id, set.id, 4);
    saveCardProgress(prog);
  };

  // Proceed to next card
  const handleNext = () => {
    if (!activeItem) return;

    // Update mastery count
    setDeck((prev) =>
      prev.map((item) => {
        if (item.card.id === activeItem.card.id) {
          return {
            ...item,
            masteryCount: wasCorrect ? item.masteryCount + 1 : Math.max(0, item.masteryCount - 1),
            mistakes: wasCorrect ? item.mistakes : item.mistakes + 1,
          };
        }
        return item;
      })
    );

    // Reset state for next card
    setIsAnswered(false);
    setSelectedOption(null);
    setTypedInput('');

    // Check if remaining would be 0
    const newRemaining = deck
      .map((item) => {
        if (item.card.id === activeItem.card.id) {
          return {
            ...item,
            masteryCount: wasCorrect ? item.masteryCount + 1 : Math.max(0, item.masteryCount - 1),
          };
        }
        return item;
      })
      .filter((d) => d.masteryCount < 2);

    if (newRemaining.length === 0) {
      setIsFinished(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      soundEffects.fanfare();
      recordStudySession(set.cards.length, 3);
    } else {
      setCurrentIdx((prev) => (prev + 1) % newRemaining.length);
    }
  };

  // Restart Learn Mode
  const handleRestart = () => {
    setDeck(set.cards.map((c) => ({ card: c, masteryCount: 0, mistakes: 0 })));
    setCurrentIdx(0);
    setIsAnswered(false);
    setSelectedOption(null);
    setTypedInput('');
    setIsFinished(false);
  };

  if (isFinished) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-white mx-auto shadow-xl shadow-amber-500/20">
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>

        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">
            {lang === 'vi' ? 'Tuyệt vời! Bạn đã thành thạo bộ thẻ!' : 'Congratulations! Set Mastered!'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            {lang === 'vi'
              ? 'Tất cả các thẻ trong bộ đã được trả lời chính xác qua các vòng học thích ứng.'
              : 'All flashcards have reached mastery status through adaptive rounds.'}
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg space-y-4">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-slate-500">{lang === 'vi' ? 'Tổng số thẻ' : 'Total cards'}:</span>
            <span className="text-slate-900 dark:text-white font-extrabold">{set.cards.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-slate-500">{lang === 'vi' ? 'Cấp độ thông thạo' : 'Mastery level'}:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">100%</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRestart}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition"
          >
            {t.studyAgain}
          </button>
          <button
            onClick={onBack}
            className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition"
          >
            {t.backToSet}
          </button>
        </div>
      </div>
    );
  }

  if (!activeItem) return null;

  const totalCards = deck.length;
  const progressPercent = Math.round((masteredCount / totalCards) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6 flex flex-col justify-between min-h-[calc(100vh-5rem)]">
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

          <div className="flex items-center gap-2.5">
            <BrainCircuit className="w-4 h-4 text-indigo-500" />
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              {lang === 'vi' ? 'Chế độ Học thích ứng' : 'Adaptive Learn'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {masteredCount} / {totalCards} {t.mastered}
            </span>
          </div>
        </div>

        {/* Multi-step progress bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Study Question Card */}
      <div className="my-auto">
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
          {/* Card Meta & Audio */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {questionType === 'choice'
                  ? lang === 'vi'
                    ? 'Trắc nghiệm chọn đáp án'
                    : 'Multiple Choice'
                  : lang === 'vi'
                  ? 'Gõ định nghĩa chính xác'
                  : 'Type Definition'}
              </span>
              <span className="text-xs text-slate-400">
                {activeItem.masteryCount === 0
                  ? lang === 'vi'
                    ? '• Vòng 1: Làm quen'
                    : '• Round 1: Familiarize'
                  : lang === 'vi'
                  ? '• Vòng 2: Củng cố sâu'
                  : '• Round 2: Master'}
              </span>
            </div>

            <button
              onClick={() => speakText(activeItem.card.front)}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {/* Prompt Question */}
          <div className="text-center sm:text-left py-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              {t.front}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-relaxed">
              {activeItem.card.front}
            </h2>
            {activeItem.card.hint && (
              <p className="mt-2 text-xs sm:text-sm text-slate-400 italic">
                💡 {lang === 'vi' ? 'Gợi ý:' : 'Hint:'} {activeItem.card.hint}
              </p>
            )}
          </div>

          {/* Interactive Answer Area */}
          {questionType === 'choice' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {options.map((option, idx) => {
                let btnStyle =
                  'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-800 dark:text-slate-200';

                if (isAnswered) {
                  if (idx === correctChoiceIndex) {
                    btnStyle =
                      'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold';
                  } else if (idx === selectedOption) {
                    btnStyle =
                      'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300';
                  } else {
                    btnStyle = 'opacity-40 border-transparent';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`p-4 rounded-2xl border-2 text-left text-xs sm:text-sm font-medium transition flex items-start gap-3 active:scale-[0.99] ${btnStyle}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 leading-snug">{option}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Typed Response Input */
            <form onSubmit={handleTypeSubmit} className="space-y-4 pt-2">
              <div>
                <input
                  type="text"
                  autoFocus
                  disabled={isAnswered}
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  placeholder={
                    lang === 'vi'
                      ? 'Gõ định nghĩa hoặc đáp án tại đây...'
                      : 'Type definition or answer here...'
                  }
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-sm font-semibold text-slate-900 dark:text-white outline-none transition"
                />
              </div>

              {!isAnswered && (
                <button
                  type="submit"
                  disabled={!typedInput.trim()}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition disabled:opacity-40"
                >
                  {lang === 'vi' ? 'Kiểm tra câu trả lời' : 'Submit Answer'}
                </button>
              )}
            </form>
          )}

          {/* Feedback & AI Explanation Bar */}
          {isAnswered && (
            <div
              className={`p-4 sm:p-5 rounded-2xl border-2 space-y-3 ${
                wasCorrect
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base">
                  {wasCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-300">
                        {lang === 'vi' ? 'Chính xác! Thẻ đang được nâng cấp độ.' : 'Correct! Card upgraded.'}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                      <span className="text-rose-700 dark:text-rose-300">
                        {lang === 'vi' ? 'Chưa chính xác! Thẻ sẽ xuất hiện lại.' : 'Incorrect! Will repeat.'}
                      </span>
                    </>
                  )}
                </div>

                {!wasCorrect && (
                  <button
                    onClick={handleOverride}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {lang === 'vi' ? 'Tôi đã trả lời đúng (Ghi đè)' : 'I was right (Override)'}
                  </button>
                )}
              </div>

              {/* Reveal Correct Answer if wrong */}
              {!wasCorrect && (
                <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-bold text-slate-500">
                    {lang === 'vi' ? 'Đáp án đúng:' : 'Correct answer:'}{' '}
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {activeItem.card.back}
                  </span>
                </div>
              )}

              {/* AI Explanation trigger */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => onOpenExplain(activeItem.card)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold shadow-sm hover:bg-indigo-50 transition"
                >
                  <Lightbulb className="w-4 h-4" />
                  <span>{t.explainCard}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition"
                >
                  {lang === 'vi' ? 'Tiếp tục' : 'Continue'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 py-2">
        {lang === 'vi'
          ? 'Học thông minh tự động lặp lại các câu bạn làm sai cho đến khi thuộc lòng.'
          : 'Smart Learn automatically repeats missed cards until mastery.'}
      </div>
    </div>
  );
};
