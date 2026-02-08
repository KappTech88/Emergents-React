# Mouse Interaction Implementation Plan

A comprehensive plan for adding mouse-over interactions and mouse-based feedback to the Emergents-React 3D animation showcase tool.

---

## Executive Summary

The current application relies entirely on scroll-based interactions for 3D scene control. This plan introduces **mouse hover, click, and drag interactions** to transform the tool from a passive scroll-viewer into an **interactive 3D exploration environment** that matches user expectations for modern 3D web experiences.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Implementation Phases](#2-implementation-phases)
3. [Phase 1: Core Hover Feedback](#3-phase-1-core-hover-feedback)
4. [Phase 2: Interactive Camera Controls](#4-phase-2-interactive-camera-controls)
5. [Phase 3: Object Selection & Tooltips](#5-phase-3-object-selection--tooltips)
6. [Phase 4: Advanced Interactions](#6-phase-4-advanced-interactions)
7. [Technical Architecture](#7-technical-architecture)
8. [Component Specifications](#8-component-specifications)
9. [Testing Strategy](#9-testing-strategy)
10. [Accessibility Considerations](#10-accessibility-considerations)

---

## 1. Current State Analysis

### What Exists
- Scroll-based animations via `@react-three/drei` ScrollControls
- UI button hover states (CSS only)
- Keyboard navigation (comprehensive)
- Parameter sliders in right panel

### What's Missing
| Feature | Impact | User Expectation |
|---------|--------|------------------|
| Object hover highlight | High | Objects glow/change when pointed at |
| Cursor feedback | High | Cursor changes to pointer/grab in 3D |
| Click-drag orbit | High | Standard 3D navigation pattern |
| 3D tooltips | Medium | Labels on objects explaining effects |
| Object selection | Medium | Click to focus on specific element |
| Drag to adjust params | Low | Direct manipulation of 3D properties |

### Available Tools (Already Installed)
```javascript
// @react-three/drei provides:
- OrbitControls      // Mouse-based camera orbit
- useCursor          // Dynamic cursor changes
- Html               // 3D-positioned HTML overlays
- Billboard          // Always face camera
- Float              // Already used - can add hover enhancement
- useHelper          // Debugging helpers
```

---

## 2. Implementation Phases

```
Phase 1: Core Hover Feedback (Week 1)
├── Cursor state management
├── Object hover detection
├── Visual highlight on hover
└── Hover animations

Phase 2: Interactive Camera Controls (Week 2)
├── OrbitControls integration
├── Mouse wheel zoom
├── Touch gesture support
└── Camera reset functionality

Phase 3: Object Selection & Tooltips (Week 3)
├── Click-to-select system
├── 3D positioned tooltips
├── Selection indicators
└── Info panel integration

Phase 4: Advanced Interactions (Week 4)
├── Drag-to-adjust parameters
├── Multi-object selection
├── Gesture-based controls
└── Interactive code preview
```

---

## 3. Phase 1: Core Hover Feedback

### 3.1 Cursor State Management

**New Hook: `useInteractiveCursor.js`**

```javascript
// frontend/src/hooks/useInteractiveCursor.js
import { useState, useCallback } from 'react';

export const CursorState = {
  DEFAULT: 'default',
  POINTER: 'pointer',
  GRAB: 'grab',
  GRABBING: 'grabbing',
  CROSSHAIR: 'crosshair',
  ZOOM_IN: 'zoom-in',
  ZOOM_OUT: 'zoom-out'
};

export const useInteractiveCursor = () => {
  const [cursor, setCursor] = useState(CursorState.DEFAULT);
  const [isHovering, setIsHovering] = useState(false);
  const [hoveredObject, setHoveredObject] = useState(null);

  const onPointerEnter = useCallback((objectId, cursorType = CursorState.POINTER) => {
    setIsHovering(true);
    setHoveredObject(objectId);
    setCursor(cursorType);
    document.body.style.cursor = cursorType;
  }, []);

  const onPointerLeave = useCallback(() => {
    setIsHovering(false);
    setHoveredObject(null);
    setCursor(CursorState.DEFAULT);
    document.body.style.cursor = 'default';
  }, []);

  return {
    cursor,
    isHovering,
    hoveredObject,
    onPointerEnter,
    onPointerLeave,
    setCursor
  };
};
```

### 3.2 Hover-Aware Mesh Component

**New Component: `InteractiveMesh.jsx`**

```javascript
// frontend/src/components/InteractiveMesh.jsx
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const InteractiveMesh = ({
  children,
  onHover,
  onUnhover,
  onClick,
  hoverColor = '#22d3ee',
  hoverScale = 1.05,
  hoverEmissiveIntensity = 0.6,
  ...props
}) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  // Smooth hover animation
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Scale animation
    const targetScale = hovered ? hoverScale : 1;
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      delta * 8
    );

    // Emissive intensity animation (if material supports it)
    if (meshRef.current.material?.emissiveIntensity !== undefined) {
      const targetEmissive = hovered ? hoverEmissiveIntensity : 0.3;
      meshRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
        meshRef.current.material.emissiveIntensity,
        targetEmissive,
        delta * 8
      );
    }
  });

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
    onHover?.(e);
  };

  const handlePointerOut = (e) => {
    setHovered(false);
    document.body.style.cursor = 'default';
    onUnhover?.(e);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    setClicked(!clicked);
    onClick?.(e);
  };

  return (
    <mesh
      ref={meshRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      {...props}
    >
      {children}
    </mesh>
  );
};
```

### 3.3 Hover Highlight Effect

**New Component: `HoverOutline.jsx`**

```javascript
// frontend/src/components/HoverOutline.jsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const HoverOutline = ({ meshRef, color = '#22d3ee', thickness = 0.02 }) => {
  const outlineRef = useRef();

  useFrame(() => {
    if (outlineRef.current && meshRef.current) {
      // Copy position and rotation from target mesh
      outlineRef.current.position.copy(meshRef.current.position);
      outlineRef.current.rotation.copy(meshRef.current.rotation);
      outlineRef.current.scale.copy(meshRef.current.scale).multiplyScalar(1.02);
    }
  });

  return (
    <mesh ref={outlineRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.3}
        side={THREE.BackSide}
      />
    </mesh>
  );
};
```

### 3.4 CSS Cursor Styles

```css
/* Add to index.css */

/* ============================================
   INTERACTIVE CURSOR STATES
   ============================================ */
.canvas-container {
  cursor: default;
}

.canvas-container[data-hovering="true"] {
  cursor: pointer;
}

.canvas-container[data-dragging="true"] {
  cursor: grabbing;
}

.canvas-container[data-can-orbit="true"] {
  cursor: grab;
}

.canvas-container[data-orbiting="true"] {
  cursor: grabbing;
}

/* Custom cursor for interactive elements */
.cursor-crosshair {
  cursor: crosshair;
}

.cursor-zoom-in {
  cursor: zoom-in;
}

.cursor-zoom-out {
  cursor: zoom-out;
}
```

---

## 4. Phase 2: Interactive Camera Controls

### 4.1 OrbitControls Integration

**Update to AnimationScene component:**

```javascript
// Add to imports
import { OrbitControls } from '@react-three/drei';

// New component for interactive orbit category
const InteractiveOrbitScene = ({ children, enableOrbit = false }) => {
  const controlsRef = useRef();

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[-10, 10, 10]} intensity={2} color="#22d3ee" />
      <pointLight position={[10, -10, -10]} intensity={2} color="#ec4899" />
      <Stars radius={100} depth={50} count={2000} factor={4} fade speed={0.5} />
      <fog attach="fog" args={['#050505', 10, 80]} />

      {enableOrbit ? (
        <>
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={30}
            autoRotate={false}
            zoomSpeed={0.5}
            rotateSpeed={0.5}
          />
          {children}
        </>
      ) : (
        <ScrollControls pages={3} damping={0.12}>
          <Scroll>{children}</Scroll>
        </ScrollControls>
      )}
    </>
  );
};
```

### 4.2 Mouse Wheel Zoom (Non-Orbit Scenes)

```javascript
// frontend/src/hooks/useMouseWheelZoom.js
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

export const useMouseWheelZoom = ({
  enabled = true,
  minFov = 35,
  maxFov = 75,
  zoomSpeed = 0.5
}) => {
  const { camera } = useThree();
  const targetFov = useRef(camera.fov);

  useEffect(() => {
    if (!enabled) return;

    const handleWheel = (event) => {
      // Only zoom when not over scroll-controlled content
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        targetFov.current += event.deltaY * zoomSpeed * 0.01;
        targetFov.current = Math.max(minFov, Math.min(maxFov, targetFov.current));

        camera.fov = targetFov.current;
        camera.updateProjectionMatrix();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [enabled, minFov, maxFov, zoomSpeed, camera]);

  return { currentFov: targetFov.current };
};
```

### 4.3 Touch Gesture Support

```javascript
// frontend/src/hooks/useTouchGestures.js
import { useEffect, useRef } from 'react';

export const useTouchGestures = ({
  onPinchZoom,
  onTwoFingerRotate,
  onSwipe
}) => {
  const touchStartRef = useRef({ x: 0, y: 0, distance: 0 });

  useEffect(() => {
    const getDistance = (touches) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        touchStartRef.current.distance = getDistance(e.touches);
      } else if (e.touches.length === 1) {
        touchStartRef.current.x = e.touches[0].clientX;
        touchStartRef.current.y = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        const currentDistance = getDistance(e.touches);
        const delta = currentDistance - touchStartRef.current.distance;
        onPinchZoom?.(delta * 0.01);
        touchStartRef.current.distance = currentDistance;
      }
    };

    const handleTouchEnd = (e) => {
      if (e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
        const dy = e.changedTouches[0].clientY - touchStartRef.current.y;

        if (Math.abs(dx) > 50) {
          onSwipe?.(dx > 0 ? 'right' : 'left');
        } else if (Math.abs(dy) > 50) {
          onSwipe?.(dy > 0 ? 'down' : 'up');
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onPinchZoom, onTwoFingerRotate, onSwipe]);
};
```

---

## 5. Phase 3: Object Selection & Tooltips

### 5.1 3D Positioned Tooltips

**New Component: `Tooltip3D.jsx`**

```javascript
// frontend/src/components/Tooltip3D.jsx
import React from 'react';
import { Html } from '@react-three/drei';

export const Tooltip3D = ({
  position = [0, 0, 0],
  visible = false,
  title,
  description,
  style = {}
}) => {
  if (!visible) return null;

  return (
    <Html
      position={position}
      center
      distanceFactor={10}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        ...style
      }}
    >
      <div className="tooltip-3d">
        <div className="tooltip-3d-arrow" />
        <div className="tooltip-3d-content">
          {title && <h4 className="tooltip-3d-title">{title}</h4>}
          {description && <p className="tooltip-3d-desc">{description}</p>}
        </div>
      </div>
    </Html>
  );
};

// CSS for Tooltip3D
/*
.tooltip-3d {
  background: rgba(13, 13, 13, 0.95);
  border: 1px solid rgba(34, 211, 238, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  backdrop-filter: blur(8px);
  white-space: nowrap;
  animation: tooltipFadeIn 0.2s ease;
}

.tooltip-3d-title {
  color: #22d3ee;
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.tooltip-3d-desc {
  color: #a1a1aa;
  font-size: 11px;
  margin: 0;
}

@keyframes tooltipFadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
*/
```

### 5.2 Selection State Management

**New Context: `SelectionContext.jsx`**

```javascript
// frontend/src/contexts/SelectionContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const SelectionContext = createContext({});

export const SelectionProvider = ({ children }) => {
  const [selectedObject, setSelectedObject] = useState(null);
  const [hoveredObject, setHoveredObject] = useState(null);
  const [selectionHistory, setSelectionHistory] = useState([]);

  const select = useCallback((objectId, metadata = {}) => {
    setSelectedObject({ id: objectId, ...metadata });
    setSelectionHistory(prev => [...prev.slice(-9), objectId]);
  }, []);

  const deselect = useCallback(() => {
    setSelectedObject(null);
  }, []);

  const hover = useCallback((objectId, metadata = {}) => {
    setHoveredObject({ id: objectId, ...metadata });
  }, []);

  const unhover = useCallback(() => {
    setHoveredObject(null);
  }, []);

  return (
    <SelectionContext.Provider value={{
      selectedObject,
      hoveredObject,
      selectionHistory,
      select,
      deselect,
      hover,
      unhover,
      isSelected: (id) => selectedObject?.id === id,
      isHovered: (id) => hoveredObject?.id === id
    }}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext);
```

### 5.3 Interactive Object Labels

```javascript
// frontend/src/components/ObjectLabel.jsx
import React from 'react';
import { Html, Billboard } from '@react-three/drei';

export const ObjectLabel = ({
  position,
  label,
  visible = true,
  onClick,
  variant = 'default' // 'default' | 'highlight' | 'info'
}) => {
  if (!visible) return null;

  return (
    <Billboard position={position} follow={true} lockX={false} lockY={false}>
      <Html center distanceFactor={15}>
        <div
          className={`object-label object-label--${variant}`}
          onClick={onClick}
        >
          <span className="object-label-dot" />
          <span className="object-label-text">{label}</span>
        </div>
      </Html>
    </Billboard>
  );
};
```

---

## 6. Phase 4: Advanced Interactions

### 6.1 Drag-to-Adjust Parameters

```javascript
// frontend/src/hooks/useDragParameter.js
import { useState, useCallback, useRef } from 'react';

export const useDragParameter = ({
  paramKey,
  min = 0,
  max = 100,
  step = 1,
  sensitivity = 1,
  onUpdate
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startValue = useRef(0);
  const startY = useRef(0);

  const onDragStart = useCallback((e, currentValue) => {
    setIsDragging(true);
    startValue.current = currentValue;
    startY.current = e.clientY;
    document.body.style.cursor = 'ns-resize';
  }, []);

  const onDragMove = useCallback((e) => {
    if (!isDragging) return;

    const deltaY = startY.current - e.clientY;
    const deltaValue = (deltaY * sensitivity * (max - min)) / 200;
    let newValue = startValue.current + deltaValue;

    // Snap to step
    newValue = Math.round(newValue / step) * step;
    newValue = Math.max(min, Math.min(max, newValue));

    onUpdate?.(paramKey, newValue);
  }, [isDragging, paramKey, min, max, step, sensitivity, onUpdate]);

  const onDragEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = 'default';
  }, []);

  return {
    isDragging,
    handlers: {
      onMouseDown: onDragStart,
      onMouseMove: onDragMove,
      onMouseUp: onDragEnd,
      onMouseLeave: onDragEnd
    }
  };
};
```

### 6.2 Hover Preview System

```javascript
// frontend/src/components/HoverPreview.jsx
import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';

export const HoverPreview = ({
  categoryId,
  exampleIndex,
  isVisible,
  position
}) => {
  const [PreviewComponent, setPreviewComponent] = useState(null);

  useEffect(() => {
    // Dynamically load preview component
    if (isVisible && categoryId) {
      // Load component based on category
    }
  }, [isVisible, categoryId]);

  if (!isVisible) return null;

  return (
    <div
      className="hover-preview"
      style={{
        position: 'fixed',
        left: position.x + 20,
        top: position.y - 100,
      }}
    >
      <div className="hover-preview-canvas">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ width: 200, height: 150 }}
        >
          {PreviewComponent && <PreviewComponent />}
        </Canvas>
      </div>
      <div className="hover-preview-label">
        Click to view
      </div>
    </div>
  );
};
```

### 6.3 Interactive Code Preview

```javascript
// frontend/src/components/InteractiveCodePreview.jsx
import React, { useState } from 'react';

export const InteractiveCodePreview = ({
  code,
  highlightLines = [],
  onLineHover,
  onLineClick
}) => {
  const [hoveredLine, setHoveredLine] = useState(null);

  const lines = code.split('\n');

  return (
    <pre className="interactive-code">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`code-line ${highlightLines.includes(i) ? 'highlighted' : ''} ${hoveredLine === i ? 'hovered' : ''}`}
          onMouseEnter={() => {
            setHoveredLine(i);
            onLineHover?.(i, line);
          }}
          onMouseLeave={() => setHoveredLine(null)}
          onClick={() => onLineClick?.(i, line)}
        >
          <span className="line-number">{i + 1}</span>
          <code>{line}</code>
        </div>
      ))}
    </pre>
  );
};
```

---

## 7. Technical Architecture

### Component Hierarchy

```
App
├── SelectionProvider (Context)
│   ├── CursorProvider (Context)
│   │   ├── Sidebar
│   │   ├── MainContent
│   │   │   ├── ExampleTabs
│   │   │   ├── CanvasContainer
│   │   │   │   ├── ThreeErrorBoundary
│   │   │   │   │   └── Canvas
│   │   │   │   │       ├── AnimationScene / InteractiveOrbitScene
│   │   │   │   │       │   ├── OrbitControls (conditional)
│   │   │   │   │       │   ├── ScrollControls (conditional)
│   │   │   │   │       │   └── AnimationComponent
│   │   │   │   │       │       ├── InteractiveMesh
│   │   │   │   │       │       ├── Tooltip3D
│   │   │   │   │       │       └── ObjectLabel
│   │   │   │   │       └── HoverOutline
│   │   │   │   └── HoverPreview (HTML overlay)
│   │   │   └── InfoPanel
│   │   └── RightPanel
│   │       ├── CodeTab
│   │       │   └── InteractiveCodePreview
│   │       └── TweakTab
│   │           └── DraggableSlider
│   └── KeyboardHelpOverlay
```

### Event Flow

```
User Action          →  Hook/Handler       →  State Change        →  Visual Feedback
─────────────────────────────────────────────────────────────────────────────────────
Mouse enters mesh    →  onPointerOver      →  setHoveredObject    →  Highlight + cursor
Mouse leaves mesh    →  onPointerOut       →  clearHoveredObject  →  Reset highlight
Click mesh           →  onClick            →  setSelectedObject   →  Selection ring
Drag in scene        →  OrbitControls      →  Camera updates      →  Scene rotates
Scroll wheel         →  useMouseWheelZoom  →  Camera FOV change   →  Zoom effect
Touch pinch          →  useTouchGestures   →  Camera zoom         →  Zoom effect
Drag parameter       →  useDragParameter   →  Control value       →  Real-time update
```

### State Management

```javascript
// Global state via contexts
{
  selection: {
    selectedObject: { id, type, position, metadata },
    hoveredObject: { id, type, position },
    selectionHistory: []
  },
  cursor: {
    state: 'default' | 'pointer' | 'grab' | 'grabbing',
    position: { x, y }
  },
  interaction: {
    isDragging: boolean,
    isOrbiting: boolean,
    touchGesture: null | 'pinch' | 'rotate' | 'swipe'
  }
}
```

---

## 8. Component Specifications

### InteractiveMesh Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onHover` | `function` | - | Called when pointer enters |
| `onUnhover` | `function` | - | Called when pointer leaves |
| `onClick` | `function` | - | Called on click |
| `hoverColor` | `string` | `#22d3ee` | Highlight color |
| `hoverScale` | `number` | `1.05` | Scale multiplier on hover |
| `hoverEmissiveIntensity` | `number` | `0.6` | Glow intensity on hover |
| `disabled` | `boolean` | `false` | Disable interactions |
| `tooltip` | `string` | - | Tooltip text to show |

### Tooltip3D Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `[x,y,z]` | `[0,0,0]` | 3D position |
| `visible` | `boolean` | `false` | Show/hide |
| `title` | `string` | - | Tooltip title |
| `description` | `string` | - | Tooltip body |
| `offset` | `[x,y]` | `[0,10]` | Offset from position |

### OrbitControls Configuration

| Option | Value | Rationale |
|--------|-------|-----------|
| `enablePan` | `false` | Prevent confusion with scroll |
| `enableZoom` | `true` | Natural interaction |
| `enableRotate` | `true` | Primary feature |
| `minDistance` | `5` | Prevent clipping |
| `maxDistance` | `30` | Keep objects visible |
| `autoRotate` | `false` | User-controlled |
| `zoomSpeed` | `0.5` | Comfortable pace |
| `rotateSpeed` | `0.5` | Smooth rotation |

---

## 9. Testing Strategy

### Unit Tests

```javascript
// Example test for InteractiveMesh
describe('InteractiveMesh', () => {
  it('changes cursor on hover', () => {
    render(
      <Canvas>
        <InteractiveMesh>
          <boxGeometry />
          <meshBasicMaterial />
        </InteractiveMesh>
      </Canvas>
    );

    // Simulate pointer enter
    fireEvent.pointerOver(screen.getByRole('mesh'));
    expect(document.body.style.cursor).toBe('pointer');
  });

  it('scales up on hover', async () => {
    // Test scale animation
  });

  it('calls onClick handler', () => {
    const handleClick = jest.fn();
    // Test click handler
  });
});
```

### Integration Tests

```javascript
describe('Mouse Interaction Flow', () => {
  it('hover → highlight → tooltip → click → select', async () => {
    // Full interaction flow test
  });

  it('orbit controls work with mouse drag', async () => {
    // Camera movement test
  });

  it('touch gestures work on mobile', async () => {
    // Touch simulation test
  });
});
```

### Visual Regression Tests

```javascript
// Playwright visual tests
test('hover state visual', async ({ page }) => {
  await page.goto('/');
  await page.hover('[data-testid="interactive-mesh"]');
  await expect(page).toHaveScreenshot('hover-state.png');
});
```

---

## 10. Accessibility Considerations

### ARIA Labels

```javascript
// For interactive 3D objects
<mesh
  role="button"
  aria-label="Rotating sphere - click to select"
  aria-pressed={isSelected}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleSelect();
    }
  }}
>
```

### Keyboard Alternatives

| Mouse Action | Keyboard Alternative |
|--------------|---------------------|
| Hover object | Tab to focus |
| Click object | Enter/Space |
| Orbit camera | Arrow keys |
| Zoom | +/- keys |
| Reset view | Home key |
| Deselect | Escape |

### Screen Reader Announcements

```javascript
// Announce selection changes
useEffect(() => {
  if (selectedObject) {
    announceToScreenReader(`Selected ${selectedObject.name}`);
  }
}, [selectedObject]);

const announceToScreenReader = (message) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
};
```

### Reduced Motion Compatibility

```javascript
// In InteractiveMesh
const { prefersReducedMotion } = useReducedMotion();

useFrame((state, delta) => {
  if (prefersReducedMotion) {
    // Instant state changes, no animation
    meshRef.current.scale.setScalar(hovered ? hoverScale : 1);
  } else {
    // Animated transitions
    meshRef.current.scale.lerp(targetScale, delta * 8);
  }
});
```

---

## Implementation Checklist

### Phase 1: Core Hover Feedback
- [ ] Create `useInteractiveCursor` hook
- [ ] Create `InteractiveMesh` component
- [ ] Add hover highlight effect
- [ ] Update cursor CSS classes
- [ ] Integrate with existing animation components
- [ ] Test hover states across all categories

### Phase 2: Interactive Camera Controls
- [ ] Add `OrbitControls` to orbit category
- [ ] Implement mouse wheel zoom hook
- [ ] Add touch gesture support
- [ ] Create camera reset functionality
- [ ] Add orbit/scroll mode toggle
- [ ] Test on touch devices

### Phase 3: Object Selection & Tooltips
- [ ] Create `SelectionContext`
- [ ] Build `Tooltip3D` component
- [ ] Add object labels
- [ ] Integrate selection with info panel
- [ ] Add selection history
- [ ] Test accessibility

### Phase 4: Advanced Interactions
- [ ] Implement drag-to-adjust parameters
- [ ] Add hover preview system
- [ ] Create interactive code preview
- [ ] Add multi-select support
- [ ] Performance optimization
- [ ] Full integration testing

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 3-5 days | None |
| Phase 2 | 3-5 days | Phase 1 |
| Phase 3 | 4-6 days | Phase 1 |
| Phase 4 | 5-7 days | Phase 2, 3 |

**Total: 2-3 weeks for full implementation**

---

## Success Metrics

1. **Engagement**: 50% increase in time spent in 3D scene
2. **Discoverability**: Users find object interactions without hints
3. **Satisfaction**: Positive feedback on "feels natural to use"
4. **Accessibility**: Passes WCAG 2.1 AA for interactive elements
5. **Performance**: No frame drops during interactions (maintain 60fps)
