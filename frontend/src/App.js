import React, { Suspense, useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Stars, MeshDistortMaterial, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================
// TAXONOMY I: IMMERSIVE TUNNEL EFFECT
// A true 3D tunnel that you fly through as you scroll
// ============================================================
const ImmersiveTunnel = () => {
  const groupRef = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();
  
  // Create multiple ring layers for depth
  const rings = useMemo(() => {
    return new Array(50).fill(0).map((_, i) => ({
      z: -i * 2.5,
      scale: 1 + Math.sin(i * 0.3) * 0.3,
      rotationSpeed: (i % 2 === 0 ? 1 : -1) * 0.002,
      color: `hsl(${180 + i * 3}, 80%, ${50 + i * 0.5}%)`,
      opacity: Math.max(0.15, 1 - i * 0.02)
    }));
  }, []);

  // Floating particles in tunnel
  const particles = useMemo(() => {
    return new Array(80).fill(0).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        -Math.random() * 120
      ],
      scale: Math.random() * 0.08 + 0.02,
      speed: Math.random() * 0.5 + 0.5
    }));
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Get scroll progress for first section (0-20%)
    const progress = scroll.range(0, 0.2);
    
    // Camera flies through tunnel
    groupRef.current.position.z = progress * 100;
    
    // Rotate entire tunnel slowly
    groupRef.current.rotation.z = state.clock.elapsedTime * 0.03;
  });

  return (
    <group ref={groupRef} position={[0, 0, -5]}>
      {/* Tunnel Rings */}
      {rings.map((ring, i) => (
        <mesh key={`ring-${i}`} position={[0, 0, ring.z]} rotation={[0, 0, state => state?.clock?.elapsedTime * ring.rotationSpeed || 0]}>
          <torusGeometry args={[4 + Math.sin(i * 0.3) * 0.8, 0.025, 8, 80]} />
          <meshStandardMaterial
            color={ring.color}
            emissive={ring.color}
            emissiveIntensity={0.6}
            transparent
            opacity={ring.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      {/* Floating particles */}
      {particles.map((p, i) => (
        <mesh key={`particle-${i}`} position={p.position} scale={p.scale}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.8} />
        </mesh>
      ))}
      
      {/* Center light source at end of tunnel */}
      <mesh position={[0, 0, -100]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight position={[0, 0, -100]} intensity={8} color="#22d3ee" distance={150} />
    </group>
  );
};

// ============================================================
// SECTION 1: HTML OVERLAY (TUNNEL)
// ============================================================
const Section1Content = () => {
  const { viewport } = useThree();
  
  return (
    <Html
      center
      position={[-viewport.width * 0.25, 0, 0]}
      style={{
        width: '450px',
        pointerEvents: 'none'
      }}
      transform
      distanceFactor={10}
    >
      <div className="content-card left" data-testid="section-tunnel">
        <div className="section-number">01</div>
        <h1 className="title">Taxonomy I</h1>
        <h2 className="subtitle cyan">Pseudo-3D Tunnel</h2>
        <p className="description">
          <strong>"The Z-Axis Zoom"</strong><br/>
          Flying through a tunnel of light rings. Scroll drives your journey 
          forward into the vanishing point, creating true depth perception.
        </p>
      </div>
    </Html>
  );
};

// ============================================================
// TAXONOMY II: VELOCITY-BASED MORPHING SPHERE
// A sphere that deforms based on scroll velocity
// ============================================================
const VelocityMorphSphere = () => {
  const meshRef = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();
  const velocityRef = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Smooth velocity tracking
    const targetVelocity = Math.abs(scroll.delta) * 100;
    velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, targetVelocity, 0.1);
    
    // Rotation based on scroll
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    
    // Scale distortion based on velocity
    const distortAmount = Math.min(velocityRef.current * 0.5, 1);
    meshRef.current.material.distort = 0.3 + distortAmount * 0.7;
    meshRef.current.material.speed = 2 + velocityRef.current * 3;
  });

  return (
    <group position={[0, -viewport.height * 1.5, 0]}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <mesh ref={meshRef} scale={2.5}>
          <icosahedronGeometry args={[1, 8]} />
          <MeshDistortMaterial
            color="#a855f7"
            emissive="#7c3aed"
            emissiveIntensity={0.4}
            roughness={0.2}
            metalness={0.8}
            distort={0.3}
            speed={2}
          />
        </mesh>
      </Float>
      
      {/* Section 2 HTML */}
      <Html
        center
        position={[viewport.width * 0.25, 0, 0]}
        style={{
          width: '450px',
          pointerEvents: 'none'
        }}
        transform
        distanceFactor={10}
      >
        <div className="content-card right" data-testid="section-velocity">
          <div className="section-number">02</div>
          <h1 className="title">Taxonomy II</h1>
          <h2 className="subtitle purple">Velocity Deformation</h2>
          <p className="description">
            <strong>"The Gelatinous Feel"</strong><br/>
            The sphere morphs based on your scroll speed. Fast scrolling 
            creates dramatic distortion—a tactile, organic response.
          </p>
          <div className="hint">↕ Scroll fast to see the effect!</div>
        </div>
      </Html>
      
      <pointLight position={[3, 0, 3]} intensity={2} color="#a855f7" />
    </group>
  );
};

