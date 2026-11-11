import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Flame,
  Search,
  BookOpen,
  FolderOpen,
  CalendarCheck,
  TrendingUp,
  Layers,
  BrainCircuit,
  FileCheck2,
  Zap,
  PenTool,
  Rocket,
  Star,
  CheckCircle2,
  Trash2,
  Edit3,
  Copy,
  Share2,
  ArrowRight,
  FolderPlus,
  Filter,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { StudySet, Folder, CardProgress, StudyStats, UserProfile, Card, StudyModeType } from './types';
import { Language, translations } from './translations';
import {
  getStudySets,
  saveStudySet,
  deleteStudySet,
  duplicateStudySet,
  getFolders,
  saveFolder,
  deleteFolder,
  getAllProgresses,
  getStudyStats,
  getUserProfile,
  saveUserProfile,
} from './utils/storage';
import { isCardDue } from './utils/srs';
import { initAuth } from './utils/googleAuth';
import { fetchUserData, persistUserData } from './utils/userSync';

// Components
import { Navbar } from './components/Navbar';
import { SetDetail } from './components/SetDetail';
import { FlashcardMode } from './components/FlashcardMode';
import { LearnMode } from './components/LearnMode';
import { TestMode } from './components/TestMode';
import { MatchMode } from './components/MatchMode';
import { WriteMode } from './components/WriteMode';
import { GravityGame } from './components/GravityGame';
import { AiCreateModal } from './components/AiCreateModal';
import { SetEditorModal } from './components/SetEditorModal';
import { AiAssistantModal, AiAssistantTab } from './components/AiAssistantModal';
import { ShareModal } from './components/ShareModal';
import { StatsView } from './components/StatsView';
import { GoogleAccountModal } from './components/GoogleAccountModal';

type ViewMode =
  | 'home'
  | 'set_detail'
  | 'study_flashcards'
  | 'study_learn'
  | 'study_test'
  | 'study_match'
  | 'study_write'
  | 'study_gravity'
  | 'stats';

