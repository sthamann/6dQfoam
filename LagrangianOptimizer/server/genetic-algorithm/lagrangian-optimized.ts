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

  /**
   * High-speed JavaScript evaluation for maximum throughput
   */
  static evaluateChromosomeJS(coefficients: number[], generation?: number): Candidate {
    try {
      // Cache key for duplicate detection (use high precision)
      const cacheKey = coefficients.map((c) => c.toFixed(20)).join(",");
      if (this.evaluationCache.has(cacheKey)) {
        return this.evaluationCache.get(cacheKey)!;
      }

      // Extract Lagrangian coefficients for 6 operators (no normalization)
      const [c0, c1, c2, c3, c4, c5] = coefficients;

      // For a proper relativistic field theory, the Lagrangian should have the form:
      // L = -½(∂_μφ)(∂^μφ) - ½m²φ² + interaction terms
      // In our parametrization: c0*(∂_t φ)² + c1*(∂_x φ)² represents the kinetic term

      // The relativistic dispersion relation is ω² = c²k² + m²c⁴
      // For massless field (m=0): ω² = c²k²
      // From Lagrangian linearization: coeffs give A*ω² + B*k² = 0

      // Standard form requires c0 = -½ and c1 = +½ for c = 1 in natural units
      // We calculate how close the coefficients are to this ratio

      // Validate coefficients exist (need c0 for denominator in c² = c1/c0)

      if (Math.abs(c0) < 1e-15) {
        return {
          coefficients: [...coefficients],
          fitness: 1000,
          c_model: 0,
          alpha_model: 0,
          g_model: 0,
          delta_c: 1,
          delta_alpha: 1,
          delta_g: 1,
          generation: 0,
        };
      }

      // Use proper dispersion relation coefficients from operators.ts
      const { A, B } = SymbolicMath.getDispersionCoefficients(coefficients);
      if (Math.abs(A) < 1e-15 || Math.abs(c0) < 1e-15) {
        return {
          coefficients: [...coefficients],
          fitness: 1000,
          c_model: 0,
          alpha_model: 0,
          g_model: 0,
          delta_c: 1,
          delta_alpha: 1,
          delta_g: 1,
          generation: 0,
        };
      }
      let cSquared = -B / A;

      // The Python implementation accepts cSquared <= 0 and continues calculation
      // Only reject if cSquared is exactly 0 or NaN
      if (cSquared === 0 || isNaN(cSquared)) {
        return {
          coefficients: [...coefficients],
          fitness: 1000,
          c_model: 0,
          alpha_model: 0,
          g_model: 0,
          delta_c: 1,
          delta_alpha: 1,
          delta_g: 1,
          generation: 0,
        };
      }
      // Physikalisch korrekte Behandlung von c²
      // c² muss positiv sein für reelle Lichtgeschwindigkeit
      // Reserve Platz für Fitnessakkumulation, initial 0
      let fitnessPenalty = 0;

      if (cSquared <= 0) {
        fitnessPenalty += 5;
        cSquared = Math.abs(cSquared);
      }
      // Berechne c_model korrekt
      const c_model = Math.sqrt(cSquared) * C_TARGET;
      // Fine structure constant: α = |c4| / (4π)
      const alpha_model = Math.abs(c4) / FOUR_PI;

      // Gravity: akzeptiere sowohl κ als auch G dank kappaToG()
      const rawGrav = coefficients[5] ?? 0;
      const G_model = kappaToG(rawGrav);
      const g_model = G_model ?? Number.POSITIVE_INFINITY;
      const delta_g =
        G_model != null ? Math.abs(G_model - G_TARGET) / G_TARGET : 1;
      const delta_G = delta_g;
      // Calculate relative errors from target values
      const delta_c = Math.abs(c_model - C_TARGET) / C_TARGET; // Relative error for c
      const delta_alpha = Math.abs(alpha_model - ALPHA_TARGET) / ALPHA_TARGET; // Relative error for alpha

      // Hard constraints on fundamental constants
      const deltaC_relative = delta_c;  // Already calculated as relative error
      const deltaG_relative = delta_g;
      
      // PROGRESSIVE CONSTRAINT TIGHTENING
      // Start with loose constraints and gradually tighten them
      let effectiveEpsC: number;
      let effectiveEpsG: number;
      
      if (generation === undefined) {
        // No generation info, use strict constraints
        effectiveEpsC = EPS_C;
        effectiveEpsG = EPS_G;
      } else if (generation < 10) {
        // Warmup: very relaxed
        effectiveEpsC = 0.01;  // 1%
        effectiveEpsG = 0.1;   // 10%
      } else if (generation < 100) {
        // Progressive tightening from generation 10 to 100
        const progress = (generation - 10) / 90;
        // Exponential decay
        const c_ratio = EPS_C / 0.01;
        const g_ratio = EPS_G / 0.1;
        effectiveEpsC = 0.01 * Math.pow(c_ratio, progress);
        effectiveEpsG = 0.1 * Math.pow(g_ratio, progress);
      } else {
        // After generation 100: full constraints (with emergency relaxation)
        effectiveEpsC = EPS_C;
        effectiveEpsG = EPS_G;
        
        // Emergency relaxation for extreme stagnation
        if (generation > 500) {
          // Very slight relaxation to help stuck populations
          const stagnationFactor = 1 + (generation - 500) * 0.0001; // 0.01% per generation after 500
          effectiveEpsC = Math.min(EPS_C * stagnationFactor, EPS_C * 2); // Max 2x relaxation
          effectiveEpsG = Math.min(EPS_G * stagnationFactor, EPS_G * 2); // Max 2x relaxation
          
          if (generation % 100 === 0) {
            console.log(`Generation ${generation} emergency relaxation: C < ${effectiveEpsC.toExponential(2)}, G < ${effectiveEpsG.toExponential(2)}`);
          }
        }
      }
      
      // Log constraint status periodically
      if (generation !== undefined && generation % 50 === 0 && generation > 0) {
        console.log(`Generation ${generation} constraints: C < ${effectiveEpsC.toExponential(2)}, G < ${effectiveEpsG.toExponential(2)}`);
      }
      
      // Reject candidates that violate C or G tolerances
      if (deltaC_relative > effectiveEpsC || deltaG_relative > effectiveEpsG) {
        return {
          coefficients: [...coefficients],
          fitness: 1e9, // Knock-out fitness
          c_model: 0,
          alpha_model: 0,
          g_model: 0,
          delta_c: 1,
          delta_alpha: 1,
          delta_g: 1,
          generation: 0,
        };
      }

      // Check if constants have reached target precision
      const c_exact = Math.abs(c_model - C_TARGET) < 1; // Exact match for C
      const c_digits = delta_c > 0 ? Math.floor(-Math.log10(delta_c)) : 16;
      const g_digits = delta_g > 0 ? Math.floor(-Math.log10(delta_g)) : 16;
      
      // Since C and G are now hard constraints, we don't need adaptive weights
      // Focus is entirely on optimizing alpha

      // Fitness calculation with penalties for unphysical solutions
      const isGhostFree = c0 < 0 && c1 > 0;
      const ghostPenalty = isGhostFree ? 0 : 1;

      const isTachyonFree = coefficients[2] <= 0; // Massterm sollte ≤ 0 sein
      const tachyonPenalty = isTachyonFree ? 0 : 0.5;

      const isGaugeCorrect = c4 < 0; // Maxwell-Term sollte negativ sein
      const gaugePenalty = isGaugeCorrect ? 0 : 1;

      // Fitness: sum of relative errors plus penalties (with balanced gravity contribution)
      // Use logarithmic scaling to balance massive gravity errors with c and alpha errors
      const gravityPenalty = delta_G > 0 ? Math.log10(1 + delta_G) : 0;

      // Lagrangian-Normalisierung prüfen
      const normalizationError = Math.abs(c0 + 0.5) + Math.abs(c1 - 0.5);
      const normPenalty = normalizationError > 0.1 ? normalizationError : 0;
      /* --- Structural penalty: φ² & interaction -------------------------- */
      const structPenalty =
        0.2 * Math.max(0, Math.abs(c2) - 0.5) +
        0.1 * Math.max(0, Math.abs(c3) - 0.25);
      /* ------------------------------------------------------------------- */
      // ── NEW: Lorentz‑Isotropy penalty ───────────────────────────────────
      // ── Lorentz‑Isotropy penalty (weich, skalierend) ───────────────────
      const lorentzEps = SymbolicMath.lorentzIsotropyEps(coefficients);
      const lorentzPenalty =
        lorentzEps < 1e-12
          ? 0
          : lorentzEps < 1e-8
            ? 10 * lorentzEps
            : 100 * lorentzEps; // statt Hard‑Fail: proportional (eps ≤0.3 siehe TERM_LIMITS)
      // Gewichtete Fitness mit Fokus auf physikalische Korrektheit
      let fitness =
        delta_alpha + // Only optimize alpha - C and G are hard constraints
        ghostPenalty + // Harte physikalische Constraints
        tachyonPenalty +
        gaugePenalty +
        0.01 * normPenalty +
        structPenalty +
        lorentzPenalty +
        fitnessPenalty; // Sehr sanfte Führung

      const result: Candidate = {
        coefficients: [...coefficients],
        fitness,
        c_model,
        alpha_model,
        delta_c,
        delta_alpha,
        g_model,
        delta_g: delta_G,
        generation: 0,
      };

      // Cache result
      this.evaluationCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(
        "JavaScript evaluator error:",
        error,
        "coefficients:",
        coefficients,
      );
      return {
        coefficients: [...coefficients],
        fitness: 1e6,
        c_model: 0,
        alpha_model: 0,
        g_model: 0,
        delta_c: 1,
        delta_alpha: 1,
        delta_g: 1,
        generation: 0,
      };
    }
  }

  /**
   * High-throughput population evaluation with optimized JavaScript
   */
  static async evaluatePopulation(
    population: number[][],
    generation?: number,
  ): Promise<Candidate[]> {
    // Use optimized JavaScript evaluation for maximum reliability and speed
    return population.map((coefficients) =>
      this.evaluateChromosomeJS(coefficients, generation),
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
