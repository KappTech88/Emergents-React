import React, { Suspense, useRef, useMemo, useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Stars, MeshDistortMaterial, Float, MeshWobbleMaterial } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

// ============================================================
// CONTROLS CONTEXT - Share tweakable values across components
// ============================================================
const ControlsContext = createContext({});
const useControls = () => useContext(ControlsContext);

// ============================================================
// ANIMATION CATEGORIES DATA
// ============================================================
const CATEGORIES = [
  // Scroll Effects
  { id: 'tunnel', name: 'Tunnel Effects', icon: '◎', description: 'Z-Axis depth perception', type: 'scroll', renderer: 'canvas' },
  { id: 'velocity', name: 'Velocity Deformation', icon: '◉', description: 'Speed-reactive morphing', type: 'scroll', renderer: 'canvas' },
  { id: 'shader', name: 'Shader Effects', icon: '◈', description: 'Custom WebGL shaders', type: 'scroll', renderer: 'canvas' },
  { id: 'exploded', name: 'Exploded Views', icon: '❖', description: 'Component separation', type: 'scroll', renderer: 'canvas' },
  { id: 'rotation', name: 'Rotation Mapping', icon: '◐', description: 'Scroll-to-rotation', type: 'scroll', renderer: 'canvas' },
  { id: 'parallax', name: 'Parallax Layers', icon: '☰', description: 'Depth layer movement', type: 'scroll', renderer: 'canvas' },
  { id: 'dof', name: 'Depth of Field', icon: '◯', description: 'Focus & blur effects', type: 'scroll', renderer: 'canvas' },
  { id: 'camerapath', name: 'Camera Path', icon: '↝', description: 'Camera follows spline', type: 'scroll', renderer: 'canvas' },
  { id: 'morph', name: 'Morph Targets', icon: '⬡', description: 'Shape transformation', type: 'scroll', renderer: 'canvas' },
  { id: 'reveal', name: 'Reveal Effects', icon: '◧', description: 'Content reveal/mask', type: 'scroll', renderer: 'canvas' },
  { id: 'uvscroll', name: 'Texture Scroll', icon: '≋', description: 'UV coordinate animation', type: 'scroll', renderer: 'canvas' },
  { id: 'orbit', name: 'Orbit Controls', icon: '↻', description: 'Interactive + scroll', type: 'scroll', renderer: 'canvas' },
  // Mouseover Effects - 3D Canvas
  { id: 'hovertransform', name: 'Hover Transform', icon: '⤡', description: 'Scale & rotate on hover', type: 'mouse', renderer: 'canvas' },
  { id: 'mousefollow', name: 'Mouse Follow', icon: '⤳', description: 'Objects track cursor', type: 'mouse', renderer: 'canvas' },
  { id: 'hoverglow', name: 'Hover Glow', icon: '✦', description: 'Emission on hover', type: 'mouse', renderer: 'canvas' },
  { id: 'magnetic', name: 'Magnetic Cursor', icon: '⊛', description: 'Attract & repel objects', type: 'mouse', renderer: 'canvas' },
  { id: 'ripple', name: 'Ripple Hover', icon: '◌', description: 'Surface waves from pointer', type: 'mouse', renderer: 'canvas' },
  // Mouseover Effects - DOM
  { id: 'cardhover', name: 'Card Hover', icon: '▣', description: '3D tilt, flip & lift effects', type: 'mouse', renderer: 'dom' },
  { id: 'texthover', name: 'Text Hover', icon: 'Ʈ', description: 'Letter & word animations', type: 'mouse', renderer: 'dom' },
  { id: 'buttonhover', name: 'Button Effects', icon: '⬚', description: 'Fill, slide & glow buttons', type: 'mouse', renderer: 'dom' },
  { id: 'imagehover', name: 'Image Hover', icon: '▥', description: 'Zoom, reveal & overlay', type: 'mouse', renderer: 'dom' },
];

