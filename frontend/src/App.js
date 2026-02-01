import React, { Suspense, useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Stars, MeshDistortMaterial, Float, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================
// ANIMATION CATEGORIES DATA
// ============================================================
const CATEGORIES = [
  { id: 'tunnel', name: 'Tunnel Effects', icon: '◎', description: 'Z-Axis depth perception' },
  { id: 'velocity', name: 'Velocity Deformation', icon: '◉', description: 'Speed-reactive morphing' },
  { id: 'shader', name: 'Shader Effects', icon: '◈', description: 'Custom WebGL shaders' },
  { id: 'exploded', name: 'Exploded Views', icon: '❖', description: 'Component separation' },
  { id: 'rotation', name: 'Rotation Mapping', icon: '◐', description: 'Scroll-to-rotation' },
  { id: 'parallax', name: 'Parallax Layers', icon: '☰', description: 'Depth layer movement' },
];

// ============================================================
// TUNNEL EFFECTS
// ============================================================

// Example 1: Ring Tunnel
const RingTunnel = () => {
  const groupRef = useRef();
  const ringsRef = useRef([]);
  const scroll = useScroll();
  
  const rings = useMemo(() => 
    new Array(50).fill(0).map((_, i) => ({
      z: -i * 2.5,
      hue: 180 + i * 3,
      opacity: Math.max(0.15, 1 - i * 0.018)
    })), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const progress = scroll.range(0, 0.5);
    groupRef.current.position.z = progress * 100;
    
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
      <pointLight position={[0, 0, -100]} intensity={8} color="#22d3ee" distance={120} />
    </group>
  );
};

// Example 2: Particle Tunnel / Starfield
const ParticleTunnel = () => {
  const pointsRef = useRef();
  const scroll = useScroll();
  
  const particles = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    const colors = new Float32Array(2000 * 3);
    
    for (let i = 0; i < 2000; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 4;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = -Math.random() * 150;
      
      const color = new THREE.Color(`hsl(${180 + Math.random() * 60}, 80%, 60%)`);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { positions, colors };
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const progress = scroll.range(0, 0.5);
    pointsRef.current.position.z = progress * 120;
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
};

// ============================================================
// VELOCITY DEFORMATION
// ============================================================

// Example 1: Morphing Sphere
const MorphingSphere = () => {
  const meshRef = useRef();
  const scroll = useScroll();
  const velocity = useRef(0);

  useFrame((state) => {
    if (!meshRef.current) return;
    velocity.current = THREE.MathUtils.lerp(velocity.current, Math.abs(scroll.delta) * 80, 0.08);
    
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.4;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.6;
    
    if (meshRef.current.material) {
      meshRef.current.material.distort = 0.2 + Math.min(velocity.current * 0.5, 0.8);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3}>
      <mesh ref={meshRef} scale={2.5}>
        <icosahedronGeometry args={[1, 8]} />
        <MeshDistortMaterial color="#a855f7" emissive="#7c3aed" emissiveIntensity={0.5} roughness={0.15} metalness={0.85} distort={0.3} speed={2} />
      </mesh>
    </Float>
  );
};

// Example 2: Wobbling Torus
const WobblingTorus = () => {
  const meshRef = useRef();
  const scroll = useScroll();
  const velocity = useRef(0);

  useFrame((state) => {
    if (!meshRef.current) return;
    velocity.current = THREE.MathUtils.lerp(velocity.current, Math.abs(scroll.delta) * 60, 0.1);
    
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    
    if (meshRef.current.material) {
      meshRef.current.material.factor = 0.5 + velocity.current * 0.8;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.4}>
      <mesh ref={meshRef} scale={2}>
        <torusKnotGeometry args={[1, 0.35, 128, 32]} />
        <MeshWobbleMaterial color="#ec4899" emissive="#be185d" emissiveIntensity={0.4} factor={0.5} speed={2} />
      </mesh>
    </Float>
  );
};

// ============================================================
// SHADER EFFECTS
// ============================================================

const LiquidShader = {
  uniforms: { uTime: { value: 0 }, uVelocity: { value: 0 } },
  vertexShader: `
    uniform float uTime; uniform float uVelocity;
    varying vec2 vUv; varying float vWave;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float wave = sin(pos.x * 3.5 + uTime * 2.5) * 0.35 + sin(pos.y * 4.5 + uTime * 2.0) * 0.25;
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
};

const NoiseShader = {
  uniforms: { uTime: { value: 0 }, uVelocity: { value: 0 } },
  vertexShader: `
    uniform float uTime; uniform float uVelocity;
    varying vec2 vUv; varying float vDisplacement;
    
    float noise(vec3 p) {
      return fract(sin(dot(p, vec3(12.9898, 78.233, 45.5432))) * 43758.5453);
    }
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      float n = noise(pos * 2.0 + uTime * 0.5);
      float displacement = n * (0.3 + uVelocity * 0.8);
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
};

// Example 1: Liquid Plane
const LiquidPlane = () => {
  const matRef = useRef();
  const scroll = useScroll();
  const vel = useRef(0);

  useFrame((state) => {
    if (!matRef.current) return;
    vel.current = THREE.MathUtils.lerp(vel.current, Math.abs(scroll.delta) * 40, 0.1);
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    matRef.current.uniforms.uVelocity.value = vel.current;
  });

  return (
    <mesh rotation={[-0.3, 0, 0]}>
      <planeGeometry args={[8, 6, 80, 80]} />
      <shaderMaterial ref={matRef} args={[LiquidShader]} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Example 2: Noise Sphere
const NoiseSphere = () => {
  const matRef = useRef();
  const meshRef = useRef();
  const scroll = useScroll();
  const vel = useRef(0);

  useFrame((state) => {
    if (!matRef.current || !meshRef.current) return;
    vel.current = THREE.MathUtils.lerp(vel.current, Math.abs(scroll.delta) * 40, 0.1);
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    matRef.current.uniforms.uVelocity.value = vel.current;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
  });

  return (
    <mesh ref={meshRef} scale={2.5}>
      <icosahedronGeometry args={[1, 32]} />
      <shaderMaterial ref={matRef} args={[NoiseShader]} />
    </mesh>
  );
};

// ============================================================
// EXPLODED VIEWS
// ============================================================

// Example 1: Exploded Cube
const ExplodedCube = () => {
  const groupRef = useRef();
  const partsRef = useRef([]);
  const scroll = useScroll();

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
    const dist = explosion * 4;
    
    partsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = parts[i];
      mesh.position.set(p.pos[0] + p.dir[0] * dist, p.pos[1] + p.dir[1] * dist, p.pos[2] + p.dir[2] * dist);
    });
    
    groupRef.current.rotation.x = state.clock.elapsedTime * 0.2;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
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
};

// Example 2: Exploded Icosahedron
const ExplodedIcosahedron = () => {
  const groupRef = useRef();
  const partsRef = useRef([]);
  const scroll = useScroll();

  const parts = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 0);
    const positions = geo.attributes.position.array;
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
    const dist = explosion * 3;
    
    partsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = parts[i];
      mesh.position.set(p.pos[0] + p.dir[0] * dist, p.pos[1] + p.dir[1] * dist, p.pos[2] + p.dir[2] * dist);
    });
    
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.25;
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
};

// ============================================================
// ROTATION MAPPING
// ============================================================

// Example 1: Wireframe Globe
const WireframeGlobe = () => {
  const groupRef = useRef();
  const innerRef = useRef();
  const scroll = useScroll();

  useFrame((state) => {
    if (!groupRef.current) return;
    const rot = scroll.offset * Math.PI * 4;
    groupRef.current.rotation.y = rot;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
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
};

// Example 2: Rotating DNA Helix
const DNAHelix = () => {
  const groupRef = useRef();
  const scroll = useScroll();

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
    groupRef.current.rotation.y = scroll.offset * Math.PI * 6;
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
};

// ============================================================
// PARALLAX LAYERS
// ============================================================

// Example 1: Floating Cards
const FloatingCards = () => {
  const groupRef = useRef();
  const cardsRef = useRef([]);
  const scroll = useScroll();

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
      card.position.y = c.pos[1] + scroll.offset * c.speed * 10;
      card.rotation.y = Math.sin(state.clock.elapsedTime + i) * 0.1;
    });
  });

  return (
    <group ref={groupRef}>
      {cards.map((c, i) => (
        <mesh key={i} ref={el => cardsRef.current[i] = el} position={c.pos}>
          <boxGeometry args={c.size} />
          <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.3} metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

// Example 2: Mountain Layers
const MountainLayers = () => {
  const layersRef = useRef([]);
  const scroll = useScroll();

  const layers = useMemo(() => [
    { z: -15, color: '#1e1b4b', height: 4, speed: 0.1 },
    { z: -12, color: '#312e81', height: 3.5, speed: 0.2 },
    { z: -9, color: '#4338ca', height: 3, speed: 0.35 },
    { z: -6, color: '#6366f1', height: 2.5, speed: 0.5 },
    { z: -3, color: '#818cf8', height: 2, speed: 0.7 },
  ], []);

  useFrame(() => {
    layersRef.current.forEach((layer, i) => {
      if (!layer) return;
      layer.position.y = -2 + scroll.offset * layers[i].speed * 8;
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
};

// ============================================================
// SCENE WRAPPER WITH SCROLL
// ============================================================
const AnimationScene = ({ children, pages = 3 }) => {
  return (
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
};

// ============================================================
// ANIMATION COMPONENTS MAP
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
  ]
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [activeCategory, setActiveCategory] = useState('tunnel');
  const [activeExample, setActiveExample] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setActiveExample(0);
  }, [activeCategory]);

  const currentAnimations = ANIMATIONS[activeCategory];
  const CurrentComponent = currentAnimations[activeExample].component;
  const currentInfo = currentAnimations[activeExample];

  return (
    <div className="app-root" data-testid="app-container">
      {isLoading && (
        <div className="loader-overlay">
          <div className="loader-spinner"></div>
          <p className="loader-text">Loading...</p>
        </div>
      )}
      
      {/* Sidebar Navigation */}
      <nav className="sidebar" data-testid="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Immersive<span>Horizons</span></h1>
          <p className="sidebar-subtitle">3D Scroll Effects</p>
        </div>
        
        <div className="sidebar-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
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
        {/* Example Tabs */}
        <div className="example-tabs" data-testid="example-tabs">
          {currentAnimations.map((anim, i) => (
            <button
              key={i}
              className={`example-tab ${activeExample === i ? 'active' : ''}`}
              onClick={() => setActiveExample(i)}
              data-testid={`example-tab-${i}`}
            >
              Example {i + 1}: {anim.name}
            </button>
          ))}
        </div>
        
        {/* Canvas */}
        <div className="canvas-container">
          <Canvas
            key={`${activeCategory}-${activeExample}`}
            camera={{ position: [0, 0, 10], fov: 55 }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
          >
            <color attach="background" args={['#050505']} />
            <Suspense fallback={null}>
              <AnimationScene pages={3}>
                <CurrentComponent />
              </AnimationScene>
            </Suspense>
          </Canvas>
        </div>
        
        {/* Info Panel */}
        <div className="info-panel" data-testid="info-panel">
          <h2 className="info-title">{currentInfo.name}</h2>
          <p className="info-desc">{currentInfo.description}</p>
          <div className="scroll-hint">
            <span>↕</span> Scroll to interact
          </div>
        </div>
      </main>
    </div>
  );
}
