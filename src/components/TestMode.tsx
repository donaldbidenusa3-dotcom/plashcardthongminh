import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCw,
  Trophy,
  FileCheck2,
  SlidersHorizontal,
  Lightbulb,
} from 'lucide-react';
import { StudySet, Card } from '../types';
import { Language, translations } from '../translations';
import { soundEffects } from '../utils/speech';
import { evaluateAnswer } from '../utils/fuzzy';
import { recordStudySession } from '../utils/storage';

interface TestModeProps {
  set: StudySet;
  lang: Language;
  onBack: () => void;
  onOpenExplain: (card: Card) => void;
}

interface TestQuestion {
  id: string;
  card: Card;
  type: 'choice' | 'true_false' | 'written';
  options?: string[];
  correctAnswer: string;
  tfStatement?: string;
  tfIsCorrect?: boolean;
}

export const TestMode: React.FC<TestModeProps> = ({
  set,
  lang,
  onBack,
  onOpenExplain,
}) => {
  const t = translations[lang];

  // Config stage
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [questionCount, setQuestionCount] = useState(Math.min(10, set.cards.length));
  const [enableTimer, setEnableTimer] = useState(true);
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [allowChoice, setAllowChoice] = useState(true);
  const [allowTF, setAllowTF] = useState(true);
  const [allowWritten, setAllowWritten] = useState(true);

  // Test active stage
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Generate test questions
  const generateQuestions = (targetCards: Card[]) => {
    const types: ('choice' | 'true_false' | 'written')[] = [];
    if (allowChoice) types.push('choice');
    if (allowTF) types.push('true_false');
    if (allowWritten) types.push('written');
    if (types.length === 0) types.push('choice');

    const shuffledCards = [...targetCards].sort(() => Math.random() - 0.5).slice(0, questionCount);

    const generated: TestQuestion[] = shuffledCards.map((card, idx) => {
      const qType = types[idx % types.length];

      if (qType === 'choice') {
        const otherBacks = set.cards
          .filter((c) => c.id !== card.id)
          .map((c) => c.back)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        const options = card.options && card.options.length >= 4 ? card.options : [card.back, ...otherBacks].sort(() => Math.random() - 0.5);
        return {
          id: `q-${idx}`,
          card,
          type: 'choice',
          options,
          correctAnswer: card.back,
        };
      }

      if (qType === 'true_false') {
        const isTrue = Math.random() > 0.5;
        let statement = card.back;
        if (!isTrue) {
          const fake = set.cards.find((c) => c.id !== card.id);
          statement = fake ? fake.back : 'Không có thông tin phù hợp.';
        }
        return {
          id: `q-${idx}`,
          card,
          type: 'true_false',
          tfStatement: statement,
          tfIsCorrect: isTrue,
          correctAnswer: isTrue ? 'Đúng' : 'Sai',
        };
      }

      // Written
      return {
        id: `q-${idx}`,
        card,
        type: 'written',
        correctAnswer: card.back,
      };
    });

    setQuestions(generated);
    setUserAnswers({});
    setSecondsRemaining(timerMinutes * 60);
    setIsConfiguring(false);
    setIsSubmitted(false);
  };

  // Start test
  const handleStartTest = () => {
    generateQuestions(set.cards);
  };

  // Timer effect
  useEffect(() => {
    if (isConfiguring || isSubmitted || !enableTimer) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isConfiguring, isSubmitted, enableTimer]);

  const handleSubmitTest = () => {
    setIsSubmitted(true);
    recordStudySession(questions.length, Math.ceil((timerMinutes * 60 - secondsRemaining) / 60) || 1);

    // Calculate score
    const results = questions.map((q) => {
      const ans = userAnswers[q.id] || '';
      if (q.type === 'written') {
        return evaluateAnswer(ans, q.correctAnswer).isCorrect;
      }
      return ans === q.correctAnswer;
    });

    const score = results.filter(Boolean).length;
    const pct = Math.round((score / questions.length) * 100);

    if (pct >= 80) {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      soundEffects.fanfare();
    } else if (pct >= 50) {
      soundEffects.correct();
    } else {
      soundEffects.wrong();
    }
  };

  // Results grading
  const scoreResults = useMemo(() => {
    if (!isSubmitted) return { score: 0, total: 0, pct: 0, details: [] };

    let correctCount = 0;
    const details = questions.map((q) => {
      const userAns = userAnswers[q.id] || '';
      let isCorrect = false;

      if (q.type === 'written') {
        isCorrect = evaluateAnswer(userAns, q.correctAnswer).isCorrect;
      } else {
        isCorrect = userAns === q.correctAnswer;
      }

      if (isCorrect) correctCount += 1;

      return {
        question: q,
        userAns,
        isCorrect,
      };
    });

    const total = questions.length;
    const pct = Math.round((correctCount / total) * 100);

    return { score: correctCount, total, pct, details };
  }, [isSubmitted, questions, userAnswers]);

  // Retake missed questions
  const handleRetakeMissed = () => {
    const missedCards = scoreResults.details.filter((d) => !d.isCorrect).map((d) => d.question.card);
    if (missedCards.length === 0) return;
    setQuestionCount(missedCards.length);
    generateQuestions(missedCards);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // CONFIGURATION VIEW
  if (isConfiguring) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToSet}</span>
        </button>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {lang === 'vi' ? 'Thiết lập Bài kiểm tra' : 'Test Setup'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {lang === 'vi'
                  ? 'Tùy chỉnh số lượng câu, định dạng và thời gian làm bài theo ý bạn'
                  : 'Customize question types, count and timer for your mock test'}
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {/* Number of questions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {lang === 'vi' ? 'Số lượng câu hỏi:' : 'Number of questions:'}{' '}
                <span className="text-indigo-600 font-extrabold">{questionCount}</span> / {set.cards.length}
              </label>
              <input
                type="range"
                min={1}
                max={set.cards.length}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Question types checkboxes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                {lang === 'vi' ? 'Dạng câu hỏi bao gồm:' : 'Question formats:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={allowChoice}
                    onChange={(e) => setAllowChoice(e.target.checked)}
                    className="accent-indigo-600 w-4 h-4"
                  />
                  <span>{lang === 'vi' ? 'Trắc nghiệm' : 'Multiple Choice'}</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={allowTF}
                    onChange={(e) => setAllowTF(e.target.checked)}
                    className="accent-indigo-600 w-4 h-4"
                  />
                  <span>{lang === 'vi' ? 'Đúng / Sai' : 'True / False'}</span>
                </label>
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={allowWritten}
                    onChange={(e) => setAllowWritten(e.target.checked)}
                    className="accent-indigo-600 w-4 h-4"
                  />
                  <span>{lang === 'vi' ? 'Tự luận viết' : 'Written'}</span>
                </label>
              </div>
            </div>

            {/* Timer setting */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>{lang === 'vi' ? 'Đồng hồ đếm ngược' : 'Timer'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={enableTimer}
                  onChange={(e) => setEnableTimer(e.target.checked)}
                  className="accent-indigo-600 w-4 h-4 cursor-pointer"
                />
              </div>

              {enableTimer && (
                <div className="flex items-center gap-3">
                  {[3, 5, 10, 15].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setTimerMinutes(mins)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        timerMinutes === mins
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {mins} {t.minutes}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleStartTest}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 transition active:scale-95"
          >
            {lang === 'vi' ? 'Bắt đầu làm bài kiểm tra' : 'Start Test Now'}
          </button>
        </div>
      </div>
    );
  }

  // SUBMITTED SCORE SUMMARY
  if (isSubmitted) {
    const { score, total, pct, details } = scoreResults;

    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl border border-slate-200 dark:border-slate-700 text-center space-y-6">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-xl ${
              pct >= 80
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                : pct >= 50
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
            }`}
          >
            {pct >= 80 ? (
              <Trophy className="w-10 h-10 animate-bounce" />
            ) : (
              <FileCheck2 className="w-10 h-10" />
            )}
          </div>

          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">
              {pct >= 80
                ? lang === 'vi'
                  ? 'Xuất sắc! Bạn làm rất tốt!'
                  : 'Outstanding Performance!'
                : pct >= 50
                ? lang === 'vi'
                  ? 'Khá tốt! Cố gắng thêm chút nữa!'
                  : 'Good Effort! Keep practicing!'
                : lang === 'vi'
                ? 'Cần ôn tập thêm bộ thẻ này!'
                : 'Needs more practice!'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {lang === 'vi' ? 'Kết quả điểm số của bạn:' : 'Your test score breakdown:'}
            </p>
          </div>

          {/* Big Score Box */}
          <div className="inline-block p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700">
            <span
              className={`text-5xl sm:text-6xl font-black ${
                pct >= 80
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : pct >= 50
                  ? 'text-amber-500'
                  : 'text-rose-500'
              }`}
            >
              {pct}%
            </span>
            <div className="text-xs font-bold text-slate-500 mt-2">
              {score} / {total} {lang === 'vi' ? 'câu đúng' : 'correct'}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {total - score > 0 && (
              <button
                onClick={handleRetakeMissed}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-md transition"
              >
                {lang === 'vi' ? `Làm lại ${total - score} câu sai` : `Retake ${total - score} missed questions`}
              </button>
            )}

            <button
              onClick={() => setIsConfiguring(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md transition"
            >
              {lang === 'vi' ? 'Tạo bài test mới' : 'New Test'}
            </button>

            <button
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
            >
              {t.backToSet}
            </button>
          </div>
        </div>

        {/* Detailed Review of Each Question */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
            {lang === 'vi' ? 'Xem lại chi tiết từng câu hỏi' : 'Question Breakdown & Review'}
          </h3>

          <div className="space-y-4">
            {details.map((item, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-2xl border-2 space-y-3 bg-white dark:bg-slate-800 ${
                  item.isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900/60'
                    : 'border-rose-200 dark:border-rose-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center ${
                        item.isCorrect
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      {item.question.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {item.isCorrect ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> {lang === 'vi' ? 'Đúng' : 'Correct'}
                      </span>
                    ) : (
                      <span className="text-rose-500 flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> {lang === 'vi' ? 'Sai' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  {item.question.card.front}
                </h4>

                {item.question.type === 'true_false' && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="font-bold">{lang === 'vi' ? 'Nhận định:' : 'Statement:'} </span>
                    {item.question.tfStatement}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-400 block mb-0.5">
                      {lang === 'vi' ? 'Câu trả lời của bạn:' : 'Your answer:'}
                    </span>
                    <span className={item.isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                      {item.userAns || (lang === 'vi' ? '(Bỏ trống)' : '(Blank)')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-400 block mb-0.5">
                      {lang === 'vi' ? 'Đáp án đúng chuẩn:' : 'Correct answer:'}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {item.question.correctAnswer}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => onOpenExplain(item.question.card)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{t.explainCard}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE TEST TAKING PAPER
  const answeredCount = Object.keys(userAnswers).filter((k) => userAnswers[k]?.trim()).length;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Sticky Header */}
      <div className="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-between gap-4">
        <button
          onClick={() => setIsConfiguring(true)}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          {lang === 'vi' ? 'Hủy kiểm tra' : 'Cancel Test'}
        </button>

        {enableTimer && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold ${
              secondsRemaining < 60
                ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 animate-pulse'
                : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTime(secondsRemaining)}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500">
            {answeredCount} / {questions.length} {lang === 'vi' ? 'đã làm' : 'answered'}
          </span>
          <button
            onClick={handleSubmitTest}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition active:scale-95"
          >
            {lang === 'vi' ? 'Nộp bài & Chấm điểm' : 'Submit & Grade'}
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {lang === 'vi' ? `Câu ${idx + 1}` : `Question ${idx + 1}`} •{' '}
                {q.type === 'choice'
                  ? 'Trắc nghiệm'
                  : q.type === 'true_false'
                  ? 'Đúng / Sai'
                  : 'Tự luận'}
              </span>
            </div>

            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-relaxed">
              {q.card.front}
            </h3>

            {/* Multiple Choice Options */}
            {q.type === 'choice' && q.options && (
              <div className="space-y-2 pt-1">
                {q.options.map((opt, oIdx) => (
                  <label
                    key={oIdx}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition ${
                      userAnswers[q.id] === opt
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={userAnswers[q.id] === opt}
                      onChange={() =>
                        setUserAnswers((prev) => ({ ...prev, [q.id]: opt }))
                      }
                      className="accent-indigo-600 mt-0.5"
                    />
                    <span className="text-xs sm:text-sm leading-snug">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* True / False Options */}
            {q.type === 'true_false' && (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium">
                  <span className="font-bold text-slate-400 block mb-1">
                    {lang === 'vi' ? 'Nhận định định nghĩa:' : 'Statement:'}
                  </span>
                  "{q.tfStatement}"
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {['Đúng', 'Sai'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setUserAnswers((prev) => ({ ...prev, [q.id]: val }))
                      }
                      className={`py-3 rounded-2xl border-2 font-extrabold text-xs sm:text-sm transition ${
                        userAnswers[q.id] === val
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {val === 'Đúng'
                        ? lang === 'vi'
                          ? '✓ Đúng'
                          : '✓ True'
                        : lang === 'vi'
                        ? '✗ Sai'
                        : '✗ False'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Written Typed Input */}
            {q.type === 'written' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={userAnswers[q.id] || ''}
                  onChange={(e) =>
                    setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  placeholder={lang === 'vi' ? 'Gõ đáp án vào đây...' : 'Type your answer here...'}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-xs sm:text-sm font-semibold outline-none"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Submit */}
      <div className="text-center pt-4 pb-12">
        <button
          onClick={handleSubmitTest}
          className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-500/25 transition active:scale-95"
        >
          {lang === 'vi' ? 'Hoàn tất & Nộp bài kiểm tra' : 'Submit & Grade Test'}
        </button>
      </div>
    </div>
  );
};
