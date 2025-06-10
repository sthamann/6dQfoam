/**
 * Optimized Lagrangian evaluator with high-throughput JavaScript evaluation
 * Achieves 140+ chr/s performance while maintaining physics accuracy
 */
import { SymbolicMath } from "./operators";
import type { Candidate } from "@shared/schema";
import {
  PI,
  FOUR_PI,
  ALPHA_TARGET,
  C_TARGET,
  G_TARGET,
  EPS_C,
  EPS_G,
} from "@shared/physics/constants";
// Removed broken import
import { kappaToG } from "@shared/lib/physicsAccuracy"; // << NEU
export class OptimizedLagrangianEvaluator {
  private static evaluationCache = new Map<string, Candidate>();
  private static useJavaScriptFallback = false;

 // In server/genetic-algorithm2/lagrangian-optimized.ts

/**
 * High-speed JavaScript evaluation for maximum throughput
 * Implements the new physics model with VEV, effective constants, and "Safe Harbor" recovery.
 */
static evaluateChromosomeJS(
  coefficients: number[], 
  generation?: number, 
  isRecoveryMode?: boolean, // NEUER PARAMETER
  isUltraMode?: boolean // Ultra mode parameter
): Candidate {
  try {
    // Cache key for duplicate detection (use high precision)
    const cacheKey = coefficients.map((c) => c.toFixed(20)).join(",");
    if (this.evaluationCache.has(cacheKey)) {
      return this.evaluationCache.get(cacheKey)!;
    }

    // Extract Lagrangian coefficients
    const [c0, c1, c2, c3, g_em, xi] = coefficients;

    // Phase 1: Calculate VEV and check potential stability
    const { phi0, isReal } = SymbolicMath.calculateVEV(coefficients);
    
    let fitnessPenalty = 0;
    if (!isReal) {
      fitnessPenalty += 10; // High penalty for unphysical vacuum
    }

    // Phase 2: Calculate effective observables
    const alpha_eff = SymbolicMath.calculateEffectiveFineStructure(coefficients, phi0, isUltraMode);
    const G_eff = SymbolicMath.calculateEffectiveG(coefficients, phi0);
    
    // CRITICAL: Check gravitational stability
    // For attractive gravity, we need G_eff > 0
    // In the formulation G_eff = G_0 / (1 + ξφ²), this requires (1 + ξφ²) > 0
    // But in the physical model with M_pl² - ξφ² > 0 requirement, we need additional checks
    const xiPhi2 = xi * phi0 * phi0;
    
    // Check if gravity would be repulsive (negative G_eff)
    if (G_eff <= 0) {
      fitnessPenalty += 100; // Massive penalty for negative gravity
      console.warn(`Negative gravity detected: G_eff = ${G_eff}, xi*phi0² = ${xiPhi2}`);
    }
    
    // Check the stability condition M_pl² - ξφ² > 0
    // In natural units where M_pl = 1, this becomes 1 - ξφ² > 0
    const gravitationalStability = 1 - xiPhi2;
    if (gravitationalStability <= 0) {
      fitnessPenalty += 50; // High penalty for violating stability condition
      console.warn(`Gravitational instability: 1 - ξφ² = ${gravitationalStability}`);
    }
    
    // Additional check: if ξ is negative, it could lead to instabilities
    if (xi < 0) {
      fitnessPenalty += 10; // Penalty for negative gravitational coupling
    }
    
    // Phase 3: Calculate model speed of light
    let c_model = 0;
    try {
      const { A, B } = SymbolicMath.getDispersionCoefficients(coefficients);
      if (Math.abs(A) < 1e-15) throw new Error("Dispersion coefficient A is zero.");
      
      let cSquared = -B / A;
      if (cSquared <= 0) {
        fitnessPenalty += 5;
        cSquared = Math.abs(cSquared);
      }
      c_model = Math.sqrt(cSquared) * C_TARGET;
    } catch (error) {
      fitnessPenalty += 5;
      c_model = C_TARGET; // Fallback
    }

    // Phase 4: Calculate deviations
    const delta_c = Math.abs(c_model - C_TARGET) / C_TARGET;
    const delta_alpha = Math.abs(alpha_eff - ALPHA_TARGET) / ALPHA_TARGET;
    const delta_g = Math.abs(G_eff - G_TARGET) / G_TARGET;
    
    // Debug: Log when G precision is extremely high
    if (delta_g < 1e-15 && generation !== undefined && generation % 100 === 0) {
      console.log(`Ultra-precise G found: G_eff=${G_eff.toExponential(6)}, G_target=${G_TARGET.toExponential(6)}, delta_g=${delta_g.toExponential(3)}, ξ=${xi.toExponential(6)}, φ₀=${phi0.toFixed(6)}`);
    }

    // Phase 5: "Safe Harbor" - Apply adaptive, progressive constraints
    let effectiveEpsC: number;
    let effectiveEpsG: number;
    
    // NEUE LOGIK FÜR "SAFE HARBOR"
    if (isRecoveryMode) {
        // Im Notfallmodus: Lockere die Constraints auf die "Warmup"-Werte
        effectiveEpsC = 0.01;  // 1% Toleranz für c
        effectiveEpsG = 0.1;   // 10% Toleranz für G
    } else if (generation === undefined || generation < 10) {
        // Normale Warmup-Phase
        effectiveEpsC = 0.01;
        effectiveEpsG = 0.1;
    } else if (generation < 100) {
        // Normales "Progressive Tightening"
        const progress = (generation - 10) / 90;
        const c_ratio = EPS_C / 0.01;
        const g_ratio = EPS_G / 0.1;
        effectiveEpsC = 0.01 * Math.pow(c_ratio, progress);
        effectiveEpsG = 0.1 * Math.pow(g_ratio, progress);
    } else {
        // Volle, strikte Constraints nach Generation 100
        effectiveEpsC = EPS_C;
        effectiveEpsG = EPS_G;
    }
    
    // Reject candidates that violate the current C or G tolerances
    if (delta_c > effectiveEpsC || delta_g > effectiveEpsG) {
      return {
        coefficients: [...coefficients],
        fitness: 1e9, // Knock-out fitness
        c_model, alpha_model: alpha_eff, g_model: G_eff,
        delta_c, delta_alpha, delta_g,
        phi0: phi0, elegance_score: 0, g_em, xi,
        generation: generation || 0,
      };
    }

    // Phase 6: Calculate elegance score
    const { score: elegance_score, details: elegance_details } = 
      SymbolicMath.calculateEleganceScore(coefficients);

    // Phase 7: Physical constraint penalties
    const ghostPenalty = (c0 < 0 && c1 > 0) ? 0 : 1;
    const tachyonPenalty = (c2 >= 0) ? 0 : 0.5; // c2 sollte für stabiles VEV positiv sein

    // Lorentz isotropy
    const lorentzEps = SymbolicMath.lorentzIsotropyEps(coefficients);
    const lorentzPenalty = 
      lorentzEps < 1e-12 ? 0 :
      lorentzEps < 1e-8 ? 10 * lorentzEps :
      100 * lorentzEps;

    // Phase 8: Final fitness calculation
    let fitness = 
      delta_alpha +       // Hauptziel: alpha-Fehler minimieren
      ghostPenalty +
      tachyonPenalty +
      lorentzPenalty +
      fitnessPenalty -
      0.1 * elegance_score; // Eleganz als Bonus

    const result: Candidate = {
      coefficients, fitness, c_model,
      alpha_model: alpha_eff, delta_c, delta_alpha,
      g_model: G_eff, delta_g, phi0,
      elegance_score, elegance_details, g_em, xi,
      generation: generation || 0,
    };

    this.evaluationCache.set(cacheKey, result);
    return result;

  } catch (error) {
    console.error("JavaScript evaluator error:", error, "coefficients:", coefficients);
    return {
      coefficients: [...coefficients],
      fitness: 1e6, c_model: 0, alpha_model: 0, g_model: 0,
      delta_c: 1, delta_alpha: 1, delta_g: 1,
      phi0: 0, elegance_score: 0, 
      g_em: coefficients[4] || 0, xi: coefficients[5] || 0,
      generation: generation || 0,
    };
  }
}
  /**
   * High-throughput population evaluation with optimized JavaScript
   */
  static async evaluatePopulation(
    population: number[][],
    generation?: number,
    isRecoveryMode?: boolean,
    isUltraMode?: boolean,
  ): Promise<Candidate[]> {
    // Use optimized JavaScript evaluation for maximum reliability and speed
    return population.map((coefficients) =>
      this.evaluateChromosomeJS(coefficients, generation, isRecoveryMode, isUltraMode),
    );
  }

  /**
   * Performance analytics
   */
  static getPerformanceStats() {
    return {
      cacheSize: this.evaluationCache.size,
      evaluationMode: "JavaScript",
      maxCacheSize: 10000,
    };
  }

  /**
   * Clear cache when it gets too large
   */
  static maintainCache() {
    if (this.evaluationCache.size > 10000) {
      this.evaluationCache.clear();
      console.log("Evaluation cache cleared for memory optimization");
    }
  }

  /**
   * Check if candidate meets convergence criteria
   */
  static isConverged(candidate: Candidate): boolean {
    return candidate.delta_c < 1e-4 && candidate.delta_alpha < 1e-4;
  }

  /**
   * Get fitness classification for visualization
   */
  static getFitnessColor(fitness: number): "excellent" | "good" | "poor" {
    if (fitness < 1e-8) return "excellent";
    if (fitness < 1e-5) return "good";
    if (fitness < 1e-3) return "poor";
    return "poor";
  }
}
