# Gravity Zero Mode Test

## Overview
The gravity zero mode test computes the normalized spin-2 zero mode profile ψ₀(y) and the effective 4D Newton constant for the warped extra-dimensional geometry. This is crucial for understanding how gravity propagates in the compactified theory.

## Physics Background
In warped extra-dimensional models, the graviton zero mode determines:
- **4D gravity strength**: Through the wavefunction overlap
- **Localization**: How gravity is confined to our 4D world
- **Newton's constant**: G₄ ∝ κ₆² ∫ ψ₀²(y) dy

The spin-2 zero mode satisfies the differential equation:
```
ψ''(y) + 2σ'(y)ψ'(y) = 0
```
where σ(y) is the warp factor determined by the bulk field configuration.

## Implementation Details

### Warp Factor Model
The warp factor σ(y) depends on:
- Gauge coupling strength g
- Mass parameter m²
- Extra-dimensional coordinate y

Model form:
```python
σ(y) = scale × tanh(m² y²/10)
```

### Boundary Value Problem
- **Domain**: y ∈ [-5, 5]
- **Boundary conditions**: 
  - ψ(-L) = 0 (vanishing at one brane)
  - ψ(L) = 1 (normalized at other brane)
- **Solver**: SciPy's solve_bvp with adaptive mesh

### Algorithm
1. **Setup**: Define warp factor from field coefficients
2. **ODE System**: Convert 2nd order ODE to first order system
3. **BVP Solution**: 
   - Initial guess: linear interpolation
   - Adaptive refinement up to 1000 nodes
4. **Normalization**: ∫ ψ₀²(y) dy = 1
5. **Newton Constant**: Compute with gauge suppression

### Gauge Suppression
Strong gauge coupling suppresses gravity:
```
G_Newton = κ₆² × volume_factor / (1 + |g|)
```

## Test Output
- **psi0**: Array of 200 points representing ψ₀(y)
- **GNewton**: Effective 4D Newton constant

## Physical Interpretation

### Zero Mode Profile
- **Localized**: Peaks near y = 0 (our brane)
- **Exponential falloff**: Gravity confined to 4D
- **Normalization**: Unit integral ensures proper 4D limit

### Newton Constant
- **Large G**: Weak warping, gravity delocalized
- **Small G**: Strong warping, gravity suppressed
- **Gauge dependence**: Larger |g| weakens gravity

## Error Handling
If BVP solver fails:
- Falls back to Gaussian approximation
- ψ₀(y) = exp(-0.1y²) (normalized)
- G_Newton = 1.0 (default value)

## References
- Randall, L. & Sundrum, R. (1999). "An alternative to compactification"
- Gherghetta, T. (2010). "A holographic view of beyond the Standard Model physics" 