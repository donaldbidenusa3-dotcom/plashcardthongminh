import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Undo2,
  Redo2,
  Save,
  Star,
  FolderOpen,
  ArrowRightLeft,
} from 'lucide-react';
import { StudySet, Card, Folder } from '../types';
import { Language, translations } from '../translations';

interface SetEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (set: StudySet) => void;
  initialSet?: StudySet | null;
  folders: Folder[];
  lang: Language;
}

export const SetEditorModal: React.FC<SetEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSet,
  folders,
  lang,
}) => {
  const t = translations[lang];

  const [title, setTitle] = useState(initialSet?.title || '');
  const [description, setDescription] = useState(initialSet?.description || '');
  const [subject, setSubject] = useState(initialSet?.subject || 'Tiếng Anh');
  const [tagInput, setTagInput] = useState((initialSet?.tags || []).join(', '));
  const [folderId, setFolderId] = useState(initialSet?.folderId || '');
  const [isPublic, setIsPublic] = useState(initialSet?.isPublic ?? true);

  const [cards, setCards] = useState<Card[]>(() => {
    if (initialSet && initialSet.cards.length > 0) {
      return [...initialSet.cards];
    }
    return [
      {
        id: `c-1`,
        front: '',
        back: '',
        hint: '',
        isStarred: false,
        createdAt: Date.now(),
      },
      {
        id: `c-2`,
        front: '',
        back: '',
        hint: '',
        isStarred: false,
        createdAt: Date.now(),
      },
    ];
  });

  // Undo / Redo history stack
  const [history, setHistory] = useState<Card[][]>([]);
  const [redoStack, setRedoStack] = useState<Card[][]>([]);

  if (!isOpen) return null;

  const pushHistory = (newCards: Card[]) => {
    setHistory((prev) => [...prev.slice(-15), cards]);
    setRedoStack([]);
    setCards(newCards);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [cards, ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    setCards(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory((prev) => [...prev, cards]);
    setRedoStack((prev) => prev.slice(1));
    setCards(next);
  };

  const handleUpdateCard = (idx: number, field: keyof Card, value: any) => {
    const updated = [...cards];
    updated[idx] = { ...updated[idx], [field]: value };
    setCards(updated);
  };

  const handleAddCard = () => {
    const newCard: Card = {
      id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      front: '',
      back: '',
      hint: '',
      isStarred: false,
      createdAt: Date.now(),
    };
    pushHistory([...cards, newCard]);
  };

  const handleDeleteCard = (idx: number) => {
    if (cards.length <= 1) return;
    pushHistory(cards.filter((_, i) => i !== idx));
  };

  const handleDuplicateCard = (idx: number) => {
    const source = cards[idx];
    const clone: Card = {
      ...source,
      id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    };
    const updated = [...cards];
    updated.splice(idx + 1, 0, clone);
    pushHistory(updated);
  };

  const handleMoveCard = (idx: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && idx === 0) ||
      (direction === 'down' && idx === cards.length - 1)
    )
      return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...cards];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    pushHistory(updated);
  };

  const handleSwapFrontBack = (idx: number) => {
    const updated = [...cards];
    const cur = updated[idx];
    updated[idx] = { ...cur, front: cur.back, back: cur.front };
    pushHistory(updated);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const validCards = cards.filter(
      (c) => c.front.trim().length > 0 && c.back.trim().length > 0
    );

    if (validCards.length === 0) return;

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const updatedSet: StudySet = {
      id: initialSet?.id || `set-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      tags,
      folderId: folderId || undefined,
      isPublic,
      cards: validCards,
      createdAt: initialSet?.createdAt || Date.now(),
      updatedAt: Date.now(),
      authorName: initialSet?.authorName || 'Bạn (Me)',
    };

    onSave(updatedSet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white">
              {initialSet ? t.editSet : t.createSet}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'vi'
                ? 'Nhập thuật ngữ, định nghĩa, sắp xếp thứ tự và phân loại thư mục'
                : 'Create or edit cards, order, and metadata'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              title={t.undo}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title={t.redo}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'vi' ? 'Tiêu đề bộ thẻ *' : 'Set Title *'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={lang === 'vi' ? 'Ví dụ: 50 từ vựng IELTS chủ đề Environment' : 'e.g. 50 IELTS Vocabularies'}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'vi' ? 'Chủ đề / Môn học' : 'Subject'}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-semibold outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'vi' ? 'Mô tả bộ thẻ' : 'Description'}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={lang === 'vi' ? 'Mô tả ngắn về kiến thức trong bộ thẻ' : 'Short description'}
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.folders}
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold outline-none focus:border-indigo-500"
              >
                <option value="">{lang === 'vi' ? '-- Không chọn thư mục --' : '-- No folder --'}</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'vi' ? 'Thẻ phân loại (Tags, cách nhau bằng dấu phẩy)' : 'Tags (comma separated)'}
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="IELTS, Speaking, Part 1"
                className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Cards List Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {lang === 'vi' ? 'Danh sách các thẻ' : 'Flashcards'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                  {cards.length} {t.cards}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddCard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addCard}</span>
              </button>
            </div>

            <div className="space-y-4">
              {cards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateCard(idx, 'isStarred', !card.isStarred)}
                        className={`p-1 rounded-lg transition ${
                          card.isStarred
                            ? 'text-amber-500'
                            : 'text-slate-300 hover:text-amber-400'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${card.isStarred ? 'fill-amber-500' : ''}`} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleSwapFrontBack(idx)}
                        title={lang === 'vi' ? 'Đổi mặt' : 'Swap'}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCard(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 transition"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCard(idx, 'down')}
                        disabled={idx === cards.length - 1}
                        title="Move Down"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 transition"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateCard(idx)}
                        title="Duplicate"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(idx)}
                        disabled={cards.length <= 1}
                        title="Delete"
                        className="p-1.5 rounded-lg hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 disabled:opacity-20 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        {t.front}
                      </label>
                      <textarea
                        rows={2}
                        value={card.front}
                        onChange={(e) => handleUpdateCard(idx, 'front', e.target.value)}
                        placeholder={lang === 'vi' ? 'Thuật ngữ / Câu hỏi...' : 'Term / Question...'}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        {t.back}
                      </label>
                      <textarea
                        rows={2}
                        value={card.back}
                        onChange={(e) => handleUpdateCard(idx, 'back', e.target.value)}
                        placeholder={lang === 'vi' ? 'Định nghĩa / Đáp án...' : 'Definition / Answer...'}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  </div>

                  {/* Hint & Explanation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder={lang === 'vi' ? 'Gợi ý nhớ (tùy chọn)' : 'Hint (optional)'}
                      value={card.hint || ''}
                      onChange={(e) => handleUpdateCard(idx, 'hint', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] outline-none focus:border-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder={lang === 'vi' ? 'Giải thích đáp án (tùy chọn)' : 'Explanation (optional)'}
                      value={card.explanation || ''}
                      onChange={(e) => handleUpdateCard(idx, 'explanation', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddCard}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs sm:text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addCard}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 transition"
          >
            {t.cancel}
          </button>

          <button
            type="button"
            disabled={!title.trim()}
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition disabled:opacity-40 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{t.save}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
