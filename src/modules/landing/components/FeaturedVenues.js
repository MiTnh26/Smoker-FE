import PropTypes from "prop-types";
import React, { useState, useEffect } from "react";
import { Star, MapPin, Music } from "lucide-react";
import { cn } from "../../../utils/cn";
import { locationApi } from "../../../api/locationApi";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?w=800";
const skeletonItems = ["one", "two", "three", "four", "five", "six"];

export function FeaturedVenues({ venues = [], loading = false, error = null }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [formattedAddresses, setFormattedAddresses] = useState({});

  // Fetch address names from IDs
  const fetchAddressFromIds = async (addressObj) => {
    const { detail, provinceId, districtId, wardId } = addressObj;
    const parts = [];

    if (detail) {
      parts.push(detail);
    }

    try {
      // Fetch province name
      if (provinceId) {
        const provinces = await locationApi.getProvinces();
        const province = provinces.find(p => p.id === provinceId);
        if (province) parts.push(province.name);
      }

      // Fetch district name
      if (districtId && provinceId) {
        const districts = await locationApi.getDistricts(provinceId);
        const district = districts.find(d => d.id === districtId);
        if (district) parts.push(district.name);
      }

      // Fetch ward name
      if (wardId && districtId) {
        const wards = await locationApi.getWards(districtId);
        const ward = wards.find(w => w.id === wardId);
        if (ward) parts.push(ward.name);
      }

      return parts.length > 0 ? parts.join(', ') : "Đang cập nhật địa chỉ";
    } catch (error) {
      console.error('Failed to fetch address:', error);
      return "Đang cập nhật địa chỉ";
    }
  };

  // Fetch addresses for venues that have JSON address
  useEffect(() => {
    if (!venues || venues.length === 0) return;

    const fetchAddresses = async () => {
      const addressPromises = venues.map(async (venue) => {
        const key = venue.barPageId || venue.id || venue.entityAccountId || venue.accountId;
        
        // Skip if has addressData.fullAddress (already formatted)
        if (venue.addressData?.fullAddress) {
          return { key, address: null };
        }

        // Check if address is JSON string
        if (venue.address && typeof venue.address === 'string') {
          try {
            const parsed = JSON.parse(venue.address);
            if (parsed.provinceId || parsed.districtId || parsed.wardId) {
              const formatted = await fetchAddressFromIds(parsed);
              return { key, address: formatted };
            }
          } catch (e) {
            // Not JSON string, skip - will use address as-is
            return { key, address: null };
          }
        }

        return { key, address: null };
      });

      const results = await Promise.all(addressPromises);
      const newAddresses = {};
      
      results.forEach(({ key, address }) => {
        if (address) {
          newAddresses[key] = address;
        }
      });

      if (Object.keys(newAddresses).length > 0) {
        setFormattedAddresses(prev => {
          // Only update if not already exists to avoid unnecessary re-renders
          const updated = { ...prev };
          Object.keys(newAddresses).forEach(k => {
            if (!updated[k]) {
              updated[k] = newAddresses[k];
            }
          });
          return updated;
        });
      }
    };

    fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues]);

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

  const formatAddress = (venue) => {
    const key = venue.barPageId || venue.id || venue.entityAccountId || venue.accountId;
    
    // Ưu tiên sử dụng addressData.fullAddress nếu có
    if (venue.addressData?.fullAddress) {
      return venue.addressData.fullAddress;
    }
    
    // Nếu đã có địa chỉ đã format từ API
    if (formattedAddresses[key]) {
      return formattedAddresses[key];
    }
    
    // Nếu address là chuỗi JSON, hiển thị "Đang tải..." hoặc "Đang cập nhật địa chỉ"
    if (venue.address && typeof venue.address === 'string') {
      try {
        // Thử parse JSON, nếu thành công thì đây là JSON string
        JSON.parse(venue.address);
        return "Đang tải địa chỉ...";
      } catch (e) {
        // Nếu không parse được, đây là chuỗi địa chỉ bình thường
        return venue.address;
      }
    }
    
    return venue.address || "Đang cập nhật địa chỉ";
  };

  const renderVenueCard = (venue) => {
    const key = venue.barPageId || venue.id || venue.entityAccountId || venue.accountId || venue.name;
    const image = venue.background || venue.avatar || FALLBACK_IMAGE;
    const rating = venue.averageRating;
    const reviewCount = venue.reviewCount || 0;
    const type = venue.role || "Bar";
    const phoneNumber = venue.phoneNumber || "Đang cập nhật";
    const location = formatAddress(venue);

    return (
      <div
        key={key}
        className={cn(
          "bg-card text-card-foreground rounded-lg",
          "border-[0.5px] border-border/20",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
          "overflow-hidden",
          "transition-all duration-200",
          "hover:border-border/30",
          "hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
        )}
        onMouseEnter={() => setHoveredId(String(key))}
        onMouseLeave={() => setHoveredId(null)}
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
            {phoneNumber}
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