// ============================================================
// CODE SNIPPETS - Key logic for vibecoding reference
// ============================================================
const CODE_SNIPPETS = {
  tunnel: [
    {
      title: 'Scroll-Driven Camera Movement',
      code: `// Move camera through tunnel based on scroll
useFrame(() => {
  const progress = scroll.range(0, 0.5);
  group.position.z = progress * 100;
});`,
      explanation: 'scroll.range(start, distance) returns 0→1 as you scroll through that section. Multiply by travel distance to move the camera forward through the rings.'
    },
    {
      title: 'Particle Warp Effect',
      code: `// Position particles in cylindrical tunnel
const angle = Math.random() * Math.PI * 2;
const radius = 2 + Math.random() * 4;
position.x = Math.cos(angle) * radius;
position.y = Math.sin(angle) * radius;
position.z = -Math.random() * 150;`,
      explanation: 'Particles are placed in a cylinder formation using polar coordinates. The Z spread creates the tunnel depth. Scroll moves the entire point cloud toward the camera.'
    }
  ],
  velocity: [
    {
      title: 'Velocity-Based Distortion',
      code: `// Track scroll velocity and apply distortion
useFrame(() => {
  const targetVel = Math.abs(scroll.delta) * 80;
  velocity.current = lerp(velocity.current, targetVel, 0.08);
  
  mesh.material.distort = 0.2 + velocity.current * 0.5;
});`,
      explanation: 'scroll.delta gives instantaneous scroll speed. Lerp smooths the value to prevent jitter. The distort property on MeshDistortMaterial warps the geometry.'
    },
    {
      title: 'Wobble Factor from Speed',
      code: `// Wobble intensity based on scroll velocity
useFrame(() => {
  velocity.current = lerp(velocity.current, 
    Math.abs(scroll.delta) * 60, 0.1);
  
  mesh.material.factor = 0.5 + velocity.current * 0.8;
});`,
      explanation: 'MeshWobbleMaterial\'s factor property controls wobble intensity. Higher scroll speed = more dramatic wobble effect.'
    }
  ],
  shader: [
    {
      title: 'Vertex Wave Displacement',
      code: `// In vertex shader
float wave = sin(pos.x * 3.5 + uTime * 2.5) * 0.35
           + sin(pos.y * 4.5 + uTime * 2.0) * 0.25;

pos.z += wave * (1.0 + uVelocity * 3.5);`,
      explanation: 'Multiple sine waves at different frequencies create organic motion. uVelocity (from scroll.delta) amplifies the waves when scrolling fast.'
    },
    {
      title: 'Procedural Noise Displacement',
      code: `// Simple hash-based noise function
float noise(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 45.5432))) 
    * 43758.5453);
}

// Displace along normals
pos += normal * noise(pos + uTime) * amplitude;`,
      explanation: 'Pseudo-random noise displaces each vertex along its normal. Time parameter animates the noise pattern. Amplitude controlled by scroll velocity.'
    }
  ],
  exploded: [
    {
      title: 'Scroll Range Explosion',
      code: `// Separate parts based on scroll position
useFrame(() => {
  const explosion = scroll.range(0.2, 0.6);
  const dist = explosion * 4;
  
  parts.forEach((part, i) => {
    mesh[i].position.copy(part.origin)
      .addScaledVector(part.direction, dist);
  });
});`,
      explanation: 'Each part has an origin and direction vector. scroll.range returns 0→1 over that scroll section. Multiply direction by distance to separate parts.'
    },
    {
      title: 'Radial Explosion Pattern',
      code: `// Calculate direction from center
const direction = new Vector3(
  Math.sin(angle1) * 1.2,
  Math.cos(angle2) * 1.2 - 0.5,
  Math.cos(angle1) * 1.2
).normalize();

// Animate outward
mesh.position.copy(origin)
  .addScaledVector(direction, explosionDist);`,
      explanation: 'Spherical coordinates create directions pointing outward from center. Normalizing ensures consistent explosion distance regardless of starting position.'
    }
  ],
  rotation: [
    {
      title: 'Direct Scroll-to-Rotation Mapping',
      code: `// Map scroll offset to rotation
useFrame(() => {
  // scroll.offset is 0 to 1
  const rotation = scroll.offset * Math.PI * 4;
  mesh.rotation.y = rotation;
});`,
      explanation: 'scroll.offset gives total scroll progress (0 at top, 1 at bottom). Multiply by 2π for one full rotation, or 4π for two rotations over the full scroll.'
    },
    {
      title: 'Helix Point Generation',
      code: `// Generate double helix points
for (let i = 0; i < 30; i++) {
  const t = (i / 30) * Math.PI * 4;
  
  strand1[i] = [cos(t) * radius, i * spacing, sin(t) * radius];
  strand2[i] = [cos(t + PI) * radius, i * spacing, sin(t + PI) * radius];
}`,
      explanation: 'Two strands offset by π (180°) create the double helix. The t parameter spirals around Y axis while i*spacing moves up vertically.'
    }
  ],
  parallax: [
    {
      title: 'Depth-Based Parallax Speed',
      code: `// Different speeds for different depths
const layers = [
  { z: -15, speed: 0.1 },  // Far = slow
  { z: -6,  speed: 0.5 },  // Mid = medium  
  { z: -3,  speed: 0.7 },  // Near = fast
];

useFrame(() => {
  layers.forEach((l, i) => {
    mesh[i].position.y = scroll.offset * l.speed * 8;
  });
});`,
      explanation: 'Objects further from camera (larger negative Z) move slower. This mimics real-world parallax where distant objects appear to move less.'
    },
    {
      title: 'Floating Card Parallax',
      code: `// Cards at various depths with unique speeds
useFrame(() => {
  cards.forEach((card, i) => {
    mesh[i].position.y = card.baseY 
      + scroll.offset * card.speed * 10;
    
    // Subtle rotation for life
    mesh[i].rotation.y = sin(time + i) * 0.1;
  });
});`,
      explanation: 'Each card has its own Z position and speed multiplier. Adding subtle rotation on a sine wave gives the scene more life and depth.'
    }
  ],
  dof: [
    {
      title: 'Scroll-Based Focus Distance',
      code: `// Adjust focus based on scroll position
useFrame(() => {
  const focus = scroll.offset * maxFocusDistance;
  
  objects.forEach(obj => {
    const dist = Math.abs(obj.position.z - focus);
    obj.material.opacity = 1 - (dist * blurFactor);
    obj.scale.setScalar(1 - dist * 0.05);
  });
});`,
      explanation: 'Calculate distance from current focus point. Objects further from focus become more transparent/smaller, simulating depth of field blur.'
    },
    {
      title: 'Bokeh Particle Effect',
      code: `// Bokeh circles scale with distance from focus
const bokehSize = baseSize * (1 + distFromFocus * 0.5);
const bokehOpacity = 1 / (1 + distFromFocus);

particle.scale.setScalar(bokehSize);
particle.material.opacity = bokehOpacity;`,
      explanation: 'Out-of-focus lights become larger, softer circles (bokeh). Size increases and opacity decreases with distance from focal plane.'
    }
  ],
  camerapath: [
    {
      title: 'Spline Camera Path',
      code: `// Camera follows CatmullRom spline
const curve = new CatmullRomCurve3(points);

useFrame(() => {
  const t = scroll.offset;
  const position = curve.getPointAt(t);
  const lookAt = curve.getPointAt(Math.min(t + 0.01, 1));
  
  camera.position.copy(position);
  camera.lookAt(lookAt);
});`,
      explanation: 'CatmullRomCurve3 creates smooth path through points. scroll.offset (0-1) maps directly to curve parameter t. LookAt slightly ahead for smooth rotation.'
    },
    {
      title: 'Orbital Camera Motion',
      code: `// Camera orbits around center point
useFrame(() => {
  const angle = scroll.offset * Math.PI * 2;
  const radius = 10;
  
  camera.position.x = Math.cos(angle) * radius;
  camera.position.z = Math.sin(angle) * radius;
  camera.lookAt(0, 0, 0);
});`,
      explanation: 'Polar coordinates create circular orbit. scroll.offset maps to angle (0-2π for full orbit). Camera always looks at center.'
    }
  ],
  morph: [
    {
      title: 'Geometry Interpolation',
      code: `// Lerp between two geometries
useFrame(() => {
  const t = scroll.offset;
  
  positions.forEach((pos, i) => {
    pos.x = lerp(cubePos[i].x, spherePos[i].x, t);
    pos.y = lerp(cubePos[i].y, spherePos[i].y, t);
    pos.z = lerp(cubePos[i].z, spherePos[i].z, t);
  });
  geometry.attributes.position.needsUpdate = true;
});`,
      explanation: 'Store vertex positions for both shapes. Linear interpolation (lerp) blends between them based on scroll. Update geometry each frame.'
    },
    {
      title: 'Scale-Based Morph',
      code: `// Morph via non-uniform scaling
useFrame(() => {
  const t = scroll.offset;
  
  // Cube (1,1,1) -> Flat (2,0.1,2) -> Tall (0.5,3,0.5)
  mesh.scale.x = lerp(1, t < 0.5 ? 2 : 0.5, t * 2);
  mesh.scale.y = lerp(1, t < 0.5 ? 0.1 : 3, t * 2);
});`,
      explanation: 'Non-uniform scaling creates shape transformation illusion. Multi-stage lerp allows complex morph sequences.'
    }
  ],
  reveal: [
    {
      title: 'Circular Reveal Mask',
      code: `// Shader-based circle reveal
uniform float uProgress;
varying vec2 vUv;

void main() {
  vec2 center = vec2(0.5);
  float dist = distance(vUv, center);
  float radius = uProgress * 0.75;
  
  if (dist > radius) discard;
  gl_FragColor = texture2D(uTexture, vUv);
}`,
      explanation: 'Fragment shader discards pixels outside radius. uProgress (from scroll) expands the circle. Creates iris/portal reveal effect.'
    },
    {
      title: 'Directional Wipe',
      code: `// Horizontal wipe reveal
useFrame(() => {
  const t = scroll.offset;
  
  // Move clip plane based on scroll
  mesh.material.clippingPlanes = [
    new Plane(new Vector3(1, 0, 0), -10 + t * 20)
  ];
});`,
      explanation: 'Three.js clipping planes cut geometry. Moving plane position with scroll creates wipe effect. Direction vector controls wipe angle.'
    }
  ],
  uvscroll: [
    {
      title: 'UV Offset Animation',
      code: `// Scroll texture coordinates
useFrame(() => {
  const offset = scroll.offset * scrollSpeed;
  
  mesh.material.map.offset.x = offset;
  // Or for vertical: map.offset.y = offset;
  
  mesh.material.map.needsUpdate = true;
});`,
      explanation: 'Texture.offset shifts UV coordinates. Scroll drives the offset for synchronized movement. Works with repeating textures for infinite scroll.'
    },
    {
      title: 'Shader UV Distortion',
      code: `// Wavy UV distortion in shader
vec2 distortedUV = vUv;
distortedUV.x += sin(vUv.y * 10.0 + uScroll * 5.0) * 0.1;
distortedUV.y += cos(vUv.x * 10.0 + uScroll * 3.0) * 0.1;

vec4 color = texture2D(uTexture, distortedUV);`,
      explanation: 'Sine/cosine waves distort UV lookup. Scroll offset animates the phase. Creates liquid/heat wave effect on textures.'
    }
  ],
  orbit: [
    {
      title: 'Combined Orbit + Scroll Zoom',
      code: `// Mouse orbit with scroll zoom
useFrame(() => {
  // Orbit from mouse (via OrbitControls)
  // Zoom from scroll
  const zoom = 5 + scroll.offset * 15;
  camera.position.normalize().multiplyScalar(zoom);
});`,
      explanation: 'OrbitControls handles rotation via mouse drag. Scroll independently controls camera distance (zoom). Separates two interaction types.'
    },
    {
      title: 'Auto-Orbit with Scroll Speed',
      code: `// Rotation speed based on scroll velocity
useFrame(() => {
  const baseSpeed = 0.5;
  const scrollBoost = scroll.delta * 20;
  
  group.rotation.y += (baseSpeed + scrollBoost) * delta;
});`,
      explanation: 'Continuous rotation at base speed. Scroll velocity (delta) adds temporary boost. Creates responsive, dynamic orbit feel.'
    }
  ],
  hovertransform: [
    {
      title: 'Pointer Hover Scale',
      code: `// Scale mesh on pointer hover
const [hovered, setHovered] = useState(false);

<mesh
  onPointerOver={() => setHovered(true)}
  onPointerOut={() => setHovered(false)}
>

useFrame(() => {
  const target = hovered ? 1.4 : 1;
  mesh.scale.lerp(new Vector3(target, target, target), 0.1);
});`,
      explanation: 'R3F meshes support onPointerOver/Out events. Use a hovered state flag and lerp the scale each frame for a smooth transition instead of an instant jump.'
    },
    {
      title: 'Hover Spin with Deceleration',
      code: `// Spin while hovered, decelerate on leave
const spinSpeed = useRef(0);

useFrame((state, delta) => {
  const target = hovered ? 3 : 0;
  spinSpeed.current = lerp(spinSpeed.current, target, 0.05);
  mesh.rotation.y += spinSpeed.current * delta;
});`,
      explanation: 'Track spin speed in a ref. Lerp toward target speed (fast when hovered, zero when not). Multiply by delta for frame-rate independent rotation.'
    }
  ],
  mousefollow: [
    {
      title: 'Follow Mouse Position in 3D',
      code: `// Lerp mesh toward mouse position
useFrame((state) => {
  const { pointer } = state;
  // pointer.x/y range from -1 to 1
  const targetX = pointer.x * 5;
  const targetY = pointer.y * 3;

  mesh.position.x = lerp(mesh.position.x, targetX, 0.08);
  mesh.position.y = lerp(mesh.position.y, targetY, 0.08);
});`,
      explanation: 'state.pointer gives normalized mouse coordinates (-1 to 1). Scale to world units and lerp each frame for smooth following with natural lag.'
    },
    {
      title: 'Staggered Chain Follow',
      code: `// Each sphere follows the one ahead
useFrame((state) => {
  // Leader follows mouse
  positions[0].lerp(mouseTarget, 0.1);

  // Each follower follows the previous
  for (let i = 1; i < count; i++) {
    positions[i].lerp(positions[i - 1], 0.08);
  }
});`,
      explanation: 'Leader-follower pattern: first element tracks the mouse directly, each subsequent element follows the one before it. Lower lerp values create more lag.'
    }
  ],
  hoverglow: [
    {
      title: 'Emissive Intensity on Hover',
      code: `// Ramp emissive up on hover
useFrame(() => {
  const target = hovered ? 2.0 : 0.3;
  const current = mesh.material.emissiveIntensity;
  mesh.material.emissiveIntensity = lerp(current, target, 0.08);
});`,
      explanation: 'MeshStandardMaterial has emissive and emissiveIntensity properties. Lerping the intensity on hover creates a smooth glow-up effect without post-processing.'
    },
    {
      title: 'Distance-Based Color Shift',
      code: `// Color shifts based on distance from pointer
useFrame((state) => {
  objects.forEach((obj, i) => {
    const dist = obj.position.distanceTo(mouseWorldPos);
    const hue = (180 + dist * 30) / 360;
    obj.material.color.setHSL(hue, 0.8, 0.55);
  });
});`,
      explanation: 'Calculate distance from each object to the mouse world position. Map that distance to a hue value so objects near the cursor shift color.'
    }
  ],
  magnetic: [
    {
      title: 'Attract Objects to Cursor',
      code: `// Pull each object toward mouse
useFrame((state) => {
  const mouse3D = new Vector3(pointer.x * 5, pointer.y * 3, 0);

  objects.forEach((obj) => {
    const dir = mouse3D.clone().sub(obj.position);
    const dist = dir.length();
    const force = strength / (dist * dist + 0.5);

    obj.position.add(dir.normalize().multiplyScalar(force));
  });
});`,
      explanation: 'Inverse-square attraction: force = strength / distance^2. Objects close to cursor feel strong pull, distant objects barely move. Add small constant to avoid division by zero.'
    },
    {
      title: 'Spring-Back to Rest Position',
      code: `// Push away + spring back to origin
useFrame(() => {
  objects.forEach((obj, i) => {
    // Repel from mouse
    const away = obj.position.clone().sub(mousePos);
    const dist = away.length();
    if (dist < repelRadius) {
      obj.position.add(away.normalize().multiplyScalar(0.1));
    }

    // Spring back to rest
    obj.position.lerp(restPositions[i], 0.03);
  });
});`,
      explanation: 'Two competing forces: repulsion pushes objects away from cursor within a radius, while a spring constantly pulls them back to their rest positions. The balance creates a lively magnetic field.'
    }
  ],
  ripple: [
    {
      title: 'Vertex Displacement from Mouse UV',
      code: `// In vertex shader
uniform vec2 uMouse; // mouse UV from raycaster
uniform float uStrength;

void main() {
  float dist = distance(uv, uMouse);
  float wave = sin(dist * 30.0 - uTime * 5.0)
             * exp(-dist * 5.0) * uStrength;
  pos.z += wave;
}`,
      explanation: 'Raycaster gives UV coordinates where mouse hits the plane. Use distance from that UV to create concentric sine waves, with exponential falloff so the effect is strongest near the cursor.'
    },
    {
      title: 'Concentric Ring Pulse',
      code: `// Rings expand from mouse position
useFrame((state) => {
  rings.forEach((ring, i) => {
    const age = time - ring.startTime;
    const radius = age * expandSpeed;
    const opacity = Math.max(0, 1 - age * fadeRate);

    ring.mesh.scale.setScalar(radius);
    ring.mesh.material.opacity = opacity;
  });
});`,
      explanation: 'Each ring tracks when it was spawned. Over time it expands (scale) and fades (opacity). New rings spawn periodically at the current mouse position.'
    }
  ],
  cardhover: [
    {
      title: '3D Tilt with Perspective',
      code: `// Track mouse position relative to card
const handleMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;

  setRotateX(-y * maxTilt);
  setRotateY(x * maxTilt);
};

<motion.div style={{
  transform: \`perspective(800px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg)\`
}} />`,
      explanation: 'Calculate mouse position relative to card center (normalized -0.5 to 0.5). Map to rotation angles. CSS perspective() creates the 3D depth effect.'
    },
    {
      title: 'Card Flip on Hover',
      code: `// Flip card with framer-motion
<motion.div
  whileHover={{ rotateY: 180 }}
  transition={{ duration: 0.6 }}
  style={{ transformStyle: 'preserve-3d' }}
>
  <div className="front" style={{ backfaceVisibility: 'hidden' }}>
    Front
  </div>
  <div className="back" style={{
    backfaceVisibility: 'hidden',
    transform: 'rotateY(180deg)'
  }}>
    Back
  </div>
</motion.div>`,
      explanation: 'framer-motion whileHover rotates 180deg. backface-visibility: hidden ensures only the facing side shows. preserve-3d keeps children in 3D space during rotation.'
    }
  ],
  texthover: [
    {
      title: 'Staggered Letter Animation',
      code: `// Animate each letter on hover
{text.split('').map((char, i) => (
  <motion.span
    key={i}
    whileHover={{ y: -10, color: '#22d3ee' }}
    transition={{
      type: 'spring', stiffness: 300,
      delay: i * 0.03
    }}
  >
    {char}
  </motion.span>
))}`,
      explanation: 'Split text into individual characters wrapped in motion.span. Each has a whileHover animation with incremental delay based on index, creating a wave-like stagger.'
    },
    {
      title: 'Glitch Effect on Hover',
      code: `// CSS-based glitch with clip-path
.glitch:hover {
  animation: glitch 0.3s infinite;
}

@keyframes glitch {
  0% { clip-path: inset(20% 0 30% 0); transform: translate(-2px); }
  25% { clip-path: inset(60% 0 10% 0); transform: translate(2px); }
  50% { clip-path: inset(10% 0 70% 0); transform: translate(-1px); }
  100% { clip-path: inset(40% 0 20% 0); transform: translate(1px); }
}`,
      explanation: 'clip-path: inset() randomly reveals horizontal slices. Combined with small translate offsets, this creates a digital glitch distortion effect on hover.'
    }
  ],
  buttonhover: [
    {
      title: 'Gradient Slide Button',
      code: `// Sliding gradient on hover
<motion.button
  whileHover={{ backgroundPosition: '100% 0' }}
  transition={{ duration: 0.5 }}
  style={{
    background: 'linear-gradient(90deg, #22d3ee 0%, #a855f7 50%, #22d3ee 100%)',
    backgroundSize: '200% 100%',
    backgroundPosition: '0% 0'
  }}
>
  Hover Me
</motion.button>`,
      explanation: 'Background gradient is 200% wide so half is hidden. On hover, backgroundPosition shifts to reveal the other half, creating a smooth color slide effect.'
    },
    {
      title: 'Morph Shape Button',
      code: `// Button morphs shape on hover
<motion.button
  whileHover={{
    borderRadius: '50px',
    scale: 1.05,
    boxShadow: '0 0 20px rgba(34,211,238,0.4)'
  }}
  transition={{ type: 'spring', stiffness: 200 }}
>
  Hover Me
</motion.button>`,
      explanation: 'framer-motion smoothly interpolates borderRadius from default to 50px (pill shape). Combined with scale and boxShadow changes for a complete morph effect.'
    }
  ],
  imagehover: [
    {
      title: 'Zoom with Overlay',
      code: `// Image zooms, overlay slides in
<div className="image-container" style={{ overflow: 'hidden' }}>
  <motion.img
    whileHover={{ scale: 1.15 }}
    transition={{ duration: 0.4 }}
  />
  <motion.div
    className="overlay"
    initial={{ opacity: 0, y: 20 }}
    whileHover={{ opacity: 1, y: 0 }}
  >
    <h3>Title</h3>
  </motion.div>
</div>`,
      explanation: 'Image scales up within an overflow:hidden container so it zooms without expanding the card. Overlay text fades in and slides up simultaneously.'
    },
    {
      title: 'Shutter Reveal Effect',
      code: `// Horizontal blinds reveal on hover
{[...Array(5)].map((_, i) => (
  <motion.div
    key={i}
    className="shutter-bar"
    initial={{ scaleY: 1 }}
    whileHover={{ scaleY: 0 }}
    transition={{ delay: i * 0.05, duration: 0.3 }}
    style={{
      position: 'absolute',
      top: \`\${i * 20}%\`, height: '20%',
      background: '#050505'
    }}
  />
))}`,
      explanation: '5 horizontal bars cover the image. On hover each bar scales to 0 height with a staggered delay, creating a venetian blind reveal effect.'
    }
  ]
};

