import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Float, Stars, Sparkles, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- 3D Components for each effect ---

// 1. Hero / Intro - Rotating & Scaling
const HeroObject = () => {
  const mesh = useRef();
  const scroll = useScroll();
  
  useFrame((state, delta) => {
    // Rotate constantly
    mesh.current.rotation.x += delta * 0.5;
    mesh.current.rotation.y += delta * 0.5;
    
    // Scale down as we scroll away
    const scrollOffset = scroll.range(0, 1/5);
    const scale = 1 - scrollOffset * 0.5;
    mesh.current.scale.set(scale, scale, scale);
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <mesh ref={mesh} position={[2, 0, 0]}>
        <icosahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial 
          color="cyan" 
          emissive="#00ffff"
          emissiveIntensity={2}
          wireframe
        />
      </mesh>
    </Float>
  );
};

// 2. Parallax Floating Objects
const ParallaxShapes = () => {
  const group = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();

  useFrame(() => {
    // Visible during second section
    const visibility = scroll.curve(1/5, 1/5); 
    if (visibility > 0) {
        group.current.position.y = -viewport.height * 1 + (scroll.range(1/5, 1/5) * 5);
    }
  });

  return (
    <group ref={group} position={[0, -viewport.height, 0]}>
      <Float speed={2} rotationIntensity={2} floatIntensity={2}>
        <mesh position={[-1.5, 1, -2]}>
          <torusGeometry args={[0.8, 0.2, 16, 100]} />
          <meshStandardMaterial color="#8b5cf6" roughness={0.1} metalness={0.8} />
        </mesh>
      </Float>
      <Float speed={3} rotationIntensity={3} floatIntensity={1.5}>
        <mesh position={[1.5, -1, -1]}>
          <coneGeometry args={[0.8, 1.5, 32]} />
          <meshStandardMaterial color="#ec4899" roughness={0.1} metalness={0.8} />
        </mesh>
      </Float>
      <Float speed={1.5} rotationIntensity={1} floatIntensity={3}>
        <mesh position={[0, 0, -3]} scale={0.5}>
          <dodecahedronGeometry />
          <meshStandardMaterial color="#0ea5e9" roughness={0.1} metalness={0.8} />
        </mesh>
      </Float>
    </group>
  );
};

// 3. Morphing / Wobbly Material
const WobblySphere = () => {
  const mesh = useRef();
  const scroll = useScroll();
  const { viewport } = useThree();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const scrollRange = scroll.range(2/5, 1/5);
    
    // Distort mesh
    if (mesh.current) {
        mesh.current.position.y = -viewport.height * 2;
        mesh.current.rotation.z = time * 0.2;
        // Simple scale wobble
        const wobble = 1 + Math.sin(time * 3) * 0.1;
        mesh.current.scale.set(wobble, wobble, wobble);
    }
  });

  return (
    <group position={[2, 0, 0]}> 
       {/* Position managed in useFrame relative to viewport if needed, 
           but here we put it in correct 'page' via parent or absolute math */}
       <mesh ref={mesh}>
          <sphereGeometry args={[1.2, 64, 64]} />
          <meshPhysicalMaterial 
            color="#22d3ee"
            roughness={0}
            metalness={0.2}
            transmission={0.9} // Glass-like
            thickness={2}
          />
       </mesh>
    </group>
  );
};

// 4. Particle Field / Explode
const ParticleField = () => {
    const points = useRef();
    const scroll = useScroll();
    const { viewport } = useThree();

    useFrame((state, delta) => {
        const offset = scroll.range(3/5, 1/5);
        if (points.current) {
             points.current.rotation.y += delta * 0.2;
             // Expand particles based on scroll
             points.current.scale.setScalar(1 + offset * 3);
        }
    });

    return (
        <group position={[-2, -viewport.height * 3, 0]}>
            <points ref={points}>
                <sphereGeometry args={[1.5, 48, 48]} />
                <pointsMaterial 
                    size={0.05} 
                    color="#f472b6" 
                    sizeAttenuation 
                    transparent 
                    opacity={0.8}
                />
            </points>
        </group>
    );
};

