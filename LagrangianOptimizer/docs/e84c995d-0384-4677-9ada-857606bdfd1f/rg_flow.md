# RG Flow Analysis Report

## Test Configuration
- **Date**: {{date}}
- **Session ID**: e84c995d-0384-4677-9ada-857606bdfd1f
- **Precision**: {{precision}}

## Input Operators
{{#each operators}}
- **{{name}}**: {{value}}
{{/each}}

## Test Results

### 1-Loop Beta Functions
{{#each beta}}
- **β({{name}})**: {{value}}
{{/each}}

### RG Flow Classification
{{#each flow_analysis}}
#### {{operator}}
- **Beta Function**: {{beta_value}}
- **Flow Direction**: {{#if positive}}UV growth{{else}}UV suppression{{/if}}
- **Behavior**: {{behavior}}
{{/each}}

## Physical Analysis

### UV Behavior
{{#each uv_analysis}}
#### {{operator}} Coupling
{{#if asymptotic_free}}
✓ Asymptotically free in UV
- β < 0 ensures weakening at high energy
- Perturbation theory reliable at UV scales
{{else if asymptotic_growth}}
⚠️ Grows in UV
- β > 0 indicates strengthening coupling
- May signal UV completion needed
{{else}}
• Fixed point candidate
- Small beta function |β| < {{threshold}}
- Near scale-invariant behavior
{{/if}}
{{/each}}

### Fixed Point Structure
{{#if fixed_point_found}}
Potential UV fixed point detected:
- λ* ≈ {{lambda_star}}
- a₂* ≈ {{a2_star}}
- g* ≈ {{g_star}}

Stability analysis:
- {{#if stable}}Stable (attractive){{else}}Unstable (repulsive){{/if}}
{{else}}
No obvious fixed points in perturbative regime.
Theory flows to {{#if uv_free}}free theory{{else}}strong coupling{{/if}} in UV.
{{/if}}

### Energy Scale Evolution
Starting from μ = M_P:

#### Running to UV (μ → ∞)
{{#each uv_running}}
- {{name}}(10 M_P) ≈ {{value_10mp}}
- {{name}}(100 M_P) ≈ {{value_100mp}}
- {{name}}(1000 M_P) ≈ {{value_1000mp}}
{{/each}}

#### Running to IR (μ → 0)
{{#each ir_running}}
- {{name}}(0.1 M_P) ≈ {{value_01mp}}
- {{name}}(0.01 M_P) ≈ {{value_001mp}}
{{/each}}

## Quantum Corrections

### Loop Expansion
The 1-loop results indicate:
{{#if perturbative}}
✓ Perturbation theory valid
- All β functions small: max|β| = {{max_beta}}
- Higher loops suppressed by (4π)²
- Reliable predictions possible
{{else}}
⚠️ Large quantum corrections
- max|β| = {{max_beta}} suggests breakdown
- Higher-loop terms may be important
- Non-perturbative effects possible
{{/if}}

### Scheme Dependence
Results computed in MS̄ scheme at 1-loop:
- Gauge-invariant beta functions
- Physical couplings at scale μ
- Scheme-independent fixed points

## Phenomenological Implications

### Effective Theory Range
{{#if wide_validity}}
The theory maintains validity over a wide energy range:
- UV cutoff: Λ_UV ≈ {{uv_cutoff}}
- IR scale: Λ_IR ≈ {{ir_scale}}
- Ratio: Λ_UV/Λ_IR ≈ {{scale_ratio}}
{{else}}
Limited validity range detected:
- Rapid running limits predictivity
- New physics expected at μ ≈ {{new_physics_scale}}
{{/if}}

### Observable Predictions
RG evolution affects:
- Scattering amplitudes: Energy-dependent cross sections
- Gravitational corrections: Modified at E ≈ M_P
- Scalar dynamics: Running mass and self-coupling

## Technical Notes
- Computation uses 50-digit mpmath precision
- Beta functions include only 1-loop contributions
- 2-loop and higher available via separate analysis
- Results valid in d = 4 - ε dimensions