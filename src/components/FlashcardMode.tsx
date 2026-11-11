import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Volume2,
  Star,
  Shuffle,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  Minimize2,
  Sparkles,
  Lightbulb,
  Check,
  X,
  Play,
  Pause,
  Layers,
  HelpCircle,
  Undo2,
} from 'lucide-react';
import { StudySet, Card, CardProgress } from '../types';
import { Language, translations } from '../translations';
import { speakText, soundEffects } from '../utils/speech';
import { calculateSM2 } from '../utils/srs';
import { saveCardProgress, recordStudySession } from '../utils/storage';

interface FlashcardModeProps {
  set: StudySet;
  lang: Language;
  onBack: () => void;
  onOpenExplain: (card: Card) => void;
  onOpenMnemonic: (card: Card) => void;
  initialStarredOnly?: boolean;
}

export const FlashcardMode: React.FC<FlashcardModeProps> = ({
  set,
  lang,
  onBack,
  onOpenExplain,
  onOpenMnemonic,
  initialStarredOnly = false,
}) => {
  const t = translations[lang];

  const [cards, setCards] = useState<Card[]>(() => {
    return initialStarredOnly ? set.cards.filter((c) => c.isStarred) : [...set.cards];
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [starredOnly, setStarredOnly] = useState(initialStarredOnly);
  const [frontFirst, setFrontFirst] = useState(true);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState(4000); // ms
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Session results
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [unknownIds, setUnknownIds] = useState<Set<string>>(new Set());
  const [isFinished, setIsFinished] = useState(false);

  // History stack for Undo
  const [history, setHistory] = useState<{ index: number; known: boolean; cardId: string }[]>([]);

  const currentCard = cards[currentIndex] as Card | undefined;

  // Toggle star
  const toggleStar = useCallback(() => {
    if (!currentCard) return;
    const updated = cards.map((c, i) => (i === currentIndex ? { ...c, isStarred: !c.isStarred } : c));
    setCards(updated);
  }, [cards, currentIndex, currentCard]);

  // Flip card
  const handleFlip = useCallback(() => {
    soundEffects.flip();
    setIsFlipped((prev) => !prev);
  }, []);

  // Answer Known (Right / Key 2)
  const handleKnown = useCallback(() => {
    if (!currentCard) return;
    soundEffects.correct();
    setKnownIds((prev) => new Set(prev).add(currentCard.id));
    setUnknownIds((prev) => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });

    // Record SM-2 SRS grade 4 (Good)
    const prog = calculateSM2(undefined, currentCard.id, set.id, 4);
    saveCardProgress(prog);

    setHistory((prev) => [...prev, { index: currentIndex, known: true, cardId: currentCard.id }]);

    // Move next or finish
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setIsFinished(true);
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      soundEffects.fanfare();
      recordStudySession(cards.length, 2);
    }
  }, [currentCard, currentIndex, cards.length, set.id]);

  // Answer Still Learning (Left / Key 1)
  const handleUnknown = useCallback(() => {
    if (!currentCard) return;
    soundEffects.wrong();
    setUnknownIds((prev) => new Set(prev).add(currentCard.id));
    setKnownIds((prev) => {
      const next = new Set(prev);
      next.delete(currentCard.id);
      return next;
    });

    // Record SM-2 SRS grade 1 (Wrong)
    const prog = calculateSM2(undefined, currentCard.id, set.id, 1);
    saveCardProgress(prog);

    setHistory((prev) => [...prev, { index: currentIndex, known: false, cardId: currentCard.id }]);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      setIsFinished(true);
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      recordStudySession(cards.length, 2);
    }
  }, [currentCard, currentIndex, cards.length, set.id]);

  // Undo previous action
  const handleUndo = useCallback(() => {
    if (history.length === 0 || currentIndex === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCurrentIndex(last.index);
    setIsFlipped(false);
    if (last.known) {
      setKnownIds((prev) => {
        const next = new Set(prev);
        next.delete(last.cardId);
        return next;
      });
    } else {
      setUnknownIds((prev) => {
        const next = new Set(prev);
        next.delete(last.cardId);
        return next;
      });
    }
  }, [history, currentIndex]);

  // Next / Prev card
  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, cards.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  // Shuffle
  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(!isShuffled);
  };

  // Toggle Starred Only
  const handleToggleStarredOnly = () => {
    const nextVal = !starredOnly;
    setStarredOnly(nextVal);
    const filtered = nextVal ? set.cards.filter((c) => c.isStarred) : [...set.cards];
    setCards(filtered.length > 0 ? filtered : set.cards);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Restart
  const handleRestartAll = () => {
    setCards([...set.cards]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setKnownIds(new Set());
    setUnknownIds(new Set());
    setHistory([]);
  };

  const handleReviewUnknownOnly = () => {
    const missed = cards.filter((c) => unknownIds.has(c.id));
    if (missed.length === 0) return;
    setCards(missed);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setKnownIds(new Set());
    setUnknownIds(new Set());
    setHistory([]);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight' || e.key === '2') {
        e.preventDefault();
        handleKnown();
      } else if (e.code === 'ArrowLeft' || e.key === '1') {
        e.preventDefault();
        handleUnknown();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        toggleStar();
      } else if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleKnown, handleUnknown, toggleStar, handleUndo]);

  // Auto play slideshow timer
  useEffect(() => {
    if (!isAutoPlaying || isFinished) return;

    const timer = setInterval(() => {
      setIsFlipped((prev) => {
        if (!prev) {
          // Flip to back first
          soundEffects.flip();
          return true;
        } else {
          // Then move to next card
          if (currentIndex < cards.length - 1) {
            setCurrentIndex((i) => i + 1);
            return false;
          } else {
            setIsFinished(true);
            setIsAutoPlaying(false);
            return false;
          }
        }
      });
    }, autoSpeed / 2);

    return () => clearInterval(timer);
  }, [isAutoPlaying, currentIndex, cards.length, autoSpeed, isFinished]);

  if (!currentCard || cards.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <Layers className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          {lang === 'vi' ? 'Không có thẻ nào để hiển thị' : 'No cards found'}
        </h3>
        <p className="text-slate-500 text-sm mb-6">
          {starredOnly
            ? lang === 'vi'
              ? 'Bạn chưa gắn sao thẻ nào trong bộ này.'
              : 'You have not starred any cards in this set.'
            : lang === 'vi'
            ? 'Bộ thẻ này chưa có thẻ nào.'
            : 'This study set is empty.'}
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md hover:bg-indigo-700 transition"
        >
          {t.backToSet}
        </button>
      </div>
    );
  }

  const frontContent = frontFirst ? currentCard.front : currentCard.back;
  const backContent = frontFirst ? currentCard.back : currentCard.front;
  const frontLabel = frontFirst ? t.front : t.back;
  const backLabel = frontFirst ? t.back : t.front;

  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div
      className={`max-w-4xl mx-auto px-4 py-4 sm:py-6 flex flex-col justify-between min-h-[calc(100vh-5rem)] ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-6 max-w-none' : ''
      }`}
    >
      {/* Top Header / Progress Bar */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.backToSet}</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300">
              {currentIndex + 1} / {cards.length}
            </span>
            <div className="w-28 sm:w-44 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Auto Play */}
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              title={isAutoPlaying ? 'Pause Slideshow' : 'Play Slideshow'}
              className={`p-2 rounded-xl transition ${
                isAutoPlaying
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* Shuffle */}
            <button
              onClick={handleShuffle}
              title={t.shuffle}
              className={`p-2 rounded-xl transition ${
                isShuffled
                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Starred Only */}
            <button
              onClick={handleToggleStarredOnly}
              title={t.starredOnly}
              className={`p-2 rounded-xl transition ${
                starredOnly
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-500'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Star className={`w-4 h-4 ${starredOnly ? 'fill-amber-500' : ''}`} />
            </button>

            {/* Swap Front/Back order */}
            <button
              onClick={() => setFrontFirst(!frontFirst)}
              title={lang === 'vi' ? 'Đổi thứ tự mặt thẻ' : 'Swap Front/Back order'}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition hidden sm:block"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 mb-2">
          <div className="flex items-center gap-3 font-semibold">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" /> {knownIds.size} {lang === 'vi' ? 'Đã biết' : 'Known'}
            </span>
            <span className="flex items-center gap-1 text-rose-500">
              <X className="w-3.5 h-3.5" /> {unknownIds.size} {lang === 'vi' ? 'Chưa biết' : 'Learning'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 hidden sm:block">
            {t.flipHint} • Phím 1: Chưa biết • Phím 2: Đã biết
          </div>
        </div>
      </div>

      {/* Main Flashcard Card (3D Flip Effect) */}
      {!isFinished ? (
        <div className="my-auto py-4">
          <div
            className="perspective-1000 w-full h-[400px] sm:h-[460px] cursor-pointer select-none"
            onClick={handleFlip}
          >
            <div
              className={`relative w-full h-full duration-500 transform-style-3d transition-transform shadow-2xl rounded-3xl ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* FRONT SIDE */}
              <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-800/95 border-2 border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-5 sm:p-8 flex flex-col justify-between">
                {/* Card Top toolbar */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
                      {frontLabel}
                    </span>
                    {currentCard.isAiSuggested && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md font-medium">
                        {t.aiSuggestedBadge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => speakText(frontContent)}
                      title="Phát âm (Pronounce)"
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={toggleStar}
                      title="Đánh dấu sao"
                      className={`p-2 rounded-xl transition ${
                        currentCard.isStarred
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950'
                          : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${currentCard.isStarred ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Card Main Text */}
                <div className="my-auto text-left w-full max-h-[290px] sm:max-h-[340px] overflow-y-auto pr-1">
                  <div className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white leading-relaxed tracking-tight whitespace-pre-line font-sans">
                    {frontContent}
                  </div>
                  {currentCard.hint && (
                    <p className="mt-4 text-xs sm:text-sm text-slate-400 italic">
                      💡 {lang === 'vi' ? 'Gợi ý:' : 'Hint:'} {currentCard.hint}
                    </p>
                  )}
                </div>

                {/* Card Bottom: Quick flip indicator */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="text-[11px] font-medium">
                    {lang === 'vi' ? 'Nhấp vào thẻ hoặc Space để xem đáp án đúng' : 'Click to flip for answer'}
                  </span>
                  <RotateCw className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </div>
              </div>

              {/* BACK SIDE */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/60 dark:from-slate-800 dark:via-slate-850 dark:to-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800/60 rounded-3xl p-5 sm:p-8 flex flex-col justify-between">
                {/* Back Top Toolbar */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-purple-600 dark:text-purple-400 bg-purple-100/70 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg">
                    {backLabel}
                  </span>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => speakText(backContent)}
                      title="Phát âm đáp án"
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={toggleStar}
                      className={`p-2 rounded-xl transition ${
                        currentCard.isStarred
                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950'
                          : 'text-slate-400 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${currentCard.isStarred ? 'fill-amber-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Back Main Text */}
                <div className="my-auto text-left w-full max-h-[290px] sm:max-h-[340px] overflow-y-auto pr-1 space-y-3">
                  <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500/80 text-emerald-950 dark:text-emerald-100 shadow-sm">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                      ✓ {lang === 'vi' ? 'ĐÁP ÁN CHÍNH XÁC' : 'CORRECT ANSWER'}
                    </span>
                    <h3 className="text-base sm:text-xl font-black leading-relaxed whitespace-pre-line">
                      {backContent}
                    </h3>
                  </div>

                  {currentCard.explanation && (
                    <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-indigo-100 dark:border-indigo-900/40 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        💡 {lang === 'vi' ? 'Giải thích chi tiết:' : 'Explanation:'}{' '}
                      </span>
                      {currentCard.explanation}
                    </div>
                  )}
                </div>

                {/* Back Bottom AI Buttons */}
                <div
                  className="flex items-center justify-between gap-2 pt-3 border-t border-indigo-100 dark:border-indigo-900/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenExplain(currentCard)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-100/80 dark:bg-indigo-950/80 hover:bg-indigo-200 text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{t.explainCard}</span>
                    </button>

                    <button
                      onClick={() => onOpenMnemonic(currentCard)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100/80 dark:bg-purple-950/80 hover:bg-purple-200 text-purple-700 dark:text-purple-300 font-semibold text-xs transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span>{t.mnemonic}</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    {lang === 'vi' ? 'Nhấp để lật lại' : 'Click to flip back'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* FINISHED STAGE */
        <div className="my-auto py-10 px-4 text-center max-w-lg mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
            <Check className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              {t.congratsTitle}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t.congratsDesc}
            </p>
          </div>

          {/* Breakdown cards */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="p-3 text-center">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {knownIds.size}
              </span>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                {lang === 'vi' ? 'Đã thành thạo' : 'Mastered'}
              </p>
            </div>
            <div className="p-3 text-center border-l border-slate-200 dark:border-slate-800">
              <span className="text-2xl font-black text-rose-500">
                {unknownIds.size}
              </span>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                {lang === 'vi' ? 'Cần ôn thêm' : 'Still learning'}
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {unknownIds.size > 0 && (
              <button
                onClick={handleReviewUnknownOnly}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-rose-500/20 transition active:scale-95"
              >
                {t.reviewUnknown} ({unknownIds.size} {t.cards})
              </button>
            )}

            <button
              onClick={handleRestartAll}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-500/20 transition active:scale-95"
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
      )}

      {/* Bottom Action Bar */}
      {!isFinished && (
        <div className="pt-4 flex items-center justify-between gap-3">
          {/* Still Learning (Key 1 / Left) */}
          <button
            onClick={handleUnknown}
            className="flex-1 max-w-[200px] flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 font-extrabold text-xs sm:text-sm shadow-sm transition active:scale-95"
          >
            <X className="w-4 h-4" />
            <span>{t.unknown}</span>
          </button>

          {/* Center Navigation Arrows & Undo */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {history.length > 0 && (
              <button
                onClick={handleUndo}
                title={`${t.undo} (Ctrl+Z)`}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              >
                <Undo2 className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 transition"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Mastered / Known (Key 2 / Right) */}
          <button
            onClick={handleKnown}
            className="flex-1 max-w-[200px] flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-300 font-extrabold text-xs sm:text-sm shadow-sm transition active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>{t.known}</span>
          </button>
        </div>
      )}
    </div>
  );
};
