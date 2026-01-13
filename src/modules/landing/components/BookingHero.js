import React, { useEffect, useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Calendar, Clock, Users, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "../../../utils/cn";

export function BookingHero() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Parallax effects
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  // Smooth spring animation
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const smoothY1 = useSpring(y1, springConfig);
  const smoothY2 = useSpring(y2, springConfig);

  // Floating animation for icons
  const floatingAnimation = {
    y: [0, -20, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  return (
    <section
      ref={containerRef}
      className={cn(
        "relative w-full h-screen min-h-[600px] overflow-hidden",
        "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900",
        "flex items-center justify-center"
      )}
    >
      {/* Animated Background Elements */}
      <motion.div
        style={{ y: smoothY1, opacity }}
        className="absolute inset-0"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20" />
      </motion.div>

      {/* Floating Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-primary/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            y: smoothY2,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={cn(
          "relative z-10 text-center px-4 max-w-5xl mx-auto",
          "text-white"
        )}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">
            Đặt bàn nhanh chóng - Ưu tiên hàng đầu
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className={cn(
            "text-5xl md:text-7xl lg:text-8xl font-bold mb-6",
            "bg-gradient-to-r from-white via-primary to-secondary",
            "bg-clip-text text-transparent",
            "leading-tight"
          )}
        >
          Đặt Bàn Bar
          <br />
          <span className="text-white">Dễ Dàng Hơn Bao Giờ Hết</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto"
        >
          Khám phá và đặt bàn tại những quán bar hàng đầu. 
          Trải nghiệm dịch vụ đẳng cấp với chỉ vài cú click.
        </motion.p>

        {/* Feature Icons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="flex flex-wrap justify-center gap-8 mb-12"
        >
          {[
            { icon: Calendar, text: "Chọn ngày giờ", color: "text-primary" },
            { icon: Users, text: "Số lượng khách", color: "text-secondary" },
            { icon: Clock, text: "Xác nhận nhanh", color: "text-primary" },
          ].map((item, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center gap-3"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className={cn(
                  "w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm",
                  "flex items-center justify-center border border-white/20",
                  "hover:bg-white/20 transition-colors"
                )}
                animate={floatingAnimation}
                transition={{ ...floatingAnimation.transition, delay: index * 0.2 }}
              >
                <item.icon className={cn("w-8 h-8", item.color)} />
              </motion.div>
              <span className="text-sm text-gray-300 font-medium">
                {item.text}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <motion.button
            onClick={() => navigate("/register")}
            className={cn(
              "px-8 py-4 rounded-xl font-bold text-lg",
              "bg-gradient-to-r from-primary to-secondary",
              "text-white shadow-lg shadow-primary/50",
              "hover:shadow-xl hover:shadow-primary/70",
              "transition-all duration-300",
              "relative overflow-hidden group"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10">Đặt Bàn Ngay</span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-secondary to-primary"
              initial={{ x: "-100%" }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>

          <motion.button
            onClick={() => {
              const searchSection = document.getElementById("search-section");
              searchSection?.scrollIntoView({ behavior: "smooth" });
            }}
            className={cn(
              "px-8 py-4 rounded-xl font-bold text-lg",
              "bg-white/10 backdrop-blur-sm border border-white/20",
              "text-white hover:bg-white/20",
              "transition-all duration-300"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Khám Phá Bar
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center"
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-1 h-3 bg-white/50 rounded-full mt-2"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

