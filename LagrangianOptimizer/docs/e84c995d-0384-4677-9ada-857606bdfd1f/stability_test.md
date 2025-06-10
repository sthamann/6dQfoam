# Energy Conservation Test Report

## Test Configuration
- **Date**: {{date}}
- **Session ID**: e84c995d-0384-4677-9ada-857606bdfd1f
- **Lattice Size**: 128³
- **Time Steps**: 10,000
- **dt/dx**: 0.1
- **Mass Parameter**: m² = {{m2}}

## Test Results

### Energy Conservation
- **Initial Energy**: E₀ = {{e0}}
- **Final Energy**: E₁ = {{e1}}
- **Energy Ratio**: E₁/E₀ = {{energyRatio}}
- **Result**: {{#if passed}}✅ PASSED{{else}}❌ FAILED{{/if}}

### Performance Metrics
- **Runtime**: 331981 seconds
- **Platform**: {{#if gpu}}GPU (CuPy){{else}}CPU (NumPy){{/if}}
- **Steps/second**: {{steps_per_second}}

## Physical Analysis

### Stability Assessment
{{#if excellent}}
✓ **Excellent stability**: Energy drift < 0.1%
- Symplectic integrator working perfectly
- Time step well within stability limit
- Field evolution physically reliable
{{else if good}}
✓ **Good stability**: Energy drift < 1%
- Minor numerical errors accumulating
- Results trustworthy for most applications
- Consider smaller time step for precision work
{{else if marginal}}
⚠️ **Marginal stability**: Energy drift ~{{energy_drift}}%
- Significant energy non-conservation
- Time step may be too large
- Results qualitatively correct only
{{else}}
❌ **Unstable evolution**: Energy ratio = {{energyRatio}}
- Catastrophic energy growth/decay
- Numerical scheme failing
- Results physically meaningless
{{/if}}

### Energy Components
Initial state breakdown:
- **Kinetic**: {{kinetic_0}} ({{kinetic_percent_0}}%)
- **Gradient**: {{gradient_0}} ({{gradient_percent_0}}%)
- **Potential**: {{potential_0}} ({{potential_percent_0}}%)

Final state breakdown:
- **Kinetic**: {{kinetic_1}} ({{kinetic_percent_1}}%)
- **Gradient**: {{gradient_1}} ({{gradient_percent_1}}%)
- **Potential**: {{potential_1}} ({{potential_percent_1}}%)

### Numerical Diagnostics

#### CFL Condition
- **Effective CFL**: ν = dt/dx = 0.1
- **Stability bound**: ν < 1/√3 ≈ 0.577
- **Safety margin**: {{cfl_margin}}%

#### Integration Quality
{{#if symplectic_preserved}}
✓ Phase space volume preserved
✓ Time-reversible dynamics
✓ No secular energy drift
{{else}}
⚠️ Symplectic structure degraded:
- Check implementation of leap-frog
- Verify boundary conditions
- Consider double precision
{{/if}}

## Field Evolution

### Initial Conditions
- Random fluctuations: σ = 10⁻⁴
- Zero momentum: π(0) = 0
- Energy equipartition expected

### Time Evolution
After {{steps}} steps (t = {{total_time}}):
{{#if stable_evolution}}
- Field maintains bounded oscillations
- No runaway modes detected
- Statistical equilibrium reached
{{else}}
- {{#if growing}}Exponential growth detected{{/if}}
- {{#if damping}}Unexpected damping observed{{/if}}
- {{#if chaotic}}Chaotic behavior emerging{{/if}}
{{/if}}

### Spectral Analysis
Dominant modes:
- **k = 0**: {{k0_amplitude}} (homogeneous mode)
- **k = 2π/L**: {{k1_amplitude}} (fundamental)
- **k_max = π/dx**: {{kmax_amplitude}} (lattice cutoff)

## Recommendations

{{#if passed}}
### For Production Runs
✓ Current parameters suitable for:
- Long-time evolution studies
- Correlation function measurements
- Non-linear dynamics exploration
{{else}}
### Parameter Adjustments Needed
{{#if dt_too_large}}
1. Reduce time step: Try dt = {{recommended_dt}}
{{/if}}
{{#if lattice_too_coarse}}
2. Increase resolution: Consider 256³ lattice
{{/if}}
{{#if mass_problematic}}
3. Check mass parameter: m² = {{m2}} may be too {{#if m2_large}}large{{else}}small{{/if}}
{{/if}}
{{/if}}

### Optimization Suggestions
{{#if gpu}}
- GPU acceleration active ✓
- Consider multi-GPU for larger lattices
{{else}}
- Enable GPU support: `pip install cupy`
- Expected speedup: ~100x
{{/if}}

## Technical Notes
- Leap-frog integrator: 2nd order accurate
- Periodic boundary conditions
- 6-point Laplacian stencil
- Random seed: 0 (reproducible)