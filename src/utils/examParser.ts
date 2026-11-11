import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { Card } from '../types/index';

export interface ParsedExamResult {
  title: string;
  totalFound: number;
  cards: Card[];
  hasAnswers: boolean;
  missingAnswerCount: number;
  formatType: 'excel' | 'docx' | 'txt_regex' | 'quizlet' | 'json';
}

/**
 * Clean and normalize text
 */
export function cleanLine(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

/**
 * Extracts external Answer Sheet table (e.g., "1.A 2.B 3.C" or "1-A, 2-B, 3-C" or "BẢNG ĐÁP ÁN:")
 */
export function extractAnswerSheet(fullText: string): Map<number, string> {
  const answerMap = new Map<number, string>();
  if (!fullText) return answerMap;

  // Look for section titled "BẢNG ĐÁP ÁN" or "ĐÁP ÁN" or "ANSWER KEY"
  const answerSheetRegex = /(?:bảng\s*đáp\s*án|bảng\s*chấm|đáp\s*án|answer\s*key|hướng\s*dẫn\s*chấm)[\s\S]*$/i;
  const match = fullText.match(answerSheetRegex);
  const searchArea = match ? match[0] : fullText;

  // Pattern: 1.A, 1-A, 1:A, 1A, Câu 1: A, Câu 1. A, 1) A
  const itemRegex = /(?:câu\s*)?(\d+)[\s.:\)\/-]*\s*([A-D])/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(searchArea)) !== null) {
    const qNum = parseInt(m[1], 10);
    const ansLetter = m[2].toUpperCase();
    if (qNum > 0 && !answerMap.has(qNum)) {
      answerMap.set(qNum, ansLetter);
    }
  }

  return answerMap;
}

/**
 * Parse an Excel (.xlsx, .xls) or CSV workbook
 */
