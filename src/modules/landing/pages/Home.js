import React, { useEffect, useState } from "react";
import { Header } from "../components/Header";
import { BookingHero } from "../components/BookingHero";
import { BookingFeatures } from "../components/BookingFeatures";
import { BookingCTA } from "../components/BookingCTA";
import { AnimatedSearchBar } from "../components/AnimatedSearchBar";
import { FeaturedVenues } from "../components/FeaturedVenues";
import barPageApi from "../../../api/barPageApi";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
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
          setError(err?.response?.data?.message || err.message || t('landing.loadFailed'));
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
        {/* Hero Section với Animation */}
        <BookingHero />
        
        {/* Search Section với Animation */}
        <AnimatedSearchBar />
        
        {/* Features Section với Animation */}
        <BookingFeatures />
        
        {/* Featured Venues */}
        <div className="container mx-auto px-4 py-8">
          <FeaturedVenues venues={featuredBars} loading={loading} error={error} />
        </div>
        
        {/* CTA Section với Animation */}
        <BookingCTA />
      </main>
    </div>
  );
}
