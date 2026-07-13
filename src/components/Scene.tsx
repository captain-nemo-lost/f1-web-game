import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, MeshReflectorMaterial, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import FormulaCar from './FormulaCar';
import { useTransitionStore } from '../store/useTransitionStore';

export default function Scene() {
  const { camera, pointer } = useThree();
  const streakSpeedMultiplier = useTransitionStore((state) => state.streakSpeedMultiplier);
  const setSceneLoaded = useTransitionStore((state) => state.setSceneLoaded);
  const incrementCoins = useTransitionStore((state) => state.incrementCoins);
  const isGameOver = useTransitionStore((state) => state.isGameOver);
  const setGameOver = useTransitionStore((state) => state.setGameOver);
  const hasStartedGame = useTransitionStore((state) => state.hasStartedGame);
  const isInspectMode = useTransitionStore((state) => state.isInspectMode);
  const setInspectMode = useTransitionStore((state) => state.setInspectMode);

  const envGroup = useRef<THREE.Group>(null);
  const carWrapper = useRef<THREE.Group>(null);
  const garageGroup = useRef<THREE.Group>(null);
  const curbsRef = useRef<THREE.Mesh[]>([]);
  const dustParticlesRef = useRef<THREE.Points>(null);
  const burnoutParticlesRef = useRef<THREE.Mesh[]>([]);
  const coinsRef = useRef<THREE.Mesh[]>([]);
  const obstaclesRef = useRef<THREE.Mesh[]>([]);

  // Lighting Refs for Cinematic Control
  const sweepLightRef = useRef<THREE.SpotLight>(null);
  const dirLight1 = useRef<THREE.DirectionalLight>(null);
  const dirLight2 = useRef<THREE.DirectionalLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const sunlightRef = useRef<THREE.DirectionalLight>(null);
  const garageDoorRef = useRef<THREE.Group>(null);

  const isIntroSequenceRunning = useRef(true);
  const isDollyComplete = useRef(false);
  const isBurnoutActive = useRef(false);
  const lookTargetRef = useRef(new THREE.Vector3(0, 0.4, 2)); // Start looking at front wing

  const [speedRamp, setSpeedRamp] = useState(0);
  const [orbitActive, setOrbitActive] = useState(false);
  const initialSlideRef = useRef(30); // Start 30 units deep in the background

  // Mark scene as loaded when this component successfully mounts
  useEffect(() => {
    setSceneLoaded();
    // Spawn the car deep in the background for the initial slide-in animation
    if (carWrapper.current) {
      carWrapper.current.position.set(-1.23, -0.20, 30);
      carWrapper.current.rotation.set(-0.03, -0.15, 0);
      carWrapper.current.scale.set(1.55, 1.55, 1.55);
    }
  }, [setSceneLoaded]);

  // Reset logic when isGameOver turns false (game restarts)
  useEffect(() => {
    if (!isGameOver) {
      // Reset coins
      coinsRef.current.forEach((coin, i) => {
        const isLeft = Math.random() > 0.5;
        coin.position.set(isLeft ? -2.5 : 2.5, 1.2, -100 - (i * 80));
        coin.userData = { collected: false };
        coin.visible = true;
      });
      // Reset obstacles
      obstaclesRef.current.forEach((obs, i) => {
        const isLeft = Math.random() > 0.5;
        obs.position.set(isLeft ? -2.5 : 2.5, 0.75, -200 - (i * 250));
      });
    }
  }, [isGameOver]);

  // Handle state when exiting inspect mode
  useEffect(() => {
    if (!isInspectMode) {
      setOrbitActive(false);
    }
  }, [isInspectMode]);

  // Intro Sequence Master Timeline (14.5s Extended)
  useEffect(() => {
    if (!hasStartedGame) {
      setSpeedRamp(0);
      isIntroSequenceRunning.current = true;
      isDollyComplete.current = false;
      isBurnoutActive.current = false;
      lookTargetRef.current.set(0, 0.4, 2);

      if (garageGroup.current) {
        garageGroup.current.position.set(0, 0, 0);
        garageGroup.current.scale.set(1, 1, 1);
      }
      if (garageDoorRef.current) {
        garageDoorRef.current.position.set(0, 0, -19);
      }

      // Dashboard Hero Shot (Centered, outside the car)
      camera.position.set(0, 0.6, -8.0);
      camera.lookAt(0, 0.6, 0);

      if (dirLight1.current) { dirLight1.current.intensity = 2; dirLight1.current.color.set('#ff1111'); }
      if (dirLight2.current) { dirLight2.current.intensity = 1.5; dirLight2.current.color.set('#ffffff'); }
      if (spotLightRef.current) spotLightRef.current.intensity = 2;
      if (sunlightRef.current) sunlightRef.current.intensity = 0;
      if (sweepLightRef.current) sweepLightRef.current.intensity = 0;
      if (envGroup.current) envGroup.current.visible = false;
      return;
    }

    // Reset colors for the main sequence
    if (dirLight1.current) dirLight1.current.color.set('#ffffff');
    if (dirLight2.current) dirLight2.current.color.set('#ffffff');

    // Initial State: Pitch Black Void
    if (dirLight1.current) dirLight1.current.intensity = 0;
    if (dirLight2.current) dirLight2.current.intensity = 0;
    if (spotLightRef.current) spotLightRef.current.intensity = 0;
    if (sunlightRef.current) sunlightRef.current.intensity = 0;
    if (envGroup.current) envGroup.current.visible = false;

    // Initial Camera: Low and close to front-right tire (Wait, back-right tire)
    camera.position.set(2, 0.2, 3);

    const tl = gsap.timeline();

    // 0.0s - 4.0s: F1 5-Lights UI is playing on top of the black canvas

    // 4.0s - 5.0s: Reflection Sweep (Spotlight moves across)
    if (sweepLightRef.current) {
      sweepLightRef.current.intensity = 20;
      sweepLightRef.current.position.set(-5, 0.5, 3);
      tl.to(sweepLightRef.current.position, { x: 5, duration: 1.0, ease: 'power2.inOut' }, 4.0);
      tl.to(sweepLightRef.current, { intensity: 0, duration: 0.2 }, 5.0);
    }

    // 5.0s - 6.0s: HOLD at Front Tire (Burnout activates)
    tl.call(() => { isBurnoutActive.current = true; }, undefined, 5.0);

    // 6.0s - 6.4s: Whip to Cockpit (Stop Burnout instantly)
    tl.call(() => { isBurnoutActive.current = false; }, undefined, 6.0);
    tl.to(camera.position, { x: -1.5, y: 0.6, z: 0.5, duration: 0.4, ease: 'power4.inOut' }, 6.0);
    tl.to(lookTargetRef.current, { x: 0, y: 0.4, z: 0, duration: 0.4, ease: 'power4.inOut' }, 6.0);

    // 6.4s - 7.4s: HOLD at Cockpit

    // 7.4s - 7.8s: Whip to Rear Wing
    tl.to(camera.position, { x: 1.5, y: 0.5, z: -2.5, duration: 0.4, ease: 'power4.inOut' }, 7.4);
    tl.to(lookTargetRef.current, { x: 0, y: 0.5, z: -1, duration: 0.4, ease: 'power4.inOut' }, 7.4);

    // 7.8s - 8.8s: HOLD at Rear Wing

    // 8.8s - 9.4s: Whip to Hero Reveal
    tl.to(camera.position, { x: 0, y: 2.4, z: 5.0, duration: 0.6, ease: 'power4.out' }, 8.8);
    tl.to(lookTargetRef.current, { x: 0, y: 0.0, z: -10, duration: 0.6, ease: 'power4.out' }, 8.8);

    // 9.4s: Hero Hold (Lights slam on)
    if (dirLight1.current) tl.to(dirLight1.current, { intensity: 2.5, duration: 0.1 }, 9.4);
    if (dirLight2.current) tl.to(dirLight2.current, { intensity: 1.5, duration: 0.1 }, 9.4);
    if (spotLightRef.current) tl.to(spotLightRef.current, { intensity: 4, duration: 0.1 }, 9.4);

    // 9.4s - 11.8s: Cinematic float during the 2-second text rendering
    tl.to(camera.position, { y: 2.45, duration: 2.4, ease: 'sine.inOut' }, 9.4);

    // 11.8s - 13.1s: Hydraulic Door & Exposure Spike
    if (garageDoorRef.current) {
      tl.to(garageDoorRef.current.position, { y: 12, duration: 1.3, ease: 'power2.inOut' }, 11.8);
    }
    // Sunlight exposure spike (blinding)
    if (sunlightRef.current) {
      tl.to(sunlightRef.current, { intensity: 50, duration: 0.3, ease: 'power2.in' }, 12.0);
      tl.to(sunlightRef.current, { intensity: 0, duration: 2.0, ease: 'power2.out' }, 12.3); // Fades out completely for gameplay
    }

    // 13.1s - 14.5s: The Launch
    // Car moves forward out of the garage. We simulate this by moving the garage backward.
    if (garageGroup.current) {
      tl.to(garageGroup.current.position, { z: 40, duration: 1.4, ease: 'power3.in' }, 13.1);
      tl.to(garageGroup.current.scale, { x: 0, y: 0, z: 0, duration: 0.1 }, 14.5); // Hide after passing camera
    }

    // 13.8s: Track appears (Car crosses the wall threshold)
    tl.call(() => { if (envGroup.current) envGroup.current.visible = true; }, undefined, 13.8);

    // Speed Ramp for Track
    gsap.to({ val: 0 }, {
      val: 1,
      duration: 1.4,
      delay: 13.1,
      ease: 'power2.in',
      onUpdate: function () {
        setSpeedRamp(this.targets()[0].val);
      }
    });

    const t = setTimeout(() => {
      isIntroSequenceRunning.current = false;
      isDollyComplete.current = true;
    }, 15900);

    return () => {
      clearTimeout(t);
      tl.kill();
    };
  }, [camera, hasStartedGame]);

  // Build Geometry (Curbs, Dust, Burnout Smoke)
  useEffect(() => {
    // 1. Flat painted curbs
    const curbGeo = new THREE.BoxGeometry(1.2, 0.05, 3.0);
    const redCurbMat = new THREE.MeshBasicMaterial({ color: '#cc0000' });
    const TRACK_WIDTH = 6.0; // Increased width

    for (let i = 0; i < 60; i++) {
      const lCurb = new THREE.Mesh(curbGeo, redCurbMat);
      lCurb.position.set(TRACK_WIDTH, 0.025, i * 5 - 150);
      curbsRef.current.push(lCurb);
      if (envGroup.current) envGroup.current.add(lCurb);

      const rCurb = new THREE.Mesh(curbGeo, redCurbMat);
      rCurb.position.set(-TRACK_WIDTH, 0.025, i * 5 - 150);
      curbsRef.current.push(rCurb);
      if (envGroup.current) envGroup.current.add(rCurb);
    }

    // 2. Dust particles (Speedlines/Wind effect)
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 1000;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 20; // x
      dustPos[i + 1] = Math.random() * 5; // y
      dustPos[i + 2] = (Math.random() - 0.5) * 100 - 50; // z
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 0.5 });
    const dust = new THREE.Points(dustGeo, dustMat);
    dustParticlesRef.current = dust;
    if (envGroup.current) envGroup.current.add(dust);

    // 3. Burnout Smoke
    const smokeGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0 });
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone()); // Clone material so we can fade individually
      mesh.userData = {
        life: Math.random(),
        speedY: Math.random() * 3 + 1,
        speedZ: Math.random() * 4 + 2,
        maxScale: Math.random() * 4 + 2
      };
      burnoutParticlesRef.current.push(mesh);
      if (garageGroup.current) garageGroup.current.add(mesh);
    }

    // 4. Coins
    const coinGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 16);
    coinGeo.rotateX(Math.PI / 2); // Stand them up
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 1,
      roughness: 0.2,
      emissive: 0xaa8800,
      emissiveIntensity: 0.8
    });

    for (let i = 0; i < 10; i++) {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      const rand = Math.random();
      const laneX = rand < 0.33 ? -4.0 : (rand < 0.66 ? 0 : 4.0);
      coin.position.set(laneX, 1.2, -100 - (i * 80));
      coin.userData = { collected: false };
      coinsRef.current.push(coin);
      if (envGroup.current) envGroup.current.add(coin);
    }

    // 5. Obstacles
    const obsGeo = new THREE.BoxGeometry(3.5, 2.5, 1.5); // Larger barricades
    const obsMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xaa0000,
      emissiveIntensity: 1.5
    });

    for (let i = 0; i < 5; i++) {
      const obs = new THREE.Mesh(obsGeo, obsMat);
      const rand = Math.random();
      const laneX = rand < 0.33 ? -4.0 : (rand < 0.66 ? 0 : 4.0);
      obs.position.set(laneX, 1.25, -200 - (i * 250)); // Spaced far out (elevated to match new height)
      obstaclesRef.current.push(obs);
      if (envGroup.current) envGroup.current.add(obs);
    }

    return () => {
      curbGeo.dispose(); redCurbMat.dispose();
      dustGeo.dispose(); dustMat.dispose();
      smokeGeo.dispose(); smokeMat.dispose();
      coinGeo.dispose(); coinMat.dispose();
      obsGeo.dispose(); obsMat.dispose();
    };
  }, []);

  useFrame((state, delta) => {
    // Ambient Dust float animation
    if (dustParticlesRef.current && (garageGroup.current?.scale.x ?? 0) > 0) {
      dustParticlesRef.current.rotation.y += delta * 0.05;
      dustParticlesRef.current.rotation.x += delta * 0.02;
    }

    // Burnout Smoke & Rev Shudder
    if (isBurnoutActive.current && carWrapper.current) {
      // Violent chassis shudder
      carWrapper.current.position.y = Math.sin(state.clock.elapsedTime * 60) * 0.01;
      carWrapper.current.position.x = Math.sin(state.clock.elapsedTime * 45) * 0.005;

      // Animate smoke spheres
      burnoutParticlesRef.current.forEach((mesh) => {
        mesh.userData.life += delta * 1.5;
        if (mesh.userData.life > 1) {
          mesh.userData.life = 0;
          // Spawn near front-right and rear tires
          const isRear = Math.random() > 0.5;
          const xPos = isRear ? 1.0 : 1.2;
          const zPos = isRear ? -1.0 : 1.5;
          mesh.position.set(xPos + (Math.random() - 0.5) * 0.5, 0.2, zPos + (Math.random() - 0.5) * 0.5);
        }
        const progress = mesh.userData.life;
        mesh.position.y += delta * mesh.userData.speedY;
        mesh.position.z += delta * mesh.userData.speedZ;
        const scale = 1 + progress * mesh.userData.maxScale;
        mesh.scale.set(scale, scale, scale);
        // Fade in rapidly, fade out slowly
        const opacity = Math.sin(progress * Math.PI) * 0.4;
        (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      });
    } else if (carWrapper.current && carWrapper.current.position.y !== 0 && (isIntroSequenceRunning.current && hasStartedGame)) {
      // Reset chassis when burnout stops (only during game intro)
      carWrapper.current.position.y = 0;
      carWrapper.current.position.x = 0;
      burnoutParticlesRef.current.forEach(m => (m.material as THREE.MeshBasicMaterial).opacity = 0);
    }

    if (isIntroSequenceRunning.current && hasStartedGame) {
      // Intro camera logic: Lock camera to GSAP timeline's lookTarget
      camera.lookAt(lookTargetRef.current);
      return; // Skip interactive parallax during intro
    }

    if (!hasStartedGame) {
      if (dustParticlesRef.current) dustParticlesRef.current.visible = false;
      
      if (!isInspectMode) {
        // Lerp camera back to dashboard
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0.0 + Math.sin(state.clock.elapsedTime * 0.5) * 0.01, 0.05);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.6 + Math.cos(state.clock.elapsedTime * 0.3) * 0.01, 0.05);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, -8.0, 0.05);
        camera.lookAt(0, 0.6, 0);

        // Lerp car back to dashboard offset
        if (carWrapper.current) {
          // Slide in from the background on initial load
          initialSlideRef.current = THREE.MathUtils.lerp(initialSlideRef.current, 0, 0.03);
          const targetZ = -0.82 + initialSlideRef.current;

          carWrapper.current.position.x = THREE.MathUtils.lerp(carWrapper.current.position.x, -1.23, 0.05);
          carWrapper.current.position.y = THREE.MathUtils.lerp(carWrapper.current.position.y, -0.20, 0.05);
          carWrapper.current.position.z = THREE.MathUtils.lerp(carWrapper.current.position.z, targetZ, 0.05);
          
          carWrapper.current.rotation.x = THREE.MathUtils.lerp(carWrapper.current.rotation.x, -0.03, 0.05);
          carWrapper.current.rotation.y = THREE.MathUtils.lerp(carWrapper.current.rotation.y, -0.15, 0.05);
          carWrapper.current.rotation.z = THREE.MathUtils.lerp(carWrapper.current.rotation.z, 0, 0.05);
          
          carWrapper.current.scale.x = THREE.MathUtils.lerp(carWrapper.current.scale.x, 1.55, 0.05);
          carWrapper.current.scale.y = THREE.MathUtils.lerp(carWrapper.current.scale.y, 1.55, 0.05);
          carWrapper.current.scale.z = THREE.MathUtils.lerp(carWrapper.current.scale.z, 1.55, 0.05);
        }
      } else if (!orbitActive) {
        // Lerp camera to side profile
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, 8.0, 0.05);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.5, 0.05);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 0, 0.05);
        camera.lookAt(0, 0.5, 0);

        // Lerp car to center
        if (carWrapper.current) {
          carWrapper.current.position.x = THREE.MathUtils.lerp(carWrapper.current.position.x, 0, 0.05);
          carWrapper.current.position.y = THREE.MathUtils.lerp(carWrapper.current.position.y, 0, 0.05);
          carWrapper.current.position.z = THREE.MathUtils.lerp(carWrapper.current.position.z, 0, 0.05);
          
          carWrapper.current.rotation.x = THREE.MathUtils.lerp(carWrapper.current.rotation.x, 0, 0.05);
          carWrapper.current.rotation.y = THREE.MathUtils.lerp(carWrapper.current.rotation.y, 0, 0.05);
          carWrapper.current.rotation.z = THREE.MathUtils.lerp(carWrapper.current.rotation.z, 0, 0.05);
          
          carWrapper.current.scale.x = THREE.MathUtils.lerp(carWrapper.current.scale.x, 2.2, 0.05);
          carWrapper.current.scale.y = THREE.MathUtils.lerp(carWrapper.current.scale.y, 2.2, 0.05);
          carWrapper.current.scale.z = THREE.MathUtils.lerp(carWrapper.current.scale.z, 2.2, 0.05);
        }

        // Check if close enough to hand over to OrbitControls
        if (Math.abs(camera.position.x - 8.0) < 0.2) {
          setOrbitActive(true);
        }
      }
      return;
    } else {
      if (dustParticlesRef.current) dustParticlesRef.current.visible = true;
      if (isIntroSequenceRunning.current && carWrapper.current) {
        // Ensure car is completely reset for the intro animation
        const currentScale = useTransitionStore.getState().customScale;
        carWrapper.current.position.set(0, 0, 0);
        carWrapper.current.rotation.set(0, 0, 0);
        carWrapper.current.scale.set(currentScale, currentScale, currentScale); // Scale matched to in-game tuning
      }
    }

    // Post-Intro Interactive Logic
    if (isGameOver) {
      return; // Freeze game logic
    }

    // Gradual Speed Increase Logic
    const currentCoins = useTransitionStore.getState().coins;
    const isDevPaused = useTransitionStore.getState().isDevPaused;
    
    const dynamicSpeed = Math.min(32 + (currentCoins * 0.8), 120); // Starts 30% slower, scale up
    const currentSpeed = dynamicSpeed * speedRamp * streakSpeedMultiplier;
    const moveZ = isDevPaused ? 0 : (currentSpeed * delta);

    const elementAlpha = 1;

    // Dust particle wind effect
    if (dustParticlesRef.current) {
      const positions = dustParticlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 2; i < positions.length; i += 3) {
        positions[i] += moveZ * 1.5; // Move dust faster than ground to simulate wind
        if (positions[i] > 20) {
          positions[i] = -150 - Math.random() * 100; // Reset far ahead
        }
      }
      dustParticlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Animate Curbs
    curbsRef.current.forEach((curb) => {
      curb.position.z += moveZ; // Scene moves to +Z
      if (curb.position.z > 20) curb.position.z -= 300;
      (curb.material as THREE.MeshBasicMaterial).opacity = elementAlpha;
      (curb.material as THREE.MeshBasicMaterial).transparent = true;
    });

    // Animate and Check Coins
    coinsRef.current.forEach((coin) => {
      coin.rotation.y += delta * 3; // Spin
      coin.position.z += moveZ; // Coins move to +Z

      if (!coin.userData.collected) {
        // Collision Detection
        // If they move towards +Z, and car is at Z=0. If they pass Z=0 going positive:
        if (coin.position.z > -2.0 && coin.position.z < 2.0) {
          if (carWrapper.current) {
            const distX = Math.abs(coin.position.x - carWrapper.current.position.x);
            if (distX < 3.0) { // Hit box size increased
              incrementCoins();
              coin.userData.collected = true;
              coin.visible = false;
            }
          }
        }
      }

      // Recycle Coin
      if (coin.position.z > 20) {
        coin.position.z -= (400 + Math.random() * 200); // Send far ahead (-Z)
        const rand = Math.random();
        coin.position.x = rand < 0.33 ? -4.0 : (rand < 0.66 ? 0 : 4.0); // Wider lanes
        coin.userData.collected = false;
        coin.visible = true;
      }
    });

    // Animate and Check Obstacles
    obstaclesRef.current.forEach((obs) => {
      obs.position.z += moveZ;

      // Collision Detection
      if (obs.position.z > -2.0 && obs.position.z < 2.0) {
        if (carWrapper.current) {
          const distX = Math.abs(obs.position.x - carWrapper.current.position.x);
          if (distX < 2.5) { // Hit box size for larger barricade
            setGameOver();
          }
        }
      }

      // Recycle Obstacle (Frequency increases as coins increase)
      if (obs.position.z > 20) {
        const currentCoins = useTransitionStore.getState().coins;
        const baseRecycleDist = Math.max(200, 800 - (currentCoins * 30)); // Distance decreases as coins go up, min 200
        
        // Find the furthest obstacle ahead to prevent side-by-side unpassable blocks
        let furthestZ = 0;
        obstaclesRef.current.forEach((o) => {
          if (o !== obs && o.position.z < furthestZ) furthestZ = o.position.z;
        });
        
        obs.position.z = furthestZ - (baseRecycleDist + Math.random() * 200);
        const rand = Math.random();
        obs.position.x = rand < 0.33 ? -4.0 : (rand < 0.66 ? 0 : 4.0);
      }
    });

    // Only apply interactive steering and camera if the intro sequence is finished
    if (!isIntroSequenceRunning.current && hasStartedGame) {
      // Car Parallax (Highly responsive F1 cornering feel)
      if (carWrapper.current) {
        if (isDevPaused) {
          // Dev Tuning Mode Override
          const currentTilt = useTransitionStore.getState().customTilt;
          const currentScale = useTransitionStore.getState().customScale;
          const currentX = useTransitionStore.getState().customX;
          const currentY = useTransitionStore.getState().customY;
          
          carWrapper.current.rotation.set(currentTilt, 0, 0);
          carWrapper.current.position.set(currentX, currentY, 0);
          carWrapper.current.scale.set(currentScale, currentScale, currentScale);
        } else {
          // Steering physics: Nose turns first, body follows
          const targetRotY = pointer.x * -0.45;
          const targetPosX = pointer.x * 4.5;

          const steeringLerp = 0.35;
          const movementLerp = 0.25;

          const currentScale = useTransitionStore.getState().customScale;
          const currentTilt = useTransitionStore.getState().customTilt;

          carWrapper.current.rotation.y = THREE.MathUtils.lerp(carWrapper.current.rotation.y, targetRotY, steeringLerp);
          carWrapper.current.rotation.x = currentTilt; // Tilted based on dev UI manager
          carWrapper.current.rotation.z = 0;

          carWrapper.current.position.x = THREE.MathUtils.lerp(carWrapper.current.position.x, targetPosX, movementLerp);
          carWrapper.current.position.y = THREE.MathUtils.lerp(carWrapper.current.position.y, 0, movementLerp); // Keep flat
          
          carWrapper.current.scale.set(currentScale, currentScale, currentScale);
        }
      }

      // Camera position (ties slightly to mouse for global responsiveness)
      const baseCameraY = 2.4; // Elevated racing view

      // Camera shifts based on mouse to change viewing angle
      const targetCameraX = pointer.x * -1.5;
      const targetCameraY = baseCameraY + pointer.y * 0.6;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCameraX, 0.05);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCameraY, 0.05);
      
      // Pull back to racing distance (4.5) smoothly after the intro's 3.2 close-up
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 4.5, 0.02);

      // Horizon target (looking sharply down)
      const lookTargetY = 0.0 - (pointer.y * 0.2);
      const lookTarget = new THREE.Vector3(0, lookTargetY, -10);
      camera.lookAt(lookTarget);
    }
  });

  return (
    <>
      <color attach="background" args={['#020202']} />
      <fog attach="fog" args={['#020202', 5, 40]} />

      {/* LIGHTING */}
      <spotLight ref={sweepLightRef} angle={0.2} penumbra={0.5} distance={10} color="#ffffff" />
      <directionalLight ref={sunlightRef} position={[0, 5, -20]} intensity={0} color="#ffffff" />

      {/* Studio lighting setup for liquid chrome reflections */}
      <directionalLight ref={dirLight1} position={[5, 5, 5]} intensity={2.5} color="#ffffff" />
      <directionalLight ref={dirLight2} position={[-5, 5, 5]} intensity={1.5} color="#ffffff" />
      <spotLight ref={spotLightRef} position={[0, 10, 0]} intensity={4} angle={0.5} penumbra={1} color="#ffffff" />

      <group ref={carWrapper}>
        <group 
          onClick={(e) => {
            if (!hasStartedGame && !isInspectMode) {
              e.stopPropagation();
              setInspectMode();
            }
          }}
          onPointerEnter={() => { if (!hasStartedGame && !isInspectMode) document.body.style.cursor = 'pointer'; }}
          onPointerLeave={() => { document.body.style.cursor = 'auto'; }}
        >
          <FormulaCar />
        </group>
      </group>

      {orbitActive && (
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          target={[0, 0, 0]}
          minDistance={2}
          maxDistance={12}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
      )}

      {/* GARAGE ENCLOSURE (Brutalist Void Aesthetic) */}
      <group ref={garageGroup} visible={!isInspectMode}>
        {/* Massive Corrugated Hydraulic Door in front */}
        <group ref={garageDoorRef} position={[0, 0, -19]}>
          {Array.from({ length: 30 }).map((_, i) => (
            <mesh key={i} position={[0, i * 0.35 + 0.15, 0]}>
              <boxGeometry args={[12, 0.3, 1]} />
              <meshStandardMaterial color="#111" roughness={0.8} metalness={0.4} />
            </mesh>
          ))}
        </group>

        {/* Removed Red Slash */}
      </group>

      {/* ENVIRONMENT (Pure void with crisp reflections) */}
      {/* Ground Reflection matching reference - Now permanently visible */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={!hasStartedGame ? [0, -0.20, 0] : [0, 0, 0]}>
        <planeGeometry args={[100, 200]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={100}
          roughness={0.2}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0a0a"
          metalness={0.9}
          mirror={1}
        />
      </mesh>

      {/* Track Curbs (Hidden during initial garage sequence) */}
      <group ref={envGroup}>
      </group>

      <Environment preset="studio" environmentIntensity={0.3} />

      {/* Cinematic Velocity Post-Processing */}
      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={0.8}
          luminanceSmoothing={0.9}
          height={300}
          intensity={0.4}
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0008 * streakSpeedMultiplier, 0.0008 * streakSpeedMultiplier)}
          radialModulation={true}
          modulationOffset={0.5}
        />
        <Vignette eskil={false} offset={0.5} darkness={0.9} />
      </EffectComposer>
    </>
  );
}
