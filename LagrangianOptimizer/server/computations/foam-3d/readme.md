# Foam-3D Test

## Overview
The Foam-3D test performs a 3D Lorentz isotropy test on a cubic lattice using finite-difference methods with leap-frog integration. This test verifies that the field equations respect rotational symmetry in 3D space.

## Physics Background
Lorentz invariance is a fundamental symmetry of spacetime. In the context of modified field theories, different coefficients for spatial derivatives (c_xx, c_yy, c_zz) can break this symmetry. The test evolves a scalar field on a 3D lattice and checks whether the statistical properties remain isotropic.

Key principle: In an isotropic theory, the variance of field fluctuations should be identical along all spatial directions.

## Implementation Details

### Numerical Method
- **Grid**: 32³ cubic lattice
- **Spatial step**: h = 0.1
- **Time step**: dt = 0.01
- **Evolution steps**: 100
- **Integration**: Leap-frog (symplectic)

### Laplacian Discretization
6-point stencil for periodic boundary conditions:
```python
∇²φ[i,j,k] = (φ[i+1,j,k] + φ[i-1,j,k] + 
              φ[i,j+1,k] + φ[i,j-1,k] + 
              φ[i,j,k+1] + φ[i,j,k-1] - 6φ[i,j,k]) / h²
```

### Algorithm
1. **Initialization**: Random Gaussian field with seed 42
2. **Evolution**: 
   ```
   π += dt × c_xx × ∇²φ
   φ += dt × π
   ```
3. **Analysis**: Compute variance in central region along each axis
4. **Isotropy measure**: (max_var - min_var)/(max_var + min_var)

### GPU Acceleration
- Attempts to use CuPy for GPU computation
- Falls back to NumPy if unavailable
- No loss of correctness, only speed

## Test Criteria
The test passes if:
- Anisotropy < 0.1 (10% tolerance)
- All variances remain finite
- No numerical instabilities

## Physical Interpretation

### Isotropy Measure
- **Anisotropy = 0**: Perfect rotational symmetry
- **Anisotropy < 0.1**: Acceptable isotropy
- **Anisotropy > 0.1**: Significant symmetry breaking

### Coefficient Effects
- **c_xx = c_yy = c_zz**: Isotropic propagation
- **c_xx ≠ c_yy or c_zz**: Preferred direction
- **c_xy ≠ 0**: Mixed derivative terms (not tested here)

## Output Format
```json
{
  "success": true,
  "anisotropy": 0.023,
  "variance_x": 1.234,
  "variance_y": 1.256,
  "variance_z": 1.245,
  "isotropy_passed": true,
  "coefficients": [c_tt, c_xx, c_yy, c_zz, c_xy]
}
```

## Limitations
- Tests only quadratic terms (no higher derivatives)
- Assumes periodic boundary conditions
- Limited to small-amplitude fluctuations
- Does not test time-space mixing (c_xy terms)

## Error Handling
- Validates input format (JSON or 5 arguments)
- Catches simulation failures gracefully
- Returns structured error messages

## References
- Kostelecký, V.A. & Russell, N. (2011). "Data tables for Lorentz and CPT violation"
- Will, C.M. (2014). "The confrontation between general relativity and experiment" 