# Lorentz Isotropy Test

## Overview
This test measures deviations from Lorentz invariance by evolving a scalar field on a 3D cubic lattice and analyzing directional energy distributions. It implements a sophisticated test of spacetime symmetries using the Standard Model Extension (SME) framework.

## Physics Background
Lorentz invariance is a fundamental symmetry of spacetime that ensures the laws of physics are the same in all inertial reference frames. Violations of this symmetry could indicate:
- Quantum gravity effects
- String theory signatures  
- Spacetime foam at the Planck scale
- CPT violation

The test uses a modified Klein-Gordon equation:
```
∂²φ/∂t² = (1/K(φ)) * [c₂∇²φ - c₃φ]
```

Where:
- `K(φ) = c₁ + c₄φ²` is the field-dependent kinetic coefficient
- `c₂` controls spatial derivatives with anisotropic modifications
- `c₃` is the mass term
- Anisotropy is introduced through time-dependent spatial coefficients

## Implementation Details

### Modified Field Equation
The full equation with directional Lorentz violation:
```
K(φ) ∂²φ/∂t² = c₂ₓ(t) ∂²φ/∂x² + c₂ᵧ(t) ∂²φ/∂y² + c₂ᵤ(t) ∂²φ/∂z² - c₃φ
```

where:
- `c₂ᵢ(t) = c₂[1 + δᵢ(1 - e^(-t/τ))]`
- `δᵢ = Aᵢ sin(ωt + φᵢ)` with random amplitudes Aᵢ ~ 10⁻⁶

### Numerical Method
- **Grid**: 32×32×32 cubic lattice
- **Spatial discretization**: 2nd-order central differences
- **Time integration**: Adaptive Runge-Kutta 4/5 (RK45)
- **Boundary conditions**: Periodic
- **Initial condition**: Gaussian wave packet centered at origin

### Energy Analysis
The code computes directional energy densities:
```python
Eᵢ = ∫ dΩᵢ [½(∂φ/∂t)² + ½c₂(∂φ/∂xᵢ)² + ½c₃φ²]
```
integrated over orthogonal slices.

### Isotropy Violation Metric
```
ε = max|Eᵢ - Ē|/Ē
```
where Ē = (Eₓ + Eᵧ + Eᵤ)/3

## Test Criteria

### Lorentz Violation Bounds
- **ε < 10⁻⁶**: Excellent - consistent with current experimental limits
- **10⁻⁶ < ε < 10⁻⁴**: Good - within indirect bounds
- **10⁻⁴ < ε < 10⁻²**: Moderate - potentially observable effects
- **ε > 10⁻²**: Strong - likely unphysical or numerical artifact

### Physical Constraints
Current experimental bounds on Lorentz violation:
- Photon sector: |δc/c| < 10⁻¹⁹
- Electron sector: |δc/c| < 10⁻¹⁵
- Gravity sector: |δc/c| < 10⁻⁷

## Output Interpretation

### Result Structure
```json
{
  "epsilon": 1.23e-7,        // Isotropy violation parameter
  "energies": {
    "x": 0.3341,            // X-direction energy
    "y": 0.3339,            // Y-direction energy  
    "z": 0.3340             // Z-direction energy
  },
  "coefficients": [...],     // Input coefficients
  "runtime": 123.45         // Computation time (ms)
}
```

### Quality Assessment
The test also provides:
- Energy conservation check
- Numerical stability indicators
- Convergence metrics

## Advanced Features

### Adaptive Time Stepping
RK45 automatically adjusts time steps to maintain:
- Relative tolerance: 10⁻⁹
- Absolute tolerance: 10⁻¹²

### GPU Acceleration
If available, the code uses CuPy for:
- ~10x speedup on field evolution
- Parallel energy computations

## Physical Applications

### Phenomenology
This test is relevant for:
- Ultra-high energy cosmic ray physics
- Gamma-ray burst polarimetry
- Neutrino oscillation experiments
- Gravitational wave observations

### Theory Testing
Can constrain:
- Standard Model Extension parameters
- Non-commutative geometry scales
- Loop quantum gravity effects
- String theory compactifications

## Technical Notes
- Uses scipy.integrate.solve_ivp for robust ODE integration
- Energy computed using Simpson's rule for accuracy
- Random seed ensures reproducibility
- Automatic fallback to CPU if GPU unavailable

## References
- Kostelecký, V.A. & Samuel, S. "Spontaneous breaking of Lorentz symmetry in string theory" Phys. Rev. D 39, 683 (1989)
- Mattingly, D. "Modern tests of Lorentz invariance" Living Rev. Relativ. 8, 5 (2005)
- Bluhm, R. "Overview of the SME: implications and phenomenology of Lorentz violation" Lect. Notes Phys. 702, 191 (2006)
- Tasson, J.D. "What do we know about Lorentz invariance?" Rep. Prog. Phys. 77, 062901 (2014)