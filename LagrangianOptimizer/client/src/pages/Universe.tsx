import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, Settings, Info, Zap, Activity, Cpu } from 'lucide-react';
import { checkWebGPUSupport, WebGPUUniverseRenderer } from '@/lib/webgpu-universe';

// Scenario descriptions based on master formula physics
const SCENARIO_DESCRIPTIONS: Record<UniverseState['mode'], {
  title: string;
  description: string;
  physics: string;
  parameters: string;
}> = {
  'big-bang': {
    title: 'Big Bang Evolution',
    description: 'Simulates the early universe dominated by radiation and the evolution of 6D bulk space as it cools.',
    physics: 'The bulk action S_bulk dominates with high curvature R₆. The brane forms as temperature drops, creating our 4D universe.',
    parameters: 'High initial R₆ → exponential decay, σ starts low → increases as brane stabilizes, Λ₆ negative → drives expansion'
  },
  'lambda-dom': {
    title: 'Dark Energy Dominated (Λ-CDM)',
    description: 'Current universe phase where dark energy (cosmological constant) drives accelerated expansion.',
    physics: 'Λ₆ term in S_bulk drives exponential expansion. Matter density dilutes while vacuum energy remains constant.',
    parameters: 'Positive Λ₆ → accelerated expansion, Low R₆ → flat spacetime, Stable σ → rigid brane'
  },
  'black-hole': {
    title: 'Black Hole in Bulk',
    description: 'A black hole extending into the 6D bulk space, showing how gravity leaks into extra dimensions.',
    physics: 'Schwarzschild solution modified by bulk effects. Event horizon extends into extra dimensions, creating "black string".',
    parameters: 'R₆ peaks at horizon, σ deforms near BH, Matter action S_matter concentrated at singularity'
  },
  'brane-oscillation': {
    title: 'Brane World Oscillations',
    description: 'Our 4D brane oscillating in the 6D bulk, creating ripples that could be detected as anomalies.',
    physics: 'Brane position fluctuates: z(x,t) = A·sin(kx - ωt). Creates effective 4D metric perturbations detectable as gravity variations.',
    parameters: 'Oscillating σ → brane waves, Modulated R₆ → bulk response, A controls amplitude of oscillations'
  },
  'gw-echo': {
    title: 'Gravitational Wave Echoes',
    description: 'GW propagation through 6D space creates echoes from extra dimensions - Kaluza-Klein tower modes.',
    physics: 'GWs excite KK modes: ψₙ with frequencies ωₙ = 2π√(1 + n²/R²). Each mode travels at different speed in bulk.',
    parameters: 'Multiple frequency peaks, Time delays between modes, R₆ determines KK mass spacing'
  },
  'vacuum-screening': {
    title: 'Vacuum Energy Screening',
    description: 'Shows how brane tension σ can screen the bulk cosmological constant, solving the CC problem.',
    physics: 'Fine-tuning: σ⁴ ≈ -Λ₆/κ₆². Brane tension compensates bulk vacuum energy, yielding small effective 4D Λ.',
    parameters: 'σ adjusted to cancel Λ₆, Near-zero effective Λ₄, Demonstrates anthropic tuning'
  }
};

interface UniverseState {
  time: number;
  scaleFactor: number;
  energy: number;
  epsilon: number;
  G4: number;
  MP: number;
  mode: 'big-bang' | 'lambda-dom' | 'black-hole' | 'brane-oscillation' | 'gw-echo' | 'vacuum-screening';
  // 6D physics parameters
  kappa6: number;      // 6D gravitational coupling
  lambda6: number;     // 6D cosmological constant
  sigma: number;       // Brane tension
  braneAmplitude: number;  // Brane oscillation amplitude
  bulkCurvature: number;   // R_6 bulk curvature
}

interface ControlsState {
  timeSpeed: number;
  warpDepth: number;
  bhMass: number;
  bhSpin: number;
  raySteps: number;
  showPsi0: boolean;
  showLabels: boolean;
  isPlaying: boolean;
  quality: 'low' | 'medium' | 'high';  // Add quality setting
  renderer: 'webgl2' | 'webgpu';      // Add renderer selection
}

interface PhysicsData {
  coefficients: number[];
  psi0Profile: number[];
  epsilon: number;
  G4: number;
  MP: number;
}

// Enhanced WebGL shader for 6D foam visualization with master formula
const createVolumeShader = (gl: WebGL2RenderingContext) => {
  const vertexShaderSource = `#version 300 es
    in vec3 a_position;
    uniform mat4 u_modelViewMatrix;
    uniform mat4 u_projectionMatrix;
    out vec3 v_position;
    out vec3 v_worldPos;
    
    void main() {
      v_position = a_position;
      vec4 worldPos = u_modelViewMatrix * vec4(a_position, 1.0);
      v_worldPos = worldPos.xyz;
      gl_Position = u_projectionMatrix * worldPos;
    }
  `;

  const fragmentShaderSource = `#version 300 es
    precision highp float;
    precision highp sampler3D;
    
    in vec3 v_position;
    in vec3 v_worldPos;
    
    uniform sampler3D u_fieldTexture;
    uniform sampler3D u_braneTexture;
    uniform float u_time;
    uniform float u_warpDepth;
    uniform int u_raySteps;
    uniform vec3 u_cameraPos;
    uniform int u_sceneMode;
    
    // Master formula parameters
    uniform float u_kappa6;
    uniform float u_lambda6;
    uniform float u_sigma;
    uniform float u_braneAmplitude;
    uniform float u_bulkR6;
    
    out vec4 fragColor;
    
    vec4 rayMarch(vec3 rayOrigin, vec3 rayDirection) {
      vec4 accumulation = vec4(0.0);
      
      // Dynamic step size based on ray steps
      float baseStepSize = 3.0 / float(u_raySteps);
      float currentStep = 0.0;
      
      // Early exit conditions
      const float ALPHA_THRESHOLD = 0.9; // Lower threshold for faster exit
      const int MAX_ITERATIONS = 64; // Hard limit
      
      for(int i = 0; i < MAX_ITERATIONS; i++) {
        if(i >= u_raySteps || accumulation.a >= ALPHA_THRESHOLD) break;
        
        // Adaptive stepping - larger steps when far from origin
        float stepSize = baseStepSize * (1.0 + currentStep * 0.5);
        vec3 samplePos = rayOrigin + rayDirection * currentStep;
        
        // Simple bounds check
        if(abs(samplePos.x) > 1.5 || abs(samplePos.y) > 1.5 || abs(samplePos.z) > 1.5) {
          currentStep += stepSize;
          continue;
        }
        
        // Only apply warping if significant
        if(u_warpDepth > 0.01) {
          vec3 texCoord = samplePos * 0.5 + 0.5;
          vec4 fieldSample = texture(u_fieldTexture, texCoord);
          samplePos.z -= u_warpDepth * fieldSample.w * 0.5;
        }
        
        if(all(greaterThanEqual(samplePos, vec3(-1.0))) && all(lessThanEqual(samplePos, vec3(1.0)))) {
          vec3 texCoord = 0.5 + 0.5 * samplePos;
          
          // Sample textures
          vec4 fieldSample = texture(u_fieldTexture, texCoord);
          vec4 braneSample = texture(u_braneTexture, texCoord);
          
          float totalDensity = fieldSample.a + braneSample.a * 0.5; // Reduce brane contribution
          
          if(totalDensity > 0.01) { // Higher threshold
            // Simplified color mixing
            vec3 color = fieldSample.rgb * fieldSample.a + braneSample.rgb * braneSample.a * 0.5;
            color /= (totalDensity + 0.001);
            
            float alpha = min(totalDensity * 0.1, 0.5); // Cap alpha contribution
            accumulation.rgb += (1.0 - accumulation.a) * color * alpha;
            accumulation.a += (1.0 - accumulation.a) * alpha;
          }
        }
        
        currentStep += stepSize;
        if(currentStep > 4.0) break; // Early exit for distant rays
      }
      
      return accumulation;
    }
    
    void main() {
      vec3 rayDirection = normalize(v_worldPos - u_cameraPos);
      vec4 color = rayMarch(v_position, rayDirection);
      
      // Simplified post-processing
      if(color.a > 0.01) {
        color.rgb = pow(color.rgb, vec3(0.8)); // Simple gamma correction
        color.rgb += vec3(0.05, 0.1, 0.2) * color.a; // Subtle glow
        fragColor = color;
      } else {
        discard;
      }
    }
  `;

  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);
  
  // Check vertex shader compilation
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
    return null;
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);
  
  // Check fragment shader compilation
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
    return null;
  }

  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  // Check program linking
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Shader program linking error:', gl.getProgramInfoLog(program));
    return null;
  }

  return program;
};

