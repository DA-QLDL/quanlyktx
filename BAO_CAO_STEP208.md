# STEP208 – Rà soát độc lập ứng dụng KTX Hóc Môn

## Tình trạng hiện tại

- Đã sử dụng bản ZIP GitHub gốc do người dùng gửi (31 file), giữ nguyên **toàn bộ dữ liệu, tên bảng, API và nghiệp vụ hiện hành**.
- Đã thêm kiểm tra tự động các tên miền xuất hiện trong HTML/JS, phát hiện tài nguyên nội bộ thiếu và cảnh báo dấu hiệu service-role ở phía trình duyệt.
- Đã bổ sung GitHub Actions để từ chối thay đổi chứa tên miền không nằm trong danh sách đã duyệt.
- Đã thêm 3 HTTP response headers cơ bản qua Vercel, không khóa camera/QR hoặc kết nối Supabase.
- **Chưa thể xây dựng bộ thư viện ngoại tuyến**: môi trường tạo gói không thể truy cập Internet để tải/kiểm chứng các bản thư viện từ CDN. Không xóa CDN vì điều đó sẽ làm hỏng Excel, PDF, QR và đăng nhập.
- **Chưa thử nghiệm runtime** trên Vercel/Android, chưa thể xác nhận đây là bản không phụ thuộc bên ngoài. Đây là bản baseline an toàn và có kiểm soát, chưa phải bản viết lại hoàn toàn.

## Các dịch vụ bên ngoài được duy trì có chủ đích

- `ojyamqpkmhmhqjfcudhy.supabase.co`: dự án dữ liệu và Auth hiện tại; không đổi.
- `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`: JS của Excel, PDF, ZIP, QR, Supabase; cần nội bộ hóa có giấy phép và kiểm thử riêng.
- `fonts.googleapis.com`, `fonts.gstatic.com`: phông chữ (fallback sẵn trong CSS).
- `schemas.openxmlformats.org`: URI định danh namespace XML của Office, không phải lời gọi mạng.

## Kiểm chứng & triển khai

1. Không tải đè toàn bộ Production trước khi chạy Preview.
2. Chạy `python tools/audit_dependencies.py`; lệnh phải kết thúc với mã 0.
3. Triển khai nhánh Preview, nghiệm thu đăng nhập/đăng xuất, công nhân, QR, Excel, thực đơn, báo cáo Word, Cloud và Mobile.
4. Chỉ merge vào `main` sau khi kiểm thử đạt.
5. Không đưa service-role key vào JavaScript/HTML; API server `api/admin-create-user.js` mới được đọc biến môi trường bí mật.

## Giới hạn

Bảo mật phân quyền phải kiểm tra Supabase RLS và endpoint API trong môi trường thực. Kiểm tra tên miền tĩnh không thay thế kiểm thử bảo mật, và không thể phát hiện tất cả URL tạo động.
