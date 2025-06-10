# Gravitational Stability Requirements

## The Problem: Negative Gravity

In our unified field theory with the Lagrangian:
```
ℒ = ℒ_scalar + ℒ_gauge + ℒ_gravity
ℒ_gravity = ½(M_pl² - ξφ²)R
```

The effective Planck mass squared is:
```
M_pl_eff² = M_pl² - ξφ²
```

The effective gravitational constant is:
```
G_eff ∝ 1/M_pl_eff²
```

## Stability Condition

For attractive (positive) gravity, we need:
```
M_pl_eff² > 0
⟹ M_pl² - ξφ² > 0
⟹ ξ < M_pl²/φ²
```

In natural units where M_pl = 1:
```
ξ < 1/φ²
```

## Consequences of Violation

If ξφ² > M_pl²:
- M_pl_eff² becomes negative
- G_eff becomes negative
- Gravity becomes repulsive instead of attractive
- No stable structures (stars, planets, galaxies) can form
- The universe would be physically unstable

## Implementation

To ensure gravitational stability:

1. **Constrained ξ range**: We limit ξ to positive values only, with maximum 0.1
2. **Stability checks**: The evaluator penalizes candidates with:
   - Negative G_eff (fitness penalty: +100)
   - Violated stability condition 1 - ξφ² ≤ 0 (fitness penalty: +50)
   - Negative ξ values (fitness penalty: +10)

3. **Modified G_eff calculation**: Returns negative value when stability is violated to signal the problem

## Physical Interpretation

The constraint ξ < 1/φ² means:
- Larger VEV (φ₀) requires smaller gravitational coupling (ξ)
- The scalar field's contribution to gravity must not overwhelm the standard Planck mass
- This ensures gravity remains attractive at all energy scales 