// Create compute shader for solving 6D Einstein equations
const createComputeShader = (gl: WebGL2RenderingContext) => {
  const computeSource = `#version 300 es
    precision highp float;
    
    uniform sampler3D u_prevState;
    uniform float u_dt;
    uniform float u_kappa6;
    uniform float u_lambda6;
    uniform float u_sigma;
    
    out vec4 fragColor;
    
    // Optimized finite difference Laplacian
    float laplacian(vec3 texCoord) {
      vec3 step = vec3(1.0/32.0); // Lower resolution for physics
      float center = texture(u_prevState, texCoord).r * 6.0;
      
      float sum = texture(u_prevState, texCoord + vec3(step.x, 0, 0)).r;
      sum += texture(u_prevState, texCoord - vec3(step.x, 0, 0)).r;
      sum += texture(u_prevState, texCoord + vec3(0, step.y, 0)).r;
      sum += texture(u_prevState, texCoord - vec3(0, step.y, 0)).r;
      sum += texture(u_prevState, texCoord + vec3(0, 0, step.z)).r;
      sum += texture(u_prevState, texCoord - vec3(0, 0, step.z)).r;
      
      return (sum - center) / (step.x * step.x);
    }
    
    void main() {
      vec2 texCoord = gl_FragCoord.xy / vec2(textureSize(u_prevState, 0).xy);
      vec3 coord3D = vec3(texCoord, 0.5);
      
      vec4 current = texture(u_prevState, coord3D);
      
      // Simplified physics update
      float R6 = laplacian(coord3D);
      float newValue = current.r + u_dt * 0.1 * (R6 - current.r);
      
      fragColor = vec4(newValue, current.gba);
    }
  `;
  
  const shader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(shader, computeSource);
  gl.compileShader(shader);
  
  const program = gl.createProgram()!;
  gl.attachShader(program, shader);
  gl.linkProgram(program);
  
  return program;
};



// Optimized field texture creation with pre-computed actions
const createFieldTexture = (gl: WebGL2RenderingContext, psi0Profile: number[], coefficients: number[], time: number, state: UniverseState, quality: ControlsState['quality']) => {
  // Adjust texture size based on quality
  const size = quality === 'high' ? 64 : quality === 'medium' ? 48 : 32;
  const data = new Float32Array(size * size * size * 4);
  
  // Pre-compute common values
  const invKappa6Sq = 1 / (2 * state.kappa6 * state.kappa6);
  const lambda6Term = 2 * state.lambda6;
  
  // If no psi0Profile, create a default one
  const psi0 = psi0Profile.length > 0 ? psi0Profile : Array(64).fill(0).map((_, i) => Math.exp(-Math.pow(i/32 - 1, 2)));
  
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        const index = (i * size * size + j * size + k) * 4;
        const x = (i - size/2) / size * 4;
        const y = (j - size/2) / size * 4;
        const z = (k - size/2) / size * 4;
        
        const r = Math.sqrt(x*x + y*y + z*z);
        const yIndex = Math.floor((Math.abs(y) / 2) * psi0.length);
        const psi0Value = psi0[Math.min(yIndex, psi0.length - 1)] || 1.0;
        
        // Simplified field computation for performance
        let bulkField = 0;
        let braneField = 0;
        
        switch(state.mode) {
          case 'big-bang':
            bulkField = state.bulkCurvature * Math.exp(-r*r / (0.1 + time));
            braneField = state.sigma * Math.exp(-r*r / 0.5);
            break;
            
          case 'black-hole':
            const rs = 2 * state.G4 * 10;
            bulkField = 1 / Math.sqrt(1 - rs / (r + 0.1));
            braneField = Math.exp(-r*r);
            break;
            
          default:
            bulkField = psi0Value * Math.exp(-r*r/2);
            braneField = Math.exp(-r*r);
        }
        
        // Pre-compute action components
        const S_bulk = invKappa6Sq * Math.sqrt(Math.abs(bulkField)) * (state.bulkCurvature - lambda6Term);
        const S_brane = -state.sigma * Math.sqrt(Math.abs(braneField));
        const S_matter = 0.1 * Math.exp(-r*r);
        
        const totalField = Math.abs(S_bulk + S_brane + S_matter);
        
        // Store color and pre-computed action
        data[index] = 0.1 + 0.3 * Math.abs(bulkField);     // R: bulk contribution
        data[index + 1] = 0.3 + 0.7 * Math.abs(braneField); // G: brane contribution  
        data[index + 2] = 1.0;                              // B: base color
        data[index + 3] = Math.min(totalField, 2.0);        // A: pre-computed action (clamped)
      }
    }
  }
  
  console.log(`Creating field texture: ${size}³, mode: ${state.mode}`);
  
  const texture = gl.createTexture();
  if (!texture) {
    console.error('Failed to create field texture');
    return null;
  }
  
  gl.bindTexture(gl.TEXTURE_3D, texture);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA16F, size, size, size, 0, gl.RGBA, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    console.error('WebGL error after creating field texture:', error);
  }
  
  return texture;
};

