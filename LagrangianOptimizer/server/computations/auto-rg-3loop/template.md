# Auto-RG 3-Loop Analysis Report

## Test Configuration
- **Operators**: `{{operators.length}}` operators analyzed
- **Initial Couplings**: `{{initial_couplings}}`
- **Energy Range**: 6 decades (10⁻³ to 10³ M_Pl)
- **Precision Tools**: SymPy={{sympy_available}}, Numba={{numba_available}}, mpmath={{mpmath_available}}

## Results Summary
- **Success**: `{{success}}`
- **Perturbative Convergence**: `{{is_convergent}}`
- **Fixed Point Stable**: `{{fixed_point_stable}}`
- **UV Safe**: `{{uv_safe}}`
- **IR Safe**: `{{ir_safe}}`
- **Runtime**: `{{runtime}}ms`

## Beta Functions
### 1-Loop
{{#each beta_1loop}}
- β{{@index}}¹ = `{{this}}`
{{/each}}

### 2-Loop
{{#each beta_2loop}}
- β{{@index}}² = `{{this}}`
{{/each}}

### 3-Loop
{{#each beta_3loop}}
- β{{@index}}³ = `{{this}}`
{{/each}}

## Convergence Analysis
- **Max 3-Loop Correction**: `{{max_3loop_correction}}`
- **‖β³‖ at UV**: `{{norm_beta_3loop}}`
- **Final Couplings (3-loop)**: `{{final_couplings_3loop}}`

## Interpretation
{{#if is_convergent}}
{{#if fixed_point_stable}}
✅ **PASSED**: The 3-loop analysis confirms the UV fixed point is genuine. The perturbative expansion converges with max correction {{max_3loop_correction}} < 10⁻³, and the fixed point remains stable at 3-loop order.
{{else}}
❌ **FAILED**: Fixed point instability detected! While the perturbative expansion converges, the UV fixed point becomes unstable at 3-loop order with ‖β³‖ = {{norm_beta_3loop}} > 10⁻³.
{{/if}}
{{else}}
❌ **FAILED**: Large 3-loop corrections ({{max_3loop_correction}} ≥ 10⁻³) indicate breakdown of perturbation theory. The 1-loop fixed point may be a pseudo-fixed-point illusion.
{{/if}}

## Physical Implications
{{#if is_convergent}}
{{#if fixed_point_stable}}
- UV fixed point survives to 3-loop order
- Theory remains predictive at high energies
- No Landau poles or UV pathologies
- Effective theory valid up to Planck scale
{{else}}
- UV fixed point is an artifact of low-order truncation
- Theory may develop Landau poles
- New UV completion needed
- Effective theory breaks down before Planck scale
{{/if}}
{{else}}
- Perturbation theory unreliable
- Strong coupling regime approached
- Non-perturbative methods required
- Theory needs UV completion
{{/if}} 