/**
 * Operator catalog ported from the Python script
 * Contains symbolic representations of field operators for Lagrangian construction
 */
import { TERM_LIMITS } from "./constants";

export interface Operator {
  id: string;
  expression: string;
  description: string;
  coefficientIndex: number;
}

// Import unified physics constants
import { C_TARGET, ALPHA_TARGET, PI, G_TARGET } from "@shared/physics/constants";

// Operator catalog from Python script
export const OPERATORS: Operator[] = [
  {
    id: "phi_t_squared",
    expression: "(∂_t φ)²",
    description: "Kinetic term for scalar field",
    coefficientIndex: 0,
  },
  {
    id: "phi_x_squared",
    expression: "(∂_x φ)²",
    description: "Spatial gradient term",
    coefficientIndex: 1,
  },
  {
    id: "phi_squared",
    expression: "φ²",
    description: "Mass term for scalar field",
    coefficientIndex: 2,
  },
  {
    id: "phi_t_squared_phi_squared",
    expression: "(∂_t φ)² φ²",
    description: "Self-interaction term",
    coefficientIndex: 3,
  },
  {
    id: "em_scalar_coupling",
    expression: "g_em",
    description: "Electromagnetic-scalar field coupling constant",
    coefficientIndex: 4,
  },
  {
    id: "grav_scalar_coupling",
    expression: "ξ",
    description: "Gravitational-scalar field coupling constant",
    coefficientIndex: 5,
  },
];

export const N_OPS = 6;
export const IDX_GRAV = OPERATORS.findIndex((op) => op.id === "grav_scalar_coupling");

// Index of the gauge operator that contributes to fine structure constant
export const IDX_GAUGE = OPERATORS.findIndex((op) => op.id === "em_scalar_coupling");

/**
 * Symbolic math utilities for Lagrangian manipulation
 */
export class SymbolicMath {
  /**
   * Evaluates the dispersion relation from Euler-Lagrange equation
   * Returns coefficients A and B such that A*ω² + B*k² = 0
   */
  static getDispersionCoefficients(coefficients: number[]): {
    A: number;
    B: number;
  } {
    const c0 = coefficients[0]; // (∂_t φ)²
    const c1 = coefficients[1]; // (∂_x φ)²

    // Original-Ableitung aus der Euler-Lagrange-Gleichung
    // L = c0(∂_tφ)² + c1(∂_xφ)²  =>  ∂L/∂(∂_μ(∂_νφ)) = 0
    // d/dt(∂L/∂(∂_tφ)) = 2*c0*∂²φ/∂t²  =>  -2*c0*ω²
    // d/dx(∂L/∂(∂_xφ)) = 2*c1*∂²φ/∂x²  =>  -2*c1*k²
    // Die Dispersionsrelation ist (-2*c0*ω² + 2*c1*k²) = 0
    // A*ω² + B*k² = 0, also:

    const A = -2 * c0;
    const B = -2 * c1; // <-- richtiges Vorzeichen  (wie im Python-Original)

    return { A, B };
  }

  /**
   * Calculates the model speed of light from dispersion relation
   */
  static calculateSpeedOfLight(coefficients: number[]): number {
    const { A, B } = this.getDispersionCoefficients(coefficients);

    if (A === 0 || Math.abs(A) < 1e-15) {
      throw new Error("Invalid dispersion relation: A coefficient is zero");
    }

    const ratio = -B / A;
    if (ratio <= 0) {
      throw new Error("Invalid dispersion relation: negative c²");
    }

    return Math.sqrt(ratio);
  }

  /**
   * Calculates the vacuum expectation value (VEV) φ₀ from the potential
   * V(φ) = -½c₂φ² + ¼c₃φ⁴
   */
  static calculateVEV(coefficients: number[]): { phi0: number; isReal: boolean } {
    const c2 = coefficients[2]; // Mass term coefficient
    const c3 = coefficients[3]; // Self-interaction coefficient
    
    // For a stable minimum, we need c2 > 0 and c3 > 0
    if (c2 <= 0 || c3 <= 0) {
      return { phi0: 0, isReal: false };
    }
    
    // VEV: φ₀ = √(c₂/c₃)
    const phi0 = Math.sqrt(c2 / c3);
    return { phi0, isReal: true };
  }

  /**
   * Calculates the effective fine structure constant
   * α_eff = α_standard / (1 + coupling * φ₀²)
   * In Ultra mode: coupling = c₃ (self-interaction term)
   * Normal mode: coupling = g_em (EM coupling constant)
   */
  static calculateEffectiveFineStructure(coefficients: number[], phi0: number, isUltraMode: boolean = false): number {
    // In Ultra mode, use c₃ instead of g_em for the coupling
    const coupling = isUltraMode ? coefficients[3] : coefficients[4];
    return ALPHA_TARGET / (1 + coupling * phi0 * phi0);
  }

