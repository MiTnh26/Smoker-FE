import PropTypes from "prop-types";
import React, { useState } from "react";
import { Star, MapPin, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../utils/cn";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?w=800";
const skeletonItems = ["one", "two", "three", "four", "five", "six"];

export function FeaturedVenues({ venues = [], loading = false, error = null }) {
  const [hoveredId, setHoveredId] = useState(null);
  const navigate = useNavigate();

  const handleVenueClick = (venue) => {
    if (venue?.barPageId) {
      navigate(`/bar/${venue.barPageId}`);
    }
  };

  const renderSkeletonCard = (key) => (
    <div
      key={`skeleton-${key}`}
      className={cn(
        "bg-card rounded-lg border-[0.5px] border-border/20",
        "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
        "overflow-hidden animate-pulse"
      )}
    >
      <div className="w-full h-48 md:h-56 bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-2/3 bg-muted rounded" />
      </div>
    </div>
  );

  const renderVenueCard = (venue) => {
    const key = venue.barPageId || venue.id || venue.entityAccountId || venue.accountId || venue.name;
    const image = venue.background || venue.avatar || FALLBACK_IMAGE;
    const rating = venue.averageRating;
    const reviewCount = venue.reviewCount || 0;
    const type = venue.role || "Bar";
    const description =
      venue.description ||
      venue.address ||
      "Địa điểm giải trí nổi bật trong hệ thống Smoker";
    const location = venue.address || "Đang cập nhật địa chỉ";

    return (
      <div
        key={key}
        className={cn(
          "bg-card text-card-foreground rounded-lg",
          "border-[0.5px] border-border/20",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          "overflow-hidden cursor-pointer",
          "transition-all duration-200",
          "hover:border-border/30",
          "hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]",
          "active:scale-[0.98]"
        )}
        onMouseEnter={() => setHoveredId(String(key))}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => handleVenueClick(venue)}
      >
        <div className="relative w-full h-48 md:h-56 overflow-hidden">
          <img
            src={image}
            alt={venue.barName}
            className={cn(
              "w-full h-full object-cover transition-transform duration-300",
              hoveredId === String(key) && "scale-105"
            )}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = FALLBACK_IMAGE;
            }}
          />
          <div
            className={cn(
              "absolute inset-0",
              "bg-gradient-to-t from-background/80 via-background/20 to-transparent"
            )}
          />
          <div
            className={cn(
              "absolute top-3 right-3",
              "flex items-center gap-1",
              "px-2.5 py-1.5 rounded-lg",
              "bg-background/80 backdrop-blur-sm",
              "border-[0.5px] border-border/20"
            )}
          >
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {rating ? rating : "N/A"}
            </span>
            {reviewCount ? (
              <span className="text-xs text-muted-foreground">
                ({reviewCount})
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3
              className={cn(
                "text-lg font-semibold text-foreground",
                "transition-colors duration-200",
                hoveredId === String(key) && "text-primary"
              )}
            >
              {venue.barName}
            </h3>
            <span
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium",
                "bg-primary/10 text-primary",
                "border-[0.5px] border-primary/20"
              )}
            >
              {type}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {description}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Music className="h-4 w-4" />
              <span>Live</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="py-8">
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Quán Bar Nổi Bật
        </h2>
        <p className="text-muted-foreground text-lg">
          Khám phá những địa điểm giải trí hàng đầu trong thành phố
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && venues.length === 0
          ? skeletonItems.map(renderSkeletonCard)
          : null}

        {!loading && error ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-lg border-[0.5px] border-danger/30 bg-danger/5 p-6 text-danger">
            <p className="font-semibold">Không thể tải danh sách quán bar nổi bật</p>
            <p className="text-sm text-danger/80 mt-2">{error}</p>
          </div>
        ) : null}

        {!loading && !error && venues.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-lg border-[0.5px] border-border/20 bg-muted/30 p-6 text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Chưa có dữ liệu</p>
            <p className="text-sm">Hãy quay lại sau khi các quán bar cập nhật thông tin của họ.</p>
          </div>
        ) : null}

        {!loading && !error
          ? venues.map(renderVenueCard)
          : null}
      </div>
    </section>
  );
}

FeaturedVenues.propTypes = {
  venues: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  error: PropTypes.string,
};

FeaturedVenues.defaultProps = {
  venues: [],
  loading: false,
  error: null,
};
