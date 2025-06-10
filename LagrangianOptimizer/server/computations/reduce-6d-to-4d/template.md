# Dimensional Reduction Report

## Test Configuration
- **Date**: {{date}}
- **Session ID**: {{sessionId}}
- **6D Planck Scale**: M₆ = {{M6}}
- **Curvature Scale**: k = {{k}}

## Input Parameters
### 6D Lagrangian Coefficients
- c₀ = {{coeffs.0}}
- c₁ = {{coeffs.1}}
- c₂ = {{coeffs.2}}
- c₃ = {{coeffs.3}}

### Zero-Mode Profile
- **Points**: {{psi0_points}} 
- **Range**: y ∈ [-5, 5]
- **Normalization**: ∫|ψ₀|² dy = {{volume_factor}}

## Test Results

### 4D Planck Mass
- **M_P²**: {{MP2}}
- **M_P**: {{MP}} (in simulation units)
- **Hierarchy**: M_P/M₆ = {{hierarchy_ratio}}

### Effective 4D Operators
{{#each operators}}
- **{{name}}**: {{coeff}}
{{/each}}

### Dimensional Analysis
- **Volume Factor**: {{volume_factor}}
- **Localization Length**: ℓ ≈ {{localization_length}}
- **KK Scale**: m_KK ≈ {{kk_scale}}

## Physical Analysis

### Hierarchy Generation
{{#if large_hierarchy}}
✓ Large hierarchy successfully generated:
- M_P >> M₆ via warped geometry
- Exponential volume suppression
- Addresses hierarchy problem
{{else}}
⚠️ Insufficient hierarchy:
- M_P/M₆ = {{hierarchy_ratio}} (too small)
- Consider stronger warping
- Adjust bulk parameters
{{/if}}

### Operator Structure
#### R² Term
- Coefficient: {{r2_coeff}}
- Origin: 6D Weyl tensor squared
- Suppression: 1/M_P²
- {{#if r2_safe}}Safe from ghosts{{else}}⚠️ May introduce ghosts{{/if}}

#### φ⁴ Self-Interaction  
- Coefficient: {{phi4_coeff}}
- Origin: Bulk scalar potential
- Strength: {{#if phi4_perturbative}}Perturbative{{else}}Non-perturbative{{/if}}

#### φ²R Mixing
- Coefficient: {{phi2r_coeff}}
- Origin: Non-minimal coupling
- Effect: Modifies scalar kinetic term

### Effective Theory Validity
{{#if valid_eft}}
The 4D effective theory is valid below the KK scale:
- Clear scale separation: Λ_UV = m_KK >> m_φ
- Perturbative Wilson coefficients
- Unitary up to m_KK
{{else}}
⚠️ EFT validity concerns:
{{#if coeffs_large}}
- Large Wilson coefficients detected
{{/if}}
{{#if no_separation}}
- Insufficient KK scale separation
{{/if}}
{{/if}}

## Warped Geometry Analysis

### Metric Structure
```
ds² = e^(2A(y)) η_μν dx^μ dx^ν + dy²
```
where A(y) is determined by ψ₀ via:
- A'(y) ∝ |ψ₀(y)|²
- Boundary conditions: A(±L) = 0

### Localization Properties
- **Peak Location**: y_peak = {{peak_location}}
- **Width**: σ_y = {{width}}
- **Localization**: {{#if well_localized}}Strong{{else}}Weak{{/if}}

## Phenomenological Implications

### Low-Energy Physics
- Gravity strength set by M_P
- Higher-derivative corrections ∝ E²/M_P²
- Modified scalar dynamics from φ²R

### Collider Signatures
- KK gravitons at m_KK ≈ {{kk_scale}}
- Enhanced gravitational scattering
- Scalar-graviton mixing effects

### Cosmology
- Modified inflation dynamics
- Dark matter candidates from KK tower
- Extra dimension stabilization required

## Technical Notes
- Integration uses numpy.trapezoid
- Tree-level matching only (1-loop corrections not included)
- Assumes stabilized radion
- Valid for |y| < L with proper boundary conditions