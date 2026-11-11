import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { Card } from '../types';

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
function cleanLine(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

/**
 * Extracts external Answer Sheet table (e.g., "1.A 2.B 3.C" or "1-A, 2-B, 3-C" or "BẢNG ĐÁP ÁN:")
 */
export function extractAnswerSheet(fullText: string): Map<number, string> {
  const answerMap = new Map<number, string>();

  // Look for section titled "BẢNG ĐÁP ÁN" or "ĐÁP ÁN" or "ANSWER KEY"
  const answerSheetRegex = /(?:bảng\s*đáp\s*án|đáp\s*án|answer\s*key|hướng\s*dẫn\s*chấm)[\s\S]*$/i;
  const match = fullText.match(answerSheetRegex);
  const searchArea = match ? match[0] : fullText;

  // Pattern: 1.A, 1-A, 1:A, 1A, Câu 1: A, Câu 1. A
  const itemRegex = /(?:câu\s*)?(\d+)[\s.:-]*\s*([A-D])/gi;
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

  if (rows.length === 0) {
    throw new Error('Tệp Excel không có dữ liệu.');
  }

  // Detect header row or column indices
  let qCol = -1;
  let aCol = -1;
  let bCol = -1;
  let cCol = -1;
  let dCol = -1;
  let ansCol = -1;
  let explainCol = -1;

  let startRowIdx = 0;

  // Scan first 5 rows for header names
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    row.forEach((cell, colIdx) => {
      const val = String(cell || '').toLowerCase().trim();
      if (val.includes('câu hỏi') || val.includes('nội dung') || val.includes('question')) {
        qCol = colIdx;
        startRowIdx = r + 1;
      } else if (val === 'a' || val.includes('đáp án a') || val.includes('lựa chọn a') || val.includes('option a')) {
        aCol = colIdx;
      } else if (val === 'b' || val.includes('đáp án b') || val.includes('lựa chọn b') || val.includes('option b')) {
        bCol = colIdx;
      } else if (val === 'c' || val.includes('đáp án c') || val.includes('lựa chọn c') || val.includes('option c')) {
        cCol = colIdx;
      } else if (val === 'd' || val.includes('đáp án d') || val.includes('lựa chọn d') || val.includes('option d')) {
        dCol = colIdx;
      } else if (val.includes('đáp án đúng') || val.includes('đáp án') || val.includes('answer') || val.includes('key')) {
        ansCol = colIdx;
      } else if (val.includes('giải thích') || val.includes('explanation')) {
        explainCol = colIdx;
      }
    });

    if (qCol !== -1) break;
  }

  // If no explicit header names found, assume default column order: Col 0: Question, 1: A, 2: B, 3: C, 4: D, 5: Answer
  if (qCol === -1) {
    qCol = 0;
    aCol = 1;
    bCol = 2;
    cCol = 3;
    dCol = 4;
    ansCol = 5;
    startRowIdx = typeof rows[0]?.[0] === 'string' && rows[0][0].toLowerCase().includes('câu') ? 0 : 1;
  }

  const cards: Card[] = [];
  let missingAnswerCount = 0;

  for (let i = startRowIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const questionText = cleanLine(String(row[qCol] || ''));
    if (!questionText) continue;

    const optA = cleanLine(String(row[aCol] || ''));
    const optB = cleanLine(String(row[bCol] || ''));
    const optC = cleanLine(String(row[cCol] || ''));
    const optD = cleanLine(String(row[dCol] || ''));

    const rawAns = cleanLine(String(row[ansCol] || '')).toUpperCase();
    const explanation = explainCol !== -1 ? cleanLine(String(row[explainCol] || '')) : '';

    const options = [optA, optB, optC, optD].filter(Boolean);

    // Determine correct option
    let correctIndex = -1;
    let correctLetter = 'A';

    if (rawAns.includes('A') || rawAns === optA.toUpperCase()) {
      correctIndex = 0;
      correctLetter = 'A';
    } else if (rawAns.includes('B') || rawAns === optB.toUpperCase()) {
      correctIndex = 1;
      correctLetter = 'B';
    } else if (rawAns.includes('C') || rawAns === optC.toUpperCase()) {
      correctIndex = 2;
      correctLetter = 'C';
    } else if (rawAns.includes('D') || rawAns === optD.toUpperCase()) {
      correctIndex = 3;
      correctLetter = 'D';
    }

    const isMissing = correctIndex === -1;
    if (isMissing) {
      missingAnswerCount += 1;
      correctIndex = 0; // fallback
    }

    const correctText = options[correctIndex] || optA || '';

    // Build Front: Question + 4 Options clearly formatted
    const frontFormatted = `${questionText}\n\nA. ${optA}\nB. ${optB}\nC. ${optC}\nD. ${optD}`;

    // Build Back: Correct Answer
    const backFormatted = `Đáp án đúng: ${correctLetter}. ${correctText}${
      explanation ? `\n\n💡 Giải thích: ${explanation}` : ''
    }`;

    cards.push({
      id: `c-excel-${i}-${Date.now()}`,
      front: frontFormatted,
      back: backFormatted,
      hint: explanation ? `Xem giải thích: ${explanation.slice(0, 80)}...` : '',
      options: [optA, optB, optC, optD],
      correctIndex,
      explanation,
      isAiSuggested: isMissing,
      isStarred: false,
      createdAt: Date.now(),
    });
  }

  const title = fileName.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');

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
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value;
  return parseTextExam(rawText, fileName, 'docx');
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

  // 1. Check for answer sheet table at end of file
  const answerSheetMap = extractAnswerSheet(normalizedText);

  // 2. Identify question boundaries
  // Matches "Câu 1:", "Câu 1.", "Bài 1:", "Question 1:", or "1." at beginning of lines
  const questionSplitter = /(?:^|\n)(?=(?:câu|bài|question)\s*\d+[:.]|\d+[\.\)])/i;
  const rawChunks = normalizedText.split(questionSplitter).map((c) => c.trim()).filter(Boolean);

  const cards: Card[] = [];
  let missingCount = 0;

  rawChunks.forEach((chunk, index) => {
    // Check if this chunk is just an answer table header
    if (/^(?:bảng\s*đáp\s*án|answer\s*key|hướng\s*dẫn\s*chấm)/i.test(chunk)) {
      return;
    }

    // Extract Question Number (e.g. Câu 1 -> 1)
    const qNumMatch = chunk.match(/^(?:câu|bài|question)?\s*(\d+)[:.]/i);
    const qNum = qNumMatch ? parseInt(qNumMatch[1], 10) : index + 1;

    // Remove the leading "Câu 1:" prefix from question prompt
    let body = chunk.replace(/^(?:câu|bài|question)?\s*\d+[:.]\s*/i, '').trim();

    // Look for inline answer notation: "Đáp án: A", "Đ/A: B", "Answer: C", "Key: D", "ĐA: A"
    let correctLetter = '';
    const inlineAnsMatch = body.match(/(?:đáp\s*án|đ\/a|answer|key|đa)[:\s]*([A-D])/i);
    if (inlineAnsMatch) {
      correctLetter = inlineAnsMatch[1].toUpperCase();
      // Remove inline answer line from body so it doesn't clutter front
      body = body.replace(/(?:đáp\s*án|đ\/a|answer|key|đa)[:\s]*[A-D][^\n]*/i, '').trim();
    }

    // If no inline answer found, check the extracted answer table sheet!
    if (!correctLetter && answerSheetMap.has(qNum)) {
      correctLetter = answerSheetMap.get(qNum)!;
    }

    // Look for options A, B, C, D
    // Handles options on newlines OR options on same line (e.g. "A. abc   B. def   C. ghi   D. jkl")
    const optRegex = /(?:^|\s|\n)([A-D])[\.\)]\s*([\s\S]*?)(?=(?:(?:^|\s|\n)[A-D][\.\)])|$)/g;
    const foundOptions: { letter: string; text: string }[] = [];

    // Check if options are present
    const optMatches = [...body.matchAll(/(?:^|\n|\s{2,})([A-D])[\.\)]\s*([^\n]+)/g)];

    let questionPrompt = body;
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';

    if (optMatches.length >= 2) {
      // Find where options start
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
      // Fallback: line-by-line inspection
      const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
      const qLines: string[] = [];
      lines.forEach((l) => {
        if (/^A[\.\)]\s*/i.test(l)) optA = l.replace(/^A[\.\)]\s*/i, '');
        else if (/^B[\.\)]\s*/i.test(l)) optB = l.replace(/^B[\.\)]\s*/i, '');
        else if (/^C[\.\)]\s*/i.test(l)) optC = l.replace(/^C[\.\)]\s*/i, '');
        else if (/^D[\.\)]\s*/i.test(l)) optD = l.replace(/^D[\.\)]\s*/i, '');
        else if (!optA && !optB && !optC && !optD) qLines.push(l);
      });
      if (qLines.length > 0) {
        questionPrompt = qLines.join(' ');
      }
    }

    // Check for marked answer in options (e.g. "*A. ...", "(A). ...", or "[x] A")
    if (!correctLetter) {
      if (body.includes('*A') || body.includes('(A)') || body.includes('A (đúng)')) correctLetter = 'A';
      else if (body.includes('*B') || body.includes('(B)') || body.includes('B (đúng)')) correctLetter = 'B';
      else if (body.includes('*C') || body.includes('(C)') || body.includes('C (đúng)')) correctLetter = 'C';
      else if (body.includes('*D') || body.includes('(D)') || body.includes('D (đúng)')) correctLetter = 'D';
    }

    const options = [optA, optB, optC, optD].filter(Boolean);

    // Map correctLetter to index
    let correctIndex = -1;
    if (correctLetter === 'A') correctIndex = 0;
    else if (correctLetter === 'B') correctIndex = 1;
    else if (correctLetter === 'C') correctIndex = 2;
    else if (correctLetter === 'D') correctIndex = 3;

    const isMissing = correctIndex === -1;
    if (isMissing) {
      missingCount += 1;
      correctIndex = 0; // Default until AI or user confirms
      correctLetter = 'A';
    }

    const correctContent = options[correctIndex] || optA || '';

    // Requirement:
    // "1 mặt là câu hỏi và 4 đáp án, 1 mặt là đáp án đúng"
    const front = `Câu ${qNum}: ${questionPrompt}${
      options.length > 0
        ? `\n\nA. ${optA || '...'}\nB. ${optB || '...'}\nC. ${optC || '...'}\nD. ${optD || '...'}`
        : ''
    }`;

    const back = `Đáp án đúng: ${correctLetter}. ${correctContent}`;

    cards.push({
      id: `c-txt-${index}-${Date.now()}`,
      front,
      back,
      hint: `Đáp án bắt đầu bằng chữ cái ${correctLetter}`,
      options: options.length >= 2 ? [optA, optB, optC, optD] : undefined,
      correctIndex,
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
    title,
    totalFound: cards.length,
    cards,
    hasAnswers: missingCount < cards.length,
    missingAnswerCount: missingCount,
    formatType,
  };
}
