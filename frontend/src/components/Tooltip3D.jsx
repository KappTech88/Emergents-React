import React from 'react';
import { Html } from '@react-three/drei';

/**
 * Tooltip3D - A tooltip that appears in 3D space attached to objects
 *
 * Uses @react-three/drei's Html component to render DOM elements in 3D space
 */
const Tooltip3D = ({
  position = [0, 0, 0],
  visible = false,
  title,
  description,
  hint,
  variant = 'default', // 'default' | 'info' | 'action' | 'warning'
  offset = [0, 1.5, 0],
  distanceFactor = 10,
  occlude = false,
  zIndexRange = [100, 0]
}) => {
  if (!visible) return null;

  const tooltipPosition = [
    position[0] + offset[0],
    position[1] + offset[1],
    position[2] + offset[2]
  ];

  const variantClasses = {
    default: 'tooltip-3d--default',
    info: 'tooltip-3d--info',
    action: 'tooltip-3d--action',
    warning: 'tooltip-3d--warning'
  };

  return (
    <Html
      position={tooltipPosition}
      center
      distanceFactor={distanceFactor}
      occlude={occlude}
      zIndexRange={zIndexRange}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        transition: 'opacity 0.2s ease'
      }}
    >
      <div className={`tooltip-3d ${variantClasses[variant]}`}>
        <div className="tooltip-3d-arrow" />
        <div className="tooltip-3d-content">
          {title && <h4 className="tooltip-3d-title">{title}</h4>}
          {description && <p className="tooltip-3d-desc">{description}</p>}
          {hint && <span className="tooltip-3d-hint">{hint}</span>}
        </div>
      </div>
    </Html>
  );
};

/**
 * FloatingLabel - A simpler label that floats above objects
 */
export const FloatingLabel = ({
  position = [0, 0, 0],
  visible = true,
  text,
  variant = 'default',
  offset = [0, 1, 0]
}) => {
  if (!visible || !text) return null;

  const labelPosition = [
    position[0] + offset[0],
    position[1] + offset[1],
    position[2] + offset[2]
  ];

  return (
    <Html
      position={labelPosition}
      center
      distanceFactor={15}
      style={{
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    >
      <div className={`floating-label floating-label--${variant}`}>
        {text}
      </div>
    </Html>
  );
};

/**
 * InteractionHint - Shows interaction hints like "Click to select"
 */
export const InteractionHint = ({
  position = [0, 0, 0],
  visible = false,
  action = 'click',
  customText
}) => {
  if (!visible) return null;

  const hints = {
    click: 'Click to select',
    drag: 'Drag to rotate',
    scroll: 'Scroll to zoom',
    hover: 'Hover for details'
  };

  return (
    <Html
      position={position}
      center
      distanceFactor={12}
      style={{
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    >
      <div className="interaction-hint">
        <span className="interaction-hint-icon">
          {action === 'click' && '👆'}
          {action === 'drag' && '✋'}
          {action === 'scroll' && '🖱️'}
          {action === 'hover' && '👁️'}
        </span>
        <span className="interaction-hint-text">
          {customText || hints[action]}
        </span>
      </div>
    </Html>
  );
};

/**
 * SelectionIndicator - Visual indicator ring around selected objects
 */
export const SelectionIndicator = ({
  position = [0, 0, 0],
  visible = false,
  size = 2,
  color = '#22d3ee',
  pulseSpeed = 2
}) => {
  const ringRef = React.useRef();

  React.useEffect(() => {
    if (!ringRef.current || !visible) return;
    let frameId;
    const animate = () => {
      if (ringRef.current) {
        const scale = 1 + Math.sin(Date.now() * 0.001 * pulseSpeed) * 0.1;
        ringRef.current.style.transform = `scale(${scale})`;
      }
      frameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frameId);
  }, [visible, pulseSpeed]);

  if (!visible) return null;

  return (
    <Html
      position={position}
      center
      distanceFactor={10}
      style={{
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    >
      <div
        ref={ringRef}
        className="selection-indicator"
        style={{
          '--indicator-size': `${size * 40}px`,
          '--indicator-color': color
        }}
      >
        <div className="selection-indicator-ring" />
        <div className="selection-indicator-ring selection-indicator-ring--delayed" />
        <div className="selection-indicator-dot" />
      </div>
    </Html>
  );
};

/**
 * SelectionPanel - UI panel showing selection details (for use in DOM)
 */
export const SelectionPanel = ({
  visible = false,
  title,
  properties = [],
  onClose,
  onAction
}) => {
  if (!visible) return null;

  return (
    <div className="selection-panel">
      <div className="selection-panel-header">
        <h3 className="selection-panel-title">{title}</h3>
        {onClose && (
          <button className="selection-panel-close" onClick={onClose}>×</button>
        )}
      </div>
      {properties.length > 0 && (
        <div className="selection-panel-properties">
          {properties.map((prop, i) => (
            <div key={i} className="selection-panel-property">
              <span className="selection-panel-property-label">{prop.label}</span>
              <span className="selection-panel-property-value">{prop.value}</span>
            </div>
          ))}
        </div>
      )}
      {onAction && (
        <button className="selection-panel-action" onClick={onAction}>
          View Details
        </button>
      )}
    </div>
  );
};

export default Tooltip3D;
