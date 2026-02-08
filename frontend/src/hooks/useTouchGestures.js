import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useTouchGestures - Hook for touch-based interactions
 *
 * Features:
 * - Pinch to zoom
 * - Two-finger rotate
 * - Swipe detection
 * - Tap detection
 * - Long press detection
 */
export const useTouchGestures = ({
  enabled = true,
  onPinchZoom,
  onRotate,
  onSwipe,
  onTap,
  onDoubleTap,
  onLongPress,
  swipeThreshold = 50,
  longPressDelay = 500,
  doubleTapDelay = 300
} = {}) => {
  const [gesture, setGesture] = useState(null);
  const touchState = useRef({
    startX: 0,
    startY: 0,
    startDistance: 0,
    startAngle: 0,
    lastTap: 0,
    longPressTimer: null,
    touches: []
  });

  const getDistance = useCallback((touches) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getAngle = useCallback((touches) => {
    if (touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }, []);

  const getCenter = useCallback((touches) => {
    if (touches.length < 2) {
      return { x: touches[0]?.clientX || 0, y: touches[0]?.clientY || 0 };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;

    const touches = Array.from(e.touches);
    touchState.current.touches = touches;

    if (touches.length === 1) {
      touchState.current.startX = touches[0].clientX;
      touchState.current.startY = touches[0].clientY;

      // Long press detection
      touchState.current.longPressTimer = setTimeout(() => {
        onLongPress?.({ x: touches[0].clientX, y: touches[0].clientY });
        setGesture('longpress');
      }, longPressDelay);

    } else if (touches.length === 2) {
      // Clear long press timer for multi-touch
      if (touchState.current.longPressTimer) {
        clearTimeout(touchState.current.longPressTimer);
      }

      touchState.current.startDistance = getDistance(touches);
      touchState.current.startAngle = getAngle(touches);
      setGesture('pinch');
    }
  }, [enabled, getDistance, getAngle, onLongPress, longPressDelay]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled) return;

    const touches = Array.from(e.touches);

    // Clear long press timer on move
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
    }

    if (touches.length === 2) {
      // Pinch zoom
      const currentDistance = getDistance(touches);
      const distanceDelta = currentDistance - touchState.current.startDistance;
      const scaleFactor = currentDistance / touchState.current.startDistance;

      if (Math.abs(distanceDelta) > 10) {
        onPinchZoom?.(scaleFactor, {
          delta: distanceDelta,
          center: getCenter(touches)
        });
        touchState.current.startDistance = currentDistance;
        setGesture('pinching');
      }

      // Two-finger rotate
      const currentAngle = getAngle(touches);
      const angleDelta = currentAngle - touchState.current.startAngle;

      if (Math.abs(angleDelta) > 5) {
        onRotate?.(angleDelta, {
          angle: currentAngle,
          center: getCenter(touches)
        });
        touchState.current.startAngle = currentAngle;
        setGesture('rotating');
      }
    }
  }, [enabled, getDistance, getAngle, getCenter, onPinchZoom, onRotate]);

  const handleTouchEnd = useCallback((e) => {
    if (!enabled) return;

    // Clear long press timer
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer);
    }

    const changedTouches = Array.from(e.changedTouches);

    if (changedTouches.length === 1 && touchState.current.touches.length === 1) {
      const dx = changedTouches[0].clientX - touchState.current.startX;
      const dy = changedTouches[0].clientY - touchState.current.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Swipe detection
      if (distance > swipeThreshold) {
        let direction;
        if (Math.abs(dx) > Math.abs(dy)) {
          direction = dx > 0 ? 'right' : 'left';
        } else {
          direction = dy > 0 ? 'down' : 'up';
        }
        onSwipe?.(direction, { dx, dy, distance });
        setGesture('swipe');
      } else {
        // Tap detection
        const now = Date.now();
        if (now - touchState.current.lastTap < doubleTapDelay) {
          onDoubleTap?.({ x: changedTouches[0].clientX, y: changedTouches[0].clientY });
          setGesture('doubletap');
          touchState.current.lastTap = 0;
        } else {
          onTap?.({ x: changedTouches[0].clientX, y: changedTouches[0].clientY });
          setGesture('tap');
          touchState.current.lastTap = now;
        }
      }
    }

    // Reset gesture after short delay
    setTimeout(() => setGesture(null), 100);
  }, [enabled, swipeThreshold, doubleTapDelay, onSwipe, onTap, onDoubleTap]);

  useEffect(() => {
    if (!enabled) return;

    const options = { passive: true };
    window.addEventListener('touchstart', handleTouchStart, options);
    window.addEventListener('touchmove', handleTouchMove, options);
    window.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);

      if (touchState.current.longPressTimer) {
        clearTimeout(touchState.current.longPressTimer);
      }
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    gesture,
    isGesturing: gesture !== null
  };
};

export default useTouchGestures;
