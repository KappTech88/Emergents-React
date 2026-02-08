import React, { useRef, useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

/**
 * InteractiveOrbitScene - Scene wrapper with mouse-based orbit controls
 *
 * Features:
 * - Mouse drag to orbit camera
 * - Mouse wheel to zoom
 * - Touch gestures on mobile
 * - Auto-rotate option
 * - Orbit constraints (min/max distance, angles)
 */
const InteractiveOrbitScene = ({
  children,
  enableOrbit = true,
  enableZoom = true,
  enablePan = false,
  autoRotate = false,
  autoRotateSpeed = 0.5,
  minDistance = 3,
  maxDistance = 30,
  minPolarAngle = 0,
  maxPolarAngle = Math.PI,
  zoomSpeed = 0.5,
  rotateSpeed = 0.5,
  dampingFactor = 0.05,
  enableDamping = true,
  onOrbitStart,
  onOrbitEnd,
  onZoom
}) => {
  const controlsRef = useRef();
  const [isOrbiting, setIsOrbiting] = useState(false);

  const handleStart = useCallback(() => {
    setIsOrbiting(true);
    document.body.style.cursor = 'grabbing';
    onOrbitStart?.();
  }, [onOrbitStart]);

  const handleEnd = useCallback(() => {
    setIsOrbiting(false);
    document.body.style.cursor = 'default';
    onOrbitEnd?.();
  }, [onOrbitEnd]);

  const handleChange = useCallback((e) => {
    // Can be used to track camera changes
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[-10, 10, 10]} intensity={2} color="#22d3ee" />
      <pointLight position={[10, -10, -10]} intensity={2} color="#ec4899" />

      {/* Background stars */}
      <Stars radius={100} depth={50} count={2000} factor={4} fade speed={0.5} />

      {/* Fog for depth */}
      <fog attach="fog" args={['#050505', 10, 80]} />

      {/* Orbit Controls */}
      {enableOrbit && (
        <OrbitControls
          ref={controlsRef}
          enablePan={enablePan}
          enableZoom={enableZoom}
          enableRotate={enableOrbit}
          minDistance={minDistance}
          maxDistance={maxDistance}
          minPolarAngle={minPolarAngle}
          maxPolarAngle={maxPolarAngle}
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
          zoomSpeed={zoomSpeed}
          rotateSpeed={rotateSpeed}
          enableDamping={enableDamping}
          dampingFactor={dampingFactor}
          onStart={handleStart}
          onEnd={handleEnd}
          onChange={handleChange}
          makeDefault
        />
      )}

      {/* Scene content */}
      {children}
    </>
  );
};

/**
 * CameraController - Programmatic camera control hook result wrapper
 */
export const CameraController = ({ target, zoom, onReady }) => {
  const { camera } = useThree();
  const controlsRef = useRef();

  const resetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  const focusOn = useCallback((position, duration = 1000) => {
    if (controlsRef.current) {
      controlsRef.current.target.set(...position);
    }
  }, []);

  React.useEffect(() => {
    onReady?.({ resetCamera, focusOn, controls: controlsRef.current });
  }, [onReady, resetCamera, focusOn]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={target}
      enableDamping
      dampingFactor={0.05}
    />
  );
};

export default InteractiveOrbitScene;
