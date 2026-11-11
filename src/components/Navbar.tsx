import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Flame,
  Search,
  Globe,
  Sun,
  Moon,
  FolderOpen,
  BookOpen,
  CalendarCheck,
  ChevronDown,
  UploadCloud,
  FileText,
  Cloud,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { translations, Language } from '../translations';
import { StudySet, UserProfile } from '../types';

interface NavbarProps {
  lang: Language;
  onToggleLang: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  streak: number;
  dueCount: number;
  onOpenDueToday: () => void;
  onOpenAiCreate: () => void;
  onOpenUploadFile?: () => void;
  onOpenManualCreate: () => void;
  onNavigateHome: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sets: StudySet[];
  onSelectSet: (set: StudySet) => void;
  user: UserProfile;
  googleUser: User | null;
  onOpenGoogleSync: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onToggleLang,
  darkMode,
  onToggleDarkMode,
  streak,
  dueCount,
  onOpenDueToday,
  onOpenAiCreate,
  onOpenUploadFile,
  onOpenManualCreate,
  onNavigateHome,
  searchQuery,
  onSearchChange,
  sets,
  onSelectSet,
  user,
  googleUser,
  onOpenGoogleSync,
}) => {
  const t = translations[lang];
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const filteredSets = searchQuery.trim()
    ? sets.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md border-b bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={onNavigateHome}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                QuizMaster
              </span>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 text-white uppercase tracking-wider">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              {lang === 'vi' ? 'Học flashcard thông minh' : 'Smart Quizlet Platform'}
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none transition"
            />
          </div>

          {/* Quick Search Dropdown */}
          {showSearchResults && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 max-h-80 overflow-y-auto">
              {filteredSets.length > 0 ? (
                filteredSets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onSelectSet(s);
                      setShowSearchResults(false);
                      onSearchChange('');
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between group transition"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {s.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {s.subject} • {s.cards.length} {t.cards}
                      </p>
                    </div>
                    <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                  {lang === 'vi' ? 'Không tìm thấy bộ thẻ phù hợp' : 'No sets found'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Action Icons & Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Day Streak */}
          <div
            title={`${t.streak}: ${streak} ${t.days}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 font-bold text-xs"
          >
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-bounce" />
            <span>{streak}</span>
          </div>

          {/* Due Today Button */}
          <button
            onClick={onOpenDueToday}
            title={t.dueToday}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              dueCount > 0
                ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.dueToday}</span>
            {dueCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                {dueCount}
              </span>
            )}
          </button>

          {/* Create Button Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium text-xs sm:text-sm shadow-md shadow-indigo-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createSet}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {showCreateMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50"
                onClick={() => setShowCreateMenu(false)}
              >
                <button
                  onClick={onOpenAiCreate}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 transition"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <div>
                    <div>{t.createWithAi}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                      {lang === 'vi' ? 'Dán đề thi, bài giảng, từ vựng' : 'From text, exam, Quizlet export'}
                    </div>
                  </div>
                </button>

                {onOpenUploadFile && (
                  <button
                    onClick={onOpenUploadFile}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 transition"
                  >
                    <UploadCloud className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div>{lang === 'vi' ? 'Đẩy tệp lên (Word, Excel, PDF)' : 'Upload Exam File'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {lang === 'vi' ? 'Hỗ trợ 200 - 300 câu hỏi' : 'Supports 200-300 questions'}
                      </div>
                    </div>
                  </button>
                )}

                <button
                  onClick={onOpenManualCreate}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 text-left text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 transition"
                >
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>{t.manualCreate}</span>
                </button>
              </div>
            )}
          </div>

          {/* Google Account & Auto-Save Button */}
          <button
            onClick={onOpenGoogleSync}
            title={
              googleUser
                ? `${lang === 'vi' ? 'Tài khoản Google:' : 'Google Account:'} ${googleUser.email} (${lang === 'vi' ? 'Tự động lưu' : 'Auto-saved'})`
                : lang === 'vi'
                ? 'Đăng nhập bằng Google để lưu trữ tự động'
                : 'Sign in with Google to auto-save'
            }
            className={`flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
              googleUser
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500'
            }`}
          >
            {googleUser ? (
              <>
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt="Google"
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {(googleUser.displayName || googleUser.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline max-w-[110px] truncate">
                  {googleUser.displayName?.split(' ')[0] || 'Google'}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{lang === 'vi' ? 'Đã lưu' : 'Saved'}</span>
                </span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {lang === 'vi' ? 'Đăng nhập Google' : 'Sign in Google'}
                </span>
              </>
            )}
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1"
          >
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="uppercase">{lang}</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
