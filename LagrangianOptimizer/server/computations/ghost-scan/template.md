# Ghost & Tachyon Scan Report

## Test Configuration
- **Date**: {{date}}
- **Session ID**: {{sessionId}}
- **Planck Mass²**: {{MP2}}

## Input Operators
{{#each operators}}
- **{{name}}**: {{coeff}}
{{/each}}

## Test Results

### Overall Health Status
**Result**: {{#if is_healthy}}✅ HEALTHY{{else}}❌ UNHEALTHY{{/if}}

### Mode Analysis
- **Ghost Modes**: {{ghosts}}
- **Tachyonic Modes**: {{tachyons}}
- **Minimum Eigenvalue**: {{min_eigenvalue}}

### Eigenvalue Spectrum
{{#each eigenvalues}}
- λ{{@index}} = {{this}}
{{/each}}

### Matrix Properties
- **Determinant**: {{determinant}}
- **Trace**: {{trace}}

### Stability Checks
- **Positive Definite**: {{#if stability_check.positive_definite}}✅{{else}}❌{{/if}}
- **All Real Eigenvalues**: {{#if stability_check.all_real}}✅{{else}}❌{{/if}}
- **All Positive Eigenvalues**: {{#if stability_check.all_positive}}✅{{else}}❌{{/if}}

## Physical Analysis

### Unitarity Status
{{#if is_healthy}}
The theory respects unitarity with no negative-norm states. The S-matrix is well-defined and probability is conserved in all scattering processes.
{{else}}
{{#if ghosts}}
⚠️ **{{ghosts}} ghost mode(s) detected**: The theory violates unitarity. Negative-norm states lead to negative probabilities and inconsistent quantum mechanics.
{{/if}}
{{/if}}

### Vacuum Stability
{{#if tachyons}}
⚠️ **{{tachyons}} tachyonic mode(s) detected**: The vacuum is unstable. Imaginary mass modes grow exponentially, indicating the theory sits at a local maximum rather than minimum of the potential.
{{else}}
The vacuum is stable with all modes having real, positive mass-squared values.
{{/if}}

### Kinetic Structure Analysis
{{#if is_healthy}}
The kinetic matrix is positive-definite, ensuring:
- Well-posed initial value problem
- Positive kinetic energy for all modes
- Absence of Ostrogradsky instabilities
{{else}}
The kinetic matrix has problematic eigenvalues:
- Minimum eigenvalue: {{min_eigenvalue}}
- This indicates {{#if ghosts}}higher-derivative ghosts{{else}}kinetic instabilities{{/if}}
{{/if}}

## Recommendations
{{#if is_healthy}}
✓ The effective theory is unitary and stable
✓ Safe for phenomenological predictions
✓ Quantum corrections well-controlled
{{else}}
Consider the following remedies:
{{#if ghosts}}
- Reduce higher-derivative operator coefficients
- Implement Pauli-Villars regularization
- Consider alternative UV completion
{{/if}}
{{#if tachyons}}
- Shift to true vacuum configuration
- Include stabilizing higher-order terms
- Re-examine compactification geometry
{{/if}}
{{/if}}

## Technical Notes
- Kinetic matrix includes proper MP² scaling factors
- Eigenvalue computation uses numpy.linalg
- Ghost criterion: Re(λ) < 0
- Tachyon criterion: Im(λ) ≠ 0