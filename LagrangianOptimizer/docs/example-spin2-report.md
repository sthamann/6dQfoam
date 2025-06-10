# Spin-2 Zero Mode (Graviton) Test - Test Report

**Test ID:** 550e8400-e29b-41d4-a716-446655440001  
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
- Extra dimension range: y ∈ [-5, 5]
- Grid points: 1000 points
- Integration method: Trapezoidal rule
- BVP solver tolerance: 1e-8

## Warp Factor Parameters
- Mass scale: σ₀ = |c₃|/|c₁| = 0.121292
- Width parameter: w = √(|c₂|/|c₃|) = 2.872356
- Profile: σ(y) = σ₀ exp(-y²/2w²) + 0.1c₄ tanh(y/w)

## Results
**Zero Mode Amplitude:** ψ₀ = 1.0091267578
**4D Newton Constant:** G₄ = 3.3189570823e-03

**Wavefunction Properties:**
- Localization strength: Strong
- Zero mode integral: ∫ ψ₀²(y) dy = 1.0 (normalized)
- Peak position: y_max = 0.0
- Effective width: w_eff = 5.745

## Physical Interpretation
The zero mode amplitude ψ₀ = 1.009127 characterizes how strongly gravity is localized in the extra dimension.

**Strong Localization**: The graviton wavefunction is highly concentrated near the brane (y=0). This indicates effective dimensional reduction from 5D to 4D, with gravity appearing 4-dimensional at low energies.

**4D Newton Constant**: G₄ = 3.319e-03 m³/kg/s²
This is 4.97e+07× stronger than observed gravity. The model predicts excessively strong gravitational interactions.

## Numerical Details
- BVP convergence: Converged
- Boundary conditions: ψ(±5) = < 1e-6
- Normalization: L² normalized
- Fallback method used: No

## Warped Geometry Analysis
- Maximum warp: max|σ(y)| = 0.121292
- Warp gradient: max|σ'(y)| = 0.042234
- AdS radius: R_AdS ≈ 8.245688

## Notes

## Algorithm Details

The Spin-2 Zero Mode test finds the graviton wavefunction in the extra dimension by:

1. **Warp Factor Construction**: 
   σ(y) = σ₀ exp(-y²/2w²) + 0.1c₄ tanh(y/w)
   where σ₀ = |c₃|/|c₁| = 0.121292 and w = √(|c₂|/|c₃|) = 2.872356

2. **Differential Equation**: Solves the zero-mode equation
   ψ''(y) + 2σ'(y)ψ'(y) = 0
   
   This comes from the linearized Einstein equations in the warped geometry:
   ds² = exp(2σ(y))[ημν dx^μ dx^ν] + dy²

3. **Boundary Conditions**: ψ(±5) → 0 (localized in extra dimension)

4. **Normalization**: ∫ ψ₀²(y) dy = 1

5. **4D Newton Constant**: G₄ = κ₆² ∫ ψ₀²(y) dy
   where κ₆² = 3.266e+08

### Physical Significance
- The zero mode ψ₀(y) represents the graviton's profile in the extra dimension
- Strong localization (large ψ₀) indicates gravity is confined near y=0
- G₄ determines the strength of 4D gravity as observed in our universe


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
  "psi0": 1.0091267578125,
  "newtonConstant": 0.0033189570823,
  "deviation": 0.49740719,
  "classification": "passed"
}
```


---
*Generated automatically by the Spin-2 Zero Mode Test module* 