export async function parseExcelExam(fileBuffer: ArrayBuffer, fileName: string): Promise<ParsedExamResult> {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!rows || rows.length === 0) {
    throw new Error('Tệp Excel không có dữ liệu.');
  }

  // Detect column mapping
  let qCol = -1;
  let aCol = -1;
  let bCol = -1;
  let cCol = -1;
  let dCol = -1;
  let ansCol = -1;
  let explainCol = -1;

  let startRowIdx = 0;

  // Check header in first 3 rows
  for (let r = 0; r < Math.min(3, rows.length); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    row.forEach((cell, colIdx) => {
      const val = cleanLine(cell).toLowerCase();
      if (val.includes('câu hỏi') || val.includes('nội dung') || val.includes('question') || val.includes('thuật ngữ')) {
        qCol = colIdx;
        startRowIdx = r + 1;
      } else if (val === 'a' || val.includes('đáp án a') || val.includes('option a') || val.includes('lựa chọn a')) {
        aCol = colIdx;
      } else if (val === 'b' || val.includes('đáp án b') || val.includes('option b') || val.includes('lựa chọn b')) {
        bCol = colIdx;
      } else if (val === 'c' || val.includes('đáp án c') || val.includes('option c') || val.includes('lựa chọn c')) {
        cCol = colIdx;
      } else if (val === 'd' || val.includes('đáp án d') || val.includes('option d') || val.includes('lựa chọn d')) {
        dCol = colIdx;
      } else if (val.includes('đáp án đúng') || val === 'đáp án' || val.includes('answer') || val.includes('định nghĩa')) {
        ansCol = colIdx;
      } else if (val.includes('giải thích') || val.includes('explanation')) {
        explainCol = colIdx;
      }
    });

    if (qCol !== -1) break;
  }

  // Fallback default column layout
  if (qCol === -1) {
    qCol = 0;
    // Check if 2-column vocabulary sheet
    const maxCols = Math.max(...rows.slice(0, 5).map((r) => r?.length || 0));
    if (maxCols <= 3) {
      ansCol = 1;
    } else {
      aCol = 1;
      bCol = 2;
      cCol = 3;
      dCol = 4;
      ansCol = 5;
    }
    const firstCell = cleanLine(rows[0]?.[0]).toLowerCase();
    startRowIdx = firstCell.includes('câu') || firstCell.includes('question') || firstCell.length > 30 ? 0 : 1;
  }

  const cards: Card[] = [];
  let missingAnswerCount = 0;

  for (let i = startRowIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const questionText = cleanLine(row[qCol]);
    if (!questionText) continue;

    const optA = aCol !== -1 ? cleanLine(row[aCol]) : '';
    const optB = bCol !== -1 ? cleanLine(row[bCol]) : '';
    const optC = cCol !== -1 ? cleanLine(row[cCol]) : '';
    const optD = dCol !== -1 ? cleanLine(row[dCol]) : '';

    const rawAns = ansCol !== -1 ? cleanLine(row[ansCol]) : '';
    const explanation = explainCol !== -1 ? cleanLine(row[explainCol]) : '';

    const options = [optA, optB, optC, optD].filter(Boolean);

    let frontFormatted = '';
    let backFormatted = '';
    let correctIndex = -1;
    let isMissing = false;

    if (options.length >= 2) {
      // Multiple choice mode
      const rawAnsUpper = rawAns.toUpperCase();
      let correctLetter = 'A';
      if (rawAnsUpper.includes('A') || (optA && rawAnsUpper === optA.toUpperCase())) {
        correctIndex = 0;
        correctLetter = 'A';
      } else if (rawAnsUpper.includes('B') || (optB && rawAnsUpper === optB.toUpperCase())) {
        correctIndex = 1;
        correctLetter = 'B';
      } else if (rawAnsUpper.includes('C') || (optC && rawAnsUpper === optC.toUpperCase())) {
        correctIndex = 2;
        correctLetter = 'C';
      } else if (rawAnsUpper.includes('D') || (optD && rawAnsUpper === optD.toUpperCase())) {
        correctIndex = 3;
        correctLetter = 'D';
      } else {
        isMissing = true;
        missingAnswerCount += 1;
        correctIndex = 0;
        correctLetter = 'A';
      }

      const correctContent = options[correctIndex] || optA || '';
      frontFormatted = `${questionText}\n\nA. ${optA || '...'}\nB. ${optB || '...'}\nC. ${optC || '...'}\nD. ${optD || '...'}`;
      backFormatted = `Đáp án đúng: ${correctLetter}. ${correctContent}${
        explanation ? `\n\n💡 Giải thích: ${explanation}` : ''
      }`;
    } else {
      // 2-column Q&A mode
      frontFormatted = questionText;
      backFormatted = rawAns || 'Đáp án';
      correctIndex = 0;
    }

    cards.push({
      id: `c-excel-${i}-${Date.now()}`,
      front: frontFormatted,
      back: backFormatted,
      hint: explanation ? `Gợi ý: ${explanation.slice(0, 80)}...` : '',
      options: options.length >= 2 ? [optA, optB, optC, optD] : undefined,
      correctIndex,
      explanation,
      isAiSuggested: isMissing,
      isStarred: false,
      createdAt: Date.now(),
    });
  }

  const title = (fileName || 'Bộ đề thi trắc nghiệm')
    .replace(/\.[^/.]+$/, '')
    .replace(/[_\\-]/g, ' ');

  return {
    title: title || 'Bộ đề thi trắc nghiệm',
    totalFound: cards.length,
    cards,
    hasAnswers: missingAnswerCount < cards.length,
    missingAnswerCount,
    formatType: 'excel',
  };
}

/**
 * Parse Word Document (.docx)
 */
export async function parseDocxExam(arrayBuffer: ArrayBuffer, fileName: string): Promise<ParsedExamResult> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    const rawText = result.value || '';
    if (!rawText.trim()) {
      throw new Error('Tệp Word trống hoặc không có nội dung chữ.');
    }
    return parseTextExam(rawText, fileName, 'docx');
  } catch (err: any) {
    console.warn('Browser mammoth parse error:', err);
    throw err;
  }
}

/**
 * Universal Text / Word / Exam Parser
 * Supports 200 - 300+ questions reliably
 */
