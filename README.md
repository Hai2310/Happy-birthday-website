# Our Universe — Một sinh nhật làm bằng tình yêu

Website 3D tương tác, riêng tư, mừng sinh nhật 20 tuổi của Bé Iu. 9 chương nối tiếp nhau:
Thiệp mời → Căn phòng → Khu vườn → Vũ trụ kỷ niệm → Câu chuyện (cuốn sách) → Cây yêu thương → Bánh kem (thổi nến bằng mic) → Món quà (thư, video, lời nhắn) → Đoạn kết.

## Chạy thử

```bash
cd "our-universe"
npm install          # lần đầu
npm run dev          # nhập ảnh + mở http://localhost:5173
```

Mở trên điện thoại cùng mạng Wi-Fi: dùng địa chỉ `Network:` mà Vite in ra. **Lưu ý:** micro (thổi nến) chỉ hoạt động trên `https://` hoặc `localhost`; khi không có mic, bé vẫn chạm để thổi nến được.

```bash
npm run build        # bản production → dist/
npm run preview      # xem bản build tại http://localhost:4173
npm test             # unit test (vitest)
npm run e2e          # kiểm thử trình duyệt (playwright, cần `npx playwright install chromium`)
npm run validate     # kiểm tra mọi ảnh/video trong manifest đều tồn tại
```

## Thêm / đổi ảnh

1. Bỏ ảnh vào `public/assets/our-photos/` (được tạo thư mục con: `couple/`, `du-lich/`, `sinh-nhat/`… tên thư mục sẽ thành nhóm ảnh).
2. Chạy `npm run dev` hoặc `npm run photos`. Script tự xoay theo EXIF, tạo 3 cỡ webp (480 / 1280 / 2400px), bỏ ảnh trùng hệt nhau, và giữ link tới **ảnh gốc** (mở được từ lightbox).
3. Tuỳ chỉnh từng ảnh (chú thích, nhóm, cảnh, thứ tự) trong `public/assets/our-photos/photos.config.json`.

Hỗ trợ JPG, PNG, WebP, AVIF, GIF. Ảnh HEIC từ iPhone: hãy xuất sang JPG trước (sharp bản dựng sẵn không đọc HEIC).

**Ảnh hiện tại** (`tu-chat/anh-01…32.jpg`) được lấy từ ảnh dán trong khung chat nên đã bị nén. Nếu có ảnh gốc từ điện thoại, hãy thay vào cùng tên để nét hơn.

## Nhạc, video, lời nhắn giọng nói

| Thư mục | Dùng cho |
|---|---|
| `public/assets/our-music/` | Nhạc nền (mp3/ogg/m4a). Không có → dùng nhạc piano tự sinh (gốc, không bản quyền). |
| `public/assets/our-videos/` | Video bất ngờ ở chương Món quà (mp4/webm, có thể kèm phụ đề `.vtt` cùng tên). Không có → trình chiếu ảnh. |
| `public/assets/voice-messages/` | Lời nhắn giọng nói thật của anh. Không có → hiện lời nhắn bằng chữ. |

Website **không** tự tạo giọng nói giả.

## Chỉnh nội dung

Mọi lời chúc, tên, mốc thời gian, bức thư nằm ở **`src/config/birthdayConfig.ts`**:
- `girlfriendName`, `boyfriendName`, `age`
- `relationshipStartDate` — ngày bắt đầu yêu (để trống thì không hiện bộ đếm ngày)
- `timeline` — 6 mốc câu chuyện: **hãy sửa tiêu đề/ngày cho đúng thật**, hiện chưa ghi ngày cụ thể nào
- `loveLetter`, `reasonsILoveYou`, `finalMessage`, `signature`
- `secretCode` — đặt ví dụ `'1711'` để có màn khoá nhỏ (chỉ cho vui, **không phải bảo mật**: ảnh vẫn là file tĩnh công khai nếu ai biết đường dẫn)
- `enabledScenes` / `sceneOrder` — tắt hoặc đổi thứ tự chương

## Triển khai (deploy)

Website là trang tĩnh, không backend, không analytics, không gửi ảnh đi đâu.

- **Netlify:** `npm run build` rồi kéo thả thư mục `dist/` vào app.netlify.com/drop (hoặc `npx netlify deploy --prod --dir=dist`). Header `noindex` đã có trong `public/_headers`.
- **Vercel:** `npx vercel --prod` từ thư mục dự án (`vercel.json` có sẵn). `.vercelignore` cho phép tải ảnh lên để build.
- **Docker:** `docker compose up --build` → http://localhost:8080 (nginx, có header `noindex`).

`.gitignore` cố ý **không** đưa ảnh riêng tư lên Git. Nếu muốn deploy từ GitHub, hãy dùng repo **private** và bỏ các dòng ảnh trong `.gitignore`.

## Riêng tư

- `noindex` trong `<meta>`, `robots.txt` và header máy chủ; `no-referrer`.
- Không analytics, không cookie, không gọi API bên ngoài (font được đóng gói sẵn).
- Âm thanh micro chỉ xử lý ngay trên máy, không ghi lại, và tắt micro ngay khi thổi xong.
- Đường link không được bảo vệ bằng mật khẩu thật: đừng đăng link công khai.

## Tương thích & hiệu năng

- Tự chọn chất lượng (cao / vừa / thấp) theo máy và tự hạ khi khung hình bị giật; đổi tay trong menu.
- Không có WebGL hoặc khi lỗi → bản 2D đầy đủ nội dung (cũng mở được bằng `?2d`).
- Tôn trọng `prefers-reduced-motion`. Có nút bỏ qua hoạt ảnh, tắt/mở nhạc, VI/EN, xem tất cả ảnh.

---

## English summary

A private, static, cinematic 3D birthday experience (React 18 + Vite + three.js via React Three Fiber, GSAP, Howler, Tailwind).

- `npm run dev`, `npm run build`, `npm test`, `npm run e2e`, `npm run validate`
- Photos: drop into `public/assets/our-photos/`, then `npm run photos`; per-photo overrides in `photos.config.json`.
- All copy and personalization: `src/config/birthdayConfig.ts`.
- Deploy: Netlify (`dist/`), Vercel (`vercel.json`), or Docker (`docker compose up --build`).
- No analytics, no external requests, noindex everywhere. The optional passcode is a playful gate, not security.

## License & attribution report

All application code in this folder was written for this project. Reference projects were reviewed for ideas only; **no code was copied**:

| Project | License | Use |
|---|---|---|
| birthday-bloom (Naboraj Sarkar) | MIT | Inspiration only |
| hbd-3d-craft (GitBababoo) | MIT | Inspiration only |
| GirlFriendBirthdayWebsite, birthday-website, anniversary-website | No license | Viewed for inspiration only — nothing reused |

Dependencies (all permissive): React, React DOM (MIT); three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, postprocessing (MIT); gsap and @gsap/react (GSAP standard “no charge” license); howler (MIT); zustand (MIT); fireworks-js (MIT); canvas-confetti (ISC); sharp (Apache-2.0); exif-reader (MIT); Tailwind CSS (MIT).
Fonts via Fontsource: Be Vietnam Pro, Cormorant Garamond, Great Vibes — SIL Open Font License 1.1.
Music: generative score written in code; the “Happy Birthday” melody is public domain. No recorded music is bundled.
# Happy-birthday-website
