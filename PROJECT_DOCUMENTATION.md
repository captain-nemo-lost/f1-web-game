# Velocity: F1 Cinematic Web Game Experience

## Overview
**Velocity** is a high-performance, cinematic, interactive 3D web experience built to showcase advanced web graphics, procedural generation, and real-time game loops in the browser. What started as a conceptual interactive developer portfolio evolved into a full-fledged Formula 1 arcade-style runner game set in a neon-lit, cyberpunk cityscape.

The core design philosophy is **Premium Aesthetic**. Every UI element, animation curve, and 3D lighting decision was made to evoke the high-speed, high-stakes nature of Formula 1 racing combined with modern glassmorphism web design.

---

## Tech Stack
- **Core:** React (Vite), TypeScript
- **3D Graphics:** Three.js, React Three Fiber (R3F), Drei
- **Post-Processing:** `@react-three/postprocessing` (Bloom, Chromatic Aberration)
- **Animations:** GSAP (Timeline sequencing), Framer Motion (UI transitions)
- **State Management:** Zustand
- **Styling:** Tailwind CSS, Vanilla CSS

---

## Architecture & Technical Decisions

### 1. State Management (Zustand)
**Why:** In a React Three Fiber application, passing props down through deep component trees (especially between the HTML overlay and the WebGL canvas) causes unnecessary re-renders that destroy framerate.
**How:** We used Zustand (`useTransitionStore`) to hold the entire game state (`coins`, `isGameOver`, `controlMode`, `hasStartedGame`). The `useFrame` game loop in the 3D scene can read this state without triggering React re-renders, ensuring a locked 60FPS experience.

### 2. The 3D Game Loop (`Scene.tsx`)
**Why:** We needed a procedural, infinite-feeling track that runs smoothly.
**How:** Instead of moving the car forward through the world, **the car stays stationary at Z=0**, and the world (ground, obstacles, coins, and buildings) rushes backward towards the camera. 
- A `useFrame` hook acts as the engine. It handles collision detection, object recycling (moving objects that pass behind the camera back to the horizon), and smooth interpolation (`lerp`) of the car's steering physics.

### 3. The Curved World Shader
**Why:** A flat ground plane disappearing into the fog looks artificial. We wanted an "Animal Crossing" or "Subway Surfers" style curved horizon to make the world feel vast and dynamic.
**How:** We intercept and override the default Three.js materials using `onBeforeCompile`. We inject a custom Vertex Shader chunk (`utils/shaders.ts`) that bends all vertices downward along the Y-axis based on the square of their Z-distance from the camera. This makes the world curve naturally over the horizon.

### 4. Procedural Cyberpunk Skyscrapers
**Why:** Standard box geometries with textures looked cheap. As the buildings got taller, the textures would stretch, ruining the premium aesthetic. Loading dozens of complex 3D models would destroy load times.
**How:** We built a custom procedural generator (`createComplexBuilding`). It builds modular skyscrapers with setbacks and antennae dynamically. For the windows, we wrote a custom Fragment Shader that uses absolute world-space coordinates to generate tiny, unstretchable, emissive "light pin-pricks". This results in highly detailed, monolithic silhouettes that perform incredibly well.

### 5. Cinematic Intro Sequence
**Why:** We wanted a jaw-dropping opening that transitions seamlessly from UI to gameplay.
**How:** The sequence is split across CSS, Framer Motion, and GSAP. 
1. **F1 Lights:** Pure CSS animations handle the 5 red lights to guarantee timing precision.
2. **The Void:** The 3D scene starts in a pitch-black void.
3. **Camera Choreography:** A GSAP timeline (`tl`) whips the camera around the car, perfectly synced with UI text reveals (Telemetry Boot UI).
4. **The Reveal:** At exactly 11.8 seconds, the garage door lifts, a blinding sunlight spike blows out the exposure (via post-processing Bloom), and the cyberpunk city is revealed just as the car launches.

### 6. Dynamic Road Banking
**Why:** Simple left/right panning feels flat. High-speed cornering needs weight.
**How:** As the user steers, the entire environment group (the ground, buildings, and obstacles) rotates slightly around the Z-axis (roll). This simulates the G-force and cinematic camera tilt of taking a corner at 300km/h.

### 7. Dual Control System (Advanced vs Classic)
**Why:** Mouse controls offer incredible precision (Analog), but many users expect traditional keyboard controls (Digital) for web games.
**How:** We implemented a "Virtual Pointer". When using Keyboard mode (Arrow Keys / A & D), the digital 0 or 1 inputs are mathematically `lerped` (interpolated) over time to simulate the smooth curve of a mouse movement. This ensures the car's physics behave identically and smoothly regardless of the input method.

### 8. HTML/UI Overlay System
**Why:** We needed a HUD, Menus, and Game Over screens that look sharp and respond to clicks, which is difficult purely inside WebGL.
**How:** The `App.tsx` file layers a standard HTML/Tailwind DOM *over* the WebGL `<Canvas>`. The HTML uses `pointer-events: none` globally, selectively re-enabling `pointer-events: auto` only on buttons (like the Dashboard controls). Framer Motion handles the slick, glassmorphic UI entrances.

---

## Project Structure
- `src/components/Scene.tsx`: The heart of the game. Handles the 3D environment, procedural generation, camera timelines, and the physics/collision game loop.
- `src/components/FormulaCar.tsx`: Loads the `.glb` 3D model, applies enhanced reflective materials, and manages the dynamic brake light intensities.
- `src/components/Dashboard.tsx`: The main menu UI containing the Play, Controls Modal, and How to Play Modal.
- `src/components/IntroSequence.tsx`: The initial boot sequence and F1 lights overlay.
- `src/store/useTransitionStore.ts`: Global state management.
- `src/utils/shaders.ts`: GLSL shader chunks for the curved world effect.

---

## Future Extensibility
Because the architecture relies heavily on the `useTransitionStore` and modular components, extending the game (such as adding a Garage UI to dynamically swap the `FormulaCar` `.glb` model) is highly trivial and seamlessly supported by the current foundation.
