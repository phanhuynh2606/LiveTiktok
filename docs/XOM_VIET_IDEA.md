# XÓM VIỆT — Game xây nhà 3D voxel trên TikTok LIVE

> Trạng thái: **BẢN NHÁP ĐỂ ĐỌC VÀ SỬA**. Các con số là giả định ban đầu, cần chỉnh sau khi live thử.

## 1. Ý tưởng một câu

Một **xóm voxel 3D** (kiểu Minecraft) nơi mỗi người xem là một hộ dân. Nhà mọc lên từng viên gạch khi người xem thả tim và comment. Hàng xóm có thể **mượn gạch không trả (trộm)**, bị **đập nhà**, và hai phe **Xóm Trên – Xóm Dưới** cạnh tranh. Một **MC bot** bình luận như bình luận viên bóng đá, vừa hài vừa kịch tính.

## 2. Vì sao khác 3 project cũ

| Project cũ | Xóm Việt |
|---|---|
| Thả gift để xe chạy nhanh, hết ván thì mất | Nhà **lưu lại**, hôm sau vào vẫn còn |
| Chỉ có một việc để làm | Xây, trộm, phòng thủ, chọn phe, làm Trưởng xóm |
| Người xem không chơi thì chỉ nhìn số | MC bot kể chuyện, người xem không chơi vẫn xem được |
| Nhìn như mọi game đua khác | Có bản sắc: **xóm Việt Nam hài hước** |

## 3. Vòng chơi chính (một người xem)

1. Comment `!thamgia` → nhận lô đất và túp lều, được chia vào phe ít người hơn. Bảo vệ người mới 5 phút.
2. Thả tim / `!xay` → nhận gạch, đủ gạch thì nhà **lên một tầng** (gạch rơi từ trên xuống, có tiếng "cộp").
3. Muốn nhanh hơn hoặc đẹp hơn → tặng gift.
4. Muốn drama → `!trom @tên` hoặc gift đập nhà.
5. Bị cướp → có khiên 2 phút để thở, được giảm giá trả đũa đúng người đó.
6. Cuối buổi → nhà top được lưu vào **Khu danh nhân**.

## 4. Nhà và cấp độ

| Cấp | Số tầng | Hình dáng voxel |
|---|---|---|
| 1 Lều | 1 | Mái tôn nhỏ |
| 2 Nhà gỗ | 2 | Tường gỗ, mái ngói |
| 3 Nhà cấp 4 | 2 | Tường gạch, hiên |
| 4 Nhà lầu | 4 | Cửa kính, ban công |
| 5 Biệt thự | 5 | Hồ bơi, sân vườn |
| 6 Lâu đài | 7 | Tháp, cờ phe |

Chỉ có **3 loại khối** ở bản đầu: gạch, kính, mái. Lên cấp = đổi màu và số tầng, không cần model riêng.

## 5. Bộ lệnh và gift

### Lệnh miễn phí

| Lệnh | Tác dụng | Cooldown |
|---|---|---|
| `!thamgia` | Có nhà, vào phe | 1 lần |
| `!phe1` / `!phe2` | Đổi phe (trong 2 phút đầu) | 1 lần |
| `!xay` | +1 gạch | 10s |
| `!trom @tên` | Thử trộm 1–3 gạch, ~40% thành công | 60s |
| `!baove` | Gọi hàng xóm cùng phe, đủ 3 người trong 10s thì chặn 1 lần cướp | 2 phút |
| `!nha` | Bot đọc thông tin nhà của bạn | 30s |

Thả tim: khoảng 10 tim = 1 gạch.

### Gift (mua tốc độ, hiệu ứng và drama, không mua chiến thắng)

| Mức | Món | Hiệu ứng |
|---|---|---|
| Nhỏ | Xi măng | +5 gạch |
| Nhỏ | Chó canh | Chặn 1 lần trộm |
| Nhỏ | Loa karaoke | Nhà đối thủ xây chậm 30s, MC bot réo tên |
| Trung | Búa tạ | Đập 1 tầng đối phương |
| Trung | Khiên | Bảo vệ 5 phút |
| Lớn | Lên cấp nhà | Lều → nhà gỗ → ... |
| Lớn | Xe ủi | Phá tầng cao nhất của vài nhà phe địch, khối bay tung |
| Lớn | Ứng cử Trưởng xóm | Làm Trưởng xóm 10 phút, ra 1 luật |
| Siêu lớn | Sự kiện | Chọn: bão, boss, giờ vàng |

Tên gift cụ thể trên TikTok thay đổi theo thời điểm, sẽ gán lại khi làm.

## 6. Luật cân bằng

- Bị đập chỉ mất **1 tầng**, nền móng luôn còn.
- Bị cướp xong có khiên **2 phút** tự động.
- Một người bị tấn công tối đa **3 lần / 10 phút**.
- Người mới được bảo vệ **5 phút**.
- Gift lớn mua hiệu ứng và quyền ra luật, **không xóa sạch nhà**.
- `!trom` chỉ tốn thời gian, **không tốn gift**, để không giống cờ bạc.

## 7. Phe phái và Trưởng xóm

