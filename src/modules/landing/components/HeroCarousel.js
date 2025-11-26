import PropTypes from "prop-types";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../../utils/cn";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?w=1600";

const defaultSlides = [
  {
    id: 1,
    image: FALLBACK_IMAGE,
    title: "Khám phá cuộc sống về đêm",
    description: "Tìm kiếm những quán bar và club tốt nhất trong thành phố",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1557925923-9e2014b87c18?w=1600",
    title: "Đặt DJ chuyên nghiệp",
    description: "Kết nối với những DJ hàng đầu cho sự kiện của bạn",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1600",
    title: "Vũ công tài năng",
    description: "Thuê vũ công để làm sống động bữa tiệc của bạn",
  },
  {
    id: 4,
    image: "https://images.unsplash.com/photo-1588771930296-88c22ad63305?w=1600",
    title: "Đặt bàn dễ dàng",
    description: "Đặt chỗ trước và tận hưởng đêm của bạn",
  },
];

export function HeroCarousel({ slides = [], loading = false }) {
  const slidesData = useMemo(() => {
    if (!slides || slides.length === 0) {
      return defaultSlides;
    }

    return slides.map((item, index) => ({
      id: item.barPageId || item.id || index,
      image: item.background || item.avatar || FALLBACK_IMAGE,
      title: item.barName || item.name || "Địa điểm nổi bật",
      description:
        item.address ||
        item.email ||
        "Khám phá những địa điểm giải trí hàng đầu trong thành phố",
      rating: item.averageRating,
      reviewCount: item.reviewCount,
    }));
  }, [slides]);

  const totalSlides = slidesData.length;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setCurrentSlide(0);
  }, [totalSlides]);

  const goToSlide = useCallback(
    (index) => {
      if (totalSlides <= 0) return;
      setCurrentSlide(index);
    },
    [totalSlides]
  );

  const goToPrevious = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToNext = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  // Auto-play với pause on hover
  useEffect(() => {
    if (isPaused || loading || totalSlides <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, loading, totalSlides]);

  // Keyboard navigation
  useEffect(() => {
    if (totalSlides <= 1) return;
    const target =
      typeof window !== "undefined" && window.addEventListener
        ? window
        : null;
    if (!target) return;

    const handleKeyPress = (e) => {
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };

    target.addEventListener("keydown", handleKeyPress);
    return () => target.removeEventListener("keydown", handleKeyPress);
  }, [goToPrevious, goToNext, totalSlides]);

  // Touch swipe support
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    if (totalSlides <= 1) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    if (totalSlides <= 1) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (totalSlides <= 1 || !touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) goToNext();
    if (isRightSwipe) goToPrevious();
  };

  return (
    <section
      aria-label="Địa điểm nổi bật"
      className={cn(
        "relative w-full h-[500px] md:h-[600px] mt-[73px] overflow-hidden bg-card",
        "group"
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {slidesData.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
          )}
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
            loading={index === 0 ? "eager" : "lazy"}
          />
          <div
            className={cn(
              "absolute inset-0",
              "bg-gradient-to-t",
              "from-background via-background/50 to-transparent"
            )}
          />
          <div
            className={cn(
              "absolute bottom-12 md:bottom-20 left-0 right-0",
              "text-center px-4 z-20"
            )}
          >
            <h2
              className={cn(
                "text-3xl md:text-5xl lg:text-6xl font-bold",
                "text-foreground mb-4",
                "transition-all duration-500"
              )}
            >
              {slide.title}
            </h2>
            <p
              className={cn(
                "text-base md:text-lg lg:text-xl",
                "text-muted-foreground",
                "transition-all duration-500"
              )}
            >
              {slide.description}
            </p>
            {slide.rating ? (
              <div
                className={cn(
                  "mt-4 inline-flex items-center gap-2 px-3 py-1.5",
                  "bg-background/70 backdrop-blur-sm rounded-full",
                  "border-[0.5px] border-border/30 text-sm font-medium text-foreground"
                )}
              >
                <span>{slide.rating}⭐</span>
                {slide.reviewCount ? (
                  <span className="text-muted-foreground/80">
                    ({slide.reviewCount} đánh giá)
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ))}

      {/* Navigation Buttons */}
      <button
        className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 z-30",
          "w-10 h-10 flex items-center justify-center",
          "bg-background/20 backdrop-blur-sm border-none",
          "text-foreground rounded-lg",
          "transition-all duration-200",
          "hover:bg-background/40",
          "active:scale-95",
          "opacity-0 group-hover:opacity-100"
        )}
        onClick={goToPrevious}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        className={cn(
          "absolute right-4 top-1/2 -translate-y-1/2 z-30",
          "w-10 h-10 flex items-center justify-center",
          "bg-background/20 backdrop-blur-sm border-none",
          "text-foreground rounded-lg",
          "transition-all duration-200",
          "hover:bg-background/40",
          "active:scale-95",
          "opacity-0 group-hover:opacity-100"
        )}
        onClick={goToNext}
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Slide Indicators */}
      {totalSlides > 1 ? (
        <div
          className={cn(
            "absolute bottom-4 left-1/2 -translate-x-1/2 z-30",
            "flex items-center gap-2"
          )}
        >
          {slidesData.map((slide, index) => {
            const indicatorKey = slide.id ?? index;
            return (
            <button
              key={indicatorKey}
              className={cn(
                "w-2 h-2 rounded-full border-none transition-all duration-200",
                index === currentSlide
                  ? "bg-primary w-8"
                  : "bg-muted-foreground/40 hover:bg-muted-foreground/60"
              )}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          )})}
        </div>
      ) : null}

      {loading ? (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-background/50 backdrop-blur-sm text-sm text-muted-foreground"
        >
          Đang tải địa điểm nổi bật...
        </div>
      ) : null}
    </section>
  );
}

HeroCarousel.propTypes = {
  slides: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
};

HeroCarousel.defaultProps = {
  slides: [],
  loading: false,
};
