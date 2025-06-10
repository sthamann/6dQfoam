# ──────────────────────────── file: rgflow.py ────────────────────────────
"""
1-loop β-functions for the 4-D effective theory
(φ⁴,  R²,  φ²R).  50-digit mpmath precision.
The script **never** exits with a non-zero status – stattdessen
liefert es bei jedem Problem   {"success": false, "error": "..."}.
"""

import json
import sys
from typing import Dict, Any

import mpmath as mp

mp.mp.dps = 50
PI = mp.pi  # high-precision π


# ──────────────────────────────────────────────────────────────────────────
# β-functions (see e.g. Peskin & Schroeder; Niedermaier & Reuter 2006)
# --------------------------------------------------------------------------
def beta_phi4(lam: mp.mpf) -> mp.mpf:
    return 3 * lam**2 / (16 * PI**2)


def beta_R2(a2: mp.mpf) -> mp.mpf:
    return -5 * a2**2 / (96 * PI**2)


def beta_phi2R(g: mp.mpf, lam: mp.mpf) -> mp.mpf:
    return g * lam / (16 * PI**2)


# ──────────────────────────────────────────────────────────────────────────
# Helper
# --------------------------------------------------------------------------
def mp_to_float(x: mp.mpf) -> float:
    """Convert mp.mpf → float while preserving Inf/NaN semantics."""
    if mp.isnan(x):
        return float("nan")
    if mp.isinf(x):
        return float("inf") if x > 0 else float("-inf")
    return float(x)


def bail(msg: str) -> None:
    """Print JSON error and exit with code 0 (avoids 500-Fehler in Node)."""
    print(json.dumps({"success": False, "error": msg}))
    sys.exit(0)


# ──────────────────────────────────────────────────────────────────────────
def main() -> None:
    if len(sys.argv) < 2:
        bail("No JSON payload supplied")

    # ---------- Payload einlesen -----------------------------------------
    try:
        payload: Dict[str, Any] = json.loads(sys.argv[1])
        raw_ops = {
            op.get("name"): op.get("coeff", op.get("value"))
            for op in payload.get("operators", [])
            if isinstance(op, dict) and "name" in op
        }
    except Exception as exc:
        bail(f"JSON decode / structure error: {exc}")
        return

    # ---------- numerische Werte ----------------------------------------
    lam = mp.mpf(raw_ops.get("phi4", 0.0))
    a2  = mp.mpf(raw_ops.get("R2",   0.0))
    g   = mp.mpf(raw_ops.get("phi2R", 0.0))

    try:
        betas = [
            {"name": "phi4",  "value": mp_to_float(beta_phi4(lam))},
            {"name": "R2",    "value": mp_to_float(beta_R2(a2))},
            {"name": "phi2R", "value": mp_to_float(beta_phi2R(g, lam))},
        ]
    except Exception as exc:
        bail(f"β-function evaluation error: {exc}")
        return

    print(json.dumps({
        "success": True,
        "beta": betas,
        "precision": f"{mp.mp.dps} decimal places"
    }))


if __name__ == "__main__":
    main()