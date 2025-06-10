# Auto-RG 3-Loop Troubleshooting Guide

## Common Issues

### 500 Error When Running from Frontend

**Symptoms:**
- Test returns HTTP 500 error when executed from http://localhost:3000/theory
- Worker script runs fine when tested directly from command line

**Root Causes:**

1. **Missing Operators from Dimensional Reduction Test**
   - The auto-rg-3loop test depends on operators from the `reduce_6d_to_4d` test
   - If dimensional reduction hasn't been run, no operators are available
   - The frontend receives empty operators array and passes it to the worker

2. **Missing Storage Function**
   - The API endpoint `/api/sessions/:sessionId/operators/:testName` was calling `storage.getOperatorsFromTest()`
   - This function didn't exist in the storage module

**Solutions Applied:**

1. **Added Missing Storage Functions**
   ```typescript
   // In server/core/storage.ts
   async getOperatorsFromTest(sessionId: string, testName: string): Promise<any[]>
   async checkTestDependencies(sessionId: string, testName: string): Promise<...>
   ```

2. **Improved Error Handling in Worker**
   - Added validation for empty operators array
   - Added debug information to error responses
   - Improved operator format validation

3. **Fixed Numba JIT Decorator**
   - Fixed the fallback decorator when numba is not installed
   - Removed exception raising from JIT-compiled function

4. **Added Numerical Stability**
   - Added bounds checking to prevent overflow
   - Convert NaN/Inf to null for JSON serialization
   - Clip coupling values during RG evolution

### Testing the Worker

**Direct Test (should work):**
```bash
.venv/bin/python3 server/computations/auto-rg-3loop/worker.py \
  '{"operators": [{"name": "phi4", "coeff": 0.01}, {"name": "R2", "coeff": 0.005}, 
    {"name": "phi2R", "coeff": 0.002}, {"name": "phi6", "coeff": 0.001}], "coeffs": []}'
```

**Debug Empty Operators:**
```bash
.venv/bin/python3 server/computations/auto-rg-3loop/worker.py \
  '{"operators": [], "coeffs": [0.1, 0.05, 0.02, 0.01, 0.001]}'
```
Should return: "No operators provided. Please run dimensional reduction test first."

### Debugging API Issues

**Check if operators are available:**
```bash
# Get active session ID first
curl http://localhost:5000/api/sessions/active

# Then check operators (replace SESSION_ID)
curl http://localhost:5000/api/sessions/SESSION_ID/debug/operators
```

**Expected response structure:**
```json
{
  "success": true,
  "debug": {
    "totalTests": 5,
    "testNames": ["foam3d", "grav_zero", "reduce_6d_to_4d", ...],
    "reduce6dTestFound": true,
    "operators": [
      {"name": "phi4", "coeff": 0.123},
      {"name": "R2", "coeff": 0.456},
      ...
    ]
  }
}
```

### Dependency Chain

The auto-rg-3loop test requires:
1. `foam3d` → provides Lorentz epsilon
2. `grav_zero` → provides psi0 profile  
3. `reduce_6d_to_4d` → provides operators

Make sure these tests are run in order before attempting auto-rg-3loop. 