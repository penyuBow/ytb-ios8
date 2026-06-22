# YouTube Proxy Worker — hướng dẫn deploy (miễn phí)

Worker này giúp iPhone iOS 8/9 phát video YouTube **ngay trong app**.
Chỉ cần làm 1 lần, hoàn toàn miễn phí.

## Các bước (làm trên máy tính, ~10 phút)

1. Vào https://dash.cloudflare.com → đăng ký tài khoản free (nếu chưa có).
2. Menu trái chọn **Workers & Pages** → **Create application** → **Create Worker**.
3. Đặt tên (vd: `ytb-proxy`) → bấm **Deploy**.
4. Bấm **Edit code**. Xoá hết code mẫu, **dán toàn bộ** nội dung file
   [`youtube-proxy.js`](./youtube-proxy.js) vào.
5. Bấm **Deploy** (góc trên phải).
6. Copy địa chỉ Worker, dạng:
   `https://ytb-proxy.<tên-của-bạn>.workers.dev`

## Kiểm tra nhanh

Mở địa chỉ này trên trình duyệt (thay VIDEO_ID bằng id thật):

    https://ytb-proxy.<tên-của-bạn>.workers.dev/info?v=dQw4w9WgXcQ

Nếu thấy JSON kiểu `{"itag":18,...}` là chạy đúng.

## Bước cuối

Gửi địa chỉ Worker đó cho mình, mình sẽ cắm vào app (`docs/player.html`,
biến `WORKER_BASE`) để app dùng nó phát video in-app.

---

### Lưu ý

- Gói free Cloudflare: 100.000 request/ngày — quá đủ cho dùng cá nhân.
- Nếu một ngày YouTube đổi API và Worker hỏng, chỉ cần dán lại bản
  `youtube-proxy.js` mới nhất.
