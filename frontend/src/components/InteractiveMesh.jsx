import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * InteractiveMesh - A mesh wrapper that adds hover and click interactions
 *
 * Features:
 * - Smooth scale animation on hover
 * - Emissive glow effect on hover
 * - Cursor change on hover
 * - Click callback
 * - Respects reduced motion preferences
 */
const InteractiveMesh = forwardRef(({
  children,
  onHover,
  onUnhover,
  onClick,
  onSelect,
  // eslint-disable-next-line no-unused-vars
  hoverColor = '#22d3ee',
  hoverScale = 1.08,
  hoverEmissiveIntensity = 0.8,
  baseEmissiveIntensity = 0.3,
  disabled = false,
  selected = false,
  tooltip,
  objectId,
  reducedMotion = false,
  ...props
}, ref) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const originalScale = useRef(new THREE.Vector3(1, 1, 1));

  // Expose mesh ref to parent
  useImperativeHandle(ref, () => meshRef.current);

  // Store original scale on first render
  useFrame((state, delta) => {
    if (!meshRef.current || disabled) return;

    // Initialize original scale
    if (originalScale.current.equals(new THREE.Vector3(1, 1, 1)) && meshRef.current.scale) {
      originalScale.current.copy(meshRef.current.scale);
    }

    // Target scale based on hover/selected state
    const targetScaleMultiplier = (hovered || selected) ? hoverScale : 1;
    const targetScale = originalScale.current.clone().multiplyScalar(targetScaleMultiplier);

    // Smooth or instant transition based on reduced motion
    if (reducedMotion) {
      meshRef.current.scale.copy(targetScale);
    } else {
      meshRef.current.scale.lerp(targetScale, delta * 10);
    }

    // Animate emissive intensity if material supports it
    const material = meshRef.current.material;
    if (material && material.emissiveIntensity !== undefined) {
      const targetEmissive = (hovered || selected) ? hoverEmissiveIntensity : baseEmissiveIntensity;

      if (reducedMotion) {
        material.emissiveIntensity = targetEmissive;
      } else {
        material.emissiveIntensity = THREE.MathUtils.lerp(
          material.emissiveIntensity,
          targetEmissive,
          delta * 10
        );
      }
    }
  });

  const handlePointerOver = (e) => {
    if (disabled) return;
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
    onHover?.(e, { objectId, tooltip });
  };

  const handlePointerOut = (e) => {
    if (disabled) return;
    setHovered(false);
    document.body.style.cursor = 'default';
    onUnhover?.(e, { objectId });
  };

  const handleClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
    setClicked(!clicked);
    onClick?.(e, { objectId, tooltip, clicked: !clicked });
    onSelect?.(objectId);
  };

  const handlePointerDown = (e) => {
    if (disabled) return;
    e.stopPropagation();
    document.body.style.cursor = 'grabbing';
  };

  const handlePointerUp = (e) => {
    if (disabled) return;
    document.body.style.cursor = hovered ? 'pointer' : 'default';
  };

  return (
    <mesh
      ref={meshRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      {...props}
    >
      {children}
    </mesh>
  );
});

InteractiveMesh.displayName = 'InteractiveMesh';

/**
 * InteractiveGroup - Same as InteractiveMesh but for groups
 */
export const InteractiveGroup = forwardRef(({
  children,
  onHover,
  onUnhover,
  onClick,
  disabled = false,
  ...props
}, ref) => {
  const groupRef = useRef();

  useImperativeHandle(ref, () => groupRef.current);

  const handlePointerOver = (e) => {
    if (disabled) return;
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    onHover?.(e);
  };

  const handlePointerOut = (e) => {
    if (disabled) return;
    document.body.style.cursor = 'default';
    onUnhover?.(e);
  };

  const handleClick = (e) => {
    if (disabled) return;
    e.stopPropagation();
    onClick?.(e);
  };

  return (
    <group
      ref={groupRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      {...props}
    >
      {children}
    </group>
  );
});

InteractiveGroup.displayName = 'InteractiveGroup';

export default InteractiveMesh;
