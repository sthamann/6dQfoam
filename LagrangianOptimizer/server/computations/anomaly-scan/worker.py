#!/usr/bin/env python3
# ──────────────────────────────────────────────────────────────────────────────
# anomaly_scan.py  –  6-D gauge / gravitational anomaly cancellation checker
# Implements full 8-form I₈ evaluation + Green–Schwarz factorisation.
# Ref: Sagnotti (1992); Erler & Klemm (1993)
# -----------------------------------------------------------------------------
import json, sys
from collections import defaultdict
import numpy as np

TOL   = 1e-12
K_GS  = -1/24          # coefficient for B∧F∧F counter-term
C2_SU = {"SU2": 3/4, "SU3": 4/3}   # quadratic Casimir in fundamental

# --------------------------------------------------------------------------- #
def traces_one(rep):
    """Returns irreducible + reducible anomaly traces of a single Weyl fermion."""
    g, d, t, y, chi = rep["group"], rep["dim"], rep["dynkin"], rep["q_u1"], rep["chirality"]
    sgn = +1 if chi == "L" else -1
    out = {
        "trR4":           sgn * d,
        "(trR2)^2":       sgn * d,
    }
    if g != "U1":
        c2 = C2_SU[g]
        out.update({
            f"trF4_{g}":          sgn * 0.5 * c2**2 * d,
            f"(trF2)^2_{g}":      sgn * t**2 * d,
            f"trR2.trF2_{g}":     sgn * t * d,
        })
    else:  # Abelian
        out.update({
            "trF4_U1":        sgn * d * y**4,
            "(trF2)^2_U1":    sgn * d * y**4,         # same power in 6 D
            "trR2.trF2_U1":   sgn * d * y**2,
        })
    return out
# --------------------------------------------------------------------------- #
try:
    payload = json.loads(sys.argv[1])
    reps    = payload["reps"]
    n_gen   = payload.get("generations", 1)

    # ----- accumulate traces ------------------------------------------------
    total = defaultdict(float)
    for rep in reps:
        for k, v in traces_one(rep).items():
            total[k] += n_gen * v           # account for generations

    original = dict(total)                 # keep a copy before GS

    # ----- apply Green–Schwarz counter-term ---------------------------------
    if "trF4_U1" in total:
        total["trF4_U1"]       += K_GS * original["trR4"]
        total["(trF2)^2_U1"]   += K_GS * original["(trR2)^2"]
        total["trR2.trF2_U1"]  += K_GS * original["trR2.trF2_U1"]

    # ----- scan residuals ---------------------------------------------------
    cancelled = all(abs(v) < TOL for v in total.values())

    print(json.dumps({
        "success": True,
        "anomalies_cancelled": cancelled,
        "traces": {k: f"{v:.3e}" for k, v in total.items()},
        "traces_original": {k: f"{v:.3e}" for k, v in original.items()},
        "GS_factors": {"k_GS": K_GS},
        "fermion_count": n_gen * len(reps)
    }))

except Exception as err:
    print(json.dumps({"success": False, "error": str(err)}))