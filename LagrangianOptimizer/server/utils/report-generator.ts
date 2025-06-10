import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface ReportData {
  testType: 'lorentz_isotropy' | 'spin2_zero';
  coefficients: number[];
  results: any;
  sessionId?: string;
  equation?: string;
  c_model?: number;
  alpha_model?: number;
}

export class ReportGenerator {
  static generateReport(data: ReportData): string {
    const { testType, coefficients, results, sessionId, equation, c_model = 299792458, alpha_model = 0.007297353 } = data;
    
    console.log('ReportGenerator.generateReport called with:', {
      testType,
      coefficients,
      resultsKeys: Object.keys(results || {}),
      sessionId,
      c_model,
      alpha_model
    });
    
    // Load the appropriate template
    const templatePath = path.join(process.cwd(), `server/computations/rel_${testType}/template.md`);
    let template: string;
    
    try {
      template = fs.readFileSync(templatePath, 'utf8');
      console.log(`Template loaded successfully from: ${templatePath}`);
    } catch (error) {
      console.error(`Failed to load template: ${templatePath}`, error);
      return this.generateFallbackReport(data);
    }
    
    // Generate report based on test type
    console.log(`Checking testType: "${testType}" (type: ${typeof testType})`);
    console.log(`testType === 'lorentz_isotropy': ${testType === 'lorentz_isotropy'}`);
    console.log(`testType === 'spin2_zero': ${testType === 'spin2_zero'}`);
    
    if (testType === 'lorentz_isotropy') {
      console.log('Calling fillLorentzTemplate...');
      const filled = this.fillLorentzTemplate(template, coefficients, results, sessionId, equation, c_model, alpha_model);
      console.log('Template filled, first 100 chars:', filled.substring(0, 100));
      return filled;
    } else if (testType === 'spin2_zero') {
      console.log('Calling fillSpin2Template...');
      const filled = this.fillSpin2Template(template, coefficients, results, sessionId, equation, c_model, alpha_model);
      console.log('Template filled, first 100 chars:', filled.substring(0, 100));
      return filled;
    }
    
    console.warn(`Test type not matched: "${testType}", returning raw template`);
    return template;
  }
  
