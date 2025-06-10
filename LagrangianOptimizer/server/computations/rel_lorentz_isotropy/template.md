# Lorentz Isotropy Test Report

## Test Configuration
- **Date**: {{date}}
- **Session ID**: {{sessionId}}
- **Test Duration**: {{runtime}} ms
- **Platform**: {{#if gpu_used}}GPU-accelerated{{else}}CPU{{/if}}

## Input Parameters
### Lagrangian Coefficients
- **c₁** (kinetic): {{c1}}
- **c₂** (spatial): {{c2}}
- **c₃** (mass): {{c3}}
- **c₄** (self-interaction): {{c4}}
- **c₅** (field strength): {{c5}}
- **c₆** (gravity coupling): {{c6}}

### Derived Physical Constants
- **Effective c**: {{c_effective}} c₀
- **Fine structure α**: {{alpha_effective}}
- **Mass scale**: {{mass_scale}} GeV

## Test Results

### Lorentz Violation Metric
- **ε**: {{epsilon}}
- **Quality**: {{#if excellent}}✅ Excellent{{else if good}}✅ Good{{else if moderate}}⚠️ Moderate{{else}}❌ Poor{{/if}}
- **σ(ε)**: {{epsilon_error}} (statistical uncertainty)

### Energy Distribution Analysis
| Direction | Energy | Deviation | Ratio |
|-----------|--------|-----------|-------|
| X | {{energy_x}} | {{dev_x}}% | {{ratio_x}} |
| Y | {{energy_y}} | {{dev_y}}% | {{ratio_y}} |
| Z | {{energy_z}} | {{dev_z}}% | {{ratio_z}} |

- **Mean**: {{mean_energy}}
- **Std Dev**: {{energy_stddev}}
- **Anisotropy**: {{anisotropy_factor}}

## Physical Analysis

### Lorentz Symmetry Status
{{#if excellent}}
✅ **Excellent Lorentz invariance preserved**
- ε = {{epsilon}} < 10⁻⁶
- Compatible with all experimental bounds
- No detectable preferred frame
- Standard Model physics maintained
{{else if good}}
✅ **Good Lorentz invariance**
- ε = {{epsilon}} in range [10⁻⁶, 10⁻⁴]
- Within indirect experimental bounds
- Minor directional preferences: {{preferred_dir}}
- Negligible phenomenological impact
{{else if moderate}}
⚠️ **Moderate Lorentz violation detected**
- ε = {{epsilon}} in range [10⁻⁴, 10⁻²]
- Exceeds some experimental bounds
- Clear preferred direction: {{preferred_dir}}
- Observable effects possible in:
  {{#each observable_effects}}
  - {{this}}
  {{/each}}
{{else}}
❌ **Strong Lorentz violation**
- ε = {{epsilon}} > 10⁻²
- Grossly exceeds all bounds
- Dominant direction: {{dominant_dir}}
- Theory likely unphysical or numerical error
{{/if}}

### Directional Analysis
{{#if anisotropic}}
**Anisotropic propagation detected:**
- Primary axis: {{primary_axis}} ({{primary_enhancement}}% enhanced)
- Secondary axis: {{secondary_axis}} ({{secondary_enhancement}}% enhanced)
- Suppressed axis: {{suppressed_axis}} ({{suppression}}% reduced)

**Angular dependence:**
```
ε(θ,φ) ≈ ε₀[1 + A₂Y₂₀(θ) + Σ A₂ₘY₂ₘ(θ,φ)]
```
- Monopole: ε₀ = {{monopole}}
- Quadrupole: A₂ = {{quadrupole}}
{{else}}
✓ Isotropic propagation confirmed
- All directions equivalent within {{isotropy_tolerance}}%
- No angular dependence detected
{{/if}}

## Time Evolution Diagnostics

### Field Dynamics
- **Initial amplitude**: {{initial_amplitude}}
- **Final amplitude**: {{final_amplitude}}
- **Dispersion**: {{#if normal_dispersion}}Normal{{else}}Anomalous{{/if}}
- **Wave packet spreading**: {{spreading_rate}} /time

### Numerical Stability
- **Energy conservation**: ΔE/E = {{energy_drift}}
- **RK45 steps taken**: {{rk45_steps}}
- **Average dt**: {{avg_timestep}}
- **Min/Max dt**: {{min_timestep}}/{{max_timestep}}

### Convergence Metrics
- **Relative tolerance achieved**: {{rel_tol_achieved}}
- **Absolute tolerance achieved**: {{abs_tol_achieved}}
- **Failed steps**: {{failed_steps}}
- **Stability**: {{#if stable}}✅ Stable{{else}}⚠️ Marginal{{/if}}

## Phenomenological Implications

### Experimental Constraints
Current bounds vs. measured value:
| Sector | Experimental Bound | This Test | Status |
|--------|-------------------|-----------|---------|
| Photon | < 10⁻¹⁹ | {{photon_equiv}} | {{photon_status}} |
| Electron | < 10⁻¹⁵ | {{electron_equiv}} | {{electron_status}} |
| Nucleon | < 10⁻³² | {{nucleon_equiv}} | {{nucleon_status}} |
| Gravity | < 10⁻⁷ | {{gravity_equiv}} | {{gravity_status}} |

### Observable Signatures
{{#if violations_observable}}
Potential experimental signatures:
{{#if birefringence}}
- **Vacuum birefringence**: Δn ≈ {{birefringence_index}}
  - Observable in: {{birefringence_experiments}}
{{/if}}
{{#if dispersion_mod}}
- **Modified dispersion**: ω² = k²[1 + {{dispersion_coeff}}(k/M_P)ⁿ]
  - n = {{dispersion_power}}
  - Energy scale: {{dispersion_scale}} GeV
{{/if}}
{{#if threshold_shift}}
- **Threshold anomalies**: 
  - GZK cutoff shift: {{gzk_shift}} EeV
  - Pair production: {{pair_threshold}} TeV
{{/if}}
{{else}}
No observable signatures at current experimental precision.
{{/if}}

## Advanced Diagnostics

### Fourier Analysis
Momentum space energy distribution:
- **Peak k**: {{peak_momentum}}
- **Width Δk**: {{momentum_width}}
- **UV cutoff effects**: {{#if uv_effects}}Present above k = {{uv_scale}}{{else}}Negligible{{/if}}

### Statistical Properties
- **Field distribution**: {{#if gaussian}}Gaussian{{else}}Non-Gaussian (κ = {{kurtosis}}){{/if}}
- **Correlation length**: ξ = {{correlation_length}}
- **Ergodicity**: {{#if ergodic}}Satisfied{{else}}Violated{{/if}}

## Recommendations

{{#if excellent}}
### ✅ Theory Validation Complete
- Lorentz invariance confirmed to high precision
- Safe for phenomenological studies
- No parameter adjustments needed
{{else if good}}
### ✅ Theory Acceptable
- Minor fine-tuning may improve isotropy:
  - Adjust c₂ by {{c2_adjustment}}
  - Or modify anisotropy parameters
{{else}}
### ⚠️ Parameter Adjustment Required
To restore Lorentz invariance:
1. **Option A**: Set all spatial coefficients equal
   - c₂ₓ = c₂ᵧ = c₂ᵤ = {{recommended_c2}}
2. **Option B**: Apply corrections
   {{#each corrections}}
   - {{this}}
   {{/each}}
3. **Option C**: Check for numerical issues
   - Increase grid resolution
   - Reduce time step
   - Verify coefficient values
{{/if}}

## Technical Notes
- Grid: 32³ with periodic boundaries  
- Initial condition: Gaussian, σ = 3.2 grid units
- Random seed: {{random_seed}}
- Compiler: {{#if optimized}}Optimized (-O3){{else}}Debug mode{{/if}}

---
*Report generated by Lorentz Isotropy Test Module v2.0*