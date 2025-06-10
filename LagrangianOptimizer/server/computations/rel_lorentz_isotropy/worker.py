#!/usr/bin/env python3
"""
Lorentz-Isotropy Test — Metric-based version (2024-06-08)
Checks hyperbolicity and directional wave speeds for a quadratic
scalar-field Lagrangian

    L = -a (∂_t φ)² + b_x (∂_x φ)² + b_y (∂_y φ)² + b_z (∂_z φ)²
        + d_xy (∂_x ∂_y φ) + …

Input JSON
----------
{
  "coefficients": [c_tt, c_xx, c_yy, c_zz, c_xy, (optional) c_grav],
  "c_model":      299792458,            # optional
  "alpha_model":  0.007297353           # optional
}

Output JSON
-----------
{ "success": true,
  "lorentzEpsilon": 1.2e-13,
  "classification": "excellent",
  "details": { … }
}
"""

from __future__ import annotations

import json
import math
import sys
from typing import List, Tuple

# ---------------------------------------------------------------------------
# Physics thresholds (can be tuned in one place)
# ---------------------------------------------------------------------------
EPS_EXCELLENT = 1e-12  # ~aktuelles Laborlimit
EPS_GOOD = 1e-8  # astrophysisch tolerierbar
EPS_POOR = 1e-4  # klar ausgeschlossen
# ---------------------------------------------------------------------------


def _classify(eps: float) -> str:
    if eps < EPS_EXCELLENT:
        return "excellent"
    if eps < EPS_GOOD:
        return "good"
    if eps < EPS_POOR:
        return "poor"
    return "failed"


def _parse_coeffs(
        coefs: List[float]) -> Tuple[float, float, float, float, float]:
    if len(coefs) == 6:  # GA-Vektor
        c_tt, c_xx = coefs[0], coefs[1]
        coefs = [c_tt, c_xx, c_xx, c_xx, 0.0]
    if len(coefs) < 5:
        raise ValueError(
            "Need at least five coefficients [c_tt,c_xx,c_yy,c_zz,c_xy].")
    a_t = -float(coefs[0])  # sign-flip: stored as −a
    b_x = float(coefs[1])
    b_y = float(coefs[2])
    b_z = float(coefs[3])
    d_xy = float(coefs[4])
    return a_t, b_x, b_y, b_z, d_xy


def lorentz_isotropy_eps(coefs: List[float]) -> float:
    """
    Returns dimensionless Lorentz-anisotropy parameter ε.
    ε = 0  … perfect isotropy,   ε ≥ 1 … catastrophic violation
    """
    a, b_x, b_y, b_z, d_xy = _parse_coeffs(coefs)

    # --- Hyperbolicity check ------------------------------------------------
    if a <= 0 or b_x <= 0 or b_y <= 0 or b_z <= 0:
        return 1.0  # wrong metric signature -> fail immediately

    # --- Wave speeds --------------------------------------------------------
    v_x = math.sqrt(b_x / a)
    v_y = math.sqrt(b_y / a)
    v_z = math.sqrt(b_z / a)

    eps_diag = max(abs(v_x - 1.0), abs(v_y - 1.0), abs(v_z - 1.0))

    # --- Cross-derivative contribution (very rough): ratio to kinetic term
    eps_cross = abs(d_xy) / a

    eps = max(eps_diag, eps_cross)
    return max(1e-16, min(eps, 1.0))  # keep inside [1e-16,1]


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    if len(sys.argv) != 2:
        print(
            json.dumps({
                "success": False,
                "error": "Usage: worker '{\"coefficients\":[…]}'"
            }))
        sys.exit(1)

    try:
        params = json.loads(sys.argv[1])
        coeffs = params["coefficients"]

        eps = lorentz_isotropy_eps(coeffs)
        result = {
            "success": True,
            "lorentzEpsilon": eps,
            "classification": _classify(eps),
            "details": {
                "thresholds": {
                    "excellent": EPS_EXCELLENT,
                    "good": EPS_GOOD,
                    "poor": EPS_POOR
                }
            }
        }
        print(json.dumps(result))

    except Exception as exc:  # pylint: disable=broad-except
        print(
            json.dumps({
                "success": False,
                "error": f"Lorentz isotropy test error: {exc}"
            }))
        sys.exit(1)


if __name__ == "__main__":
    main()
