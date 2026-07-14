import * as THREE from 'three';

export interface CurvedWorldOptions {
  curveStrength?: number;
  flatDistance?: number;
}

export const injectCurvedWorld = (
  shader: any,
  options: CurvedWorldOptions = {}
) => {
  const { curveStrength = 0.00015, flatDistance = 60.0 } = options;
  
  // Inject uniforms
  shader.uniforms.uCurveStrength = { value: curveStrength };
  shader.uniforms.uFlatDistance = { value: flatDistance };

  // Inject vertex shader variables
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `
    #include <common>
    uniform float uCurveStrength;
    uniform float uFlatDistance;
    `
  );

  // Inject curve logic after modelViewMatrix is applied
  shader.vertexShader = shader.vertexShader.replace(
    '#include <project_vertex>',
    `
    vec4 mvPosition = vec4( transformed, 1.0 );
    #ifdef USE_INSTANCING
      mvPosition = instanceMatrix * mvPosition;
    #endif
    mvPosition = modelViewMatrix * mvPosition;

    // Calculate distance beyond the flat zone
    float dist = max(0.0, -mvPosition.z - uFlatDistance);
    
    // Bend upwards (Y-axis) based on distance squared
    mvPosition.y += (dist * dist) * uCurveStrength;

    gl_Position = projectionMatrix * mvPosition;
    `
  );
};

export const applyCurvedWorld = (
  material: THREE.Material,
  options: CurvedWorldOptions = {}
) => {
  const originalOnBeforeCompile = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    if (originalOnBeforeCompile) {
      originalOnBeforeCompile(shader, renderer);
    }
    injectCurvedWorld(shader, options);
  };
};