// ============================================================
// CONTROLS CONFIG - Tweakable parameters with guardrails
// ============================================================
const CONTROLS_CONFIG = {
  tunnel: [
    { key: 'ringCount', label: 'Ring Count', min: 10, max: 80, step: 5, default: 50 },
    { key: 'ringSpacing', label: 'Ring Spacing', min: 1, max: 5, step: 0.5, default: 2.5 },
    { key: 'travelSpeed', label: 'Travel Speed', min: 50, max: 200, step: 10, default: 100 },
    { key: 'hueStart', label: 'Color Hue', min: 0, max: 360, step: 10, default: 180 },
  ],
  velocity: [
    { key: 'distortIntensity', label: 'Distort Intensity', min: 0.1, max: 1.5, step: 0.1, default: 0.5 },
    { key: 'baseSpeed', label: 'Base Animation', min: 0.5, max: 5, step: 0.5, default: 2 },
    { key: 'velocityMultiplier', label: 'Velocity Effect', min: 20, max: 150, step: 10, default: 80 },
  ],
  shader: [
    { key: 'waveFrequency', label: 'Wave Frequency', min: 1, max: 8, step: 0.5, default: 3.5 },
    { key: 'waveAmplitude', label: 'Wave Height', min: 0.1, max: 1, step: 0.1, default: 0.35 },
    { key: 'timeSpeed', label: 'Animation Speed', min: 0.5, max: 5, step: 0.5, default: 2.5 },
  ],
  exploded: [
    { key: 'maxExplosion', label: 'Max Distance', min: 1, max: 8, step: 0.5, default: 4 },
    { key: 'rotationSpeed', label: 'Rotation Speed', min: 0.05, max: 0.5, step: 0.05, default: 0.2 },
  ],
  rotation: [
    { key: 'rotationMultiplier', label: 'Rotation Amount', min: 1, max: 8, step: 1, default: 4 },
    { key: 'tiltAmount', label: 'Tilt Intensity', min: 0, max: 0.5, step: 0.05, default: 0.2 },
  ],
  parallax: [
    { key: 'speedMultiplier', label: 'Speed Range', min: 2, max: 15, step: 1, default: 8 },
    { key: 'depthRange', label: 'Depth Spread', min: 5, max: 20, step: 1, default: 12 },
  ],
  dof: [
    { key: 'focusDistance', label: 'Focus Distance', min: 0, max: 20, step: 1, default: 10 },
    { key: 'blurIntensity', label: 'Blur Intensity', min: 0.1, max: 1, step: 0.1, default: 0.5 },
    { key: 'focalRange', label: 'Focal Range', min: 1, max: 10, step: 0.5, default: 3 },
  ],
  camerapath: [
    { key: 'pathSpeed', label: 'Path Speed', min: 0.5, max: 3, step: 0.25, default: 1 },
    { key: 'pathRadius', label: 'Path Radius', min: 5, max: 20, step: 1, default: 10 },
    { key: 'pathHeight', label: 'Path Height', min: 0, max: 10, step: 0.5, default: 3 },
  ],
  morph: [
    { key: 'morphSpeed', label: 'Morph Speed', min: 0.5, max: 3, step: 0.25, default: 1 },
    { key: 'morphEasing', label: 'Easing Strength', min: 1, max: 5, step: 0.5, default: 2 },
  ],
  reveal: [
    { key: 'revealSpeed', label: 'Reveal Speed', min: 0.5, max: 3, step: 0.25, default: 1 },
    { key: 'edgeSoftness', label: 'Edge Softness', min: 0, max: 0.5, step: 0.05, default: 0.1 },
  ],
  uvscroll: [
    { key: 'scrollSpeed', label: 'Scroll Speed', min: 0.5, max: 5, step: 0.5, default: 2 },
    { key: 'distortAmount', label: 'Distortion', min: 0, max: 0.3, step: 0.02, default: 0.1 },
  ],
  orbit: [
    { key: 'orbitSpeed', label: 'Orbit Speed', min: 0.1, max: 2, step: 0.1, default: 0.5 },
    { key: 'zoomRange', label: 'Zoom Range', min: 5, max: 25, step: 1, default: 15 },
    { key: 'autoRotate', label: 'Auto Rotate', min: 0, max: 1, step: 0.1, default: 0.5 },
  ],
  hovertransform: [
    { key: 'hoverScale', label: 'Hover Scale', min: 1.1, max: 2.0, step: 0.1, default: 1.4 },
    { key: 'lerpSpeed', label: 'Smoothness', min: 0.02, max: 0.2, step: 0.02, default: 0.1 },
    { key: 'spinRate', label: 'Spin Speed', min: 1, max: 8, step: 0.5, default: 3 },
  ],
  mousefollow: [
    { key: 'followSpeed', label: 'Follow Speed', min: 0.02, max: 0.2, step: 0.02, default: 0.08 },
    { key: 'trailCount', label: 'Trail Count', min: 3, max: 12, step: 1, default: 8 },
    { key: 'worldScale', label: 'Movement Range', min: 2, max: 8, step: 0.5, default: 5 },
  ],
  hoverglow: [
    { key: 'glowIntensity', label: 'Glow Intensity', min: 0.5, max: 3.0, step: 0.1, default: 2.0 },
    { key: 'fadeSpeed', label: 'Fade Speed', min: 0.02, max: 0.15, step: 0.01, default: 0.08 },
  ],
  magnetic: [
    { key: 'attractStrength', label: 'Attract Force', min: 0.01, max: 0.15, step: 0.01, default: 0.06 },
    { key: 'springBack', label: 'Spring Back', min: 0.01, max: 0.1, step: 0.01, default: 0.03 },
    { key: 'repelRadius', label: 'Repel Radius', min: 1, max: 5, step: 0.5, default: 2.5 },
  ],
  ripple: [
    { key: 'rippleStrength', label: 'Ripple Strength', min: 0.1, max: 1.0, step: 0.1, default: 0.4 },
    { key: 'rippleFreq', label: 'Wave Frequency', min: 10, max: 50, step: 5, default: 30 },
    { key: 'rippleDecay', label: 'Decay Rate', min: 1, max: 10, step: 0.5, default: 5 },
  ],
  cardhover: [
    { key: 'maxTilt', label: 'Max Tilt (deg)', min: 5, max: 30, step: 1, default: 15 },
    { key: 'flipDuration', label: 'Flip Speed', min: 0.2, max: 1.0, step: 0.1, default: 0.6 },
  ],
  texthover: [
    { key: 'letterDelay', label: 'Letter Delay', min: 0.01, max: 0.08, step: 0.005, default: 0.03 },
    { key: 'liftHeight', label: 'Lift Height', min: 5, max: 25, step: 1, default: 12 },
  ],
  buttonhover: [
    { key: 'slideDuration', label: 'Slide Speed', min: 0.2, max: 1.0, step: 0.1, default: 0.5 },
    { key: 'morphRadius', label: 'Morph Radius', min: 10, max: 50, step: 5, default: 50 },
  ],
  imagehover: [
    { key: 'zoomScale', label: 'Zoom Amount', min: 1.05, max: 1.4, step: 0.05, default: 1.15 },
    { key: 'shutterBars', label: 'Shutter Bars', min: 3, max: 8, step: 1, default: 5 },
  ]
};

// ============================================================
// TUNNEL EFFECTS
// ============================================================

// Performance: Memoized to prevent unnecessary re-renders when parent updates
const RingTunnel = React.memo(() => {
  const groupRef = useRef();
  const ringsRef = useRef([]);
  const scroll = useScroll();
  const controls = useControls();
  
  const ringCount = controls.ringCount || 50;
  const ringSpacing = controls.ringSpacing || 2.5;
  const travelSpeed = controls.travelSpeed || 100;
  const hueStart = controls.hueStart || 180;
  
  const rings = useMemo(() => 
    new Array(ringCount).fill(0).map((_, i) => ({
      z: -i * ringSpacing,
      hue: hueStart + i * 3,
      opacity: Math.max(0.15, 1 - i * 0.018)
    })), [ringCount, ringSpacing, hueStart]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const progress = scroll.range(0, 0.5);
    groupRef.current.position.z = progress * travelSpeed;
    
    ringsRef.current.forEach((ring, i) => {
      if (ring) ring.rotation.z = state.clock.elapsedTime * (i % 2 ? 0.1 : -0.1);
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh key={i} ref={el => ringsRef.current[i] = el} position={[0, 0, ring.z]}>
          <torusGeometry args={[3.5, 0.04, 8, 80]} />
          <meshBasicMaterial color={`hsl(${ring.hue}, 80%, 55%)`} transparent opacity={ring.opacity} />
        </mesh>
      ))}
      <pointLight position={[0, 0, -ringCount * ringSpacing]} intensity={8} color="#22d3ee" distance={120} />
    </group>
  );
});

const ParticleTunnel = React.memo(() => {
  const pointsRef = useRef();
  const scroll = useScroll();
  const controls = useControls();
  
  const travelSpeed = controls.travelSpeed || 120;
  const hueStart = controls.hueStart || 180;
  
  const particles = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    const colors = new Float32Array(2000 * 3);
    
    for (let i = 0; i < 2000; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 4;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = -Math.random() * 150;
      
      const color = new THREE.Color(`hsl(${hueStart + Math.random() * 60}, 80%, 60%)`);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { positions, colors };
  }, [hueStart]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const progress = scroll.range(0, 0.5);
    pointsRef.current.position.z = progress * travelSpeed;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={2000} array={particles.positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={2000} array={particles.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} vertexColors transparent opacity={0.9} sizeAttenuation />
    </points>
  );
});

// ============================================================
// VELOCITY DEFORMATION
// ============================================================