// ============================================================
// TAXONOMY III: LIQUID WAVE SHADER
// Custom shader creating liquid distortion effect
// ============================================================
const LiquidWaveMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uVelocity: { value: 0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uVelocity;
    varying vec2 vUv;
    varying float vElevation;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Multiple wave layers for complex motion
      float wave1 = sin(pos.x * 4.0 + uTime * 2.0) * 0.4;
      float wave2 = sin(pos.y * 5.0 + uTime * 1.5) * 0.3;
      float wave3 = sin((pos.x + pos.y) * 2.5 + uTime) * 0.2;
      
      // Velocity amplifies waves
      float velocityFactor = 1.0 + uVelocity * 4.0;
      pos.z += (wave1 + wave2 + wave3) * velocityFactor;
      
      vElevation = pos.z;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uVelocity;
    varying vec2 vUv;
    varying float vElevation;
    
    void main() {
      // Gradient based on UV and elevation
      vec3 colorA = vec3(0.024, 0.714, 0.831); // Cyan
      vec3 colorB = vec3(0.925, 0.282, 0.600); // Pink
      vec3 colorC = vec3(0.659, 0.224, 0.969); // Purple
      
      float mixFactor = vElevation + 0.5;
      vec3 color = mix(colorA, colorB, vUv.x);
      color = mix(color, colorC, vUv.y * 0.5 + sin(uTime) * 0.2);
      
      // Add shimmer
      float shimmer = sin(vUv.x * 40.0 + uTime * 4.0) * 0.08;
      color += shimmer;
      
      // Velocity adds brightness
      color *= 1.0 + uVelocity * 0.5;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

const LiquidPlane = () => {
  const meshRef = useRef();
  const materialRef = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();
  const velocityRef = useRef(0);

  useFrame((state) => {
    if (!materialRef.current) return;
    
    // Smooth velocity
    velocityRef.current = THREE.MathUtils.lerp(
      velocityRef.current,
      Math.abs(scroll.delta) * 50,
      0.1
    );
    
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uVelocity.value = velocityRef.current;
  });

  return (
    <group position={[0, -viewport.height * 2.5, 0]}>
      <mesh ref={meshRef} rotation={[-0.2, 0, 0]} scale={[7, 5, 1]}>
        <planeGeometry args={[1, 1, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          args={[LiquidWaveMaterial]}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Section 3 HTML */}
      <Html
        center
        position={[-viewport.width * 0.25, 1, 2]}
        style={{
          width: '450px',
          pointerEvents: 'none'
        }}
        transform
        distanceFactor={10}
      >
        <div className="content-card left" data-testid="section-liquid">
          <div className="section-number">03</div>
          <h1 className="title">Taxonomy III</h1>
          <h2 className="subtitle pink">WebGL Liquid Distortion</h2>
          <p className="description">
            <strong>"The Texture Projection"</strong><br/>
            Custom vertex shaders manipulate geometry based on scroll velocity 
            (ΔP/Δt), creating fluid, organic wave patterns.
          </p>
        </div>
      </Html>
    </group>
  );
};

// ============================================================
// TAXONOMY IV: EXPLODED CUBE VIEW
// Cube parts separate as you scroll through the section
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
    
    // Explosion factor based on scroll in section 4 (60-80%)
    const explosionProgress = scroll.range(0.55, 0.25);
    const explosionDistance = explosionProgress * 3.5;
    
    // Update each part
    partsRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const part = parts[i];
      mesh.position.set(
        part.pos[0] + part.dir[0] * explosionDistance,
        part.pos[1] + part.dir[1] * explosionDistance,
        part.pos[2] + part.dir[2] * explosionDistance
      );
    });
    
    // Rotate entire group
    groupRef.current.rotation.x = state.clock.elapsedTime * 0.15;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.25;
  });

  return (
    <group position={[0, -viewport.height * 3.5, 0]}>
      <group ref={groupRef}>
        {parts.map((part, i) => (
          <mesh
            key={i}
            ref={el => partsRef.current[i] = el}
            position={part.pos}
            rotation={part.rot}
          >
            <boxGeometry args={[2, 0.18, 2]} />
            <meshStandardMaterial
              color={part.color}
              emissive={part.color}
              emissiveIntensity={0.3}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        ))}
        
        {/* Inner glowing core */}
        <mesh scale={0.7}>
          <icosahedronGeometry args={[1, 2]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
        <pointLight intensity={3} color="#22d3ee" distance={8} />
      </group>
      
      {/* Section 4 HTML */}
      <Html
        center
        position={[viewport.width * 0.25, 0.5, 0]}
        style={{
          width: '450px',
          pointerEvents: 'none'
        }}
        transform
        distanceFactor={10}
      >
        <div className="content-card right" data-testid="section-exploded">
          <div className="section-number">04</div>
          <h1 className="title">Taxonomy IV</h1>
          <h2 className="subtitle cyan">Exploded View</h2>
          <p className="description">
            <strong>"Model Deconstruction"</strong><br/>
            Using scroll.range() to drive component separation, revealing 
            the internal structure and engineering of a 3D object.
          </p>
        </div>
      </Html>
    </group>
  );
};

