/**
 * Standard Field Equation Rendering Functions
 * Handles proper normalization, sign conventions, and formatting
 */
import { normalizeAndConform } from "./fieldEquationUtils";

function round(v: number) { return parseFloat(v.toPrecision(15)); }

export interface FieldEquationOptions {
  normalized?: boolean;
  showPhysicalSigns?: boolean;
  precision?: number;
  format?: "latex" | "unicode" | "plain";
}

/**
 * Standard operator definitions with proper physics conventions
 */
export const FIELD_OPERATORS = {
  time_kinetic: { symbol: "(∂ₜφ)²", latex: "(\\partial_t\\phi)^2", index: 0 },
  space_kinetic: { symbol: "(∂ₓφ)²", latex: "(\\partial_x\\phi)^2", index: 1 },
  mass: { symbol: "φ²", latex: "\\phi^2", index: 2 },
  interaction: {
    symbol: "(∂ₜφ)²φ²",
    latex: "(\\partial_t\\phi)^2\\phi^2",
    index: 3,
  },
  gauge: { symbol: "F²ₘᵥ", latex: "F_{\\mu\\nu}^2", index: 4 },
  grav: { symbol: "κR", latex: "\\kappa R", index: 5 },
} as const;

/**
 * Normalize coefficients to standard physics convention where time kinetic term = -0.5
 */
export function normalizeCoefficients(rawCoefficients: number[]): number[] {
  if (rawCoefficients.length < 6) {
    throw new Error("Field equation requires 6 coefficients");
  }

  const [c0, c1, c2, c3, c4, c5] = rawCoefficients;

  // Normalize so that time kinetic term becomes -0.5
  const scale = -0.5 / c0;

  return [
    -0.5, // Time kinetic: normalized to -0.5
    c1 * scale, // Space kinetic: scaled
    c2 * scale, // Mass term: scaled
    c3 * scale, // Interaction: scaled
    c4 * scale, // Gauge field: scaled
    c5 * scale,
  ];
}

/**
 * Apply proper physics sign conventions
 */
export function applyPhysicsConventions(coefficients: number[]): number[] {
  const [c0, c1, c2, c3, c4, c5] = coefficients;
  const scale = -0.5 / coefficients[0];

  return [
    c0, // Time kinetic: keep as is (should be -0.5)
    c1, // Space kinetic: keep as is
    -Math.abs(c2), // Mass term: force negative for m² > 0
    c3, // Interaction: keep as is
    Math.sign(c4) === -1 ? c4 : -c4,
    Math.abs(c5), // κ must be positive
  ];
}

/**
 * Generate field equation string with proper formatting
 */
export function generateFieldEquationString(
  rawCoefficients: number[],
  options: FieldEquationOptions = {},
): string {
  const {
    normalized = true,
    showPhysicalSigns = true,
    precision = 8,
    format = "unicode",
  } = options;

  let coefficients = [...rawCoefficients];

  // Apply normalization if requested
  if (normalized) {
    coefficients = normalizeCoefficients(coefficients);
  }

  // Apply physics conventions if requested
  if (showPhysicalSigns) {
    coefficients = applyPhysicsConventions(coefficients);
  }

  const operators = Object.values(FIELD_OPERATORS);

  const terms = coefficients
    .map((coeff, index) => {
      const operator = operators[index];
      if (!operator) return "";

      const value = coeff.toPrecision(precision);
      const sign = index === 0 ? "" : coeff >= 0 ? " + " : " ";

      let symbol: string;
      switch (format) {
        case "latex":
          symbol = operator.latex;
          break;
        case "plain":
          symbol = operator.symbol.replace(/[²ₘᵥₜₓ]/g, (match) => {
            const map: Record<string, string> = {
              "²": "^2",
              ₘᵥ: "_{mu nu}",
              ₜ: "_t",
              ₓ: "_x",
            };
            return map[match] || match;
          });
          break;
        default:
          symbol = operator.symbol;
      }

      return `${sign}${value} ${symbol}`;
    })
    .join("");

  const prefix = format === "latex" ? "L = " : "ℒ = ";
  return prefix + terms;
}

/**
 * Validate field equation for physics consistency
 */
export function validateFieldEquation(coefficients: number[]): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (coefficients.length !== 6) {
    errors.push("Field equation must have exactly 6 terms");
    return { isValid: false, warnings, errors };
  }

  const [c0, c1, c2, c3, c4, c5] = coefficients;

  // Check time kinetic term
  if (c0 >= 0) {
    warnings.push("Time kinetic term should be negative for proper signature");
  }

  // Check mass term
  if (c2 > 0) {
    warnings.push("Mass term should be negative to avoid tachyonic modes");
  }

  // Check gauge term
  if (c4 > 0) {
    warnings.push(
      "Maxwell term should be negative for standard field theory convention",
    );
  }

  // Check for zero coefficients
  if (Math.abs(c0) < 1e-15) {
    errors.push("Time kinetic term cannot be zero");
  }

  const isValid = errors.length === 0;
  return { isValid, warnings, errors };
}

/**
 * Get physics interpretation of the field equation
 */
export function getPhysicsInterpretation(coefficients: number[]): {
  lightSpeed: number;
  massSquared: number;
  couplingStrength: number;
  stability: "stable" | "unstable" | "marginal";
} {
  const normalized = normalizeCoefficients(coefficients);
  const [c0, c1, c2, c3, c4, c5] = normalized;

  // Speed of light: c² = -c1/c0
  const lightSpeed = Math.sqrt(Math.abs(-c1 / c0));

  // Mass squared: m² = -2*c2
  const massSquared = -2 * c2;

  // Coupling strength from gauge field
  const couplingStrength = Math.abs(c4);

  // Stability analysis
  let stability: "stable" | "unstable" | "marginal";
  if (massSquared < 0) {
    stability = "unstable"; // Tachyonic
  } else if (massSquared === 0) {
    stability = "marginal"; // Massless
  } else {
    stability = "stable"; // Normal massive field
  }

  return {
    lightSpeed,
    massSquared,
    couplingStrength,
    stability,
  };
}
