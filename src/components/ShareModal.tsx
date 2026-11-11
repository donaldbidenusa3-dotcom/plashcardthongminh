import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  Printer,
  FileSpreadsheet,
  FileCode,
  QrCode,
  ExternalLink,
} from 'lucide-react';
import { StudySet } from '../types';
import { Language, translations } from '../translations';
import { exportToCsv, exportToJson, exportToQuizletText } from '../utils/storage';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  set: StudySet;
  lang: Language;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  set,
  lang,
}) => {
  const t = translations[lang];
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedQuizletText, setCopiedQuizletText] = useState(false);

  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}?set=${set.id}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyQuizlet = () => {
    const text = exportToQuizletText(set);
    navigator.clipboard.writeText(text);
    setCopiedQuizletText(true);
    setTimeout(() => setCopiedQuizletText(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Simple clean QR code placeholder using quick QR SVG API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    shareUrl
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                {t.shareSet}
              </h3>
              <p className="text-xs text-slate-500">{set.title}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Share Link */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              {lang === 'vi' ? 'Liên kết chia sẻ bộ thẻ' : 'Study Set Link'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono select-all outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? (lang === 'vi' ? 'Đã sao chép' : 'Copied') : (lang === 'vi' ? 'Sao chép' : 'Copy')}</span>
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className="w-24 h-24 bg-white p-1 rounded-xl shadow-sm flex items-center justify-center shrink-0">
              <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                <QrCode className="w-4 h-4 text-indigo-500" />
                <span>{lang === 'vi' ? 'Quét mã QR trên điện thoại' : 'Scan QR on phone'}</span>
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'vi'
                  ? 'Bạn bè chỉ cần dùng camera quét mã là có thể mở ngay bộ thẻ này trên điện thoại để cùng học.'
                  : 'Classmates can scan with their phone camera to instantly start studying this set.'}
              </p>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {t.exportSet}
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => exportToCsv(set)}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-800 text-left transition flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'vi' ? 'Tải tệp CSV (.csv)' : 'Export CSV'}</span>
              </button>

              <button
                onClick={() => exportToJson(set)}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-800 text-left transition flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <FileCode className="w-4 h-4 text-indigo-500" />
                <span>{lang === 'vi' ? 'Tải tệp JSON' : 'Export JSON'}</span>
              </button>

              <button
                onClick={handleCopyQuizlet}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-800 text-left transition flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                {copiedQuizletText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-purple-500" />}
                <span>{copiedQuizletText ? (lang === 'vi' ? 'Đã chép Quizlet' : 'Copied Quizlet') : (lang === 'vi' ? 'Sao chép dạng Quizlet' : 'Copy Quizlet')}</span>
              </button>

              <button
                onClick={handlePrint}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 bg-white dark:bg-slate-800 text-left transition flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>{lang === 'vi' ? 'In ấn flashcard' : 'Print Cards'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
