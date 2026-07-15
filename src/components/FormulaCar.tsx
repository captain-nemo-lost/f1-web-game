import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useTransitionStore } from '../store/useTransitionStore';

export default function FormulaCar() {
  const carGroup = useRef<THREE.Group>(null);
  const brakeLightLeft = useRef<THREE.PointLight>(null);
  const brakeLightRight = useRef<THREE.PointLight>(null);
  
  const brakeLightsActive = useTransitionStore((state) => state.brakeLightsActive);
  const streakSpeedMultiplier = useTransitionStore((state) => state.streakSpeedMultiplier);
  const hasStartedGame = useTransitionStore((state) => state.hasStartedGame);
  // In game, face backward (-0.04 tilt, Math.PI rotation)
  const currentRotation = [-0.04, Math.PI, 0];

  // Load the provided GLB model
  const { scene } = useGLTF('/aston_martin_f1_amr23_2023.glb');

  // Enhance existing materials instead of overriding them
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Boost reflections on the original textures so it still looks cinematic
          if (child.material) {
            // Support both single materials and arrays of materials
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(mat => {
              if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                (mat as THREE.MeshStandardMaterial).envMapIntensity = 1.5;
                mat.needsUpdate = true;
              }
            });
          }
        }
      });
    }
  }, [scene]);

  // Animation Loop
  useFrame((_state, delta) => {
    // Aggressive high-speed vibration (only when game has started)
    if (carGroup.current) {
      if (hasStartedGame) {
        // Reduce vertical shake slightly so it feels more grounded, keep horizontal
        const shakeY = (Math.random() - 0.5) * 0.005 * streakSpeedMultiplier;
        const shakeX = (Math.random() - 0.5) * 0.008 * streakSpeedMultiplier;
        carGroup.current.position.y = 0.0 + shakeY;
        carGroup.current.position.x = shakeX;
      } else {
        carGroup.current.position.y = 0;
        carGroup.current.position.x = 0;
      }
    }

    // Brake lights logic
    // Brake lights logic: Base glow + bright on steer/brake
    const steerAggression = Math.abs(_state.pointer.x);
    let targetIntensity = 2; // Idle base glow
    if (brakeLightsActive) {
      targetIntensity = 20; // Full braking
    } else if (steerAggression > 0.4 && hasStartedGame) {
      targetIntensity = 5 + (steerAggression * 10); // Dynamic cornering traction
    }

    if (brakeLightLeft.current) {
      brakeLightLeft.current.intensity = THREE.MathUtils.lerp(brakeLightLeft.current.intensity, targetIntensity, delta * 10);
    }
    if (brakeLightRight.current) {
      brakeLightRight.current.intensity = THREE.MathUtils.lerp(brakeLightRight.current.intensity, targetIntensity, delta * 10);
    }
  });

  return (
    <group ref={carGroup}>
      {/* 
        The model scale, position, and rotation depend heavily on how it was exported.
        We'll apply a standard rotation (facing away from camera) and scale.
        If the car is backward or too large/small, these values will need tuning.
      */}
      <primitive 
        object={scene} 
        scale={1.8} 
        rotation={currentRotation as [number, number, number]} 
        position={[0, 0, 0]} 
      />

      {/* EXHAUST GLOW (Fixed position behind the car, may need Y/Z adjustment based on model size) */}
      <pointLight color="#ff4400" intensity={8} distance={4} position={[0, 0.4, 2.5]} />
      
      {/* Underfloor Glow */}
      <pointLight color="#ff2200" intensity={2} distance={4} position={[0, 0.1, 0]} />

      {/* BRAKE LIGHTS (Approximate rear positions) */}
      <pointLight ref={brakeLightLeft} color="#ff0000" intensity={0} distance={2.5} position={[0.8, 0.5, 2.5]} />
      <pointLight ref={brakeLightRight} color="#ff0000" intensity={0} distance={2.5} position={[-0.8, 0.5, 2.5]} />
    </group>
  );
}

// Preload the model so it doesn't pop in
useGLTF.preload('/aston_martin_f1_amr23_2023.glb');