const MorphingSphere = React.memo(() => {
  const meshRef = useRef();
  const scroll = useScroll();
  const velocity = useRef(0);
  const controls = useControls();
  
  const distortIntensity = controls.distortIntensity || 0.5;
  const baseSpeed = controls.baseSpeed || 2;
  const velocityMultiplier = controls.velocityMultiplier || 80;

  useFrame((state) => {
    if (!meshRef.current) return;
    velocity.current = THREE.MathUtils.lerp(velocity.current, Math.abs(scroll.delta) * velocityMultiplier, 0.08);
    
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.4;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.6;
    
    if (meshRef.current.material) {
      meshRef.current.material.distort = 0.2 + Math.min(velocity.current * distortIntensity, 0.8);
      meshRef.current.material.speed = baseSpeed + velocity.current * 0.05;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3}>
      <mesh ref={meshRef} scale={2.5}>
        <icosahedronGeometry args={[1, 8]} />
        <MeshDistortMaterial color="#a855f7" emissive="#7c3aed" emissiveIntensity={0.5} roughness={0.15} metalness={0.85} distort={0.3} speed={baseSpeed} />
      </mesh>
    </Float>
  );
});

const WobblingTorus = React.memo(() => {
  const meshRef = useRef();
  const scroll = useScroll();
  const velocity = useRef(0);
  const controls = useControls();
  
  const distortIntensity = controls.distortIntensity || 0.8;
  const baseSpeed = controls.baseSpeed || 2;
  const velocityMultiplier = controls.velocityMultiplier || 60;

  useFrame((state) => {
    if (!meshRef.current) return;
    velocity.current = THREE.MathUtils.lerp(velocity.current, Math.abs(scroll.delta) * velocityMultiplier, 0.1);
    
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    
    if (meshRef.current.material) {
      meshRef.current.material.factor = 0.5 + velocity.current * distortIntensity;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.4}>
      <mesh ref={meshRef} scale={2}>
        <torusKnotGeometry args={[1, 0.35, 128, 32]} />
        <MeshWobbleMaterial color="#ec4899" emissive="#be185d" emissiveIntensity={0.4} factor={0.5} speed={baseSpeed} />
      </mesh>
    </Float>
  );
});

// ============================================================
// SHADER EFFECTS
// ============================================================

const LiquidPlane = React.memo(() => {
  const matRef = useRef();
  const scroll = useScroll();
  const vel = useRef(0);
  const controls = useControls();
  
  const waveFrequency = controls.waveFrequency || 3.5;
  const waveAmplitude = controls.waveAmplitude || 0.35;
  const timeSpeed = controls.timeSpeed || 2.5;

  const shader = useMemo(() => ({
    uniforms: { uTime: { value: 0 }, uVelocity: { value: 0 }, uFreq: { value: waveFrequency }, uAmp: { value: waveAmplitude } },
    vertexShader: `
      uniform float uTime; uniform float uVelocity; uniform float uFreq; uniform float uAmp;
      varying vec2 vUv; varying float vWave;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float wave = sin(pos.x * uFreq + uTime) * uAmp + sin(pos.y * (uFreq + 1.0) + uTime * 0.8) * (uAmp * 0.7);
        pos.z += wave * (1.0 + uVelocity * 3.5);
        vWave = pos.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime; varying vec2 vUv; varying float vWave;
      void main() {
        vec3 cyan = vec3(0.133, 0.827, 0.933);
        vec3 pink = vec3(0.925, 0.282, 0.6);
        vec3 color = mix(cyan, pink, vUv.x + sin(uTime * 0.5) * 0.15);
        color *= 0.9 + vWave * 0.15;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  }), [waveFrequency, waveAmplitude]);

  useFrame((state) => {
    if (!matRef.current) return;
    vel.current = THREE.MathUtils.lerp(vel.current, Math.abs(scroll.delta) * 40, 0.1);
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime * timeSpeed;
    matRef.current.uniforms.uVelocity.value = vel.current;
  });

  return (
    <mesh rotation={[-0.3, 0, 0]}>
      <planeGeometry args={[8, 6, 80, 80]} />
      <shaderMaterial ref={matRef} args={[shader]} side={THREE.DoubleSide} />
    </mesh>
  );
});

const NoiseSphere = React.memo(() => {
  const matRef = useRef();
  const meshRef = useRef();
  const scroll = useScroll();
  const vel = useRef(0);
  const controls = useControls();
  
  const waveAmplitude = controls.waveAmplitude || 0.3;
  const timeSpeed = controls.timeSpeed || 0.5;

  const shader = useMemo(() => ({
    uniforms: { uTime: { value: 0 }, uVelocity: { value: 0 }, uAmp: { value: waveAmplitude } },
    vertexShader: `
      uniform float uTime; uniform float uVelocity; uniform float uAmp;
      varying vec2 vUv; varying float vDisplacement;
      float noise(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.5432))) * 43758.5453); }
      void main() {
        vUv = uv;
        vec3 pos = position;
        float n = noise(pos * 2.0 + uTime);
        float displacement = n * (uAmp + uVelocity * 0.8);
        pos += normal * displacement;
        vDisplacement = displacement;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime; varying vec2 vUv; varying float vDisplacement;
      void main() {
        vec3 purple = vec3(0.659, 0.341, 0.969);
        vec3 orange = vec3(0.969, 0.533, 0.133);
        vec3 color = mix(purple, orange, vDisplacement * 2.0 + sin(uTime) * 0.2);
        gl_FragColor = vec4(color, 1.0);
      }
    `
  }), [waveAmplitude]);

  useFrame((state) => {
    if (!matRef.current || !meshRef.current) return;
    vel.current = THREE.MathUtils.lerp(vel.current, Math.abs(scroll.delta) * 40, 0.1);
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime * timeSpeed;
    matRef.current.uniforms.uVelocity.value = vel.current;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
  });

  return (
    <mesh ref={meshRef} scale={2.5}>
      <icosahedronGeometry args={[1, 32]} />
      <shaderMaterial ref={matRef} args={[shader]} />
    </mesh>
  );
});

// ============================================================
// EXPLODED VIEWS
// ============================================================

const ExplodedCube = React.memo(() => {
  const groupRef = useRef();
  const partsRef = useRef([]);
  const scroll = useScroll();
  const controls = useControls();
  
  const maxExplosion = controls.maxExplosion || 4;
  const rotationSpeed = controls.rotationSpeed || 0.2;

  const parts = useMemo(() => [
    { pos: [0, 1, 0], rot: [0, 0, 0], color: '#22d3ee', dir: [0, 1, 0] },
    { pos: [0, -1, 0], rot: [0, 0, 0], color: '#06b6d4', dir: [0, -1, 0] },
    { pos: [1, 0, 0], rot: [0, 0, Math.PI/2], color: '#0891b2', dir: [1, 0, 0] },
    { pos: [-1, 0, 0], rot: [0, 0, Math.PI/2], color: '#0e7490', dir: [-1, 0, 0] },
    { pos: [0, 0, 1], rot: [Math.PI/2, 0, 0], color: '#155e75', dir: [0, 0, 1] },
    { pos: [0, 0, -1], rot: [Math.PI/2, 0, 0], color: '#164e63', dir: [0, 0, -1] },
  ], []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const explosion = scroll.range(0.2, 0.6);
    const dist = explosion * maxExplosion;
    
    partsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = parts[i];
      mesh.position.set(p.pos[0] + p.dir[0] * dist, p.pos[1] + p.dir[1] * dist, p.pos[2] + p.dir[2] * dist);
    });
    
    groupRef.current.rotation.x = state.clock.elapsedTime * rotationSpeed;
    groupRef.current.rotation.y = state.clock.elapsedTime * rotationSpeed * 1.5;
  });

  return (
    <group ref={groupRef}>
      {parts.map((p, i) => (
        <mesh key={i} ref={el => partsRef.current[i] = el} position={p.pos} rotation={p.rot}>
          <boxGeometry args={[2.2, 0.2, 2.2]} />
          <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.35} metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
      <mesh scale={0.6}><icosahedronGeometry args={[1, 2]} /><meshBasicMaterial color="#fff" wireframe /></mesh>
      <pointLight intensity={3} color="#22d3ee" distance={8} />
    </group>
  );
});

const ExplodedIcosahedron = React.memo(() => {
  const groupRef = useRef();
  const partsRef = useRef([]);
  const scroll = useScroll();
  const controls = useControls();
  
  const maxExplosion = controls.maxExplosion || 3;
  const rotationSpeed = controls.rotationSpeed || 0.25;

  const parts = useMemo(() => {
    const faces = [];
    for (let i = 0; i < 20; i++) {
      const angle1 = (i / 20) * Math.PI * 2;
      const angle2 = ((i % 5) / 5) * Math.PI;
      faces.push({
        pos: [Math.sin(angle1) * 1.2, Math.cos(angle2) * 1.2 - 0.5, Math.cos(angle1) * 1.2],
        dir: [Math.sin(angle1), Math.cos(angle2) - 0.4, Math.cos(angle1)],
        color: `hsl(${280 + i * 4}, 70%, 55%)`
      });
    }
    return faces;
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const explosion = scroll.range(0.2, 0.6);
    const dist = explosion * maxExplosion;
    
    partsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = parts[i];
      mesh.position.set(p.pos[0] + p.dir[0] * dist, p.pos[1] + p.dir[1] * dist, p.pos[2] + p.dir[2] * dist);
    });
    
    groupRef.current.rotation.y = state.clock.elapsedTime * rotationSpeed;
  });

  return (
    <group ref={groupRef} scale={2}>
      {parts.map((p, i) => (
        <mesh key={i} ref={el => partsRef.current[i] = el} position={p.pos}>
          <tetrahedronGeometry args={[0.35]} />
          <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      <pointLight intensity={2} color="#a855f7" distance={6} />
    </group>
  );
});

// ============================================================
// ROTATION MAPPING
// ============================================================

const WireframeGlobe = React.memo(() => {
  const groupRef = useRef();
  const innerRef = useRef();
  const scroll = useScroll();
  const controls = useControls();
  
  const rotationMultiplier = controls.rotationMultiplier || 4;
  const tiltAmount = controls.tiltAmount || 0.2;

  useFrame((state) => {
    if (!groupRef.current) return;
    const rot = scroll.offset * Math.PI * rotationMultiplier;
    groupRef.current.rotation.y = rot;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * tiltAmount;
    if (innerRef.current) innerRef.current.rotation.y = -rot * 0.5;
  });

  return (
    <group ref={groupRef}>
      <mesh><sphereGeometry args={[3, 40, 40]} /><meshStandardMaterial color="#7c3aed" emissive="#a855f7" emissiveIntensity={0.4} wireframe /></mesh>
      <mesh scale={0.8}><sphereGeometry args={[3, 28, 28]} /><meshStandardMaterial color="#8b5cf6" emissive="#c084fc" emissiveIntensity={0.25} wireframe transparent opacity={0.5} /></mesh>
      <mesh ref={innerRef} scale={0.4}><icosahedronGeometry args={[3, 3]} /><meshStandardMaterial color="#c084fc" emissive="#e879f9" emissiveIntensity={0.6} metalness={0.8} roughness={0.2} /></mesh>
      <mesh rotation={[Math.PI/2, 0, 0]}><torusGeometry args={[4, 0.025, 16, 100]} /><meshBasicMaterial color="#a855f7" transparent opacity={0.7} /></mesh>
      <mesh rotation={[Math.PI/3, Math.PI/5, 0]}><torusGeometry args={[4.3, 0.025, 16, 100]} /><meshBasicMaterial color="#8b5cf6" transparent opacity={0.5} /></mesh>
      <pointLight intensity={4} color="#c084fc" distance={15} />
    </group>
  );
});

const DNAHelix = React.memo(() => {
  const groupRef = useRef();
  const scroll = useScroll();
  const controls = useControls();
  
  const rotationMultiplier = controls.rotationMultiplier || 6;

  const helixPoints = useMemo(() => {
    const points = [];
    for (let i = 0; i < 30; i++) {
      const t = i / 30 * Math.PI * 4;
      points.push({
        pos1: [Math.cos(t) * 1.5, i * 0.3 - 4.5, Math.sin(t) * 1.5],
        pos2: [Math.cos(t + Math.PI) * 1.5, i * 0.3 - 4.5, Math.sin(t + Math.PI) * 1.5],
        color: `hsl(${180 + i * 6}, 75%, 55%)`
      });
    }
    return points;
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = scroll.offset * Math.PI * rotationMultiplier;
  });

  return (
    <group ref={groupRef}>
      {helixPoints.map((p, i) => (
        <group key={i}>
          <mesh position={p.pos1}><sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.4} /></mesh>
          <mesh position={p.pos2}><sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.4} /></mesh>
          {i % 3 === 0 && (
            <mesh position={[(p.pos1[0] + p.pos2[0])/2, p.pos1[1], (p.pos1[2] + p.pos2[2])/2]} rotation={[0, Math.atan2(p.pos2[2] - p.pos1[2], p.pos2[0] - p.pos1[0]), Math.PI/2]}>
              <cylinderGeometry args={[0.05, 0.05, 3, 8]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
});

// ============================================================
// PARALLAX LAYERS
// ============================================================

const FloatingCards = React.memo(() => {
  const cardsRef = useRef([]);
  const scroll = useScroll();
  const controls = useControls();
  
  const speedMultiplier = controls.speedMultiplier || 8;

  const cards = useMemo(() => [
    { pos: [-3, 2, -5], speed: 0.3, color: '#22d3ee', size: [1.5, 2, 0.1] },
    { pos: [3, -1, -8], speed: 0.5, color: '#a855f7', size: [2, 1.2, 0.1] },
    { pos: [-2, -2, -3], speed: 0.2, color: '#ec4899', size: [1.2, 1.8, 0.1] },
    { pos: [2, 1.5, -6], speed: 0.4, color: '#10b981', size: [1.8, 1, 0.1] },
    { pos: [0, 0, -10], speed: 0.6, color: '#f59e0b', size: [2.5, 1.5, 0.1] },
    { pos: [-4, 0, -7], speed: 0.45, color: '#6366f1', size: [1.4, 2.2, 0.1] },
  ], []);

  useFrame((state) => {
    cardsRef.current.forEach((card, i) => {
      if (!card) return;
      const c = cards[i];
      card.position.y = c.pos[1] + scroll.offset * c.speed * speedMultiplier;
      card.rotation.y = Math.sin(state.clock.elapsedTime + i) * 0.1;
    });
  });

  return (
    <group>
      {cards.map((c, i) => (
        <mesh key={i} ref={el => cardsRef.current[i] = el} position={c.pos}>
          <boxGeometry args={c.size} />
          <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.3} metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
});

const MountainLayers = React.memo(() => {
  const layersRef = useRef([]);
  const scroll = useScroll();
  const controls = useControls();
  
  const speedMultiplier = controls.speedMultiplier || 8;
  const depthRange = controls.depthRange || 12;

  const layers = useMemo(() => {
    const baseZ = -15;
    const spacing = depthRange / 5;
    return [
      { z: baseZ, color: '#1e1b4b', height: 4, speed: 0.1 },
      { z: baseZ + spacing, color: '#312e81', height: 3.5, speed: 0.2 },
      { z: baseZ + spacing * 2, color: '#4338ca', height: 3, speed: 0.35 },
      { z: baseZ + spacing * 3, color: '#6366f1', height: 2.5, speed: 0.5 },
      { z: baseZ + spacing * 4, color: '#818cf8', height: 2, speed: 0.7 },
    ];
  }, [depthRange]);

  useFrame(() => {
    layersRef.current.forEach((layer, i) => {
      if (!layer) return;
      layer.position.y = -2 + scroll.offset * layers[i].speed * speedMultiplier;
    });
  });

  return (
    <group>
      {layers.map((l, i) => (
        <mesh key={i} ref={el => layersRef.current[i] = el} position={[0, -2, l.z]}>
          <planeGeometry args={[20, l.height * 2]} />
          <meshBasicMaterial color={l.color} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 4, -20]}><circleGeometry args={[1.5, 32]} /><meshBasicMaterial color="#fef3c7" /></mesh>
    </group>
  );
});

// ============================================================
// DEPTH OF FIELD EFFECTS
// ============================================================

// Example 1: Focus Pull - Objects blur based on distance from focus point
const FocusPull = React.memo(() => {
  const groupRef = useRef();
  const objectsRef = useRef([]);
  const scroll = useScroll();
  const controls = useControls();
  
  const focusDistance = controls.focusDistance || 10;
  const blurIntensity = controls.blurIntensity || 0.5;
  const focalRange = controls.focalRange || 3;

  const objects = useMemo(() => {
    const items = [];
    for (let i = 0; i < 15; i++) {
      items.push({
        position: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, -i * 1.5 - 2],
        scale: 0.3 + Math.random() * 0.4,
        color: `hsl(${200 + i * 10}, 70%, 55%)`,
        type: i % 3
      });
    }
    return items;
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    const currentFocus = scroll.offset * focusDistance * 2;
    
    objectsRef.current.forEach((obj, i) => {
      if (!obj) return;
      const dist = Math.abs(-objects[i].position[2] - currentFocus);
      const blur = Math.min(dist / focalRange, 1) * blurIntensity;
      
      obj.material.opacity = 1 - blur * 0.7;
      obj.scale.setScalar(objects[i].scale * (1 + blur * 0.3));
    });
  });

  return (
    <group ref={groupRef}>
      {objects.map((obj, i) => (
        <mesh key={i} ref={el => objectsRef.current[i] = el} position={obj.position} scale={obj.scale}>
          {obj.type === 0 && <sphereGeometry args={[1, 16, 16]} />}
          {obj.type === 1 && <boxGeometry args={[1, 1, 1]} />}
          {obj.type === 2 && <octahedronGeometry args={[1]} />}
          <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={0.3} transparent />
        </mesh>
      ))}
      <pointLight position={[0, 0, 0]} intensity={2} color="#22d3ee" />
    </group>
  );
});

// Example 2: Bokeh Particles - Out of focus lights become soft circles
const BokehParticles = React.memo(() => {
  const groupRef = useRef();
  const particlesRef = useRef([]);
  const scroll = useScroll();
  const controls = useControls();
  
  const focusDistance = controls.focusDistance || 10;
  const blurIntensity = controls.blurIntensity || 0.5;

  const particles = useMemo(() => {
    const items = [];
    for (let i = 0; i < 50; i++) {
      items.push({
        position: [(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, -Math.random() * 20 - 2],
        baseScale: 0.1 + Math.random() * 0.15,
        color: `hsl(${Math.random() * 60 + 180}, 80%, 60%)`
      });
    }
    return items;
  }, []);

  useFrame(() => {
    const currentFocus = scroll.offset * focusDistance * 2;
    
    particlesRef.current.forEach((p, i) => {
      if (!p) return;
      const dist = Math.abs(-particles[i].position[2] - currentFocus);
      const bokehSize = particles[i].baseScale * (1 + dist * blurIntensity * 0.3);
      const opacity = 1 / (1 + dist * 0.1);
      
      p.scale.setScalar(bokehSize);
      p.material.opacity = opacity;
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} ref={el => particlesRef.current[i] = el} position={p.position}>
          <circleGeometry args={[1, 32]} />
          <meshBasicMaterial color={p.color} transparent side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
});

// ============================================================
// CAMERA PATH EFFECTS
// ============================================================

// Example 1: Spline Camera - Camera follows a curved path
const SplineCamera = React.memo(() => {
  const groupRef = useRef();
  const pathRef = useRef();
  const scroll = useScroll();
  const controls = useControls();
  
  const pathRadius = controls.pathRadius || 10;
  const pathHeight = controls.pathHeight || 3;

  // Performance: Memoize geometry args to avoid recreation on every render
  const boxGeometryArgs = useMemo(() => [1, 1, 1], []);
  const sceneObjects = useMemo(() => 
    [...Array(8)].map((_, i) => ({
      position: [Math.cos(i * 0.8) * 5, Math.sin(i * 0.5) * 2, Math.sin(i * 0.8) * 5],
      color: `hsl(${i * 45}, 70%, 50%)`
    })), []);

  const pathPoints = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const angle = t * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * pathRadius,
        Math.sin(t * Math.PI * 2) * pathHeight,
        Math.sin(angle) * pathRadius
      ));
    }
    return points;
  }, [pathRadius, pathHeight]);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(pathPoints, true), [pathPoints]);

  useFrame(() => {
    if (!groupRef.current) return;
    const t = scroll.offset;
    const position = curve.getPointAt(t);
    
    // Visualize camera position with a marker
    groupRef.current.position.copy(position);
    groupRef.current.rotation.y = t * Math.PI * 4;
  });

  return (
    <group>
      {/* Path visualization */}
      <line ref={pathRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={pathPoints.length}
            array={new Float32Array(pathPoints.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.5} />
      </line>
      
      {/* Camera marker */}
      <group ref={groupRef}>
        <mesh>
          <coneGeometry args={[0.5, 1, 4]} />
          <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.5} />
        </mesh>
        <pointLight intensity={2} color="#ec4899" distance={5} />
      </group>
      
      {/* Scene objects to fly past */}
      {sceneObjects.map((obj, i) => (
        <mesh key={i} position={obj.position}>
          <boxGeometry args={boxGeometryArgs} />
          <meshStandardMaterial color={obj.color} />
        </mesh>
      ))}
    </group>
  );
});

// Example 2: Orbit Path - Camera orbits around central object
const OrbitPath = React.memo(() => {
  const orbitRef = useRef();
  const scroll = useScroll();
  const controls = useControls();
  
  const pathRadius = controls.pathRadius || 8;

  useFrame((state) => {
    if (!orbitRef.current) return;
    const angle = scroll.offset * Math.PI * 2;
    
    orbitRef.current.position.x = Math.cos(angle) * pathRadius;
    orbitRef.current.position.z = Math.sin(angle) * pathRadius;
    orbitRef.current.position.y = Math.sin(scroll.offset * Math.PI * 4) * 2;
    orbitRef.current.lookAt(0, 0, 0);
  });

  return (
    <group>
      {/* Central object */}
      <mesh>
        <icosahedronGeometry args={[2, 2]} />
        <meshStandardMaterial color="#a855f7" emissive="#7c3aed" emissiveIntensity={0.5} wireframe />
      </mesh>
      <mesh scale={1.5}>
        <icosahedronGeometry args={[2, 1]} />
        <meshStandardMaterial color="#c084fc" transparent opacity={0.2} wireframe />
      </mesh>
      
      {/* Orbiting camera marker */}
      <group ref={orbitRef}>
        <mesh>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.8} />
        </mesh>
        <pointLight intensity={3} color="#22d3ee" distance={8} />
      </group>
      
      {/* Orbit ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[pathRadius, 0.02, 16, 100]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.3} />
      </mesh>
    </group>
  );
});

// ============================================================
// MORPH TARGETS
// ============================================================

// Example 1: Shape Morph - Geometry interpolates between shapes
const ShapeMorph = React.memo(() => {
  const meshRef = useRef();
  const scroll = useScroll();
  const controls = useControls();
  
  const morphSpeed = controls.morphSpeed || 1;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = scroll.offset * morphSpeed;
    
    // Morph via scale transformation
    const phase = t * 3;
    const stage = Math.floor(phase) % 3;
    const progress = phase - Math.floor(phase);
    
    let scaleX, scaleY, scaleZ;
    
    if (stage === 0) {
      // Cube to flat disc
      scaleX = THREE.MathUtils.lerp(1, 2.5, progress);
      scaleY = THREE.MathUtils.lerp(1, 0.1, progress);
      scaleZ = THREE.MathUtils.lerp(1, 2.5, progress);
    } else if (stage === 1) {
      // Flat disc to tall pillar
      scaleX = THREE.MathUtils.lerp(2.5, 0.3, progress);
      scaleY = THREE.MathUtils.lerp(0.1, 4, progress);
      scaleZ = THREE.MathUtils.lerp(2.5, 0.3, progress);
    } else {
      // Pillar back to cube
      scaleX = THREE.MathUtils.lerp(0.3, 1, progress);
      scaleY = THREE.MathUtils.lerp(4, 1, progress);
      scaleZ = THREE.MathUtils.lerp(0.3, 1, progress);
    }
    
    meshRef.current.scale.set(scaleX, scaleY, scaleZ);
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#ec4899" emissive="#be185d" emissiveIntensity={0.4} metalness={0.8} roughness={0.2} />
      </mesh>
      <pointLight position={[3, 3, 3]} intensity={2} color="#ec4899" />
    </group>
  );
});

// Example 2: Blob Morph - Organic shape morphing
const BlobMorph = React.memo(() => {
  const meshRef = useRef();
  const scroll = useScroll();
  const controls = useControls();
  
  const morphSpeed = controls.morphSpeed || 1;
  const morphEasing = controls.morphEasing || 2;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = scroll.offset;
    const time = state.clock.elapsedTime;
    
    // Animated distortion based on scroll
    const distort = 0.2 + t * 0.6;
    meshRef.current.material.distort = distort;
    meshRef.current.material.speed = morphSpeed + t * morphEasing;
    
    meshRef.current.rotation.x = time * 0.2;
    meshRef.current.rotation.y = time * 0.3;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2}>
      <mesh ref={meshRef} scale={2}>
        <icosahedronGeometry args={[1, 8]} />
        <MeshDistortMaterial
          color="#10b981"
          emissive="#059669"
          emissiveIntensity={0.4}
          roughness={0.2}
          metalness={0.8}
          distort={0.3}
          speed={2}
        />
      </mesh>
    </Float>
  );
});

// ============================================================
// REVEAL EFFECTS
// ============================================================

// Example 1: Circle Reveal - Content reveals through expanding circle
const CircleReveal = React.memo(() => {
  const groupRef = useRef();
  const maskRef = useRef();
  const scroll = useScroll();
  const controls = useControls();
  
  const revealSpeed = controls.revealSpeed || 1;
  const edgeSoftness = controls.edgeSoftness || 0.1;

  const revealShader = useMemo(() => ({
    uniforms: {
      uProgress: { value: 0 },
      uSoftness: { value: edgeSoftness }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uSoftness;
      varying vec2 vUv;
      
      void main() {
        vec2 center = vec2(0.5);
        float dist = distance(vUv, center);
        float radius = uProgress * 0.75;
        
        float alpha = smoothstep(radius + uSoftness, radius - uSoftness, dist);
        
        vec3 color = mix(
          vec3(0.133, 0.827, 0.933),
          vec3(0.659, 0.341, 0.969),
          vUv.y
        );
        
        gl_FragColor = vec4(color, alpha);
      }
    `
  }), [edgeSoftness]);

  useFrame(() => {
    if (!maskRef.current) return;
    maskRef.current.uniforms.uProgress.value = scroll.offset * revealSpeed;
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[8, 6]} />
        <shaderMaterial ref={maskRef} args={[revealShader]} transparent />
      </mesh>
      
      {/* Hidden content behind */}
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[8, 6]} />
        <meshBasicMaterial color="#1e1b4b" />
      </mesh>
    </group>
  );
});

