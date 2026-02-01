import React, { Suspense, useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Stars, MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

// Note: This app demonstrates 5 scroll-driven 3D effects from the "Immersive Horizons" research document

// ============================================================
// TAXONOMY I: IMMERSIVE TUNNEL EFFECT
// Flying through concentric rings as you scroll
// ============================================================
const ImmersiveTunnel = () => {
  const groupRef = useRef();
  const ringsRef = useRef([]);
  const scroll = useScroll();
  // Create ring data
  const ringCount = 60;
  const rings = useMemo(() => {
    return new Array(ringCount).fill(0).map((_, i) => ({
      z: -i * 2,
      baseScale: 3 + Math.sin(i * 0.2) * 0.5,
      rotationSpeed: (i % 2 === 0 ? 1 : -1) * (0.3 + i * 0.02),
      hue: 180 + i * 2.5,
      opacity: Math.max(0.2, 1 - i * 0.015)
    }));
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // First 20% of scroll moves through tunnel
    const progress = scroll.range(0, 0.2);
    groupRef.current.position.z = progress * 100;
    
    // Rotate individual rings
    ringsRef.current.forEach((ring, i) => {
      if (ring) {
        ring.rotation.z = state.clock.elapsedTime * rings[i].rotationSpeed * 0.1;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh 
          key={`ring-${i}`} 
          ref={el => ringsRef.current[i] = el}
          position={[0, 0, ring.z]}
        >
          <torusGeometry args={[ring.baseScale, 0.03, 8, 100]} />
          <meshBasicMaterial
            color={`hsl(${ring.hue}, 85%, 55%)`}
            transparent
            opacity={ring.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      {/* Light at end of tunnel */}
      <mesh position={[0, 0, -120]}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
      <pointLight position={[0, 0, -120]} intensity={10} color="#22d3ee" distance={150} />
    </group>
  );
};

// ============================================================
// TAXONOMY II: VELOCITY MORPHING SPHERE
// ============================================================
const VelocitySphere = () => {
  const meshRef = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();
  const smoothVelocity = useRef(0);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Track velocity smoothly
    const targetVel = Math.abs(scroll.delta) * 80;
    smoothVelocity.current = THREE.MathUtils.lerp(smoothVelocity.current, targetVel, 0.08);
    
    // Animate rotation
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.4;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.6;
    
    // Update distortion based on velocity
    if (meshRef.current.material) {
      meshRef.current.material.distort = 0.2 + Math.min(smoothVelocity.current * 0.4, 0.8);
      meshRef.current.material.speed = 1.5 + smoothVelocity.current * 2;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={meshRef} position={[0, -viewport.height * 1.5, 0]} scale={2.8}>
        <icosahedronGeometry args={[1, 8]} />
        <MeshDistortMaterial
          color="#a855f7"
          emissive="#7c3aed"
          emissiveIntensity={0.5}
          roughness={0.15}
          metalness={0.85}
          distort={0.3}
          speed={2}
        />
      </mesh>
    </Float>
  );
};

// ============================================================
// TAXONOMY III: LIQUID WAVE SHADER
// ============================================================
const LiquidShader = {
  uniforms: {
    uTime: { value: 0 },
    uVelocity: { value: 0 }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uVelocity;
    varying vec2 vUv;
    varying float vWave;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      float wave1 = sin(pos.x * 3.5 + uTime * 2.5) * 0.35;
      float wave2 = sin(pos.y * 4.5 + uTime * 2.0) * 0.25;
      float wave3 = sin((pos.x + pos.y) * 2.0 + uTime * 1.5) * 0.2;
      
      float amplitude = 1.0 + uVelocity * 3.5;
      pos.z += (wave1 + wave2 + wave3) * amplitude;
      vWave = pos.z;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying float vWave;
    
    void main() {
      vec3 cyan = vec3(0.133, 0.827, 0.933);
      vec3 pink = vec3(0.925, 0.282, 0.6);
      vec3 purple = vec3(0.659, 0.341, 0.969);
      
      vec3 color = mix(cyan, pink, vUv.x);
      color = mix(color, purple, vUv.y * 0.6 + sin(uTime * 0.5) * 0.15);
      color += sin(vUv.x * 30.0 + uTime * 3.0) * 0.06;
      color *= 0.9 + vWave * 0.15;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

const LiquidPlane = () => {
  const meshRef = useRef();
  const matRef = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();
  const smoothVel = useRef(0);

  useFrame((state) => {
    if (!matRef.current) return;
    smoothVel.current = THREE.MathUtils.lerp(smoothVel.current, Math.abs(scroll.delta) * 40, 0.1);
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    matRef.current.uniforms.uVelocity.value = smoothVel.current;
  });

  return (
    <mesh ref={meshRef} position={[0, -viewport.height * 2.5, 0]} rotation={[-0.25, 0, 0]}>
      <planeGeometry args={[8, 6, 80, 80]} />
      <shaderMaterial ref={matRef} args={[LiquidShader]} side={THREE.DoubleSide} />
    </mesh>
  );
};

// ============================================================
// TAXONOMY IV: EXPLODED CUBE
// ============================================================
const ExplodedCube = () => {
  const groupRef = useRef();
  const partsRef = useRef([]);
  const scroll = useScroll();
  const { viewport } = useThree();

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
    
    // Explosion from 55% to 80%
    const explosion = scroll.range(0.55, 0.25);
    const dist = explosion * 4;
    
    partsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const p = parts[i];
      mesh.position.set(
        p.pos[0] + p.dir[0] * dist,
        p.pos[1] + p.dir[1] * dist,
        p.pos[2] + p.dir[2] * dist
      );
    });
    
    groupRef.current.rotation.x = state.clock.elapsedTime * 0.2;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
  });

  return (
    <group position={[0, -viewport.height * 3.5, 0]}>
      <group ref={groupRef}>
        {parts.map((p, i) => (
          <mesh key={i} ref={el => partsRef.current[i] = el} position={p.pos} rotation={p.rot}>
            <boxGeometry args={[2.2, 0.2, 2.2]} />
            <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.35} metalness={0.9} roughness={0.1} />
          </mesh>
        ))}
        <mesh scale={0.8}>
          <icosahedronGeometry args={[1, 2]} />
          <meshBasicMaterial color="#fff" wireframe />
        </mesh>
        <pointLight intensity={4} color="#22d3ee" distance={10} />
      </group>
    </group>
  );
};

// ============================================================
// TAXONOMY V: ROTATING GLOBE
// ============================================================
const Globe = () => {
  const groupRef = useRef();
  const innerRef = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();

  useFrame((state) => {
    if (!groupRef.current) return;
    
    const rot = scroll.offset * Math.PI * 4;
    groupRef.current.rotation.y = rot;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    
    if (innerRef.current) {
      innerRef.current.rotation.y = -rot * 0.5;
    }
  });

  return (
    <group position={[0, -viewport.height * 4.5, 0]}>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[3.5, 48, 48]} />
          <meshStandardMaterial color="#7c3aed" emissive="#a855f7" emissiveIntensity={0.45} wireframe />
        </mesh>
        <mesh scale={0.8}>
          <sphereGeometry args={[3.5, 32, 32]} />
          <meshStandardMaterial color="#8b5cf6" emissive="#c084fc" emissiveIntensity={0.3} wireframe transparent opacity={0.5} />
        </mesh>
        <mesh ref={innerRef} scale={0.4}>
          <icosahedronGeometry args={[3, 3]} />
          <meshStandardMaterial color="#c084fc" emissive="#e879f9" emissiveIntensity={0.7} metalness={0.8} roughness={0.2} />
        </mesh>
        <pointLight intensity={5} color="#c084fc" distance={18} />
        
        {/* Rings */}
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[4.5, 0.03, 16, 140]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.7} />
        </mesh>
        <mesh rotation={[Math.PI/3, Math.PI/5, 0]}>
          <torusGeometry args={[4.8, 0.03, 16, 140]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  );
};

// ============================================================
// MAIN SCENE
// ============================================================
const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[-15, 10, -20]} intensity={4} color="#22d3ee" />
      <pointLight position={[15, -10, -15]} intensity={4} color="#ec4899" />
      <pointLight position={[0, 15, -35]} intensity={3} color="#a855f7" />
      
      <Stars radius={180} depth={100} count={4000} factor={5} fade speed={0.6} />
      <fog attach="fog" args={['#050505', 20, 150]} />
      
      <ScrollControls pages={6} damping={0.1}>
        <Scroll>
          <ImmersiveTunnel />
          <VelocitySphere />
          <LiquidPlane />
          <ExplodedCube />
          <Globe />
        </Scroll>
        
        <Scroll html style={{ width: '100%' }}>
          {/* Section 1: Tunnel */}
          <section className="scroll-section">
            <div className="card-wrapper left">
              <div className="glass-card" data-testid="section-tunnel">
                <span className="section-num">01</span>
                <h1 className="section-title">Taxonomy I</h1>
                <h2 className="section-subtitle cyan">Pseudo-3D Tunnel</h2>
                <p className="section-text">
                  <strong>"The Z-Axis Zoom"</strong><br/>
                  Flying through a tunnel of light rings. Scroll drives your journey 
                  forward into the vanishing point, creating true depth perception.
                </p>
              </div>
            </div>
          </section>
          
          {/* Section 2: Velocity */}
          <section className="scroll-section">
            <div className="card-wrapper right">
              <div className="glass-card" data-testid="section-velocity">
                <span className="section-num">02</span>
                <h1 className="section-title">Taxonomy II</h1>
                <h2 className="section-subtitle purple">Velocity Deformation</h2>
                <p className="section-text">
                  <strong>"The Gelatinous Feel"</strong><br/>
                  The sphere morphs based on your scroll speed. Fast scrolling 
                  creates dramatic distortion—a tactile, organic response.
                </p>
                <span className="hint-text">↕ Scroll fast to see the effect!</span>
              </div>
            </div>
          </section>
          
          {/* Section 3: Liquid */}
          <section className="scroll-section">
            <div className="card-wrapper left">
              <div className="glass-card" data-testid="section-liquid">
                <span className="section-num">03</span>
                <h1 className="section-title">Taxonomy III</h1>
                <h2 className="section-subtitle pink">WebGL Liquid Distortion</h2>
                <p className="section-text">
                  <strong>"The Texture Projection"</strong><br/>
                  Custom vertex shaders manipulate geometry based on scroll velocity 
                  (ΔP/Δt), creating fluid, organic wave patterns.
                </p>
              </div>
            </div>
          </section>
          
          {/* Section 4: Exploded */}
          <section className="scroll-section">
            <div className="card-wrapper right">
              <div className="glass-card" data-testid="section-exploded">
                <span className="section-num">04</span>
                <h1 className="section-title">Taxonomy IV</h1>
                <h2 className="section-subtitle cyan">Exploded View</h2>
                <p className="section-text">
                  <strong>"Model Deconstruction"</strong><br/>
                  Using scroll.range() to drive component separation, revealing 
                  the internal structure and engineering of a 3D object.
                </p>
              </div>
            </div>
          </section>
          
          {/* Section 5: Globe */}
          <section className="scroll-section center">
            <div className="center-card" data-testid="section-globe">
              <span className="section-num">05</span>
              <h1 className="center-title">Spherical Navigation</h1>
              <p className="center-text">
                Mapping scroll offset (0→1) directly to rotation radians (0→2π).<br/>
                A complete rotation journey controlled by your scroll.
              </p>
              <button 
                className="download-btn" 
                data-testid="download-report-btn"
                onClick={() => {
                  alert('Thank you for exploring Immersive Horizons!\n\nThis demo showcases 5 partial-3D scroll interaction taxonomies.');
                }}
              >
                Download Report
              </button>
            </div>
          </section>
        </Scroll>
      </ScrollControls>
    </>
  );
};

// ============================================================
// LOADING OVERLAY
// ============================================================
const Loader = () => (
  <div className="loader-overlay">
    <div className="loader-spinner"></div>
    <p className="loader-text">Loading Experience...</p>
  </div>
);

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="app-root" data-testid="app-container">
      {!ready && <Loader />}
      
      <Canvas
        camera={{ position: [0, 0, 12], fov: 55, near: 0.1, far: 300 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#050505']} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      
      {/* Header */}
      <header className="site-header" data-testid="header">
        <div className="brand">
          IMMERSIVE<span className="brand-accent">HORIZONS</span>
        </div>
        <div className="subtitle">PARTIAL-3D SCROLL INTERACTION</div>
      </header>
      
      {/* Scroll Hint */}
      <div className="scroll-hint" data-testid="scroll-indicator">
        <span>SCROLL</span>
        <div className="scroll-line-anim"></div>
      </div>
    </div>
  );
}