  /**
   * Calculates the effective gravitational constant
   * G_eff = G_standard / (1 + ξ * φ₀²)
   * 
   * Note: In the physical model with Lagrangian ℒ_Grav = ½(M_pl² - ξφ²)R,
   * the effective Planck mass squared is M_pl_eff² = M_pl² - ξφ².
   * For stable, attractive gravity, we need M_pl_eff² > 0.
   * 
   * In natural units where M_pl = 1, this becomes 1 - ξφ² > 0.
   * If this condition is violated, gravity becomes repulsive (negative G_eff).
   */
  static calculateEffectiveG(coefficients: number[], phi0: number): number {
    const xi = coefficients[5]; // Gravitational coupling constant
    const xiPhi2 = xi * phi0 * phi0;
    
    // Check stability condition: M_pl² - ξφ² > 0 (in natural units: 1 - ξφ² > 0)
    const effectivePlanckMassSquared = 1 - xiPhi2;
    
    // If the effective Planck mass squared becomes negative, gravity is unstable
    if (effectivePlanckMassSquared <= 0) {
      // Return negative value to signal unstable gravity
      return -Math.abs(G_TARGET / (1 + xiPhi2));
    }
    
    // Normal calculation for stable gravity
    return G_TARGET / (1 + xiPhi2);
  }

  /**
   * Calculates the elegance score based on mathematical beauty criteria
   */
  static calculateEleganceScore(coefficients: number[]): {
    score: number;
    details: {
      c3_elegance: number;
      coupling_simplicity: number;
      relation_bonus: number;
    };
  } {
    const c3 = coefficients[3];
    const g_em = coefficients[4];
    const xi = coefficients[5];
    
    // Elegance metric 1: How close is c3 to 1/(8π)?
    const target_c3 = 1 / (8 * PI);
    const c3_elegance = Math.max(0, 1 - Math.abs(c3 - target_c3) / target_c3);
    
    // Elegance metric 2: Bonus for simple coupling constants (near zero)
    const coupling_simplicity = Math.max(0, 1 - (Math.abs(g_em) + Math.abs(xi)) / 200);
    
    // Elegance metric 3: Bonus for mathematical relations
    let relation_bonus = 0;
    // Check if g_em ≈ c3
    if (Math.abs(g_em - c3) < 0.01) relation_bonus += 0.25;
    // Check if xi ≈ c3²
    if (Math.abs(xi - c3 * c3) < 0.01) relation_bonus += 0.25;
    
    // Weighted average
    const score = 0.5 * c3_elegance + 0.3 * coupling_simplicity + 0.2 * relation_bonus;
    
    return {
      score,
      details: {
        c3_elegance,
        coupling_simplicity,
        relation_bonus,
      },
    };
  }

  /**
   * Calculates the model fine structure constant from gauge coupling
   * DEPRECATED: Use calculateEffectiveFineStructure instead
   */
  static calculateFineStructureConstant(coefficients: number[]): number {
    // This method is kept for backward compatibility
    // In the new physics model, we use calculateEffectiveFineStructure
    const { phi0 } = this.calculateVEV(coefficients);
    return this.calculateEffectiveFineStructure(coefficients, phi0);
  }

  /**
   * Lorentz‑Isotropy score ε  (1D‑version)
   *   ε = |v/c − 1|, v = √(b/a) with a = −c_tt, b = c_xx (our convention)
   * Returns a value in [1e‑16, 1] where 0 is perfect isotropy.
   */
  static lorentzIsotropyEps(coefficients: number[]): number {
    const a = -coefficients[0]; // kinetic time term (stored negative)
    const b = coefficients[1]; // spatial term

    if (a <= 0 || b <= 0) return 1.0; // wrong signature → maximal violation

    const v = Math.sqrt(b / a); // natural units c = 1
    return Math.max(1e-16, Math.min(Math.abs(v - 1), 1));
  }

  /**
   * Validates that coefficients produce physical results
   */
  static validateCoefficients(coefficients: number[]): boolean {
    if (coefficients.length !== N_OPS) {
      return false;
    }

    try {
      const c = this.calculateSpeedOfLight(coefficients);
      const { phi0, isReal } = this.calculateVEV(coefficients);
      
      // Check if VEV is real
      if (!isReal) {
        return false;
      }
      
      const alpha_eff = this.calculateEffectiveFineStructure(coefficients, phi0);
      const G_eff = this.calculateEffectiveG(coefficients, phi0);

      // Check for reasonable physical values with relaxed constraints
      const {
        MASS_MAX,
        INTERACTION_MAX,
        EM_COUPLING_MIN,
        EM_COUPLING_MAX,
        GRAV_COUPLING_MIN,
        GRAV_COUPLING_MAX,
        LORENTZ_MAX,
      } = TERM_LIMITS;
      
      const eps = this.lorentzIsotropyEps(coefficients);
      if (eps > LORENTZ_MAX) return false;
      
      // Check mass and interaction terms
      if (Math.abs(coefficients[2]) > MASS_MAX * 4) return false;
      if (Math.abs(coefficients[3]) > INTERACTION_MAX * 4) return false;
      
      // Check coupling constants are within bounds
      const g_em = coefficients[4];
      const xi = coefficients[5];
      if (g_em < EM_COUPLING_MIN || g_em > EM_COUPLING_MAX) return false;
      if (xi < GRAV_COUPLING_MIN || xi > GRAV_COUPLING_MAX) return false;
      
      return true;
    } catch {
      return false;
    }
  }
}
