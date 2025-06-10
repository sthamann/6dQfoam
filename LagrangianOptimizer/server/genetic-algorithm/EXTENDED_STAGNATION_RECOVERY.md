# Extended Stagnation Recovery Strategy

## Problem
The GA can get stuck for hundreds of generations when:
- Hard constraints (C < 1 ppm, G < 100 ppm) are too strict after generation 100
- Only 3-4% of candidates pass validation (e.g., 22-31 out of 800)
- Population diversity is too low to explore better solutions
- Mutation rates are too conservative to escape local optima

## Solution: Multi-Layer Recovery Mechanisms

### 1. Long-Term Stagnation Detection (100+ generations)
Tracks fitness stagnation over extended periods:
```typescript
if (Math.abs(currentFitness - this.lastBestFitness) < 1e-12) {
  this.longTermStagnation++;
}
```

When `longTermStagnation >= 100`, aggressive recovery kicks in:

### 2. Aggressive Recovery Measures
- **Mutation Boost**: Increases all mutation rates by 3-10x
  - General mutation rate → 50%
  - Gauge mutation rate → 95%
  - Gravity mutation rate → 80%
- **Diversity Injection**: 50% of population replaced with new random individuals
- **Force Diversity**: Applies gauge and gravity diversity mechanisms
- **Population Jitter**: 50% of population gets random perturbations
- **Hall of Fame Reseed**: 30% reseeded from best historical candidates

### 3. Emergency Constraint Relaxation (Generation 500+)
For extremely stuck populations, constraints gradually relax:
- Increases by 0.01% per generation after gen 500
- Maximum 2x relaxation (e.g., C < 2 ppm, G < 200 ppm)
- Helps population find stepping stones to better solutions

### 4. Existing Recovery Mechanisms
The system also includes:
- **Stagnation at 30 gens**: 10% fresh individuals
- **Stagnation at 50 gens**: Reanneal around elite
- **Stagnation at 80 gens**: Major kick with 2.5x mutation boost
- **Deep stagnation (30 gens without digit improvement)**: Population jitter

## Expected Behavior
1. **Generations 0-99**: Progressive constraint tightening works well
2. **Generations 100-499**: Full constraints, normal stagnation handling
3. **Generations 500+**: Emergency relaxation begins if needed
4. **Every 100 generations of stagnation**: Aggressive recovery applied

## Monitoring
Watch for these log messages:
- `🚨 EXTENDED STAGNATION: X generations without improvement!`
- `💉 Injecting 50% new random individuals`
- `Generation X emergency relaxation: C < Y, G < Z`

This ensures the GA never gets permanently stuck and can always find paths to better solutions. 