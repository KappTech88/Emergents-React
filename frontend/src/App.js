import React, { Suspense, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Stars, Trail, MeshDistortMaterial, Float, Sparkles } from '@react-three/drei';
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
    return new Array(40).fill(0).map((_, i) => ({
      z: -i * 3,
      scale: 1 + Math.sin(i * 0.3) * 0.3,
      rotationSpeed: (i % 2 === 0 ? 1 : -1) * 0.001,
      color: `hsl(${180 + i * 4}, 80%, ${50 + i}%)`,
      opacity: Math.max(0.1, 1 - i * 0.025)
    }));
  }, []);

  // Floating particles in tunnel
  const particles = useMemo(() => {
    return new Array(100).fill(0).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        -Math.random() * 100
      ],
      scale: Math.random() * 0.1 + 0.02,
      speed: Math.random() * 0.5 + 0.5
    }));
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Get scroll progress for first section (0-20%)
    const progress = scroll.range(0, 0.2);
    
    // Camera flies through tunnel
    groupRef.current.position.z = progress * 80;
    
    // Rotate entire tunnel slowly
    groupRef.current.rotation.z = state.clock.elapsedTime * 0.05;
    
    // Update each ring
    groupRef.current.children.forEach((child, i) => {
      if (child.type === 'Mesh') {
        child.rotation.z += rings[i % rings.length]?.rotationSpeed || 0.001;
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, -10]}>
      {/* Tunnel Rings */}
      {rings.map((ring, i) => (
        <mesh key={`ring-${i}`} position={[0, 0, ring.z]}>
          <torusGeometry args={[3.5 + Math.sin(i * 0.5) * 0.5, 0.03, 8, 64]} />
          <meshStandardMaterial
            color={ring.color}
            emissive={ring.color}
            emissiveIntensity={0.5}
            transparent
            opacity={ring.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      {/* Floating particles */}
      {particles.map((p, i) => (
        <mesh key={`particle-${i}`} position={p.position} scale={p.scale}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#22d3ee" />
        </mesh>
      ))}
      
      {/* Center light beam */}
      <mesh position={[0, 0, -60]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight position={[0, 0, -60]} intensity={5} color="#22d3ee" distance={100} />
    </group>
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
    
    // Position in second section
    const sectionOffset = -viewport.height * 1.5;
    meshRef.current.position.y = sectionOffset;
    
    // Rotation based on scroll
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    
    // Scale distortion based on velocity
    const distortAmount = Math.min(velocityRef.current * 0.5, 1);
    meshRef.current.material.distort = 0.3 + distortAmount * 0.7;
    meshRef.current.material.speed = 2 + velocityRef.current * 3;
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh ref={meshRef} scale={2}>
        <icosahedronGeometry args={[1, 8]} />
        <MeshDistortMaterial
          color="#a855f7"
          emissive="#7c3aed"
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.8}
          distort={0.3}
          speed={2}
        />
      </mesh>
    </Float>
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
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uResolution: { value: new THREE.Vector2(1, 1) }
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
      float wave1 = sin(pos.x * 3.0 + uTime * 2.0) * 0.3;
      float wave2 = sin(pos.y * 4.0 + uTime * 1.5) * 0.2;
      float wave3 = sin((pos.x + pos.y) * 2.0 + uTime) * 0.15;
      
      // Velocity amplifies waves
      float velocityFactor = 1.0 + uVelocity * 3.0;
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
      float shimmer = sin(vUv.x * 50.0 + uTime * 3.0) * 0.1;
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
    
    // Position in third section
    if (meshRef.current) {
      meshRef.current.position.y = -viewport.height * 2.5;
      meshRef.current.rotation.x = -0.3;
    }
  });

  return (
    <mesh ref={meshRef} scale={[6, 4, 1]}>
      <planeGeometry args={[1, 1, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        args={[LiquidWaveMaterial]}
        side={THREE.DoubleSide}
      />
    </mesh>
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
    const explosionProgress = scroll.range(0.6, 0.2);
    const explosionDistance = explosionProgress * 3;
    
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
    groupRef.current.rotation.x = state.clock.elapsedTime * 0.2;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    
    // Position
    groupRef.current.position.y = -viewport.height * 3.5;
  });

  return (
    <group ref={groupRef}>
      {parts.map((part, i) => (
        <mesh
          key={i}
          ref={el => partsRef.current[i] = el}
          position={part.pos}
          rotation={part.rot}
        >
          <boxGeometry args={[1.8, 0.15, 1.8]} />
          <meshStandardMaterial
            color={part.color}
            emissive={part.color}
            emissiveIntensity={0.2}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      ))}
      
      {/* Inner glowing core */}
      <mesh scale={0.6}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color="#ffffff" wireframe />
      </mesh>
      <pointLight intensity={2} color="#22d3ee" distance={5} />
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
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    
    // Position
    groupRef.current.position.y = -viewport.height * 4.5;
    
    // Inner sphere counter-rotates
    if (innerRef.current) {
      innerRef.current.rotation.y = -rotationAmount * 0.5;
      innerRef.current.rotation.x = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer wireframe sphere */}
      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#a855f7"
          emissiveIntensity={0.3}
          wireframe
        />
      </mesh>
      
      {/* Middle sphere */}
      <mesh scale={0.9}>
        <sphereGeometry args={[2.5, 24, 24]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#c084fc"
          emissiveIntensity={0.2}
          wireframe
          transparent
          opacity={0.5}
        />
      </mesh>
      
      {/* Inner solid sphere */}
      <mesh ref={innerRef} scale={0.5}>
        <icosahedronGeometry args={[2, 3]} />
        <meshStandardMaterial
          color="#c084fc"
          emissive="#e879f9"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Core light */}
      <pointLight intensity={3} color="#c084fc" distance={10} />
      
      {/* Orbital rings */}
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[3.2, 0.02, 16, 100]} />
        <meshBasicMaterial color="#a855f7" />
      </mesh>
      <mesh rotation={[Math.PI/3, Math.PI/4, 0]}>
        <torusGeometry args={[3.4, 0.02, 16, 100]} />
        <meshBasicMaterial color="#8b5cf6" />
      </mesh>
    </group>
  );
};

// ============================================================
// BACKGROUND EFFECTS
// ============================================================
const BackgroundEffects = () => {
  return (
    <>
      <Stars radius={100} depth={50} count={2000} factor={4} fade speed={1} />
      <fog attach="fog" args={['#050505', 10, 100]} />
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
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, 0, -20]} intensity={2} color="#22d3ee" />
      <pointLight position={[10, -10, -10]} intensity={2} color="#ec4899" />
      <pointLight position={[0, 10, -30]} intensity={1.5} color="#a855f7" />
      
      <BackgroundEffects />
      
      <ScrollControls pages={5} damping={0.15}>
        <Scroll>
          {/* Section 1: Tunnel */}
          <ImmersiveTunnel />
          
          {/* Section 2: Velocity Morph */}
          <VelocityMorphSphere />
          
          {/* Section 3: Liquid Shader */}
          <LiquidPlane />
          
          {/* Section 4: Exploded View */}
          <ExplodedCube />
          
          {/* Section 5: Globe */}
          <NavigationGlobe />
        </Scroll>
        
        {/* HTML Overlay */}
        <Scroll html style={{ width: '100%' }}>
          {/* Section 1 */}
          <section className="section" data-testid="section-tunnel">
            <div className="content-card left">
              <div className="section-number">01</div>
              <h1 className="title">Taxonomy I</h1>
              <h2 className="subtitle cyan">Pseudo-3D Tunnel</h2>
              <p className="description">
                <strong>"The Z-Axis Zoom"</strong><br/>
                Flying through a tunnel of light rings. Scroll drives your journey 
                forward into the vanishing point, creating true depth perception.
              </p>
            </div>
          </section>
          
          {/* Section 2 */}
          <section className="section" data-testid="section-velocity">
            <div className="content-card right">
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
          </section>
          
          {/* Section 3 */}
          <section className="section" data-testid="section-liquid">
            <div className="content-card left">
              <div className="section-number">03</div>
              <h1 className="title">Taxonomy III</h1>
              <h2 className="subtitle pink">WebGL Liquid Distortion</h2>
              <p className="description">
                <strong>"The Texture Projection"</strong><br/>
                Custom vertex shaders manipulate geometry based on scroll velocity 
                (ΔP/Δt), creating fluid, organic wave patterns.
              </p>
            </div>
          </section>
          
          {/* Section 4 */}
          <section className="section" data-testid="section-exploded">
            <div className="content-card right">
              <div className="section-number">04</div>
              <h1 className="title">Taxonomy IV</h1>
              <h2 className="subtitle cyan">Exploded View</h2>
              <p className="description">
                <strong>"Model Deconstruction"</strong><br/>
                Using scroll.range() to drive component separation, revealing 
                the internal structure and engineering of a 3D object.
              </p>
            </div>
          </section>
          
          {/* Section 5 */}
          <section className="section center" data-testid="section-globe">
            <div className="content-card-center">
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
          </section>
        </Scroll>
      </ScrollControls>
    </>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  return (
    <div className="app-container" data-testid="app-container">
      <Canvas
        shadows
        camera={{ position: [0, 0, 10], fov: 50, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
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
