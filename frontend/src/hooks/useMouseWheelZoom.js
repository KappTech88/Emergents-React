import { useEffect, useRef, useCallback } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * useMouseWheelZoom - Hook for mouse wheel zoom in Three.js scenes
 *
 * Features:
 * - Smooth FOV-based zoom
 * - Configurable min/max limits
 * - Ctrl+wheel support for scroll-controlled scenes
 * - Callback on zoom changes
 */
export const useMouseWheelZoom = ({
  enabled = true,
  minFov = 30,
  maxFov = 80,
  zoomSpeed = 0.5,
  smoothing = true,
  ctrlRequired = true,
  onZoomChange
} = {}) => {
  const { camera } = useThree();
  const targetFov = useRef(camera.fov);
  const currentFov = useRef(camera.fov);
  const animationFrame = useRef(null);

  // Smooth animation loop
  useEffect(() => {
    if (!smoothing || !enabled) return;

    const animate = () => {
      const diff = targetFov.current - currentFov.current;
      if (Math.abs(diff) > 0.01) {
        currentFov.current += diff * 0.1;
        camera.fov = currentFov.current;
        camera.updateProjectionMatrix();
      }
      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [camera, smoothing, enabled]);

  const handleWheel = useCallback((event) => {
    if (!enabled) return;

    // Only zoom when ctrl is held (or if ctrlRequired is false)
    if (ctrlRequired && !event.ctrlKey && !event.metaKey) return;

    event.preventDefault();

    const delta = event.deltaY * zoomSpeed * 0.01;
    targetFov.current = Math.max(
      minFov,
      Math.min(maxFov, targetFov.current + delta * 10)
    );

    if (!smoothing) {
      camera.fov = targetFov.current;
      camera.updateProjectionMatrix();
    }

    onZoomChange?.(targetFov.current, {
      direction: delta > 0 ? 'out' : 'in',
      normalized: (targetFov.current - minFov) / (maxFov - minFov)
    });
  }, [enabled, ctrlRequired, zoomSpeed, minFov, maxFov, smoothing, camera, onZoomChange]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [enabled, handleWheel]);

  const resetZoom = useCallback(() => {
    targetFov.current = 55; // Default FOV
    if (!smoothing) {
      camera.fov = 55;
      camera.updateProjectionMatrix();
    }
  }, [camera, smoothing]);

  const setZoom = useCallback((fov) => {
    targetFov.current = Math.max(minFov, Math.min(maxFov, fov));
    if (!smoothing) {
      camera.fov = targetFov.current;
      camera.updateProjectionMatrix();
    }
  }, [camera, minFov, maxFov, smoothing]);

  return {
    currentFov: targetFov.current,
    resetZoom,
    setZoom,
    zoomIn: () => setZoom(targetFov.current - 5),
    zoomOut: () => setZoom(targetFov.current + 5)
  };
};

export default useMouseWheelZoom;