// Example 2: Wipe Reveal - Horizontal wipe effect
const WipeReveal = React.memo(() => {
  const contentRef = useRef([]);
  const scroll = useScroll();
  const controls = useControls();
  
  const revealSpeed = controls.revealSpeed || 1;

  const items = useMemo(() => [
    { x: -3, color: '#22d3ee' },
    { x: -1.5, color: '#a855f7' },
    { x: 0, color: '#ec4899' },
    { x: 1.5, color: '#f59e0b' },
    { x: 3, color: '#10b981' },
  ], []);

  useFrame(() => {
    const progress = scroll.offset * revealSpeed;
    
    contentRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const itemProgress = (progress - i * 0.15) * 2;
      const scale = THREE.MathUtils.clamp(itemProgress, 0, 1);
      
      mesh.scale.y = scale;
      mesh.material.opacity = scale;
    });
  });

  return (
    <group>
      {items.map((item, i) => (
        <mesh key={i} ref={el => contentRef.current[i] = el} position={[item.x, 0, 0]}>
          <boxGeometry args={[1, 4, 0.5]} />
          <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={0.3} transparent />
        </mesh>
      ))}
    </group>
  );
});

// ============================================================
// TEXTURE/UV SCROLL EFFECTS
// ============================================================

// Example 1: Grid Scroll - Scrolling grid pattern
const GridScroll = React.memo(() => {
  const meshRef = useRef();
  const matRef = useRef();
  const scroll = useScroll();
  const controls = useControls();
  
  const scrollSpeed = controls.scrollSpeed || 2;

  const gridShader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uScroll;
      varying vec2 vUv;
      
      void main() {
        vec2 uv = vUv;
        uv.y += uScroll;
        
        float gridX = step(0.9, fract(uv.x * 10.0));
        float gridY = step(0.9, fract(uv.y * 10.0));
        float grid = max(gridX, gridY);
        
        vec3 bgColor = vec3(0.05);
        vec3 lineColor = vec3(0.133, 0.827, 0.933);
        
        vec3 color = mix(bgColor, lineColor, grid);
        gl_FragColor = vec4(color, 1.0);
      }
    `
  }), []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    matRef.current.uniforms.uScroll.value = scroll.offset * scrollSpeed;
  });

  return (
    <mesh ref={meshRef} rotation={[-0.5, 0, 0]}>
      <planeGeometry args={[12, 8, 1, 1]} />
      <shaderMaterial ref={matRef} args={[gridShader]} />
    </mesh>
  );
});

// Example 2: Wave UV Distortion
const WaveUVDistortion = React.memo(() => {
  const matRef = useRef();
  const scroll = useScroll();
  const controls = useControls();
  
  const scrollSpeed = controls.scrollSpeed || 2;
  const distortAmount = controls.distortAmount || 0.1;

  const waveShader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uDistort: { value: distortAmount }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uScroll;
      uniform float uDistort;
      varying vec2 vUv;
      
      void main() {
        vec2 uv = vUv;
        uv.x += sin(vUv.y * 10.0 + uScroll * 5.0) * uDistort;
        uv.y += cos(vUv.x * 10.0 + uScroll * 3.0) * uDistort;
        
        vec3 color1 = vec3(0.925, 0.282, 0.6);
        vec3 color2 = vec3(0.659, 0.341, 0.969);
        vec3 color3 = vec3(0.133, 0.827, 0.933);
        
        vec3 color = mix(color1, color2, uv.x);
        color = mix(color, color3, uv.y);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `
  }), [distortAmount]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    matRef.current.uniforms.uScroll.value = scroll.offset * scrollSpeed;
  });

  return (
    <mesh>
      <planeGeometry args={[8, 6, 1, 1]} />
      <shaderMaterial ref={matRef} args={[waveShader]} />
    </mesh>
  );
});

// ============================================================
// ORBIT CONTROLS EFFECTS
// ============================================================

// Example 1: Zoom Orbit - Mouse orbit with scroll zoom
const ZoomOrbit = React.memo(() => {
  const groupRef = useRef();
  const scroll = useScroll();
  const controls = useControls();
  
  const zoomRange = controls.zoomRange || 15;
  const autoRotate = controls.autoRotate || 0.5;

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Auto rotation
    groupRef.current.rotation.y += autoRotate * 0.01;
    
    // Scroll controls zoom (scale as proxy for zoom)
    const zoom = 1 + scroll.offset * (zoomRange / 10);
    groupRef.current.scale.setScalar(zoom);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <torusKnotGeometry args={[1, 0.3, 128, 32]} />
        <meshStandardMaterial color="#a855f7" emissive="#7c3aed" emissiveIntensity={0.4} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh scale={1.5}>
        <torusKnotGeometry args={[1, 0.3, 64, 16]} />
        <meshStandardMaterial color="#22d3ee" wireframe transparent opacity={0.3} />
      </mesh>
      <pointLight intensity={2} color="#a855f7" distance={10} />
    </group>
  );
});

