# 🪷 DỰ ÁN: THẢ THUYỀN HOA ĐĂNG CẦU NGUYỆN (TIKTOK LIVE)

> **Mô hình phối hợp:** Tái sử dụng 90% kiến trúc từ Chánh Điện Tịnh Tâm. Bạn duyệt kế hoạch & chuẩn bị Asset (nếu muốn) – Tôi phụ trách 100% Backend Node.js, Canvas dòng sông 2.5D, Giọng đọc AI và Bảng điều khiển.

---

## 📌 TỔNG QUAN DỰ ÁN

| Thuộc tính | Chi tiết |
|---|---|
| **Tên dự án** | Thả Thuyền Hoa Đăng Cầu Nguyện (`hoa-dang-online`) |
| **Thể loại** | Livestream tương tác thời gian thực 9:16 (1080×1920) |
| **Bối cảnh** | Dòng sông trôi lững lờ dưới ánh trăng rằm, sương mờ lung linh huyền ảo |
| **Âm thanh** | Tái sử dụng trọn bộ: Nhạc thiền tĩnh tâm + Tiếng chuông ngân + Tiếng mõ từ Chánh Điện |
| **Cổng kết nối (Port)** | `3002` (Không xung đột với Chánh Điện `3000` và Bar `3001`) |

---

## 🎮 CƠ CHẾ TƯƠNG TÁC LIVESTREAM

### 1. Người xem Bình luận (Chat) ➔ Thả Đèn Hoa Đăng
* **Hành động:** Khi khán giả gõ bất kỳ câu bình luận nào (Ví dụ: *"Cầu cho cha mẹ bình an"*, *"Nam mô A Di Đà Phật"*).
* **Hiệu ứng trên màn hình:**
  * Xuất hiện **1 chiếc đèn hoa đăng thắp nến** mang **Avatar + Tên** của người đó.
  * Đèn xuất hiện từ thượng nguồn (phía xa trên đường chân trời) và nhẹ nhàng trôi lững lờ xuôi theo dòng sông về phía tiền cảnh.
  * Ngọn nến lung linh tỏa ánh sáng vàng ấm áp in bóng xuống mặt nước.
  * Lời nguyện cầu hiển thị dạng bong bóng tin nhắn (Speech Bubble) bay nhẹ trên đèn rồi mờ dần.
* **Quy mô:** Hỗ trợ cùng lúc từ 50 đến 150 đèn hoa đăng trôi nổi dập dềnh tự nhiên trên mặt sông.

### 2. Người xem Thả Tim (Like) ➔ Gợn Sóng & Đom Đóm Phát Sáng
* Mỗi lượt thả tim tạo hiệu ứng **gợn sóng nước lấp lánh ánh trăng** dưới chân các ngọn hoa đăng.
* Thả tim dồn dập kích hoạt đàn **đom đóm phát sáng** bay lượn trên mặt sông.

### 3. Người xem Tặng Quà Nhỏ (1 – 19 xu) ➔ Nâng Cấp Hoa Đăng Đặc Biệt
* Đèn hoa đăng của người tặng quà hóa thành **Đèn Sen Ngọc / Sen Vàng** kích thước lớn gấp đôi, phát hào quang ngũ sắc.
* Giọng đọc AI xướng tên người cúng dường kèm lời chúc.

### 4. Người xem Tặng Quà Lớn (99+ xu) ➔ TRIỆU HỒI THUYỀN RỒNG VÀNG PHÁT SÁNG
* **Hiệu ứng đỉnh cao (Jackpot Effect):**
  * Tiếng Đại Hồng Chung ngân vang rền trời.
  * Một chiếc **Thuyền Rồng Vàng** khổng lồ rực rỡ phát ánh sáng Phật quang xuất hiện, rẽ sóng lướt từ chân trời dẫn đầu đoàn hoa đăng.
  * Mưa cánh hoa sen vàng và pháo hoa rực sáng cả bầu trời đêm.
  * Giọng đọc AI đọc trang trọng lời chúc toàn gia an khang, vạn sự cát tường.
  * Tên của "Đại Thí Chủ" được vinh danh trên Bảng Vàng Công Đức.

---

## 🛠️ PHÂN CHIA CÔNG VIỆC CHI TIẾT

### 👤 PHẦN VIỆC CỦA BẠN (USER) – Chuẩn bị Asset (Tùy chọn)

*(Nếu bạn chưa có ảnh/nhạc ngay, code vẫn chạy được 100% nhờ Canvas tự vẽ sẵn hình hoa sen, ngọn nến động và ánh trăng)*:

1. **Ảnh nền dòng sông đêm trăng (1080 × 1920):**
   * Lưu tại: `hoa-dang-online/assets/bg_river.jpg`.
   * Gợi ý tạo ảnh: Dùng Bing Image Creator / Copilot với prompt:
     `Vertical 9:16 serene river at night, misty water surface, full moon glowing in dark sky, ancient willow trees on riverbanks, peaceful Zen aesthetic, ultra realistic --ar 9:16`
2. **Âm thanh & Nhạc:**
   * Tự động sao chép hoặc trỏ sang nhạc thiền và tiếng chuông mõ của `chanh-dien-online`.

---

### 🤖 PHẦN VIỆC CỦA TÔI (AGENT) – Kỹ thuật & Code hoàn chỉnh

1. **Khởi tạo cấu trúc dự án `hoa-dang-online/`:**
   * Tách biệt thư mục `assets/` và `live/`.
   * Thiết lập file `package.json` và cấu hình độc lập.
2. **Backend Server (`server.mjs` - Port 3002):**
   * Lắng nghe sự kiện TikTok Live (`CHAT`, `GIFT`, `LIKE`).
   * Quản lý vòng đời (Lifecycle) của từng chiếc hoa đăng trên sông: Xuất hiện ➔ Trôi theo dòng chảy ➔ Dập dềnh theo sóng ➔ Nhạt dần khi trôi qua màn hình.
   * Giọng đọc AI tiếng Việt (`msedge-tts`) xướng tên hồi hướng công đức.
3. **Màn hình Overlay 9:16 (`overlay.html`):**
   * Hệ thống Canvas 2D mô phỏng dòng sông chuyển động với phối cảnh 2.5D (gần to xa nhỏ, dòng chảy chậm rãi, sóng nước lăn tăn).
   * Vẽ ngọn nến hoa đăng có hiệu ứng lửa cháy lung linh chân thực.
   * Hiệu ứng Thuyền Rồng Vàng hoành tráng lướt sóng khi có quà lớn.
   * Tự động bật âm thanh và không bao giờ bị dính nút bấm phiền phức như Chánh Điện.
4. **Bảng điều khiển (`control.html`):**
   * Ô kết nối `@username` kênh TikTok Live.
   * Bộ nút mô phỏng: Thử thả 10/30/50 hoa đăng, thử bình luận cầu an, thử thả tim sóng sánh, thử tặng quà triệu hồi Thuyền Rồng Vàng.

---

## 📋 TIẾN ĐỘ THỰC HIỆN

- [x] **Bước 1:** Trình bày bản kế hoạch cho bạn xem duyệt.
- [x] **Bước 2:** Viết trọn bộ Backend `server.mjs` (Port 3002).
- [x] **Bước 3:** Viết màn hình đồ họa Canvas dòng sông `overlay.html` (chuẩn 1080×1920).
- [x] **Bước 4:** Viết Bảng điều khiển giả lập `control.html`.
- [x] **Bước 5:** Cài đặt dependencies và kiểm tra cú pháp chạy mượt mà.


