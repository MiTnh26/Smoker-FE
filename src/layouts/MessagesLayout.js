import React from "react";
import { useTranslation } from "react-i18next";
import CustomerHeader from "../components/layout/Customer/CustomerHeader";

export default function MessagesLayout({ children }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Main app header */}
      <CustomerHeader />
      {/* Slim sub-header for Messages title */}
      <div className="sticky top-16 z-40 border-b border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-10 max-w-[1400px] items-center px-4">
          <h1 className="m-0 text-base font-semibold text-foreground md:text-lg">
            {t('layout.messages')}
          </h1>
        </div>
      </div>
      <main>{children}</main>
    </div>
  );
}


