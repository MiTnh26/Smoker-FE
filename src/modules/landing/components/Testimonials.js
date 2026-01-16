import React from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { cn } from "../../../utils/cn";

const testimonials = [
  {
    name: "Nguyễn Văn A",
    role: "Khách hàng thân thiết",
    avatar: "https://ui-avatars.com/api/?name=Nguyen+Van+A&background=0ea5e9&color=fff",
    rating: 5,
    comment: "Nền tảng social media tuyệt vời! Dễ dàng chia sẻ khoảnh khắc và kết nối với bạn bè. Giao diện đẹp và tính năng phong phú.",
  },
  {
    name: "Trần Thị B",
    role: "Người dùng mới",
    avatar: "https://ui-avatars.com/api/?name=Tran+Thi+B&background=ec4899&color=fff",
    rating: 5,
    comment: "Giao diện đẹp, dễ sử dụng. Tính năng Stories và Livestream rất thú vị. Đã kết nối được nhiều bạn bè mới qua nền tảng này!",
  },
  {
    name: "Lê Văn C",
    role: "Khách hàng VIP",
    avatar: "https://ui-avatars.com/api/?name=Le+Van+C&background=10b981&color=fff",
    rating: 5,
    comment: "Hệ thống hoạt động mượt mà, không gặp lỗi gì. Đặc biệt thích tính năng Livestream và chia sẻ âm nhạc. Cộng đồng rất tích cực!",
  },
  {
    name: "Phạm Thị D",
    role: "Người dùng thường xuyên",
    avatar: "https://ui-avatars.com/api/?name=Pham+Thi+D&background=f59e0b&color=fff",
    rating: 5,
    comment: "Đã sử dụng nền tảng này được một thời gian. Luôn có nội dung mới và thú vị. Tính năng nhắn tin riêng tư rất tiện lợi!",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

export function Testimonials() {
  return (
    <section className={cn("py-12 md:py-16 px-4 bg-background relative overflow-hidden")}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-12"
        >
          <motion.h2
            className={cn(
              "text-3xl md:text-4xl font-bold mb-3",
              "text-foreground"
            )}
          >
            Người Dùng Nói Gì Về Chúng Tôi?
          </motion.h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Hàng nghìn người dùng đã tham gia và chia sẻ trải nghiệm của họ
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={cn(
                "bg-card/80 backdrop-blur-sm rounded-xl p-4 md:p-5",
                "border border-border/50",
                "shadow-lg shadow-primary/5",
                "hover:shadow-xl hover:shadow-primary/10",
                "transition-all duration-300",
                "relative overflow-hidden group"
              )}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              {/* Quote Icon */}
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Quote className="w-12 h-12 text-primary" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-primary text-primary"
                  />
                ))}
              </div>

              {/* Comment */}
              <p className="text-foreground mb-6 leading-relaxed relative z-10">
                "{testimonial.comment}"
              </p>

              {/* User Info */}
              <div className="flex items-center gap-3 relative z-10">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full border-2 border-primary/20"
                />
                <div>
                  <p className="font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>

              {/* Decorative gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