// ============================================================
// TAXONOMY V: SPHERICAL NAVIGATION / ROTATING GLOBE
// A wireframe globe that rotates with scroll
// ============================================================
const NavigationGlobe = () => {
  const groupRef = useRef();
  const innerRef = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Rotation directly mapped to scroll
    const rotationAmount = scroll.offset * Math.PI * 4;
    groupRef.current.rotation.y = rotationAmount;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
    
    // Inner sphere counter-rotates
    if (innerRef.current) {
      innerRef.current.rotation.y = -rotationAmount * 0.5;
      innerRef.current.rotation.x = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <group position={[0, -viewport.height * 4.5, 0]}>
      <group ref={groupRef}>
        {/* Outer wireframe sphere */}
        <mesh>
          <sphereGeometry args={[3, 40, 40]} />
          <meshStandardMaterial
            color="#7c3aed"
            emissive="#a855f7"
            emissiveIntensity={0.4}
            wireframe
          />
        </mesh>
        
        {/* Middle sphere */}
        <mesh scale={0.85}>
          <sphereGeometry args={[3, 28, 28]} />
          <meshStandardMaterial
            color="#8b5cf6"
            emissive="#c084fc"
            emissiveIntensity={0.25}
            wireframe
            transparent
            opacity={0.6}
          />
        </mesh>
        
        {/* Inner solid sphere */}
        <mesh ref={innerRef} scale={0.45}>
          <icosahedronGeometry args={[3, 3]} />
          <meshStandardMaterial
            color="#c084fc"
            emissive="#e879f9"
            emissiveIntensity={0.6}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        
        {/* Core light */}
        <pointLight intensity={4} color="#c084fc" distance={15} />
        
        {/* Orbital rings */}
        <mesh rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[3.8, 0.025, 16, 120]} />
          <meshBasicMaterial color="#a855f7" transparent opacity={0.8} />
        </mesh>
        <mesh rotation={[Math.PI/3, Math.PI/4, 0]}>
          <torusGeometry args={[4.1, 0.025, 16, 120]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.6} />
        </mesh>
      </group>
      
      {/* Section 5 HTML */}
      <Html
        center
        position={[0, 0, 5]}
        style={{
          width: '550px',
          pointerEvents: 'auto'
        }}
        transform
        distanceFactor={10}
      >
        <div className="content-card-center" data-testid="section-globe">
          <div className="section-number">05</div>
          <h1 className="title-large">Spherical Navigation</h1>
          <p className="description-center">
            Mapping scroll offset (0→1) directly to rotation radians (0→2π).<br/>
            A complete rotation journey controlled by your scroll.
          </p>
          <button className="cta-button" data-testid="download-report-btn">
            Download Report
          </button>
        </div>
      </Html>
    </group>
  );
};

