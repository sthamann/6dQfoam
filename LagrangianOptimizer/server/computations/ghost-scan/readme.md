# Ghost Scan Test

## Overview
The ghost scan test ensures the 4D effective theory contains no negative-norm (ghost) states or tachyonic (imaginary mass) modes. This is essential for unitarity and stability of the quantum theory.

## Physics Background
In theories with higher-derivative operators or non-minimal kinetic terms, the propagator structure can develop:
- **Ghost modes**: Negative kinetic energy states that violate unitarity
- **Tachyons**: Imaginary mass states indicating vacuum instability

The presence of R² terms and scalar-gravity mixing φ²R can modify the kinetic matrix, potentially introducing these pathologies.

## Implementation Details

### Kinetic Matrix Construction
For the operator set {φ⁴, R², φ²R}, we build the generalized kinetic matrix K:

```
K = [ 1 + a₂·MP²        g·√(MP²)    ]
    [ g·√(MP²)      1 + λ·MP²      ]
```

where MP² is the 4D Planck mass squared for proper dimensional analysis.

### Algorithm
1. **Input**: Wilson coefficients from dimensional reduction
2. **Matrix Construction**: Build kinetic matrix with proper MP² scaling
3. **Eigenvalue Analysis**:
   - Compute all eigenvalues of K
   - Check for negative real parts (ghosts)
   - Check for non-zero imaginary parts (tachyons)
4. **Stability Checks**:
   - Determinant positivity
   - Trace positivity
   - Positive-definiteness

### Health Criteria
The theory is healthy if:
- All eigenvalues are real and positive
- det(K) > 0 and tr(K) > 0
- Minimum eigenvalue > 0

## Test Output
- Number of ghost modes
- Number of tachyonic modes
- Minimum eigenvalue
- Full eigenvalue spectrum
- Determinant and trace values
- Overall health status

## Physical Interpretation
A healthy result indicates:
- Unitary S-matrix
- Stable vacuum
- Well-defined Cauchy problem
- Absence of Ostrogradsky instabilities

## References
- Woodard, R.P. (2015). "Ostrogradsky's theorem on Hamiltonian instability"
- Stelle, K.S. (1977). "Renormalization of higher-derivative quantum gravity" 