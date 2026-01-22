import React from "react";
import { motion } from "framer-motion";
import { 
  Share2, 
  Video, 
  MessageCircle, 
  Heart, 
  Radio,
  Users,
  Bell,
  Camera,
  Music,
  Calendar,
  MapPin
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";

const features = [
  {
    icon: Share2,
    title: "Newsfeed & Chia sẻ",
    description: "Lướt newsfeed, đăng ảnh/video và chia sẻ khoảnh khắc với cộng đồng",
    color: "bg-primary",
  },
  {
    icon: Camera,
    title: "Stories 24 giờ",
    description: "Chia sẻ stories và xem stories từ bạn bè, bar, DJ/Dancer",
    color: "bg-secondary",
  },
  {
    icon: Radio,
    title: "Livestream trực tiếp",
    description: "Xem và phát livestream từ bar, DJ/Dancer, tương tác real-time",
    color: "bg-purple-500",
  },
  {
    icon: Calendar,
    title: "Đặt bàn bar",
    description: "Chọn ngày giờ, combo và đặt bàn tại các quán bar hàng đầu",
    color: "bg-blue-500",
  },
  {
    icon: Music,
    title: "Book DJ/Dancer",
    description: "Chọn slot, giá và book DJ/Dancer cho sự kiện của bạn",
    color: "bg-pink-500",
  },
  {
    icon: Users,
    title: "Kết nối cộng đồng",
    description: "Follow bar, DJ/Dancer, bạn bè và xây dựng mạng lưới của riêng bạn",
    color: "bg-indigo-500",
  },
  {
    icon: Heart,
    title: "Tương tác đa dạng",
    description: "Like, comment, share để thể hiện cảm xúc và tương tác",
    color: "bg-red-500",
  },
  {
    icon: MessageCircle,
    title: "Tin nhắn & Chat",
    description: "Nhắn tin riêng tư với bạn bè, bar, DJ/Dancer và nhóm chat",
    color: "bg-green-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

export function BookingFeatures() {
  const { t } = useTranslation();

  return (
    <section className={cn("py-12 md:py-16 px-4 bg-background")}>
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-12"
        >
          <motion.h2
            className={cn(
              "text-3xl md:text-4xl font-bold mb-3",
              "text-foreground"
            )}
          >
            Tính Năng Toàn Diện
          </motion.h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Social media kết hợp đặt bàn bar và book DJ/Dancer - Tất cả trong một nền tảng
          </p>
        </motion.div>

        {/* Features List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="max-w-4xl mx-auto space-y-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg",
                "bg-card border border-border",
                "transition-colors duration-200"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex-shrink-0",
                  feature.color,
                  "flex items-center justify-center",
                  "shadow-md"
                )}
              >
                <feature.icon className="w-5 h-5 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-base font-bold mb-1 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

