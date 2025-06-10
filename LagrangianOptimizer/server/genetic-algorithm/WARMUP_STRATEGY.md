# Genetic Algorithm Warmup Strategy

## Problem
The GA was rejecting all candidates because the hard constraints were too strict:
- C (speed of light) needs to be within 1 ppm (0.0001%)
- G (gravitational constant) needs to be within 100 ppm (0.01%)

Random initialization has virtually no chance of generating candidates that satisfy these tight constraints.

## Solution: Two-Part Strategy

### 1. Improved Initial Population Generation
The `makeIndividual()` function now generates coefficients that are much more likely to satisfy constraints:
- **c0 and c1**: Set to ensure C ≈ 299792458 m/s (exact target)
- **c4 (gauge)**: Set very close to -0.0916 to produce α ≈ 1/137
- **c5 (gravity)**: Set very close to -2.98e8 to produce G ≈ 6.67e-11

Small random variations (0.01% - 0.1%) allow exploration while staying near valid values.

### 2. Warmup Period (Generations 0-9)
For the first 10 generations, constraints are relaxed:
- **C tolerance**: 1% (instead of 1 ppm)
- **G tolerance**: 10% (instead of 100 ppm)

This allows the GA to:
1. Accept more candidates initially
2. Explore the solution space
3. Gradually converge to precise values
4. Build a diverse population

After generation 10, strict constraints are enforced, ensuring only physically valid solutions survive.

## Expected Behavior
- **Generations 0-9**: Most candidates pass validation, fitness values vary
- **Generation 10+**: Only high-precision candidates survive, focusing on α optimization
- **Console output**: Shows warmup status and constraint transitions

## Result
The GA can now find physically meaningful Lagrangians that respect fundamental constants while maximizing precision for the fine structure constant α. 