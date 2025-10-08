import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../components/common/Button";
import "../../../styles/components/heroCarousel.css";

const slides = [
  {
    id: 1,
    image: "https://scontent.fhan3-2.fna.fbcdn.net/v/t39.30808-6/472715543_122193035258139387_7844404825476290492_n.png?_nc_cat=101&ccb=1-7&_nc_sid=cc71e4&_nc_eui2=AeG8ZfdIjs7ag5v1U4mJW02pTzWwsWQGxktPNbCxZAbGS_JT0oyfKkiiaqfWwCVo8SzPYAnKPUQZk2UzRYNhz6Yv&_nc_ohc=vJkF9QFXusQQ7kNvwEUSat7&_nc_oc=AdnkFO4x20iGWStaYDoxwmz8ZJ_YIrfIiiCyKjrv5j60YxnlI-FjfN6jVF06n8GFHGx6c7i-FBkZZzavokerAuxe&_nc_zt=23&_nc_ht=scontent.fhan3-2.fna&_nc_gid=UUMZatURt0_OL1OknNbtaQ&oh=00_AfdarP1_da5bfoW3A9MhRpoNnwVg8NKgNgnF_XctkQTqOw&oe=68EB01E0",
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
    image: "https://scontent.fhan3-2.fna.fbcdn.net/v/t51.82787-15/551078145_18061879499525806_8219699421428463728_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=127cfc&_nc_eui2=AeFmEBAADFumM8EU3IdUDoB7cta5aKzqNR9y1rlorOo1HyC3y_ZpSU4HVnxNjqVmNDpjmPHA7qci5jB7_rXukFf_&_nc_ohc=-DS9GBJuK6AQ7kNvwEdyWqy&_nc_oc=AdlxoY6Xsoce_4HbyWVpBtcoWIBgJmaR9bR-_xKrUh7iT8qm4FUWJB-lap5U3ASArM4QsNfpDNe2VIu_Zll1nK6I&_nc_zt=23&_nc_ht=scontent.fhan3-2.fna&_nc_gid=vi707g9NyCQyi0E8Wri2Tw&oh=00_AffZFd6ToMQJlDmZYEv-F1Vb0Ou5WOpZdwKPq6OGSvR7NA&oe=68EB059B",
    title: "Vũ công tài năng",
    description: "Thuê vũ công để làm sống động bữa tiệc của bạn",
  },
  {
    id: 4,
    image: "https://scontent.fhan3-2.fna.fbcdn.net/v/t39.30808-6/549722668_3819525718190824_6014064785523990594_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=cc71e4&_nc_eui2=AeGAUM1OhsKA3sq5rFWi-p3Y_ybrpEIwp5T_JuukQjCnlIt5hbyoB5uROXXV_Z7AUAbF_N8fPHZGLs1xShs24c4F&_nc_ohc=TEBn0zdctVQQ7kNvwHwn0UE&_nc_oc=Admp__8p4F-vMe7fZnCPgTl1QEyshS7pVG0IxB7NDRcmHusIAQvpWXehmzTqFUs_p54js5jfjBcm9ynsrTn5Djbj&_nc_zt=23&_nc_ht=scontent.fhan3-2.fna&_nc_gid=YaTFWXeUgNSWeyy15y80Vw&oh=00_AfdaZNaDx0PRTzQytrcxTqPGI4Y_QLv0oXhBwOpRsv86ug&oe=68EB2965",
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
