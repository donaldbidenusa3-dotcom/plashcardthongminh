import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Persistent User Data Storage (Linked with Google Account)
const DATA_DIR = path.resolve(__dirname, 'data', 'users');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getSafeUserFilePath(uid: string) {
  const safeId = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safeId}.json`);
}

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MODEL_NAME = 'gemini-3.8-flash';

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Load persistent data for Google Account
app.get('/api/user-data/:uid', (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: 'Thiếu UID người dùng.' });
    const filePath = getSafeUserFilePath(uid);
    if (!fs.existsSync(filePath)) {
      return res.json({ found: false, data: null });
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return res.json({ found: true, data: parsed });
  } catch (error: any) {
    console.error('Error reading user data:', error);
    return res.status(500).json({ error: 'Không thể đọc dữ liệu người dùng.' });
  }
});

// Save persistent data for Google Account
app.post('/api/user-data/:uid', (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: 'Thiếu UID người dùng.' });
    const { sets, folders, stats, progresses } = req.body;
    const filePath = getSafeUserFilePath(uid);
    const payload = {
      uid,
      updatedAt: Date.now(),
      sets: sets || [],
      folders: folders || [],
      stats: stats || null,
      progresses: progresses || {},
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return res.json({ success: true, updatedAt: payload.updatedAt });
  } catch (error: any) {
    console.error('Error saving user data:', error);
    return res.status(500).json({ error: 'Không thể lưu dữ liệu người dùng.' });
  }
});

// 1. Generate Flashcards from raw text, document, Quizlet export, or Q&A
app.post('/api/ai/generate-cards', async (req: Request, res: Response) => {
  try {
    const { text, mode = 'raw_text', targetCount, language = 'vi', difficulty } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Nội dung dán vào không được để trống.' });
    }

    const systemPrompt = `Bạn là chuyên gia sư phạm và công cụ tạo flashcard thông minh chuẩn Quizlet bậc cao.
Nhiệm vụ: Phân tích nội dung đầu vào của người dùng (có thể là: đề thi trắc nghiệm A B C D, câu hỏi vấn đáp, bài giảng, từ vựng, tài liệu tóm tắt, xuất dữ liệu Quizlet) và chuyển thành một bộ thẻ flashcard chất lượng cao.

Quy tắc xử lý:
1. Nhận diện cấu trúc:
   - Nếu là trắc nghiệm có A/B/C/D: Tách câu hỏi làm mặt trước ('front'), đáp án đúng làm mặt sau ('back'). Cực kỳ quan trọng: trích xuất các phương án gây nhiễu và đáp án đúng vào 'options' (mảng 4 lựa chọn), và đặt 'correctIndex' là chỉ số (0, 1, 2, hoặc 3) của đáp án đúng trong mảng 'options'.
   - Nếu câu hỏi không có đáp án sẵn: Hãy suy luận đáp án chính xác nhất, đặt vào 'back', và đánh dấu 'isAiSuggested': true.
   - Nếu là danh sách từ vựng/khái niệm: Mặt trước là thuật ngữ / từ vựng kèm phiên âm (nếu ngoại ngữ), mặt sau là định nghĩa / dịch nghĩa kèm ví dụ minh họa ngắn gọn.
   - Nếu là văn bản bài giảng dài/tài liệu: Tóm tắt và trích xuất các ý chính, định nghĩa, số liệu, mốc sự kiện quan trọng nhất thành các thẻ hỏi - đáp súc tích.
2. Chất lượng thẻ:
   - Mặt trước (front): Rõ ràng, trực diện, không nhập nhằng.
   - Mặt sau (back): Đầy đủ, súc tích, dễ nhớ.
   - Gợi ý (hint): Cung cấp gợi ý ngắn giúp người học liên tưởng nếu bị kẹt.
   - Giải thích (explanation): Giải thích ngắn gọn tại sao đáp án lại đúng.
3. Ngôn ngữ: Giữ nguyên ngôn ngữ gốc của nội dung học (thường là Tiếng Việt hoặc Tiếng Anh), lời giải thích theo ngôn ngữ ${language === 'en' ? 'Tiếng Anh' : 'Tiếng Việt'}.
4. Trả về đúng định dạng JSON được quy định.`;

    const userPrompt = `Dưới đây là nội dung cần tạo bộ flashcard:
Chế độ nhập: ${mode}
${targetCount ? `Số lượng thẻ mong muốn: khoảng ${targetCount} thẻ.` : 'Hãy trích xuất đầy đủ và tối ưu số lượng thẻ phù hợp nhất.'}
${difficulty ? `Độ khó: ${difficulty}` : ''}

