import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw,
  HelpCircle,
  BookOpen,
  ArrowRightLeft,
  SlidersHorizontal,
  FileSpreadsheet,
  FileCheck,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { StudySet, Card } from '../types';
import { Language, translations } from '../translations';
import { parseQuizletText } from '../utils/storage';
import { parseExcelExam, parseDocxExam, parseTextExam, ParsedExamResult } from '../utils/examParser';

interface AiCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSet: (newSet: StudySet) => void;
  lang: Language;
}

const SAMPLE_INPUTS = {
  exam: `Câu 1: Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là gì?
A. Thành phố Hồ Chí Minh
B. Đà Nẵng
C. Hà Nội
D. Cần Thơ
Đáp án: C

Câu 2: Nguyên tố hóa học nào có ký hiệu là "Au"?
A. Bạc
B. Vàng
C. Đồng
D. Nhôm
Đáp án: B

Câu 3: Đỉnh núi Fansipan được mệnh danh là nóc nhà Đông Dương nằm ở tỉnh nào?
A. Lào Cai
B. Hà Giang
C. Yên Bái
D. Lai Châu
Đáp án: A

Câu 4: Ai là tác giả của tác phẩm "Truyện Kiều"?
A. Nguyễn Du
B. Hồ Xuân Hương
C. Nguyễn Trãi
D. Đoàn Thị Điểm
Đáp án: A

Câu 5: Năm nào diễn ra Chiến thắng Điện Biên Phủ?
A. 1945
B. 1954
C. 1968
D. 1975
Đáp án: B`,

  largeExamDemo: Array.from({ length: 50 }, (_, i) => {
    const qNum = i + 1;
    const subjects = ['Toán học', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'Tiếng Anh', 'Tin học'];
    const sub = subjects[i % subjects.length];
    return `Câu ${qNum}: Trong môn ${sub}, phát biểu nào sau đây là định lý hoặc nguyên lý cốt lõi thứ ${qNum}?
A. Phương án giả định thứ nhất (sai lệch nhỏ)
B. Phương án chuẩn xác và tối ưu nhất của bài toán
C. Phương án đảo ngược thứ ba
D. Phương án bổ sung phụ trợ
Đáp án: B`;
  }).join('\n\n'),

  vocab: `Ubiquitous\tCó mặt khắp nơi, phổ biến\tSmartphones are ubiquitous.
Ephemeral\tPhù du, chóng tàn, ngắn ngủi\tEphemeral beauty of cherry blossoms.
Pragmatic\tThực tế, thực dụng\tA pragmatic approach to problem-solving.
Resilient\tKiên cường, phục hồi nhanh\tChildren are remarkably resilient.
Innovate\tĐổi mới, cách tân\tCompanies must innovate to survive.`,
};

