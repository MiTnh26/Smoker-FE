import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../components/common/Button";
import "../../../styles/components/heroCarousel.css";

const slides = [
  {
    id: 1,
    image: "https://i.ytimg.com/vi/cAYgz-qJq_M/maxresdefault.jpg",
    title: "Khám phá cuộc sống về đêm",
    description: "Tìm kiếm những quán bar và club tốt nhất trong thành phố",
  },
  {
    id: 2,
    image: "https://i.ytimg.com/vi/cAYgz-qJq_M/maxresdefault.jpg",
    title: "Đặt DJ chuyên nghiệp",
    description: "Kết nối với những DJ hàng đầu cho sự kiện của bạn",
  },
  {
    id: 3,
    image: "https://i.ytimg.com/vi/cAYgz-qJq_M/maxresdefault.jpg",
    title: "Vũ công tài năng",
    description: "Thuê vũ công để làm sống động bữa tiệc của bạn",
  },
  {
    id: 4,
    image: "https://i.ytimg.com/vi/cAYgz-qJq_M/maxresdefault.jpg",
    title: "Đặt bàn dễ dàng",
    description: "Đặt chỗ trước và tận hưởng đêm của bạn",
  },
];

export function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="relative w-full h-[600px] mt-[73px] overflow-hidden bg-card">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`hero-slide ${index === currentSlide ? "opacity-100" : "opacity-0"}`}
        >
          <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
          <div className="hero-gradient" />
          <div className="hero-content">
            <h2 className="hero-title">{slide.title}</h2>
            <p className="hero-desc">{slide.description}</p>
          </div>
        </div>
      ))}

      <Button className="hero-button left hero-button-bg" onClick={goToPrevious}>
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button className="hero-button right hero-button-bg" onClick={goToNext}>
        <ChevronRight className="h-6 w-6" />
      </Button>
    </div>
  );
}
