import { useRef, useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function WebcamDraggable({ 
  children, 
  position, 
  onPositionChange,
  containerRef 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [currentPosition, setCurrentPosition] = useState(position);
  const elementRef = useRef(null);
  
  // Debounced position change handler
  const debouncedPositionChange = useRef(
    debounce((newPosition) => {
      onPositionChange(newPosition);
    }, 50) // 50ms debounce for smooth updates
  ).current;

  const handleMouseDown = useCallback((e) => {
    if (e.target.classList.contains('resize-handle')) {
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: position.width,
        height: position.height,
      });
    } else {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - (position.x / 100) * (containerRef?.current?.offsetWidth || 1920),
        y: e.clientY - (position.y / 100) * (containerRef?.current?.offsetHeight || 1080),
      });
    }
    e.preventDefault();
  }, [position, containerRef]);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef?.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    if (isDragging) {
      const newX = ((e.clientX - dragStart.x) / containerWidth) * 100;
      const newY = ((e.clientY - dragStart.y) / containerHeight) * 100;

      // Constrain to container bounds
      const constrainedX = Math.max(0, Math.min(100 - currentPosition.width, newX));
      const constrainedY = Math.max(0, Math.min(100 - currentPosition.height, newY));

      const newPosition = {
        ...currentPosition,
        x: constrainedX,
        y: constrainedY,
      };
      
      // Update local state immediately for smooth UI
      setCurrentPosition(newPosition);
      // Debounce the callback to parent
      debouncedPositionChange(newPosition);
    } else if (isResizing) {
      const deltaX = ((e.clientX - resizeStart.x) / containerWidth) * 100;
      const deltaY = ((e.clientY - resizeStart.y) / containerHeight) * 100;

      const newWidth = Math.max(10, Math.min(50, resizeStart.width + deltaX));
      const newHeight = Math.max(10, Math.min(50, resizeStart.height + deltaY));

      // Maintain aspect ratio (optional - can be removed if free resize is desired)
      const aspectRatio = resizeStart.width / resizeStart.height;
      const finalWidth = newWidth;
      const finalHeight = finalWidth / aspectRatio;

      // Ensure webcam doesn't go outside bounds
      const maxX = 100 - finalWidth;
      const maxY = 100 - finalHeight;
      const constrainedX = Math.min(currentPosition.x, maxX);
      const constrainedY = Math.min(currentPosition.y, maxY);

      const newPosition = {
        x: constrainedX,
        y: constrainedY,
        width: finalWidth,
        height: finalHeight,
      };
      
      // Update local state immediately for smooth UI
      setCurrentPosition(newPosition);
      // Debounce the callback to parent
      debouncedPositionChange(newPosition);
    }
  }, [isDragging, isResizing, dragStart, resizeStart, currentPosition, containerRef, debouncedPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    // Ensure final position is synced
    onPositionChange(currentPosition);
  }, [currentPosition, onPositionChange]);
  
  // Sync position when prop changes externally
  useEffect(() => {
    setCurrentPosition(position);
  }, [position]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      className="absolute cursor-move select-none"
      style={{
        left: `${currentPosition.x}%`,
        top: `${currentPosition.y}%`,
        width: `${currentPosition.width}%`,
        height: `${currentPosition.height}%`,
        border: isDragging || isResizing ? '2px solid rgb(var(--primary))' : '2px solid rgba(var(--primary), 0.5)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 10,
        transition: isDragging || isResizing ? 'none' : 'all 0.2s ease',
      }}
    >
      {children}
      {/* Resize handle */}
      <div
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        style={{
          backgroundColor: 'rgb(var(--primary))',
          borderRadius: '0 0 8px 0',
        }}
      />
    </div>
  );
}

WebcamDraggable.propTypes = {
  children: PropTypes.node.isRequired,
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  onPositionChange: PropTypes.func.isRequired,
  containerRef: PropTypes.object,
};

