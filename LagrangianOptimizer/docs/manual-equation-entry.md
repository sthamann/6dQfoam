# Manual Equation Entry Feature

## Overview

The Foundation Equation component now supports manual entry of field equations, allowing users to directly input equations in a specific format or as JSON arrays. This feature enables testing custom equations without running the genetic algorithm.

## Supported Formats

### 1. Standard Physics Format

Enter equations using the following format:
```
ℒ = c₁ (∂ₜφ)² + c₂ (∂ₓφ)² + c₃ φ² + c₄ (∂ₜφ)²φ² + c₅ F²ₘᵥ + c₆ κR
```

Examples:
- `ℒ = -0.50000000 (∂ₜφ)² + 0.49999992 (∂ₓφ)² -0.060645922 φ² -0.046854528 (∂ₜφ)²φ² -0.10047012 F²ₘᵥ + 3.2655973e+8 κR`
- `L = -0.576185363464(∂_tφ)² -0.576185363746(∂_xφ)² -0.988474574743φ² +0.013036021634(∂_tφ)²φ² -0.091701236848F²`

### 2. JSON Array Format

Enter coefficients as a JSON array with exactly 6 elements:
```json
[c₁, c₂, c₃, c₄, c₅, c₆]
```

Example:
```json
[-0.5, 0.49999992, -0.060645922, -0.046854528, -0.10047012, 3.2655973e+8]
```

## How to Use

1. **Open the Foundation Equation panel** - Click the expand button if it's collapsed
2. **Click the Edit button** (pencil icon) - This opens the equation editor
3. **Enter your equation** in either supported format
4. **Click Save** to apply the equation
5. The equation will be:
   - Displayed in the Foundation Equation panel
   - Available in Tab 2 (Relativity Analysis) as "Use pinned result"
   - Available in Tab 3 (Unified Theory) automatically
   - Persisted during your session

## Integration with Other Tabs

### Tab 2: Relativity Analysis
- The manual equation appears as "Use pinned result" option
- Select this option to use your manually entered equation
- The equation is automatically used if no other option is selected

### Tab 3: Unified Theory
- The manually entered equation is automatically detected
- No additional configuration needed
- Takes precedence over Tab 2 results when available

## Coefficient Mapping

The six coefficients correspond to:
1. `c₁` - Time derivative term: (∂ₜφ)²
2. `c₂` - Spatial derivative term: (∂ₓφ)²
3. `c₃` - Mass term: φ²
4. `c₄` - Interaction term: (∂ₜφ)²φ²
5. `c₅` - Gauge field term: F²ₘᵥ
6. `c₆` - Curvature term: κR (optional, defaults to 0)

## Notes

- The parser is flexible with spacing and formatting
- Scientific notation is supported (e.g., 3.2655973e+8)
- The 6th coefficient (κR term) is optional and defaults to 0 if not provided
- Equations are validated before saving - error messages will guide you if the format is incorrect
- The manually entered equation persists during your session but is not permanently saved to the database 