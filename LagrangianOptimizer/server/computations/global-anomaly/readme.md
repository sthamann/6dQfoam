# Global Anomaly Test

## Overview
The global anomaly test checks for non-perturbative quantum inconsistencies that cannot be detected by local anomaly cancellation. These arise from the global topology of the gauge group and fermion representations.

## Physics Background
While local anomalies involve infinitesimal gauge transformations, global anomalies arise from "large" gauge transformations that cannot be continuously connected to the identity. In 6D, the relevant homotopy groups are:

- **π₆(SU(2)) = ℤ₂**: Witten anomaly requiring even number of SU(2) doublets per chirality
- **π₇(SU(3)) = ℤ**: Automatically vanishes for fundamental representations
- **π₅(U(1)) = π₆(U(1)) = 0**: No global U(1) anomalies in 6D

## Implementation Details

### SU(2) Witten Anomaly
The most stringent constraint comes from the SU(2) Witten anomaly:
- Each Weyl doublet contributes a ℤ₂ factor
- Cancellation requires an even number of doublets for each chirality separately
- Left-handed and right-handed sectors are checked independently

### Algorithm
1. **Input**: Fermion representations with gauge group and chirality
2. **Counting**: 
   - Count SU(2) doublets by chirality
   - Account for generation number
3. **Checks**:
   - SU(2)_L doublets: must be even
   - SU(2)_R doublets: must be even
   - SU(3) automatically satisfied for fundamentals

### Mathematical Foundation
Based on the index theorem for the Dirac operator on S⁶:
- ind(D) = ∫[A⁶] ch₄(F) for SU(2)
- Mod 2 constraint from π₆(SU(2)) = ℤ₂

## Test Criteria
The test passes if:
- Number of left-handed SU(2) doublets is even
- Number of right-handed SU(2) doublets is even
- No exotic SU(3) representations present

## Physical Implications
Global anomaly cancellation ensures:
- Well-defined fermionic path integral
- Consistent quantization on compact spaces
- No mod 2 phase ambiguity in partition function

## References
- Witten, E. (1982). "An SU(2) anomaly"
- Intriligator, K. (1991). "Anomaly matching and a Hopf-Wess-Zumino term in 6d, N=(2,0) field theories" 