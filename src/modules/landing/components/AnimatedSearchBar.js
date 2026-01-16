import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Users, Hash, Video, Music } from "lucide-react";
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
    <section id="search-section" className="py-8 md:py-10 px-4 bg-background">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">
            Tìm Kiếm Bar, DJ, Dancer & Bạn Bè
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Tìm quán bar, DJ/Dancer, người dùng hoặc hashtag chỉ với một ô tìm kiếm
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
                "absolute left-4 top-1/2 -translate-y-1/2 z-10",
                "w-4 h-4 transition-colors duration-300",
                isFocused ? "text-primary" : "text-muted-foreground"
              )}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t('landing.searchPlaceholder', 'Tìm quán bar, DJ/Dancer, người dùng, hashtag...')}
              className={cn(
                "w-full pl-12 pr-28 py-3 md:py-4",
                "text-sm md:text-base",
                "bg-transparent text-card-foreground",
                "outline-none",
                "placeholder:text-muted-foreground/60"
              )}
            />
            <motion.button
              type="submit"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2",
                "px-4 py-2 rounded-xl",
                "bg-primary text-white",
                "text-sm font-semibold",
                "shadow-lg shadow-primary/30",
                "hover:bg-primary/90 transition-colors",
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
                  { icon: Users, text: "Bar / Club", color: "text-primary" },
                  { icon: Music, text: "DJ / Dancer", color: "text-secondary" },
                  { icon: Users, text: "Bạn bè", color: "text-primary" },
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

