import { useState, useCallback, useEffect } from 'react';

/**
 * Cursor states for 3D interactions
 */
export const CursorState = {
  DEFAULT: 'default',
  POINTER: 'pointer',
  GRAB: 'grab',
  GRABBING: 'grabbing',
  CROSSHAIR: 'crosshair',
  ZOOM_IN: 'zoom-in',
  ZOOM_OUT: 'zoom-out',
  MOVE: 'move',
  NOT_ALLOWED: 'not-allowed'
};

/**
 * Hook for managing cursor state during 3D interactions
 * Provides hover detection, cursor changes, and interaction tracking
 */
export const useInteractiveCursor = () => {
  const [cursor, setCursor] = useState(CursorState.DEFAULT);
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredObject, setHoveredObject] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOrbiting, setIsOrbiting] = useState(false);

  // Update document cursor when state changes
  useEffect(() => {
    document.body.style.cursor = cursor;
    return () => {
      document.body.style.cursor = 'default';
    };
  }, [cursor]);

  const onPointerEnter = useCallback((objectId, metadata = {}, cursorType = CursorState.POINTER) => {
    setIsHovering(true);
    setHoveredObject({ id: objectId, ...metadata });
    setCursor(cursorType);
  }, []);

  const onPointerLeave = useCallback(() => {
    setIsHovering(false);
    setHoveredObject(null);
    if (!isDragging && !isOrbiting) {
      setCursor(CursorState.DEFAULT);
    }
  }, [isDragging, isOrbiting]);

  const onPointerDown = useCallback((e) => {
    if (e?.button === 0) { // Left click
      setIsDragging(true);
      setCursor(CursorState.GRABBING);
    }
  }, []);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
    if (isHovering) {
      setCursor(CursorState.POINTER);
    } else if (!isOrbiting) {
      setCursor(CursorState.DEFAULT);
    }
  }, [isHovering, isOrbiting]);

  const startOrbiting = useCallback(() => {
    setIsOrbiting(true);
    setCursor(CursorState.GRABBING);
  }, []);

  const stopOrbiting = useCallback(() => {
    setIsOrbiting(false);
    if (isHovering) {
      setCursor(CursorState.POINTER);
    } else {
      setCursor(CursorState.DEFAULT);
    }
  }, [isHovering]);

  const resetCursor = useCallback(() => {
    setIsHovering(false);
    setHoveredObject(null);
    setIsDragging(false);
    setIsOrbiting(false);
    setCursor(CursorState.DEFAULT);
  }, []);

  return {
    cursor,
    setCursor,
    isHovering,
    hoveredObject,
    isDragging,
    isOrbiting,
    onPointerEnter,
    onPointerLeave,
    onPointerDown,
    onPointerUp,
    startOrbiting,
    stopOrbiting,
    resetCursor
  };
};

export default useInteractiveCursor;
