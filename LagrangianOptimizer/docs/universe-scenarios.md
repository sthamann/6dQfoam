# 6D Universe Scenarios - Detailed Physics

## Overview

The 6D Universe Explorer implements six distinct scenarios based on the master formula:

**S = S_bulk + S_brane + S_matter**

Where:
- **S_bulk = (1/2κ₆²) ∫d⁶x√|G|(R₆ - 2Λ₆)** - 6D Einstein-Hilbert action
- **S_brane = -σ ∫d⁴x√|g|** - Brane tension term  
- **S_matter = ∫d⁴x√|g|ℒ_matter** - Matter on the brane

## Scenarios

### 1. Big Bang Evolution
**What's simulated:** The birth and early evolution of our universe as a 4D brane forming in 6D bulk space.

**Physics:**
- Initially, the bulk dominates with extreme curvature R₆ ≈ 10¹⁰ 
- As temperature drops: T ∝ 1/√t, the brane crystallizes out
- Brane tension σ grows from near-zero to stable value
- Negative Λ₆ drives initial inflation, then decays

**Observable effects:**
- Rapid expansion: a(t) ∝ t^(1/3) transitioning to t^(1/2)
- Bulk curvature exponentially decaying: R₆(t) = R₆₀ × e^(-t/τ)
- Energy density: ρ ∝ 1/a⁴ (radiation dominated)

**Key parameters:**
- κ₆ = 1.0 (sets Planck scale)
- Λ₆ = -0.01 (negative for inflation)
- σ = 0.1 → 1.0 (growing as brane forms)
- R₆ = 1.0 → 0.01 (cooling bulk)

### 2. Dark Energy Dominated (Λ-CDM)
**What's simulated:** Our current universe - 13.8 billion years after Big Bang, dominated by dark energy.

**Physics:**
- Positive Λ₆ drives accelerated expansion
- Matter diluted: Ω_m ≈ 0.3, Ω_Λ ≈ 0.7
- Bulk essentially flat: R₆ ≈ 0
- Stable brane with constant σ

**Observable effects:**
- Exponential expansion: a(t) ∝ e^(H₀t) where H₀ = √(Λ₆/3)
- Constant energy density from vacuum
- Galaxy recession: v = H₀ × d

**Key parameters:**
- κ₆ = 1.0
- Λ₆ = +0.01 (positive for acceleration)
- σ = 1.0 (stable brane)
- R₆ ≈ 0 (flat bulk)

### 3. Black Hole in Bulk
**What's simulated:** A black hole that extends from our 4D brane into the 6D bulk - a "black string" solution.

**Physics:**
- Modified Schwarzschild metric in 6D
- Event horizon at r_s = 2GM/c² extends into bulk
- Gravity leaks into extra dimensions for r > r_c
- Hawking radiation enhanced by bulk modes

**Observable effects:**
- Warped spacetime: g_tt = -(1 - r_s/r)
- Bulk curvature peaks at horizon
- Brane deforms near BH: σ(r) varies
- Accretion disk modified by 6D effects

**Key parameters:**
- BH Mass: 1-50 M☉ (solar masses)
- BH Spin: a = 0-0.98 (Kerr parameter)
- Enhanced R₆ near horizon
- σ deformation tracks tidal forces

### 4. Brane World Oscillations
**What's simulated:** Our 4D universe oscillating in the 6D bulk space, creating detectable gravitational anomalies.

**Physics:**
- Brane position: z(x,t) = A × sin(kx - ωt)
- Induces metric perturbations: δg_μν ∝ ∂z/∂x^μ
- Frequency: ω = 2π/T where T set by brane tension
- Creates effective varying G_eff on brane

**Observable effects:**
- Periodic gravity variations: δg/g ≈ 10^(-6)
- Standing wave patterns on brane
- Modulated particle masses: δm/m ∝ A
- Could explain some cosmic anomalies

**Key parameters:**
- Amplitude A = 0-0.5 (in Planck units)
- Wavelength λ = 2π/k (cosmic scales)
- Frequency ω ∝ √(σ/ρ_brane)
- Phase velocity v = ω/k < c

### 5. Gravitational Wave Echoes
**What's simulated:** Gravitational waves propagating through 6D space, exciting Kaluza-Klein (KK) tower modes.

**Physics:**
- GW excites infinite tower of KK modes
- Mode frequencies: ω_n = ω₀√(1 + n²m²_KK/ω₀²)
- Each mode has different bulk propagation speed
- Creates "echoes" as modes arrive at different times

**Observable effects:**
- Primary GW signal followed by echoes
- Echo delays: Δt_n = L × (v_n - v₀)/c
- Frequency spectrum shows KK peaks
- Could be detected by LIGO/Virgo

**Key parameters:**
- KK mass scale: m_KK = 1/R_c (compactification radius)
- Number of excited modes ∝ ω_GW/m_KK
- Echo amplitudes decay as 1/n²
- R₆ determines mode spacing

### 6. Vacuum Energy Screening
**What's simulated:** How brane tension can screen the bulk cosmological constant, potentially solving the cosmological constant problem.

**Physics:**
- Fine-tuning condition: σ⁴ ≈ -Λ₆M⁴_P/κ₆²
- Effective 4D CC: Λ₄^eff = Λ₆ + κ₆²σ⁴/M⁴_P ≈ 0
- Demonstrates anthropic selection
- Self-tuning mechanism via brane dynamics

**Observable effects:**
- Near-perfect cancellation: |Λ₄^eff| < 10^(-120)M⁴_P
- Slow roll when slightly off-critical
- Brane tension adjusts to screen bulk CC
- Could explain tiny observed Λ

**Key parameters:**
- σ fine-tuned to cancel Λ₆
- |Λ₄^eff/Λ₆| < 10^(-60) (screening efficiency)
- Critical surface: σ_c(Λ₆)
- Stability requires ∂²V/∂σ² > 0

## Implementation Details

### WebGL2 Rendering
- 3D texture sampling for 6D→3D projection
- Ray marching through bulk space
- Real-time field evolution
- Shader-based physics calculation

### WebGPU Enhancement
- Compute shaders solve Einstein equations
- Parallel field evolution
- 5-10x performance improvement
- Storage buffer for direct GPU writes

### Performance Optimization
- Quality levels: Low (32³), Medium (48³), High (64³)
- Adaptive ray stepping
- Texture update throttling
- Pre-computed action values

## Physical Constants Used

| Constant | Symbol | Value | Units |
|----------|---------|--------|--------|
| 6D Gravitational coupling | κ₆ | 0.1-2.0 | M_P^(-2) |
| 6D Cosmological constant | Λ₆ | -0.1-0.1 | M_P^2 |
| Brane tension | σ | 0.1-5.0 | M_P^4 |
| Bulk curvature | R₆ | -1.0-1.0 | M_P^2 |
| 4D Newton constant | G₄ | 6.674×10^(-11) | m³/kg·s² |
| 4D Planck mass | M_P | 1.22×10^19 | GeV |

## Keyboard Shortcuts

- **B** - Big Bang scenario
- **H** - Black Hole scenario  
- **O** - Brane Oscillation
- **E** - GW Echo scenario
- **V** - Vacuum Screening
- **G** - Toggle gravity on/off
- **R** - Reset simulation
- **Space** - Play/Pause

## Future Enhancements

1. **Multi-brane scenarios** - Colliding branes, ekpyrotic universe
2. **Quantum corrections** - Loop quantum gravity effects in bulk
3. **Observational data** - Compare with real CMB, GW detections
4. **Higher dimensions** - Extend to 10D/11D for string theory
5. **Non-commutative geometry** - Quantum foam at Planck scale 