import { useState, useEffect } from 'react';

/**
 * Reduced Motion Hook
 *
 * Detects user's preference for reduced motion and provides
 * utilities for respecting this accessibility setting.
 *
 * This follows the Web Content Accessibility Guidelines (WCAG)
 * and respects the prefers-reduced-motion media query.
 *
 * Usage:
 * ```jsx
 * const { prefersReducedMotion, animationDuration } = useReducedMotion();
 *
 * // Skip or simplify animations when reduced motion is preferred
 * if (prefersReducedMotion) {
 *   return <StaticView />;
 * }
 * return <AnimatedView />;
 * ```
 */

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const useReducedMotion = () => {
  // Default to false (animations enabled) during SSR
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches);

      if (event.matches) {
        console.log('%c Reduced motion enabled ', 'background: #f59e0b; color: #000; padding: 2px 8px;');
      }
    };

    // Use the newer addEventListener API with fallback
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Utility function to get appropriate animation duration
  const getAnimationDuration = (normalDuration, reducedDuration = 0) => {
    return prefersReducedMotion ? reducedDuration : normalDuration;
  };

  // Utility function to get animation settings for Three.js
  const getThreeAnimationSettings = () => {
    if (prefersReducedMotion) {
      return {
        // Reduced settings for accessibility
        animationSpeed: 0,
        rotationSpeed: 0,
        wobbleFactor: 0,
        distortAmount: 0,
        particleSpeed: 0,
        scrollMultiplier: 0.1, // Still allow some scroll response
        enableParticles: false,
        enablePostProcessing: false
      };
    }

    return {
      // Normal animation settings
      animationSpeed: 1,
      rotationSpeed: 1,
      wobbleFactor: 1,
      distortAmount: 1,
      particleSpeed: 1,
      scrollMultiplier: 1,
      enableParticles: true,
      enablePostProcessing: true
    };
  };

  // Get CSS transition value
  const getTransition = (property = 'all', duration = 300, easing = 'ease') => {
    if (prefersReducedMotion) {
      return 'none';
    }
    return `${property} ${duration}ms ${easing}`;
  };

  // Check if specific animation type should be enabled
  const shouldAnimate = (animationType = 'default') => {
    if (!prefersReducedMotion) return true;

    // Some animations might still be acceptable with reduced motion
    const allowedWithReducedMotion = [
      'opacity', // Fade effects are generally acceptable
      'color',   // Color changes are acceptable
    ];

    return allowedWithReducedMotion.includes(animationType);
  };

  return {
    prefersReducedMotion,
    getAnimationDuration,
    getThreeAnimationSettings,
    getTransition,
    shouldAnimate,
    // Convenience boolean
    motionSafe: !prefersReducedMotion
  };
};

/**
 * Higher-order component for reduced motion support
 */
export const withReducedMotion = (WrappedComponent, StaticComponent = null) => {
  return function WithReducedMotionWrapper(props) {
    const { prefersReducedMotion } = useReducedMotion();

    if (prefersReducedMotion && StaticComponent) {
      return <StaticComponent {...props} />;
    }

    return <WrappedComponent {...props} reducedMotion={prefersReducedMotion} />;
  };
};

/**
 * Context value type for reduced motion settings
 */
export const defaultReducedMotionContext = {
  prefersReducedMotion: false,
  motionSafe: true
};

export default useReducedMotion;
