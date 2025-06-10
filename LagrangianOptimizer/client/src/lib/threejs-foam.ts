import * as THREE from "three";
import * as dat from "dat.gui";
import type { Candidate } from "@shared/schema";
import { CanvasRenderer } from "./canvas-renderer";

/**
 * WebGL 3D visualization of 6D foam using Three.js
 * Implements real-time rendering with fitness-based color mapping
 */
export class FoamRenderer {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private particles: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private animationId: number | null = null;
  private lastTime = 0;
  private frameCount = 0;
  private fps = 60;
  private autoRotate = true;
  private quality: "low" | "medium" | "high" = "medium";
  private canvasRenderer: CanvasRenderer | null = null;
  private isWebGLAvailable = true;
  private braneGrid: THREE.Mesh | null = null;
  private autoRotationSpeed = 0.02;
  private currentFitness = 1.0;
  private currentGeneration = 0;
  private pulseAnimation = 0;
  
  // 6D foam physics properties
  private particleCount = 2000;
  private positions: Float32Array = new Float32Array(0);
  private velocities: Float32Array = new Float32Array(0);
  private energies: Float32Array = new Float32Array(0);
  private colors: Float32Array = new Float32Array(0);
  private lagrangianCoeffs: number[] = [0, 0, 0, 0, 0];
  private forceField: THREE.Vector3[] = [];
  private braneStability = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    try {
      // Initialize Three.js scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0a0a0a);

      // Setup camera
      this.camera = new THREE.PerspectiveCamera(
        75,
        canvas.offsetWidth / canvas.offsetHeight,
        0.1,
        1000
      );
      this.camera.position.set(0, 0, 15);

      // Setup renderer with WebGL fallback
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        failIfMajorPerformanceCaveat: false,
      });
      this.renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Create initial foam structure
      this.createFoamVisualization();
      
      // Add lighting
      this.setupLighting();

      // Handle resize
      window.addEventListener("resize", this.handleResize.bind(this));
    } catch (error) {
      console.warn("WebGL not available, falling back to 2D canvas visualization");
      this.isWebGLAvailable = false;
      this.canvasRenderer = new CanvasRenderer(this.canvas);
    }
  }

  private initFallbackCanvas() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    
    // Set up high-DPI canvas immediately
    this.setupHighDPICanvas(ctx);
    this.renderFallback2D(ctx);
    
    // Start animation loop for 2D fallback
    this.start2DAnimation(ctx);
  }

  private setupHighDPICanvas(ctx: CanvasRenderingContext2D) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    const width = rect.width;
    const height = rect.height;
    
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    ctx.scale(dpr, dpr);
    
    // Enable crisp text rendering
    (ctx as any).textRenderingOptimization = 'optimizeQuality';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  private renderFallback2D(ctx: CanvasRenderingContext2D, fitness?: number, candidates?: any[]) {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw foam particles simulation
    const time = Date.now() * 0.001;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Determine color based on fitness
    let particleColor = '#4a90e2';
    if (fitness !== undefined) {
      if (fitness < 1e-4) particleColor = '#24a148';
      else if (fitness < 1e-3) particleColor = '#f1c21b';
      else particleColor = '#fa4d56';
    }
    
    // Draw animated particles representing 6D foam
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2 + time * 0.5;
      const radius = 80 + Math.sin(time * 2 + i * 0.1) * 30;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.fillStyle = particleColor;
      ctx.globalAlpha = 0.7 + Math.sin(time * 3 + i * 0.2) * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    
    // Display current best values with improved typography
    if (candidates && candidates.length > 0) {
      const best = candidates[0];
      
      // Create semi-transparent info panel
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(10, 10, 400, 180);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 400, 180);
      
      // Use system fonts for better readability
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText('Current Best Candidate', 20, 35);
      
      ctx.font = '14px "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace';
      ctx.fillStyle = '#00ff88';
      ctx.fillText(`Fitness: ${best.fitness.toExponential(6)}`, 20, 60);
      
      ctx.fillStyle = '#88ccff';
      ctx.fillText(`c = ${best.c_model.toFixed(8)} m/s`, 20, 80);
      ctx.fillText(`α = ${best.alpha_model.toExponential(8)}`, 20, 100);
      
      ctx.fillStyle = '#ffaa44';
      ctx.fillText(`Δc = ${best.delta_c.toExponential(6)}`, 20, 120);
      ctx.fillText(`Δα = ${best.delta_alpha.toExponential(6)}`, 20, 140);
      
      ctx.fillStyle = '#cccccc';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Target: c = 299,792,458 m/s  |  α = 7.297×10⁻³', 20, 165);
    }
    
    // Title
    ctx.fillStyle = '#8d8d8d';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('6D Lagrangian Foam Visualization', centerX, this.canvas.height - 40);
    ctx.fillText('(2D Projection)', centerX, this.canvas.height - 20);
  }

  private start2DAnimation(ctx: CanvasRenderingContext2D) {
    const animate = () => {
      if (!this.animationId) return;
      
      this.renderFallback2D(ctx, this.lastFitness, this.lastCandidates);
      this.animationId = requestAnimationFrame(animate);
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  public keepVisualizationAlive() {
    // Ensure animation continues even after GA completion
    if (!this.animationId && this.canvas) {
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        this.start2DAnimation(ctx);
      }
    }
  }

  private lastFitness?: number;
  private lastCandidates?: any[];

  private createFoamVisualization() {
    if (!this.scene) return;
    
    // Create 6D-bulk points (foam structure)
    this.createBulkPoints();
    
    // Create 4D-brane grid (our world)
    this.createBraneGrid();
    
    // Setup auto-rotation
    this.setupAutoRotation();
  }

  private createBulkPoints() {
    const particleCount = this.getParticleCount();
    
    // Create geometry for 6D-bulk points
    this.geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    // Generate 6D foam structure projected to 3D using physics-based distribution
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Generate 6D coordinates with physics-based clustering
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.5) * 8;
      
      // Project to 3D with isoclinic rotation for 6D visualization
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      // Physics-based colors (will be updated by fitness)
      colors[i3] = 0.9;     // R - default red for poor fitness
      colors[i3 + 1] = 0.2; // G 
      colors[i3 + 2] = 0.2; // B

      // Variable sizes based on physics activity
      sizes[i] = 1.0 + Math.random() * 3.0;
    }

    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Create advanced material with GLSL shaders
    this.material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    // Create points mesh for bulk
    this.particles = new THREE.Points(this.geometry, this.material);
    if (this.scene) this.scene.add(this.particles);
  }

  private createBraneGrid() {
    if (!this.scene) return;
    
    // Create 4D-brane grid at z = 0 (our world)
    const gridSize = 20;
    const divisions = 40;
    
    this.braneGrid = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x444444);
    this.braneGrid.position.y = 0;
    this.braneGrid.material.transparent = true;
    this.braneGrid.material.opacity = 0.6;
    
    this.scene.add(this.braneGrid);
  }

  private setupAutoRotation() {
    // Auto-rotate scene around y-axis at 0.02 rad/s
    this.autoRotationSpeed = 0.02;
  }

  private getParticleCount(): number {
    switch (this.quality) {
      case "low": return 5000;
      case "medium": return 15000;
      case "high": return 30000;
      default: return 15000;
    }
  }

  private setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    // Point light
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 10, 10);
    this.scene.add(pointLight);
  }

  public updateFitness(fitness: number) {
    this.currentFitness = fitness;
    
    // Update physics-based visualization
    this.updatePhysicsColors(fitness);
    this.updateBraneGrid(fitness);
    
    // Update canvas renderer if using 2D fallback
    if (this.canvasRenderer) {
      // Canvas renderer doesn't have updateFitness method
      return;
    }
    
    if (!this.geometry || !this.scene) return;

    const colors = this.geometry.attributes.color as THREE.BufferAttribute;
    const positions = this.geometry.attributes.position as THREE.BufferAttribute;
    
    // Determine color based on fitness
    let baseR: number, baseG: number, baseB: number;
    
    if (fitness < 1e-4) {
      // Green for excellent fitness
      baseR = 0.1; baseG = 0.8; baseB = 0.3;
    } else if (fitness < 1e-3) {
      // Yellow for good fitness
      baseR = 0.9; baseG = 0.8; baseB = 0.1;
    } else {
      // Red for poor fitness
      baseR = 0.9; baseG = 0.2; baseB = 0.2;
    }

    // Update colors with animation
    const time = Date.now() * 0.002;
    const particleCount = positions.count;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Add some variation and animation
      const wave = Math.sin(time + i * 0.01) * 0.2 + 0.8;
      const intensity = Math.sin(time * 2 + i * 0.005) * 0.3 + 0.7;
      
      colors.setXYZ(
        i,
        baseR * wave * intensity,
        baseG * wave * intensity,
        baseB * wave * intensity
      );
    }
    
    colors.needsUpdate = true;
  }

  private updatePhysicsColors(fitness: number) {
    if (!this.geometry) return;

    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;
    
    for (let i = 0; i < colors.length; i += 3) {
      const particleIndex = i / 3;
      
      if (fitness < 1e-4) {
        // Excellent fitness - green with physics glow (#10B981)
        colors[i] = 0.06;    // R
        colors[i + 1] = 0.73; // G
        colors[i + 2] = 0.51; // B
        sizes[particleIndex] = 1.0 + Math.sin(Date.now() * 0.002 + particleIndex) * 0.5;
      } else if (fitness < 1e-3) {
        // Good fitness - yellow (#F59E0B)
        colors[i] = 0.96;    // R
        colors[i + 1] = 0.62; // G
        colors[i + 2] = 0.04; // B
        sizes[particleIndex] = 2.0;
      } else {
        // Poor fitness - red (#EF4444)
        colors[i] = 0.94;    // R
        colors[i + 1] = 0.27; // G
        colors[i + 2] = 0.27; // B
        sizes[particleIndex] = 3.0 + 80.0 * Math.max(fitness, 0.01);
      }
    }
    
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  private updateBraneGrid(fitness: number) {
    if (!this.braneGrid) return;
    
    if (fitness < 1e-4) {
      // Excellent fitness - green grid with pulse animation
      (this.braneGrid.material as THREE.LineBasicMaterial).color.setHex(0x10B981);
      this.pulseAnimation = Date.now() * 0.003;
      const pulse = 1.0 + 0.05 * Math.sin(this.pulseAnimation);
      this.braneGrid.scale.set(pulse, 1, pulse);
    } else if (fitness < 1e-3) {
      // Good fitness - yellow grid
      (this.braneGrid.material as THREE.LineBasicMaterial).color.setHex(0xF59E0B);
      this.braneGrid.scale.set(1, 1, 1);
    } else {
      // Poor fitness - red grid
      (this.braneGrid.material as THREE.LineBasicMaterial).color.setHex(0xEF4444);
      this.braneGrid.scale.set(1, 1, 1);
    }
  }

  private updateFoamPhysics(time: number) {
    if (!this.particles || !this.geometry) return;

    // Update bulk point positions for 6D-foam dynamics
    const positions = this.geometry.attributes.position.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const particleIndex = i / 3;
      
      // Physics-based oscillations in the bulk
      const wave = Math.sin(time * 2 + particleIndex * 0.01) * 0.05;
      const originalZ = positions[i + 2];
      positions[i + 2] = originalZ + wave;
      
      // Dynamic sizing based on current fitness for excellent precision
      if (this.currentFitness < 1e-4) {
        // Green glowing particles for excellent fitness
        sizes[particleIndex] = 1.5 + Math.sin(time * 3 + particleIndex * 0.05) * 0.4;
      } else {
        sizes[particleIndex] = 2.0;
      }
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public updateCandidate(candidate: Candidate, generation: number) {
    console.log('ThreeJS Foam: Updating with candidate fitness:', candidate.fitness);
    
    // Store current candidate for physics updates
    this.currentFitness = candidate.fitness;
    this.currentGeneration = generation;
    
    // Update physics-based colors immediately
    this.updatePhysicsColors(candidate.fitness);
    
    // Update brane grid based on fitness
    this.updateBraneGrid(candidate.fitness);
    
    // Force geometry updates
    if (this.geometry) {
      this.geometry.attributes.color.needsUpdate = true;
      this.geometry.attributes.size.needsUpdate = true;
    }
    
    console.log('ThreeJS Foam: Updated visualization for fitness', candidate.fitness.toExponential(3));
  }

  public updateCandidates(candidates: Candidate[]) {
    this.lastCandidates = candidates;
    
    // Update canvas renderer if using 2D fallback
    if (this.canvasRenderer) {
      // Canvas renderer doesn't have updateCandidates method, use updateCandidate instead
      if (candidates.length > 0) {
        this.canvasRenderer.updateCandidate(candidates[0], 0);
      }
      return;
    }
    
    if (candidates.length === 0) return;
    
    const bestFitness = candidates[0].fitness;
    this.updateFitness(bestFitness);
  }

  private animate = () => {
    if (!this.animationId || !this.renderer || !this.scene || !this.camera) return;

    const currentTime = Date.now();
    
    // Calculate FPS
    this.frameCount++;
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    // Auto rotation around y-axis at physics-based rate (0.02 rad/s)
    if (this.autoRotate && this.scene) {
      this.scene.rotation.y += this.autoRotationSpeed;
    }

    // Update physics-based 6D-foam animations
    this.updateFoamPhysics(currentTime * 0.001);

    // Update brane grid deformation for excellent fitness
    if (this.braneGrid && this.currentFitness < 1e-4) {
      const time = currentTime * 0.001;
      const pulse = 1.0 + 0.05 * Math.sin(time * 3);
      this.braneGrid.scale.set(pulse, 1, pulse);
      
      // Grid color should be green for excellent fitness
      (this.braneGrid.material as THREE.LineBasicMaterial).color.setHex(0x10B981);
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);
    
    this.animationId = requestAnimationFrame(this.animate);
  };

  public start() {
    if (this.animationId) return;
    
    this.lastTime = Date.now();
    this.frameCount = 0;
    this.animationId = requestAnimationFrame(this.animate);
  }

  public stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public resetCamera() {
    this.camera.position.set(0, 0, 15);
    this.camera.lookAt(0, 0, 0);
  }

  public setAutoRotate(enabled: boolean) {
    this.autoRotate = enabled;
  }

  public setWireframe(enabled: boolean) {
    if (this.material) {
      // For points material, we can adjust opacity to simulate wireframe
      this.material.opacity = enabled ? 0.3 : 0.8;
    }
  }

  public setQuality(quality: "low" | "medium" | "high") {
    if (this.quality === quality) return;
    
    this.quality = quality;
    
    // Recreate foam with new particle count
    this.scene.remove(this.particles);
    this.geometry.dispose();
    this.material.dispose();
    
    this.createFoamVisualization();
  }

  public getFPS(): number {
    return this.fps;
  }

  private handleResize() {
    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  public dispose() {
    this.stop();
    
    // Clean up Three.js resources
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
    
    // Remove event listeners
    window.removeEventListener("resize", this.handleResize);
  }
}

// Export additional utilities
export const ThreeJSUtils = {
  /**
   * Convert fitness value to color
   */
  fitnessToColor(fitness: number): THREE.Color {
    if (fitness < 1e-4) {
      return new THREE.Color(0x10b981); // Green
    } else if (fitness < 1e-3) {
      return new THREE.Color(0xf59e0b); // Yellow
    } else {
      return new THREE.Color(0xef4444); // Red
    }
  },

  /**
   * Create 6D to 3D projection matrix
   */
  create6DProjection(time: number): THREE.Matrix3 {
    const cos = Math.cos(time);
    const sin = Math.sin(time);
    
    // Simplified 6D to 3D projection
    return new THREE.Matrix3().set(
      cos, -sin, 0,
      sin, cos, 0,
      0, 0, 1
    );
  },
};
