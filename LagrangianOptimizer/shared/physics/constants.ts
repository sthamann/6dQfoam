/**
 * AUTHORITATIVE PHYSICS CONSTANTS
 * Single source of truth for all physics calculations
 * CODATA-2018 values where applicable
 */

export const PI = Math.PI;
export const FOUR_PI = 4 * Math.PI;
export const TWO_PI = 2 * Math.PI;
export const PI_SQUARED = PI * PI;

// Fine structure constant (dimensionless) - CODATA 2018
export const ALPHA_TARGET = 0.00729735256644;

// Speed of light in SI units (m/s) - CODATA 2018 (exact definition by SI standards)
// This is an exact defined constant, not measured - enables full 16-digit precision optimization
export const C_TARGET = 299792458;

export const G_TARGET = 6.6743e-11; // ± 0.00015e-11 → 5 Digits
export const KAPPA_TARGET = -1 / (16 * Math.PI * G_TARGET);
// Physics constants collection
export const PHYSICS_CONSTANTS = {
  PI,
  FOUR_PI,
  TWO_PI,
  PI_SQUARED,
  ALPHA_TARGET,
  G_TARGET,
  C_TARGET,
} as const;

// Tolerances for hard constraints - these constants are NOT optimized, only validated
export const EPS_C = 1e-6; // Relative tolerance: 1 ppm (parts per million)
export const EPS_G = 1e-4; // Relative tolerance: 100 ppm
