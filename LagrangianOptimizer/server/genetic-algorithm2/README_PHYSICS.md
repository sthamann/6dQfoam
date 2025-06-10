# Physics-Based Genetic Algorithm (GA2)

## Overview

This is an enhanced version of the genetic algorithm that implements a unified field theory approach based on the 6D quantum foam universe model. Unlike the original GA which directly fits coefficients to match physical constants, this version derives the fundamental constants (α, G) as emergent properties from a scalar field dynamics.

## Key Differences from Original GA

### 1. Operator Changes
- **Removed**: Maxwell term (F²) and gravity term (κR)
- **Added**: 
  - `g_em` - Electromagnetic-scalar field coupling constant
  - `ξ` - Gravitational-scalar field coupling constant

### 2. Physical Model
The system implements a scalar field with potential:
```
V(φ) = -½c₂φ² + ¼c₃φ⁴
```

This allows for spontaneous symmetry breaking with vacuum expectation value (VEV):
```
φ₀ = √(c₂/c₃) when c₂ > 0 and c₃ > 0
```

### 3. Effective Constants
The observed physical constants emerge from the coupling between fields:
- **Fine structure constant**: `α_eff = α_standard / (1 + g_em * φ₀²)`
- **Gravitational constant**: `G_eff = G_standard / (1 + ξ * φ₀²)`

### 4. Elegance Scoring
The fitness function now includes an "elegance bonus" that rewards:
- c₃ being close to 1/(8π) (geometric constant)
- Small coupling constants (simplicity)
- Mathematical relations between parameters

## File Structure

```
server/genetic-algorithm2/
├── ga.ts                    # Main GA engine with physics-aware mutations
├── operators.ts             # New operator definitions and physics calculations
├── constants.ts             # Search ranges for coupling constants
├── lagrangian-optimized.ts  # Fitness function with VEV and elegance
├── high_precision_worker.py # Python implementation for high precision
└── README_PHYSICS.md        # This file
```

## API Endpoints

- `POST /api/ga2/start` - Start the physics GA with parameters
- `POST /api/ga2/stop` - Stop the running GA
- `GET /api/ga2/status` - Get current status
- `GET /api/ga2/export` - Export results as JSON
- WebSocket: `/ws/ga2` - Real-time updates

## Usage

Access the physics-based GA through "Tab 1b: Physics-Based GA" in the web interface.

### Parameters
- **Population Size**: Number of candidates per generation (100-2000)
- **Mutation Rate**: Probability of gene mutation (0.01-0.5)
- **Max Generations**: Maximum evolution cycles (1000-50000)

### Output
- **VEV (φ₀)**: Vacuum expectation value of the scalar field
- **Coupling Constants**: g_em and ξ values
- **Effective Constants**: Emergent α_eff, G_eff, c_model
- **Elegance Score**: Mathematical beauty rating (0-100%)

## Physical Interpretation

When the GA finds a solution with non-zero VEV, it indicates:
1. Spontaneous symmetry breaking has occurred
2. The fundamental constants emerge from field dynamics
3. Higher elegance scores suggest more fundamental/beautiful physics

## Example Results

A typical high-quality solution might show:
- VEV φ₀ ≈ 1.5
- g_em ≈ 0.1 (small coupling)
- ξ ≈ 0.05 (small coupling)
- c₃ ≈ 0.0398 (close to 1/8π ≈ 0.0398)
- Elegance score > 80%

This represents a universe where the observed fine structure constant and gravitational constant emerge naturally from the scalar field condensate. 