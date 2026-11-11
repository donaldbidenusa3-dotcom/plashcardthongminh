# QuizMaster AI - Nền tảng Học Flashcard Thông Minh Chuẩn Quizlet

Ứng dụng web học tập bằng thẻ ghi nhớ (flashcard) toàn diện, hiện đại mang phong cách Quizlet kết hợp sức mạnh của Google Gemini AI để tự động tạo bộ thẻ từ bất kỳ định dạng tài liệu, đề thi trắc nghiệm, danh sách từ vựng hoặc bài giảng nào.

---

## 🌟 Tính Năng Nổi Bật

### 1. "Ném là có thẻ" – Tạo Flashcard Tự Động Bằng AI
- **Nhập đa định dạng:** Dán nguyên đề thi trắc nghiệm (Câu 1: ... A. B. C. D.), dạng Hỏi - Đáp, từ vựng, văn bản bài giảng, tải tệp tin (`.txt`, `.csv`, `.json`), hoặc dữ liệu xuất từ Quizlet.
- **Tự động tách câu hỏi và đáp án:** Trích xuất các phương án gây nhiễu cho trắc nghiệm, tự động bổ sung đáp án suy luận nếu tài liệu thiếu đáp án (gắn nhãn *AI gợi ý - cần kiểm tra*).
- **Màn hình xem trước (Preview & Edit):** Kiểm tra, chỉnh sửa nội dung, xóa thẻ hoặc thêm thẻ mới trước khi lưu vào thư viện.

### 2. Các Chế Độ Học Chuẩn Quizlet
1. **🃏 Thẻ ghi nhớ (Flashcards):**
   - Lật thẻ 3D trực quan, hỗ trợ vuốt và phím tắt (Space để lật, 1: Chưa biết, 2: Đã biết, Mũi tên lên: Đánh dấu sao).
   - Phát âm chuẩn bằng Text-to-Speech (tự động nhận diện Tiếng Việt / Tiếng Anh).
   - Xáo trộn (Shuffle), chỉ học thẻ gắn sao, tự động trình chiếu (Auto-play), tính năng Hoàn tác (Undo Ctrl+Z).
2. **🧠 Học (Learn):**
   - Thuật toán thích ứng theo vòng (Adaptive learning rounds).
   - Câu làm sai sẽ được lặp lại nhiều hơn cho đến khi thành thạo.
   - Kết hợp trắc nghiệm 4 lựa chọn, câu hỏi Đúng/Sai và gõ câu trả lời.
3. **📝 Kiểm tra (Test):**
   - Tự tạo bài thi thử theo số lượng câu tùy chỉnh và dạng câu hỏi (trắc nghiệm, đúng/sai, tự luận).
   - Đồng hồ đếm ngược, chấm điểm tự động tức thì, phân tích chi tiết từng câu sai.
4. **⚡ Ghép cặp (Match Game):**
   - Game tốc độ nối thuật ngữ với định nghĩa, tính thời gian theo phần trăm giây, lưu bảng xếp hạng cá nhân.
5. **✍️ Viết chính tả (Write Mode):**
   - Gõ định nghĩa với thuật toán so khớp mờ (Levenshtein fuzzy matching) chấp nhận sai sót chính tả nhẹ.
   - Tính năng "Tôi đã đúng (Override)" cho phép người dùng tự xác nhận nếu câu trả lời tương đương.
6. **🚀 Bắn thiên thạch (Gravity Arcade):**
   - Game giải trí ôn bài phong cách Quizlet Gravity: gõ đáp án để phóng laser bắn hạ thiên thạch đang rơi.

### 3. Trợ Lý Học Tập AI Độc Quyền
- **💡 Giải thích đáp án:** Phân tích chi tiết, nêu điểm mấu chốt và sai lầm thường gặp.
- **🪄 Mẹo ghi nhớ (Mnemonic):** Tạo câu vè, hình ảnh liên tưởng sống động giúp nhớ lâu.
- **💬 Chat với bộ thẻ:** Trò chuyện, hỏi đáp chuyên sâu trực tiếp với kiến thức trong bộ thẻ.
- **🔄 Thẻ đảo & Điền từ (Cloze):** Tự động sinh các biến thể thẻ hỏi ngược và thẻ điền vào chỗ trống.
- **🌐 Dịch bộ thẻ:** Dịch toàn bộ thẻ sang ngôn ngữ khác (Tiếng Anh, Nhật, Pháp, Hàn...) chỉ với 1 cú nhấp.
- **🎯 Ôn điểm yếu:** Tự động lọc ra các thẻ bạn hay trả lời sai nhất để ôn tập trọng tâm.

### 4. Thuật Toán Lặp Lại Ngắt Quãng (Spaced Repetition - SM-2)
- Theo dõi chuỗi ngày học liên tục (Streak 🔥).
- Tự động lập lịch ôn tập theo thuật toán SM-2 danh tiếng, hiển thị huy hiệu **"Cần ôn hôm nay"**.

---

## 🛠 Công Nghệ Sử Dụng

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend:** Express, Node.js, `@google/genai` SDK (`gemini-3.8-flash`).
- **Lưu trữ:** LocalStorage có cấu trúc dữ liệu chuẩn bị sẵn cho Supabase / Firebase.
- **Giao diện:** Đa ngôn ngữ (Tiếng Việt 🇻🇳 / Tiếng Anh 🇬🇧), Chế độ Sáng / Tối (Light / Dark mode).

---

## 🚀 Cài Đặt & Chạy Ứng Dụng

### 1. Cấu hình biến môi trường
Tạo file `.env` (hoặc cấu hình trong Secrets của Google AI Studio):
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 2. Cài đặt các gói phụ thuộc
```bash
npm install
```

### 3. Chạy môi trường phát triển (Dev)
```bash
npm run dev
```
Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:3000`.

### 4. Build sản phẩm (Production)
```bash
npm run build
npm start
```