// 5. Text Effect (3D)
const BigText3D = () => {
    const { viewport } = useThree();
    return (
        <group position={[0, -viewport.height * 4, 0]}>
           <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <Text
                fontSize={2}
                color="white"
                anchorX="center"
                anchorY="middle"
                font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
            >
                FINISH
                <meshStandardMaterial emissive="white" emissiveIntensity={0.5} />
            </Text>
           </Float>
        </group>
    );
}


// --- Main Scene Composition ---
import { useThree } from '@react-three/fiber';

const SceneContent = () => {
  const { viewport } = useThree();
  
  return (
    <>
      {/* Global Lighting */}
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#f472b6" />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      {/* Scroll Controlled Content */}
      <ScrollControls pages={5} damping={0.2}>
        
        {/* 3D Content Layer */}
        <Scroll>
            {/* Page 1: Hero */}
            <HeroObject />
            
            {/* Page 2: Parallax */}
            <ParallaxShapes />

            {/* Page 3: Morph/Glass - Manually positioned for demo simplicity */}
            <group position={[0, -viewport.height * 2, 0]}>
                <WobblySphere />
            </group>

            {/* Page 4: Particles */}
            <ParticleField />

            {/* Page 5: Text */}
            <BigText3D />
        </Scroll>

        {/* HTML Overlay Layer */}
        <Scroll html style={{ width: '100%' }}>
            {/* Section 1 */}
            <section className="h-screen flex items-center p-20 justify-start">
                <div className="max-w-xl">
                    <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600">
                        React Three Fiber
                    </h1>
                    <p className="text-xl text-gray-300 mb-8">
                        Effect 1: <span className="text-cyan-400 font-bold">Geometric Rotation</span>
                    </p>
                    <p className="text-gray-400">
                        A seamless blend of 3D geometry and HTML. Scroll down to explore the immersive effects.
                    </p>
                </div>
            </section>

            {/* Section 2 */}
            <section className="h-screen flex items-center p-20 justify-end">
                <div className="max-w-xl text-right">
                    <h2 className="text-5xl font-bold mb-4">Parallax Depth</h2>
                    <p className="text-xl text-gray-300 mb-4">
                        Effect 2: <span className="text-purple-400 font-bold">Floating Objects</span>
                    </p>
                    <p className="text-gray-400">
                        Objects moving at different speeds create a sense of deep space and dimension.
                    </p>
                </div>
            </section>

            {/* Section 3 */}
            <section className="h-screen flex items-center p-20 justify-start">
                <div className="max-w-xl">
                    <h2 className="text-5xl font-bold mb-4">Material Physics</h2>
                    <p className="text-xl text-gray-300 mb-4">
                        Effect 3: <span className="text-cyan-400 font-bold">Glassmorphism</span>
                    </p>
                    <p className="text-gray-400">
                        Advanced PBR materials with transmission, roughness, and dynamic lighting reflections.
                    </p>
                </div>
            </section>

             {/* Section 4 */}
             <section className="h-screen flex items-center p-20 justify-end">
                <div className="max-w-xl text-right">
                    <h2 className="text-5xl font-bold mb-4">Particle Systems</h2>
                    <p className="text-xl text-gray-300 mb-4">
                        Effect 4: <span className="text-pink-400 font-bold">Point Clouds</span>
                    </p>
                    <p className="text-gray-400">
                        Thousands of individual points managed efficiently on the GPU for complex visualizations.
                    </p>
                </div>
            </section>

            {/* Section 5 */}
            <section className="h-screen flex items-center justify-center">
                 <div className="text-center">
                    <p className="text-xl text-gray-300 mb-4">
                        Effect 5: <span className="text-white font-bold">3D Typography</span>
                    </p>
                    <button className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-white backdrop-blur-md transition-all">
                        Start Building
                    </button>
                </div>
            </section>
        </Scroll>
      </ScrollControls>

      {/* Post Processing */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
        <Noise opacity={0.05} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505' }}>
      <Canvas shadows camera={{ position: [0, 0, 10], fov: 50 }}>
        <Suspense fallback={null}>
            <SceneContent />
        </Suspense>
      </Canvas>
      
      {/* Fixed Overlay UI */}
      <div className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
        <div className="text-white font-bold text-xl tracking-widest pointer-events-auto cursor-pointer">
            EMERGENT<span className="text-cyan-400">3D</span>
        </div>
        <div className="text-xs text-gray-500 font-mono">
            SCROLL TO EXPLORE
        </div>
      </div>
    </div>
  );
}
