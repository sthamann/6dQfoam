# Spin-2 Zero Mode (Graviton) Test

## Overview
This test computes the 4D Newton constant by solving for the graviton zero mode wavefunction in extra dimensions using warped product geometry. It implements the Randall-Sundrum mechanism for generating hierarchies through warped extra dimensions.

## Physics Background

### Extra-Dimensional Gravity
In theories with extra dimensions, gravity can propagate into the bulk while Standard Model fields are confined to a 4D brane. The strength of 4D gravity is determined by:
- The overlap of graviton zero modes with the brane location
- The warping of the extra-dimensional metric
- The proper normalization of the zero mode

### Graviton Zero Mode Equation
The spin-2 (graviton) zero mode satisfies:
```
ψ''(y) + 2σ'(y)ψ'(y) = 0
```

This can be rewritten as:
```
d/dy[e^(2σ(y)) dψ/dy] = 0
```

Where:
- `ψ(y)` is the graviton zero mode wavefunction
- `σ(y)` is the warp factor: ds² = e^(2σ(y))η_μν dx^μ dx^ν + dy²
- `y` is the extra-dimensional coordinate

## Implementation Details

### Warp Factor Construction
The warp factor is built from Lagrangian coefficient ratios to ensure dimensional consistency:

```python
# Extract dimensionless ratios
mass_scale = |c₃|/|c₁|      # Mass/kinetic ratio
width_param = √(|c₂|/|c₃|)  # Spatial/mass ratio
strength = c₄/|c₁|          # Self-interaction strength

# Construct warp factor
σ(y) = σ₀ exp(-y²/2w²) + strength × tanh(y/w)
```

Components:
- **Gaussian term**: Primary localization mechanism
- **Tanh term**: Asymmetric correction for realistic warping
- **σ₀**: Overall normalization scale

### Boundary Value Problem
The BVP is solved with:
- **Domain**: y ∈ [-5, 5] (in units of 1/k where k is the curvature scale)
- **Boundary conditions**: 
  - ψ(-5) → 0 (UV brane)
  - ψ(+5) → 0 (IR brane)
  - Alternative: ψ(0) = 1 (normalization at y=0)
- **Grid**: 1000 points for high resolution

### Newton Constant Calculation
The effective 4D Newton constant is:
```
G₄ = κ₆²/M_P² = κ₆² ∫_{-∞}^{∞} e^(2σ(y)) ψ₀²(y) dy
```

Where:
- κ₆ = √(8πG₆) is the 6D gravitational coupling
- M_P is the 4D Planck mass
- The integral gives the effective volume of the extra dimension

### Numerical Methods
1. **Primary solver**: `scipy.solve_bvp`
   - Tolerance: 1e-8
   - Max nodes: 5000
   - Collocation method with automatic mesh refinement
   
2. **Fallback**: Analytical approximation
   - Gaussian ansatz: ψ(y) = A exp(-B y²)
   - Parameters fitted to match boundary conditions

## Physical Regimes

### Zero Mode Localization
| ψ₀(0) | Regime | Physical Interpretation |
|-------|--------|------------------------|
| > 2.0 | Ultra-strong | Gravity trapped on brane, large hierarchy |
| 1.0-2.0 | Strong | Standard RS scenario |
| 0.1-1.0 | Moderate | Partial delocalization |
| < 0.1 | Weak | Gravity leaks into bulk |

### Newton Constant Ranges
| G₄/G_obs | Status | Implications |
|----------|--------|--------------|
| 0.9-1.1 | ✅ Realistic | Matches observations |
| 0.1-0.9 | ⚠️ Suppressed | Weaker gravity |
| 1.1-10 | ⚠️ Enhanced | Stronger gravity |
| > 10 or < 0.1 | ❌ Unphysical | Ruled out |

## Error Analysis

### Numerical Uncertainties
- **Discretization error**: O(h²) where h = 0.01
- **Boundary effects**: Exponentially suppressed for |y| > 3
- **Integration error**: < 10⁻⁶ using composite Simpson's rule

### Physical Uncertainties
- **Warp factor model**: Phenomenological, not derived from first principles
- **Brane thickness**: Assumed thin (δ-function limit)
- **Backreaction**: Neglected in linearized approximation

## Validation Checks
1. **Normalization**: ∫ψ²dy = 1 (enforced)
2. **Symmetry**: ψ(-y) = ψ(y) for symmetric warping
3. **Monotonicity**: |ψ(y)| decreases with |y|
4. **Differential equation**: Residual < 10⁻⁸

## Physical Applications

### Hierarchy Problem
The warped geometry generates large hierarchies:
- M_Planck/M_TeV ≈ exp(kr_c π) ≈ 10¹⁶
- Solves the gauge hierarchy problem
- Natural TeV scale physics

### Phenomenology
Observable consequences:
- KK graviton resonances at TeV scale
- Modified gravitational inverse square law at μm scales
- Radion as light scalar field
- Enhanced gravitational effects in early universe

## Technical Notes
- Uses adaptive mesh refinement for steep warp factors
- Automatic detection of delocalized modes
- Graceful degradation to analytical approximations
- GPU acceleration available for parameter scans

## References
- Randall, L. & Sundrum, R. "Large Mass Hierarchy from a Small Extra Dimension" Phys. Rev. Lett. 83, 3370 (1999)
- Randall, L. & Sundrum, R. "Alternative to compactification" Phys. Rev. Lett. 83, 4690 (1999)  
- Goldberger, W.D. & Wise, M.B. "Modulus stabilization with bulk fields" Phys. Rev. Lett. 83, 4922 (1999)
- Gherghetta, T. "A Holographic View of Beyond the Standard Model Physics" arXiv:1008.2570 (2010)