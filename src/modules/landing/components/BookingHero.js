import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Share2, Sparkles, Calendar, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../utils/cn";

export function BookingHero() {
  const navigate = useNavigate();
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
        "relative w-full h-screen min-h-[550px] md:min-h-[600px] lg:min-h-[650px] xl:min-h-[700px] 2xl:min-h-[750px] overflow-hidden",
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
      {Array.from({ length: 20 }).map((_, i) => (
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
          "relative z-10 text-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-7xl mx-auto",
          "text-white"
        )}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 lg:px-6 lg:py-3 mb-4 md:mb-5 lg:mb-6 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30"
        >
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-primary" />
          <span className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-primary">
            Social Media + Đặt Bàn + Book DJ/Dancer - Tất cả trong một
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className={cn(
            "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4",
            "text-white",
            "leading-tight px-4"
          )}
        >
          Nền Tảng Giải Trí Đêm
          <br />
          <div className="flex flex-col items-center justify-center gap-2 mt-4">
            {/* <img 
              src="/15.png" 
              alt="Smoker Logo Top" 
              className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain"
            /> */}
            <img 
              src="/13.png" 
              alt="Smoker Logo Bottom" 
              className="h-12 sm:h-16 md:h-20 lg:h-24 w-auto object-contain"
            />
          </div>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 md:mb-8 max-w-2xl mx-auto px-4"
        >
          Nơi kết nối cộng đồng yêu giải trí đêm, chia sẻ khoảnh khắc đáng nhớ và trải nghiệm dịch vụ chất lượng. 
          Đặt bàn bar uy tín, book DJ/Dancer chuyên nghiệp - Tất cả trong một nền tảng an toàn và đáng tin cậy.
        </motion.p>

        {/* Feature Icons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-6 md:mb-8 px-4"
        >
          {[
            { icon: Share2, text: "Newsfeed & Stories", color: "text-primary" },
            { icon: Calendar, text: "Đặt bàn bar", color: "text-secondary" },
            { icon: Music, text: "Book DJ/Dancer", color: "text-primary" },
          ].map((item, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center gap-3"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className={cn(
                  "w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm",
                  "flex items-center justify-center border border-white/20",
                  "hover:bg-white/20 transition-colors"
                )}
                animate={floatingAnimation}
                transition={{ ...floatingAnimation.transition, delay: index * 0.2 }}
              >
                <item.icon className={cn("w-7 h-7", item.color)} />
              </motion.div>
              <span className="text-xs sm:text-sm text-gray-300 font-medium">
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
              "px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold",
              "text-sm sm:text-base",
              "bg-primary text-white",
              "shadow-lg shadow-primary/50",
              "hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/70",
              "transition-all duration-300",
              "min-h-[44px] touch-target"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Tham Gia Ngay
          </motion.button>

          <motion.button
            onClick={() => {
              const searchSection = document.getElementById("search-section");
              searchSection?.scrollIntoView({ behavior: "smooth" });
            }}
            className={cn(
              "px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold",
              "text-sm sm:text-base",
              "bg-white/10 backdrop-blur-sm border border-white/20",
              "text-white hover:bg-white/20",
              "transition-all duration-300",
              "min-h-[44px] touch-target"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Khám Phá Newsfeed
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
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

