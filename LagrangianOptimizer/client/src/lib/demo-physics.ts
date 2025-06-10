/**
 * Demo physics data generator for visualization testing
 * Simulates real genetic algorithm evolution with physics accuracy
 */
import { Candidate } from '../../../shared/schema.js';

export class DemoPhysicsGenerator {
  private generation = 0;
  private bestFitness = 1.0;
  private targetC = 299792458; // m/s
  private targetAlpha = 0.007297352566; // fine structure constant

  generateCandidate(): Candidate {
    this.generation++;
    
    // Simulate convergence towards physics constants
    const convergenceRate = 0.95;
    this.bestFitness *= convergenceRate;
    
    // Generate coefficients that approach physical values
    const A = -0.5 + (Math.random() - 0.5) * 0.1;
    const B = 0.3 + (Math.random() - 0.5) * 0.05;
    const C = (Math.random() - 0.5) * 0.2;
    const D = 0.7 + (Math.random() - 0.5) * 0.1;
    const E = 0.1 + (Math.random() - 0.5) * 0.05;
    
    // Calculate speed of light (with convergence)
    const c_model = this.targetC * (1 + (Math.random() - 0.5) * this.bestFitness * 0.1);
    
    // Calculate fine structure constant (with convergence)
    const alpha_model = this.targetAlpha * (1 + (Math.random() - 0.5) * this.bestFitness * 0.2);
    
    // Calculate relative errors
    const delta_c = Math.abs(c_model - this.targetC) / this.targetC;
    const delta_alpha = Math.abs(alpha_model - this.targetAlpha) / this.targetAlpha;
    
    // Fitness is combination of both errors
    const fitness = Math.sqrt(delta_c * delta_c + delta_alpha * delta_alpha);
    
    return {
      coefficients: [A, B, C, D, E],
      fitness,
      c_model,
      alpha_model,
      delta_c,
      delta_alpha,
      generation: this.generation
    };
  }

  getGeneration(): number {
    return this.generation;
  }

  isConverged(): boolean {
    return this.bestFitness < 0.001;
  }
}