--- NỘI DUNG ---
${text}
--- HẾT NỘI DUNG ---`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Tiêu đề ngắn gọn, hấp dẫn cho bộ thẻ' },
            description: { type: Type.STRING, description: 'Mô tả tóm tắt nội dung bộ thẻ' },
            subject: { type: Type.STRING, description: 'Môn học hoặc chủ đề chính (ví dụ: Tiếng Anh, Lịch Sử, Tin học, Y khoa...)' },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Các thẻ tag phân loại',
            },
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING, description: 'Mặt trước: Thuật ngữ, câu hỏi hoặc từ vựng' },
                  back: { type: Type.STRING, description: 'Mặt sau: Định nghĩa, đáp án hoặc giải nghĩa' },
                  hint: { type: Type.STRING, description: 'Gợi ý ghi nhớ' },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '4 phương án trắc nghiệm nếu có'
                  },
                  correctIndex: { type: Type.INTEGER, description: 'Chỉ số phương án đúng trong mảng options (0-3)' },
                  explanation: { type: Type.STRING, description: 'Giải thích ngắn gọn' },
                  isAiSuggested: { type: Type.BOOLEAN, description: 'true nếu đáp án do AI đề xuất vì văn bản gốc thiếu đáp án' },
                },
                required: ['front', 'back'],
              },
            },
          },
          required: ['title', 'cards'],
        },
      },
    });

    const rawJson = response.text || '{}';
    const result = JSON.parse(rawJson);
    return res.json(result);
  } catch (error: any) {
    console.error('Error generating cards:', error);
    return res.status(500).json({
      error: error.message || 'Không thể tạo thẻ từ nội dung này. Vui lòng thử lại.',
    });
  }
});

// 2. AI Explain Answer
app.post('/api/ai/explain', async (req: Request, res: Response) => {
  try {
    const { front, back, userAnswer, language = 'vi' } = req.body;

    const prompt = `Bạn là gia sư AI kiên nhẫn và xuất sắc.
Câu hỏi/Thuật ngữ: "${front}"
Đáp án đúng: "${back}"
${userAnswer ? `Câu trả lời của người học: "${userAnswer}" (Hãy chỉ ra điểm đúng/sai nếu có).` : ''}

Hãy cung cấp lời giải thích thật dễ hiểu, kèm:
1. Giải thích chi tiết và trực quan.
2. 2-3 điểm mấu chốt cần nhớ.
3. Sai lầm phổ biến mà người học hay mắc phải.
Ngôn ngữ: ${language === 'en' ? 'English' : 'Tiếng Việt'}.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            commonMistake: { type: Type.STRING },
          },
          required: ['explanation', 'keyPoints'],
        },
      },
    });

    return res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Error in explain:', error);
    return res.status(500).json({ error: error.message || 'Lỗi khi tạo giải thích.' });
  }
});

// 3. AI Mnemonic / Memory Trick
app.post('/api/ai/mnemonic', async (req: Request, res: Response) => {
  try {
    const { front, back, language = 'vi' } = req.body;

    const prompt = `Tạo mẹo ghi nhớ (mnemonic), câu vè liên tưởng hoặc kỹ thuật liên kết hình ảnh sống động cho thẻ học sau:
Mặt trước: "${front}"
Mặt sau: "${back}"
Ngôn ngữ: ${language === 'en' ? 'English' : 'Tiếng Việt'}.
Mẹo phải vui vẻ, dễ khắc sâu vào trí nhớ dài hạn (Spaced Repetition).`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mnemonic: { type: Type.STRING, description: 'Câu vè hoặc mẹo nhớ' },
            association: { type: Type.STRING, description: 'Hình ảnh hoặc âm thanh liên tưởng' },
            story: { type: Type.STRING, description: 'Một câu chuyện nhỏ 1-2 câu để liên kết' },
          },
          required: ['mnemonic', 'association'],
        },
      },
    });

    return res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    console.error('Error in mnemonic:', error);
    return res.status(500).json({ error: error.message || 'Lỗi khi tạo mẹo nhớ.' });
  }
});

// 4. Chat with Study Set
app.post('/api/ai/chat-set', async (req: Request, res: Response) => {
  try {
    const { cards, messages, setTitle } = req.body;

    const cardsContext = (cards || [])
      .slice(0, 80)
      .map((c: any, i: number) => `Thẻ #${i + 1}: [Hỏi/Thuật ngữ]: ${c.front} -> [Đáp án/Định nghĩa]: ${c.back}`)
      .join('\n');

    const systemInstruction = `Bạn là trợ lý học tập cho bộ thẻ "${setTitle || 'Bộ thẻ'}".
Dưới đây là toàn bộ kiến thức trong bộ thẻ:
${cardsContext}

Nhiệm vụ: Trả lời câu hỏi của học sinh, giải thích cặn kẽ, ra thêm bài tập đố vui nhanh nếu được yêu cầu, giải đáp thắc mắc liên quan tới nội dung trên. Luôn động viên và khích lệ học tập.`;

    const chat = ai.chats.create({
      model: MODEL_NAME,
      config: { systemInstruction },
    });

    // Send the latest user message
    const lastUserMsg = (messages && messages.length > 0)
      ? messages[messages.length - 1].content
      : 'Xin chào trợ lý học tập!';

    const result = await chat.sendMessage({
      message: lastUserMsg,
    });

    return res.json({ reply: result.text || 'Không có phản hồi.' });
  } catch (error: any) {
    console.error('Error in chat-set:', error);
    return res.status(500).json({ error: error.message || 'Lỗi khi trò chuyện với bộ thẻ.' });
  }
});

