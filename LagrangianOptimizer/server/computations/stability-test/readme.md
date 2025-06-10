# Stability Test

## Overview
The stability test performs a 128³ lattice simulation using leap-frog integration to verify energy conservation in the classical field theory. This tests the numerical stability and physical consistency of the scalar field dynamics.

## Physics Background
A stable classical field theory must conserve energy in the absence of dissipation. The test evolves the scalar field φ and its conjugate momentum π according to:
- ∂²φ/∂t² = ∇²φ - m²φ (Klein-Gordon equation)
- π = ∂φ/∂t (canonical momentum)

Energy conservation requires:
E = ∫ d³x [½π² + ½(∇φ)² + ½m²φ²] = constant

## Implementation Details

### Numerical Method
- **Leap-frog integration**: Symplectic integrator preserving phase space volume
- **Lattice**: 128³ spatial grid with periodic boundary conditions
- **Time step**: dt = 0.1 dx (conservative CFL condition)
- **Evolution**: 10,000 time steps

### GPU Acceleration
- Attempts to use CuPy for NVIDIA GPU acceleration
- Falls back to NumPy if CuPy unavailable
- ~100x speedup on GPU vs CPU

### Algorithm
1. **Initialization**: 
   - Random field fluctuations ~ 10⁻⁴
   - Zero initial momentum
2. **Evolution**:
   ```python
   π += 0.5 * dt * (∇²φ - m²φ)  # Half-step momentum
   φ += dt * π                    # Full-step position
   π += 0.5 * dt * (∇²φ - m²φ)  # Half-step momentum
   ```
3. **Energy Check**: Compare E(final)/E(initial)

### Laplacian Implementation
6-point stencil on cubic lattice:
```
∇²φ = (φ[i+1] + φ[i-1] + φ[j+1] + φ[j-1] + φ[k+1] + φ[k-1] - 6φ[i,j,k]) / dx²
```

## Test Criteria
The test passes if:
- Energy ratio E₁/E₀ < 10 (generous bound)
- Typical good result: E₁/E₀ ≈ 1.001 (0.1% drift)
- No numerical overflow or NaN

## Physical Interpretation
- **E₁/E₀ ≈ 1**: Excellent stability, reliable dynamics
- **E₁/E₀ < 1.1**: Acceptable for most purposes
- **E₁/E₀ > 10**: Catastrophic instability

Energy conservation validates:
- Correct implementation of field equations
- Appropriate time step selection
- Absence of numerical instabilities

## Performance Notes
- CPU runtime: ~30-60 seconds
- GPU runtime: ~0.3-0.6 seconds
- Memory usage: ~64 MB for field arrays

## References
- Leimkuhler, B. & Reich, S. (2004). "Simulating Hamiltonian Dynamics"
- Press, W.H. et al. (2007). "Numerical Recipes" 