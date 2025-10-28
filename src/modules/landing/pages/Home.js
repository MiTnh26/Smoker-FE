import React from "react";
import { Header } from "../components/Header";
import { HeroCarousel } from "../components/HeroCarousel";
import { SearchBar } from "../components/SearchBar";
import { FeaturedVenues } from "../components/FeaturedVenues";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroCarousel />
        <div className="container mx-auto px-4 py-8">
          <SearchBar />
          <FeaturedVenues />
        </div>
      </main>
    </div>
  );
}
