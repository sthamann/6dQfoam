# Auto-RG 3-Loop Analysis

## Overview
Extends RG analysis to 3-loop order to verify that 1-loop UV fixed points remain stable when higher-order corrections are included. This test can reveal pseudo-fixed-point illusions that appear stable at lower orders.

## Method
- Symbolic beta function computation with SymPy
- JIT-compiled evaluation with numba
- 50-decimal precision arithmetic (mpmath)
- RG flow evolution over 6 energy decades

## Key Metrics
- **3-Loop Correction**: Maximum change from 2-loop to 3-loop beta functions
- **Fixed Point Stability**: Whether UV fixed point remains stable at 3-loop
- **UV/IR Safety**: Couplings remain finite at both limits

## Stop Trigger
✅ **PASS**: ‖β³‖ < 10⁻³ over 6 decades in μ
❌ **FAIL**: Large 3-loop corrections or unstable fixed point

## Implementation Details
- Computes beta functions at 1, 2, and 3-loop orders
- RK4 integration of RG flow equations
- Checks convergence of perturbative expansion
- Verifies UV and IR behavior 