import { memo } from "react";
import PropTypes from "prop-types";
import { Check } from "lucide-react";
import { cn } from "../../../../utils/cn";

// Default backgrounds - can be replaced with API call
const DEFAULT_BACKGROUNDS = [
  { id: "none", name: "Không có nền", url: null },
  { id: "blur", name: "Làm mờ", url: "blur" },
  { id: "gradient1", name: "Gradient 1", url: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: "gradient2", name: "Gradient 2", url: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { id: "gradient3", name: "Gradient 3", url: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { id: "gradient4", name: "Gradient 4", url: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  { id: "solid1", name: "Màu đơn 1", url: "#1a1a1a" },
  { id: "solid2", name: "Màu đơn 2", url: "#ffffff" },
  { id: "solid3", name: "Màu đơn 3", url: "#00b2ff" },
];

function BackgroundLibrary({ selectedBackground, onSelect }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs sm:text-sm font-semibold" style={{ color: 'rgb(var(--foreground))' }}>
        Chọn nền
      </h4>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {DEFAULT_BACKGROUNDS.map((bg) => (
          <button
            key={bg.id}
            onClick={() => onSelect(bg.id === "none" ? null : bg)}
            className={cn(
              "relative aspect-square rounded-md border-2 overflow-hidden transition-all duration-200 hover:scale-105",
              selectedBackground?.id === bg.id && "ring-2"
            )}
            style={{
              backgroundColor: bg.url && bg.url !== "blur" && !bg.url.startsWith("linear-gradient") && !bg.url.startsWith("#") 
                ? 'rgb(var(--muted))' 
                : bg.url === "blur" 
                  ? 'rgb(var(--muted))' 
                  : bg.url || 'rgb(var(--muted))',
              backgroundImage: bg.url && (bg.url.startsWith("linear-gradient") || bg.url.startsWith("#")) ? bg.url : undefined,
              borderColor: selectedBackground?.id === bg.id ? 'rgb(var(--primary))' : 'rgb(var(--border))',
              boxShadow: selectedBackground?.id === bg.id ? '0 0 0 2px rgba(var(--primary), 0.2)' : 'none',
            }}
          >
            {bg.url === "blur" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full backdrop-blur-md border" style={{ borderColor: 'rgb(var(--border))' }} />
              </div>
            )}
            {selectedBackground?.id === bg.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                <Check className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: 'rgb(var(--primary))' }} />
              </div>
            )}
            {bg.id === "none" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] sm:text-xs" style={{ color: 'rgb(var(--muted-foreground))' }}>Không</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

BackgroundLibrary.propTypes = {
  selectedBackground: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
};

// Memoize to prevent unnecessary re-renders
export default memo(BackgroundLibrary);

