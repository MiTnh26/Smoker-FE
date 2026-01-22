import React, { useState, useEffect, useRef } from "react";
import { cn } from "../../utils/cn";
import { renderTextWithLinks, parseTextWithLinks } from "../../utils/linkDetector";

/**
 * Component hiển thị text với nút "Xem thêm/Thu gọn" khi text quá dài
 * Tự động nhận diện và render links thành clickable elements
 * @param {string} text - Nội dung text cần hiển thị
 * @param {number} maxLength - Độ dài tối đa trước khi thu gọn (default: 150)
 * @param {string} className - CSS classes cho container
 * @param {string} textClassName - CSS classes cho text
 * @param {string} buttonClassName - CSS classes cho nút
 * @param {string} linkClassName - CSS classes cho links
 */
export default function ExpandableText({
  text = "",
  maxLength = 150,
  className = "",
  textClassName = "",
  buttonClassName = "",
  linkClassName = ""
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    // Kiểm tra xem text có dài hơn maxLength không
    if (text && text.length > maxLength) {
      setShouldShowButton(true);
    } else {
      setShouldShowButton(false);
    }
  }, [text, maxLength]);

  if (!text) return null;

  // Render text với links
  const renderContent = () => {
    const parts = isExpanded || !shouldShowButton
      ? parseTextWithLinks(text)
      : renderTextWithLinks(text, maxLength);

    return parts.map((part, index) => {
      if (part.type === 'link') {
        return (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "text-primary hover:text-primary/80 hover:underline",
              "transition-colors duration-200",
              linkClassName
            )}
          >
            {part.content}
          </a>
        );
      }
      return <span key={index}>{part.content}</span>;
    });
  };

  return (
    <div className={cn("w-full", className)}>
      <div 
        ref={textRef}
        className={cn(
          "break-words overflow-wrap-break-word",
          textClassName
        )}
      >
        {renderContent()}
        {!isExpanded && shouldShowButton && <span>...</span>}
      </div>
      {shouldShowButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "mt-1 text-primary hover:text-primary/80",
            "text-sm font-medium transition-colors duration-200",
            "bg-transparent border-none cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 rounded",
            buttonClassName
          )}
        >
          {isExpanded ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </div>
  );
}

