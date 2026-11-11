import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Lightbulb,
  MessageSquare,
  Languages,
  ArrowRightLeft,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { StudySet, Card } from '../types';
import { Language, translations } from '../translations';

export type AiAssistantTab = 'explain' | 'mnemonic' | 'chat' | 'variants' | 'translate';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: AiAssistantTab;
  set: StudySet;
  selectedCard?: Card;
  lang: Language;
  onAppendCards?: (newCards: Card[]) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  tab: initialTab,
  set,
  selectedCard,
  lang,
  onAppendCards,
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<AiAssistantTab>(initialTab);
  const [targetCard, setTargetCard] = useState<Card>(selectedCard || set.cards[0]);

  // Explain state
  const [explainData, setExplainData] = useState<{
    explanation: string;
    keyPoints: string[];
    commonMistake?: string;
  } | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Mnemonic state
  const [mnemonicData, setMnemonicData] = useState<{
    mnemonic: string;
    association: string;
    story?: string;
  } | null>(null);
  const [isMnemonicLoading, setIsMnemonicLoading] = useState(false);

  // Chat with Set state
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([
    {
      role: 'assistant',
      content:
        lang === 'vi'
          ? `Xin chào! Tôi là trợ lý AI cho bộ thẻ "${set.title}". Bạn có thể hỏi tôi bất kỳ điều gì về nội dung các thẻ, hoặc nhờ tôi ra câu đố thử nhé!`
          : `Hello! I'm your AI study coach for "${set.title}". Ask me anything or let me quiz you!`,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Variants state (Reverse / Cloze)
  const [variantType, setVariantType] = useState<'reverse' | 'cloze'>('reverse');
  const [generatedVariants, setGeneratedVariants] = useState<Partial<Card>[]>([]);
  const [isVariantsLoading, setIsVariantsLoading] = useState(false);
  const [variantsAppended, setVariantsAppended] = useState(false);

  // Translate state
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const [translatedCards, setTranslatedCards] = useState<Partial<Card>[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslatedSaved, setIsTranslatedSaved] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (selectedCard) {
      setTargetCard(selectedCard);
    }
  }, [selectedCard]);

  // Load Explain on open if active tab is explain
  useEffect(() => {
    if (isOpen && activeTab === 'explain' && targetCard && !explainData) {
      fetchExplain();
    } else if (isOpen && activeTab === 'mnemonic' && targetCard && !mnemonicData) {
      fetchMnemonic();
    }
  }, [isOpen, activeTab, targetCard]);

  const fetchExplain = async () => {
    if (!targetCard) return;
    setIsExplaining(true);
    setExplainData(null);
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: targetCard.front,
          back: targetCard.back,
          language: lang,
        }),
      });
      const data = await res.json();
      setExplainData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExplaining(false);
    }
  };

  const fetchMnemonic = async () => {
    if (!targetCard) return;
    setIsMnemonicLoading(true);
    setMnemonicData(null);
    try {
      const res = await fetch('/api/ai/mnemonic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: targetCard.front,
          back: targetCard.back,
          language: lang,
        }),
      });
      const data = await res.json();
      setMnemonicData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsMnemonicLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(newMessages);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: set.cards,
          setTitle: set.title,
          messages: newMessages,
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply || 'Không có phản hồi.' },
      ]);
    } catch (e) {
      console.error(e);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Xin lỗi, đã xảy ra lỗi kết nối. Vui lòng thử lại.' },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleGenerateVariants = async () => {
    setIsVariantsLoading(true);
    setGeneratedVariants([]);
    setVariantsAppended(false);

    try {
      const res = await fetch('/api/ai/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: set.cards.slice(0, 15),
          variantType,
        }),
      });
      const data = await res.json();
      setGeneratedVariants(data.cards || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsVariantsLoading(false);
    }
  };

  const handleAppendVariants = () => {
    if (generatedVariants.length === 0 || !onAppendCards) return;
    const cardsToAdd: Card[] = generatedVariants.map((c) => ({
      id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      front: c.front || '',
      back: c.back || '',
      hint: c.hint || '',
      isStarred: false,
      createdAt: Date.now(),
    }));
    onAppendCards(cardsToAdd);
    setVariantsAppended(true);
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    setTranslatedCards([]);
    setIsTranslatedSaved(false);

    try {
      const res = await fetch('/api/ai/translate-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: set.cards.slice(0, 20),
          targetLanguage,
        }),
      });
      const data = await res.json();
      setTranslatedCards(data.cards || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAppendTranslations = () => {
    if (translatedCards.length === 0 || !onAppendCards) return;
    const cardsToAdd: Card[] = translatedCards.map((c) => ({
      id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      front: c.front || '',
      back: c.back || '',
      hint: c.hint || '',
      isStarred: false,
      createdAt: Date.now(),
    }));
    onAppendCards(cardsToAdd);
    setIsTranslatedSaved(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                {lang === 'vi' ? 'Trợ lý Học tập AI' : 'AI Study Assistant'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {set.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('explain')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'explain'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>{t.explainCard}</span>
          </button>

          <button
            onClick={() => setActiveTab('mnemonic')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'mnemonic'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.mnemonic}</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t.chatWithSet}</span>
          </button>

          <button
            onClick={() => setActiveTab('variants')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'variants'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{t.generateVariants}</span>
          </button>

          <button
            onClick={() => setActiveTab('translate')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'translate'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>{t.translateSet}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: EXPLAIN */}
          {activeTab === 'explain' && (
            <div className="space-y-4">
              {/* Select card dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {lang === 'vi' ? 'Thẻ đang xem giải thích:' : 'Current Card:'}
                </label>
                <select
                  value={targetCard.id}
                  onChange={(e) => {
                    const c = set.cards.find((card) => card.id === e.target.value);
                    if (c) {
                      setTargetCard(c);
                      setExplainData(null);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold outline-none"
                >
                  {set.cards.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      #{i + 1}: {c.front}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target card banner */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900">
                <span className="text-[11px] font-bold text-indigo-600 block mb-1">
                  [Hỏi]: {targetCard.front}
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  [Đáp án]: {targetCard.back}
                </span>
              </div>

              {isExplaining ? (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">
                    {lang === 'vi' ? 'AI đang phân tích kiến thức và biên soạn giải thích...' : 'AI is analyzing and explaining...'}
                  </p>
                </div>
              ) : explainData ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {lang === 'vi' ? 'Giải thích trực quan' : 'Clear Explanation'}
                    </h4>
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {explainData.explanation}
                    </p>
                  </div>

                  {explainData.keyPoints?.length > 0 && (
                    <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                      <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                        {lang === 'vi' ? 'Điểm mấu chốt cần nhớ' : 'Key Takeaways'}
                      </h4>
                      <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 list-disc list-inside">
                        {explainData.keyPoints.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {explainData.commonMistake && (
                    <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                      <span className="font-bold">⚠️ {lang === 'vi' ? 'Sai lầm thường gặp:' : 'Common Mistake:'} </span>
                      {explainData.commonMistake}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={fetchExplain}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                >
                  {lang === 'vi' ? 'Nhấn để tạo giải thích' : 'Generate Explanation'}
                </button>
              )}
            </div>
          )}

          {/* TAB 2: MNEMONIC */}
          {activeTab === 'mnemonic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {lang === 'vi' ? 'Thẻ cần tạo mẹo nhớ:' : 'Target Card:'}
                </label>
                <select
                  value={targetCard.id}
                  onChange={(e) => {
                    const c = set.cards.find((card) => card.id === e.target.value);
                    if (c) {
                      setTargetCard(c);
                      setMnemonicData(null);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold outline-none"
                >
                  {set.cards.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      #{i + 1}: {c.front}
                    </option>
                  ))}
                </select>
              </div>

              {isMnemonicLoading ? (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">
                    {lang === 'vi' ? 'AI đang sáng tác câu vè và mẹo liên tưởng sống động...' : 'Generating memory hook...'}
                  </p>
                </div>
              ) : mnemonicData ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-5 rounded-2xl bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800 space-y-2">
                    <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">
                      {lang === 'vi' ? 'Câu vè / Thần chú ghi nhớ' : 'Mnemonic Hook'}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      "{mnemonicData.mnemonic}"
                    </h3>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      {lang === 'vi' ? 'Hình ảnh liên tưởng não bộ' : 'Visual Association'}
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {mnemonicData.association}
                    </p>
                  </div>

                  {mnemonicData.story && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        {lang === 'vi' ? 'Câu chuyện liên kết' : 'Story'}
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic">
                        "{mnemonicData.story}"
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={fetchMnemonic}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs"
                >
                  {lang === 'vi' ? 'Tạo mẹo nhớ ngay' : 'Generate Mnemonic'}
                </button>
              )}
            </div>
          )}

          {/* TAB 3: CHAT WITH SET */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[400px]">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white font-medium rounded-br-none'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{lang === 'vi' ? 'AI đang suy nghĩ...' : 'Thinking...'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="pt-3 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    lang === 'vi'
                      ? 'Hỏi AI bất kỳ điều gì về bộ thẻ này...'
                      : 'Ask AI about this study set...'
                  }
                  className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: REVERSE & CLOZE CARDS */}
          {activeTab === 'variants' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setVariantType('reverse')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    variantType === 'reverse'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lang === 'vi' ? 'Thẻ đảo (Hỏi ngược)' : 'Reverse Cards'}
                </button>
                <button
                  type="button"
                  onClick={() => setVariantType('cloze')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    variantType === 'cloze'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lang === 'vi' ? 'Thẻ điền vào chỗ trống [...]' : 'Cloze Fill-in-blank'}
                </button>
              </div>

              <button
                onClick={handleGenerateVariants}
                disabled={isVariantsLoading}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {isVariantsLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{lang === 'vi' ? 'Đang tạo biến thể thẻ...' : 'Generating variants...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {lang === 'vi'
                        ? `Tự động sinh các thẻ ${variantType === 'reverse' ? 'đảo' : 'điền từ'}`
                        : `Generate ${variantType} cards`}
                    </span>
                  </>
                )}
              </button>

              {generatedVariants.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {lang === 'vi' ? 'Các biến thể mới được tạo:' : 'Generated variant cards:'}
                    </span>
                    {!variantsAppended ? (
                      <button
                        onClick={handleAppendVariants}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'vi' ? 'Thêm vào bộ thẻ' : 'Add to Set'}</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> {lang === 'vi' ? 'Đã thêm thành công!' : 'Added!'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {generatedVariants.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      >
                        <div className="font-bold text-slate-900 dark:text-white">
                          [Mặt trước]: {c.front}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">
                          [Mặt sau]: {c.back}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TRANSLATE */}
          {activeTab === 'translate' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  {lang === 'vi' ? 'Chọn ngôn ngữ đích cần dịch:' : 'Target Language:'}
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold outline-none"
                >
                  <option value="English">English (Tiếng Anh)</option>
                  <option value="Vietnamese">Tiếng Việt</option>
                  <option value="Japanese">Japanese (日本語)</option>
                  <option value="French">French (Français)</option>
                  <option value="Korean">Korean (한국어)</option>
                </select>
              </div>

              <button
                onClick={handleTranslate}
                disabled={isTranslating}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {isTranslating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{lang === 'vi' ? 'Đang dịch bộ thẻ...' : 'Translating set...'}</span>
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4" />
                    <span>{lang === 'vi' ? `Dịch toàn bộ thẻ sang ${targetLanguage}` : `Translate set to ${targetLanguage}`}</span>
                  </>
                )}
              </button>

              {translatedCards.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {lang === 'vi' ? `Bản dịch (${translatedCards.length} thẻ):` : `Translation preview:`}
                    </span>
                    {!isTranslatedSaved ? (
                      <button
                        onClick={handleAppendTranslations}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'vi' ? 'Thêm các thẻ dịch vào bộ' : 'Append to Set'}</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> {lang === 'vi' ? 'Đã thêm thành công!' : 'Added!'}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {translatedCards.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      >
                        <div className="font-bold text-slate-900 dark:text-white">
                          {c.front}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">
                          {c.back}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
