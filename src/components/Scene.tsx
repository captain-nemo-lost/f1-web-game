import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, Stars, PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { applyCurvedWorld, injectCurvedWorld } from '../utils/shaders';
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
  const [enablePostProcessing, setEnablePostProcessing] = useState(true);
  const initialSlideRef = useRef(30); // Start 30 units deep in the background

  // Keyboard controls state
  const leftPressed = useRef(false);
  const rightPressed = useRef(false);
  const virtualPointer = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftPressed.current = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightPressed.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') leftPressed.current = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') rightPressed.current = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Generate fine asphalt/grain noise texture for the road
  const noiseTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      for (let x = 0; x < 256; x++) {
        for (let y = 0; y < 256; y++) {
          const v = Math.floor(Math.random() * 255);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20, 200); // Stretch along the long road
    return tex;
  }, []);


  // Cleanup texture on unmount to prevent WebGL Context Lost during HMR
  useEffect(() => {
    return () => {
      noiseTex.dispose();
    };
  }, [noiseTex]);

  const applyCurvedBuilding = (material: THREE.Material) => {
    material.onBeforeCompile = (shader) => {
      injectCurvedWorld(shader);
      
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vWorldPos;
        `
      );
      
      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `
        #include <worldpos_vertex>
        vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec3 vWorldPos;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        
        vec2 gridPos = vec2(floor(vWorldPos.x * 0.4 + vWorldPos.z * 0.4), floor(vWorldPos.y * 0.4));
        vec2 localFract = vec2(fract(vWorldPos.x * 0.4 + vWorldPos.z * 0.4), fract(vWorldPos.y * 0.4));
        
        if (localFract.x > 0.2 && localFract.x < 0.8 && localFract.y > 0.2 && localFract.y < 0.8) {
          float n = hash(gridPos);
          if (n > 0.85) { // sparse windows
            vec3 winColor = n > 0.98 ? vec3(1.0, 0.2, 0.2) : (n > 0.95 ? vec3(1.0, 0.7, 0.4) : vec3(0.9, 0.95, 1.0));
            totalEmissiveRadiance += winColor * 2.0;
          }
        }
        `
      );
    };
  };

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
        coin.userData.collected = false;
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

    // 11.8s: Track appears behind the opening garage door
    tl.call(() => { if (envGroup.current) envGroup.current.visible = true; }, undefined, 11.8);

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

  // Build Geometry (Curbs, Dust, Burnout Smoke, Pillars)
  useEffect(() => {
    const TRACK_WIDTH = 8.0; // Increased width

    // 1. Heavy Guardrails with Embedded LEDs
    const railGeo = new THREE.BoxGeometry(1.0, 1.2, 4.0, 1, 1, 4);
    const railMat = new THREE.MeshStandardMaterial({ color: '#222', metalness: 0.9, roughness: 0.1 });
    const ledGeo = new THREE.BoxGeometry(1.05, 0.15, 4.0, 1, 1, 4);
    const ledMat = new THREE.MeshStandardMaterial({
      color: '#ff0000',
      emissive: '#ff0000',
      emissiveIntensity: 3.0 // Reduced from 10 to prevent massive screen bloom
    });
    applyCurvedWorld(railMat);
    applyCurvedWorld(ledMat);

    const createGuardrail = (isLeft: boolean, zPos: number) => {
      const group = new THREE.Group() as any;
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.y = 0.6;
      group.add(rail);

      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.y = 0.8;
      group.add(led);

      const sign = isLeft ? 1 : -1;
      group.position.set(sign * (TRACK_WIDTH + 0.5), 0, zPos);
      return group;
    };

    // 1.5. Perspective Details (Dashed Lines & Expansion Joints)
    const dashGeo = new THREE.PlaneGeometry(0.2, 2.0, 1, 4);
    const dashMat = new THREE.MeshStandardMaterial({ 
      color: '#ffffff', 
      emissive: '#ffffff', 
      emissiveIntensity: 2, 
      roughness: 0.8 
    });
    applyCurvedWorld(dashMat);
    dashGeo.rotateX(-Math.PI / 2);

    const jointGeo = new THREE.BoxGeometry(TRACK_WIDTH * 2, 0.05, 0.2, 1, 1, 4);
    const jointMat = new THREE.MeshStandardMaterial({ color: '#050505', metalness: 0.8, roughness: 0.2 });
    applyCurvedWorld(jointMat);

    for (let i = 0; i < 240; i++) {
      const z = i * 4 - 800; // Dense spacing for continuous look
      
      const lRail = createGuardrail(true, z);
      const rRail = createGuardrail(false, z);
      curbsRef.current.push(lRail);
      curbsRef.current.push(rRail);
      if (envGroup.current) {
        envGroup.current.add(lRail);
        envGroup.current.add(rRail);
      }

      // Add dashed line every 8 meters (i % 2 === 0)
      if (i % 2 === 0) {
        const dash = new THREE.Mesh(dashGeo, dashMat);
        dash.position.set(0, 0.51, z);
        curbsRef.current.push(dash as any);
        if (envGroup.current) envGroup.current.add(dash);
      }

      // Add expansion joint every 24 meters (i % 6 === 0)
      if (i % 6 === 0) {
        const joint = new THREE.Mesh(jointGeo, jointMat);
        joint.position.set(0, 0.505, z);
        curbsRef.current.push(joint as any);
        if (envGroup.current) envGroup.current.add(joint);
      }
    }

    // 2. Support Pillars
    const pillarGeo = new THREE.BoxGeometry(TRACK_WIDTH * 2.5, 40, 2, 1, 1, 2);
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#050505', metalness: 0.5, roughness: 0.9 });
    applyCurvedWorld(pillarMat);

    for (let i = 0; i < 12; i++) {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat) as any;
      pillar.position.set(0, -20.5, i * 80 - 800); // 0.5 is thickness of road
      curbsRef.current.push(pillar); // Recycle them like curbs
      if (envGroup.current) envGroup.current.add(pillar);
    }

    // 3. Ambient Dust (Sparks/Air)
    // REMOVED (User wanted clear visibility without white particles)

    // 4. Burnout Smoke
    const smokeGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0 });
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
      mesh.userData = {
        life: Math.random(),
        speedY: Math.random() * 3 + 1,
        speedZ: Math.random() * 4 + 2,
        maxScale: Math.random() * 4 + 2
      };
      burnoutParticlesRef.current.push(mesh);
      if (garageGroup.current) garageGroup.current.add(mesh);
    }

    // 5. Coins (Holographic Spin)
    const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: '#ffd700',
      metalness: 0.2,
      roughness: 0.1,
      emissive: '#aa8800',
      emissiveIntensity: 2.0
    });
    applyCurvedWorld(coinMat);

    for (let i = 0; i < 10; i++) {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      const rand = Math.random();
      const laneX = rand < 0.33 ? -4.5 : (rand < 0.66 ? 0 : 4.5);
      coin.position.set(laneX, 1.2, -100 - (i * 80));
      coin.userData = { collected: false, baseZ: coin.position.z, startOffset: Math.random() * 10 };
      coinsRef.current.push(coin);
      if (envGroup.current) envGroup.current.add(coin);
    }

    // 6. Premium Metallic Overpasses
    const overpassGeo = new THREE.BoxGeometry(TRACK_WIDTH * 2.8, 1.5, 4);
    const overpassRoofGeo = new THREE.BoxGeometry(TRACK_WIDTH * 2.9, 0.5, 3.5);
    const overpassMat = new THREE.MeshStandardMaterial({ color: '#111', metalness: 0.9, roughness: 0.4 });
    const opLegGeo = new THREE.BoxGeometry(1.5, 12, 4);
    const opLedGeo = new THREE.BoxGeometry(TRACK_WIDTH * 2.85, 0.2, 4.1);
    const opLedMat = new THREE.MeshStandardMaterial({ color: '#0088ff', emissive: '#0088ff', emissiveIntensity: 2 });
    applyCurvedWorld(overpassMat);
    applyCurvedWorld(opLedMat);

    // Light pools under overpass
    const poolGeo = new THREE.PlaneGeometry(TRACK_WIDTH * 2, 8);
    const poolMat = new THREE.MeshBasicMaterial({ color: '#0088ff', transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
    poolGeo.rotateX(-Math.PI / 2);
    applyCurvedWorld(poolMat);

    for (let i = 0; i < 6; i++) {
      const group = new THREE.Group() as any;
      const opZ = (i * 160) - 800;

      const bridge = new THREE.Mesh(overpassGeo, overpassMat);
      bridge.position.y = 8;
      const roof = new THREE.Mesh(overpassRoofGeo, overpassMat);
      roof.position.y = 9;
      
      const legL = new THREE.Mesh(opLegGeo, overpassMat);
      legL.position.set(-TRACK_WIDTH - 0.5, 4, 0);
      const legR = new THREE.Mesh(opLegGeo, overpassMat);
      legR.position.set(TRACK_WIDTH + 0.5, 4, 0);
      const led = new THREE.Mesh(opLedGeo, opLedMat);
      led.position.y = 8;

      group.add(bridge);
      group.add(roof);
      group.add(legL);
      group.add(legR);
      group.add(led);

      const pool = new THREE.Mesh(poolGeo, poolMat);
      pool.position.y = 0.02;
      group.add(pool);

      group.position.set(0, 0, opZ);
      curbsRef.current.push(group);
      if (envGroup.current) envGroup.current.add(group);
    }

    // 6. Obstacles (Energy Crates)
    const obsGeo = new THREE.BoxGeometry(3.5, 2.5, 1.5, 2, 2, 2);
    const obsMat = new THREE.MeshStandardMaterial({ color: '#111', metalness: 0.8, roughness: 0.3 });
    const xMat = new THREE.MeshBasicMaterial({ color: '#ff0000' });
    applyCurvedWorld(obsMat);
    applyCurvedWorld(xMat);

    const createObstacle = (laneX: number, zPos: number) => {
      const group = new THREE.Group() as any;
      const crate = new THREE.Mesh(obsGeo, obsMat);
      crate.position.y = 1.25;
      group.add(crate);

      const plane1 = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.3), xMat);
      plane1.rotation.z = Math.PI / 4;
      plane1.position.set(0, 1.25, 0.76);
      group.add(plane1);
      
      const plane2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.3), xMat);
      plane2.rotation.z = -Math.PI / 4;
      plane2.position.set(0, 1.25, 0.76);
      group.add(plane2);

      group.position.set(laneX, 0, zPos);
      return group;
    };

    for (let i = 0; i < 5; i++) {
      const rand = Math.random();
      const laneX = rand < 0.33 ? -4.5 : (rand < 0.66 ? 0 : 4.5);
      const obs = createObstacle(laneX, -200 - (i * 250));
      obstaclesRef.current.push(obs);
      if (envGroup.current) envGroup.current.add(obs);
    }

    // 7. Cityscape Background (Districts)
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    buildingGeo.translate(0, 0.5, 0); // Bottom center pivot
    
    const buildingMat = new THREE.MeshStandardMaterial({ 
      color: '#010103', // Pitch black silhouette
      roughness: 0.9,
      metalness: 0.1,
    }); 
    const indMat = new THREE.MeshBasicMaterial({ color: '#ff1111' }); // Red beacon
    
    applyCurvedBuilding(buildingMat);
    applyCurvedWorld(indMat);

    const createComplexBuilding = (x: number, z: number, isCenter: boolean = false) => {
      const g = new THREE.Group() as any;
      g.position.set(x, 0, z);
      
      const h = (isCenter ? 150 : 80) + Math.random() * 250;
      const w = 15 + Math.random() * 30;
      const d = 15 + Math.random() * 30;

      // Main Block
      const b1 = new THREE.Mesh(buildingGeo, buildingMat);
      b1.scale.set(w, h * 0.7, d);
      g.add(b1);

      // Setback / Top section
      const b2 = new THREE.Mesh(buildingGeo, buildingMat);
      b2.position.y = h * 0.7;
      b2.scale.set(w * 0.6, h * 0.3, d * 0.6);
      g.add(b2);

      // Antenna or Beacon
      if (Math.random() > 0.4) {
        const beacon = new THREE.Mesh(buildingGeo, indMat);
        beacon.position.y = h;
        beacon.scale.set(w * 0.05, h * 0.02, w * 0.05);
        g.add(beacon);
      }

      if (envGroup.current) envGroup.current.add(g);
    };
    
    // Left District
    for (let i = 0; i < 100; i++) {
      createComplexBuilding(-30 - Math.random() * 80, -50 - Math.random() * 850);
    }

    // Right District
    for (let i = 0; i < 100; i++) {
      createComplexBuilding(30 + Math.random() * 80, -50 - Math.random() * 850);
    }

    // Center District (Distant Skyline)
    for (let i = 0; i < 80; i++) {
      createComplexBuilding((Math.random() - 0.5) * 300, -750 - Math.random() * 150, true);
    }

    return () => {
      railGeo.dispose(); railMat.dispose(); ledGeo.dispose(); ledMat.dispose();
      dashGeo.dispose(); dashMat.dispose(); jointGeo.dispose(); jointMat.dispose();
      overpassGeo.dispose(); overpassMat.dispose(); opLegGeo.dispose(); opLedGeo.dispose(); opLedMat.dispose();
      poolGeo.dispose(); poolMat.dispose();
      pillarGeo.dispose(); pillarMat.dispose();
      smokeGeo.dispose(); smokeMat.dispose();
      coinGeo.dispose(); coinMat.dispose();
      obsGeo.dispose(); obsMat.dispose(); xMat.dispose();
      buildingGeo.dispose(); buildingMat.dispose(); indMat.dispose();
    };
  }, []);

  const prevGameOverRef = useRef(false);

  useFrame((state, delta) => {
    // Detect Game Restart Event
    const currentGameOver = useTransitionStore.getState().isGameOver;
    if (!currentGameOver && prevGameOverRef.current) {
      // Game just restarted! Reset all obstacles and coins far away.
      obstaclesRef.current.forEach((obs, i) => {
        const rand = Math.random();
        const laneX = rand < 0.33 ? -4.5 : (rand < 0.66 ? 0 : 4.5);
        obs.position.set(laneX, 0, -200 - (i * 250));
        obs.children.forEach(c => (c as THREE.Mesh).scale.setScalar(1));
      });
      coinsRef.current.forEach((coin, i) => {
        const rand = Math.random();
        const laneX = rand < 0.33 ? -4.5 : (rand < 0.66 ? 0 : 4.5);
        coin.position.set(laneX, 1.2, -100 - (i * 80));
        coin.scale.setScalar(1);
        coin.visible = true;
        coin.userData.collected = false;
      });
    }
    prevGameOverRef.current = currentGameOver;

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

    // Gradual Speed Increase & Progression Logic
    const currentCoins = useTransitionStore.getState().coins;
    const isDevPaused = useTransitionStore.getState().isDevPaused;
    
    // Environmental Progression (0-100 clean, 100-300 dense fog, 300+ megacity)
    // We adjust speed slightly and fog density based on score
    const dynamicSpeed = Math.min(32 + (currentCoins * 0.8), 120); 
    const currentSpeed = dynamicSpeed * speedRamp * streakSpeedMultiplier;
    const moveZ = isDevPaused ? 0 : (currentSpeed * delta);

    // Removed fog adaptation to keep infinite visibility

    // Removed elementAlpha as it was unused

    // Dust particle wind effect removed

    // Animate Curbs (Guardrails)
    curbsRef.current.forEach((curb) => {
      curb.position.z += moveZ; // Scene moves to +Z
      if (curb.position.z > 20) curb.position.z -= 960; // 240 * 4 = 960 length
    });

    // Animate and Check Coins
    coinsRef.current.forEach((coin) => {
      coin.rotation.y += delta * 3; // Spin
      
      if (!coin.userData.collected) {
        coin.position.z += moveZ;
        coin.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 3 + coin.userData.startOffset) * 0.3; // Float

        // Collision Detection
        if (coin.position.z > -2.0 && coin.position.z < 2.0) {
          if (carWrapper.current) {
            const distX = Math.abs(coin.position.x - carWrapper.current.position.x);
            if (distX < 3.0) {
              incrementCoins();
              coin.userData.collected = true;
            }
          }
        }
      } else {
        // Collection Animation (Spin & Shrink)
        coin.position.z += moveZ * 0.5; // Slow down relative to world
        coin.position.y += delta * 2; // Float up
        coin.rotation.x += delta * 15; // Spin wildly
        if (coin.scale.x > 0) {
          const shrink = delta * 4;
          const newScale = Math.max(0, coin.scale.x - shrink);
          coin.scale.set(newScale, newScale, newScale);
          if (newScale === 0) {
            coin.visible = false;
          }
        }
      }

      // Recycle Coin
      if (coin.position.z > 20) {
        coin.position.z -= (400 + Math.random() * 200); // Send far ahead (-Z)
        const rand = Math.random();
        coin.position.x = rand < 0.33 ? -4.5 : (rand < 0.66 ? 0 : 4.5);
        coin.userData.collected = false;
        coin.scale.setScalar(1);
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
          if (distX < 2.5) {
            setGameOver();
          } else if (distX < 4.0 && !obs.userData.nearMissTriggered) {
            // Near Miss feedback
            obs.userData.nearMissTriggered = true;
            obs.scale.setScalar(1.2); // Pulse
            const glowMat = (obs.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial;
            if (glowMat) glowMat.color.setHex(0xffffff); // Flash white
          }
        }
      }

      // Recover near miss pulse
      if (obs.userData.nearMissTriggered) {
        obs.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        const glowMat = (obs.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (glowMat) glowMat.color.lerp(new THREE.Color(0xff0000), 0.1); // Back to red
      }

      // Recycle Obstacle
      if (obs.position.z > 20) {
        const currentCoins = useTransitionStore.getState().coins;
        const baseRecycleDist = Math.max(200, 800 - (currentCoins * 30));
        
        let furthestZ = 0;
        obstaclesRef.current.forEach((o) => {
          if (o !== obs && o.position.z < furthestZ) furthestZ = o.position.z;
        });
        
        obs.position.z = furthestZ - (baseRecycleDist + Math.random() * 200);
        const rand = Math.random();
        obs.position.x = rand < 0.33 ? -4.5 : (rand < 0.66 ? 0 : 4.5);
        obs.userData.nearMissTriggered = false;
        obs.scale.setScalar(1);
      }
    });

    // Only apply interactive steering and camera if the intro sequence is finished
    if (!isIntroSequenceRunning.current && hasStartedGame) {
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
          // Determine active pointer
          let activePointerX = pointer.x;

          if (useTransitionStore.getState().controlMode === 'keyboard') {
            const targetVirtual = (rightPressed.current ? 1 : 0) - (leftPressed.current ? 1 : 0);
            virtualPointer.current = THREE.MathUtils.lerp(virtualPointer.current, targetVirtual, 0.1);
            activePointerX = virtualPointer.current;
          }

          // Steering physics: Nose turns first, body follows
          const targetRotY = activePointerX * -0.45;
          const targetPosX = activePointerX * 4.5;
          const steeringLerp = 0.35;
          const movementLerp = 0.25;
          const currentScale = useTransitionStore.getState().customScale;
          const currentTilt = useTransitionStore.getState().customTilt;

          carWrapper.current.rotation.y = THREE.MathUtils.lerp(carWrapper.current.rotation.y, targetRotY, steeringLerp);
          carWrapper.current.rotation.x = currentTilt;
          carWrapper.current.rotation.z = 0;

          carWrapper.current.position.x = THREE.MathUtils.lerp(carWrapper.current.position.x, targetPosX, movementLerp);
          // Suspension/Engine Vibration
          const engineVibration = Math.sin(state.clock.elapsedTime * 80) * 0.015;
          carWrapper.current.position.y = THREE.MathUtils.lerp(carWrapper.current.position.y, engineVibration, movementLerp);
          
          carWrapper.current.scale.set(currentScale, currentScale, currentScale);

          // Road Banking
          if (envGroup.current) {
            const targetBank = activePointerX * 0.12; // ~6.8 degrees
            envGroup.current.rotation.z = THREE.MathUtils.lerp(envGroup.current.rotation.z, targetBank, 0.1);
          }
        }
      }

      // Camera Lag & Dynamics
      const baseCameraY = 2.1;
      
      let activeCamPointerX = pointer.x;
      let activeCamPointerY = pointer.y;
      if (useTransitionStore.getState().controlMode === 'keyboard') {
        activeCamPointerX = virtualPointer.current;
        activeCamPointerY = 0;
      }

      const targetCameraX = activeCamPointerX * -1.5;
      const targetCameraY = baseCameraY + activeCamPointerY * 0.6;
      
      // Speed Shake
      const speedShakeX = Math.sin(state.clock.elapsedTime * 60) * 0.002 * (speedRamp + 0.1);
      const speedShakeY = Math.cos(state.clock.elapsedTime * 65) * 0.002 * (speedRamp + 0.1);

      // Camera Lag: 0.05s delay lerp
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCameraX + speedShakeX, 0.08);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCameraY + speedShakeY, 0.08);
      
      // Dynamic FOV
      const targetFOV = 55 + (speedRamp * 10);
      const pCamera = camera as THREE.PerspectiveCamera;
      if (pCamera.fov !== undefined) {
        pCamera.fov = THREE.MathUtils.lerp(pCamera.fov, targetFOV, 0.05);
        pCamera.updateProjectionMatrix();
      }

      // Drop camera slightly closer for larger car presence (3.8 instead of 4.5)
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 3.8, 0.02);

      // Mouse Lean (Roll)
      const targetCameraRoll = activeCamPointerX * -0.052; // ~3 degrees
      camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, targetCameraRoll, 0.1);

      const lookTargetY = 0.0 - (activeCamPointerY * 0.2);
      const lookTarget = new THREE.Vector3(0, lookTargetY, -10);
      camera.lookAt(lookTarget);
    }
  });

  return (
    <>
      <color attach="background" args={['#010205']} />
      <fog attach="fog" args={['#010205', 200, 800]} />
      
      {/* Pushed stars far back so they render behind the massive skyscrapers */}
      <Stars radius={400} depth={200} count={3000} factor={10} saturation={0} fade speed={1} />

      {/* RIM LIGHTING & ATMOSPHERE */}
      <spotLight ref={sweepLightRef} angle={0.2} penumbra={0.5} distance={10} color="#ffffff" />
      <spotLight ref={spotLightRef} position={[0, 5, 5]} angle={0.6} penumbra={0.8} distance={25} color="#ffffff" />
      <directionalLight ref={sunlightRef} position={[0, 5, -20]} intensity={0} color="#ffffff" />
      
      {/* Hero Reveal Lights (Used in intro timeline and dashboard) */}
      <directionalLight ref={dirLight1} position={[5, 5, 5]} />
      <directionalLight ref={dirLight2} position={[-5, 5, 5]} />

      {/* Cyberpunk F1 Rim Lights - Widened to prevent tire blobs */}
      <pointLight position={[-12, 3, -2]} color="#0088ff" intensity={3} distance={25} />
      <pointLight position={[12, 3, -2]} color="#ff0044" intensity={3} distance={25} />
      <pointLight position={[0, 2, 8]} color="#ffffff" intensity={1} distance={15} />

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

      <group ref={envGroup}>
        {/* Ground Reflection - Carbon Fiber Wet Asphalt via MeshPhysicalMaterial */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={!hasStartedGame ? [0, -0.20, 0] : [0, 0, 0]}
        >
          <boxGeometry args={[40, 400, 1, 1, 100, 1]} />
          <meshPhysicalMaterial
            color="#121212"
            roughness={0.28}
            metalness={0.12}
            clearcoat={0.9}
            clearcoatRoughness={0.15}
            envMapIntensity={1.2}
            bumpMap={noiseTex}
            bumpScale={0.01}
            roughnessMap={noiseTex}
            onBeforeCompile={(shader) => {
              injectCurvedWorld(shader);
            }}
          />
        </mesh>
      </group>

      <Environment preset="studio" environmentIntensity={!hasStartedGame ? 0.8 : 0.1} />

      <PerformanceMonitor onDecline={() => setEnablePostProcessing(false)} />

      {/* Cinematic Velocity Post-Processing */}
      {enablePostProcessing && (
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={0.95}
            luminanceSmoothing={0.1}
            height={300}
            intensity={0.8}
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new THREE.Vector2(0.0008 * streakSpeedMultiplier, 0.0008 * streakSpeedMultiplier)}
            radialModulation={true}
            modulationOffset={0.5}
          />
          <Vignette eskil={false} offset={0.5} darkness={0.9} />
        </EffectComposer>
      )}
    </>
  );
}
