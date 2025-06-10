# Lyapunov Spectrum Analysis

## Overview
Measures dynamic stability of the 6D foam by computing Lyapunov exponents. This test can detect chaos onset early and identify whether the system exhibits quasi-periodic or chaotic dynamics.

## Method
- Parallelized tangent propagator using Arnoldi iteration
- Evolves reference trajectory and tangent vectors simultaneously
- Gram-Schmidt reorthonormalization at each step
- GPU acceleration on 64³ grid

## Key Metrics
- **Max Lyapunov Exponent (λ₁)**: Largest exponent determines overall stability
- **Lyapunov Spectrum**: Full set of exponents characterizes dynamics
- **Dynamics Type**: Quasi-periodic (stable) vs chaotic (unstable)

## Stop Trigger
✅ **PASS**: Max Lyapunov exponent λ₁ < 0 (system remains quasi-periodic)
❌ **FAIL**: Max Lyapunov exponent λ₁ ≥ 0 (chaos onset detected)

## Implementation Details
- Uses RK4 integration for accuracy
- Computes 5 largest Lyapunov exponents
- 1000 timesteps with CFL-limited dt
- Simplified 6D physics on 3D grid for memory efficiency 