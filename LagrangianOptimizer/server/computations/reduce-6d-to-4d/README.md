# 6D to 4D Dimensional Reduction Module

This module performs dimensional reduction from 6D to 4D using Kaluza-Klein decomposition.

## Overview

The computation takes field equation coefficients and a ψ₀ wave-function profile to compute:
- The effective 4D Planck mass (MP²)
- Wilson coefficients for effective 4D operators

## API Endpoint

`POST /api/theory/reduce`

### Request Body

```json
{
  "coeffs": [c0, c1, c2, c3],  // Field equation coefficients (at least 4 required)
  "psi0": [...]                 // Wave-function profile array (non-empty)
}
```

### Response

```json
{
  "success": true,
  "MP2": 3.5875,               // 4D Planck mass squared
  "operators": [
    {"name": "R2", "coeff": 0.0348},      // R² operator coefficient
    {"name": "phi4", "coeff": 0.0021},    // φ⁴ operator coefficient  
    {"name": "phi2R", "coeff": 0.0279}    // φ²R operator coefficient
  ],
  "runtime": 123               // Execution time in ms
}
```

## Implementation Details

- **worker.py**: Python script that performs the actual computation
  - Validates input data (non-empty psi0, valid coeffs array)
  - Prevents division by zero errors
  - Computes volume factor using trapezoidal integration
  - Calculates tree-level Wilson coefficients

- **index.ts**: TypeScript wrapper for calling the Python worker
  - Provides type-safe interfaces
  - Handles Python shell integration

## Error Handling

The module returns appropriate error messages for:
- Missing or empty psi0 profile
- Invalid coefficients array (less than 4 elements)
- Zero coefficient c0 (would cause division by zero)
- Any computation errors

## Recent Fixes

1. Fixed indentation error in worker.py that was causing Python syntax errors
2. Added comprehensive error handling with JSON error responses
3. Updated deprecated numpy.trapz to numpy.trapezoid
4. Implemented proper TypeScript integration module 