export default function App() {
  const [sets, setSets] = useState<StudySet[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [progresses, setProgresses] = useState<Record<string, CardProgress>>({});
  const [stats, setStats] = useState<StudyStats>(getStudyStats());
  const [user, setUser] = useState<UserProfile>(getUserProfile());
  const [lang, setLang] = useState<Language>('vi');
  const [darkMode, setDarkMode] = useState(false);

  // Google User & Cloud Sync
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleSyncOpen, setGoogleSyncOpen] = useState(false);

  // Navigation
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [studyStarredOnly, setStudyStarredOnly] = useState(false);

  // Modals
  const [aiCreateOpen, setAiCreateOpen] = useState(false);
  const [setEditorOpen, setSetEditorOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<StudySet | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [assistantTab, setAssistantTab] = useState<AiAssistantTab>('explain');
  const [assistantCard, setAssistantCard] = useState<Card | undefined>(undefined);

  // Quick Home AI input
  const [homePasteInput, setHomePasteInput] = useState('');
  const [aiInitialText, setAiInitialText] = useState('');
  const [aiInitialTab, setAiInitialTab] = useState<'file' | 'text'>('file');
  const [aiAutoGenerate, setAiAutoGenerate] = useState(false);

  // Initial load
  useEffect(() => {
    const loadedSets = getStudySets();
    const loadedFolders = getFolders();
    const loadedProgress = getAllProgresses();
    const loadedStats = getStudyStats();
    const loadedUser = getUserProfile();

    setSets(loadedSets);
    setFolders(loadedFolders);
    setProgresses(loadedProgress);
    setStats(loadedStats);
    setUser(loadedUser);
    setLang(loadedUser.language || 'vi');
    setDarkMode(loadedUser.darkMode || false);

    // Initialize Google Auth state listener
    const unsubscribe = initAuth(
      (u) => setGoogleUser(u)
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Auto-load & auto-persist when Google user logs in or page refreshes
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!googleUser) return;

    let isMounted = true;
    (async () => {
      try {
        setIsSyncing(true);
        const cloudData = await fetchUserData(googleUser.uid);
        if (!isMounted) return;

        if (cloudData && cloudData.sets && cloudData.sets.length > 0) {
          // If server has saved sets for this user, load them
          setSets(cloudData.sets);
          localStorage.setItem('quizmaster_sets_v1', JSON.stringify(cloudData.sets));
          if (cloudData.folders && cloudData.folders.length > 0) {
            setFolders(cloudData.folders);
            localStorage.setItem('quizmaster_folders_v1', JSON.stringify(cloudData.folders));
          }
          if (cloudData.stats) {
            setStats(cloudData.stats);
            localStorage.setItem('quizmaster_stats_v1', JSON.stringify(cloudData.stats));
          }
          if (cloudData.progresses && Object.keys(cloudData.progresses).length > 0) {
            setProgresses(cloudData.progresses);
            localStorage.setItem('quizmaster_progress_v1', JSON.stringify(cloudData.progresses));
          }
        } else {
          // If this user has no server data yet, auto-save whatever they currently have
          const currentSets = getStudySets();
          const currentFolders = getFolders();
          const currentStats = getStudyStats();
          const currentProgress = getAllProgresses();
          await persistUserData(googleUser.uid, {
            sets: currentSets,
            folders: currentFolders,
            stats: currentStats,
            progresses: currentProgress,
          });
        }
      } catch (err) {
        console.error('Error syncing user on login:', err);
      } finally {
        if (isMounted) setIsSyncing(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [googleUser]);

  // Sync dark mode class on <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const t = translations[lang];

  // Active study set
  const activeSet = useMemo(() => {
    return sets.find((s) => s.id === activeSetId) || sets[0];
  }, [sets, activeSetId]);

  // Due cards count
  const dueCount = useMemo(() => {
    let count = 0;
    sets.forEach((s) => {
      s.cards.forEach((c) => {
        const prog = progresses[c.id];
        if (isCardDue(prog)) {
          count += 1;
        }
      });
    });
    return count;
  }, [sets, progresses]);

  // Handlers
  const handleToggleLang = () => {
    const nextLang: Language = lang === 'vi' ? 'en' : 'vi';
    setLang(nextLang);
    const updated: UserProfile = { ...user, language: nextLang };
    setUser(updated);
    saveUserProfile(updated);
  };

  const handleToggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    const updated = { ...user, darkMode: nextDark };
    setUser(updated);
    saveUserProfile(updated);
  };

  const handleSelectSet = (targetSet: StudySet) => {
    setActiveSetId(targetSet.id);
    setCurrentView('set_detail');
  };

  const handleStartStudyMode = (mode: StudyModeType, starredOnly: boolean = false) => {
    setStudyStarredOnly(starredOnly);
    if (mode === 'flashcards') setCurrentView('study_flashcards');
    else if (mode === 'learn') setCurrentView('study_learn');
    else if (mode === 'test') setCurrentView('study_test');
    else if (mode === 'match') setCurrentView('study_match');
    else if (mode === 'write') setCurrentView('study_write');
    else if (mode === 'gravity') setCurrentView('study_gravity');
  };

  const autoSaveToAccount = (
    updatedSets: StudySet[],
    updatedFolders?: Folder[],
    updatedStats?: StudyStats,
    updatedProgress?: Record<string, CardProgress>
  ) => {
    if (!googleUser) return;
    persistUserData(googleUser.uid, {
      sets: updatedSets,
      folders: updatedFolders || folders,
      stats: updatedStats || stats,
      progresses: updatedProgress || progresses,
    }).catch((e) => console.error('Auto save error:', e));
  };

  const handleSaveSet = (newOrUpdated: StudySet) => {
    const updatedSets = saveStudySet(newOrUpdated);
    setSets(updatedSets);
    setActiveSetId(newOrUpdated.id);
    setCurrentView('set_detail');
    autoSaveToAccount(updatedSets);
  };

  const handleDeleteSet = (id: string) => {
    if (window.confirm(t.confirmDelete)) {
      const remaining = deleteStudySet(id);
      setSets(remaining);
      setCurrentView('home');
      autoSaveToAccount(remaining);
    }
  };

  const handleDuplicateSet = (id: string) => {
    const updated = duplicateStudySet(id);
    setSets(updated);
    autoSaveToAccount(updated);
  };

  const handleToggleStarCard = (cardId: string) => {
    if (!activeSet) return;
    const updatedCards = activeSet.cards.map((c) =>
      c.id === cardId ? { ...c, isStarred: !c.isStarred } : c
    );
    const updatedSet = { ...activeSet, cards: updatedCards };
    const all = saveStudySet(updatedSet);
    setSets(all);
    autoSaveToAccount(all);
  };

  const handleOpenAiAssistant = (tab: AiAssistantTab, card?: Card) => {
    setAssistantTab(tab);
    setAssistantCard(card || (activeSet?.cards[0] as Card));
    setAiAssistantOpen(true);
  };

  const handleAppendCardsToActiveSet = (newCards: Card[]) => {
    if (!activeSet) return;
    const updatedSet: StudySet = {
      ...activeSet,
      cards: [...activeSet.cards, ...newCards],
      updatedAt: Date.now(),
    };
    const all = saveStudySet(updatedSet);
    setSets(all);
    autoSaveToAccount(all);
  };

  // Study Weak Spots (Find cards with wrongCount > 0 or unmastered)
  const handleStudyWeakSpots = () => {
    if (!activeSet) return;
    const weakCards = activeSet.cards.filter((c) => {
      const prog = progresses[c.id];
      return (prog && prog.wrongCount > 0) || !prog || prog.level !== 'mastered';
    });

    if (weakCards.length === 0) {
      alert(lang === 'vi' ? 'Bạn đã thuộc rất tốt bộ thẻ này!' : 'You have mastered this set well!');
      return;
    }

    // Launch flashcards with weak cards
    const weakSet: StudySet = {
      ...activeSet,
      id: `weak-${activeSet.id}`,
      title: `${activeSet.title} (Ôn điểm yếu)`,
      cards: weakCards,
    };
    setActiveSetId(weakSet.id);
    handleSaveSet(weakSet);
    setCurrentView('study_flashcards');
  };

  // Start due today review
  const handleStartDueReview = () => {
    const dueCards: Card[] = [];
    sets.forEach((s) => {
      s.cards.forEach((c) => {
        if (isCardDue(progresses[c.id])) {
          dueCards.push(c);
        }
      });
    });

    if (dueCards.length === 0) {
      alert(lang === 'vi' ? 'Hôm nay bạn đã ôn tập hết các thẻ cần ôn!' : 'No cards due today!');
      return;
    }

    const reviewSet: StudySet = {
      id: `due-today-set`,
      title: lang === 'vi' ? 'Cần ôn hôm nay (Spaced Repetition)' : 'Due Today Review',
      description: lang === 'vi' ? 'Tổng hợp tất cả các thẻ đến hạn ôn tập theo thuật toán SM-2' : 'Aggregated SM-2 cards',
      subject: 'Ôn tập tổng hợp',
      tags: ['DueToday', 'SRS', 'SM-2'],
      isPublic: false,
      cards: dueCards,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    handleSaveSet(reviewSet);
    setCurrentView('study_flashcards');
  };

  // Quick Home paste trigger
  const handleQuickHomeAi = () => {
    if (homePasteInput.trim()) {
      setAiInitialText(homePasteInput);
      setAiInitialTab('text');
      setAiAutoGenerate(true);
    } else {
      setAiInitialText('');
      setAiInitialTab('text');
      setAiAutoGenerate(false);
    }
    setAiCreateOpen(true);
  };

  const handleOpenUploadFile = () => {
    setAiInitialTab('file');
    setAiInitialText('');
    setAiAutoGenerate(false);
    setAiCreateOpen(true);
  };

  // Manual force sync handler
  const handleManualSync = async () => {
    if (!googleUser) return;
    setIsSyncing(true);
    try {
      await persistUserData(googleUser.uid, {
        sets,
        folders,
        stats,
        progresses,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered sets for Home view
  const filteredSets = useMemo(() => {
    return sets.filter((s) => {
      if (selectedFolderId && s.folderId !== selectedFolderId) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [sets, selectedFolderId, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        lang={lang}
        onToggleLang={handleToggleLang}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        streak={stats.currentStreak}
        dueCount={dueCount}
        onOpenDueToday={handleStartDueReview}
        onOpenAiCreate={() => {
          setAiInitialTab('text');
          setAiInitialText('');
          setAiAutoGenerate(false);
          setAiCreateOpen(true);
        }}
        onOpenUploadFile={handleOpenUploadFile}
        onOpenManualCreate={() => {
          setEditingSet(null);
          setSetEditorOpen(true);
        }}
        onNavigateHome={() => setCurrentView('home')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sets={sets}
        onSelectSet={handleSelectSet}
        user={user}
        googleUser={googleUser}
        onOpenGoogleSync={() => setGoogleSyncOpen(true)}
      />

      {/* Main Content Dynamic Router */}
      <main className="flex-1">
        {/* VIEW 1: HOME DASHBOARD */}
        {currentView === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-fade-in">
            {/* Hero Quick AI Generator Box */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 sm:p-10 text-white shadow-2xl shadow-indigo-600/20">
              <div className="relative z-10 max-w-3xl space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-indigo-100">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>{lang === 'vi' ? 'Tính năng AI "Ném là có thẻ"' : 'Instant AI Flashcard Generator'}</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                  {lang === 'vi'
                    ? 'Dán câu hỏi hoặc tài liệu vào đây để tạo thẻ ngay trong 5 giây'
                    : 'Paste questions or notes here to generate flashcards in seconds'}
                </h1>

                <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
                  {lang === 'vi'
                    ? 'Hỗ trợ mọi định dạng: đề trắc nghiệm A-B-C-D, danh sách từ vựng, bài giảng dài, tài liệu PDF hoặc dữ liệu xuất từ Quizlet.'
                    : 'Supports multiple choice A-B-C-D, vocabulary pairs, lecture notes, or Quizlet export.'}
                </p>

                {/* Spacious multi-line input field */}
                <div className="pt-2 space-y-3">
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={homePasteInput}
                      onChange={(e) => setHomePasteInput(e.target.value)}
                      placeholder={
                        lang === 'vi'
                          ? 'Dán bất kỳ nội dung nào vào đây (câu hỏi trắc nghiệm A-B-C-D, 200-300 câu, từ vựng, tài liệu tóm tắt)...'
                          : 'Paste any exam questions (A-B-C-D, 200-300 questions, vocabulary, lecture notes)...'
                      }
                      className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 text-white placeholder-white/60 text-xs sm:text-sm outline-none focus:bg-white/20 transition resize-y font-mono leading-relaxed"
                    />
                    {homePasteInput.length > 0 && (
                      <span className="absolute right-3 bottom-3 text-[11px] text-white/50 font-mono">
                        {homePasteInput.length} {lang === 'vi' ? 'ký tự' : 'chars'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleQuickHomeAi}
                      className="cursor-pointer px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-indigo-700 font-black text-xs sm:text-sm shadow-xl shadow-black/15 transition active:scale-95 flex items-center justify-center gap-2 shrink-0"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>{lang === 'vi' ? '⚡ Bóc Tách & Tạo Thẻ Ngay' : '⚡ Generate Flashcards Now'}</span>
                    </button>

                    <button
                      onClick={handleOpenUploadFile}
                      className="cursor-pointer px-5 py-3.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/30 transition active:scale-95 flex items-center justify-center gap-2 shrink-0"
                    >
                      <span>📂 {lang === 'vi' ? 'Đẩy tệp lên (Word, Excel, PDF, TXT)' : 'Upload Exam File (.docx, .xlsx, .pdf)'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Decorative background shapes */}
              <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
              <div className="absolute right-10 bottom-0 w-64 h-64 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />
            </div>

            {/* Spaced Repetition Due Alert */}
            {dueCount > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-rose-900 dark:text-rose-200">
                      {lang === 'vi'
                        ? `Lặp lại ngắt quãng: Có ${dueCount} thẻ cần ôn hôm nay!`
                        : `Spaced Repetition: ${dueCount} cards due today!`}
                    </h3>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      {lang === 'vi'
                        ? 'Ôn lại trước khi kiến thức bị phai mờ theo đường cong quên lãng Ebbinghaus.'
                        : 'Review now before you forget!'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleStartDueReview}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition active:scale-95 shrink-0"
                >
                  {t.startReview}
                </button>
              </div>
            )}

            {/* Quick Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setCurrentView('stats')}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition text-left flex items-center gap-3 group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-500">
                  <Flame className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {stats.currentStreak} {t.days}
                  </span>
                  <p className="text-[11px] font-bold text-slate-400">{t.streak}</p>
                </div>
              </button>

              <button
                onClick={() => setCurrentView('stats')}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition text-left flex items-center gap-3 group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {stats.totalCardsStudied}
                  </span>
                  <p className="text-[11px] font-bold text-slate-400">{t.cardsStudied}</p>
                </div>
              </button>

              <button
                onClick={() => setCurrentView('stats')}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition text-left flex items-center gap-3 group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center text-purple-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {sets.length}
                  </span>
                  <p className="text-[11px] font-bold text-slate-400">{t.allSets}</p>
                </div>
              </button>

              <button
                onClick={() => setCurrentView('stats')}
                className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition text-left flex items-center gap-3 group shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {lang === 'vi' ? 'Tiến độ' : 'Progress'}
                  </span>
                  <p className="text-[11px] font-bold text-slate-400">
                    {lang === 'vi' ? 'Xem biểu đồ SM-2' : 'View SM-2 charts'}
                  </p>
                </div>
              </button>
            </div>

            {/* Folder Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    {t.folders}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-bold">
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
                    selectedFolderId === null
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'vi' ? 'Tất cả thư mục' : 'All Folders'}
                </button>

                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`px-4 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
                      selectedFolderId === folder.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: folder.color }}
                    />
                    <span>{folder.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Study Sets Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{t.recentSets}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {filteredSets.length}
                  </span>
                </h3>

                <button
                  onClick={() => {
                    setEditingSet(null);
                    setSetEditorOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.manualCreate}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSets.map((studySet) => {
                  const starredInSet = studySet.cards.filter((c) => c.isStarred).length;

                  return (
                    <div
                      key={studySet.id}
                      onClick={() => handleSelectSet(studySet)}
                      className="group bg-white dark:bg-slate-800 rounded-3xl p-5 border-2 border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-bold uppercase tracking-wider text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">
                            {studySet.subject}
                          </span>

                          <div className="flex items-center gap-2">
                            {starredInSet > 0 && (
                              <span className="flex items-center gap-1 text-amber-500 font-bold">
                                <Star className="w-3.5 h-3.5 fill-amber-500" />
                                {starredInSet}
                              </span>
                            )}
                            <span className="font-semibold">
                              {studySet.cards.length} {t.cards}
                            </span>
                          </div>
                        </div>

                        <h4 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition leading-snug line-clamp-2">
                          {studySet.title}
                        </h4>

                        {studySet.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {studySet.description}
                          </p>
                        )}
                      </div>

                      {/* Card Bottom: Quick Study Buttons */}
                      <div
                        className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setActiveSetId(studySet.id);
                            handleStartStudyMode('flashcards');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{t.flashcards}</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveSetId(studySet.id);
                            handleStartStudyMode('learn');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <BrainCircuit className="w-3.5 h-3.5" />
                          <span>{t.learn}</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveSetId(studySet.id);
                            handleStartStudyMode('test');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>{t.test}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: STUDY SET DETAIL */}
        {currentView === 'set_detail' && activeSet && (
          <SetDetail
            set={activeSet}
            lang={lang}
            onBack={() => setCurrentView('home')}
            onStartStudyMode={handleStartStudyMode}
            onEditSet={() => {
              setEditingSet(activeSet);
              setSetEditorOpen(true);
            }}
            onCloneSet={() => handleDuplicateSet(activeSet.id)}
            onDeleteSet={() => handleDeleteSet(activeSet.id)}
            onOpenShare={() => setShareModalOpen(true)}
            onOpenAiAssistant={handleOpenAiAssistant}
            onToggleStarCard={handleToggleStarCard}
            onStudyWeakSpots={handleStudyWeakSpots}
          />
        )}

        {/* VIEW 3: FLASHCARDS MODE */}
        {currentView === 'study_flashcards' && activeSet && (
          <FlashcardMode
            set={activeSet}
            lang={lang}
            onBack={() => setCurrentView('set_detail')}
            onOpenExplain={(card) => handleOpenAiAssistant('explain', card)}
            onOpenMnemonic={(card) => handleOpenAiAssistant('mnemonic', card)}
            initialStarredOnly={studyStarredOnly}
          />
        )}

        {/* VIEW 4: LEARN MODE */}
        {currentView === 'study_learn' && activeSet && (
          <LearnMode
            set={activeSet}
            lang={lang}
            onBack={() => setCurrentView('set_detail')}
            onOpenExplain={(card) => handleOpenAiAssistant('explain', card)}
          />
        )}

        {/* VIEW 5: TEST MODE */}
        {currentView === 'study_test' && activeSet && (
          <TestMode
            set={activeSet}
            lang={lang}
            onBack={() => setCurrentView('set_detail')}
            onOpenExplain={(card) => handleOpenAiAssistant('explain', card)}
          />
        )}

        {/* VIEW 6: MATCH GAME */}
        {currentView === 'study_match' && activeSet && (
          <MatchMode
            set={activeSet}
            lang={lang}
            onBack={() => setCurrentView('set_detail')}
          />
        )}

        {/* VIEW 7: WRITE MODE */}
        {currentView === 'study_write' && activeSet && (
          <WriteMode
            set={activeSet}
            lang={lang}
            onBack={() => setCurrentView('set_detail')}
            onOpenExplain={(card) => handleOpenAiAssistant('explain', card)}
          />
        )}

        {/* VIEW 8: GRAVITY ASTEROID GAME */}
        {currentView === 'study_gravity' && activeSet && (
          <GravityGame
            set={activeSet}
            lang={lang}
            onBack={() => setCurrentView('set_detail')}
          />
        )}

        {/* VIEW 9: STATISTICS VIEW */}
        {currentView === 'stats' && (
          <StatsView
            stats={stats}
            progresses={progresses}
            sets={sets}
            lang={lang}
            onBack={() => setCurrentView('home')}
            onStartDueReview={handleStartDueReview}
          />
        )}
      </main>

      {/* MODALS */}
      {/* 1. AI Create Modal */}
      <AiCreateModal
        isOpen={aiCreateOpen}
        onClose={() => setAiCreateOpen(false)}
        onSaveSet={handleSaveSet}
        lang={lang}
        initialText={aiInitialText}
        initialTab={aiInitialTab}
        autoGenerate={aiAutoGenerate}
      />

      {/* 2. Manual Set Editor Modal */}
      <SetEditorModal
        isOpen={setEditorOpen}
        onClose={() => setSetEditorOpen(false)}
        onSave={handleSaveSet}
        initialSet={editingSet}
        folders={folders}
        lang={lang}
      />

      {/* 3. Share & Export Modal */}
      {activeSet && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          set={activeSet}
          lang={lang}
        />
      )}

      {/* 4. AI Assistant Modal */}
      {activeSet && (
        <AiAssistantModal
          isOpen={aiAssistantOpen}
          onClose={() => setAiAssistantOpen(false)}
          tab={assistantTab}
          set={activeSet}
          selectedCard={assistantCard}
          lang={lang}
          onAppendCards={handleAppendCardsToActiveSet}
        />
      )}

      {/* 5. Google Account Modal */}
      <GoogleAccountModal
        isOpen={googleSyncOpen}
        onClose={() => setGoogleSyncOpen(false)}
        currentUser={googleUser}
        onAuthChanged={setGoogleUser}
        sets={sets}
        folders={folders}
        stats={stats}
        lang={lang}
        onSyncNow={handleManualSync}
        isSyncing={isSyncing}
      />
    </div>
  );
}
