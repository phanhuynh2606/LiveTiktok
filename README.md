# 🎬 TikTok Live Interactive Stream Collection

Bộ công cụ tương tác livestream TikTok thời gian thực (Realtime Interactive Overlay) kết hợp Node.js, WebSocket và giọng đọc AI (Edge TTS tiếng Việt). Người xem tương tác trực tiếp qua bình luận, thả tim và tặng quà (donate) ngay trên màn hình phát LIVE 9:16.

---

## 📂 Cấu trúc Repository

| Thư mục | Chủ đề | Mô tả |
|---|---|---|
| [`chanh-dien-online/`](file:///d:/Project/TiktokLive/chanh-dien-online) | **Chánh Điện Tịnh Tâm** | Chánh điện 2.5D; người xem bình luận để vào ngồi tụng kinh, gõ mõ, tặng quà xướng tên hồi hướng công đức. Có bản web tĩnh (Cloudflare Pages) và bản phát LIVE. |
| [`hoa-dang-online/`](file:///d:/Project/TiktokLive/hoa-dang-online) | **Thả Thuyền Hoa Đăng** | Dòng sông trôi 2.5D; bình luận thả đèn hoa đăng mang tên người xem, thả tim tạo sóng và đom đóm, tặng quà lớn triệu hồi Thuyền Rồng Vàng phát sáng rẽ sóng. |
| [`bar-online/`](file:///d:/Project/TiktokLive/bar-online) | **Vũ Trường Cõi Mạng** | Sàn nhảy Bar/EDM neon; người xem vào sàn nhún nhảy theo nhịp bass, đại gia nạp quà mở bàn VIP, MC Hype xướng tên dồn dập. |
| [`docs/`](file:///d:/Project/TiktokLive/docs) | **Tài liệu & Kế hoạch** | Lưu trữ ý tưởng, phân tích tương tác và danh sách task phát triển. |

---

## 🛠️ Công nghệ sử dụng

- **Backend:** Node.js (ES Modules, `server.mjs`)
- **Tương tác TikTok:** [`tiktok-live-connector`](https://github.com/zerodytrash/TikTok-Live-Connector) (kết nối bắt sự kiện public qua username, không cần mật khẩu hay tài khoản)
- **Giọng đọc AI (TTS):** [`msedge-tts`](https://github.com/schneegans/msedge-tts) (Microsoft Edge Read Aloud - giọng Nam Minh / Hoài My tiếng Việt)
- **Giao tiếp Realtime:** WebSocket (`ws`)
- **Frontend Overlay & Bảng điều khiển:** HTML5, CSS3 Animation, Canvas 2D, Web Audio API (tối ưu tỷ lệ 9:16 chuẩn 1080×1920 cho OBS / TikTok LIVE Studio)

---

## 🚀 Hướng dẫn khởi chạy nhanh

### Yêu cầu tiên quyết
- Đã cài đặt **Node.js 20 trở lên** trên máy tính.

---

### 1. Chạy "Chánh Điện Tịnh Tâm"

```bash
cd chanh-dien-online/live
npm install
npm start
```

1. Mở bảng điều khiển: `http://localhost:3000/live/control.html`.
2. Bấm nút **Mở màn hình overlay 9:16**, sau đó bấm **Bật âm thanh** trên cửa sổ overlay.
3. Trong **OBS Studio** hoặc **TikTok LIVE Studio**: Thêm nguồn *Browser Source* trỏ tới `http://localhost:3000/live/overlay.html` (kích thước `1080 × 1920`).
4. Nhập `@username` kênh TikTok của bạn vào bảng điều khiển rồi bấm **Kết nối**.

---

### 2. Chạy "Vũ Trường Cõi Mạng (Bar Online)"

```bash
cd bar-online/live
npm install
npm start
```

1. Mở bảng điều khiển: `http://localhost:3000/live/control.html`.
2. Bấm nút **Mở màn hình overlay 9:16** và **Bật âm thanh**.
3. Thêm nguồn *Browser Source* vào phần mềm phát live trỏ đến `http://localhost:3000/live/overlay.html` (`1080 × 1920`).
4. Kết nối username TikTok hoặc dùng bộ nút mô phỏng để test âm thanh, ánh sáng và bàn VIP.

---

## 🔒 An toàn & Bảo mật

- **Không lưu trữ thông tin nhạy cảm:** Hệ thống chỉ đọc luồng sự kiện công khai của phòng live qua username, không yêu cầu đăng nhập, mật khẩu, cookie hay session.
- **Mặc định chạy Localhost:** Server chỉ lắng nghe tại `127.0.0.1`, chặn các truy cập ngoài mạng nội bộ.
- **Chống injection:** Dữ liệu tên người dùng, nội dung bình luận đều được escape ký tự đặc biệt và giới hạn độ dài trước khi đưa vào Canvas và TTS.

---

## 📜 Giấy phép (License)

Dự án được phát hành dưới giấy phép [MIT License](file:///d:/Project/TiktokLive/chanh-dien-online/LICENSE). Phục vụ cho mục đích nghiên cứu, học tập và sáng tạo nội dung livestream.
