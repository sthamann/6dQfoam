# Progressive Constraint Tightening Strategy

## Problem
The GA was getting stuck after the warmup period because:
- G (gravitational constant) had only 1 digit precision (7.4% error)
- Hard constraints required G < 100 ppm (0.01% error)
- This sudden jump from 10% to 0.01% tolerance at generation 10 was too aggressive

## Solution: Progressive Tightening

### Generation Phases

1. **Warmup (Gen 0-9)**
   - C tolerance: 1% (0.01)
   - G tolerance: 10% (0.1)
   - Allows initial exploration and population diversity

2. **Progressive Tightening (Gen 10-99)**
   - Constraints tighten exponentially over 90 generations
   - C: From 1% → 1 ppm (factor of 10,000 reduction)
   - G: From 10% → 100 ppm (factor of 1,000 reduction)
   - Formula: `tolerance = initial * (final/initial)^progress`
   - Where progress = (generation - 10) / 90

3. **Full Constraints (Gen 100+)**
   - C tolerance: 1 ppm (1e-6)
   - G tolerance: 100 ppm (1e-4)
   - Hard enforcement of physics requirements

### Benefits

1. **Smooth Convergence**: No sudden rejection of 90% of candidates
2. **Better G Optimization**: More generations to improve G precision
3. **Maintained Diversity**: Population can adapt gradually
4. **Physics Validity**: Still ensures final solutions meet strict requirements

### Expected Behavior

- Gen 0-9: Most candidates pass, rapid exploration
- Gen 10-50: Gradual reduction in passing candidates
- Gen 50-99: Increasing selection pressure
- Gen 100+: Only high-precision candidates survive

### Progress Monitoring

Every 50 generations, the system logs current constraint values:
```
Generation 50 constraints: C < 3.16e-5, G < 3.16e-3
Generation 100 constraints: C < 1.00e-6, G < 1.00e-4
```

This ensures the GA can track the required precision improvements over time. 