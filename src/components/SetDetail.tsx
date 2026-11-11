import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Layers,
  BrainCircuit,
  FileCheck2,
  Zap,
  PenTool,
  Rocket,
  MessageSquare,
  Languages,
  Share2,
  Edit3,
  Copy,
  Trash2,
  Star,
  Volume2,
  Lightbulb,
  Search,
  Plus,
  ArrowRightLeft,
  Filter,
} from 'lucide-react';
import { StudySet, Card, StudyModeType } from '../types';
import { Language, translations } from '../translations';
import { speakText } from '../utils/speech';

interface SetDetailProps {
  set: StudySet;
  lang: Language;
  onBack: () => void;
  onStartStudyMode: (mode: StudyModeType, starredOnly?: boolean) => void;
  onEditSet: () => void;
  onCloneSet: () => void;
  onDeleteSet: () => void;
  onOpenShare: () => void;
  onOpenAiAssistant: (tab: any, card?: Card) => void;
  onToggleStarCard: (cardId: string) => void;
  onStudyWeakSpots: () => void;
}

export const SetDetail: React.FC<SetDetailProps> = ({
  set,
  lang,
  onBack,
  onStartStudyMode,
  onEditSet,
  onCloneSet,
  onDeleteSet,
  onOpenShare,
  onOpenAiAssistant,
  onToggleStarCard,
  onStudyWeakSpots,
}) => {
  const t = translations[lang];

  const [cardSearch, setCardSearch] = useState('');
  const [onlyStarred, setOnlyStarred] = useState(false);

  const starredCount = set.cards.filter((c) => c.isStarred).length;

  const filteredCards = set.cards.filter((c) => {
    if (onlyStarred && !c.isStarred) return false;
    if (!cardSearch.trim()) return true;
    const q = cardSearch.toLowerCase();
    const frontStr = (c.front || '').toLowerCase();
    const backStr = (c.back || '').toLowerCase();
    return frontStr.includes(q) || backStr.includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'vi' ? 'Quay lại Thư viện' : 'Back to Library'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">{t.shareSet}</span>
          </button>

          <button
            onClick={onCloneSet}
            title={t.cloneSet}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs transition"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={onEditSet}
            title={t.editSet}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs transition"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={onDeleteSet}
            title={t.deleteSet}
            className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 text-xs transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Set Header Hero */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold uppercase tracking-wider">
            {set.subject}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500 font-semibold">
            {set.cards.length} {t.cards}
          </span>
          {starredCount > 0 && (
            <>
              <span className="text-slate-400">•</span>
              <span className="text-amber-500 font-bold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500" /> {starredCount} {lang === 'vi' ? 'gắn sao' : 'starred'}
              </span>
            </>
          )}
          {set.authorName && (
            <>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">
                {t.by} <strong className="text-slate-700 dark:text-slate-300">{set.authorName}</strong>
              </span>
            </>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {set.title}
        </h1>

        {set.description && (
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
            {set.description}
          </p>
        )}

        {/* Tags */}
        {set.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {set.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Study Modes Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{t.studyModes}</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. Flashcards */}
          <button
            onClick={() => onStartStudyMode('flashcards')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-lg dark:hover:border-indigo-400 transition-all text-left flex flex-col justify-between group h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                {t.flashcards}
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {lang === 'vi' ? 'Lật thẻ 3D & TTS' : '3D flip cards'}
              </p>
            </div>
          </button>

          {/* 2. Learn */}
          <button
            onClick={() => onStartStudyMode('learn')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-purple-500 hover:shadow-lg dark:hover:border-purple-400 transition-all text-left flex flex-col justify-between group h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-purple-600 transition">
                {t.learn}
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {lang === 'vi' ? 'Học theo vòng thích ứng' : 'Adaptive rounds'}
              </p>
            </div>
          </button>

          {/* 3. Test */}
          <button
            onClick={() => onStartStudyMode('test')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:shadow-lg dark:hover:border-emerald-400 transition-all text-left flex flex-col justify-between group h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition">
                {t.test}
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {lang === 'vi' ? 'Đề thi & Chấm điểm' : 'Mock exam & Timer'}
              </p>
            </div>
          </button>

          {/* 4. Match */}
          <button
            onClick={() => onStartStudyMode('match')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-amber-500 hover:shadow-lg dark:hover:border-amber-400 transition-all text-left flex flex-col justify-between group h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-500 group-hover:scale-110 transition">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-amber-500 transition">
                {t.match}
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {lang === 'vi' ? 'Ghép cặp tính giờ' : 'High speed match'}
              </p>
            </div>
          </button>

          {/* 5. Write */}
          <button
            onClick={() => onStartStudyMode('write')}
            className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-lg dark:hover:border-blue-400 transition-all text-left flex flex-col justify-between group h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition">
                {t.write}
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {lang === 'vi' ? 'Luyện viết & Gõ từ' : 'Fuzzy typo match'}
              </p>
            </div>
          </button>

          {/* 6. Gravity Arcade */}
          <button
            onClick={() => onStartStudyMode('gravity')}
            className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-2 border-indigo-700/60 hover:shadow-xl hover:shadow-indigo-500/20 transition-all text-left flex flex-col justify-between group h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 group-hover:scale-110 transition">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs sm:text-sm text-white flex items-center gap-1">
                <span>{t.gravity}</span>
              </h3>
              <p className="text-[10px] text-indigo-300 line-clamp-1 mt-0.5">
                {lang === 'vi' ? 'Bắn thiên thạch' : 'Space shooter'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* AI Superpowers Ribbon */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-50/80 via-purple-50/60 to-pink-50/50 dark:from-slate-800/80 dark:via-indigo-950/40 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            {t.aiTools}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => onOpenAiAssistant('chat')}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>{t.chatWithSet}</span>
          </button>

          <button
            onClick={() => onOpenAiAssistant('variants')}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-sm"
          >
            <ArrowRightLeft className="w-4 h-4 text-purple-500 shrink-0" />
            <span>{t.generateVariants}</span>
          </button>

          <button
            onClick={() => onOpenAiAssistant('translate')}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-sm"
          >
            <Languages className="w-4 h-4 text-blue-500 shrink-0" />
            <span>{t.translateSet}</span>
          </button>

          <button
            onClick={onStudyWeakSpots}
            className="p-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left transition text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 shadow-sm"
          >
            <Lightbulb className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{t.weakSpots}</span>
          </button>
        </div>
      </div>

      {/* Cards Table / List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
              {lang === 'vi' ? 'Các thẻ trong bộ này' : 'Cards in this set'}
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredCards.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Star filter */}
            <button
              onClick={() => setOnlyStarred(!onlyStarred)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                onlyStarred
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyStarred ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{t.starredOnly}</span>
            </button>

            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={cardSearch}
                onChange={(e) => setCardSearch(e.target.value)}
                placeholder={lang === 'vi' ? 'Tìm thuật ngữ...' : 'Filter cards...'}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 text-xs text-slate-900 dark:text-white outline-none w-36 sm:w-48"
              />
            </div>
          </div>
        </div>

        {/* Cards Row Items */}
        <div className="space-y-3">
          {filteredCards.map((card, idx) => (
            <div
              key={card.id}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Front & Back */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      {t.front}
                    </span>
                    {card.isAiSuggested && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded font-medium">
                        {t.aiSuggestedBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
                    {card.front}
                  </p>
                  {card.hint && (
                    <span className="text-xs text-slate-400 italic mt-1 block">
                      💡 {card.hint}
                    </span>
                  )}
                </div>

                <div className="md:border-l md:border-slate-100 dark:md:border-slate-700/80 md:pl-4">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    {t.back}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {card.back}
                  </p>
                  {card.explanation && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 line-clamp-1">
                      {card.explanation}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions on Card */}
              <div className="flex items-center gap-1 self-end md:self-center shrink-0">
                <button
                  onClick={() => speakText(card.front)}
                  title="Nghe phát âm"
                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onOpenAiAssistant('explain', card)}
                  title={t.explainCard}
                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onOpenAiAssistant('mnemonic', card)}
                  title={t.mnemonic}
                  className="p-2 rounded-xl text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-700 transition"
                >
                  <Sparkles className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onToggleStarCard(card.id)}
                  title="Đánh dấu sao"
                  className={`p-2 rounded-xl transition ${
                    card.isStarred
                      ? 'text-amber-500 bg-amber-50 dark:bg-amber-950'
                      : 'text-slate-300 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Star className={`w-4 h-4 ${card.isStarred ? 'fill-amber-500' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
