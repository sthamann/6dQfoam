# Gravity Zero Mode Analysis Report

## Test Configuration
- **Date**: {{date}}
- **Session ID**: {{sessionId}}
- **Extra Dimension Range**: y ∈ [-5, 5]
- **Grid Points**: 200

## Input Parameters
### Field Coefficients
- c_tt = {{c_tt}}
- c_xx = {{c_xx}}
- m² = {{m2}}
- λ = {{lambda}}
- g = {{g}}

## Test Results

### Newton Constant
- **G₄**: {{GNewton}}
- **Relative to G_N**: {{GNewton_ratio}} × G_Newton
- **Status**: {{#if GNewton_realistic}}✅ Realistic{{else}}⚠️ Non-standard{{/if}}

### Zero Mode Profile
- **Peak Location**: y = {{peak_location}}
- **Peak Value**: ψ₀({{peak_location}}) = {{peak_value}}
- **FWHM**: {{fwhm}} (localization width)
- **Boundary Values**: ψ₀(-5) = 0, ψ₀(5) = 1

## Physical Analysis

### Gravity Localization
{{#if well_localized}}
✓ **Strong localization achieved**:
- Zero mode confined near y = {{peak_location}}
- Exponential suppression away from brane
- 4D gravity emerges naturally
{{else}}
⚠️ **Weak localization**:
- Zero mode spread over extra dimension
- Gravity leaks into bulk
- Modified 4D phenomenology expected
{{/if}}

### Warp Factor Properties
- **Type**: σ(y) = {{scale}} × tanh({{m2}} y²/10)
- **Central Value**: σ(0) = {{sigma_0}}
- **Asymptotic**: σ(±5) ≈ {{sigma_inf}}

### Gauge-Gravity Interplay
{{#if strong_gauge}}
Strong gauge coupling effect:
- Gauge parameter |g| = {{abs_g}}
- Gravity suppression factor: 1/(1 + {{abs_g}}) = {{suppression}}
- Reduced Newton constant by {{suppression_percent}}%
{{else}}
Weak gauge coupling:
- Minimal effect on gravity
- Standard Newton constant preserved
{{/if}}

## Profile Characteristics

### Shape Analysis
{{#if gaussian_like}}
- **Type**: Near-Gaussian profile
- **Width parameter**: σ ≈ {{width_param}}
- **Skewness**: {{skewness}}
{{else if exponential_like}}
- **Type**: Exponential localization
- **Decay length**: ℓ ≈ {{decay_length}}
- **Asymmetry**: {{asymmetry}}
{{else}}
- **Type**: Complex profile
- **Multiple features detected**
{{/if}}

### Normalization Check
- ∫ ψ₀²(y) dy = {{norm_integral}}
- **Status**: {{#if properly_normalized}}✅ Properly normalized{{else}}❌ Normalization error{{/if}}

## Phenomenological Implications

### 4D Gravity
{{#if GNewton_realistic}}
Standard 4D gravity recovered:
- Newton's law valid at large distances
- Corrections suppressed by (r/L)² where L ~ {{L_extra}}
- Compatible with solar system tests
{{else}}
Modified gravity signatures:
- G_eff = {{GNewton}} × G_standard
- {{#if GNewton_large}}Enhanced gravitational effects{{else}}Suppressed gravitational effects{{/if}}
- Requires fine-tuning or new physics
{{/if}}

### KK Tower
Expected KK graviton masses:
- m_n ≈ n × {{kk_scale}} TeV
- First excitation: m_1 ≈ {{m1_kk}} TeV
- {{#if accessible_lhc}}Potentially accessible at colliders{{else}}Beyond current collider reach{{/if}}

### Brane Tensions
From Israel junction conditions:
- Positive tension brane at y = -5
- Negative tension brane at y = 5
- Tension ratio: |T₊/T₋| ≈ {{tension_ratio}}

## Numerical Diagnostics

### BVP Solver Performance
{{#if solver_success}}
✓ Convergence achieved
- Nodes used: {{nodes_used}}/1000
- Residual: {{residual}}
- Iterations: {{iterations}}
{{else}}
⚠️ Using fallback solution
- BVP solver failed to converge
- Gaussian approximation: exp(-0.1y²)
- Results approximate only
{{/if}}

### Numerical Stability
- **Condition number**: {{condition_number}}
- **Max derivative**: {{max_derivative}}
- **Grid resolution**: {{#if adequate_resolution}}Adequate{{else}}May need refinement{{/if}}

## Recommendations

{{#if all_good}}
✓ Results physically consistent
✓ Gravity properly localized
✓ Ready for dimensional reduction
{{else}}
Issues to address:
{{#if weak_localization}}
- Consider stronger warping
- Adjust bulk mass parameter
{{/if}}
{{#if abnormal_newton}}
- Fine-tune gauge coupling
- Check coefficient validity
{{/if}}
{{#if numerical_issues}}
- Increase grid resolution
- Adjust solver tolerances
{{/if}}
{{/if}}

## Technical Notes
- Linearized Einstein equations in warped geometry
- Gauge-gravity mixing through warp factor
- Boundary conditions ensure TeV-brane localization