import React, { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Horizontal Date Picker Component
 * Hiển thị 7 ngày tiếp theo dưới dạng horizontal scrollable list
 * Giống như các app đặt phim
 */
export default function HorizontalDatePicker({
  selectedDate, // ISO format YYYY-MM-DD
  onDateChange, // (date: string) => void, ISO format
  minDate, // Date object, default: tomorrow
  error,
  disabled = false,
  className = ""
}) {
  const scrollRef = useRef(null);
  const dateInputRef = useRef(null);

  // Generate 7 days starting from tomorrow (or minDate)
  const generateDates = () => {
    const dates = [];
    const startDate = minDate || (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    })();

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }

    return dates;
  };

  const dates = generateDates();

  // Vietnamese day names
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  // Format date to ISO (YYYY-MM-DD)
  const formatToISO = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format date to display (dd/MM/yyyy)
  const formatToDisplay = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Handle date selection
  const handleDateClick = (date) => {
    if (disabled) return;
    const isoDate = formatToISO(date);
    onDateChange(isoDate);
  };

  // Handle "See More" click
  const handleSeeMoreClick = () => {
    if (disabled) return;
    // Trigger click on hidden date input
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.();
      // Fallback: trigger click if showPicker is not supported
      if (!dateInputRef.current.showPicker) {
        dateInputRef.current.click();
      }
    }
  };

  // Handle full date picker change
  const handleFullDateChange = (e) => {
    const selectedValue = e.target.value;
    if (selectedValue) {
      onDateChange(selectedValue);
    }
  };

  // Scroll to selected date on mount or when selectedDate changes
  useEffect(() => {
    if (scrollRef.current && selectedDate) {
      const selectedIndex = dates.findIndex(
        (date) => formatToISO(date) === selectedDate
      );
      if (selectedIndex >= 0) {
        const dateElement = scrollRef.current.children[selectedIndex];
        if (dateElement) {
          dateElement.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center"
          });
        }
      }
    }
  }, [selectedDate]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Horizontal scrollable date list */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none"
          }}
        >
          {/* Date items */}
          {dates.map((date, index) => {
            const isoDate = formatToISO(date);
            const isSelected = selectedDate === isoDate;
            const dayOfWeek = dayNames[date.getDay()];
            const dayNumber = date.getDate();

            return (
              <button
                key={isoDate}
                type="button"
                onClick={() => handleDateClick(date)}
                disabled={disabled}
                className={cn(
                  "flex-shrink-0 w-16 p-3 rounded-lg border-2 transition-all",
                  "flex flex-col items-center justify-center gap-1",
                  "min-w-[64px]",
                  disabled && "opacity-50 cursor-not-allowed",
                  isSelected
                    ? "bg-blue-500 border-blue-500 text-white shadow-md scale-105"
                    : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 hover:border-gray-300"
                )}
              >
                <span className="text-xs font-semibold">{dayOfWeek}</span>
                <span className={cn(
                  "text-base font-bold",
                  isSelected ? "text-white" : "text-gray-700"
                )}>
                  {dayNumber}
                </span>
              </button>
            );
          })}

          {/* "See More" button */}
          <button
            type="button"
            onClick={handleSeeMoreClick}
            disabled={disabled}
            className={cn(
              "flex-shrink-0 w-16 p-3 rounded-lg border-2 transition-all",
              "flex flex-col items-center justify-center gap-1",
              "min-w-[64px]",
              disabled && "opacity-50 cursor-not-allowed",
              "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 hover:border-gray-300"
            )}
          >
            <Calendar size={16} className="text-gray-600" />
            <span className="text-xs font-semibold">Xem thêm</span>
          </button>
        </div>
      </div>

      {/* Full date picker (hidden input) */}
      <input
        ref={dateInputRef}
        type="date"
        value={selectedDate || ""}
        onChange={handleFullDateChange}
        min={formatToISO(dates[0])}
        className="sr-only"
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
      />

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1 text-sm text-danger">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

