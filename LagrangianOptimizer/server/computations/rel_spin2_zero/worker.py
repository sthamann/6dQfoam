#!/usr/bin/env python3
"""
Spin-2 Zero-Mode Test — analytic RS-like version (2024-06-08)

JSON-IN
-------
{ "coefficients":[c_tt, c_xx, mass, interaction, gauge, gravity], "targetG":6.67430e-11 }

Where:
- c_tt: (∂ₜφ)² coefficient (time derivative)
- c_xx: (∂ₓφ)² coefficient (spatial derivative)
- mass: φ² coefficient
- interaction: (∂ₜφ)²φ² coefficient  
- gauge: F²ₘᵥ coefficient
- gravity: κR coefficient (optional but required for G calculation)

JSON-OUT
--------
{ success, psi0, newtonConstant, deviation, classification }
"""

from __future__ import annotations
import json, math, sys
from typing import List

# ------------------------------------------------------------------ constants
G_TARGET = 6.67430e-11  # m³ kg⁻¹ s⁻²
# quality bands
DEV_EXCELLENT = 1e-3  # |ΔG|/G  < 0.1 %
DEV_GOOD = 1e-1  # < 10 %
# ---------------------------------------------------------------------------


def _classify(rel_dev: float) -> str:
    if rel_dev < DEV_EXCELLENT:
        return "excellent"
    if rel_dev < DEV_GOOD:
        return "good"
    return "failed"


def _parse_coeffs(coefs: List[float]):
    if len(coefs) < 5:
        raise ValueError(
            "Need ≥5 coefficients [c_tt,c_xx,mass,interaction,gauge,(gravity)].")
    
    # Handle GA format: [c_tt, c_xx, mass, interaction, gauge, gravity]
    a = abs(coefs[0])  # kinetic time coeff (positive)
    bx = coefs[1]      # spatial x coefficient
    
    # For GA format, assume isotropy (by = bz = bx)
    by = bx  # Use same spatial coefficient for y
    bz = bx  # Use same spatial coefficient for z
    
    # In GA format, we don't have a cross derivative term
    dxy = 0.0
    
    # Gravity coefficient is the 6th element if present
    kappa6 = coefs[5] if len(coefs) >= 6 else None
    
    return a, bx, by, bz, dxy, kappa6


def spin2_zero_mode(coefs: List[float]) -> dict:
    # --- metric sanity ------------------------------------------------------
    a, bx, by, bz, dxy, kappa6 = _parse_coeffs(coefs)
    if not (bx > 0 and by > 0 and bz > 0):
        return {"ok": False, "reason": f"non-hyperbolic spatial metric: bx={bx}, by={by}, bz={bz} (all must be positive)"}
    if abs(dxy) > 1e-12:
        return {"ok": False, "reason": f"mixed dxy={dxy} breaks separability (should be ~0)"}

    # --- RS-like warp profile ----------------------------------------------
    k = math.sqrt(abs(by) / a)  # curvature scale  (heuristic)
    L = math.sqrt(abs(bx) / abs(by))  # half-width of extra dimension

    # analytic zero-mode ψ₀(y)=N e^{-2k|y|}
    # Normalisation: ∫_{-L}^{+L} ψ₀² dy = 1  ➔  N = √[k / (1-e^{-4kL})]
    exp_term = math.exp(-4.0 * k * L)
    norm_const = math.sqrt(k / (1.0 - exp_term + 1e-30))

    # central amplitude
    psi0 = norm_const

    # 4-D Newton constant
    int_val = (1.0 - exp_term) / k  # ∫ ψ₀² dy
    if kappa6 is None or kappa6 <= 0:
        return {"ok": False, "reason": f"κ₆² (6th coefficient) missing or non-positive: {kappa6}. Need positive gravity coefficient."}

    G4 = kappa6 * int_val

    rel_dev = abs(G4 - G_TARGET) / G_TARGET
    return {
        "ok": True,
        "psi0": psi0,
        "G4": G4,
        "relDev": rel_dev,
        "classification": _classify(rel_dev),
        "details": {
            "k": k,
            "L": L,
            "integral": int_val
        }
    }


# ------------------------------------------------------------------ CLI wrap
def main() -> None:
    if len(sys.argv) != 2:
        print(
            json.dumps({
                "success": False,
                "error": "Usage: worker '{…json…}'"
            }))
        sys.exit(1)

    try:
        params = json.loads(sys.argv[1])
        result = spin2_zero_mode(params["coefficients"])
        if not result["ok"]:
            raise ValueError(result["reason"])

        print(
            json.dumps({
                "success": True,
                "psi0": result["psi0"],
                "newtonConstant": result["G4"],
                "relativeDeviation": result["relDev"],
                "classification": result["classification"],
                "details": result["details"]
            }))

    except Exception as exc:
        print(
            json.dumps({
                "success": False,
                "error": f"Spin-2 zero-mode test error: {exc}"
            }))
        sys.exit(1)


if __name__ == "__main__":
    main()
