import React from "react";
import CustomerHeader from "../components/layout/Customer/CustomerHeader";

export default function MessagesLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Main app header */}
      <CustomerHeader />
      <main>{children}</main>
    </div>
  );
}