export function parseTextExam(
  rawText: string,
  fileName: string,
  formatType: 'docx' | 'txt_regex' | 'quizlet' = 'txt_regex'
): ParsedExamResult {
  const normalizedText = cleanLine(rawText);
  if (!normalizedText) {
    return {
      title: fileName || 'Bộ thẻ mới',
      totalFound: 0,
      cards: [],
      hasAnswers: false,
      missingAnswerCount: 0,
      formatType,
    };
  }

  // 1. Check for answer sheet table at end of file
  const answerSheetMap = extractAnswerSheet(normalizedText);

  // 2. Identify question boundaries
  // Matches "Câu 1:", "Câu 1.", "Câu 1 -", "Bài 1:", "Question 1:", or "1.", "1)", "1/"
  const questionSplitter = /(?:^|\n)(?=(?:câu|bài|question|câu\s*hỏi)\s*\d+[\s:.-]|\d+[\.\)\/:\-]\s*)/i;
  let rawChunks = normalizedText.split(questionSplitter).map((c) => c.trim()).filter(Boolean);

  // Fallback 1: If questionSplitter didn't find multiple chunks, try double newlines
  if (rawChunks.length <= 1) {
    const paragraphChunks = normalizedText.split(/\n\s*\n+/).map((c) => c.trim()).filter(Boolean);
    if (paragraphChunks.length > 1) {
      rawChunks = paragraphChunks;
    }
  }

  // Fallback 2: Tab-separated or Quizlet format (Term \t Definition)
  if (rawChunks.length <= 1 && normalizedText.includes('\t')) {
    const lines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean);
    const quizletCards: Card[] = [];
    lines.forEach((line, idx) => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        quizletCards.push({
          id: `c-qz-${idx}-${Date.now()}`,
          front: parts[0].trim(),
          back: parts.slice(1).join('\n').trim(),
          hint: '',
          isStarred: false,
          createdAt: Date.now(),
        });
      }
    });

    if (quizletCards.length > 0) {
      return {
        title: (fileName || 'Bộ thẻ từ vựng').replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' '),
        totalFound: quizletCards.length,
        cards: quizletCards,
        hasAnswers: true,
        missingAnswerCount: 0,
        formatType: 'quizlet',
      };
    }
  }

  const cards: Card[] = [];
  let missingCount = 0;

  rawChunks.forEach((chunk, index) => {
    // Check if this chunk is just an answer table header
    if (/^(?:bảng\s*đáp\s*án|answer\s*key|hướng\s*dẫn\s*chấm)/i.test(chunk)) {
      return;
    }

    // Extract Question Number (e.g. Câu 1 -> 1)
    const qNumMatch = chunk.match(/^(?:câu|bài|question|câu\s*hỏi)?\s*(\d+)[\s:.-]/i);
    const qNum = qNumMatch ? parseInt(qNumMatch[1], 10) : index + 1;

    // Remove the leading "Câu 1:" prefix from question prompt
    let body = chunk.replace(/^(?:câu|bài|question|câu\s*hỏi)?\s*\d+[\s:.-]\s*/i, '').trim();
    if (!body) body = chunk;

    // Look for inline answer notation: "Đáp án: A", "Đ/A: B", "Answer: C", "Key: D", "ĐA: A", "Đáp án đúng: A"
    let correctLetter = '';
    const inlineAnsMatch = body.match(/(?:đáp\s*án\s*đúng|đáp\s*án|đ\/a|answer|key|đa)[:\s]*([A-D])/i);
    if (inlineAnsMatch) {
      correctLetter = inlineAnsMatch[1].toUpperCase();
      body = body.replace(/(?:đáp\s*án\s*đúng|đáp\s*án|đ\/a|answer|key|đa)[:\s]*[A-D][^\n]*/i, '').trim();
    }

    // If no inline answer found, check the extracted answer table sheet
    if (!correctLetter && answerSheetMap.has(qNum)) {
      correctLetter = answerSheetMap.get(qNum)!;
    }

    // Check for marked answer in options (e.g. "*A. ...", "(A). ...", or "[x] A")
    if (!correctLetter) {
      if (body.includes('*A') || body.includes('(A)') || body.includes('[A]') || body.includes('A (đúng)')) correctLetter = 'A';
      else if (body.includes('*B') || body.includes('(B)') || body.includes('[B]') || body.includes('B (đúng)')) correctLetter = 'B';
      else if (body.includes('*C') || body.includes('(C)') || body.includes('[C]') || body.includes('C (đúng)')) correctLetter = 'C';
      else if (body.includes('*D') || body.includes('(D)') || body.includes('[D]') || body.includes('D (đúng)')) correctLetter = 'D';
    }

    // Extract options A, B, C, D
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';
    let questionPrompt = body;

    const optMatches = [...body.matchAll(/(?:^|\n|\s{2,})([A-D])[\.\)]\s*([^\n]+)/g)];
    if (optMatches.length >= 2) {
      const firstOptIndex = body.search(/(?:^|\n|\s{2,})[A-D][\.\)]/);
      if (firstOptIndex !== -1) {
        questionPrompt = body.slice(0, firstOptIndex).trim();
      }

      optMatches.forEach((m) => {
        const letter = m[1].toUpperCase();
        const text = m[2].trim();
        if (letter === 'A') optA = text;
        else if (letter === 'B') optB = text;
        else if (letter === 'C') optC = text;
        else if (letter === 'D') optD = text;
      });
    } else {
      // Line-by-line fallback
      const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
      const qLines: string[] = [];
      lines.forEach((l) => {
        if (/^A[\.\)]\s*/i.test(l)) optA = l.replace(/^A[\.\)]\s*/i, '').trim();
        else if (/^B[\.\)]\s*/i.test(l)) optB = l.replace(/^B[\.\)]\s*/i, '').trim();
        else if (/^C[\.\)]\s*/i.test(l)) optC = l.replace(/^C[\.\)]\s*/i, '').trim();
        else if (/^D[\.\)]\s*/i.test(l)) optD = l.replace(/^D[\.\)]\s*/i, '').trim();
        else if (!optA && !optB && !optC && !optD) qLines.push(l);
      });
      if (qLines.length > 0) {
        questionPrompt = qLines.join(' ');
      }
    }

    const options = [optA, optB, optC, optD].filter(Boolean);

    // Map correctLetter to index
    let correctIndex = -1;
    if (correctLetter === 'A') correctIndex = 0;
    else if (correctLetter === 'B') correctIndex = 1;
    else if (correctLetter === 'C') correctIndex = 2;
    else if (correctLetter === 'D') correctIndex = 3;

    const isMissing = correctIndex === -1 && options.length >= 2;
    if (isMissing) {
      missingCount += 1;
      correctIndex = 0;
      correctLetter = 'A';
    }

    let front = '';
    let back = '';

    if (options.length >= 2) {
      const correctContent = options[correctIndex] || optA || '';
      front = `Câu ${qNum}: ${questionPrompt || 'Nội dung câu hỏi'}\n\nA. ${optA || '...'}\nB. ${optB || '...'}\nC. ${optC || '...'}\nD. ${optD || '...'}`;
      back = `Đáp án đúng: ${correctLetter || 'A'}. ${correctContent}`;
    } else {
      // Simple Q&A card
      front = questionPrompt || `Câu hỏi ${qNum}`;
      back = correctLetter ? `Đáp án: ${correctLetter}` : 'Xem chi tiết câu hỏi';
    }

    cards.push({
      id: `c-txt-${index}-${Date.now()}`,
      front: front || 'Câu hỏi',
      back: back || 'Đáp án',
      hint: correctLetter ? `Đáp án là phương án ${correctLetter}` : '',
      options: options.length >= 2 ? [optA, optB, optC, optD] : undefined,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      explanation: isMissing ? 'AI gợi ý - cần kiểm tra' : undefined,
      isAiSuggested: isMissing,
      isStarred: false,
      createdAt: Date.now(),
    });
  });

  const title = (fileName || 'Bộ câu hỏi thi trắc nghiệm')
    .replace(/\.[^/.]+$/, '')
    .replace(/[_\\-]/g, ' ');

  return {
    title: title || 'Bộ đề thi trắc nghiệm',
    totalFound: cards.length,
    cards,
    hasAnswers: missingCount < cards.length,
    missingAnswerCount: missingCount,
    formatType,
  };
}
