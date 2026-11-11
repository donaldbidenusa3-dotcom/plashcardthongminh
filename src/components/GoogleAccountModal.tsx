import React, { useState } from 'react';
import {
  X,
  UserCheck,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, googleSignOut } from '../utils/googleAuth';
import { StudySet, Folder, StudyStats } from '../types';
import { Language } from '../translations';

interface GoogleAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthChanged: (user: User | null) => void;
  sets: StudySet[];
  folders: Folder[];
  stats: StudyStats;
  lang: Language;
  onSyncNow?: () => Promise<void>;
  isSyncing?: boolean;
}

export const GoogleAccountModal: React.FC<GoogleAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthChanged,
  sets,
  folders,
  stats,
  lang,
  onSyncNow,
  isSyncing = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalCards = sets.reduce((sum, s) => sum + s.cards.length, 0);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const user = await googleSignIn();
      onAuthChanged(user);
      setSuccessMsg(
        lang === 'vi'
          ? `Đăng nhập thành công! Bộ dữ liệu đã được tự động liên kết với tài khoản ${user.email}.`
          : `Signed in successfully with ${user.email}.`
      );
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg(
          err.message ||
            (lang === 'vi'
              ? 'Lỗi khi đăng nhập tài khoản Google.'
              : 'Google sign-in failed.')
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await googleSignOut();
      onAuthChanged(null);
      setSuccessMsg(
        lang === 'vi' ? 'Đã đăng xuất khỏi tài khoản Google.' : 'Signed out successfully.'
      );
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden transition-all">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                {lang === 'vi' ? 'Tài Khoản Google' : 'Google Account'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'vi' ? 'Lưu trữ tự động & không lo mất dữ liệu' : 'Auto-save & never lose your quiz data'}
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {currentUser ? (
            /* Signed In State */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Avatar'}
                      className="w-12 h-12 rounded-full ring-2 ring-indigo-500/30 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-lg">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{currentUser.displayName || 'Tài khoản Google'}</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </h4>
                    <p className="text-xs text-slate-500 font-mono truncate max-w-[200px]">{currentUser.email}</p>
                    <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{lang === 'vi' ? 'Đã liên kết & Tự động lưu' : 'Connected & Auto-saved'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSignOut}
                  title="Đăng xuất"
                  disabled={isLoading}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Data Summary */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-500" />
                    <span>{lang === 'vi' ? 'Dữ liệu đã được lưu trữ:' : 'Stored data:'}</span>
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {sets.length} {lang === 'vi' ? 'bộ thẻ' : 'sets'} ({totalCards} {lang === 'vi' ? 'câu hỏi' : 'questions'})
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {lang === 'vi'
                    ? '✅ Toàn bộ câu hỏi bạn tải lên hoặc tạo mới đều được lưu tự động theo tài khoản. Khi thoát web và quay lại, dữ liệu vẫn được bảo toàn nguyên vẹn.'
                    : '✅ All questions and sets are automatically saved to your account. When you close or reopen the page, everything remains safe.'}
                </p>
              </div>

              {onSyncNow && (
                <button
                  onClick={onSyncNow}
                  disabled={isSyncing}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} />
                  <span>
                    {isSyncing
                      ? lang === 'vi'
                        ? 'Đang đồng bộ...'
                        : 'Syncing...'
                      : lang === 'vi'
                      ? 'Đồng bộ dữ liệu ngay'
                      : 'Sync data now'}
                  </span>
                </button>
              )}
            </div>
          ) : (
            /* Not Signed In State */
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-7 h-7 text-indigo-600" />
              </div>

              <div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">
                  {lang === 'vi'
                    ? 'Đăng nhập Google để lưu dữ liệu vĩnh viễn'
                    : 'Sign in with Google to keep your data'}
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
                  {lang === 'vi'
                    ? 'Tất cả các bộ câu hỏi (200-300 câu), thẻ ghi nhớ và tiến độ bạn nhập sẽ được lưu tự động. Khi thoát web và mở lại, mọi thứ vẫn còn nguyên vẹn.'
                    : 'All exam questions, flashcards, and progress will be securely saved. Nothing is lost when you close the web.'}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="w-full cursor-pointer inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-slate-800 dark:text-white font-extrabold text-sm shadow-md transition active:scale-95"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  <span>{isLoading ? (lang === 'vi' ? 'Đang kết nối...' : 'Connecting...') : (lang === 'vi' ? 'Đăng nhập bằng Google' : 'Sign in with Google')}</span>
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{lang === 'vi' ? 'Lưu tự động vào tài khoản' : 'Auto-saves to your account'}</span>
                <span>•</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{lang === 'vi' ? 'Bảo lưu khi thoát web' : 'Persists after exiting'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
