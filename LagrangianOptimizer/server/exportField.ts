/**
 * Field equation export functionality
 * Exports best genetic algorithm results to shared field equation file
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

export interface FieldEquationData {
  coeffs: number[];
  timestamp: number;
  generation: number;
  fitness: number;
  c_model: number;
  alpha_model: number;
  g_model?: number;
  delta_c: number;
  delta_alpha: number;
  delta_g?: number;
}

/**
 * Export best equation to shared field_equation.json for use by other modules
 */
export function exportBestEquation(data: FieldEquationData): void {
  try {
    const outputPath = join(process.cwd(), 'shared', 'field_equation.json');
    writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`✅ Exported field equation to ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to export field equation:', error);
  }
}

/**
 * Generate human-readable field equation string from coefficients
 */
export function generateFieldEquationString(coeffs: number[]): string {
  const terms = [];
  
  if (Math.abs(coeffs[0]) > 1e-15) {
    terms.push(`${coeffs[0].toExponential(6)}(∂_tφ)²`);
  }
  if (Math.abs(coeffs[1]) > 1e-15) {
    terms.push(`${coeffs[1] > 0 ? '+' : ''}${coeffs[1].toExponential(6)}(∂_xφ)²`);
  }
  if (Math.abs(coeffs[2]) > 1e-15) {
    terms.push(`${coeffs[2] > 0 ? '+' : ''}${coeffs[2].toExponential(6)}φ²`);
  }
  if (Math.abs(coeffs[3]) > 1e-15) {
    terms.push(`${coeffs[3] > 0 ? '+' : ''}${coeffs[3].toExponential(6)}(∂_tφ)²φ²`);
  }
  if (Math.abs(coeffs[4]) > 1e-15) {
    terms.push(`${coeffs[4] > 0 ? '+' : ''}${coeffs[4].toExponential(6)}F²`);
  }
  
  return terms.length > 0 ? `L = ${terms.join(' ')}` : 'L = 0';
}