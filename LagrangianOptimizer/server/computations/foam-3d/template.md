# 3D Lorentz Isotropy Test Report

## Test Configuration
- **Date**: {{date}}
- **Session ID**: {{sessionId}}
- **Lattice**: 32³ cubic grid
- **Time Steps**: 100
- **Platform**: {{#if gpu_used}}GPU (CuPy){{else}}CPU (NumPy){{/if}}

## Input Coefficients
- **c_tt**: {{c_tt}} (temporal)
- **c_xx**: {{c_xx}} (x-direction)
- **c_yy**: {{c_yy}} (y-direction)
- **c_zz**: {{c_zz}} (z-direction)
- **c_xy**: {{c_xy}} (mixed term)

## Test Results

### Isotropy Measure
- **Anisotropy**: {{anisotropy}}
- **Result**: {{#if isotropy_passed}}✅ PASSED{{else}}❌ FAILED{{/if}}

### Directional Variances
- **X-direction**: {{variance_x}}
- **Y-direction**: {{variance_y}}
- **Z-direction**: {{variance_z}}
- **Max/Min ratio**: {{max_min_ratio}}

## Physical Analysis

### Symmetry Assessment
{{#if isotropy_passed}}
✓ **Lorentz isotropy preserved**:
- All spatial directions statistically equivalent
- Variance differences < 10%
- No preferred direction detected
{{else}}
⚠️ **Lorentz violation detected**:
- Anisotropy = {{anisotropy}} exceeds threshold
- Preferred direction: {{preferred_direction}}
- Symmetry breaking magnitude: {{breaking_percent}}%
{{/if}}

### Coefficient Analysis
{{#if coeffs_equal}}
✓ Spatial coefficients equal: c_xx = c_yy = c_zz = {{c_xx}}
- Theory respects 3D rotational symmetry
- Standard isotropic propagation
{{else}}
⚠️ Anisotropic coefficients detected:
{{#if x_enhanced}}
- X-direction enhanced: c_xx/c_yy = {{cxx_cyy_ratio}}
{{/if}}
{{#if y_enhanced}}
- Y-direction enhanced: c_yy/c_xx = {{cyy_cxx_ratio}}
{{/if}}
{{#if z_enhanced}}
- Z-direction enhanced: c_zz/c_xx = {{czz_cxx_ratio}}
{{/if}}
{{/if}}

### Field Evolution Characteristics
After {{steps}} time steps:
- **Mean field**: ⟨φ⟩ = {{mean_field}}
- **RMS fluctuation**: σ_φ = {{rms_field}}
- **Energy density**: ε ≈ {{energy_density}}

## Variance Distribution

### Spatial Homogeneity
Central region (25%-75% of lattice):
{{#if homogeneous}}
✓ Homogeneous fluctuations
- Variance uniform within {{homogeneity_percent}}%
- No spatial clustering
{{else}}
⚠️ Inhomogeneous distribution:
- Variance gradient detected
- Possible boundary effects
{{/if}}

### Statistical Properties
- **Kurtosis**: {{kurtosis}} {{#if gaussian_like}}(near-Gaussian){{/if}}
- **Skewness**: {{skewness}} {{#if symmetric}}(symmetric){{/if}}
- **Correlation length**: ξ ≈ {{correlation_length}} lattice units

## Phenomenological Implications

### Lorentz Violation Bounds
{{#if isotropy_passed}}
The results are consistent with stringent Lorentz invariance:
- |c_ii - 1| < {{lorentz_bound}}
- Compatible with experimental limits
- No observable CPT violation expected
{{else}}
Potential Lorentz violation signatures:
- Anisotropy level: {{anisotropy}}
- Would manifest in:
  - Direction-dependent light speed
  - Modified dispersion relations
  - Preferred frame effects
- Current bounds: |δc/c| < 10^-19 (violated)
{{/if}}

### Modified Dispersion
For plane waves k⃗:
- **Standard**: ω² = k²
- **Modified**: ω² = c_xx k_x² + c_yy k_y² + c_zz k_z²
- **Deviation**: δω/ω ≈ {{dispersion_deviation}}

### Observable Consequences
{{#if isotropy_passed}}
✓ Standard physics preserved:
- Isotropic wave propagation
- No birefringence
- Rotation invariance maintained
{{else}}
Modified phenomenology expected:
{{#if cosmic_ray_effects}}
- Ultra-high energy cosmic ray threshold shift
{{/if}}
{{#if photon_effects}}
- Vacuum birefringence for γ-rays
{{/if}}
{{#if neutrino_effects}}
- Direction-dependent neutrino oscillations
{{/if}}
{{/if}}

## Numerical Diagnostics

### Stability Analysis
- **CFL number**: ν = {{cfl_number}}
- **Energy conservation**: ΔE/E = {{energy_drift}}
- **Numerical diffusion**: {{#if low_diffusion}}Negligible{{else}}Present{{/if}}

### Convergence Check
Grid resolution test:
- 16³: Anisotropy = {{aniso_16}}
- 32³: Anisotropy = {{anisotropy}} (current)
- Extrapolated (∞): {{aniso_extrapolated}}
- **Converged**: {{#if converged}}Yes{{else}}No - finer grid needed{{/if}}

## Recommendations

{{#if isotropy_passed}}
### For Standard Model Extension
✓ Current coefficients maintain Lorentz invariance
✓ Safe for phenomenological studies
✓ No fine-tuning required
{{else}}
### Parameter Adjustments
To restore isotropy:
1. Set c_xx = c_yy = c_zz = {{recommended_c}}
2. Or apply corrections:
   - δc_xx = {{delta_cxx}}
   - δc_yy = {{delta_cyy}}
   - δc_zz = {{delta_czz}}
{{/if}}

### Further Tests
{{#if test_mixed_terms}}
- Include c_xy, c_xz, c_yz mixed derivatives
{{/if}}
{{#if test_higher_order}}
- Add higher-order operators (∇⁴, ∇⁶)
{{/if}}
{{#if test_nonlinear}}
- Include nonlinear terms (φ³, φ|∇φ|²)
{{/if}}

## Technical Notes
- Random seed: 42 (reproducible)
- Periodic boundary conditions
- Central differencing scheme
- No absorbing boundaries