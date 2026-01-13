import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../utils/cn";
import { useTranslation } from "react-i18next";

export function AnimatedSearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <section id="search-section" className="py-12 px-4 bg-background">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
            Tìm Kiếm Quán Bar Yêu Thích
          </h2>
          <p className="text-muted-foreground">
            Khám phá hàng trăm quán bar tuyệt vời trong thành phố
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={cn(
            "relative",
            isFocused && "scale-[1.02] transition-transform duration-300"
          )}
        >
          <motion.div
            className={cn(
              "relative flex items-center",
              "bg-card border-2 rounded-2xl",
              "shadow-lg",
              isFocused 
                ? "border-primary shadow-primary/20" 
                : "border-border shadow-border/10"
            )}
            animate={{
              boxShadow: isFocused
                ? "0 20px 40px rgba(var(--primary), 0.2)"
                : "0 10px 20px rgba(0, 0, 0, 0.1)",
            }}
            transition={{ duration: 0.3 }}
          >
            <Search
              className={cn(
                "absolute left-6 top-1/2 -translate-y-1/2 z-10",
                "w-5 h-5 transition-colors duration-300",
                isFocused ? "text-primary" : "text-muted-foreground"
              )}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t('landing.searchPlaceholder', 'Tìm kiếm quán bar, DJ, sự kiện...')}
              className={cn(
                "w-full pl-14 pr-32 py-4 md:py-5",
                "text-base md:text-lg",
                "bg-transparent text-card-foreground",
                "outline-none",
                "placeholder:text-muted-foreground/60"
              )}
            />
            <motion.button
              type="submit"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2",
                "px-6 py-3 rounded-xl",
                "bg-gradient-to-r from-primary to-secondary",
                "text-white font-semibold",
                "shadow-lg shadow-primary/30",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              disabled={!searchQuery.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('landing.searchButton', 'Tìm kiếm')}
            </motion.button>
          </motion.div>

          {/* Quick Filters */}
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mt-4 flex flex-wrap gap-3 justify-center"
              >
                {[
                  { icon: MapPin, text: "Gần đây", color: "text-primary" },
                  { icon: Calendar, text: "Hôm nay", color: "text-secondary" },
                ].map((filter, index) => (
                  <motion.button
                    key={index}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg",
                      "bg-card border border-border",
                      "text-muted-foreground hover:text-foreground",
                      "hover:border-primary transition-all"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <filter.icon className={cn("w-4 h-4", filter.color)} />
                    <span className="text-sm font-medium">{filter.text}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>
      </div>
    </section>
  );
}

