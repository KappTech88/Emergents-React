# React Three Fiber Scroll Effects Demo

This project demonstrates various 3D effects in React using `react-three-fiber` and `@react-three/drei`.
The application is structured as a single-page scroll experience where each section showcases a specific R3F capability.

## Effects Showcased

1.  **Geometric Rotation (Hero)**: Demonstrates basic mesh manipulation (rotation, scaling) and wireframe materials.
2.  **Parallax Floating Objects**: Uses `useScroll` to create parallax depth with objects moving at different speeds.
3.  **Glassmorphism (Material Physics)**: Showcases PBR materials with transmission (glass), roughness, and metalness.
4.  **Particle Systems**: Demonstrates high-performance point clouds using `points` and `pointsMaterial`.
5.  **3D Typography**: Uses the `Text` component from `drei` to render 3D text in the scene.

## Key Libraries

-   `@react-three/fiber`: The core React renderer for Three.js.
-   `@react-three/drei`: Useful helpers (ScrollControls, Float, Stars, Text).
-   `tailwindcss`: For the UI overlay styling.

## Project Structure

-   `src/App.js`: Contains the main scene, scroll logic, and all effect components.
-   `src/index.css`: Tailwind directives and custom design tokens (Neon/Dark theme).
