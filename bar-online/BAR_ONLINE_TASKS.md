# 📋 PHÂN CHIA CÔNG VIỆC DỰ ÁN: BAR ONLINE & VŨ TRƯỜNG CÕI MẠNG

> **Mô hình phối hợp:** Bạn chuẩn bị Asset âm thanh/hình ảnh – Tôi code trọn bộ Backend, Overlay vũ trường 9:16 và Bảng điều khiển.

---

## 👤 PHẦN VIỆC CỦA BẠN (USER) – Chuẩn bị Asset

Bạn chỉ cần chuẩn bị 4 món đơn giản sau (tất cả đều miễn phí 100%):

### 1. Ảnh nền Vũ Trường (1080 × 1920)
* **Tên file cần lưu:** `bar-online/assets/bg_bar.jpg`
* **Cách lấy miễn phí 100%:**
  * **Cách nhanh nhất (Pollinations AI - Không cần đăng ký):** Click mở trực tiếp link này trên trình duyệt để tải ảnh về:  
    👉 `https://image.pollinations.ai/prompt/luxury%20nightclub%20interior%20stage%20with%20DJ%20booth%20neon%20lights%20purple%20gold%20vertical%20dancefloor?width=1080&height=1920&nologo=true`
  * **Cách 2 (Microsoft Designer / Copilot):** Vào `bing.com/images/create` hoặc `designer.microsoft.com` (đăng nhập tài khoản Microsoft miễn phí), gõ prompt:  
    `Vertical 9:16 luxury nightclub interior, EDM stage, neon laser lights, DJ booth in center, VIP lounge tables on sides, ultra realistic --ar 9:16`
  * **Cách 3 (Ảnh thật Unsplash/Pexels):** Lên `pexels.com` gõ `nightclub vertical` hoặc `dj lights` tải về.
  *(Lưu ý: Nếu bạn chưa có ảnh, code đã có sẵn nền Neon Gradient tự vẽ bằng CSS để chạy thử ngay!)*

### 2. File nhạc nền EDM / Vinahouse Loop
* **Tên file cần lưu:** `bar-online/assets/music/bgm_club.mp3`
* **Nguồn tải miễn phí (No copyright):**
  * Vào `pixabay.com/music` gõ tìm `club edm` hoặc `dance party` (chọn bài bốc từ 2-5 phút).
  * Đặt file vào thư mục `bar-online/assets/music/bgm_club.mp3`.

### 3. Hiệu ứng âm thanh ngắn (SFX)
Đặt vào `bar-online/assets/sfx/`:
* `airhorn.mp3`: Tiếng còi hơi hú (`bwe-bwe-bwooom`) khi tặng quà / mở bàn VIP. (Tải nhanh trên `myinstants.com/en/search/?name=airhorn`)
* `scratch.mp3`: Tiếng chà đĩa DJ ngắn (tùy chọn).
* `champagne.mp3`: Tiếng mở nắp chai nổ `pop` (tùy chọn).

---

## 🤖 PHẦN VIỆC CỦA TÔI (AGENT) – Kỹ thuật & Code hoàn chỉnh

Tôi sẽ đảm nhận 100% phần kỹ thuật:

1. [x] **Cấu trúc thư mục `bar-online/`**: Chuẩn hóa tách biệt, độc lập với Chánh Điện.
2. [x] **Backend Server (`server.mjs`)**:
   * Tích hợp `tiktok-live-connector` bắt event TikTok Live.
   * Logic quản lý khách vào sàn nhảy (`di bar`, `len do`), tự động xếp vào sàn hoặc bàn VIP.
   * Tinh chỉnh giọng MC Hype (`msedge-tts` với `vi-VN-NamMinhNeural`, rate +20%, pitch +10Hz hô hào dồn dập).
   * Cơ chế Audio Ducking: Tự hạ nhạc nền khi MC xướng tên đại gia.
3. [x] **Màn hình Overlay 9:16 (`overlay.html`)**:
   * Sàn nhảy Canvas + HTML5 với hiệu ứng nhún nhảy theo nhịp bass.
   * Dàn đèn Laser Neon chiếu xoay quét tự động bằng CSS3.
   * Vị trí hiển thị Bàn VIP 1, Bàn VIP 2, Bàn VIP 3 cho Top nạp quà.
   * Banner chúc mừng Đại Gia bao trọn quán với hiệu ứng pháo sáng / kim tuyến rực rỡ.
   * Đầy đủ hiệu ứng âm thanh Web Audio API.
4. [x] **Bảng điều khiển (`control.html`)**:
   * Kết nối `@username` TikTok Live thật.
   * Bộ nút mô phỏng: Thử cmt "đi bar", thử thả tim, thử donate quà nhỏ (Rót rượu), vừa (Mở bàn VIP), khủng (Bao trọn quán).

---

## 🚀 HƯỚNG DẪN CHẠY TEST THỬ NGAY

1. Mở terminal tại thư mục `bar-online/live`:
   ```bash
   cd d:\Project\TiktokLive\bar-online\live
   npm install
   node server.mjs
   ```
2. Mở trình duyệt vào:
   * **Bảng điều khiển:** `http://localhost:3001/live/control.html`
   * **Màn hình Overlay 9:16:** `http://localhost:3001/live/overlay.html` (bấm nút "Bật âm thanh").
3. Bấm các nút test giả lập trên bảng điều khiển để xem sàn nhảy quẩy và MC xướng tên!
