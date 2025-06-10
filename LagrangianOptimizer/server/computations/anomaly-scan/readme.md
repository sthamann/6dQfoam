# Anomaly Scan Test

## Overview
The anomaly scan test validates that all gauge and gravitational anomalies cancel in the 6-dimensional theory. This is a crucial consistency check for any higher-dimensional quantum field theory.

## Physics Background
In 6 dimensions, chiral fermions can generate anomalies that violate gauge and gravitational symmetries. These anomalies must cancel for the theory to be consistent. The test implements:

- **Gauge Anomalies**: Check that `trF⁴` and `(trF²)²` terms vanish for each gauge group
- **Gravitational Anomalies**: Verify that `trR⁴` and `(trR²)²` cancel
- **Mixed Anomalies**: Ensure `trR²·trF²` terms cancel
- **Green-Schwarz Mechanism**: Apply counter-terms B∧F∧F with coefficient K_GS = -1/24

## Implementation Details
The test evaluates the full 8-form I₈ and checks factorization conditions based on:
- Sagnotti (1992) formalism
- Erler & Klemm (1993) constraints

### Algorithm
1. **Input**: Fermion representations with gauge group, dimension, Dynkin index, U(1) charge, and chirality
2. **Calculation**: 
   - Compute irreducible and reducible anomaly traces for each fermion
   - Sum contributions accounting for generations
   - Apply Green-Schwarz counter-terms for U(1) factors
3. **Output**: Anomaly cancellation status and trace values

### Key Parameters
- `reps`: Array of fermion representations
- `generations`: Number of fermion generations (default: 1)
- `TOL`: Numerical tolerance for cancellation (1e-12)

## Test Criteria
The test passes if all anomaly coefficients are within numerical tolerance of zero after applying Green-Schwarz terms.

## References
- Sagnotti, A. (1992). "A note on the Green-Schwarz mechanism in open-string theories"
- Erler, J. & Klemm, A. (1993). "Comment on the generation number in orbifold compactifications" 