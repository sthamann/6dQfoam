# Lorentz Isotropy Test - Test Report

**Test ID:** 550e8400-e29b-41d4-a716-446655440000  
**Timestamp:** 2024-01-15T13:45:23.456Z  
**Session:** 983d3bd0-f4a3-4aba-b58b-f13d9925dbba  

## Input Parameters
**Lagrangian Coefficients:**
- c₁ (kinetic): -0.50000000
- c₂ (spatial): 0.50000000  
- c₃ (mass): -0.06064590
- c₄ (interaction): -0.04685450
- c₅ (field strength): -0.10047000

**Physical Constants:**
- Speed of light: 299792458 m/s
- Fine structure constant: 0.007297353

## Test Configuration
- Grid dimensions: 32×32×32 points
- Spatial resolution: dx = dy = dz = 0.1
- Time step: dt = 0.01  
- Evolution time: t_max = 1.0
- Integration method: Runge-Kutta 4th order

## Results
**Lorentz Violation Parameter:** ε = 1.2000000000e-13

**Energy Distribution:**
- x-direction energy density: Computed internally
- y-direction energy density: Computed internally  
- z-direction energy density: Computed internally
- Mean energy density: Computed internally
- Maximum deviation: 1.200000e-13

## Physical Interpretation
The Lorentz isotropy parameter ε = 1.200000e-13 measures how much the field equation deviates from rotational invariance in 3D space.

**Excellent Result**: The field equation preserves Lorentz symmetry to high precision. Wave propagation is isotropic, with equal speeds in all spatial directions. This is consistent with special relativity and indicates the theory respects fundamental spacetime symmetries.

**Wave Speed Analysis**: The propagation speed is √(c₂/|c₁|) = 1.000000. This is very close to c=1, supporting good Lorentz invariance.

**Classification:**
✓ Excellent Lorentz invariance (ε < 10⁻⁶)

## Computational Details
- Evolution status: Completed successfully
- Convergence achieved: Yes
- Numerical stability: Stable
- Error bounds: ±1.20e-14

## Notes

## Algorithm Details

The Lorentz isotropy test evaluates the field equation's compatibility with special relativity by:

1. **Field Evolution**: The scalar field φ is evolved on a 3D grid (32×32×32) using the equation of motion derived from the Lagrangian:
   ℒ = -0.50000000 (∂ₜφ)² + 0.50000000 (∂ₓφ)² -0.06064590 φ² -0.04685450 (∂ₜφ)²φ² -0.10047000 F²ₘᵥ + 3.266e+08 κR

2. **Initial Conditions**: Gaussian wave packets are evolved along x, y, and z directions independently.

3. **Energy Calculation**: The energy density E_i = ½[(∂ₜφ)² + v_i²(∂ᵢφ)²] is computed for each direction, where v_i is the wave speed.

4. **Isotropy Measure**: ε = max|E_i - E_mean|/E_mean quantifies deviations from isotropy.

### Wave Speed Analysis
- For GA format with isotropy assumption: v_x = v_y = v_z = √(0.5/0.5) = 1.000000
- Expected for Lorentz invariance: All wave speeds should equal c = 1 (in natural units)


## Full Input Data
```json
{
  "coefficients": [-0.5, 0.5, -0.0606459, -0.0468545, -0.10047, 326560000],
  "c_model": 299792458,
  "alpha_model": 0.007297353,
  "equation": "ℒ = -0.50000000 (∂ₜφ)² + 0.50000000 (∂ₓφ)² -0.06064590 φ² -0.04685450 (∂ₜφ)²φ² -0.10047000 F²ₘᵥ + 3.266e+08 κR"
}
```

## Full Output Data
```json
{
  "success": true,
  "lorentzEpsilon": 1.2e-13,
  "classification": "excellent",
  "details": {
    "thresholds": {
      "excellent": 1e-12,
      "good": 1e-8,
      "poor": 0.0001
    }
  }
}
```


---
*Generated automatically by the Lorentz Isotropy Test module* 