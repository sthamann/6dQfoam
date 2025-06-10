# Inflation Compatibility Test Report

## Test Configuration
- **Date**: {{date}}
- **Session ID**: {{sessionId}}
- **Inflaton Mass**: m² = {{m2}}
- **Planck Mass**: M_P = {{MP}}

## Test Results

### CMB Observables
- **Spectral Index**: n_s = {{n_s}}
- **Tensor-to-Scalar Ratio**: r = {{r}}
- **Compatibility**: {{#if compatible}}✅ COMPATIBLE{{else}}❌ INCOMPATIBLE{{/if}}

### Observational Constraints
- **Planck 2018**: n_s = 0.9649 ± 0.0042
- **Measured**: n_s = {{n_s}}
- **Deviation**: Δn_s = {{ns_deviation}} ({{ns_sigma}}σ)
- **Tensor Bound**: r < 0.056 (95% CL)
- **Predicted**: r = {{r}} {{#if r_ok}}✓{{else}}✗{{/if}}

## Inflationary Dynamics

### Slow-Roll Parameters
- **ε**: {{epsilon}} {{#if epsilon_ok}}(ε << 1 ✓){{else}}(too large ✗){{/if}}
- **η**: {{eta}} {{#if eta_ok}}(|η| << 1 ✓){{else}}(too large ✗){{/if}}

### Field Evolution
- **Initial φ**: {{phi_initial}} M_P
- **Final φ**: {{phi_end}} M_P
- **e-foldings**: N = {{efolds}}

### Energy Scales
- **Inflation Scale**: V^(1/4) = {{inflation_scale}} GeV
- **Hubble during Inflation**: H = {{hubble_inflation}} GeV
- **Reheating Temperature**: T_rh ≈ {{reheating_temp}} GeV

## Physical Analysis

### CMB Compatibility
{{#if compatible}}
The model successfully reproduces observed CMB anisotropies:
- Spectral index within {{ns_sigma}}σ of Planck measurement
- Tensor-to-scalar ratio below current bounds
- Consistent with scale-invariant spectrum with small red tilt
{{else}}
⚠️ The model fails to match CMB observations:
{{#if ns_bad}}
- Spectral index deviates by {{ns_sigma}}σ from Planck
- Predicted: n_s = {{n_s}}, Observed: 0.9649 ± 0.0042
{{/if}}
{{#if r_bad}}
- Tensor-to-scalar ratio exceeds bounds: r = {{r}} > 0.056
- Model predicts excessive gravitational waves
{{/if}}
{{/if}}

### Inflation Mechanism
{{#if compatible}}
Successful φ² chaotic inflation:
- Slow-roll maintained for {{efolds}} e-foldings
- Quantum fluctuations seed structure formation
- Natural exit to reheating phase
{{else}}
Issues with inflationary dynamics:
{{#if efolds_insufficient}}
- Insufficient e-foldings: N = {{efolds}} < 50
{{/if}}
{{#if slow_roll_violated}}
- Slow-roll conditions violated
{{/if}}
{{/if}}

## Cosmological Implications

### Early Universe
{{#if compatible}}
✓ Solves horizon and flatness problems
✓ Generates nearly scale-invariant perturbations
✓ Predicts detectable but small gravitational waves
✓ Natural initial conditions from quantum fluctuations
{{else}}
The model cannot serve as a viable inflation candidate:
- Adjust mass parameter m²
- Consider alternative potentials
- Include additional scalar fields
{{/if}}

### Observational Predictions
- **Primordial Non-Gaussianity**: f_NL ~ O(ε,η) ≈ {{fnl_estimate}}
- **Running**: dn_s/dlnk ≈ {{running_estimate}}
- **Gravitational Wave Spectrum**: Ω_GW h² ≈ {{gw_spectrum}}

## Technical Notes
- Simple φ² potential: V = ½m²φ²
- Slow-roll approximation valid for φ >> M_P
- Horizon exit at N = 50-60 e-foldings before end
- Consistency relation: r ≈ 8(1-n_s)