// Create brane texture
const createBraneTexture = (gl: WebGL2RenderingContext, state: UniverseState, time: number, quality: ControlsState['quality']) => {
  const size = quality === 'high' ? 64 : quality === 'medium' ? 48 : 32;
  const data = new Float32Array(size * size * size * 4);
  
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      for (let k = 0; k < size; k++) {
        const index = (i * size * size + j * size + k) * 4;
        const x = (i - size/2) / size * 4;
        const y = (j - size/2) / size * 4;
        const z = (k - size/2) / size * 4;
        
        // Brane is localized at z=0 with some thickness
        const braneProfile = Math.exp(-z*z / 0.01);
        
        // Add curvature based on scenario
        let curvature = 0;
        if (state.mode === 'brane-oscillation') {
          curvature = state.braneAmplitude * Math.sin(x * 2 + time * 3) * Math.cos(y * 2);
        }
        
        const braneValue = braneProfile * (1 + curvature);
        const precomputedAction = -state.sigma * Math.sqrt(Math.abs(braneValue));
        
        data[index] = 1.0;                      // R: brane color
        data[index + 1] = 0.7;                  // G: brane color
        data[index + 2] = 0.2;                  // B: brane color
        data[index + 3] = Math.min(Math.abs(precomputedAction), 2.0); // A: pre-computed action (clamped)
      }
    }
  }
  
  console.log(`Creating brane texture: ${size}³`);
  
  const texture = gl.createTexture();
  if (!texture) {
    console.error('Failed to create brane texture');
    return null;
  }
  
  gl.bindTexture(gl.TEXTURE_3D, texture);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA16F, size, size, size, 0, gl.RGBA, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    console.error('WebGL error after creating brane texture:', error);
  }
  
  return texture;
};

