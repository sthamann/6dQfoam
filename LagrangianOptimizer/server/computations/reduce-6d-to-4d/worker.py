# ──────────────────────────────────────────────────────────────────────────────
# ── file: reduce6Dto4D.py
#     Dimensional reduction using the computed ψ₀ wave-function
# ----------------------------------------------------------------------------

import json
import sys
from typing import List

import numpy as np


DEF_M6 = 1.0  # 6-D Planck scale in simulation units


def safe_jsonify(value: float) -> float:
    """Convert Inf/NaN to safe JSON values"""
    if np.isnan(value):
        return 0.0
    elif np.isinf(value):
        return 1e308 if value > 0 else -1e308
    else:
        return float(value)


def main() -> None:
    try:
        data = json.loads(sys.argv[1])
        coeffs = data["coeffs"]
        psi0: List[float] = data.get("psi0", [])

        if not psi0:
            print(json.dumps({
                "success": False, 
                "error": "psi0 profile required for reliable reduction"
            }))
            sys.exit(1)

        # Validate coeffs
        if not coeffs or len(coeffs) < 4:
            print(json.dumps({
                "success": False,
                "error": "coeffs array must have at least 4 elements"
            }))
            sys.exit(1)
        
        if coeffs[0] == 0:
            print(json.dumps({
                "success": False,
                "error": "coeffs[0] cannot be zero (division by zero)"
            }))
            sys.exit(1)

        y = np.linspace(-5.0, 5.0, len(psi0))
        vol_factor = np.trapezoid(np.array(psi0) ** 2, y)

        # 4-D Planck mass from RS1: M_P^2 = M_6^4 / k * vol_factor
        k = 1.0  # same K_RS as grav_zero
        MP2 = DEF_M6**4 / k * vol_factor

        # Build minimal operator set (tree-level Wilson coefficients)
        alpha = abs(coeffs[1] / coeffs[0])
        lam = coeffs[3] / abs(coeffs[0])
        m2 = coeffs[2] / abs(coeffs[0])

        operators = [
            {"name": "R2", "coeff": safe_jsonify(0.5 * alpha**2 / MP2)},
            {"name": "phi4", "coeff": safe_jsonify(0.75 * lam**2 / MP2)},
            {"name": "phi2R", "coeff": safe_jsonify(alpha * m2 / MP2)},
        ]

        print(json.dumps({"success": True, "MP2": safe_jsonify(MP2), "operators": operators}))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Computation failed: {str(e)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main() 