export const AiCreateModal: React.FC<AiCreateModalProps> = ({
  isOpen,
  onClose,
  onSaveSet,
  lang,
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'file' | 'text' | 'quizlet'>('file');
  const [inputText, setInputText] = useState('');
  const [targetCount, setTargetCount] = useState<number>(20);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File parsing stats
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Preview stage
  const [previewStage, setPreviewStage] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDesc, setGeneratedDesc] = useState('');
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [previewCards, setPreviewCards] = useState<Card[]>([]);

  // Preview Pagination (for 200 - 300 cards)
  const [previewPage, setPreviewPage] = useState(1);
  const [previewSearch, setPreviewSearch] = useState('');
  const [filterMissingOnly, setFilterMissingOnly] = useState(false);
  const PAGE_SIZE = 15;

  if (!isOpen) return null;

  // Filtered cards for preview
  const filteredPreviewCards = useMemo(() => {
    return previewCards.filter((card) => {
      if (filterMissingOnly && !card.isAiSuggested) return false;
      if (!previewSearch.trim()) return true;
      const q = previewSearch.toLowerCase();
      return card.front.toLowerCase().includes(q) || card.back.toLowerCase().includes(q);
    });
  }, [previewCards, filterMissingOnly, previewSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredPreviewCards.length / PAGE_SIZE));
  const displayedCards = filteredPreviewCards.slice(
    (previewPage - 1) * PAGE_SIZE,
    previewPage * PAGE_SIZE
  );

  // Missing answer count
  const missingCount = useMemo(() => {
    return previewCards.filter((c) => c.isAiSuggested).length;
  }, [previewCards]);

  // Handle direct file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStatus(
      lang === 'vi' ? `Đang phân tích tệp ${file.name}...` : `Analyzing file ${file.name}...`
    );
    setUploadedFileName(file.name);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let parseResult: ParsedExamResult | null = null;

      if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
        const buffer = await file.arrayBuffer();
        parseResult = await parseExcelExam(buffer, file.name);
      } else if (extension === 'docx' || extension === 'doc') {
        const buffer = await file.arrayBuffer();
        parseResult = await parseDocxExam(buffer, file.name);
      } else if (extension === 'pdf') {
        // PDF parser via server-side Gemini multimodal
        setLoadingStatus(
          lang === 'vi'
            ? 'Đang đọc và bóc tách câu hỏi từ tệp PDF...'
            : 'Reading and parsing PDF questions...'
        );
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64 = await base64Promise;
        const res = await fetch('/api/ai/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64, fileName: file.name }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Lỗi khi đọc file PDF.');
        }

        const cards: Card[] = (data.questions || []).map((q: any, idx: number) => {
          const optA = q.options?.[0] || '';
          const optB = q.options?.[1] || '';
          const optC = q.options?.[2] || '';
          const optD = q.options?.[3] || '';
          return {
            id: `c-pdf-${idx}-${Date.now()}`,
            front: `${q.question}\n\nA. ${optA}\nB. ${optB}\nC. ${optC}\nD. ${optD}`,
            back: `Đáp án đúng: ${q.correctLetter || 'A'}. ${q.options?.[q.correctIndex || 0] || optA}`,
            hint: q.explanation || '',
            options: [optA, optB, optC, optD],
            correctIndex: q.correctIndex ?? 0,
            explanation: q.explanation || '',
            isAiSuggested: false,
            isStarred: false,
            createdAt: Date.now(),
          };
        });

        parseResult = {
          title: data.title || file.name.replace(/\.[^/.]+$/, ''),
          totalFound: cards.length,
          cards,
          hasAnswers: true,
          missingAnswerCount: 0,
          formatType: 'txt_regex',
        };
      } else {
        // Plain text, markdown, json
        const text = await file.text();
        parseResult = parseTextExam(text, file.name, 'txt_regex');
      }

      if (parseResult && parseResult.cards.length > 0) {
        setGeneratedTitle(parseResult.title);
        setGeneratedDesc(
          lang === 'vi'
            ? `Bộ câu hỏi trích xuất từ tệp ${file.name} gồm ${parseResult.totalFound} câu hỏi trắc nghiệm.`
            : `Extracted from ${file.name} with ${parseResult.totalFound} questions.`
        );
        setGeneratedSubject('Ôn thi trắc nghiệm');
        setGeneratedTags(['Đề thi', 'Trắc nghiệm', extension?.toUpperCase() || 'File']);
        setPreviewCards(parseResult.cards);
        setPreviewStage(true);
        setPreviewPage(1);
      } else {
        throw new Error(
          lang === 'vi'
            ? 'Không tìm thấy câu hỏi trắc nghiệm nào trong tệp. Vui lòng kiểm tra lại cấu trúc file (cần có Câu 1..., A, B, C, D).'
            : 'No questions found in this file.'
        );
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message ||
          (lang === 'vi'
            ? 'Không thể đọc tệp này. Vui lòng thử tệp khác hoặc dán trực tiếp văn bản.'
            : 'Could not parse file. Please try pasting text.')
      );
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  // Solve missing answers via AI batching
  const handleSolveMissingAnswersWithAi = async () => {
    const missingIndices: number[] = [];
    previewCards.forEach((c, idx) => {
      if (c.isAiSuggested) missingIndices.push(idx);
    });

    if (missingIndices.length === 0) return;

    setIsLoading(true);
    setLoadingStatus(
      lang === 'vi'
        ? `Đang dùng AI giải và kiểm tra ${missingIndices.length} câu thiếu đáp án...`
        : `AI solving ${missingIndices.length} missing answers...`
    );

    try {
      const BATCH_SIZE = 25;
      const updatedCards = [...previewCards];

      for (let i = 0; i < missingIndices.length; i += BATCH_SIZE) {
        const batchIndices = missingIndices.slice(i, i + BATCH_SIZE);
        setLoadingStatus(
          lang === 'vi'
            ? `Đang giải câu ${i + 1} đến ${Math.min(i + BATCH_SIZE, missingIndices.length)} / ${missingIndices.length}...`
            : `Solving ${i + 1} to ${Math.min(i + BATCH_SIZE, missingIndices.length)}...`
        );

        const batchQuestions = batchIndices.map((idx) => {
          const card = previewCards[idx];
          return {
            id: card.id,
            prompt: card.front,
            options: card.options || [],
          };
        });

        const res = await fetch('/api/ai/batch-solve-answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: batchQuestions }),
        });

        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          data.results.forEach((solved: any) => {
            const cardIdx = updatedCards.findIndex((c) => c.id === solved.id);
            if (cardIdx !== -1) {
              const cur = updatedCards[cardIdx];
              const opts = cur.options || [];
              const correctLetter = solved.correctLetter || 'A';
              const correctIdx = solved.correctIndex ?? 0;
              const ansContent = opts[correctIdx] || '';

              updatedCards[cardIdx] = {
                ...cur,
                back: `Đáp án đúng: ${correctLetter}. ${ansContent}${
                  solved.explanation ? `\n\n💡 Giải thích: ${solved.explanation}` : ''
                }`,
                correctIndex: correctIdx,
                explanation: solved.explanation || '',
                isAiSuggested: false,
              };
            }
          });
        }
      }

      setPreviewCards(updatedCards);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(lang === 'vi' ? 'Lỗi khi giải đáp án tự động.' : 'Error solving answers.');
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  // Generate cards from text input (with regex first, then AI fallback)
  const handleGenerate = async () => {
    if (!inputText.trim()) {
      setErrorMsg(
        lang === 'vi'
          ? 'Vui lòng dán câu hỏi hoặc nội dung tài liệu trước khi tạo thẻ.'
          : 'Please paste question or document content before generating.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStatus(lang === 'vi' ? 'Đang phân tích và nhận diện cấu trúc đề thi...' : 'Analyzing exam format...');

    // First attempt: Check if deterministic parser finds multiple questions (handles 200-300 questions instantly!)
    const directParsed = parseTextExam(inputText, 'Bộ đề trắc nghiệm', 'txt_regex');
    if (directParsed.cards.length >= 3) {
      setGeneratedTitle(directParsed.title);
      setGeneratedDesc(
        lang === 'vi'
          ? `Đã nhận diện thành công ${directParsed.totalFound} câu hỏi trắc nghiệm từ văn bản dán vào.`
          : `Extracted ${directParsed.totalFound} questions from pasted text.`
      );
      setGeneratedSubject('Ôn thi');
      setGeneratedTags(['Trắc nghiệm', 'Flashcard']);
      setPreviewCards(directParsed.cards);
      setPreviewStage(true);
      setPreviewPage(1);
      setIsLoading(false);
      return;
    }

    // Otherwise, call AI for unstructured text/document
    try {
      const res = await fetch('/api/ai/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          mode: activeTab === 'text' ? 'raw_text' : 'document',
          targetCount,
          language: lang,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Lỗi server khi tạo thẻ.');
      }

      setGeneratedTitle(data.title || (lang === 'vi' ? 'Bộ thẻ mới' : 'New Flashcard Set'));
      setGeneratedDesc(data.description || '');
      setGeneratedSubject(data.subject || (lang === 'vi' ? 'Kiến thức chung' : 'General'));
      setGeneratedTags(data.tags || []);
      setPreviewCards(
        (data.cards || []).map((c: any, idx: number) => {
          const optA = c.options?.[0] || '';
          const optB = c.options?.[1] || '';
          const optC = c.options?.[2] || '';
          const optD = c.options?.[3] || '';
          const correctIdx = c.correctIndex ?? 0;
          const letter = String.fromCharCode(65 + correctIdx);

          // Format front and back
          const front =
            c.options && c.options.length >= 2
              ? `${c.front}\n\nA. ${optA}\nB. ${optB}\nC. ${optC}\nD. ${optD}`
              : c.front;

          const back =
            c.options && c.options.length >= 2
              ? `Đáp án đúng: ${letter}. ${c.options[correctIdx] || c.back}`
              : c.back;

          return {
            id: `c-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            front,
            back,
            hint: c.hint || '',
            options: c.options || [],
            correctIndex: correctIdx,
            explanation: c.explanation || '',
            isAiSuggested: !!c.isAiSuggested,
            isStarred: false,
            createdAt: Date.now(),
          };
        })
      );

      setPreviewStage(true);
      setPreviewPage(1);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message ||
          (lang === 'vi'
            ? 'Không thể tạo thẻ từ nội dung này. Vui lòng kiểm tra lại kết nối và thử lại.'
            : 'Could not generate cards. Please check connection and try again.')
      );
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const handleSaveToLibrary = () => {
    if (!generatedTitle.trim()) return;

    const finalCards: Card[] = previewCards
      .filter((c) => (c.front || '').trim() && (c.back || '').trim())
      .map((c) => ({
        id: c.id || `c-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        front: c.front.trim(),
        back: c.back.trim(),
        hint: c.hint || '',
        options: c.options || [],
        correctIndex: c.correctIndex ?? 0,
        explanation: c.explanation || '',
        isAiSuggested: c.isAiSuggested || false,
        isStarred: false,
        createdAt: c.createdAt || Date.now(),
      }));

    if (finalCards.length === 0) {
      setErrorMsg(lang === 'vi' ? 'Bộ thẻ phải có ít nhất 1 thẻ hợp lệ.' : 'Must have at least 1 valid card.');
      return;
    }

    const newSet: StudySet = {
      id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: generatedTitle,
      description: generatedDesc,
      subject: generatedSubject,
      tags: generatedTags,
      isPublic: true,
      cards: finalCards,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      authorName: 'Bạn (Me)',
    };

    onSaveSet(newSet);
    onClose();
  };

  const updateCardField = (id: string, field: keyof Card, value: any) => {
    setPreviewCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const removeCard = (id: string) => {
    setPreviewCards((prev) => prev.filter((c) => c.id !== id));
  };

  const addEmptyCard = () => {
    const newCard: Card = {
      id: `c-manual-${Date.now()}`,
      front: 'Câu hỏi mới:\nA. ...\nB. ...\nC. ...\nD. ...',
      back: 'Đáp án đúng: A. ...',
      hint: '',
      isStarred: false,
      createdAt: Date.now(),
    };
    setPreviewCards((prev) => [newCard, ...prev]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white flex items-center gap-2">
                {previewStage ? t.previewTitle : lang === 'vi' ? 'Tự Động Tạo Quiz Từ Tệp & Đề Thi' : 'Create Quiz from File'}
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {lang === 'vi' ? 'Hỗ trợ 200 - 300 câu' : 'Supports 200-300 Qs'}
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {previewStage
                  ? lang === 'vi'
                    ? `Kiểm tra ${previewCards.length} câu hỏi. Mặt trước: câu hỏi & 4 phương án, mặt sau: đáp án đúng.`
                    : `Reviewing ${previewCards.length} questions.`
                  : lang === 'vi'
                  ? 'Chỉ cần đẩy tệp Word (.docx), Excel (.xlsx), PDF hoặc dán văn bản: hệ thống tự động bóc tách từng câu không bỏ sót.'
                  : 'Upload Word, Excel, PDF or paste raw exam text.'}
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* LOADING STATE OVERLAY */}
          {isLoading && (
            <div className="p-8 rounded-3xl bg-indigo-50/80 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 text-center space-y-4 animate-pulse">
              <RefreshCw className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
              <div>
                <h4 className="font-extrabold text-base sm:text-lg text-indigo-900 dark:text-indigo-200">
                  {loadingStatus || (lang === 'vi' ? 'Đang xử lý dữ liệu câu hỏi...' : 'Processing questions...')}
                </h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                  {lang === 'vi'
                    ? 'Hệ thống đang bóc tách từng câu hỏi, kiểm tra bảng đáp án và định dạng mặt trước / mặt sau.'
                    : 'Extracting all questions and mapping answer keys accurately.'}
                </p>
              </div>
            </div>
          )}

          {!previewStage ? (
            <>
              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <button
                  onClick={() => setActiveTab('file')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 ${
                    activeTab === 'file'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{lang === 'vi' ? 'Tải tệp lên (Word, Excel, PDF, TXT)' : 'Upload File (.docx, .xlsx, .pdf)'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 ${
                    activeTab === 'text'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>{lang === 'vi' ? 'Dán đề thi dạng văn bản' : 'Paste Exam Text'}</span>
                </button>
              </div>

              {/* TAB 1: FILE UPLOAD ZONE */}
              {activeTab === 'file' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 rounded-3xl p-8 sm:p-12 text-center transition bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4 shadow-sm">
                      <UploadCloud className="w-8 h-8" />
                    </div>

                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1">
                      {lang === 'vi'
                        ? 'Kéo & thả tệp đề thi hoặc nhấp để chọn tệp'
                        : 'Drag & drop your exam file or click to browse'}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-6 leading-relaxed">
                      {lang === 'vi'
                        ? 'Hỗ trợ: Word (.docx), Excel (.xlsx, .xls), PDF (.pdf), CSV, Text (.txt). Nhận diện đầy đủ từ 10 đến 300 câu hỏi, tự động ghép bảng đáp án ở cuối đề!'
                        : 'Supports .docx, .xlsx, .pdf, .csv, .txt. Accurately handles 10 to 300+ questions.'}
                    </p>

                    <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-indigo-500/25 transition active:scale-95">
                      <FileCheck className="w-4 h-4" />
                      <span>{lang === 'vi' ? 'Chọn tệp từ thiết bị của bạn' : 'Browse File from Device'}</span>
                      <input
                        type="file"
                        accept=".docx,.doc,.xlsx,.xls,.csv,.pdf,.txt,.md"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Format notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-extrabold text-indigo-600 block flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Word (.docx) & Text
                      </span>
                      <p className="text-slate-500 text-[11px]">
                        {lang === 'vi'
                          ? 'Dạng Câu 1... A. B. C. D. Có thể để đáp án ngay sau câu hoặc để bảng đáp án ở cuối đề.'
                          : 'Standard exam format with inline answers or end-of-file answer table.'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-extrabold text-emerald-600 block flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel (.xlsx) & CSV
                      </span>
                      <p className="text-slate-500 text-[11px]">
                        {lang === 'vi'
                          ? 'Cột: Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | Đáp án đúng.'
                          : 'Columns: Question, Option A, B, C, D, and Correct Answer.'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="font-extrabold text-purple-600 block flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> Tốc độ & Độ chuẩn xác
                      </span>
                      <p className="text-slate-500 text-[11px]">
                        {lang === 'vi'
                          ? 'Xử lý mượt mà tệp 200 - 300 câu hỏi trong tích tắc, không bị giới hạn token.'
                          : 'High-speed processing up to 300 questions without missing any question.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PASTE TEXT */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  {/* Quick samples */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">
                      {lang === 'vi' ? 'Thử nhanh bộ mẫu:' : 'Try samples:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setInputText(SAMPLE_INPUTS.exam)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-indigo-600 dark:text-indigo-400 font-semibold transition"
                    >
                      {lang === 'vi' ? 'Đề thi 5 câu mẫu' : '5 Sample Questions'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputText(SAMPLE_INPUTS.largeExamDemo)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-indigo-600 dark:text-indigo-400 font-semibold transition"
                    >
                      {lang === 'vi' ? 'Đề thi 50 câu mẫu' : '50 Sample Questions'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      rows={10}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={
                        lang === 'vi'
                          ? `Dán toàn bộ đề thi vào đây (có thể lên tới 200 - 300 câu). Ví dụ:
Câu 1: Thủ đô nước ta là gì?
A. TP HCM
B. Hà Nội
C. Đà Nẵng
D. Cần Thơ
Đáp án: B

Hoặc để bảng đáp án ở cuối đề:
1.B  2.C  3.A  4.D ...`
                          : 'Paste exam questions here...'
                      }
                      className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 font-mono resize-none"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{inputText.length} ký tự</span>
                      <span>Hệ thống tự động phát hiện Câu 1... A. B. C. D. và Bảng đáp án</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || !inputText.trim()}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-500/25 transition disabled:opacity-40 flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>{lang === 'vi' ? 'Bóc Tách & Tạo Bộ Flashcard' : 'Parse & Generate Set'}</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* PREVIEW STAGE FOR 200 - 300 QUESTIONS */
            <div className="space-y-6">
              {/* Banner summary */}
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 font-black text-sm sm:text-base text-indigo-900 dark:text-indigo-200">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>
                      {lang === 'vi'
                        ? `Đã nhận diện thành công ${previewCards.length} câu hỏi!`
                        : `Successfully extracted ${previewCards.length} questions!`}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
                    {lang === 'vi'
                      ? 'Mỗi thẻ có Mặt trước (câu hỏi & 4 lựa chọn A B C D) và Mặt sau (đáp án đúng chuẩn xác).'
                      : 'Each card has Front (Question + 4 options) and Back (Correct Answer).'}
                  </p>
                </div>

                {missingCount > 0 && (
                  <button
                    type="button"
                    onClick={handleSolveMissingAnswersWithAi}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 shrink-0"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{lang === 'vi' ? `AI giải ${missingCount} câu thiếu đáp án` : `Solve ${missingCount} with AI`}</span>
                  </button>
                )}
              </div>

              {/* Set Title & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {lang === 'vi' ? 'Tiêu đề bộ thẻ' : 'Set Title'}
                  </label>
                  <input
                    type="text"
                    value={generatedTitle}
                    onChange={(e) => setGeneratedTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {lang === 'vi' ? 'Chủ đề / Môn học' : 'Subject'}
                  </label>
                  <input
                    type="text"
                    value={generatedSubject}
                    onChange={(e) => setGeneratedSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={previewSearch}
                      onChange={(e) => {
                        setPreviewSearch(e.target.value);
                        setPreviewPage(1);
                      }}
                      placeholder={lang === 'vi' ? 'Tìm nhanh trong các câu...' : 'Search in cards...'}
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-indigo-500"
                    />
                  </div>

                  {missingCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMissingOnly(!filterMissingOnly)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                        filterMissingOnly
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {lang === 'vi' ? `Chỉ xem ${missingCount} câu chưa có đáp án` : 'Missing only'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={addEmptyCard}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addCard}</span>
                  </button>

                  {/* Pagination control */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <button
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      disabled={previewPage <= 1}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>
                      {previewPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                      disabled={previewPage >= totalPages}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Cards List Display (Paginated for high speed) */}
              <div className="space-y-4">
                {displayedCards.map((card, idx) => {
                  const actualIndex = (previewPage - 1) * PAGE_SIZE + idx;

                  return (
                    <div
                      key={card.id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center">
                            {actualIndex + 1}
                          </span>
                          {card.isAiSuggested ? (
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" />
                              <span>{lang === 'vi' ? 'Chưa xác định đáp án đúng' : 'Missing Answer'}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>{lang === 'vi' ? 'Đã có đáp án đúng' : 'Answer Verified'}</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCard(card.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Front: Question + 4 Options */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                            {lang === 'vi' ? 'Mặt trước (Câu hỏi & 4 lựa chọn)' : 'Front (Question & Options)'}
                          </label>
                          <textarea
                            rows={5}
                            value={card.front}
                            onChange={(e) => updateCardField(card.id, 'front', e.target.value)}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
                          />
                        </div>

                        {/* Back: Correct Answer */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            {lang === 'vi' ? 'Mặt sau (Đáp án đúng)' : 'Back (Correct Answer)'}
                          </label>
                          <textarea
                            rows={5}
                            value={card.back}
                            onChange={(e) => updateCardField(card.id, 'back', e.target.value)}
                            className="w-full p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200 outline-none focus:border-emerald-500 resize-none font-sans leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                    disabled={previewPage <= 1}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-30"
                  >
                    {lang === 'vi' ? 'Trang trước' : 'Previous'}
                  </button>
                  <span className="text-xs font-bold text-slate-500 px-3">
                    {previewPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                    disabled={previewPage >= totalPages}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold disabled:opacity-30"
                  >
                    {lang === 'vi' ? 'Trang sau' : 'Next'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60">
          {previewStage ? (
            <>
              <button
                type="button"
                onClick={() => setPreviewStage(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 transition"
              >
                {lang === 'vi' ? 'Tải tệp khác' : 'Upload Another File'}
              </button>

              <button
                type="button"
                onClick={handleSaveToLibrary}
                className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-500/25 transition active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{lang === 'vi' ? `Lưu Bộ Thẻ (${previewCards.length} câu)` : `Save Set (${previewCards.length} Qs)`}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 transition"
            >
              {t.cancel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
