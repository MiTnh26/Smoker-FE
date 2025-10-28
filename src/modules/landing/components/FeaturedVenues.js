import React from "react";
import { Card } from "../../../components/common/Card";
import { Star, MapPin, Music } from "lucide-react";
import "../../../styles/components/featuredVenues.css";

const venues = [
  { id: 1, name: "Sky Lounge", image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/attachments/gen-images/public/dancers-performing-at-club-B4fjt1N73DL8ovq9vFHDcFrGdjePpZ.jpg", rating: 4.8, location: "Quận 1, TP.HCM", type: "Rooftop Bar", description: "Bar sang trọng với tầm nhìn toàn cảnh thành phố" },
  { id: 2, name: "Neon Club", image: "/neon-nightclub-interior.jpg", rating: 4.9, location: "Quận 3, TP.HCM", type: "Night Club", description: "Club hiện đại với hệ thống âm thanh đẳng cấp" },
  { id: 3, name: "Jazz Corner", image: "/jazz-bar-interior.jpg", rating: 4.7, location: "Quận 2, TP.HCM", type: "Jazz Bar", description: "Không gian jazz ấm cúng và sang trọng" },
  { id: 4, name: "Electric Pulse", image: "/electronic-music-club.jpg", rating: 4.6, location: "Quận 7, TP.HCM", type: "EDM Club", description: "Trung tâm nhạc điện tử sôi động nhất" },
  { id: 5, name: "Velvet Lounge", image: "/velvet-lounge-bar.jpg", rating: 4.8, location: "Quận Bình Thạnh", type: "Cocktail Bar", description: "Bar cocktail với không gian vintage độc đáo" },
  { id: 6, name: "Rhythm House", image: "/live-music-venue.jpg", rating: 4.9, location: "Quận 10, TP.HCM", type: "Live Music", description: "Sân khấu live music với các ban nhạc hàng đầu" },
];

export function FeaturedVenues() {
  return (
    <section className="py-8">
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Quán Bar Nổi Bật</h2>
        <p className="text-muted-foreground text-lg">Khám phá những địa điểm giải trí hàng đầu trong thành phố</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => (
          <Card key={venue.id} className="venue-card">
            <div className="venue-image-wrapper">
              <img src={venue.image || "/placeholder.svg"} alt={venue.name} />
              <div className="venue-gradient" />
              <div className="venue-rating">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span>{venue.rating}</span>
              </div>
            </div>

            <div className="venue-content">
              <div className="venue-header">
                <h3 className="venue-name">{venue.name}</h3>
                <span className="venue-type">{venue.type}</span>
              </div>
              <p className="venue-desc">{venue.description}</p>
              <div className="venue-info">
                <div>
                  <MapPin />
                  <span>{venue.location}</span>
                </div>
                <div>
                  <Music />
                  <span>Live</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