// Example 2: Speed Orbit - Rotation speed based on scroll velocity
const SpeedOrbit = React.memo(() => {
  const groupRef = useRef();
  const scroll = useScroll();
  const velocityRef = useRef(0);
  const rotationRef = useRef(0);
  const controls = useControls();
  
  const orbitSpeed = controls.orbitSpeed || 0.5;

  // Performance: Memoize geometry args and orbiting objects
  const octahedronGeometryArgs = useMemo(() => [0.8], []);
  const sphereGeometryArgs = useMemo(() => [1, 32, 32], []);
  const orbitingObjects = useMemo(() => 
    [...Array(6)].map((_, i) => ({
      position: [Math.cos(i * Math.PI / 3) * 3, 0, Math.sin(i * Math.PI / 3) * 3],
      color: `hsl(${i * 60 + 180}, 70%, 55%)`,
      emissive: `hsl(${i * 60 + 180}, 70%, 35%)`
    })), []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    // Track velocity
    const targetVel = Math.abs(scroll.delta) * 50;
    velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, targetVel, 0.1);
    
    // Base rotation + velocity boost
    const speed = orbitSpeed + velocityRef.current * 0.5;
    rotationRef.current += speed * delta;
    
    groupRef.current.rotation.y = rotationRef.current;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
  });

  return (
    <group ref={groupRef}>
      {orbitingObjects.map((obj, i) => (
        <mesh key={i} position={obj.position}>
          <octahedronGeometry args={octahedronGeometryArgs} />
          <meshStandardMaterial 
            color={obj.color} 
            emissive={obj.emissive}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
      <mesh>
        <sphereGeometry args={sphereGeometryArgs} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      <pointLight intensity={3} color="#ffffff" distance={10} />
    </group>
  );
});

// ============================================================
// HOVER TRANSFORM EFFECTS
// ============================================================

const ScalePop = React.memo(() => {
  const groupRef = useRef();
  const meshRefs = useRef([]);
  const hoveredIndex = useRef(-1);
  const controls = useControls();

  const hoverScale = controls.hoverScale || 1.4;
  const lerpSpeed = controls.lerpSpeed || 0.1;

  const boxes = useMemo(() => {
    const items = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        items.push({
          position: [(col - 1.5) * 1.8, (row - 1.5) * 1.8, 0],
          color: `hsl(${(row * 4 + col) * 22 + 180}, 70%, 55%)`,
          index: row * 4 + col,
        });
      }
    }
    return items;
  }, []);

  useFrame(() => {
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const isHovered = i === hoveredIndex.current;
      const targetScale = isHovered ? hoverScale : 1;
      mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), lerpSpeed);

      if (isHovered) {
        mesh.material.emissiveIntensity = THREE.MathUtils.lerp(mesh.material.emissiveIntensity, 0.8, 0.1);
      } else {
        mesh.material.emissiveIntensity = THREE.MathUtils.lerp(mesh.material.emissiveIntensity, 0.2, 0.1);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {boxes.map((box, i) => (
        <mesh
          key={i}
          ref={el => meshRefs.current[i] = el}
          position={box.position}
          onPointerOver={() => { hoveredIndex.current = i; }}
          onPointerOut={() => { if (hoveredIndex.current === i) hoveredIndex.current = -1; }}
        >
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshStandardMaterial color={box.color} emissive={box.color} emissiveIntensity={0.2} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
});

const SpinHover = React.memo(() => {
  const meshRefs = useRef([]);
  const spinSpeeds = useRef([]);
  const hoveredSet = useRef(new Set());
  const controls = useControls();

  const spinRate = controls.spinRate || 3;

  const shapes = useMemo(() => {
    const items = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      items.push({
        position: [Math.cos(angle) * 3, Math.sin(angle) * 3, 0],
        color: `hsl(${i * 60 + 200}, 75%, 55%)`,
      });
      spinSpeeds.current[i] = 0;
    }
    return items;
  }, []);

  useFrame((state, delta) => {
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const target = hoveredSet.current.has(i) ? spinRate : 0;
      spinSpeeds.current[i] = THREE.MathUtils.lerp(spinSpeeds.current[i], target, 0.05);
      mesh.rotation.y += spinSpeeds.current[i] * delta;
      mesh.rotation.x = Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.2;
    });
  });

  return (
    <group>
      {shapes.map((shape, i) => (
        <mesh
          key={i}
          ref={el => meshRefs.current[i] = el}
          position={shape.position}
          onPointerOver={() => hoveredSet.current.add(i)}
          onPointerOut={() => hoveredSet.current.delete(i)}
        >
          <torusKnotGeometry args={[0.6, 0.2, 64, 16]} />
          <meshStandardMaterial color={shape.color} emissive={shape.color} emissiveIntensity={0.3} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      <pointLight intensity={2} color="#22d3ee" distance={10} />
    </group>
  );
});

// ============================================================
// MOUSE FOLLOW EFFECTS
// ============================================================

const TrackingSphere = React.memo(() => {
  const meshRef = useRef();
  const controls = useControls();

  const followSpeed = controls.followSpeed || 0.08;
  const worldScale = controls.worldScale || 5;

  useFrame((state) => {
    if (!meshRef.current) return;
    const targetX = state.pointer.x * worldScale;
    const targetY = state.pointer.y * (worldScale * 0.6);

    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, followSpeed);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, followSpeed);

    meshRef.current.rotation.x = state.clock.elapsedTime * 0.4;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.6;
  });

  return (
    <group>
      <mesh ref={meshRef} scale={1.5}>
        <icosahedronGeometry args={[1, 4]} />
        <MeshDistortMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={0.5} roughness={0.2} metalness={0.8} distort={0.3} speed={2} />
      </mesh>
      <pointLight intensity={2} color="#22d3ee" distance={12} />
    </group>
  );
});

const LazyFollow = React.memo(() => {
  const meshRefs = useRef([]);
  const positions = useRef([]);
  const controls = useControls();

  const followSpeed = controls.followSpeed || 0.08;
  const trailCount = controls.trailCount || 8;
  const worldScale = controls.worldScale || 5;

  const spheres = useMemo(() => {
    const items = [];
    for (let i = 0; i < trailCount; i++) {
      items.push({
        scale: 0.4 - i * 0.03,
        color: `hsl(${180 + i * 15}, 80%, ${60 - i * 3}%)`,
      });
      positions.current[i] = new THREE.Vector3(0, 0, 0);
    }
    return items;
  }, [trailCount]);

  useFrame((state) => {
    // Leader follows mouse
    const targetX = state.pointer.x * worldScale;
    const targetY = state.pointer.y * (worldScale * 0.6);
    positions.current[0].lerp(new THREE.Vector3(targetX, targetY, 0), followSpeed);

    // Followers chase the one ahead
    for (let i = 1; i < positions.current.length; i++) {
      positions.current[i].lerp(positions.current[i - 1], followSpeed * 0.8);
    }

    // Update mesh positions
    meshRefs.current.forEach((mesh, i) => {
      if (!mesh || !positions.current[i]) return;
      mesh.position.copy(positions.current[i]);
      mesh.rotation.x = state.clock.elapsedTime * (0.5 + i * 0.1);
      mesh.rotation.y = state.clock.elapsedTime * (0.3 + i * 0.1);
    });
  });

  return (
    <group>
      {spheres.map((s, i) => (
        <mesh key={i} ref={el => meshRefs.current[i] = el} scale={s.scale}>
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color={s.color} emissive={s.color} emissiveIntensity={0.4} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <pointLight intensity={2} color="#22d3ee" distance={10} />
    </group>
  );
});

// ============================================================
// HOVER GLOW EFFECTS
// ============================================================

const EmissionPulse = React.memo(() => {
  const meshRef = useRef();
  const hovered = useRef(false);
  const controls = useControls();

  const glowIntensity = controls.glowIntensity || 2.0;
  const fadeSpeed = controls.fadeSpeed || 0.08;

  useFrame((state) => {
    if (!meshRef.current) return;
    const target = hovered.current ? glowIntensity : 0.3;
    meshRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
      meshRef.current.material.emissiveIntensity, target, fadeSpeed
    );

    const colorTarget = hovered.current ? 1.0 : 0.5;
    const t = THREE.MathUtils.lerp(meshRef.current.userData.colorT || 0.5, colorTarget, fadeSpeed);
    meshRef.current.userData.colorT = t;
    const hue = THREE.MathUtils.lerp(280, 190, t);
    meshRef.current.material.emissive.setHSL(hue / 360, 0.8, 0.5);

    meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
  });

  return (
    <group>
      <Float speed={1.5} rotationIntensity={0.2}>
        <mesh
          ref={meshRef}
          scale={2.5}
          onPointerOver={() => { hovered.current = true; }}
          onPointerOut={() => { hovered.current = false; }}
        >
          <icosahedronGeometry args={[1, 3]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
        </mesh>
      </Float>
      <pointLight intensity={2} color="#a855f7" distance={15} />
    </group>
  );
});

const ColorShift = React.memo(() => {
  const meshRefs = useRef([]);
  const controls = useControls();

  const fadeSpeed = controls.fadeSpeed || 0.08;

  const spheres = useMemo(() => {
    const items = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      items.push({
        position: [Math.cos(angle) * 3.5, Math.sin(angle) * 3.5, 0],
        baseHue: 180 + i * 15,
      });
    }
    return items;
  }, []);

  useFrame((state) => {
    const mouseX = state.pointer.x * 5;
    const mouseY = state.pointer.y * 3;
    const mousePos = new THREE.Vector3(mouseX, mouseY, 0);

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const dist = mesh.position.distanceTo(mousePos);
      const influence = Math.max(0, 1 - dist / 5);

      const hue = THREE.MathUtils.lerp(spheres[i].baseHue, 60, influence);
      mesh.material.color.setHSL(hue / 360, 0.8, 0.55);
      mesh.material.emissive.setHSL(hue / 360, 0.8, 0.3);
      mesh.material.emissiveIntensity = THREE.MathUtils.lerp(mesh.material.emissiveIntensity, 0.2 + influence * 1.5, fadeSpeed);

      mesh.position.y = spheres[i].position[1] + Math.sin(state.clock.elapsedTime + i * 0.5) * 0.2;
    });
  });

  return (
    <group>
      {spheres.map((s, i) => (
        <mesh key={i} ref={el => meshRefs.current[i] = el} position={s.position}>
          <sphereGeometry args={[0.5, 24, 24]} />
          <meshStandardMaterial color={`hsl(${s.baseHue}, 80%, 55%)`} emissive={`hsl(${s.baseHue}, 80%, 30%)`} emissiveIntensity={0.2} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <pointLight intensity={2} color="#22d3ee" distance={12} />
    </group>
  );
});

// ============================================================
// MAGNETIC CURSOR EFFECTS
// ============================================================

const AttractGrid = React.memo(() => {
  const meshRefs = useRef([]);
  const controls = useControls();

  const attractStrength = controls.attractStrength || 0.06;

  const grid = useMemo(() => {
    const items = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        items.push({
          rest: new THREE.Vector3((col - 3.5) * 0.9, (row - 3.5) * 0.9, 0),
          color: `hsl(${(row * 8 + col) * 5 + 180}, 70%, 55%)`,
        });
      }
    }
    return items;
  }, []);

  useFrame((state) => {
    const mouseX = state.pointer.x * 5;
    const mouseY = state.pointer.y * 3;
    const mousePos = new THREE.Vector3(mouseX, mouseY, 0);

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const rest = grid[i].rest;

      // Attract toward mouse
      const dir = mousePos.clone().sub(mesh.position);
      const dist = dir.length();
      const force = attractStrength / (dist * dist + 0.5);
      mesh.position.add(dir.normalize().multiplyScalar(force));

      // Spring back to rest
      mesh.position.lerp(rest, 0.02);
    });
  });

  return (
    <group>
      {grid.map((g, i) => (
        <mesh key={i} ref={el => meshRefs.current[i] = el} position={g.rest.toArray()}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial color={g.color} emissive={g.color} emissiveIntensity={0.3} />
        </mesh>
      ))}
      <pointLight intensity={2} color="#a855f7" distance={10} />
    </group>
  );
});

const RepelField = React.memo(() => {
  const meshRefs = useRef([]);
  const controls = useControls();

  const springBack = controls.springBack || 0.03;
  const repelRadius = controls.repelRadius || 2.5;

  const objects = useMemo(() => {
    const items = [];
    for (let i = 0; i < 30; i++) {
      items.push({
        rest: new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 2
        ),
        color: `hsl(${Math.random() * 60 + 270}, 70%, 55%)`,
        scale: 0.15 + Math.random() * 0.2,
      });
    }
    return items;
  }, []);

  useFrame((state) => {
    const mouseX = state.pointer.x * 5;
    const mouseY = state.pointer.y * 3;
    const mousePos = new THREE.Vector3(mouseX, mouseY, 0);

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const away = mesh.position.clone().sub(mousePos);
      const dist = away.length();

      if (dist < repelRadius) {
        const force = (repelRadius - dist) * 0.05;
        mesh.position.add(away.normalize().multiplyScalar(force));
      }

      // Spring back
      mesh.position.lerp(objects[i].rest, springBack);
    });
  });

  return (
    <group>
      {objects.map((obj, i) => (
        <mesh key={i} ref={el => meshRefs.current[i] = el} position={obj.rest.toArray()} scale={obj.scale}>
          <dodecahedronGeometry args={[1]} />
          <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={0.3} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <pointLight intensity={2} color="#ec4899" distance={10} />
    </group>
  );
});

// ============================================================
// RIPPLE HOVER EFFECTS
// ============================================================

const SurfaceRipple = React.memo(() => {
  const matRef = useRef();
  const mouseUV = useRef(new THREE.Vector2(0.5, 0.5));
  const controls = useControls();

  const rippleStrength = controls.rippleStrength || 0.4;
  const rippleFreq = controls.rippleFreq || 30;
  const rippleDecay = controls.rippleDecay || 5;

  const shader = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uStrength: { value: rippleStrength },
      uFreq: { value: rippleFreq },
      uDecay: { value: rippleDecay },
    },
    vertexShader: `
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uStrength;
      uniform float uFreq;
      uniform float uDecay;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float dist = distance(uv, uMouse);
        float wave = sin(dist * uFreq - uTime * 5.0) * exp(-dist * uDecay) * uStrength;
        pos.z += wave;
        vWave = wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vWave;
      void main() {
        vec3 cyan = vec3(0.133, 0.827, 0.933);
        vec3 purple = vec3(0.659, 0.341, 0.969);
        vec3 color = mix(cyan, purple, vUv.y + vWave * 0.5);
        color += vWave * 0.3;
        gl_FragColor = vec4(color, 1.0);
      }
    `
  }), [rippleStrength, rippleFreq, rippleDecay]);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    matRef.current.uniforms.uMouse.value.copy(mouseUV.current);
  });

  const handlePointerMove = useCallback((e) => {
    if (e.uv) {
      mouseUV.current.copy(e.uv);
    }
  }, []);

  return (
    <mesh rotation={[-0.4, 0, 0]} onPointerMove={handlePointerMove}>
      <planeGeometry args={[10, 7, 100, 100]} />
      <shaderMaterial ref={matRef} args={[shader]} side={THREE.DoubleSide} />
    </mesh>
  );
});

