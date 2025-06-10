# RG Flow Test

## Overview
The RG (Renormalization Group) flow test computes 1-loop beta functions for the effective 4D theory operators. This determines how coupling constants evolve with energy scale and identifies potential UV fixed points.

## Physics Background
The renormalization group describes how physical parameters change under scale transformations. For our operator set {φ⁴, R², φ²R}, the beta functions govern:

- **Running couplings**: How interaction strengths vary with energy
- **Fixed points**: Scale-invariant theories
- **Asymptotic behavior**: UV/IR limits of the theory

## Implementation Details

### 1-Loop Beta Functions
Using dimensional regularization in d = 4 - ε dimensions:

- β(λ) = 3λ²/(16π²) - Scalar self-interaction
- β(a₂) = -5a₂²/(96π²) - Gravitational coupling (asymptotic freedom)
- β(g) = gλ/(16π²) - Mixed coupling evolution

### High-Precision Computation
- Uses mpmath library with 50 decimal place precision
- Prevents numerical errors in critical calculations
- Enables accurate fixed point determination

### Algorithm
1. **Input**: Wilson coefficients from dimensional reduction
2. **Evaluation**:
   - Extract coupling values from operators
   - Compute beta functions with mpmath
   - Convert to float preserving Inf/NaN
3. **Output**: Beta function values and precision info

### Physical Interpretation
- **β > 0**: Coupling grows in UV (asymptotic non-freedom)
- **β < 0**: Coupling decreases in UV (asymptotic freedom)
- **β = 0**: Fixed point (scale invariance)

## Test Criteria
The test succeeds if:
- All beta functions computed without overflow
- Results are finite (no NaN or Inf)
- Precision maintained throughout calculation

## RG Flow Analysis
The beta functions reveal:
- R² exhibits asymptotic freedom (negative beta)
- φ⁴ shows logarithmic running (positive beta)
- Mixed coupling evolution depends on both λ and g

## Error Handling
The script ensures robustness by:
- Never exiting with non-zero status (prevents 500 errors)
- Comprehensive JSON error messages
- Graceful handling of invalid inputs

## References
- Peskin, M.E. & Schroeder, D.V. (1995). "An Introduction to Quantum Field Theory"
- Niedermaier, M. & Reuter, M. (2006). "The asymptotic safety scenario in quantum gravity" 