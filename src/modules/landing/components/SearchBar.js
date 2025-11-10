import React, { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../utils/cn";

export function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results page with query
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className={cn(
        "relative mx-auto mb-12 max-w-2xl"
      )}
    >
      <div className={cn(
        "relative flex items-center"
      )}>
        <Search
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 z-10",
            "w-5 h-5 text-muted-foreground"
          )}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm kiếm quán bar, DJ, sự kiện..."
          className={cn(
            "w-full pl-12 pr-24 py-3.5 md:py-4",
            "text-base md:text-lg",
            "rounded-lg",
            "border-[0.5px] border-border/20",
            "bg-card text-card-foreground",
            "outline-none transition-all duration-200",
            "placeholder:text-muted-foreground/60",
            "hover:border-border/30 hover:bg-card/80",
            "focus:border-primary/40 focus:ring-1 focus:ring-primary/20 focus:bg-background"
          )}
        />
        <button
          type="submit"
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2",
            "px-4 py-2 rounded-lg",
            "bg-primary text-primary-foreground border-none",
            "font-semibold text-sm md:text-base",
            "transition-all duration-200",
            "hover:bg-primary/90",
            "active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          disabled={!searchQuery.trim()}
        >
          Tìm kiếm
        </button>
      </div>
    </form>
  );
}