// 5. Translate Study Set
app.post('/api/ai/translate-set', async (req: Request, res: Response) => {
  try {
    const { cards, targetLanguage = 'en' } = req.body;

    const prompt = `Dịch toàn bộ danh sách flashcard sau sang ngôn ngữ: "${targetLanguage}".
Giữ nguyên ý nghĩa sư phạm, dịch chính xác thuật ngữ.
Dữ liệu:
${JSON.stringify(cards)}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              hint: { type: Type.STRING },
            },
            required: ['front', 'back'],
          },
        },
      },
    });

    return res.json({ cards: JSON.parse(response.text || '[]') });
  } catch (error: any) {
    console.error('Error translating cards:', error);
    return res.status(500).json({ error: error.message || 'Lỗi khi dịch bộ thẻ.' });
  }
});

// 6. Generate Card Variants (Reverse cards, Cloze fill-in-the-blank)
app.post('/api/ai/generate-variants', async (req: Request, res: Response) => {
  try {
    const { cards, variantType = 'reverse' } = req.body;

    const prompt = `Cho danh sách các thẻ flashcard sau, hãy tạo biến thể ${variantType === 'reverse' ? 'thẻ đảo (Reverse cards: đổi vai trò mặt trước và mặt sau nhưng viết lại câu hỏi sao cho mượt mà)' : 'thẻ điền vào chỗ trống (Cloze cards: biến câu thành dạng điền từ với chỗ trống [...])'}:
Dữ liệu thẻ gốc:
${JSON.stringify(cards.slice(0, 30))}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              hint: { type: Type.STRING },
            },
            required: ['front', 'back'],
          },
        },
      },
    });

    return res.json({ cards: JSON.parse(response.text || '[]') });
  } catch (error: any) {
    console.error('Error generating variants:', error);
    return res.status(500).json({ error: error.message || 'Lỗi khi tạo biến thể thẻ.' });
  }
});

// 7. Batch Solve Answers for Large Exam Files (200-300 questions)
app.post('/api/ai/batch-solve-answers', async (req: Request, res: Response) => {
  try {
    const { questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Danh sách câu hỏi không được để trống.' });
    }

    const prompt = `Bạn là chuyên gia thẩm định và giải đề thi chính xác 100%.
Nhiệm vụ: Phân tích danh sách ${questions.length} câu hỏi trắc nghiệm dưới đây và xác định đáp án ĐÚNG nhất cho từng câu, kèm giải thích ngắn gọn.

Danh sách câu hỏi:
${JSON.stringify(questions)}

Quy tắc:
1. 'correctLetter': 'A', 'B', 'C', hoặc 'D'.
2. 'correctIndex': 0 (nếu A), 1 (nếu B), 2 (nếu C), 3 (nếu D).
3. 'explanation': Giải thích ngắn gọn tại sao đáp án đó đúng.
4. Trả về đúng mảng JSON theo thứ tự các câu hỏi.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              correctLetter: { type: Type.STRING },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ['id', 'correctLetter', 'correctIndex'],
          },
        },
      },
    });

    const results = JSON.parse(response.text || '[]');
    return res.json({ results });
  } catch (error: any) {
    console.error('Error in batch-solve-answers:', error);
    return res.status(500).json({ error: error.message || 'Lỗi khi giải đáp án tự động.' });
  }
});

// 8. Parse PDF Exam directly via Gemini multimodal
app.post('/api/ai/parse-pdf', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, fileName = 'de_thi.pdf' } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: 'Thiếu dữ liệu PDF.' });
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64,
          },
        },
        {
          text: `Đọc và bóc tách toàn bộ các câu hỏi trắc nghiệm trong tài liệu đề thi này.
Mỗi câu hỏi phải bao gồm:
- question: Nội dung câu hỏi
- options: 4 phương án [A, B, C, D]
- correctLetter: Đáp án đúng ('A', 'B', 'C', hoặc 'D'). Nếu tài liệu có bảng đáp án ở cuối, hãy tra cứu bảng đáp án để điền chính xác. Nếu không có đáp án sẵn, hãy tự giải và điền đáp án đúng nhất.
- correctIndex: 0 nếu A, 1 nếu B, 2 nếu C, 3 nếu D
- explanation: Giải thích ngắn gọn.
Trích xuất tối đa và đầy đủ không bỏ sót câu nào.`,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctLetter: { type: Type.STRING },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                },
                required: ['question', 'options', 'correctLetter', 'correctIndex'],
              },
            },
          },
          required: ['title', 'questions'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    return res.status(500).json({ error: error.message || 'Lỗi khi đọc file PDF.' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`QuizMaster AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
