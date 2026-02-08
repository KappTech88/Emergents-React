import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useDragParameter - Hook for drag-to-adjust parameter values
 *
 * Features:
 * - Vertical drag to increase/decrease values
 * - Configurable min/max/step
 * - Sensitivity control
 * - Visual feedback via cursor
 */
export const useDragParameter = ({
  initialValue = 0,
  min = 0,
  max = 100,
  step = 1,
  sensitivity = 1,
  onUpdate,
  onDragStart,
  onDragEnd
} = {}) => {
  const [value, setValue] = useState(initialValue);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({
    startY: 0,
    startValue: 0
  });

  const handleMouseDown = useCallback((e, currentValue = value) => {
    e.preventDefault();
    setIsDragging(true);
    dragState.current.startY = e.clientY;
    dragState.current.startValue = currentValue;
    document.body.style.cursor = 'ns-resize';
    onDragStart?.(currentValue);
  }, [value, onDragStart]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const deltaY = dragState.current.startY - e.clientY;
    const range = max - min;
    const deltaValue = (deltaY * sensitivity * range) / 200;

    let newValue = dragState.current.startValue + deltaValue;

    // Snap to step
    newValue = Math.round(newValue / step) * step;
    // Clamp to range
    newValue = Math.max(min, Math.min(max, newValue));

    setValue(newValue);
    onUpdate?.(newValue);
  }, [isDragging, min, max, step, sensitivity, onUpdate]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = 'default';
      onDragEnd?.(value);
    }
  }, [isDragging, value, onDragEnd]);

  // Global mouse events for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const reset = useCallback(() => {
    setValue(initialValue);
    onUpdate?.(initialValue);
  }, [initialValue, onUpdate]);

  return {
    value,
    setValue,
    isDragging,
    handleMouseDown,
    reset,
    // Bind these to the element
    dragProps: {
      onMouseDown: handleMouseDown,
      style: { cursor: isDragging ? 'ns-resize' : 'ns-resize' }
    }
  };
};

/**
 * DraggableValue - Component wrapper for drag-adjustable values
 */
export const DraggableValue = ({
  value,
  min,
  max,
  step,
  sensitivity,
  onUpdate,
  format = (v) => v.toFixed(1),
  className = '',
  children
}) => {
  const { isDragging, handleMouseDown } = useDragParameter({
    initialValue: value,
    min,
    max,
    step,
    sensitivity,
    onUpdate
  });

  return (
    <span
      className={`draggable-value ${isDragging ? 'dragging' : ''} ${className}`}
      onMouseDown={(e) => handleMouseDown(e, value)}
      title="Drag up/down to adjust"
    >
      {children || format(value)}
    </span>
  );
};

export default useDragParameter;
