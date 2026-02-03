import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard Navigation Hook
 *
 * Provides keyboard shortcuts for navigating the animation showcase:
 * - Arrow Left/Right: Navigate between examples
 * - Arrow Up/Down: Navigate between categories
 * - Space: Toggle panel
 * - R: Reset controls
 * - Escape: Close panel
 * - ?: Show help
 * - 1-9: Quick jump to example
 */

const KEYBOARD_SHORTCUTS = {
  NEXT_EXAMPLE: ['ArrowRight', 'l', 'L'],
  PREV_EXAMPLE: ['ArrowLeft', 'h', 'H'],
  NEXT_CATEGORY: ['ArrowDown', 'j', 'J'],
  PREV_CATEGORY: ['ArrowUp', 'k', 'K'],
  TOGGLE_PANEL: [' '],
  CLOSE_PANEL: ['Escape'],
  RESET_CONTROLS: ['r', 'R'],
  SHOW_HELP: ['?', '/'],
  QUICK_JUMP: ['1', '2', '3', '4', '5', '6', '7', '8', '9']
};

/**
 * Custom hook for keyboard navigation
 */
export const useKeyboardNavigation = ({
  categories = [],
  activeCategory,
  setActiveCategory,
  activeExample,
  setActiveExample,
  currentAnimations = [],
  isPanelOpen,
  setIsPanelOpen,
  setControls,
  onShowHelp
}) => {
  const helpShownRef = useRef(false);

  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in inputs
    if (
      event.target.tagName === 'INPUT' ||
      event.target.tagName === 'TEXTAREA' ||
      event.target.isContentEditable
    ) {
      return;
    }

    const key = event.key;

    // Next Example
    if (KEYBOARD_SHORTCUTS.NEXT_EXAMPLE.includes(key)) {
      event.preventDefault();
      setActiveExample((prev) => {
        const next = prev + 1;
        return next < currentAnimations.length ? next : 0;
      });
      return;
    }

    // Previous Example
    if (KEYBOARD_SHORTCUTS.PREV_EXAMPLE.includes(key)) {
      event.preventDefault();
      setActiveExample((prev) => {
        const next = prev - 1;
        return next >= 0 ? next : currentAnimations.length - 1;
      });
      return;
    }

    // Next Category
    if (KEYBOARD_SHORTCUTS.NEXT_CATEGORY.includes(key)) {
      event.preventDefault();
      const currentIndex = categories.findIndex(c => c.id === activeCategory);
      const nextIndex = (currentIndex + 1) % categories.length;
      setActiveCategory(categories[nextIndex].id);
      return;
    }

    // Previous Category
    if (KEYBOARD_SHORTCUTS.PREV_CATEGORY.includes(key)) {
      event.preventDefault();
      const currentIndex = categories.findIndex(c => c.id === activeCategory);
      const prevIndex = currentIndex === 0 ? categories.length - 1 : currentIndex - 1;
      setActiveCategory(categories[prevIndex].id);
      return;
    }

    // Toggle Panel
    if (KEYBOARD_SHORTCUTS.TOGGLE_PANEL.includes(key)) {
      event.preventDefault();
      setIsPanelOpen((prev) => !prev);
      return;
    }

    // Close Panel
    if (KEYBOARD_SHORTCUTS.CLOSE_PANEL.includes(key)) {
      if (isPanelOpen) {
        event.preventDefault();
        setIsPanelOpen(false);
      }
      return;
    }

    // Reset Controls
    if (KEYBOARD_SHORTCUTS.RESET_CONTROLS.includes(key)) {
      event.preventDefault();
      setControls({});
      return;
    }

    // Show Help
    if (KEYBOARD_SHORTCUTS.SHOW_HELP.includes(key)) {
      event.preventDefault();
      if (onShowHelp) {
        onShowHelp();
      } else {
        // Default: log shortcuts to console
        console.log('%c Keyboard Shortcuts ', 'background: #22d3ee; color: #000; font-weight: bold; padding: 4px 8px;');
        console.log('← / → or H / L : Previous / Next example');
        console.log('↑ / ↓ or K / J : Previous / Next category');
        console.log('Space : Toggle panel');
        console.log('Escape : Close panel');
        console.log('R : Reset controls');
        console.log('1-9 : Quick jump to example');
        console.log('? : Show this help');
      }
      return;
    }

    // Quick Jump (1-9)
    if (KEYBOARD_SHORTCUTS.QUICK_JUMP.includes(key)) {
      event.preventDefault();
      const exampleIndex = parseInt(key, 10) - 1;
      if (exampleIndex < currentAnimations.length) {
        setActiveExample(exampleIndex);
      }
      return;
    }
  }, [
    categories,
    activeCategory,
    setActiveCategory,
    setActiveExample,
    currentAnimations,
    isPanelOpen,
    setIsPanelOpen,
    setControls,
    onShowHelp
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    // Show help hint on first load (only once)
    if (!helpShownRef.current && process.env.NODE_ENV === 'development') {
      helpShownRef.current = true;
      console.log('%c Press ? for keyboard shortcuts ', 'background: #a855f7; color: #fff; padding: 4px 8px; border-radius: 4px;');
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: KEYBOARD_SHORTCUTS
  };
};

/**
 * Keyboard shortcut help overlay component data
 */
export const SHORTCUT_HELP = [
  { keys: ['←', '→'], action: 'Navigate examples', alternative: 'H / L' },
  { keys: ['↑', '↓'], action: 'Navigate categories', alternative: 'K / J' },
  { keys: ['Space'], action: 'Toggle panel' },
  { keys: ['Esc'], action: 'Close panel' },
  { keys: ['R'], action: 'Reset controls' },
  { keys: ['1-9'], action: 'Quick jump to example' },
  { keys: ['?'], action: 'Show help' }
];

export default useKeyboardNavigation;
