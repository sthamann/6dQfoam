# Beta 2-Loop Test

## Overview
The beta-2-loop test analyzes the stability of UV fixed points in the 4D effective theory by computing 2-loop beta functions. This test determines whether quantum corrections destabilize the classical fixed point structure.

## Physics Background
In quantum field theory, the running of coupling constants is governed by beta functions. At 2-loop order, we capture:
- Leading quantum corrections (1-loop)
- Sub-leading corrections that can affect fixed point stability
- Cross-coupling effects between different operators

The test focuses on a scalar + R² toy model with operators:
- **φ⁴**: Scalar self-interaction
- **R²**: Higher-derivative gravity term
- **φ²R**: Mixed scalar-gravity coupling

## Implementation Details
Based on Machacek & Vaughn, NPB 222, 83 (1983), the 2-loop beta functions are:

### Beta Functions
- β(λ) = 3λ²/(16π²) + 17λ³/(768π⁴)
- β(a₂) = -5a₂²/(96π²) + a₂³/(1152π⁴)
- β(g) = gλ/(16π²) + 5g²/(256π⁴)

### Algorithm
1. **Input**: Wilson coefficients from dimensional reduction
2. **Calculation**: 
   - Evaluate symbolic expressions using SymPy
   - Maintain 50-digit precision with mpmath
   - Compute maximum beta function magnitude
3. **Output**: 2-loop beta values and convergence status

### Convergence Criterion
The fixed point is considered stable if max|β| < 10⁻³

## Test Criteria
- All beta functions computed successfully
- Convergence status determined
- No numerical overflow or precision loss

## Mathematical Notes
- Uses high-precision arithmetic to avoid round-off errors
- Symbolic differentiation ensures exact coefficient computation
- Cross-validated against literature values

## References
- Machacek, M. & Vaughn, M.T. (1983). "Two-loop renormalization group equations in a general quantum field theory"
- Niedermaier, M. & Reuter, M. (2006). "The asymptotic safety scenario in quantum gravity" 