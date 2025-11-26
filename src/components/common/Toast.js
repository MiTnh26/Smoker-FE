import { useEffect, useState } from "react";
import { cn } from "../../utils/cn";

/**
 * Toast notification component
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the toast
 * @param {string} props.message - Message to display
 * @param {string} props.type - Type of toast: 'success', 'error', 'info'
 * @param {number} props.duration - Duration in milliseconds (default: 3000)
 * @param {Function} props.onClose - Callback when toast closes
 */
export default function Toast({ show, message, type = "success", duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          onClose?.();
        }, 300); // Wait for animation to complete
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show && !isVisible) return null;

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500",
  }[type] || "bg-green-500";

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 z-[2000] -translate-x-1/2 transform transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg",
          bgColor
        )}
      >
        {type === "success" && (
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {type === "error" && (
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
        {type === "warning" && (
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
        {type === "info" && (
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}

/**
 * ToastContainer component for managing multiple toasts
 * @param {Object} props
 * @param {Array} props.toasts - Array of toast objects with { id, message, type, duration }
 * @param {Function} props.removeToast - Function to remove a toast by id
 */
export function ToastContainer({ toasts = [], removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[2000] -translate-x-1/2 flex flex-col gap-2 items-center">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type || "info"}
          duration={toast.duration || 3000}
          onClose={() => removeToast?.(toast.id)}
        />
      ))}
    </div>
  );
}

/**
 * Individual toast item for ToastContainer
 */
function ToastItem({ id, message, type = "info", duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // Wait for animation to complete
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500",
  }[type] || "bg-blue-500";

  return (
    <div
      className={cn(
        "transform transition-all duration-300 ease-out w-full max-w-md",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg",
          bgColor
        )}
      >
        {type === "success" && (
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {type === "error" && (
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
        {type === "warning" && (
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
        {type === "info" && (
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}