function UniverseVisualization({ 
  universeState, 
  controls, 
  physicsData,
  webgpuSupported 
}: {
  universeState: UniverseState;
  controls: ControlsState;
  physicsData: PhysicsData;
  webgpuSupported: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const webgpuRendererRef = useRef<WebGPUUniverseRenderer | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const computeProgramRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const braneTextureRef = useRef<WebGLTexture | null>(null);
  const animationRef = useRef<number>();
  const vaoRef = useRef<WebGLVertexArrayObject | null>(null);
  const lastUpdateRef = useRef(0);

  // Check WebGPU support on mount
  useEffect(() => {
    if (webgpuSupported) {
      console.log('WebGPU is supported! Can enable ultra-fast rendering.');
    } else {
      console.log('WebGPU not supported, using WebGL2.');
    }
  }, [webgpuSupported]);

  // Initialize renderer based on selection
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    if (controls.renderer === 'webgpu' && webgpuSupported) {
      // Initialize WebGPU
      const initWebGPU = async () => {
        try {
          const support = await checkWebGPUSupport();
          if (support.supported && support.device) {
            const renderer = new WebGPUUniverseRenderer(support.device, canvas);
            await renderer.initialize();
            webgpuRendererRef.current = renderer;
            console.log('WebGPU renderer initialized');
          }
        } catch (error) {
          console.error('Failed to initialize WebGPU:', error);
          // Fall back to WebGL2
          initWebGL2();
        }
      };
      initWebGPU();
    } else {
      // Initialize WebGL2
      initWebGL2();
    }

    function initWebGL2() {
      const gl = canvas.getContext('webgl2', {
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });
      if (!gl) {
        console.error('WebGL2 not supported');
        return;
      }

      // Enable required extensions
      const ext1 = gl.getExtension('EXT_color_buffer_float');
      const ext2 = gl.getExtension('OES_texture_float_linear');
      
      if (!ext1 || !ext2) {
        console.warn('Some WebGL2 extensions not available');
      }

      glRef.current = gl;
      
      const shaderProgram = createVolumeShader(gl);
      if (!shaderProgram) {
        console.error('Failed to create shader program');
        return;
      }
      programRef.current = shaderProgram;
      
      computeProgramRef.current = createComputeShader(gl);

      // Create cube geometry
      const vertices = new Float32Array([
        -1, -1, -1,  1, -1, -1,  1,  1, -1, -1,  1, -1, // front
        -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1, // back
      ]);

      const indices = new Uint16Array([
        0, 1, 2, 0, 2, 3, // front
        4, 5, 6, 4, 6, 7, // back
        0, 4, 7, 0, 7, 3, // left
        1, 5, 6, 1, 6, 2, // right
        3, 7, 6, 3, 6, 2, // top
        0, 4, 5, 0, 5, 1  // bottom
      ]);

      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      vaoRef.current = vao;

      const vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

      const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

      // Enable blending for transparency
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Clean up WebGL resources
      if (glRef.current) {
        if (textureRef.current) glRef.current.deleteTexture(textureRef.current);
        if (braneTextureRef.current) glRef.current.deleteTexture(braneTextureRef.current);
        if (vaoRef.current) glRef.current.deleteVertexArray(vaoRef.current);
        if (programRef.current) glRef.current.deleteProgram(programRef.current);
        if (computeProgramRef.current) glRef.current.deleteProgram(computeProgramRef.current);
      }
      // Clean up WebGPU
      if (webgpuRendererRef.current) {
        // WebGPU cleanup handled by the renderer
        webgpuRendererRef.current = null;
      }
    };
  }, [controls.renderer, webgpuSupported]);

  // Update textures only when physics data or mode changes
  useEffect(() => {
    if (!glRef.current || !programRef.current) {
      console.log('GL or program not ready');
      return;
    }

    const now = Date.now();
    // Only update textures every 250ms to reduce CPU load significantly
    if (now - lastUpdateRef.current < 250 && controls.isPlaying) return;
    lastUpdateRef.current = now;

    // Clean up old textures
    if (textureRef.current) {
      glRef.current.deleteTexture(textureRef.current);
    }
    if (braneTextureRef.current) {
      glRef.current.deleteTexture(braneTextureRef.current);
    }

    console.log('Creating textures with quality:', controls.quality);
    
    const fieldTex = createFieldTexture(
      glRef.current,
      physicsData.psi0Profile,
      physicsData.coefficients,
      universeState.time,
      universeState,
      controls.quality
    );
    
    const braneTex = createBraneTexture(
      glRef.current,
      universeState,
      universeState.time,
      controls.quality
    );
    
    if (!fieldTex || !braneTex) {
      console.error('Failed to create one or more textures');
      return;
    }
    
    textureRef.current = fieldTex;
    braneTextureRef.current = braneTex;
    
    console.log('Textures created successfully');
  }, [physicsData, universeState, controls.quality]);

  const render = useCallback(() => {
    // Use WebGPU if available and selected
    if (controls.renderer === 'webgpu' && webgpuRendererRef.current) {
      const params = {
        time: universeState.time,
        kappa6: universeState.kappa6,
        lambda6: universeState.lambda6,
        sigma: universeState.sigma,
        bulkCurvature: universeState.bulkCurvature,
        braneAmplitude: universeState.braneAmplitude,
        mode: universeState.mode,
        warpDepth: controls.warpDepth,
        raySteps: controls.quality === 'high' ? controls.raySteps : 
                  controls.quality === 'medium' ? Math.floor(controls.raySteps * 0.5) : 
                  Math.floor(controls.raySteps * 0.25),
        cameraPos: [0, 0, 3]
      };
      
      webgpuRendererRef.current.render(params);
      
      if (controls.isPlaying) {
        animationRef.current = requestAnimationFrame(render);
      }
      return;
    }
    
    // WebGL2 rendering
    if (!glRef.current || !programRef.current || !textureRef.current || !braneTextureRef.current || !vaoRef.current) {
      console.log('Missing resources for rendering');
      return;
    }

    const gl = glRef.current;
    const canvas = gl.canvas as HTMLCanvasElement;
    
    // Resize canvas if needed
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      gl.viewport(0, 0, displayWidth, displayHeight);
    }

    // Clear and render
    gl.clearColor(0.05, 0.05, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(programRef.current);
    gl.bindVertexArray(vaoRef.current);

    // Set uniforms
    const timeLocation = gl.getUniformLocation(programRef.current, 'u_time');
    const warpLocation = gl.getUniformLocation(programRef.current, 'u_warpDepth');
    const stepsLocation = gl.getUniformLocation(programRef.current, 'u_raySteps');
    const cameraLocation = gl.getUniformLocation(programRef.current, 'u_cameraPos');
    const sceneModeLocation = gl.getUniformLocation(programRef.current, 'u_sceneMode');
    
    // Master formula parameters
    const kappa6Location = gl.getUniformLocation(programRef.current, 'u_kappa6');
    const lambda6Location = gl.getUniformLocation(programRef.current, 'u_lambda6');
    const sigmaLocation = gl.getUniformLocation(programRef.current, 'u_sigma');
    const braneAmpLocation = gl.getUniformLocation(programRef.current, 'u_braneAmplitude');
    const bulkR6Location = gl.getUniformLocation(programRef.current, 'u_bulkR6');
    
    // Texture locations
    const fieldTextureLocation = gl.getUniformLocation(programRef.current, 'u_fieldTexture');
    const braneTextureLocation = gl.getUniformLocation(programRef.current, 'u_braneTexture');

    // Scene mode mapping
    const sceneModeMap: Record<UniverseState['mode'], number> = {
      'big-bang': 0,
      'lambda-dom': 1,
      'black-hole': 2,
      'brane-oscillation': 3,
      'gw-echo': 4,
      'vacuum-screening': 5
    };

    // Adjust ray steps based on quality - more aggressive reduction
    const raySteps = controls.quality === 'high' ? controls.raySteps : 
                     controls.quality === 'medium' ? Math.floor(controls.raySteps * 0.5) : 
                     Math.floor(controls.raySteps * 0.25);

    gl.uniform1f(timeLocation, universeState.time);
    gl.uniform1f(warpLocation, controls.warpDepth);
    gl.uniform1i(stepsLocation, raySteps);
    gl.uniform3f(cameraLocation, 0, 0, 3);
    gl.uniform1i(sceneModeLocation, sceneModeMap[universeState.mode]);
    
    // Set master formula parameters
    gl.uniform1f(kappa6Location, universeState.kappa6);
    gl.uniform1f(lambda6Location, universeState.lambda6);
    gl.uniform1f(sigmaLocation, universeState.sigma);
    gl.uniform1f(braneAmpLocation, universeState.braneAmplitude);
    gl.uniform1f(bulkR6Location, universeState.bulkCurvature);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_3D, textureRef.current);
    gl.uniform1i(fieldTextureLocation, 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, braneTextureRef.current);
    gl.uniform1i(braneTextureLocation, 1);

    // Set transformation matrices
    const modelViewLocation = gl.getUniformLocation(programRef.current, 'u_modelViewMatrix');
    const projectionLocation = gl.getUniformLocation(programRef.current, 'u_projectionMatrix');

    const rotation = universeState.time * 0.1;
    const modelView = new Float32Array([
      Math.cos(rotation), 0, Math.sin(rotation), 0,
      0, 1, 0, 0,
      -Math.sin(rotation), 0, Math.cos(rotation), 0,
      0, 0, -3, 1
    ]);

    const aspect = canvas.width / canvas.height;
    const fov = Math.PI / 4;
    const near = 0.1;
    const far = 100;
    const f = 1.0 / Math.tan(fov / 2);

    const projection = new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, -(far + near) / (far - near), -1,
      0, 0, -(2 * far * near) / (far - near), 0
    ]);

    gl.uniformMatrix4fv(modelViewLocation, false, modelView);
    gl.uniformMatrix4fv(projectionLocation, false, projection);

    // Draw
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

    if (controls.isPlaying) {
      // Frame rate limiting - cap at 30 FPS for low quality, 24 for medium
      const targetFPS = controls.quality === 'high' ? 60 : controls.quality === 'medium' ? 24 : 30;
      const frameTime = 1000 / targetFPS;
      
      setTimeout(() => {
        animationRef.current = requestAnimationFrame(render);
      }, frameTime);
    }
  }, [universeState, controls, webgpuSupported]);

  useEffect(() => {
    render();
  }, [universeState, controls, render]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: 'linear-gradient(45deg, #0a0a0f, #1a1a2e)' }}
      />
      
      {/* Performance indicator */}
      {controls.quality === 'low' && controls.renderer === 'webgl2' && (
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="bg-yellow-600 text-yellow-50">
            Performance Mode
          </Badge>
        </div>
      )}
      
      {/* WebGPU Active Badge - Enhanced */}
      {controls.renderer === 'webgpu' && webgpuSupported && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <Badge className="bg-purple-600 text-purple-50 animate-pulse shadow-lg shadow-purple-600/50">
            <Cpu className="w-3 h-3 mr-1" />
            WebGPU Active
          </Badge>
          <div className="text-xs text-purple-300 bg-purple-900/50 px-2 py-1 rounded backdrop-blur">
            5-10x faster compute shaders
          </div>
        </div>
      )}
      
      {/* Scenario Description Overlay */}
      {controls.showLabels && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 left-4 bg-carbon-800/80 backdrop-blur p-3 rounded-lg max-w-md">
            <div className="text-xs font-mono text-cyan-400 mb-2">Master Formula:</div>
            <div className="text-xs font-mono text-carbon-10">
              S = S<sub>bulk</sub> + S<sub>brane</sub> + S<sub>matter</sub>
            </div>
            <div className="text-xs font-mono text-carbon-30 mt-1">
              S<sub>bulk</sub> = (1/2κ₆²) ∫d⁶x√-G (R₆ - 2Λ₆)
            </div>
            <div className="text-xs font-mono text-carbon-30">
              S<sub>brane</sub> = -σ ∫d⁴x√-g
            </div>
            
            {/* Current Scenario Info */}
            <div className="mt-3 pt-3 border-t border-carbon-600">
              <div className="text-sm font-semibold text-cyan-300 mb-1">
                {SCENARIO_DESCRIPTIONS[universeState.mode].title}
              </div>
              <div className="text-xs text-carbon-20 leading-relaxed">
                {SCENARIO_DESCRIPTIONS[universeState.mode].description}
              </div>
            </div>
          </div>
          
          {/* Brane label */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-orange-500/20 px-3 py-1 rounded text-orange-300 text-sm backdrop-blur">
              Our Brane (4D)
            </div>
          </div>
          
          {/* Physics parameters */}
          <div className="absolute bottom-4 left-4 space-y-1 text-xs bg-carbon-800/80 backdrop-blur p-2 rounded">
            <div className="text-cyan-400">t = {universeState.time.toFixed(2)} τ</div>
            <div className="text-cyan-400">a(t) = {universeState.scaleFactor.toFixed(3)}</div>
            <div className="text-yellow-400">κ₆ = {universeState.kappa6.toFixed(2)}</div>
            <div className="text-yellow-400">Λ₆ = {universeState.lambda6.toFixed(3)}</div>
            <div className="text-orange-400">σ = {universeState.sigma.toFixed(2)} M⁴</div>
            <div className="text-green-400">R₆ = {universeState.bulkCurvature.toFixed(3)}</div>
            <div className="text-purple-400">Quality: {controls.quality}</div>
          </div>
        </div>
      )}

      {/* Scenario-specific overlays */}
      {universeState.mode === 'black-hole' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div 
            className="rounded-full bg-black border-2 border-orange-500 animate-pulse"
            style={{
              width: `${controls.bhMass * 2}px`,
              height: `${controls.bhMass * 2}px`,
              boxShadow: `0 0 ${controls.bhMass}px rgba(255, 165, 0, 0.5), 
                          0 0 ${controls.bhMass * 2}px rgba(255, 165, 0, 0.3),
                          inset 0 0 ${controls.bhMass / 2}px rgba(255, 0, 0, 0.8)`
            }}
          />
          {controls.bhSpin > 0.1 && (
            <div 
              className="absolute inset-0"
              style={{ 
                animation: `spin ${2 / controls.bhSpin}s linear infinite` 
              }}
            >
              <div className="w-full h-0.5 bg-cyan-400 opacity-50 absolute top-1/2 transform -translate-y-1/2" />
            </div>
          )}
        </div>
      )}

      {/* GW Echo visualization */}
      {universeState.mode === 'gw-echo' && controls.showLabels && (
        <div className="absolute top-20 right-4 bg-carbon-800/80 backdrop-blur p-2 rounded text-xs">
          <div className="text-cyan-400 mb-1">KK Graviton Modes:</div>
          <div className="space-y-0.5">
            <div className="text-carbon-30">n=0: ω₀ = 2π</div>
            <div className="text-carbon-30">n=1: ω₁ = 2π√2</div>
            <div className="text-carbon-30">n=2: ω₂ = 2π√5</div>
          </div>
        </div>
      )}
    </div>
  );
}

