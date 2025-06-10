/**
 * Utility functions for calculating and displaying precision of physical constants
 */

/**
 * Calculate the number of correct digits from a relative error
 * @param deltaValue - The relative error (e.g., delta_g, delta_alpha)
 * @returns A string representation of the precision
 */
export function calculatePrecisionDigits(deltaValue: number | undefined | null): string {
  // Handle undefined or null values
  if (deltaValue === undefined || deltaValue === null) {
    return "N/A";
  }

  // Handle exactly zero (perfect precision)
  if (deltaValue === 0) {
    return "Perfect";
  }

  // Handle negative values (shouldn't happen with relative errors, but be safe)
  if (deltaValue < 0) {
    return "Error";
  }

  // Handle extremely small values (machine precision limit)
  if (deltaValue < 1e-16) {
    return "16+ digits";
  }

  // Calculate digits of precision
  const digits = Math.floor(-Math.log10(deltaValue));
  
  // Handle edge cases
  if (!isFinite(digits)) {
    return "16+ digits";
  }
  
  if (digits < 0) {
    return "0 digits";
  }
  
  if (digits > 20) {
    return "20+ digits";
  }
  
  return `${digits} digits`;
}

/**
 * Get color class based on precision
 * @param deltaValue - The relative error
 * @returns Tailwind color class
 */
export function getPrecisionColorClass(deltaValue: number | undefined | null): string {
  if (deltaValue === undefined || deltaValue === null || deltaValue >= 1e-3) {
    return "text-yellow-400"; // Low precision
  }
  
  if (deltaValue < 1e-10) {
    return "text-emerald-400"; // Excellent precision
  }
  
  if (deltaValue < 1e-5) {
    return "text-green-400"; // Good precision
  }
  
  return "text-yellow-400"; // Moderate precision
}

/**
 * Format a physical constant value with appropriate precision
 * @param value - The value to format
 * @param precision - Number of significant digits
 * @returns Formatted string
 */
export function formatPhysicalConstant(value: number, precision: number = 8): string {
  if (!isFinite(value)) {
    return "Invalid";
  }
  
  // Use exponential notation for very large or very small values
  if (Math.abs(value) < 1e-4 || Math.abs(value) > 1e4) {
    return value.toExponential(precision);
  }
  
  // Use fixed notation for "normal" values
  return value.toPrecision(precision);
} 