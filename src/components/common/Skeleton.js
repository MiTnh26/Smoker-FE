import React from "react";
import "../../styles/components/skeleton.css";

export default function Skeleton({ width, height, className = "", variant = "rectangular" }) {
  const style = {
    width: width || "100%",
    height: height || "1rem",
  };

  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton variant="circular" width="60px" height="60px" className="skeleton-color" />
      <Skeleton height="2.5rem" className="skeleton-input" />
      <div className="skeleton-row">
        <Skeleton width="4rem" height="1.25rem" />
        <Skeleton width="3rem" height="2rem" variant="rectangular" />
      </div>
    </div>
  );
}

