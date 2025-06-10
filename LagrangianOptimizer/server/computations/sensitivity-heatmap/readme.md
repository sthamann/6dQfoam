# Sensitivity Heatmap Analysis

## Overview
Maps how strongly each observable deviation (Δc, Δα, ΔG, ...) reacts to small perturbations of the Lagrange coefficients. This analysis helps determine whether the parameter space is in a narrow "knife edge" region or a robust island.

## Method
- Uses Sobol indices via SALib for global sensitivity analysis
- Fallback to gradient-based analysis if SALib unavailable
- GPU acceleration via CuPy when available
- Evaluates 10,000 samples by default

## Key Metrics
- **Max Sensitivity**: Maximum Sobol index across all parameter-observable pairs
- **Robustness**: System is considered robust if all gradient-based indices < 10⁻²
- **Observable Deviations**: Δc (speed of light), Δα (fine structure), ΔG (Newton constant)

## Stop Trigger
✅ **PASS**: All gradient-based sensitivity indices < 10⁻²
❌ **FAIL**: Any sensitivity index ≥ 10⁻²

## Implementation Details
- Perturbs coefficients by ±10% to compute sensitivities
- Uses first-order Sobol indices (no interaction terms)
- Simplified gradient analysis as fallback method 