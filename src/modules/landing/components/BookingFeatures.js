import React from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  Shield, 
  Star, 
  Zap, 
  Users,
  CreditCard,
  Bell
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";

const features = [
  {
    icon: Calendar,
    title: "Đặt bàn nhanh chóng",
    description: "Chọn ngày giờ phù hợp chỉ trong vài giây",
    color: "from-primary to-cyan-400",
  },
  {
    icon: Clock,
    title: "Xác nhận tức thì",
    description: "Nhận xác nhận đặt bàn ngay lập tức",
    color: "from-secondary to-pink-400",
  },
  {
    icon: Shield,
    title: "Bảo mật thông tin",
    description: "Thông tin của bạn được bảo vệ an toàn",
    color: "from-green-400 to-emerald-500",
  },
  {
    icon: Star,
    title: "Đánh giá thực tế",
    description: "Xem đánh giá từ khách hàng đã sử dụng dịch vụ",
    color: "from-yellow-400 to-orange-500",
  },
  {
    icon: Zap,
    title: "Thông báo thông minh",
    description: "Nhận thông báo nhắc nhở trước giờ đặt bàn",
    color: "from-purple-400 to-pink-500",
  },
  {
    icon: Users,
    title: "Quản lý nhóm",
    description: "Dễ dàng đặt bàn cho nhóm bạn bè",
    color: "from-blue-400 to-indigo-500",
  },
  {
    icon: CreditCard,
    title: "Thanh toán linh hoạt",
    description: "Nhiều phương thức thanh toán an toàn",
    color: "from-teal-400 to-cyan-500",
  },
  {
    icon: Bell,
    title: "Nhắc nhở tự động",
    description: "Hệ thống tự động nhắc nhở bạn về lịch đặt bàn",
    color: "from-red-400 to-rose-500",
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
    <section className={cn("py-20 px-4 bg-background")}>
      <div className="container mx-auto max-w-7xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.h2
            className={cn(
              "text-4xl md:text-5xl font-bold mb-4",
              "bg-gradient-to-r from-primary via-secondary to-primary",
              "bg-clip-text text-transparent"
            )}
          >
            Tại Sao Chọn Chúng Tôi?
          </motion.h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Trải nghiệm dịch vụ đặt bàn bar hiện đại với những tính năng độc đáo
          </p>
        </motion.div>

        {/* Features List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="max-w-4xl mx-auto space-y-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg",
                "bg-card border border-border",
                "transition-colors duration-200"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-12 h-12 rounded-lg flex-shrink-0",
                  "bg-gradient-to-br",
                  feature.color,
                  "flex items-center justify-center",
                  "shadow-md"
                )}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1 text-foreground">
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

