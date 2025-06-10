# Spin-2 Zero Mode Analysis Report

## Test Configuration
- **Date**: {{date}}
- **Session ID**: {{sessionId}}
- **Test Duration**: {{runtime}} ms
- **Solver Status**: {{#if solver_success}}✅ Converged{{else}}⚠️ Using fallback{{/if}}

## Input Parameters
### Lagrangian Coefficients
- **c₁** (kinetic): {{c1}}
- **c₂** (spatial): {{c2}}
- **c₃** (mass): {{c3}}
- **c₄** (self-interaction): {{c4}}
- **c₅** (field strength): {{c5}}
- **c₆** (gravity coupling): {{c6}}

### Derived Scales
- **Mass scale**: m = {{mass_scale}} (units of k)
- **Width parameter**: w = {{width_param}}
- **Coupling strength**: g = {{coupling_strength}}

## Test Results

### Newton Constant
- **G₄**: {{G_Newton}}
- **G₄/G_obs**: {{G_ratio}}
- **Status**: {{#if realistic_G}}✅ Realistic{{else if enhanced_G}}⚠️ Enhanced{{else if suppressed_G}}⚠️ Suppressed{{else}}❌ Unphysical{{/if}}

### Zero Mode Profile
- **Peak amplitude**: ψ₀(0) = {{psi0_peak}}
- **Localization**: {{#if strong_loc}}Strong{{else if moderate_loc}}Moderate{{else}}Weak{{/if}}
- **FWHM**: {{fwhm}}
- **Decay length**: ℓ = {{decay_length}}

## Warp Factor Analysis

### Profile Characteristics
```
σ(y) = {{sigma_0}} exp(-y²/{{2w2}}) + {{strength}} tanh(y/{{w}})
```

- **Central value**: σ(0) = {{sigma_center}}
- **Asymptotic values**: σ(±5) ≈ {{sigma_asymptotic}}
- **Maximum gradient**: |dσ/dy|_max = {{max_gradient}}
- **Curvature scale**: k = {{curvature_scale}}

### Geometry Type
{{#if ads_like}}
**Near AdS₅ geometry detected:**
- Effective AdS radius: L_AdS ≈ {{ads_radius}}
- Deviation from pure AdS: {{ads_deviation}}%
- Conformal factor: e^(2σ) varies by {{conformal_range}} orders
{{else if rs_like}}
**Randall-Sundrum type geometry:**
- UV brane location: y_UV ≈ {{uv_brane}}
- IR brane location: y_IR ≈ {{ir_brane}}
- Hierarchy factor: e^(kπr_c) ≈ {{hierarchy}}
{{else}}
**Non-standard warping:**
- Complex profile with multiple scales
- Primary scale: {{primary_scale}}
- Secondary features at: {{secondary_scales}}
{{/if}}

## Physical Analysis

### Graviton Localization
{{#if well_localized}}
✅ **Excellent graviton localization**
- Zero mode confined within |y| < {{confinement_scale}}
- Exponential suppression: ψ ∝ exp(-{{suppression_rate}}|y|)
- 4D effective theory valid up to {{cutoff_scale}} TeV
{{else if partially_localized}}
⚠️ **Partial graviton localization**
- Significant wavefunction at |y| > {{spread_scale}}
- Power-law tail: ψ ∝ |y|^(-{{power_index}})
- Modified gravity at distances < {{modification_scale}} mm
{{else}}
❌ **Poor graviton localization**
- Wavefunction spread throughout bulk
- No clear 4D limit
- Requires alternative mechanism
{{/if}}

### Hierarchy Generation
{{#if large_hierarchy}}
**Large hierarchy achieved:**
- M_Planck/M_TeV ≈ {{hierarchy_ratio}}
- Natural solution to gauge hierarchy problem
- TeV scale phenomenology preserved
{{else}}
**Insufficient hierarchy:**
- M_Planck/M_TeV ≈ {{hierarchy_ratio}}
- Fine-tuning required: {{fine_tuning_percent}}%
- Consider stronger warping
{{/if}}

### KK Spectrum Estimate
First few KK modes:
| Mode | Mass (TeV) | Coupling to SM |
|------|------------|----------------|
| n=0 | 0 (massless) | {{coupling_0}} |
| n=1 | {{m_kk1}} | {{coupling_1}} |
| n=2 | {{m_kk2}} | {{coupling_2}} |
| n=3 | {{m_kk3}} | {{coupling_3}} |

**Gap**: m₁/m₀ = ∞ (clean separation)

## Numerical Diagnostics

### BVP Solver Performance
{{#if solver_success}}
✅ **Successful convergence**
- Final residual: {{residual}}
- Mesh points used: {{mesh_points}}
- Max refinement level: {{refinement_level}}
- Condition number: {{condition_number}}
{{else}}
⚠️ **Using analytical fallback**
- BVP failed: {{failure_reason}}
- Gaussian approximation: ψ ≈ exp(-{{gauss_param}}y²)
- Accuracy: {{fallback_accuracy}}%
{{/if}}

### Integration Quality
- **Method**: {{#if simpson}}Simpson's rule{{else}}Trapezoidal{{/if}}
- **Grid spacing**: Δy = {{grid_spacing}}
- **Boundary truncation**: < {{boundary_error}}
- **Total integral error**: < {{integral_error}}

## Phenomenological Implications

### Collider Signatures
{{#if accessible_lhc}}
**LHC accessible KK modes:**
- First KK graviton: {{m_kk1}} TeV
- Production cross section: σ ≈ {{sigma_kk1}} fb
- Decay channels: {{decay_channels}}
- Discovery reach: {{discovery_luminosity}} fb⁻¹
{{else}}
**Beyond LHC reach:**
- First KK mode at {{m_kk1}} TeV
- Requires {{required_energy}} TeV collider
{{/if}}

### Gravity Modifications
{{#if standard_gravity}}
✓ Standard 4D gravity at all observable scales
{{else}}
**Modified gravity regime:**
- Deviation scale: r < {{deviation_scale}}
- Extra force: F ∝ 1/r^(2+{{extra_dim_contribution}})
- Table-top experiments: {{#if testable}}Potentially observable{{else}}Too small{{/if}}
{{/if}}

### Cosmological Consequences
- **Radion mass**: m_r ≈ {{radion_mass}} GeV
- **Radion coupling**: ξ = {{radion_coupling}}
- **Early universe**: {{#if stable_cosmology}}Standard evolution{{else}}Modified at T > {{modification_temp}} GeV{{/if}}
- **Dark matter**: {{#if dm_candidate}}KK states viable{{else}}Not from KK tower{{/if}}

## Recommendations

{{#if all_good}}
### ✅ Model Validated
- Realistic Newton constant achieved
- Strong graviton localization confirmed
- Ready for phenomenological studies
{{else}}
### ⚠️ Parameter Adjustments Suggested
{{#if weak_gravity}}
To enhance gravity:
1. Increase warp factor gradient
2. Reduce bulk volume
3. Suggested adjustments:
   - σ₀ → {{suggested_sigma0}}
   - w → {{suggested_width}}
{{/if}}
{{#if poor_localization}}
To improve localization:
1. Sharpen warp factor profile
2. Add stabilizing potential
3. Consider modified ansatz
{{/if}}
{{/if}}

## Technical Notes
- Extra dimension: y ∈ [-5, 5] (proper distance)
- Coordinate system: Conformal to AdS₅
- Metric signature: (-,+,+,+,+)
- Boundary conditions: Dirichlet at y = ±5

---
*Report generated by Spin-2 Zero Mode Analysis v2.0*