# Sensitivity Heatmap Analysis Report

## Test Configuration
- **Coefficients**: `{{coeffs}}`
- **Number of Samples**: `{{n_samples}}`
- **GPU Acceleration**: `{{gpu_used}}`
- **SALib Available**: `{{salib_used}}`

## Results Summary
- **Success**: `{{success}}`
- **Robust Parameter Space**: `{{is_robust}}`
- **Maximum Sensitivity**: `{{max_sensitivity}}`
- **Runtime**: `{{runtime}}ms`

## Observable Values
- **Speed of Light (c)**: `{{observables.c_speed}}`
- **Fine Structure (α)**: `{{observables.alpha_em}}`
- **Newton Constant (G)**: `{{observables.G_newton}}`

## Deviations from Standard Model
- **Δc**: `{{observables.Delta_c}}`
- **Δα**: `{{observables.Delta_alpha}}`
- **ΔG**: `{{observables.Delta_G}}`

## Sensitivity Analysis
{{#if sensitivities.simplified}}
### Simplified Gradient Analysis
{{#each sensitivities.simplified}}
- **{{@key}}**: `{{this}}`
{{/each}}
{{else}}
### Sobol Sensitivity Indices

#### Δc Sensitivities
{{#each sensitivities.Delta_c}}
- **{{@key}}**: `{{this}}`
{{/each}}

#### Δα Sensitivities
{{#each sensitivities.Delta_alpha}}
- **{{@key}}**: `{{this}}`
{{/each}}

#### ΔG Sensitivities
{{#each sensitivities.Delta_G}}
- **{{@key}}**: `{{this}}`
{{/each}}
{{/if}}

## Interpretation
{{#if is_robust}}
✅ **PASSED**: The parameter space is robust. All sensitivity indices are below 10⁻², indicating the theory is stable against small perturbations in the Lagrange coefficients.
{{else}}
❌ **FAILED**: The parameter space shows high sensitivity. Maximum sensitivity index {{max_sensitivity}} exceeds threshold of 10⁻². The theory may be fine-tuned or unstable.
{{/if}} 