// ============================================================
// BACKGROUND EFFECTS
// ============================================================
const BackgroundEffects = () => {
  return (
    <>
      <Stars radius={150} depth={80} count={3000} factor={5} fade speed={0.8} />
      <fog attach="fog" args={['#050505', 15, 120]} />
    </>
  );
};

// ============================================================
// MAIN SCENE COMPOSITION
// ============================================================
const Scene = () => {
  const { viewport } = useThree();
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-15, 0, -25]} intensity={3} color="#22d3ee" />
      <pointLight position={[15, -15, -15]} intensity={3} color="#ec4899" />
      <pointLight position={[0, 15, -40]} intensity={2} color="#a855f7" />
      
      <BackgroundEffects />
      
      <ScrollControls pages={5} damping={0.12}>
        <Scroll>
          {/* Section 1: Tunnel */}
          <ImmersiveTunnel />
          <Section1Content />
          
          {/* Section 2: Velocity Morph */}
          <VelocityMorphSphere />
          
          {/* Section 3: Liquid Shader */}
          <LiquidPlane />
          
          {/* Section 4: Exploded View */}
          <ExplodedCube />
          
          {/* Section 5: Globe */}
          <NavigationGlobe />
        </Scroll>
      </ScrollControls>
    </>
  );
};

// ============================================================
// LOADING SCREEN
// ============================================================
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-content">
      <div className="loading-ring"></div>
      <div className="loading-text">Loading Experience...</div>
    </div>
  </div>
);

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    // Simulate loading time for assets
    const timer = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-container" data-testid="app-container">
      {!loaded && <LoadingScreen />}
      
      <Canvas
        shadows
        camera={{ position: [0, 0, 12], fov: 50, near: 0.1, far: 250 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#050505']} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      
      {/* Fixed Header */}
      <header className="header" data-testid="header">
        <div className="logo">
          IMMERSIVE<span className="logo-accent">HORIZONS</span>
        </div>
        <div className="tagline">
          PARTIAL-3D SCROLL INTERACTION
        </div>
      </header>
      
      {/* Scroll Indicator */}
      <div className="scroll-indicator" data-testid="scroll-indicator">
        <div className="scroll-text">SCROLL</div>
        <div className="scroll-line"></div>
      </div>
    </div>
  );
}
