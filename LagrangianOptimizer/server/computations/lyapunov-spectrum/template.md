# Lyapunov Spectrum Analysis Report

## Test Configuration
- **Coefficients**: `{{coeffs}}`
- **Grid Size**: `{{grid_size}}`
- **Time Steps**: `{{timesteps}}`
- **GPU Acceleration**: `{{gpu_used}}`

## Results Summary
- **Success**: `{{success}}`
- **System Stable**: `{{is_stable}}`
- **Dynamics Type**: `{{dynamics_type}}`
- **Max Lyapunov Exponent**: `{{max_lyapunov}}`
- **Runtime**: `{{runtime}}ms`

## Lyapunov Spectrum
{{#each lyapunov_spectrum}}
- **λ{{@index}}**: `{{this}}`
{{/each}}

## Interpretation
{{#if is_stable}}
✅ **PASSED**: The 6D foam exhibits quasi-periodic dynamics. The maximum Lyapunov exponent λ₁ = {{max_lyapunov}} < 0, indicating the system is dynamically stable and will not develop chaotic behavior or caustics.
{{else}}
❌ **FAILED**: Chaos onset detected! The maximum Lyapunov exponent λ₁ = {{max_lyapunov}} ≥ 0, indicating the system will develop chaotic dynamics. This could lead to caustic formation and breakdown of the effective theory.
{{/if}}

## Physical Implications
{{#if is_stable}}
- Perturbations decay exponentially
- Long-term predictability maintained
- No caustic formation expected
- Effective field theory remains valid
{{else}}
- Exponential growth of perturbations
- Loss of predictability on timescale ~ 1/λ₁
- Risk of caustic formation
- Effective theory may break down
{{/if}} 