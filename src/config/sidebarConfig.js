// src/config/sidebarConfig.js
import {
    Home,
    User,
    Music2,
    Users,
    Settings,
    BarChart3,
    Calendar,
    Star,
    MessageCircle,
    Store,
  } from "lucide-react";
  
  /**
   * Cấu hình sidebar cho từng loại tài khoản (role)
   * Mỗi role có 1 mảng menu riêng.
   * 
   * Lưu ý:
   * - `label`: tên hiển thị
   * - `icon`: biểu tượng lucide-react
   * - `path`: đường dẫn điều hướng
   */
  
  export const sidebarConfig = {
    customer: [
      { label: "Trang chủ", icon: Home, path: "/customer/newsfeed" },
      { label: "Đăng ký tài khoản kinh doanh", icon: Store, path: "/register/select-account-type" },
      { label: "Hội nhóm", icon: Users, path: "/customer/groups" },
      { label: "Sự kiện", icon: Calendar, path: "/customer/events" },
      { label: "Tin nhắn", icon: MessageCircle, path: "/customer/messages" },
      { label: "Hồ sơ", icon: User, path: "/customer/profile" },
    ],
  
    bar: [
      { label: "Dashboard", icon: BarChart3, path: "/bar/dashboard" },
      { label: "Sự kiện", icon: Calendar, path: "/bar/events" },
      { label: "Nhân sự (DJ, Dancer)", icon: Users, path: "/bar/staff" },
      { label: "Tin nhắn", icon: MessageCircle, path: "/bar/messages" },
      { label: "Bar page", icon: User, path: "/bar/:barPageId" },
      { label: "Cài đặt quán", icon: Settings, path: "/bar/settings/:barPageId" },
    ],
  
    dj: [
      { label: "Dashboard", icon: BarChart3, path: "/dj/dashboard" },
      { label: "Lịch diễn", icon: Calendar, path: "/dj/schedule" },
      { label: "Khách hàng / Bar hợp tác", icon: Users, path: "/dj/partners" },
      { label: "Đánh giá & sao", icon: Star, path: "/dj/reviews" },
      { label: "Tin nhắn", icon: MessageCircle, path: "/dj/messages" },
    ],
  
    dancer: [
      { label: "Dashboard", icon: BarChart3, path: "/dancer/dashboard" },
      { label: "Lịch diễn", icon: Calendar, path: "/dancer/schedule" },
      { label: "Đối tác / Bar", icon: Users, path: "/dancer/partners" },
      { label: "Đánh giá & sao", icon: Star, path: "/dancer/reviews" },
      { label: "Tin nhắn", icon: MessageCircle, path: "/dancer/messages" },
    ],
  
    admin: [
      { label: "Dashboard", icon: BarChart3, path: "/admin/dashboard" },
      { label: "Quản lý người dùng", icon: Users, path: "/admin/users" },
      { label: "Quản lý quán / Bar", icon: Store, path: "/admin/bars" },
      { label: "Báo cáo & thống kê", icon: BarChart3, path: "/admin/reports" },
      { label: "Cài đặt hệ thống", icon: Settings, path: "/admin/settings" },
    ],
  };
  