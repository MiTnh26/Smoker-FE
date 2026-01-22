import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";

export function BookingCTA() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const pulseAnimation = {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  return (
    <section className={cn("relative py-12 md:py-16 px-4 overflow-hidden")}>
      {/* Background Gradient */}
      <div className={cn(
        "absolute inset-0",
        "bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20"
      )} />

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 rounded-full bg-primary/10 blur-3xl"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, 50, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              Sẵn sàng bắt đầu?
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className={cn(
              "text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4",
              "text-foreground px-4"
            )}
          >
            Tham Gia Cộng Đồng Ngay Hôm Nay
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4"
          >
            Tạo tài khoản miễn phí để lướt newsfeed, đặt bàn bar, book DJ/Dancer và kết nối với cộng đồng. 
            Tất cả trên một nền tảng duy nhất!
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <motion.button
              onClick={() => navigate("/register")}
            className={cn(
              "px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold",
              "text-sm sm:text-base",
              "bg-primary text-white",
              "shadow-lg shadow-primary/50",
              "hover:bg-primary/90 hover:shadow-xl",
              "transition-all duration-300",
              "flex items-center gap-2",
              "min-h-[44px] touch-target"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
              <span>Đăng Ký Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            <motion.button
              onClick={() => {
                const searchSection = document.getElementById("search-section");
                searchSection?.scrollIntoView({ behavior: "smooth" });
              }}
            className={cn(
              "px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold",
              "text-sm sm:text-base",
              "bg-card border-2 border-primary",
              "text-primary hover:bg-primary hover:text-white",
              "transition-all duration-300",
              "min-h-[44px] touch-target",
              "shadow-lg"
            )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Khám Phá Newsfeed
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              { number: "10K+", label: "Người dùng tích cực" },
              { number: "50K+", label: "Bài đăng mỗi ngày" },
              { number: "1M+", label: "Tương tác hàng tháng" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.1 }}
              >
                <motion.div
                  className={cn(
                    "text-3xl md:text-4xl font-bold mb-2",
                    "text-primary"
                  )}
                >
                  {stat.number}
                </motion.div>
                <p className="text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

