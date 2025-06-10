/**
 * Dynamic 6D-foam physics simulation renderer
 * Transforms static visualization into real-time physics engine
 * Following implementation guide for dynamic particle simulation
 */
import * as THREE from 'three';
import { Candidate } from '../../../shared/schema.js';

export class FoamRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private particleMesh: THREE.Points | null = null;
  private controls: any = null;
  private clock: THREE.Clock;
  private animationId: number | null = null;
  
  // Physics simulation state
  private particleCount = 2000;
  private velocities: THREE.Vector3[] = [];
  private equationCoefficients: number[] = [1, -1, 0, 0, 0, 0]; // Default values
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.clock = new THREE.Clock();
    
    // Initialize WebGL renderer
    try {
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(this.renderer.domElement);
    } catch (error) {
      console.warn('WebGL not available, falling back to 2D canvas visualization');
      throw error;
    }
    
    this.setupScene();
    this.createParticles();
    this.animate();
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.camera.position.set(20, 15, 20);
    this.camera.lookAt(0, 0, 0);
    
    // Basic lighting for particle visibility
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
  }

  /**
   * Create particle system with physics simulation capabilities
   */
  private createParticles(): void {
    const geometry = new THREE.BufferGeometry();
    
    // Initialize particle positions, colors, and sizes
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    
    // Initialize velocities array for physics simulation
    this.velocities = [];
    
    for (let i = 0; i < this.particleCount; i++) {
      // Random initial positions in 6D foam space projected to 3D
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.3) * 15;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      // Initialize with neutral colors (will be updated by physics)
      colors[i * 3] = 0.5;     // R
      colors[i * 3 + 1] = 0.5; // G
      colors[i * 3 + 2] = 0.8; // B
      
      sizes[i] = 2.0 + Math.random() * 2.0;
      
      // Initialize velocities with small random motion for immediate dynamics
      this.velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      ));
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Create material with simplified shaders for physics-based rendering
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute vec3 color;
        attribute float size;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          // Create bubble effect
          if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.45) discard;
          gl_FragColor = vec4(vColor, 1.0);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    this.particleMesh = new THREE.Points(geometry, material);
    this.scene.add(this.particleMesh);
  }

  /**
   * Set equation coefficients from genetic algorithm
   */
  public setEquation(coefficients: number[]): void {
    if (coefficients && coefficients.length >= 6) {
      this.equationCoefficients = coefficients;
    }
  }

  /**
   * Efficiently update visualization with new GA data
   * Optimized for high-frequency updates without recreating objects
   */
  public updateData(gaUpdate: any): void {
    if (!gaUpdate.best || !gaUpdate.best.coefficients) return;
    
    // Update equation coefficients without recreating geometry
    this.setEquation(gaUpdate.best.coefficients);
    
    // Force immediate particle redistribution for visible dynamics
    if (gaUpdate.generation % 5 === 0) {
      this.redistributeParticles();
    }
    
    // Add continuous perturbations for dynamic motion
    this.addContinuousPerturbations();
    
    // Update shader time uniform for dynamic effects
    if (this.particleMesh && this.particleMesh.material instanceof THREE.ShaderMaterial) {
      this.particleMesh.material.uniforms.time.value = performance.now() * 0.001;
    }
  }

  /**
   * Force particle redistribution for visible dynamics
   */
  private redistributeParticles(): void {
    if (!this.particleMesh) return;
    
    const positionAttr = this.particleMesh.geometry.attributes.position as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;
    
    // Add random perturbations to break static patterns
    for (let i = 0; i < this.particleCount; i++) {
      const baseIndex = i * 3;
      positions[baseIndex] += (Math.random() - 0.5) * 0.3;
      positions[baseIndex + 1] += (Math.random() - 0.5) * 0.3;
      positions[baseIndex + 2] += (Math.random() - 0.5) * 0.3;
      
      // Reset velocities for new motion patterns
      this.velocities[i].set(
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.0,
        (Math.random() - 0.5) * 2.0
      );
    }
    
    positionAttr.needsUpdate = true;
  }

  /**
   * Add continuous perturbations for dynamic motion
   */
  private addContinuousPerturbations(): void {
    if (!this.particleMesh) return;
    
    const positionAttr = this.particleMesh.geometry.attributes.position as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;
    
    // Add small random forces to create turbulent motion
    for (let i = 0; i < this.particleCount; i++) {
      const vel = this.velocities[i];
      
      // Add random turbulence
      vel.x += (Math.random() - 0.5) * 0.1;
      vel.y += (Math.random() - 0.5) * 0.1;
      vel.z += (Math.random() - 0.5) * 0.1;
      
      // Limit velocity to prevent explosion
      const maxVel = 5.0;
      if (vel.length() > maxVel) {
        vel.normalize().multiplyScalar(maxVel);
      }
    }
  }

  /**
   * Calculate scalar potential U at given position
   * Based on Lagrangian field equation coefficients
   */
  private calculatePotential(pos: THREE.Vector3): number {
    const [c0, c1, c2, c3, c4, c5 = 0] = this.equationCoefficients;
    const x = pos.x, y = pos.y, z = pos.z;
    const r = Math.sqrt(x*x + y*y + z*z);
    
    // Enhanced 6D foam potential with much stronger field variations for visible motion
    let potential = c2 * r * r * 0.5; // Stronger harmonic binding
    potential += c3 * Math.sin(x * c0 * 8.0) * Math.exp(-r * 0.2) * 2.0;
    potential += c4 * Math.sin(y * c1 * 6.0) * Math.exp(-r * 0.25) * 1.8;
    potential += c5 * Math.cos(z * c0 * 5.0) * Math.exp(-r * 0.15) * 2.2;
    potential += 1.5 * Math.sin(r * 8.0) * Math.exp(-r * 0.4); // Stronger radial waves
    
    return potential;
  }

  /**
   * Calculate force F = -∇U (negative gradient of potential)
   */
  private calculateForce(pos: THREE.Vector3): THREE.Vector3 {
    const [c0, c1, c2, c3, c4, c5] = this.equationCoefficients;
    const delta = 0.01; // Small distance for numerical derivative
    
    // Numerical gradient calculation
    const pot_x1 = this.calculatePotential(new THREE.Vector3(pos.x - delta, pos.y, pos.z));
    const pot_x2 = this.calculatePotential(new THREE.Vector3(pos.x + delta, pos.y, pos.z));
    const pot_y1 = this.calculatePotential(new THREE.Vector3(pos.x, pos.y - delta, pos.z));
    const pot_y2 = this.calculatePotential(new THREE.Vector3(pos.x, pos.y + delta, pos.z));
    const pot_z1 = this.calculatePotential(new THREE.Vector3(pos.x, pos.y, pos.z - delta));
    const pot_z2 = this.calculatePotential(new THREE.Vector3(pos.x, pos.y, pos.z + delta));
    
    const gradX = (pot_x2 - pot_x1) / (2 * delta);
    const gradY = (pot_y2 - pot_y1) / (2 * delta);
    const gradZ = (pot_z2 - pot_z1) / (2 * delta);
    
    // Force is negative gradient
    return new THREE.Vector3(-gradX, -gradY, -gradZ);
  }

  /**
   * Map potential value to color for visualization
   */
  private mapPotentialToColor(potential: number): THREE.Color {
    // Normalize potential to [0, 1] range
    const normalized = Math.min(1, Math.max(0, (potential + 10) / 20));
    const color = new THREE.Color();
    
    // Blue (low potential) to Red (high potential)
    color.setHSL(0.7 * (1 - normalized), 0.8, 0.5);
    return color;
  }

  /**
   * Physics update loop - the heart of the dynamic simulation
   */
  public update(deltaTime: number): void {
    if (!this.particleMesh) return;
    
    const positionAttr = this.particleMesh.geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = this.particleMesh.geometry.attributes.color as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;
    const colors = colorAttr.array as Float32Array;
    
    // Enhanced force scaling that responds to GA coefficient changes
    const coeffSum = Math.abs(this.equationCoefficients.reduce((a, b) => a + b, 0));
    const adaptiveForce = Math.max(15.0, coeffSum * 20.0); // Scale force based on coefficients
    const forceStrength = adaptiveForce; // Dynamic force strength
    const damping = 0.90;       // Lighter damping for more persistent motion
    
    for (let i = 0; i < this.particleCount; i++) {
      const pos = new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      const vel = this.velocities[i];
      
      // 1. Calculate force from potential field with enhanced scaling
      const force = this.calculateForce(pos);
      
      // 2. Add coefficient-dependent turbulence for visible dynamics
      const turbulence = new THREE.Vector3(
        (Math.random() - 0.5) * this.equationCoefficients[0] * 2.0,
        (Math.random() - 0.5) * this.equationCoefficients[1] * 2.0,
        (Math.random() - 0.5) * this.equationCoefficients[2] * 2.0
      );
      force.add(turbulence);
      
      // 3. Update velocity with much stronger force application
      vel.add(force.multiplyScalar(forceStrength * deltaTime));
      vel.multiplyScalar(damping);
      
      // 4. Limit velocity to prevent explosion while maintaining motion
      const maxVel = 12.0;
      if (vel.length() > maxVel) {
        vel.normalize().multiplyScalar(maxVel);
      }
      
      // 5. Update position
      pos.add(vel.clone().multiplyScalar(deltaTime));
      
      // 6. Enhanced boundary conditions with energy preservation
      const maxRadius = 8.0; // Larger boundary for more space
      if (pos.length() > maxRadius) {
        pos.normalize().multiplyScalar(maxRadius * 0.95);
        vel.multiplyScalar(0.8); // Less energy loss on boundary collision
      }
      
      // 5. Update geometry data
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      
      // 5. Update color based on potential energy
      const potential = this.calculatePotential(pos);
      const color = this.mapPotentialToColor(potential);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    // Notify Three.js that geometry has been updated
    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    
    // Update shader time uniform
    if (this.particleMesh.material instanceof THREE.ShaderMaterial) {
      this.particleMesh.material.uniforms.time.value = performance.now() * 0.001;
    }
  }

  /**
   * Update visualization with new candidate from genetic algorithm
   */
  updateCandidate(candidate: Candidate, generation: number): void {
    // Set new equation coefficients for physics simulation
    this.setEquation(candidate.coefficients);
  }

  /**
   * Animation loop with physics simulation
   */
  private animate = (): void => {
    if (!this.animationId) return;
    
    this.animationId = requestAnimationFrame(this.animate);
    
    const deltaTime = this.clock.getDelta();
    
    // Run physics simulation
    this.update(deltaTime);
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Start the animation loop
   */
  public startAnimation(): void {
    if (!this.animationId) {
      this.animationId = 1; // Set to non-null to enable animation
      this.animate();
    }
  }

  /**
   * Handle window resize
   */
  public handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.particleMesh) {
      this.particleMesh.geometry.dispose();
      if (this.particleMesh.material instanceof THREE.Material) {
        this.particleMesh.material.dispose();
      }
      this.scene.remove(this.particleMesh);
    }
    
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}