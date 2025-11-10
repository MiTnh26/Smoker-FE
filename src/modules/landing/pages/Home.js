import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { HeroCarousel } from "../components/HeroCarousel";
import { SearchBar } from "../components/SearchBar";
import { FeaturedVenues } from "../components/FeaturedVenues";
import barPageApi from "../../../api/barPageApi";

export default function Home() {
  const [featuredBars, setFeaturedBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isSubscribed = true;

    async function fetchFeaturedBars() {
      setLoading(true);
      setError(null);
      try {
        const response = await barPageApi.getFeatured({ limit: 9 });
        // API returns { status, data }
        const bars = Array.isArray(response?.data) ? response.data : [];
        if (isSubscribed) {
          setFeaturedBars(bars);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err?.response?.data?.message || err.message || "Không thể tải dữ liệu");
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }

    fetchFeaturedBars();

    return () => {
      isSubscribed = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroCarousel slides={featuredBars} loading={loading} />
        <div className="container mx-auto px-4 py-8">
          <SearchBar />
          <FeaturedVenues venues={featuredBars} loading={loading} error={error} />
        </div>
      </main>
    </div>
  );
}
