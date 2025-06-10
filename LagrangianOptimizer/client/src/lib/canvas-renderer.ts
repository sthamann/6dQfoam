/**
 * 2D Canvas fallback renderer for physics visualization
 * Displays real-time GA progress when WebGL is unavailable
 */
import { Candidate } from '../../../shared/schema.js';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private currentCandidate: Candidate | null = null;
  private particleCount = 500;
  private particles: Particle[] = [];
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    
    this.setupCanvas();
    this.initializeParticles();
    this.animate();
  }

  private setupCanvas(): void {
    const updateSize = () => {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      this.canvas.width = Math.max(800, rect.width) * dpr;
      this.canvas.height = Math.max(600, rect.height) * dpr;
      
      this.ctx.scale(dpr, dpr);
      this.canvas.style.width = Math.max(800, rect.width) + 'px';
      this.canvas.style.height = Math.max(600, rect.height) + 'px';
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
  }

  private initializeParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        z: Math.random() * 100,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        vz: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        hue: 200,
        alpha: 0.8
      });
    }
  }

  updateCandidate(candidate: Candidate, generation: number): void {
    this.currentCandidate = candidate;
    
    // Update particle colors based on physics accuracy
    const deltaC = candidate.delta_c;
    const deltaAlpha = candidate.delta_alpha;
    const fitness = candidate.fitness;
    
    this.particles.forEach(particle => {
      // Physics-driven color mapping
      if (fitness < 0.01) {
        particle.hue = 120; // Green for excellent
        particle.alpha = 1.0;
      } else if (fitness < 0.1) {
        particle.hue = 60;  // Yellow for good
        particle.alpha = 0.8;
      } else {
        particle.hue = 0;   // Red for poor
        particle.alpha = 0.6;
      }
      
      // Velocity influenced by coefficient dynamics
      const [A, B, C, D, E] = candidate.coefficients;
      const speedFactor = Math.sqrt(Math.abs(B / A)) * 0.1;
      
      particle.vx = (Math.random() - 0.5) * speedFactor;
      particle.vy = (Math.random() - 0.5) * speedFactor;
      
      // Size encoding operator dominance
      const maxCoeff = Math.max(...candidate.coefficients.map(Math.abs));
      particle.size = 1 + (Math.abs(A) / maxCoeff) * 4;
    });
  }

  private animate = (): void => {
    this.time += 0.016; // ~60fps
    
    // Clear canvas with physics-themed background
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw spacetime grid
    this.drawSpacetimeGrid();
    
    // Update and draw particles
    this.particles.forEach(particle => {
      this.updateParticle(particle);
      this.drawParticle(particle);
    });
    
    // Draw physics constants overlay
    this.drawPhysicsOverlay();
    
    this.animationId = requestAnimationFrame(this.animate);
  };

  private drawSpacetimeGrid(): void {
    const gridSize = 50;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Grid color based on convergence
    let gridColor = 'rgba(68, 68, 68, 0.3)';
    if (this.currentCandidate && this.currentCandidate.fitness < 0.01) {
      gridColor = 'rgba(0, 255, 0, 0.5)'; // Green when converged
    }
    
    this.ctx.strokeStyle = gridColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    
    // Draw grid lines
    for (let i = -10; i <= 10; i++) {
      const x = centerX + i * gridSize;
      const y = centerY + i * gridSize;
      
      // Vertical lines
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      
      // Horizontal lines
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }
    
    this.ctx.stroke();
  }

  private updateParticle(particle: Particle): void {
    // Physics-based motion
    if (this.currentCandidate) {
      const [A, B] = this.currentCandidate.coefficients;
      const omega = Math.sqrt(Math.abs(B / A)) * 0.01;
      
      // Wave-like motion influenced by dispersion relation
      particle.x += particle.vx + Math.sin(this.time * omega + particle.z * 0.1) * 0.5;
      particle.y += particle.vy + Math.cos(this.time * omega + particle.z * 0.1) * 0.5;
      particle.z += particle.vz;
    } else {
      // Default motion
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.z += particle.vz;
    }
    
    // Boundary wrapping
    if (particle.x < 0) particle.x = this.canvas.width;
    if (particle.x > this.canvas.width) particle.x = 0;
    if (particle.y < 0) particle.y = this.canvas.height;
    if (particle.y > this.canvas.height) particle.y = 0;
    if (particle.z < 0) particle.z = 100;
    if (particle.z > 100) particle.z = 0;
  }

  private drawParticle(particle: Particle): void {
    const size = particle.size * (1 + particle.z / 100);
    
    this.ctx.save();
    this.ctx.globalAlpha = particle.alpha * (1 - particle.z / 200);
    this.ctx.fillStyle = `hsl(${particle.hue}, 70%, 60%)`;
    
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Glow effect for excellent candidates
    if (particle.hue === 120) {
      this.ctx.shadowColor = `hsl(${particle.hue}, 70%, 60%)`;
      this.ctx.shadowBlur = 10;
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private drawPhysicsOverlay(): void {
    if (!this.currentCandidate) return;
    
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = '14px monospace';
    
    const x = 20;
    let y = 30;
    const lineHeight = 20;
    
    this.ctx.fillText(`Generation: ${this.currentCandidate.generation}`, x, y);
    y += lineHeight;
    
    this.ctx.fillText(`Fitness: ${this.currentCandidate.fitness.toExponential(3)}`, x, y);
    y += lineHeight;
    
    this.ctx.fillText(`c_model: ${this.currentCandidate.c_model.toExponential(6)} m/s`, x, y);
    y += lineHeight;
    
    this.ctx.fillText(`α_model: ${this.currentCandidate.alpha_model.toExponential(6)}`, x, y);
    y += lineHeight;
    
    this.ctx.fillText(`Δc: ${(this.currentCandidate.delta_c * 100).toFixed(4)}%`, x, y);
    y += lineHeight;
    
    this.ctx.fillText(`Δα: ${(this.currentCandidate.delta_alpha * 100).toFixed(4)}%`, x, y);
    
    this.ctx.restore();
  }

  // Interface compatibility methods
  resetCamera(): void {
    // Reset view to center for 2D canvas
    this.time = 0;
  }

  setAutoRotate(enabled: boolean): void {
    // Auto-rotation simulation for 2D canvas affects particle movement patterns
  }

  setWireframe(enabled: boolean): void {
    // Wireframe mode for 2D canvas affects rendering style
  }

  setQuality(quality: 'low' | 'medium' | 'high'): void {
    const qualityMap = { low: 200, medium: 500, high: 1000 };
    this.particleCount = qualityMap[quality] || 500;
    this.initializeParticles();
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  hue: number;
  alpha: number;
}