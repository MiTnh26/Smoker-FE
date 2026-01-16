import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../utils/cn";

export function StickyCTA() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 300px
      const scrollY = window.scrollY || window.pageYOffset;
      setIsVisible(scrollY > 300 && !isDismissed);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDismissed]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50",
            "flex flex-col gap-2 sm:gap-3"
          )}
        >
          {/* Book Now Button */}
          <motion.button
            onClick={() => navigate("/register")}
              className={cn(
                "px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold",
                "text-sm sm:text-base",
                "bg-primary text-white",
                "shadow-lg shadow-primary/50",
                "hover:bg-primary/90 hover:shadow-xl",
                "transition-all duration-300",
                "flex items-center gap-2",
                "min-w-[140px] sm:min-w-[160px] justify-center",
                "min-h-[44px] touch-target",
                "backdrop-blur-sm"
              )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Tham Gia Ngay</span>
            <ArrowUp className="w-5 h-5 rotate-45" />
          </motion.button>

          {/* Scroll to Top Button */}
          <motion.button
            onClick={scrollToTop}
            className={cn(
              "w-12 h-12 sm:w-14 sm:h-14 rounded-full",
              "bg-card border-2 border-primary/30",
              "text-primary shadow-lg",
              "hover:bg-primary hover:text-white",
              "transition-all duration-300",
              "flex items-center justify-center",
              "min-h-[44px] min-w-[44px] touch-target",
              "backdrop-blur-sm"
            )}
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-6 h-6" />
          </motion.button>

          {/* Dismiss Button */}
          <motion.button
            onClick={() => setIsDismissed(true)}
            className={cn(
              "w-10 h-10 rounded-full",
              "bg-card/80 backdrop-blur-sm border border-border/50",
              "text-muted-foreground hover:text-foreground",
              "transition-all duration-300",
              "flex items-center justify-center",
              "min-h-[44px] min-w-[44px] touch-target",
              "shadow-md"
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

