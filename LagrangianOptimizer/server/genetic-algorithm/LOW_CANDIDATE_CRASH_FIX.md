# Low Candidate Count Crash Fix

## Problem
The GA crashed at generation 84 with the error:
```
TypeError: Cannot read properties of undefined (reading 'coefficients')
    at GeneticAlgorithm.runGeneration (ga.ts:571:40)
```

This happened when only 6 candidates passed validation out of 800, but the elite preservation code tried to access more candidates than available (e.g., eliteCount = 10 or 20).

## Root Cause
The elite preservation loop was:
```typescript
for (let i = 0; i < this.parameters.eliteCount; i++) {
  newPopulation.push(candList[i].coefficients.slice());
}
```

When `candList.length < this.parameters.eliteCount`, accessing `candList[i]` would return undefined, causing the crash.

## Solution

### 1. Elite Count Safety Check
```typescript
const eliteCount = Math.min(this.parameters.eliteCount, candList.length);
for (let i = 0; i < eliteCount; i++) {
  newPopulation.push(candList[i].coefficients.slice());
}
```

### 2. Fill Missing Elite Slots
If fewer candidates pass than elite count, fill remaining slots with variations of the best candidate:
```typescript
if (candList.length < this.parameters.eliteCount) {
  console.warn(`⚠️ Only ${candList.length} candidates passed validation...`);
  while (newPopulation.length < this.parameters.eliteCount && candList.length > 0) {
    const bestCandidate = candList[0].coefficients.slice();
    // Add small perturbation for diversity
    for (let j = 0; j < bestCandidate.length; j++) {
      bestCandidate[j] += this.gaussianRandom() * 0.001 * Math.abs(bestCandidate[j]);
    }
    newPopulation.push(bestCandidate);
  }
}
```

### 3. Breeding Pool Safety
Added check for insufficient breeding candidates:
```typescript
if (fitnessData.length < 2) {
  console.warn(`⚠️ Only ${fitnessData.length} candidates available for breeding...`);
  // Fill with fresh random individuals
  while (newPopulation.length < this.parameters.populationSize) {
    newPopulation.push(this.makeIndividual());
  }
}
```

## Expected Behavior
- The GA will no longer crash when very few candidates pass validation
- It will warn about low candidate counts
- It will fill the population with either:
  - Variations of the best available candidate (for elite slots)
  - Fresh random individuals (when breeding pool too small)
- This allows the GA to recover and continue evolving

## When This Happens
This typically occurs:
- During the transition from relaxed to strict constraints (generation 10-100)
- When constraints are very tight and population diversity is low
- After generation 500+ when even emergency relaxation isn't enough

The fix ensures the GA can continue running and potentially recover through the various stagnation recovery mechanisms. 