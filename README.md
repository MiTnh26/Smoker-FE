Smoker-FE (React)

Chi tiết cấu trúc thư mục hiện tại:

- src/
  - api/
    - axiosClient.js
      // Khởi tạo instance axios cấu hình sẵn baseURL từ biến môi trường (REACT_APP_API_URL).
      // Thiết lập interceptor để tự động đính token (Authorization Bearer) cho các request và xử lý lỗi chung.
    - userApi.js
      // Cung cấp các hàm call API liên quan xác thực (login, register, google login, lấy user profile, cập nhật profile,...).
      // Sử dụng axiosClient để gửi HTTP request.

  - contexts/
    - AuthContext.js
      // Tạo context lưu trữ dữ liệu xác thực: token và user.
      // Cung cấp các phương thức login, logout, cập nhật user cho toàn bộ ứng dụng.
      // Dữ liệu auth có thể lưu xuống localStorage và được load lại khi reload trang.

  - hooks/
    - useAuth.js
      // Custom hook để truy cập nhanh context AuthContext trong các component/function.
      // Hỗ trợ lấy thông tin user và các hàm login, logout, updateUser.

  - routes/
    - AppRoutes.js
      // Định nghĩa mapping route cho toàn bộ project.
      // Kết hợp các layout và page, quy định từng route (ex: /login, /register, /customer/newsfeed, /admin/dashboard, ...).
      // Bao gồm logic cho các loại user (customer, dj, dancer, bar, admin).
    - ProtectedRoute.js
      // Higher Order Component kiểm tra chứng thực + phân quyền cho route.
      // Nếu chưa đăng nhập thì redirect về /login.
      // Nếu đăng nhập sai role sẽ chuyển hướng về dashboard role hợp lệ.

  - modules/       // Chứa logic, UI chia theo domain lớn của app
    - auth/
      - pages/
        - Login.js
          // Giao diện đăng nhập qua email/password (form), có button chuyển sang đăng nhập Google.
          // Gửi API login, xử lý redirect dựa trên kết quả.
        - Register.js
          // Đăng ký email thủ công (form), có button đăng ký qua Google.
        - GoogleLogin.js
          // Giao diện đăng nhập qua Google ID token.
          // Tích hợp Google One-Tap (nút Google) và xử lý callback xác thực Google => gửi token về BE.
          // Hiển thị feedback cho user (error/success).
    - customer/
      - pages/
        - ProfileSetup.js
          // Trang cho user điền/điều chỉnh thông tin cá nhân lần đầu sau khi đăng ký hoặc xác thực Google.
        - Profile.js
          // Trang xem và cập nhật profile khách hàng (dành cho "customer/user" thông thường).
    - landing/
      - pages/
        - Home.js
          // Trang landing (trang chủ giới thiệu sản phẩm, chưa cần login cũng xem được).
    // Có thể có thêm các module khác: bar, dj, dancer, admin... chia tương tự về cấu trúc

  - components/    // Các component dùng lại toàn cục, không gắn với domain nào
    - common/
      - Button.js
        // Component Button tuỳ biến dùng cho toàn app.
      - Input.js
        // Component Input form (label, error, etc).

  - styles/
    // Chứa file css/scss chia theo module hoặc global.
    - modules/
      - auth.css (style riêng cho trang/cụm auth: login, register,...)
    - base.css (global reset/style chung)
    // Có thể thêm theme, variable scss...

  - utils/
    // Các hàm tiện ích chung như format, validate, helper API, v.v.

  - App.js
    // File entry point cấu hình Provider các context (AuthContext), import AppRoutes...

  - index.js
    // Entry point render App vào DOM với ReactDOM, cấu hình Provider cho Google OAuth nếu có. 

Ghi chú:
- Mỗi page thường gắn với một route cụ thể và có thể import các component chung.
- Các component dùng lại nằm ngoài modules (trong components/).
- Phân chia rõ ràng vai trò từng thư mục giúp dễ bảo trì và mở rộng.

Env:
REACT_APP_API_URL=http://localhost:9999/api

Scripts:
1) npm i
2) npm start
