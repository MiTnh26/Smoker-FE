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
  CreditCard,
  ClipboardCheck,
  BookOpen,
  ClipboardList,
  Package,
  CheckCircle2,
  Pause,
  Play,
  DollarSign,
  Megaphone,
  AlertCircle,
  FileText
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
    { label: "Sự kiện", icon: Calendar, path: "/customer/events" },
    { label: "Tin nhắn", icon: MessageCircle, path: "/customer/messages" },
    { label: "Đặt bàn của tôi", icon: BookOpen, path: "/customer/my-bookings" },
    { label: "Hồ sơ", icon: User, path: "/own/profile" },
    { label: "Bank info", icon: CreditCard, path: "/customer/bank-info" },
    { label: "Đăng ký tài khoản kinh doanh", icon: Store, path: "/register/select-account-type" },
  ],

  // bar: [
  //   { label: "Dashboard", icon: BarChart3, path: "/bar/dashboard" },
  //   { label: "Sự kiện", icon: Calendar, path: "/bar/events" },
  //   { label: "Nhân sự (DJ, Dancer)", icon: Users, path: "/bar/staff" },
  //   { label: "Tin nhắn", icon: MessageCircle, path: "/bar/messages" },
  //   { label: "Bar page", icon: User, path: "/bar/:barPageId" },
  //   { label: "Cài đặt quán", icon: Settings, path: "/bar/settings/:barPageId" },
  // ],
  bar: [
    { label: "Newsfeed", icon: Home, path: "/bar/newsfeed" },
    { label: "Dashboard", icon: BarChart3, path: "/bar/dashboard" },
    { label: "Sự kiện", icon: Calendar, path: "/bar/events" },
    { label: "Tin nhắn", icon: MessageCircle, path: "/bar/messages" },
    {
      label: "Bar page",
      icon: User,
      path: "/own/profile",
    },
    {
      label: "Cài đặt quán",
      icon: Settings,
      path: "/bar/settings/:barPageId",
      subMenu: [
        { label: "Quản lý loại bàn", path: "/bar/settings/:barPageId/table-types" },
        { label: "Quản lý bàn", path: "/bar/settings/:barPageId" },
        { label: "Quản lý voucher", path: "/bar/settings/:barPageId/vouchers" },
        { label: "Quản lý combo", path: "/bar/settings/:barPageId/combos" },
      ],
    },
  ],
  dj: [
    { label: "Newsfeed", icon: Home, path: "/dj/newsfeed" },
 
    { label: "Schedule", icon: Calendar, modalType: "schedule" },
    { label: "Booking", icon: ClipboardList, modalType: "booking" },
   
    { label: "Đánh giá & sao", icon: Star, modalType: "reviews" },
    { label: "Tin nhắn", icon: MessageCircle, path: "/dj/messages" },
    { label: "Hồ sơ", icon: User, path: "/dj/profile" },
  ],

  dancer: [
    { label: "Newsfeed", icon: Home, path: "/dancer/newsfeed" },
 
    { label: "Schedule", icon: Calendar, modalType: "schedule" },
    { label: "Booking", icon: ClipboardList, modalType: "booking" },
  
    { label: "Đánh giá & sao", icon: Star, modalType: "reviews" },
    { label: "Tin nhắn", icon: MessageCircle, path: "/dancer/messages" },
    { label: "Hồ sơ", icon: User, path: "/dancer/profile" },
  ],

  admin: [
    { label: "Dashboard", icon: BarChart3, path: "/admin/dashboard" },
    { label: "Quản lý người dùng", icon: Users, path: "/admin/users" },
    { label: "Quản lý duyệt", icon: ClipboardCheck, path: "/admin/approvals" },
    { label: "Thư viện nhạc", icon: Music2, path: "/admin/music" },
    { label: "Gói quảng cáo", icon: Package, path: "/admin/ad-packages" },
    { label: "Duyệt QC Event", icon: CheckCircle2, path: "/admin/event-ad-approvals" },
    { label: "Yêu cầu tạm dừng QC", icon: Pause, path: "/admin/pause-requests" },
    { label: "Yêu cầu tiếp tục QC", icon: Play, path: "/admin/resume-requests" },
    { label: "Yêu cầu hoàn tiền", icon: DollarSign, path: "/admin/refund-requests" },
    { label: "Quản lý báo cáo", icon: AlertCircle, path: "/admin/reports" },
    // { label: "Quản lý bài viết", icon: FileText, path: "/admin/posts" },
    // { label: "Cài đặt hệ thống", icon: Settings, path: "/admin/settings" },
    { label: "Cài Đặt Quảng Cáo", icon: Megaphone, path: "https://smoker-revive.onrender.com/revive/www/admin/index.php", external: true },
  ],
};
