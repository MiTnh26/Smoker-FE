import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { cn } from "../../../../utils/cn";

export default function ReadMoreText({ text, maxLines = 3, className = "" }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      // Check if text exceeds maxLines
      const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * maxLines;
      const actualHeight = textRef.current.scrollHeight;
      
      if (actualHeight > maxHeight) {
        setShowReadMore(true);
      } else {
        setShowReadMore(false);
      }
    }
  }, [text, maxLines]);

  if (!text || !text.trim()) return null;

  return (
    <div className={cn("relative w-full", className)}>
      <div
        ref={textRef}
        className={cn(
          "break-words whitespace-pre-wrap leading-6 text-foreground",
          !isExpanded && "line-clamp-3"
        )}
        style={{
          WebkitLineClamp: isExpanded ? 'none' : maxLines,
          display: isExpanded ? 'block' : '-webkit-box',
          WebkitBoxOrient: 'vertical',
          overflow: isExpanded ? 'visible' : 'hidden',
        }}
      >
        {text.split('\n').map((line, idx) => (
          <span key={idx}>
            {line}
            {idx < text.split('\n').length - 1 && <br />}
          </span>
        ))}
      </div>
      {showReadMore && (
        <button
          className={cn(
            "bg-transparent border-none text-primary cursor-pointer",
            "py-1 mt-1 text-sm font-medium",
            "transition-colors duration-200",
            "hover:opacity-80 hover:underline",
            "focus:outline-none focus:underline"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Thu gọn' : '...xem thêm'}
        </button>
      )}
    </div>
  );
}

ReadMoreText.propTypes = {
  text: PropTypes.string,
  maxLines: PropTypes.number,
  className: PropTypes.string,
};