const WaveRing = React.memo(() => {
  const ringsRef = useRef([]);
  const controls = useControls();

  const rings = useMemo(() => {
    const items = [];
    for (let i = 0; i < 10; i++) {
      items.push({
        baseRadius: 0.5 + i * 0.4,
        color: `hsl(${180 + i * 15}, 80%, 55%)`,
        phase: i * 0.3,
      });
    }
    return items;
  }, []);

  useFrame((state) => {
    const mouseX = state.pointer.x * 3;
    const mouseY = state.pointer.y * 2;
    const time = state.clock.elapsedTime;

    ringsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const ring = rings[i];
      const pulse = Math.sin(time * 3 - ring.phase * 2) * 0.15;
      const scale = ring.baseRadius + pulse;

      mesh.scale.set(scale, scale, 1);
      mesh.position.x = mouseX * (0.1 * i);
      mesh.position.y = mouseY * (0.1 * i);
      mesh.material.opacity = 0.8 - i * 0.06;
    });
  });

  return (
    <group>
      {rings.map((ring, i) => (
        <mesh key={i} ref={el => ringsRef.current[i] = el} rotation={[0, 0, 0]}>
          <torusGeometry args={[1, 0.03, 16, 80]} />
          <meshBasicMaterial color={ring.color} transparent opacity={0.8} />
        </mesh>
      ))}
      <pointLight intensity={2} color="#22d3ee" distance={10} />
    </group>
  );
});

// ============================================================
// DOM-BASED MOUSEOVER COMPONENTS
// ============================================================

