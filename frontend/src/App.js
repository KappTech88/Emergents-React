import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Float, Text, Image, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// --- SHARED UTILS ---
// Simple random range
const random = (min, max) => Math.random() * (max - min) + min;

// --- TAXONOMY I: PSEUDO-3D "TUNNEL" EFFECT ---
// Objects emerging from vanishing point
const TunnelLayer = () => {
  const group = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();
  
  // Create 20 tunnel segments
  const segments = useMemo(() => new Array(20).fill(0).map((_, i) => ({
    z: -i * 5,
    rotation: [0, 0, (i % 2) * Math.PI / 4],
    scale: 1 + i * 0.1
  })), []);

  useFrame(() => {
    // Move whole tunnel towards camera based on scroll
    // Range 0 to 0.2 (First 20% of scroll)
    const offset = scroll.range(0, 1/5);
    // Move tunnel forward
    group.current.position.z = offset * 50; 
  });

  return (
    <group ref={group}>
      {segments.map((s, i) => (
        <mesh key={i} position={[0, 0, s.z - 20]} rotation={s.rotation}>
          <torusGeometry args={[2 + i * 0.2, 0.1, 16, 50]} />
          <meshStandardMaterial 
            color={`hsl(${200 + i * 5}, 80%, 50%)`} 
            transparent 
            opacity={0.3 + (i/20) * 0.7}
            wireframe
          />
        </mesh>
      ))}
    </group>
  );
};

// --- TAXONOMY II: VELOCITY-BASED SKEW (GELATINOUS FEEL) ---
// Text that skews based on scroll speed (derivative of position)
const SkewText = () => {
  const textRef = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();

  useFrame((state, delta) => {
    // Get scroll velocity (delta)
    // scroll.delta is the change per frame.
    // Damping/Smoothing is handled by ScrollControls, so delta is already smoothed "velocity"
    const velocity = scroll.delta;
    
    const skewStrength = velocity * 40; // Multiplier for effect intensity
    
    if (textRef.current) {
       // Skew logic: shear along X based on Y movement
       // React Three Fiber Text doesn't support raw skew matrix easily, 
       // so we simulate "Gelatinous" feel with Scale and Rotation z
       
       // Stretch Y, Squash X based on speed (Squash & Stretch principle)
       const stretch = 1 + Math.abs(velocity) * 5;
       const squash = 1 / stretch;
       
       textRef.current.scale.set(squash, stretch, 1);
       
       // Slight tilt in direction of scroll
       textRef.current.rotation.z = -velocity * 5;

       // Position: Section 2
       textRef.current.position.y = -viewport.height * 1.5; // Center of 2nd page
    }
  });

  return (
    <group>
        <Text
            ref={textRef}
            fontSize={2}
            color="#a855f7" // Purple-500
            anchorX="center"
            anchorY="middle"
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
        >
            VELOCITY
        </Text>
        <Text
            position={[0, -viewport.height * 1.5 - 1.5, 0]}
            fontSize={0.5}
            color="white"
        >
            (Scroll Fast to Skew)
        </Text>
    </group>
  );
};