- Hai phe: **Xóm Trên** và **Xóm Dưới**. Hệ thống cân số người khi vào.
- Điểm phe = tổng số tầng nhà + điểm phòng thủ. Mỗi giờ có một lần tính điểm.
- **Trưởng xóm:** người gift cao nhất 10 phút được chọn 1 luật:
  - Thu thuế 10% gạch của phe địch.
  - Cấm cướp 3 phút.
  - Gấp đôi gạch cho phe mình 2 phút.
- Luật tự hết hạn, không cộng dồn.

## 8. MC bot (điểm nhấn chính)

Bot đọc sự kiện bằng giọng TTS tiếng Việt, câu mẫu:

| Sự kiện | Câu bot |
|---|---|
| Cướp thành công | "Ối giời! {A} vừa nẫng của {B} {n} viên gạch, hàng xóm với nhau mà!" |
| Cướp thất bại | "{A} rón rén qua nhà {B}, bị chó cắn chạy mất dép." |
| Bị đập nhà | "Rầm! Nhà {B} mất 1 tầng. Ai ném búa vậy?" |
| Karaoke | "{A} mở karaoke 11 giờ đêm, cả xóm khó ngủ." |
| Đổi Trưởng xóm | "Xóm có Trưởng mới: {A}. Luật đầu tiên: {luật}." |
| Người mới | "Chào {A}, hàng xóm mới đã dọn về Xóm {phe}." |

Giai đoạn đầu dùng **câu mẫu có điền chỗ trống**, chưa cần AI sinh câu.

## 9. Sự kiện giữa live

- **Bão:** nhà không có mái mất gạch.
- **Băng cướp:** nhắm nhà top 1, cả hai phe hợp sức đuổi.
- **Giờ vàng:** 5 phút cấm cướp, chỉ xây và khoe nhà.
- **Boss xóm:** cả phe thả tim đánh boss để nhận thưởng.
- **Giờ đua (tùy chọn, giai đoạn sau):** đua xích lô 90 giây, thắng nhận gạch.

## 10. Bảng xếp hạng

- 🏠 Nhà cao nhất
- 🦹 Trùm trộm gạch
- 🛡️ Phòng thủ giỏi nhất
- 💥 Kẻ bị ghét nhất (nhiều người muốn trả thù nhất)
- 🏘️ Phe dẫn đầu

## 11. Kỹ thuật (đơn giản nhất có thể)

```
TikTok LIVE → server Node.js (TikTok-Live-Connector) → WebSocket
            → overlay.html (Three.js voxel, OBS Browser Source)
            → TTS Edge (tái sử dụng từ Chánh Điện)
Lưu dữ liệu: SQLite (user → nhà, gạch, phe)
```

- **Hiển thị:** Three.js, camera cố định nhìn xiên, `InstancedMesh` cho các khối.
- **Tái sử dụng** `server.mjs`, TTS và cách ghép OBS từ Chánh Điện.
- **Chưa làm:** avatar 3D, model riêng từng cấp, sự kiện phức tạp.
- **Cần kiểm chứng:** bật hardware acceleration cho Browser Source trên máy live thật.

## 12. Rủi ro và lưu ý

- **Chính sách:** luôn hiển thị "Gạch chỉ là tài sản trong game, không đổi ra tiền thật". Không có quay thưởng, không có tỷ lệ trúng gắn với gift.
- **Pay-to-win:** gift nên mua tốc độ, hiệu ứng, quyền ra luật; người chơi miễn phí vẫn có đường thắng.
- **Ít người xem:** 5 người vẫn chơi được vì có chia phe và MC bot. Cần kiểm chứng khi live thử.
- **Spam lệnh:** bot bỏ qua lệnh nhanh hơn cooldown, có thể thêm moderator.
- **Thư viện không chính thức:** TikTok-Live-Connector có thể hỏng khi TikTok đổi giao thức.
- **Voxel 3D tốn GPU:** cần thử sớm bằng prototype.

## 13. Lộ trình gợi ý

| Giai đoạn | Việc | Thời gian ước tính |
|---|---|---|
| 1 | Prototype lưới 5×5 nhà voxel, sự kiện giả, camera | 3–5 ngày |
| 2 | Nối TikTok-Live-Connector, lưu SQLite | 3–4 ngày |
| 3 | Luật cướp/phá/khiên, bảng xếp hạng | 3–5 ngày |
| 4 | MC bot TTS, phe phái, Trưởng xóm | 3–5 ngày |
| 5 | Live thử với 10–20 người, chỉnh số liệu | liên tục |
| 6 | Sự kiện, Khu danh nhân, đua | sau |

## 14. Câu hỏi để bạn chốt khi đọc

1. Tên: giữ "Xóm Việt" hay "Phố Gạch"?
2. Hai phe: tên và màu cờ bạn muốn là gì?
3. Có giữ tính năng "trộm gạch" không, hay thay bằng "mượn" cho nhẹ nhàng hơn?
4. Có thêm "Giờ đua" ở giai đoạn sau không?
5. Giọng MC: nam hay nữ, kiểu bình luận bóng đá hay kiểu bà tám đầu xóm?