// Card Hover - TiltCard
const TiltCard = React.memo(() => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const controls = useControls();
  const maxTilt = controls.maxTilt || 15;

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotateX(-y * maxTilt);
    setRotateY(x * maxTilt);
  }, [maxTilt]);

  const handleMouseLeave = useCallback(() => {
    setRotateX(0);
    setRotateY(0);
    setIsHovered(false);
  }, []);

  return (
    <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'center', height: '100%', flexWrap: 'wrap' }}>
      {[
        { title: 'Aurora', subtitle: 'Northern Lights', gradient: 'linear-gradient(135deg, #0891b2, #a855f7)' },
        { title: 'Nebula', subtitle: 'Deep Space', gradient: 'linear-gradient(135deg, #7c3aed, #ec4899)' },
        { title: 'Prism', subtitle: 'Light Refraction', gradient: 'linear-gradient(135deg, #22d3ee, #10b981)' },
      ].map((card, i) => (
        <motion.div
          key={i}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          animate={{ rotateX, rotateY }}
          transition={{ type: 'spring', stiffness: 150, damping: 15 }}
          style={{
            width: 220,
            height: 300,
            borderRadius: 16,
            background: card.gradient,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: 24,
            cursor: 'pointer',
            transformStyle: 'preserve-3d',
            boxShadow: isHovered ? '0 25px 50px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ transform: 'translateZ(30px)' }}>
            <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>{card.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0 0' }}>{card.subtitle}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

// Card Hover - FlipCard
const FlipCard = React.memo(() => {
  const controls = useControls();
  const flipDuration = controls.flipDuration || 0.6;

  const cards = useMemo(() => [
    { front: 'React', back: 'Component-based UI library', color: '#22d3ee', icon: '⚛' },
    { front: 'Three.js', back: '3D graphics library for WebGL', color: '#a855f7', icon: '△' },
    { front: 'Framer', back: 'Production-ready motion library', color: '#ec4899', icon: '◆' },
  ], []);

  return (
    <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'center', height: '100%', flexWrap: 'wrap' }}>
      {cards.map((card, i) => (
        <motion.div
          key={i}
          whileHover={{ rotateY: 180 }}
          transition={{ duration: flipDuration }}
          style={{
            width: 200,
            height: 260,
            cursor: 'pointer',
            transformStyle: 'preserve-3d',
            perspective: 1000,
          }}
        >
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 16,
            background: `linear-gradient(145deg, ${card.color}22, ${card.color}44)`,
            border: `1px solid ${card.color}66`,
            backfaceVisibility: 'hidden',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 48 }}>{card.icon}</span>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 600, margin: 0 }}>{card.front}</h3>
          </div>
          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 16,
            background: `linear-gradient(145deg, ${card.color}44, ${card.color}22)`,
            border: `1px solid ${card.color}66`,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, textAlign: 'center',
          }}>
            <p style={{ color: '#fff', fontSize: 15, lineHeight: 1.5 }}>{card.back}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

// Text Hover - LetterSpread
const LetterSpread = React.memo(() => {
  const controls = useControls();
  const letterDelay = controls.letterDelay || 0.03;
  const liftHeight = controls.liftHeight || 12;

  const texts = useMemo(() => ['HOVER', 'THESE', 'WORDS'], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      {texts.map((text, ti) => (
        <motion.div
          key={ti}
          whileHover="hovered"
          style={{ display: 'flex', cursor: 'pointer', gap: 2 }}
        >
          {text.split('').map((char, ci) => (
            <motion.span
              key={ci}
              variants={{
                hovered: { y: -liftHeight, color: '#22d3ee', transition: { delay: ci * letterDelay, type: 'spring', stiffness: 300 } },
              }}
              style={{ fontSize: 48, fontWeight: 800, color: '#ffffff', letterSpacing: 4, display: 'inline-block' }}
            >
              {char}
            </motion.span>
          ))}
        </motion.div>
      ))}
    </div>
  );
});

// Text Hover - GlitchText
const GlitchText = React.memo(() => {
  const [hoveredIndex, setHoveredIndex] = useState(-1);

  const lines = useMemo(() => ['GLITCH', 'EFFECT', 'HOVER'], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      {lines.map((text, i) => (
        <div
          key={i}
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(-1)}
          style={{ position: 'relative', cursor: 'pointer' }}
        >
          <span style={{
            fontSize: 52, fontWeight: 900, color: '#fff',
            letterSpacing: 6, display: 'inline-block',
            textShadow: hoveredIndex === i
              ? '2px 0 #22d3ee, -2px 0 #ec4899, 0 2px #a855f7'
              : 'none',
            animation: hoveredIndex === i ? 'none' : 'none',
          }}>
            {hoveredIndex === i ? (
              text.split('').map((char, ci) => (
                <motion.span
                  key={ci}
                  animate={{
                    x: [0, -2, 3, -1, 0],
                    y: [0, 1, -2, 1, 0],
                    opacity: [1, 0.8, 1, 0.7, 1],
                  }}
                  transition={{ duration: 0.3, repeat: Infinity, delay: ci * 0.02 }}
                  style={{ display: 'inline-block' }}
                >
                  {char}
                </motion.span>
              ))
            ) : text}
          </span>
          {hoveredIndex === i && (
            <>
              <span style={{
                position: 'absolute', top: 2, left: 2, fontSize: 52, fontWeight: 900,
                color: '#22d3ee', opacity: 0.5, letterSpacing: 6, clipPath: 'inset(20% 0 40% 0)',
              }}>{text}</span>
              <span style={{
                position: 'absolute', top: -2, left: -2, fontSize: 52, fontWeight: 900,
                color: '#ec4899', opacity: 0.5, letterSpacing: 6, clipPath: 'inset(60% 0 10% 0)',
              }}>{text}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
});

// Button Effects - SlideButton
const SlideButton = React.memo(() => {
  const controls = useControls();
  const slideDuration = controls.slideDuration || 0.5;

  const buttons = useMemo(() => [
    { label: 'Get Started', gradient: 'linear-gradient(90deg, #22d3ee 0%, #a855f7 50%, #22d3ee 100%)' },
    { label: 'Learn More', gradient: 'linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #a855f7 100%)' },
    { label: 'Sign Up', gradient: 'linear-gradient(90deg, #ec4899 0%, #f59e0b 50%, #ec4899 100%)' },
    { label: 'Download', gradient: 'linear-gradient(90deg, #10b981 0%, #22d3ee 50%, #10b981 100%)' },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      {buttons.map((btn, i) => (
        <motion.button
          key={i}
          whileHover={{ backgroundPosition: '100% 0', scale: 1.05, boxShadow: '0 0 30px rgba(34,211,238,0.3)' }}
          transition={{ duration: slideDuration }}
          style={{
            padding: '14px 48px',
            fontSize: 16,
            fontWeight: 600,
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            cursor: 'pointer',
            background: btn.gradient,
            backgroundSize: '200% 100%',
            backgroundPosition: '0% 0',
            letterSpacing: 1,
          }}
        >
          {btn.label}
        </motion.button>
      ))}
    </div>
  );
});

// Button Effects - MorphButton
const MorphButton = React.memo(() => {
  const controls = useControls();
  const morphRadius = controls.morphRadius || 50;

  const buttons = useMemo(() => [
    { label: 'Primary', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)' },
    { label: 'Secondary', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
    { label: 'Accent', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
    { label: 'Success', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      {buttons.map((btn, i) => (
        <motion.button
          key={i}
          whileHover={{
            borderRadius: morphRadius,
            scale: 1.08,
            backgroundColor: btn.color,
            color: '#050505',
            boxShadow: `0 0 25px ${btn.color}66`,
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          style={{
            padding: '14px 48px',
            fontSize: 16,
            fontWeight: 600,
            color: btn.color,
            border: `2px solid ${btn.color}`,
            borderRadius: 8,
            cursor: 'pointer',
            background: btn.bg,
            letterSpacing: 1,
            minWidth: 180,
          }}
        >
          {btn.label}
        </motion.button>
      ))}
    </div>
  );
});

// Image Hover - ZoomReveal
const ZoomReveal = React.memo(() => {
  const controls = useControls();
  const zoomScale = controls.zoomScale || 1.15;

  const images = useMemo(() => [
    { title: 'Mountain Peak', subtitle: 'Elevation 4,200m', gradient: 'linear-gradient(135deg, #1e3a5f, #0891b2)' },
    { title: 'Ocean Deep', subtitle: 'Depth 3,800m', gradient: 'linear-gradient(135deg, #1e1b4b, #6366f1)' },
    { title: 'Desert Dunes', subtitle: 'Temperature 52°C', gradient: 'linear-gradient(135deg, #78350f, #f59e0b)' },
  ], []);

  return (
    <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', height: '100%', flexWrap: 'wrap' }}>
      {images.map((img, i) => (
        <motion.div
          key={i}
          whileHover="hovered"
          style={{
            width: 220, height: 280, borderRadius: 12,
            overflow: 'hidden', position: 'relative', cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <motion.div
            variants={{ hovered: { scale: zoomScale } }}
            transition={{ duration: 0.4 }}
            style={{
              width: '100%', height: '100%',
              background: img.gradient,
            }}
          />
          <motion.div
            variants={{
              hovered: { opacity: 1, y: 0 },
            }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: 20,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            }}
          >
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{img.title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '4px 0 0' }}>{img.subtitle}</p>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
});

// Image Hover - ShutterReveal
const ShutterReveal = React.memo(() => {
  const controls = useControls();
  const shutterBars = controls.shutterBars || 5;

  const images = useMemo(() => [
    { gradient: 'linear-gradient(135deg, #22d3ee, #a855f7)', label: 'Project Alpha' },
    { gradient: 'linear-gradient(135deg, #a855f7, #ec4899)', label: 'Project Beta' },
    { gradient: 'linear-gradient(135deg, #ec4899, #f59e0b)', label: 'Project Gamma' },
  ], []);

  return (
    <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', alignItems: 'center', height: '100%', flexWrap: 'wrap' }}>
      {images.map((img, idx) => (
        <motion.div
          key={idx}
          whileHover="revealed"
          initial="hidden"
          style={{
            width: 220, height: 280, borderRadius: 12,
            overflow: 'hidden', position: 'relative', cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Background image/gradient */}
          <div style={{ position: 'absolute', inset: 0, background: img.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{img.label}</span>
          </div>
          {/* Shutter bars */}
          {[...Array(shutterBars)].map((_, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { scaleY: 1 },
                revealed: { scaleY: 0, transition: { delay: i * 0.05, duration: 0.3 } },
              }}
              style={{
                position: 'absolute',
                top: `${(i / shutterBars) * 100}%`,
                left: 0, right: 0,
                height: `${100 / shutterBars}%`,
                background: '#0a0a0a',
                transformOrigin: 'top',
              }}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
});

// ============================================================
// SCENE WRAPPER
// ============================================================
const AnimationScene = ({ children, pages = 3 }) => (
  <>
    <ambientLight intensity={0.3} />
    <pointLight position={[-10, 10, 10]} intensity={2} color="#22d3ee" />
    <pointLight position={[10, -10, -10]} intensity={2} color="#ec4899" />
    <Stars radius={100} depth={50} count={2000} factor={4} fade speed={0.5} />
    <fog attach="fog" args={['#050505', 10, 80]} />
    <ScrollControls pages={pages} damping={0.12}>
      <Scroll>{children}</Scroll>
    </ScrollControls>
  </>
);

// ============================================================
// MOUSE SCENE WRAPPER (no ScrollControls)
// ============================================================
const MouseScene = ({ children }) => (
  <>
    <ambientLight intensity={0.3} />
    <pointLight position={[-10, 10, 10]} intensity={2} color="#22d3ee" />
    <pointLight position={[10, -10, -10]} intensity={2} color="#ec4899" />
    <Stars radius={100} depth={50} count={2000} factor={4} fade speed={0.5} />
    <fog attach="fog" args={['#050505', 10, 80]} />
    {children}
  </>
);

// ============================================================
// ANIMATIONS MAP
// ============================================================
const ANIMATIONS = {
  tunnel: [
    { name: 'Ring Tunnel', component: RingTunnel, description: 'Fly through concentric light rings' },
    { name: 'Particle Starfield', component: ParticleTunnel, description: 'Warp through a field of particles' }
  ],
  velocity: [
    { name: 'Morphing Sphere', component: MorphingSphere, description: 'Sphere distorts with scroll speed' },
    { name: 'Wobbling Torus Knot', component: WobblingTorus, description: 'Complex shape wobbles with velocity' }
  ],
  shader: [
    { name: 'Liquid Waves', component: LiquidPlane, description: 'Custom shader creating fluid motion' },
    { name: 'Noise Displacement', component: NoiseSphere, description: 'Procedural noise deforms geometry' }
  ],
  exploded: [
    { name: 'Exploded Cube', component: ExplodedCube, description: 'Cube separates into 6 faces' },
    { name: 'Exploded Icosahedron', component: ExplodedIcosahedron, description: '20 triangular faces separate' }
  ],
  rotation: [
    { name: 'Wireframe Globe', component: WireframeGlobe, description: 'Scroll offset maps to rotation' },
    { name: 'DNA Helix', component: DNAHelix, description: 'Double helix rotates with scroll' }
  ],
  parallax: [
    { name: 'Floating Cards', component: FloatingCards, description: 'Cards at different depths move at different speeds' },
    { name: 'Mountain Layers', component: MountainLayers, description: 'Layered landscape with depth parallax' }
  ],
  dof: [
    { name: 'Focus Pull', component: FocusPull, description: 'Objects blur based on distance from focus point' },
    { name: 'Bokeh Particles', component: BokehParticles, description: 'Out-of-focus lights become soft circles' }
  ],
  camerapath: [
    { name: 'Spline Camera', component: SplineCamera, description: 'Camera follows a curved path through space' },
    { name: 'Orbit Path', component: OrbitPath, description: 'Camera orbits around central object' }
  ],
  morph: [
    { name: 'Shape Morph', component: ShapeMorph, description: 'Geometry transforms through multiple shapes' },
    { name: 'Blob Morph', component: BlobMorph, description: 'Organic distortion morphing with scroll' }
  ],
  reveal: [
    { name: 'Circle Reveal', component: CircleReveal, description: 'Content reveals through expanding circle' },
    { name: 'Wipe Reveal', component: WipeReveal, description: 'Horizontal wipe reveals content bars' }
  ],
  uvscroll: [
    { name: 'Grid Scroll', component: GridScroll, description: 'Scrolling grid pattern effect' },
    { name: 'Wave UV Distortion', component: WaveUVDistortion, description: 'Wavy distortion on UV coordinates' }
  ],
  orbit: [
    { name: 'Zoom Orbit', component: ZoomOrbit, description: 'Auto rotation with scroll-based zoom' },
    { name: 'Speed Orbit', component: SpeedOrbit, description: 'Rotation speed based on scroll velocity' }
  ],
  // Mouseover - 3D Canvas
  hovertransform: [
    { name: 'Scale Pop', component: ScalePop, description: 'Grid of boxes scale up on hover with glow' },
    { name: 'Spin Hover', component: SpinHover, description: 'Torus knots spin while hovered' }
  ],
  mousefollow: [
    { name: 'Tracking Sphere', component: TrackingSphere, description: 'Sphere follows mouse position in 3D' },
    { name: 'Lazy Follow', component: LazyFollow, description: 'Chain of spheres follow with staggered delay' }
  ],
  hoverglow: [
    { name: 'Emission Pulse', component: EmissionPulse, description: 'Emissive glow ramps up on hover' },
    { name: 'Color Shift', component: ColorShift, description: 'Objects shift hue near cursor' }
  ],
  magnetic: [
    { name: 'Attract Grid', component: AttractGrid, description: 'Grid pulled toward mouse position' },
    { name: 'Repel Field', component: RepelField, description: 'Objects pushed away from cursor' }
  ],
  ripple: [
    { name: 'Surface Ripple', component: SurfaceRipple, description: 'Shader waves from pointer position' },
    { name: 'Wave Ring', component: WaveRing, description: 'Concentric rings pulse from cursor' }
  ],
  // Mouseover - DOM
  cardhover: [
    { name: 'Tilt Card', component: TiltCard, description: '3D perspective tilt on mouse move' },
    { name: 'Flip Card', component: FlipCard, description: 'Card flips to reveal back on hover' }
  ],
  texthover: [
    { name: 'Letter Spread', component: LetterSpread, description: 'Letters animate upward with stagger' },
    { name: 'Glitch Text', component: GlitchText, description: 'Digital glitch distortion on hover' }
  ],
  buttonhover: [
    { name: 'Slide Button', component: SlideButton, description: 'Gradient slides across on hover' },
    { name: 'Morph Button', component: MorphButton, description: 'Button morphs shape and fills on hover' }
  ],
  imagehover: [
    { name: 'Zoom Reveal', component: ZoomReveal, description: 'Image zooms with text overlay on hover' },
    { name: 'Shutter Reveal', component: ShutterReveal, description: 'Venetian blind reveal effect' }
  ]
};

// ============================================================
// CODE PANEL COMPONENT
// ============================================================
const CodeBlock = ({ code }) => (
  <pre className="code-block">
    <code>{code}</code>
  </pre>
);

const RightPanel = ({ isOpen, onToggle, activeTab, setActiveTab, category, example, controls, setControls }) => {
  const snippets = CODE_SNIPPETS[category]?.[example] || CODE_SNIPPETS[category]?.[0];
  const controlsConfig = CONTROLS_CONFIG[category] || [];

  // Performance: Memoize event handlers to prevent unnecessary re-renders
  // Note: setState functions from useState are stable and don't need to be in dependency arrays
  const handleControlChange = useCallback((key, value) => {
    setControls(prev => ({ ...prev, [key]: parseFloat(value) }));
  }, []);

  const handleResetControls = useCallback(() => {
    setControls({});
  }, []);

  const handleCodeTab = useCallback(() => {
    setActiveTab('code');
  }, []);

  const handleTweakTab = useCallback(() => {
    setActiveTab('tweak');
  }, []);

  return (
    <>
      {/* Toggle Button */}
      <button 
        className={`panel-toggle ${isOpen ? 'open' : ''}`} 
        onClick={onToggle}
        data-testid="panel-toggle"
        title={isOpen ? 'Close panel' : 'Open panel'}
      >
        {isOpen ? '→' : '←'}
      </button>
      
      {/* Panel */}
      <aside className={`right-panel ${isOpen ? 'open' : ''}`} data-testid="right-panel">
        {/* Tabs */}
        <div className="panel-tabs">
          <button 
            className={`panel-tab ${activeTab === 'code' ? 'active' : ''}`}
            onClick={handleCodeTab}
            data-testid="tab-code"
          >
            Code
          </button>
          <button 
            className={`panel-tab ${activeTab === 'tweak' ? 'active' : ''}`}
            onClick={handleTweakTab}
            data-testid="tab-tweak"
          >
            Tweak
          </button>
        </div>
        
        {/* Content */}
        <div className="panel-content">
          {activeTab === 'code' && snippets && (
            <div className="code-section">
              <h3 className="snippet-title">{snippets.title}</h3>
              <CodeBlock code={snippets.code} />
              <p className="snippet-explanation">{snippets.explanation}</p>
            </div>
          )}
          
          {activeTab === 'tweak' && (
            <div className="tweak-section">
              <p className="tweak-intro">Adjust parameters to see how they affect the animation.</p>
              
              {controlsConfig.map(ctrl => (
                <div key={ctrl.key} className="control-item">
                  <div className="control-header">
                    <label className="control-label">{ctrl.label}</label>
                    <span className="control-value">{controls[ctrl.key] ?? ctrl.default}</span>
                  </div>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={controls[ctrl.key] ?? ctrl.default}
                    onChange={(e) => handleControlChange(ctrl.key, e.target.value)}
                    className="control-slider"
                    data-testid={`control-${ctrl.key}`}
                  />
                  <div className="control-range">
                    <span>{ctrl.min}</span>
                    <span>{ctrl.max}</span>
                  </div>
                </div>
              ))}
              
              <button 
                className="reset-btn"
                onClick={handleResetControls}
                data-testid="reset-controls"
              >
                Reset to Defaults
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [activeCategory, setActiveCategory] = useState('tunnel');
  const [activeExample, setActiveExample] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  const [controls, setControls] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setActiveExample(0);
    setControls({}); // Reset controls when category changes
  }, [activeCategory]);

  // Performance: Memoize event handlers to prevent unnecessary re-renders
  // Note: setState functions from useState are stable and don't need to be in dependency arrays
  const handleTogglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
  }, []);

  const handleSetCategory = useCallback((catId) => {
    setActiveCategory(catId);
  }, []);

  const handleSetExample = useCallback((exampleIndex) => {
    setActiveExample(exampleIndex);
  }, []);

  const currentAnimations = ANIMATIONS[activeCategory];
  const CurrentComponent = currentAnimations[activeExample].component;
  const currentInfo = currentAnimations[activeExample];

  const activeCategoryData = CATEGORIES.find(c => c.id === activeCategory);
  const isMouseCategory = activeCategoryData?.type === 'mouse';
  const isDomRenderer = activeCategoryData?.renderer === 'dom';

  const scrollCategories = CATEGORIES.filter(c => c.type === 'scroll');
  const mouseCategories = CATEGORIES.filter(c => c.type === 'mouse');

  return (
    <ControlsContext.Provider value={controls}>
      <div className="app-root" data-testid="app-container">
        {isLoading && (
          <div className="loader-overlay">
            <div className="loader-spinner"></div>
            <p className="loader-text">Loading...</p>
          </div>
        )}

        {/* Sidebar */}
        <nav className="sidebar" data-testid="sidebar">
          <div className="sidebar-header">
            <h1 className="sidebar-title">Immersive<span>Horizons</span></h1>
            <p className="sidebar-subtitle">3D Interactive Effects</p>
          </div>

          <div className="sidebar-categories">
            <div className="sidebar-section-label">Scroll Effects</div>
            {scrollCategories.map(cat => (
              <button
                key={cat.id}
                className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleSetCategory(cat.id)}
                data-testid={`category-${cat.id}`}
                title={cat.name}
              >
                <span className="category-icon">{cat.icon}</span>
                <div className="category-info">
                  <span className="category-name">{cat.name}</span>
                  <span className="category-desc">{cat.description}</span>
                </div>
              </button>
            ))}

            <div className="sidebar-section-label">Mouseover Effects</div>
            {mouseCategories.map(cat => (
              <button
                key={cat.id}
                className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleSetCategory(cat.id)}
                data-testid={`category-${cat.id}`}
                title={cat.name}
              >
                <span className="category-icon">{cat.icon}</span>
                <div className="category-info">
                  <span className="category-name">{cat.name}</span>
                  <span className="category-desc">{cat.description}</span>
                </div>
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="main-content">
          <div className="example-tabs" data-testid="example-tabs">
            {currentAnimations.map((anim, i) => (
              <button
                key={i}
                className={`example-tab ${activeExample === i ? 'active' : ''}`}
                onClick={() => handleSetExample(i)}
                data-testid={`example-tab-${i}`}
              >
                Example {i + 1}: {anim.name}
              </button>
            ))}
          </div>

          <div className="canvas-container">
            {isDomRenderer ? (
              <div className="dom-scene" key={`${activeCategory}-${activeExample}`}>
                <CurrentComponent />
              </div>
            ) : (
              <Canvas
                key={`${activeCategory}-${activeExample}`}
                camera={{ position: [0, 0, 10], fov: 55 }}
                gl={{ antialias: true, powerPreference: 'high-performance' }}
              >
                <color attach="background" args={['#050505']} />
                <Suspense fallback={null}>
                  {isMouseCategory ? (
                    <MouseScene>
                      <CurrentComponent />
                    </MouseScene>
                  ) : (
                    <AnimationScene pages={3}>
                      <CurrentComponent />
                    </AnimationScene>
                  )}
                </Suspense>
              </Canvas>
            )}
          </div>

          <div className="info-panel" data-testid="info-panel">
            <h2 className="info-title">{currentInfo.name}</h2>
            <p className="info-desc">{currentInfo.description}</p>
            <div className="scroll-hint">
              {isMouseCategory ? (
                <><span>🖱</span> Hover to interact</>
              ) : (
                <><span>↕</span> Scroll to interact</>
              )}
            </div>
          </div>
        </main>

        {/* Right Panel */}
        <RightPanel
          isOpen={isPanelOpen}
          onToggle={handleTogglePanel}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          category={activeCategory}
          example={activeExample}
          controls={controls}
          setControls={setControls}
        />
      </div>
    </ControlsContext.Provider>
  );
}