// --- TAXONOMY III: WEBGL LIQUID DISTORTION (SHADER) ---
// Custom Shader Material for Liquid/Ripple Effect linked to velocity
const LiquidShaderMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uVelocity: { value: 0 },
    uColor1: { value: new THREE.Color('#06b6d4') }, // Cyan
    uColor2: { value: new THREE.Color('#ec4899') }  // Pink
  },
  vertexShader: `
    varying vec2 vUv;
    varying float vWave;
    uniform float uTime;
    uniform float uVelocity;

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Distortion Formula: Sin(UV.x * Freq + Time) * Amplitude (linked to velocity)
      float noiseFreq = 10.0;
      float noiseAmp = 0.5 * uVelocity; // Amplitude driven by scroll speed
      
      vec3 noisePos = vec3(pos.x * noiseFreq + uTime, pos.y, pos.z);
      pos.z += sin(noisePos.x) * noiseAmp;
      pos.y += cos(noisePos.x) * noiseAmp * 0.5;

      vWave = pos.z;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying float vWave;
    uniform vec3 uColor1;
    uniform vec3 uColor2;

    void main() {
      // Mix colors based on wave height
      vec3 color = mix(uColor1, uColor2, vWave + 0.5);
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

const LiquidPlane = () => {
  const mesh = useRef();
  const material = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();

  useFrame((state, delta) => {
    const velocity = scroll.delta; // 0 to ~0.02
    
    if (material.current) {
      material.current.uniforms.uTime.value = state.clock.getElapsedTime();
      
      // Smoothly interpolate velocity for the shader to prevent jitter
      // Current value lerps to Target value (velocity * 50)
      const currentV = material.current.uniforms.uVelocity.value;
      const targetV = velocity * 50; 
      material.current.uniforms.uVelocity.value = THREE.MathUtils.lerp(currentV, targetV, 0.1);
    }
  });

  return (
    <mesh ref={mesh} position={[0, -viewport.height * 2.5, 0]}>
      <planeGeometry args={[4, 4, 32, 32]} />
      <shaderMaterial 
        ref={material}
        args={[LiquidShaderMaterial]} 
        wireframe={false}
      />
    </mesh>
  );
};

// --- TAXONOMY V: EXPLODED VIEW (TRUE 3D) ---
// A cube that separates into parts based on scroll range
const ExplodedCube = () => {
  const group = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();

  // Parts refs
  const top = useRef();
  const bottom = useRef();
  const left = useRef();
  const right = useRef();
  const front = useRef();
  const back = useRef();

  useFrame(() => {
    // Only active during section 4 (range 3/5 to 4/5 roughly)
    // We want the explosion to peak at the center of this section
    // Section 4 starts at 300vh. 
    // scroll.range(start, distance)
    
    const explosionFactor = scroll.range(3/5, 1/5); // 0 -> 1 -> 0 if using curve? No range goes 0->1
    
    // Apply expansion
    const dist = 1 + explosionFactor * 2; // Move from 1 to 3 units away

    if (top.current) top.current.position.y = dist;
    if (bottom.current) bottom.current.position.y = -dist;
    if (left.current) left.current.position.x = -dist;
    if (right.current) right.current.position.x = dist;
    if (front.current) front.current.position.z = dist;
    if (back.current) back.current.position.z = -dist;

    // Rotate whole group
    if (group.current) {
        group.current.rotation.x = scroll.offset * Math.PI * 2;
        group.current.rotation.y = scroll.offset * Math.PI;
    }
  });

  const Mat = <meshStandardMaterial color="#22d3ee" roughness={0.2} metalness={0.8} />;
  const Geom = <boxGeometry args={[1.8, 0.2, 1.8]} />; // Flat plates

  return (
    <group ref={group} position={[0, -viewport.height * 3.5, 0]}>
      {/* Top Plate */}
      <mesh ref={top} position={[0, 1, 0]}>{Geom}{Mat}</mesh>
      {/* Bottom Plate */}
      <mesh ref={bottom} position={[0, -1, 0]}>{Geom}{Mat}</mesh>
      
      {/* Side Plates (Adjust geometry rotation for sides) */}
      <mesh ref={left} position={[-1, 0, 0]} rotation={[0, 0, Math.PI/2]}>{Geom}{Mat}</mesh>
      <mesh ref={right} position={[1, 0, 0]} rotation={[0, 0, Math.PI/2]}>{Geom}{Mat}</mesh>
      
      <mesh ref={front} position={[0, 0, 1]} rotation={[Math.PI/2, 0, 0]}>{Geom}{Mat}</mesh>
      <mesh ref={back} position={[0, 0, -1]} rotation={[Math.PI/2, 0, 0]}>{Geom}{Mat}</mesh>
      
      {/* Core */}
      <mesh scale={0.5}>
        <boxGeometry />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2} />
      </mesh>
    </group>
  );
};

// --- TAXONOMY V: ROTATING EARTH (SPHERICAL NAVIGATION) ---
const RotatingEarth = () => {
    const mesh = useRef();
    const scroll = useScroll();
    const { viewport } = useThree();

    useFrame(() => {
        // Direct mapping: offset -> rotation
        // "Formula: mesh.rotation.y = scroll.offset * Math.PI * 2"
        if (mesh.current) {
            mesh.current.rotation.y = scroll.offset * Math.PI * 4; // 2 spins total
            mesh.current.rotation.x = 0.5;
        }
    });

    return (
        <group position={[0, -viewport.height * 4.5, 0]}>
            <mesh ref={mesh}>
                <sphereGeometry args={[2, 64, 64]} />
                <meshStandardMaterial 
                    color="#4c1d95" 
                    wireframe={true} 
                    emissive="#8b5cf6"
                    emissiveIntensity={0.5}
                />
            </mesh>
            {/* Inner Core */}
            <mesh position={[0, -viewport.height * 4.5, 0]} scale={1.8}>
                 <sphereGeometry args={[1, 32, 32]} />
                 <meshBasicMaterial color="#000" />
            </mesh>
        </group>
    );
}

// --- MAIN SCENE ---

const Scene = () => {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#22d3ee" />
      <pointLight position={[-10, -10, -10]} intensity={1.5} color="#ec4899" />
      
      <ScrollControls pages={5} damping={0.1}> {/* Damping 0.1 for smooth "Lerp" */}
        <Scroll>
            {/* Page 1: Tunnel */}
            <TunnelLayer />
            
            {/* Page 2: Velocity Skew */}
            <SkewText />

            {/* Page 3: Liquid Distortion */}
            <LiquidPlane />

            {/* Page 4: Exploded View */}
            <ExplodedCube />

            {/* Page 5: Earth */}
            <RotatingEarth />
        </Scroll>

        <Scroll html style={{ width: '100%' }}>
            {/* HTML Overlay Content aligned with 3D sections */}
            
            {/* Section 1 */}
            <section className="h-screen flex flex-col justify-center items-start p-20 pointer-events-none">
                <div className="bg-black/50 p-8 backdrop-blur-sm border-l-4 border-cyan-500 max-w-2xl">
                    <h1 className="text-6xl font-bold mb-2 text-white">Taxonomy I</h1>
                    <h2 className="text-3xl text-cyan-400 mb-6">Pseudo-3D Tunnel</h2>
                    <p className="text-gray-300 text-lg">
                        "The Z-Axis Zoom." <br/>
                        Utilizing perspective to create the illusion of flying into content. 
                        Objects emerge from the vanishing point.
                    </p>
                </div>
            </section>

            {/* Section 2 */}
            <section className="h-screen flex flex-col justify-center items-end p-20 pointer-events-none">
                <div className="bg-black/50 p-8 backdrop-blur-sm border-r-4 border-purple-500 max-w-2xl text-right">
                    <h1 className="text-6xl font-bold mb-2 text-white">Taxonomy II</h1>
                    <h2 className="text-3xl text-purple-400 mb-6">Velocity Deformation</h2>
                    <p className="text-gray-300 text-lg">
                        "The Gelatinous Feel."<br/>
                        Mapping the derivative of position (Velocity) to shear and scale matrices.
                        <br/><span className="text-sm text-gray-500 italic">Scroll fast to see the text stretch!</span>
                    </p>
                </div>
            </section>

            {/* Section 3 */}
            <section className="h-screen flex flex-col justify-center items-start p-20 pointer-events-none">
                <div className="bg-black/50 p-8 backdrop-blur-sm border-l-4 border-pink-500 max-w-2xl">
                    <h1 className="text-6xl font-bold mb-2 text-white">Taxonomy III</h1>
                    <h2 className="text-3xl text-pink-400 mb-6">WebGL Liquid Distortion</h2>
                    <p className="text-gray-300 text-lg">
                        "The Texture Projection Pattern."<br/>
                        Vertex shaders manipulate UV coordinates based on scroll velocity ($ \Delta P / \Delta t $), creating organic ripples.
                    </p>
                </div>
            </section>

            {/* Section 4 */}
            <section className="h-screen flex flex-col justify-center items-end p-20 pointer-events-none">
                <div className="bg-black/50 p-8 backdrop-blur-sm border-r-4 border-cyan-500 max-w-2xl text-right">
                    <h1 className="text-6xl font-bold mb-2 text-white">Taxonomy V</h1>
                    <h2 className="text-3xl text-cyan-400 mb-6">Exploded View</h2>
                    <p className="text-gray-300 text-lg">
                        "Model Deconstruction."<br/>
                        Using <code>scroll.range()</code> to drive the separation of mesh components, revealing internal engineering.
                    </p>
                </div>
            </section>

            {/* Section 5 */}
            <section className="h-screen flex flex-col justify-center items-center p-20 pointer-events-none">
                 <div className="text-center bg-black/50 p-10 backdrop-blur-md rounded-2xl border border-white/10">
                    <h1 className="text-5xl font-bold mb-4 text-white">Spherical Navigation</h1>
                    <p className="text-xl text-gray-300 mb-8 max-w-md mx-auto">
                        Mapping scroll offset (0-1) to rotation radians ($ 2\pi $).
                    </p>
                    <button className="pointer-events-auto px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full text-white font-bold hover:scale-105 transition-transform">
                        Download Report
                    </button>
                </div>
            </section>

        </Scroll>
      </ScrollControls>
    </>
  );
};

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505' }}>
      <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }}>
        <Suspense fallback={null}>
            <Scene />
        </Suspense>
      </Canvas>
      
      {/* Header */}
      <div className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none mix-blend-difference">
        <div className="text-white font-bold text-xl tracking-widest">
            IMMERSIVE<span className="text-cyan-400">HORIZONS</span>
        </div>
        <div className="text-xs text-gray-400 font-mono">
            PARTIAL-3D SCROLL INTERACTION
        </div>
      </div>
    </div>
  );
}
