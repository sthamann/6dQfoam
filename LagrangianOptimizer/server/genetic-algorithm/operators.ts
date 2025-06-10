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
import { C_TARGET, ALPHA_TARGET, PI } from "@shared/physics/constants";

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
    id: "maxwell_term",
    expression: "F²_tx",
    description: "Maxwell field strength tensor (gives α)",
    coefficientIndex: 4,
  },
  {
    id: "gravity_term",
    expression: "κR",
    description: "Einstein–Hilbert curvature term (gravity)",
    coefficientIndex: 5,
  },
];

export const N_OPS = 6;
export const IDX_GRAV = OPERATORS.findIndex((op) => op.id === "gravity_term");

// Index of the gauge operator that contributes to fine structure constant
export const IDX_GAUGE = OPERATORS.findIndex((op) => op.id === "maxwell_term");

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
   * Calculates the model fine structure constant from gauge coupling
   */
  static calculateFineStructureConstant(coefficients: number[]): number {
    const gaugeCoeff = coefficients[IDX_GAUGE];

    // From the Python script: alpha_model = abs(g_coeff) / (4 * pi)
    return Math.abs(gaugeCoeff) / (4 * PI);
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
      const alpha = this.calculateFineStructureConstant(coefficients);

      // Check for reasonable physical values with very relaxed constraints
      // ╭─ neu ───────────────────────────────────────────────────────────╮
      const {
        MASS_MAX,
        INTERACTION_MAX,
        GAUGE_SIGN,
        GRAV_MIN,
        GRAV_MAX,
        LORENTZ_MAX,
      } = TERM_LIMITS;
      const eps = this.lorentzIsotropyEps(coefficients);
      if (eps > LORENTZ_MAX) return false;
      if (Math.abs(coefficients[2]) > MASS_MAX * 4) return false;
      if (Math.abs(coefficients[3]) > INTERACTION_MAX * 4) return false;
      if (Math.sign(coefficients[4]) !== GAUGE_SIGN) return false;
      if (coefficients[5] < GRAV_MIN * 5 || coefficients[5] > GRAV_MAX * 5)
        return false;
      // ╰─────────────────────────────────────────────────────────────────╯
      return true;
    } catch {
      return false;
    }
  }
}