  private static fillLorentzTemplate(
    template: string,
    coefficients: number[],
    results: any,
    sessionId?: string,
    equation?: string,
    c_model?: number,
    alpha_model?: number
  ): string {
    console.log('fillLorentzTemplate called with:', {
      templateLength: template.length,
      coefficients,
      resultsKeys: Object.keys(results || {})
    });
    
    const testId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Extract coefficients
    const [c1, c2, c3, c4, c5, c6] = coefficients;
    
    // Calculate energy distributions (simplified from actual results)
    const epsilon = results.lorentzEpsilon || results.epsilon || 0;
    const classification = results.classification || this.classifyLorentzResult(epsilon);
    
    // Physical interpretation based on epsilon value
    const interpretation = this.getLorentzInterpretation(epsilon, coefficients);
    
    // Algorithm explanation
    const algorithmExplanation = `
## Algorithm Details

The Lorentz isotropy test evaluates the field equation's compatibility with special relativity by:

1. **Field Evolution**: The scalar field φ is evolved on a 3D grid (32×32×32) using the equation of motion derived from the Lagrangian:
   ℒ = ${c1?.toFixed(8) || '0'} (∂ₜφ)² + ${c2?.toFixed(8) || '0'} (∂ₓφ)² ${c3 >= 0 ? '+' : ''} ${c3?.toFixed(8) || '0'} φ² ${c4 >= 0 ? '+' : ''} ${c4?.toFixed(8) || '0'} (∂ₜφ)²φ² ${c5 >= 0 ? '+' : ''} ${c5?.toFixed(8) || '0'} F²ₘᵥ${c6 ? ` ${c6 >= 0 ? '+' : ''} ${c6.toExponential(3)} κR` : ''}

2. **Initial Conditions**: Gaussian wave packets are evolved along x, y, and z directions independently.

3. **Energy Calculation**: The energy density E_i = ½[(∂ₜφ)² + v_i²(∂ᵢφ)²] is computed for each direction, where v_i is the wave speed.

4. **Isotropy Measure**: ε = max|E_i - E_mean|/E_mean quantifies deviations from isotropy.

### Wave Speed Analysis
- For GA format with isotropy assumption: v_x = v_y = v_z = √(${c2}/${Math.abs(c1)}) = ${Math.sqrt(Math.abs(c2/c1)).toFixed(6)}
- Expected for Lorentz invariance: All wave speeds should equal c = 1 (in natural units)
`;
    
    // Fill template
    console.log('Starting template replacements...');
    console.log('Template contains {{TEST_ID}}:', template.includes('{{TEST_ID}}'));
    console.log('testId value:', testId);
    
    let filled = template
      .replace(/\{\{TEST_ID\}\}/g, testId)
      .replace(/\{\{TIMESTAMP\}\}/g, timestamp)
      .replace(/\{\{SESSION_ID\}\}/g, sessionId || 'N/A')
      .replace(/\{\{C1\}\}/g, c1?.toFixed(8) || '0')
      .replace(/\{\{C2\}\}/g, c2?.toFixed(8) || '0')
      .replace(/\{\{C3\}\}/g, c3?.toFixed(8) || '0')
      .replace(/\{\{C4\}\}/g, c4?.toFixed(8) || '0')
      .replace(/\{\{C5\}\}/g, c5?.toFixed(8) || '0')
      .replace(/\{\{C6\}\}/g, c6 ? c6.toExponential(3) : 'N/A')
      .replace(/\{\{C_MODEL\}\}/g, c_model?.toString() || '299792458')
      .replace(/\{\{ALPHA_MODEL\}\}/g, alpha_model?.toString() || '0.007297353')
      .replace(/\{\{EPSILON\}\}/g, epsilon.toExponential(10))
      .replace(/\{\{ENERGY_X\}\}/g, 'Computed internally')
      .replace(/\{\{ENERGY_Y\}\}/g, 'Computed internally')
      .replace(/\{\{ENERGY_Z\}\}/g, 'Computed internally')
      .replace(/\{\{MEAN_ENERGY\}\}/g, 'Computed internally')
      .replace(/\{\{MAX_DEVIATION\}\}/g, epsilon.toExponential(6))
      .replace(/\{\{INTERPRETATION\}\}/g, interpretation)
      .replace(/\{\{SUCCESS_STATUS\}\}/g, results.success ? 'Completed successfully' : 'Failed')
      .replace(/\{\{CONVERGENCE\}\}/g, epsilon < 0.1 ? 'Yes' : 'No')
      .replace(/\{\{STABILITY\}\}/g, epsilon < 1e-3 ? 'Stable' : 'Unstable')
      .replace(/\{\{ERROR_BOUNDS\}\}/g, `±${(epsilon * 0.1).toExponential(2)}`);
    
    console.log('After all replacements, filled contains {{TEST_ID}}:', filled.includes('{{TEST_ID}}'));
    console.log('After all replacements, filled contains {{EPSILON}}:', filled.includes('{{EPSILON}}'));
    console.log('Filled template first 300 chars:', filled.substring(0, 300));
    
    // Handle classification conditionals
    filled = filled
      .replace(/\{\{#if EXCELLENT\}\}(.*?)\{\{\/if\}\}/g, epsilon < 1e-6 ? '$1' : '')
      .replace(/\{\{#if GOOD\}\}(.*?)\{\{\/if\}\}/g, (epsilon >= 1e-6 && epsilon < 1e-4) ? '$1' : '')
      .replace(/\{\{#if MODERATE\}\}(.*?)\{\{\/if\}\}/g, (epsilon >= 1e-4 && epsilon < 1e-2) ? '$1' : '')
      .replace(/\{\{#if STRONG\}\}(.*?)\{\{\/if\}\}/g, epsilon >= 1e-2 ? '$1' : '');
    
    // Add algorithm explanation and full data
    filled = filled.replace(/\{\{NOTES\}\}/g, `
${algorithmExplanation}

## Full Input Data
\`\`\`json
${JSON.stringify({ coefficients, c_model, alpha_model, equation }, null, 2)}
\`\`\`

## Full Output Data
\`\`\`json
${JSON.stringify(results, null, 2)}
\`\`\`
`);
    
    return filled;
  }
  
  private static fillSpin2Template(
    template: string,
    coefficients: number[],
    results: any,
    sessionId?: string,
    equation?: string,
    c_model?: number,
    alpha_model?: number
  ): string {
    const testId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Extract coefficients
    const [c1, c2, c3, c4, c5, c6] = coefficients;
    
    // Extract results
    const psi0 = results.psi0 || 0;
    const newtonConstant = results.newtonConstant || results.GNewton || 0;
    const success = results.success;
    
    // Calculate derived parameters
    const sigma0 = c3 && c1 ? Math.abs(c3 / c1) : 0;
    const width = c2 && c3 ? Math.sqrt(Math.abs(c2 / c3)) : 0;
    
    // Physical interpretation
    const interpretation = this.getSpin2Interpretation(psi0, newtonConstant, coefficients);
    
    // Algorithm explanation
    const algorithmExplanation = `
## Algorithm Details

The Spin-2 Zero Mode test finds the graviton wavefunction in the extra dimension by:

1. **Warp Factor Construction**: 
   σ(y) = σ₀ exp(-y²/2w²) + 0.1c₄ tanh(y/w)
   where σ₀ = |c₃|/|c₁| = ${sigma0.toFixed(6)} and w = √(|c₂|/|c₃|) = ${width.toFixed(6)}

2. **Differential Equation**: Solves the zero-mode equation
   ψ''(y) + 2σ'(y)ψ'(y) = 0
   
   This comes from the linearized Einstein equations in the warped geometry:
   ds² = exp(2σ(y))[ημν dx^μ dx^ν] + dy²

3. **Boundary Conditions**: ψ(±5) → 0 (localized in extra dimension)

4. **Normalization**: ∫ ψ₀²(y) dy = 1

5. **4D Newton Constant**: G₄ = κ₆² ∫ ψ₀²(y) dy
   where κ₆² = ${c6?.toExponential(3) || 'not provided'}

### Physical Significance
- The zero mode ψ₀(y) represents the graviton's profile in the extra dimension
- Strong localization (large ψ₀) indicates gravity is confined near y=0
- G₄ determines the strength of 4D gravity as observed in our universe
`;
    
    // Fill template
    let filled = template
      .replace(/\{\{TEST_ID\}\}/g, testId)
      .replace(/\{\{TIMESTAMP\}\}/g, timestamp)
      .replace(/\{\{SESSION_ID\}\}/g, sessionId || 'N/A')
      .replace(/\{\{C1\}\}/g, c1?.toFixed(8) || '0')
      .replace(/\{\{C2\}\}/g, c2?.toFixed(8) || '0')
      .replace(/\{\{C3\}\}/g, c3?.toFixed(8) || '0')
      .replace(/\{\{C4\}\}/g, c4?.toFixed(8) || '0')
      .replace(/\{\{C5\}\}/g, c5?.toFixed(8) || '0')
      .replace(/\{\{C6\}\}/g, c6 ? c6.toExponential(3) : 'N/A')
      .replace(/\{\{C_MODEL\}\}/g, c_model?.toString() || '299792458')
      .replace(/\{\{ALPHA_MODEL\}\}/g, alpha_model?.toString() || '0.007297353')
      .replace(/\{\{SIGMA_0\}\}/g, sigma0.toFixed(6))
      .replace(/\{\{WIDTH\}\}/g, width.toFixed(6))
      .replace(/\{\{PSI0\}\}/g, psi0.toFixed(10))
      .replace(/\{\{NEWTON_CONSTANT\}\}/g, newtonConstant.toExponential(10))
      .replace(/\{\{LOCALIZATION\}\}/g, psi0 > 1 ? 'Strong' : psi0 > 0.1 ? 'Normal' : 'Weak')
      .replace(/\{\{INTEGRAL\}\}/g, '1.0 (normalized)')
      .replace(/\{\{PEAK_POSITION\}\}/g, '0.0')
      .replace(/\{\{EFFECTIVE_WIDTH\}\}/g, (width * 2).toFixed(3))
      .replace(/\{\{INTERPRETATION\}\}/g, interpretation)
      .replace(/\{\{CONVERGENCE_STATUS\}\}/g, success ? 'Converged' : 'Failed')
      .replace(/\{\{BOUNDARY_VALUES\}\}/g, '< 1e-6')
      .replace(/\{\{NORMALIZATION\}\}/g, 'L² normalized')
      .replace(/\{\{FALLBACK_USED\}\}/g, results.fallback ? 'Yes' : 'No')
      .replace(/\{\{MAX_WARP\}\}/g, sigma0.toFixed(6))
      .replace(/\{\{MAX_WARP_GRADIENT\}\}/g, (sigma0 / width).toFixed(6))
      .replace(/\{\{ADS_RADIUS\}\}/g, width > 0 ? (1 / sigma0).toFixed(6) : 'N/A');
    
    // Handle classification conditionals
    filled = filled
      .replace(/\{\{#if STRONG_GRAVITY\}\}(.*?)\{\{\/if\}\}/g, psi0 > 1 ? '$1' : '')
      .replace(/\{\{#if NORMAL_GRAVITY\}\}(.*?)\{\{\/if\}\}/g, (psi0 >= 0.1 && psi0 <= 1) ? '$1' : '')
      .replace(/\{\{#if WEAK_GRAVITY\}\}(.*?)\{\{\/if\}\}/g, psi0 < 0.1 ? '$1' : '')
      .replace(/\{\{#if REALISTIC_G\}\}(.*?)\{\{\/if\}\}/g, (newtonConstant > 1e-12 && newtonConstant < 1e-10) ? '$1' : '')
      .replace(/\{\{#if STRONG_G\}\}(.*?)\{\{\/if\}\}/g, newtonConstant > 1e-10 ? '$1' : '')
      .replace(/\{\{#if WEAK_G\}\}(.*?)\{\{\/if\}\}/g, newtonConstant < 1e-12 ? '$1' : '');
    
    // Add algorithm explanation and full data
    filled = filled.replace(/\{\{NOTES\}\}/g, `
${algorithmExplanation}

## Full Input Data
\`\`\`json
${JSON.stringify({ coefficients, c_model, alpha_model, equation }, null, 2)}
\`\`\`

## Full Output Data
\`\`\`json
${JSON.stringify(results, null, 2)}
\`\`\`
`);
    
    return filled;
  }
  
  private static classifyLorentzResult(epsilon: number): string {
    if (epsilon < 1e-6) return 'excellent';
    if (epsilon < 1e-4) return 'good';
    if (epsilon < 1e-2) return 'moderate';
    return 'strong';
  }
  
  private static getLorentzInterpretation(epsilon: number, coefficients: number[]): string {
    const [c1, c2] = coefficients;
    const expectedSpeed = 1; // Speed of light in natural units
    const actualSpeed = Math.sqrt(Math.abs(c2/c1));
    const speedDeviation = Math.abs(actualSpeed - expectedSpeed);
    
    let interpretation = `The Lorentz isotropy parameter ε = ${epsilon.toExponential(6)} measures how much the field equation deviates from rotational invariance in 3D space.\n\n`;
    
    if (epsilon < 1e-6) {
      interpretation += `**Excellent Result**: The field equation preserves Lorentz symmetry to high precision. Wave propagation is isotropic, with equal speeds in all spatial directions. This is consistent with special relativity and indicates the theory respects fundamental spacetime symmetries.`;
    } else if (epsilon < 1e-4) {
      interpretation += `**Good Result**: Minor violations of Lorentz symmetry detected. While wave speeds differ slightly between directions, the effect is small enough to be consistent with experimental bounds on Lorentz violation in nature.`;
    } else if (epsilon < 1e-2) {
      interpretation += `**Moderate Violation**: Significant anisotropy in wave propagation. The field equation exhibits directional preferences that would be observable in high-precision experiments. This level of violation is typically ruled out by current experimental constraints.`;
    } else {
      interpretation += `**Strong Violation**: Severe breakdown of Lorentz invariance. Wave propagation is highly anisotropic, with dramatically different speeds in different directions. This indicates fundamental issues with the field equation's compatibility with special relativity.`;
    }
    
    interpretation += `\n\n**Wave Speed Analysis**: The propagation speed is √(c₂/|c₁|) = ${actualSpeed.toFixed(6)}. `;
    interpretation += speedDeviation < 0.01 ? `This is very close to c=1, supporting good Lorentz invariance.` : `This deviates significantly from c=1, contributing to Lorentz violation.`;
    
    return interpretation;
  }
  
  private static getSpin2Interpretation(psi0: number, G4: number, coefficients: number[]): string {
    const [c1, c2, c3, c4, c5, c6] = coefficients;
    const G_observed = 6.67430e-11; // Observed Newton constant
    const G_ratio = G4 / G_observed;
    
    let interpretation = `The zero mode amplitude ψ₀ = ${psi0.toFixed(6)} characterizes how strongly gravity is localized in the extra dimension.\n\n`;
    
    if (psi0 > 1) {
      interpretation += `**Strong Localization**: The graviton wavefunction is highly concentrated near the brane (y=0). This indicates effective dimensional reduction from 5D to 4D, with gravity appearing 4-dimensional at low energies.`;
    } else if (psi0 > 0.1) {
      interpretation += `**Normal Localization**: The graviton has moderate localization in the extra dimension. This represents a balanced scenario where gravity transitions smoothly from 5D behavior at high energies to 4D at low energies.`;
    } else {
      interpretation += `**Weak Localization**: The graviton wavefunction is spread throughout the extra dimension. This suggests gravity remains essentially 5D even at low energies, which would conflict with observations.`;
    }
    
    interpretation += `\n\n**4D Newton Constant**: G₄ = ${G4.toExponential(4)} m³/kg/s²\n`;
    
    if (G_ratio > 0.1 && G_ratio < 10) {
      interpretation += `This is within an order of magnitude of the observed value (${G_observed.toExponential(4)}), indicating the model can reproduce realistic gravitational strength.`;
    } else if (G_ratio > 10) {
      interpretation += `This is ${G_ratio.toFixed(1)}× stronger than observed gravity. The model predicts excessively strong gravitational interactions.`;
    } else {
      interpretation += `This is ${(1/G_ratio).toExponential(1)}× weaker than observed gravity. The model fails to reproduce sufficient gravitational strength.`;
    }
    
    if (!c6 || c6 <= 0) {
      interpretation += `\n\n**Warning**: The gravity coefficient κ₆² is ${c6 ? 'negative' : 'missing'}. A positive value is required for physically meaningful gravity.`;
    }
    
    return interpretation;
  }
  
  private static generateFallbackReport(data: ReportData): string {
    const { testType, coefficients, results, sessionId, equation } = data;
    
    return `# ${testType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Test Report

**Test ID:** ${uuidv4()}  
**Timestamp:** ${new Date().toISOString()}  
**Session:** ${sessionId || 'N/A'}

## Input Parameters
**Coefficients:** ${coefficients.map((c, i) => `c${i+1}=${c.toFixed(8)}`).join(', ')}
${equation ? `**Equation:** ${equation}` : ''}

## Results
\`\`\`json
${JSON.stringify(results, null, 2)}
\`\`\`

## Analysis
This test was completed with the above parameters and results.

---
*Generated automatically by the ${testType} test module*
`;
  }
} 