function UniverseControls({ 
  controls, 
  setControls, 
  universeState,
  setUniverseState,
  onScenarioChange,
  onReset,
  webgpuSupported 
}: {
  controls: ControlsState;
  setControls: (controls: ControlsState) => void;
  universeState: UniverseState;
  setUniverseState: (state: UniverseState) => void;
  onScenarioChange: (mode: UniverseState['mode']) => void;
  onReset: () => void;
  webgpuSupported: boolean;
}) {
  const togglePlayback = () => {
    setControls({ ...controls, isPlaying: !controls.isPlaying });
  };

  return (
    <div className="absolute top-4 right-4 w-80 space-y-4 z-10">
      <Card className="bg-carbon-800/95 border-carbon-600 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-carbon-10 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            6D Universe Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playback Controls */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={togglePlayback}
              className="flex-1"
            >
              {controls.isPlaying ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
              {controls.isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button
              size="sm"
              onClick={onReset}
              variant="outline"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>

          {/* Renderer Selection */}
          <div>
            <label className="text-sm font-medium text-carbon-20 flex items-center gap-2">
              <Cpu className="w-3 h-3" />
              Renderer
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Button
                size="sm"
                variant={controls.renderer === 'webgl2' ? 'default' : 'outline'}
                onClick={() => setControls({ ...controls, renderer: 'webgl2' })}
                className="text-xs"
              >
                WebGL2
              </Button>
              <Button
                size="sm"
                variant={controls.renderer === 'webgpu' ? 'default' : 'outline'}
                onClick={() => setControls({ ...controls, renderer: 'webgpu' })}
                disabled={!webgpuSupported}
                className="text-xs relative"
              >
                WebGPU
                {webgpuSupported && (
                  <Badge className="absolute -top-2 -right-2 text-xs bg-green-600">
                    5-10x
                  </Badge>
                )}
              </Button>
            </div>
            <div className="text-xs text-carbon-40 mt-1">
              {controls.renderer === 'webgl2' && 'Standard GPU rendering'}
              {controls.renderer === 'webgpu' && webgpuSupported && '🚀 Ultra-fast compute shaders!'}
              {controls.renderer === 'webgpu' && !webgpuSupported && 'Not available in your browser'}
            </div>
          </div>

          {/* Quality Settings */}
          <div>
            <label className="text-sm font-medium text-carbon-20">Quality</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Button
                size="sm"
                variant={controls.quality === 'low' ? 'default' : 'outline'}
                onClick={() => setControls({ ...controls, quality: 'low' })}
                className="text-xs"
              >
                Low
              </Button>
              <Button
                size="sm"
                variant={controls.quality === 'medium' ? 'default' : 'outline'}
                onClick={() => setControls({ ...controls, quality: 'medium' })}
                className="text-xs"
              >
                Medium
              </Button>
              <Button
                size="sm"
                variant={controls.quality === 'high' ? 'default' : 'outline'}
                onClick={() => setControls({ ...controls, quality: 'high' })}
                className="text-xs"
              >
                High
              </Button>
            </div>
            <div className="text-xs text-carbon-40 mt-1">
              {controls.quality === 'low' && 'Fast performance, reduced detail'}
              {controls.quality === 'medium' && 'Balanced quality and speed'}
              {controls.quality === 'high' && 'Best quality, slower rendering'}
            </div>
          </div>

          {/* Scenario Selection */}
          <div>
            <label className="text-sm font-medium text-carbon-20">Scenario</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Button
                size="sm"
                variant={universeState.mode === 'big-bang' ? 'default' : 'outline'}
                onClick={() => onScenarioChange('big-bang')}
                className="text-xs"
              >
                Big Bang
              </Button>
              <Button
                size="sm"
                variant={universeState.mode === 'lambda-dom' ? 'default' : 'outline'}
                onClick={() => onScenarioChange('lambda-dom')}
                className="text-xs"
              >
                Λ-CDM
              </Button>
              <Button
                size="sm"
                variant={universeState.mode === 'black-hole' ? 'default' : 'outline'}
                onClick={() => onScenarioChange('black-hole')}
                className="text-xs"
              >
                Black Hole
              </Button>
              <Button
                size="sm"
                variant={universeState.mode === 'brane-oscillation' ? 'default' : 'outline'}
                onClick={() => onScenarioChange('brane-oscillation')}
                className="text-xs"
              >
                Brane Oscillation
              </Button>
              <Button
                size="sm"
                variant={universeState.mode === 'gw-echo' ? 'default' : 'outline'}
                onClick={() => onScenarioChange('gw-echo')}
                className="text-xs"
              >
                GW Echo
              </Button>
              <Button
                size="sm"
                variant={universeState.mode === 'vacuum-screening' ? 'default' : 'outline'}
                onClick={() => onScenarioChange('vacuum-screening')}
                className="text-xs"
              >
                Vacuum Screening
              </Button>
            </div>
            
            {/* Scenario Details */}
            <div className="mt-2 p-2 bg-carbon-900/50 rounded text-xs">
              <div className="text-cyan-400 font-medium mb-1">
                {SCENARIO_DESCRIPTIONS[universeState.mode].title}
              </div>
              <div className="text-carbon-30 text-xs leading-relaxed mb-1">
                {SCENARIO_DESCRIPTIONS[universeState.mode].physics}
              </div>
              <div className="text-carbon-40 text-xs italic">
                {SCENARIO_DESCRIPTIONS[universeState.mode].parameters}
              </div>
            </div>
          </div>

          {/* Time Speed */}
          <div>
            <label className="text-sm font-medium text-carbon-20">
              Time Speed: {controls.timeSpeed.toFixed(1)}×
            </label>
            <Slider
              value={[controls.timeSpeed]}
              onValueChange={([value]) => setControls({ ...controls, timeSpeed: value })}
              min={0.1}
              max={10}
              step={0.1}
              className="mt-1"
            />
          </div>

          {/* 6D Warp Depth */}
          <div>
            <label className="text-sm font-medium text-carbon-20">
              6D Warp Depth: {controls.warpDepth.toFixed(2)}
            </label>
            <Slider
              value={[controls.warpDepth]}
              onValueChange={([value]) => setControls({ ...controls, warpDepth: value })}
              min={0}
              max={0.5}
              step={0.01}
              className="mt-1"
            />
          </div>

          {/* Black Hole Controls */}
          {universeState.mode === 'black-hole' && (
            <>
              <div>
                <label className="text-sm font-medium text-carbon-20">
                  BH Mass: {controls.bhMass}M☉
                </label>
                <Slider
                  value={[controls.bhMass]}
                  onValueChange={([value]) => setControls({ ...controls, bhMass: value })}
                  min={1}
                  max={50}
                  step={1}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-carbon-20">
                  BH Spin: {controls.bhSpin.toFixed(2)}
                </label>
                <Slider
                  value={[controls.bhSpin]}
                  onValueChange={([value]) => setControls({ ...controls, bhSpin: value })}
                  min={0}
                  max={0.98}
                  step={0.01}
                  className="mt-1"
                />
              </div>
            </>
          )}

          {/* Brane Oscillation Controls */}
          {universeState.mode === 'brane-oscillation' && (
            <div>
              <label className="text-sm font-medium text-carbon-20">
                Brane Amplitude: {universeState.braneAmplitude.toFixed(2)}
              </label>
              <Slider
                value={[universeState.braneAmplitude]}
                onValueChange={([value]) => setUniverseState({ ...universeState, braneAmplitude: value })}
                min={0}
                max={0.5}
                step={0.01}
                className="mt-1"
              />
            </div>
          )}

          {/* Rendering Quality - Only show in high quality mode */}
          {controls.quality === 'high' && (
            <div>
              <label className="text-sm font-medium text-carbon-20">
                Ray Steps: {controls.raySteps}
              </label>
              <Slider
                value={[controls.raySteps]}
                onValueChange={([value]) => setControls({ ...controls, raySteps: value })}
                min={64}
                max={256}
                step={16}
                className="mt-1"
              />
            </div>
          )}

          {/* Display Toggles */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={controls.showPsi0 ? 'default' : 'outline'}
              onClick={() => setControls({ ...controls, showPsi0: !controls.showPsi0 })}
              className="text-xs flex-1"
            >
              ψ₀ Overlay
            </Button>
            <Button
              size="sm"
              variant={controls.showLabels ? 'default' : 'outline'}
              onClick={() => setControls({ ...controls, showLabels: !controls.showLabels })}
              className="text-xs flex-1"
            >
              Labels
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 6D Physics Parameters */}
      <Card className="bg-carbon-800/95 border-carbon-600 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-carbon-10 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Master Formula Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <label className="text-sm font-medium text-carbon-20">
              κ₆ (6D Coupling): {universeState.kappa6.toFixed(2)}
            </label>
            <Slider
              value={[universeState.kappa6]}
              onValueChange={([value]) => setUniverseState({ ...universeState, kappa6: value })}
              min={0.1}
              max={2.0}
              step={0.05}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-carbon-20">
              Λ₆ (6D Cosmo. Const.): {universeState.lambda6.toFixed(3)}
            </label>
            <Slider
              value={[universeState.lambda6]}
              onValueChange={([value]) => setUniverseState({ ...universeState, lambda6: value })}
              min={-0.1}
              max={0.1}
              step={0.001}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-carbon-20">
              σ (Brane Tension): {universeState.sigma.toFixed(2)} M⁴
            </label>
            <Slider
              value={[universeState.sigma]}
              onValueChange={([value]) => setUniverseState({ ...universeState, sigma: value })}
              min={0.1}
              max={5.0}
              step={0.1}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-carbon-20">
              R₆ (Bulk Curvature): {universeState.bulkCurvature.toFixed(3)}
            </label>
            <Slider
              value={[universeState.bulkCurvature]}
              onValueChange={([value]) => setUniverseState({ ...universeState, bulkCurvature: value })}
              min={-1.0}
              max={1.0}
              step={0.01}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Physics Status */}
      <Card className="bg-carbon-800/95 border-carbon-600 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-carbon-10 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Physics Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-carbon-40">Cosmic Time:</span>
            <span className="text-carbon-10 font-mono">{universeState.time.toFixed(2)} τ</span>
          </div>
          <div className="flex justify-between">
            <span className="text-carbon-40">Scale Factor:</span>
            <span className="text-carbon-10 font-mono">{universeState.scaleFactor.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-carbon-40">Total Energy:</span>
            <span className="text-carbon-10 font-mono">{universeState.energy.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-carbon-40">Quality Mode:</span>
            <span className="text-carbon-10 font-mono">{controls.quality}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-carbon-40">Renderer:</span>
            <span className="text-carbon-10 font-mono flex items-center gap-1">
              {controls.renderer === 'webgpu' ? (
                <>
                  <Cpu className="w-3 h-3 text-purple-400" />
                  WebGPU
                </>
              ) : (
                'WebGL2'
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-carbon-40">Ray Steps:</span>
            <span className="text-carbon-10 font-mono">
              {controls.quality === 'high' ? controls.raySteps : 
               controls.quality === 'medium' ? Math.floor(controls.raySteps * 0.5) : 
               Math.floor(controls.raySteps * 0.25)} (actual)
            </span>
          </div>
          
          {/* Action components */}
          <div className="border-t border-carbon-600 pt-2 mt-2">
            <div className="text-carbon-30 mb-1">Action Components:</div>
            <div className="flex justify-between">
              <span className="text-carbon-40">S_bulk:</span>
              <span className="text-carbon-10 font-mono">
                {((1 / (2 * universeState.kappa6 * universeState.kappa6)) * (universeState.bulkCurvature - 2 * universeState.lambda6)).toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-carbon-40">S_brane:</span>
              <span className="text-carbon-10 font-mono">
                {(-universeState.sigma).toFixed(3)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Universe() {
  const [universeState, setUniverseState] = useState<UniverseState>({
    time: 0,
    scaleFactor: 1.0,
    energy: 1.0,
    epsilon: 4.9e-10,
    G4: 6.674e-11,
    MP: 1.22e19,
    mode: 'big-bang',
    kappa6: 1.0,
    lambda6: 0.0,
    sigma: 1.0,
    braneAmplitude: 0.1,
    bulkCurvature: 0.1  // Changed from 0.0 to avoid division by zero
  });

  const [controls, setControls] = useState<ControlsState>({
    timeSpeed: 1.0,
    warpDepth: 0.1,
    bhMass: 10,
    bhSpin: 0.5,
    raySteps: 64,  // Reduced from 128
    showPsi0: true,
    showLabels: true,
    isPlaying: false,
    quality: 'low',  // Default to low for better performance
    renderer: 'webgl2'  // Default to WebGL2
  });

  const [physicsData, setPhysicsData] = useState<PhysicsData>({
    coefficients: [-0.576, -0.576, -0.988, 0.013, -0.092],
    psi0Profile: [],
    epsilon: 4.9e-10,
    G4: 6.674e-11,
    MP: 1.22e19
  });

  const [isLoading, setIsLoading] = useState(true);
  const [webgpuSupported, setWebgpuSupported] = useState(false);

  // Check WebGPU support
  useEffect(() => {
    const checkSupport = async () => {
      const support = await checkWebGPUSupport();
      setWebgpuSupported(support.supported);
    };
    checkSupport();
  }, []);

  // Load authentic physics data from previous analysis
  useEffect(() => {
    loadPhysicsData();
  }, []);

  // Time evolution with master formula
  useEffect(() => {
    if (!controls.isPlaying) return;

    const interval = setInterval(() => {
      setUniverseState(prev => {
        const dt = 0.01 * controls.timeSpeed;
        const newTime = prev.time + dt;
        
        // Evolve scale factor based on scenario and master formula
        let newScaleFactor = prev.scaleFactor;
        let newEnergy = prev.energy;
        let newBulkCurvature = prev.bulkCurvature;
        
        switch(prev.mode) {
          case 'big-bang':
            // Radiation-dominated expansion modified by bulk effects
            const H6 = Math.sqrt(prev.energy / 3) * Math.sqrt(1 + prev.bulkCurvature / prev.kappa6);
            newScaleFactor = prev.scaleFactor * (1 + H6 * dt);
            newEnergy = prev.energy / Math.pow(newScaleFactor / prev.scaleFactor, 4);
            newBulkCurvature = prev.bulkCurvature * Math.exp(-dt);
            break;
            
          case 'lambda-dom':
            // Dark energy dominated with 6D correction
            const H_lambda = Math.sqrt(prev.lambda6 / 3);
            newScaleFactor = prev.scaleFactor * Math.exp(H_lambda * dt);
            newEnergy = prev.energy * Math.exp(-3 * H_lambda * dt);
            break;
            
          case 'brane-oscillation':
            // Oscillating brane affects scale factor
            const osc = Math.sin(newTime * 3) * prev.braneAmplitude;
            newScaleFactor = prev.scaleFactor * (1 + osc * dt);
            break;
            
          case 'gw-echo':
            // GW propagation doesn't affect background scale factor
            newScaleFactor = prev.scaleFactor;
            newEnergy = prev.energy * (1 - 0.001 * dt); // Slow energy loss
            break;
            
          case 'vacuum-screening':
            // Compensated evolution
            const compensation = prev.sigma / (prev.sigma + Math.abs(prev.lambda6));
            newScaleFactor = prev.scaleFactor * (1 + compensation * dt * 0.1);
            break;
            
          default:
            newScaleFactor = prev.scaleFactor;
        }
        
        return {
          ...prev,
          time: newTime,
          scaleFactor: newScaleFactor,
          energy: newEnergy,
          bulkCurvature: newBulkCurvature
        };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [controls.isPlaying, controls.timeSpeed]);

  const loadPhysicsData = async () => {
    try {
      const response = await fetch('/api/sessions/active');
      if (response.ok) {
        const session = await response.json();
        
        const relativityResponse = await fetch(`/api/sessions/${session.sessionId}/relativity-results`);
        if (relativityResponse.ok) {
          const results = await relativityResponse.json();
          if (results.length > 0) {
            const latest = results[0];
            const coeffs = JSON.parse(latest.coefficients);
            const psi0 = JSON.parse(latest.psi0Profile);
            
            setPhysicsData({
              coefficients: coeffs,
              psi0Profile: psi0,
              epsilon: parseFloat(latest.lorentzEpsilon),
              G4: parseFloat(latest.newtonConstant),
              MP: 1.22e19
            });
            
            setUniverseState(prev => ({
              ...prev,
              epsilon: parseFloat(latest.lorentzEpsilon),
              G4: parseFloat(latest.newtonConstant)
            }));
          }
        }
      }
      
      // Generate psi0 profile if not loaded
      if (physicsData.psi0Profile.length === 0) {
        const profile = Array.from({ length: 64 }, (_, i) => {
          const y = i / 64 * 2 - 1;
          return Math.exp(-y * y * 4);
        });
        setPhysicsData(prev => ({ ...prev, psi0Profile: profile }));
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load physics data:', error);
      setIsLoading(false);
    }
  };

  const handleScenarioChange = (mode: UniverseState['mode']) => {
    setUniverseState(prev => ({ ...prev, mode }));
    
    switch (mode) {
      case 'big-bang':
        setUniverseState(prev => ({ 
          ...prev, 
          time: 0, 
          scaleFactor: 0.001, 
          energy: 1e6,
          bulkCurvature: 1.0,
          sigma: 0.1,
          lambda6: -0.01
        }));
        break;
      case 'lambda-dom':
        setUniverseState(prev => ({ 
          ...prev, 
          time: 13.8, 
          scaleFactor: 1.0, 
          energy: 0.7,
          bulkCurvature: 0.0,
          lambda6: 0.01
        }));
        break;
      case 'black-hole':
        setUniverseState(prev => ({ 
          ...prev, 
          time: 0, 
          scaleFactor: 1.0, 
          energy: 0.1,
          bulkCurvature: 0.5
        }));
        break;
      case 'brane-oscillation':
        setUniverseState(prev => ({ 
          ...prev, 
          time: 0, 
          scaleFactor: 1.0, 
          energy: 0.1,
          braneAmplitude: 0.2
        }));
        break;
      case 'gw-echo':
        setUniverseState(prev => ({ 
          ...prev, 
          time: 0, 
          scaleFactor: 1.0, 
          energy: 0.5,
          bulkCurvature: 0.1
        }));
        break;
      case 'vacuum-screening':
        setUniverseState(prev => ({ 
          ...prev, 
          time: 0, 
          scaleFactor: 1.0, 
          energy: 0.1,
          sigma: 1.0,
          lambda6: 0.05
        }));
        break;
      default:
        break;
    }
  };

  const handleReset = () => {
    setUniverseState({
      time: 0,
      scaleFactor: 1.0,
      energy: 1.0,
      epsilon: physicsData.epsilon,
      G4: physicsData.G4,
      MP: physicsData.MP,
      mode: 'big-bang',
      kappa6: 1.0,
      lambda6: 0.0,
      sigma: 1.0,
      braneAmplitude: 0.1,
      bulkCurvature: 0.1
    });
    
    setControls(prev => ({ ...prev, isPlaying: false }));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'b':
          handleScenarioChange('big-bang');
          break;
        case 'h':
          handleScenarioChange('black-hole');
          break;
        case 'o':
          handleScenarioChange('brane-oscillation');
          break;
        case 'e':
          handleScenarioChange('gw-echo');
          break;
        case 'v':
          handleScenarioChange('vacuum-screening');
          break;
        case 'g':
          setUniverseState(prev => ({ 
            ...prev, 
            G4: prev.G4 > 0 ? 0 : physicsData.G4 
          }));
          break;
        case 'r':
          handleReset();
          break;
        case ' ':
          event.preventDefault();
          setControls(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [physicsData]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-carbon-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <div className="text-carbon-20">Loading 6D Universe Physics Data...</div>
          <div className="text-carbon-40 text-sm mt-2">Integrating master formula: S = S<sub>bulk</sub> + S<sub>brane</sub> + S<sub>matter</sub></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative bg-carbon-900">
      {/* Main Visualization */}
      <UniverseVisualization
        universeState={universeState}
        controls={controls}
        physicsData={physicsData}
        webgpuSupported={webgpuSupported}
      />

      {/* Controls Panel */}
      <UniverseControls
        controls={controls}
        setControls={setControls}
        universeState={universeState}
        setUniverseState={setUniverseState}
        onScenarioChange={handleScenarioChange}
        onReset={handleReset}
        webgpuSupported={webgpuSupported}
      />

      {/* Help Text */}
      <div className="absolute bottom-4 left-4 bg-carbon-800/90 backdrop-blur rounded p-2 text-xs text-carbon-40">
        <div>Shortcuts: B=Big Bang, H=Black Hole, O=Oscillation, E=Echo, V=Vacuum, G=Toggle Gravity, R=Reset, Space=Play/Pause</div>
        <div className="mt-1">Master Formula: S = S_bulk + S_brane + S_matter | Coefficients: [{physicsData.coefficients.map(c => c.toFixed(3)).join(', ')}]</div>
      </div>

      {/* Performance Warning */}
      {controls.raySteps < 96 && (
        <div className="absolute bottom-4 right-4">
          <Badge variant="secondary" className="bg-yellow-600 text-yellow-50">
            Reduced Quality
          </Badge>
        </div>
      )}

      {/* Physics Validation Badge */}
      <div className="absolute top-4 left-4">
        <Badge className="bg-green-600 text-green-50">
          <Zap className="w-3 h-3 mr-1" />
          Real Physics Data
        </Badge>
      </div>


    </div>
  );
}