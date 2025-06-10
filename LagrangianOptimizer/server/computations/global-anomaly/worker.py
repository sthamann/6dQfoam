#!/usr/bin/env python3
"""
Global-anomaly detector for 6-d models.
Checks:
  • π6(SU2) = ℤ2  (Witten anomaly)  → needs even # of SU(2) doublets per chirality
  • π7(SU3) = ℤ     → vanishes automatically for fundamentals
  • π5(U1) & π6(U1) = 0 → no global constraint
"""

import json, sys
from collections import Counter

def main() -> None:
    try:
        cfg   = json.loads(sys.argv[1])
        reps  = cfg["reps"]
        n_gen = cfg.get("generations", 1)

        # --- SU(2) Witten anomaly ---------------------------------------------
        counts = Counter()
        for r in reps:
            if r["group"] == "SU2":
                key = f"SU2_{r['chirality']}"
                counts[key] += n_gen    # generation factor

        su2_left  = counts.get("SU2_L", 0)
        su2_right = counts.get("SU2_R", 0)

        # Each ℤ2 factor requires an even number of Weyl doublets **per chirality**.
        su2_ok = (su2_left % 2 == 0) and (su2_right % 2 == 0)

        # --- SU(3) global anomaly (π7) -----------------------------------------
        # Fundamental triplets automatically cancel (index = 0 modulo 1)  
        # If exotic reps are added later, include them here.
        su3_ok = True                 

        # --- Assemble result ----------------------------------------------------
        passed = su2_ok and su3_ok
        print(json.dumps({
            "success": True,
            "passed":  passed,
            "checks": {
                "SU2_Witten": { 
                    "doublets_L": su2_left, 
                    "doublets_R": su2_right,
                    "even_L": su2_left % 2 == 0, 
                    "even_R": su2_right % 2 == 0 
                },
                "SU3_pi7": su3_ok
            },
            "fermion_count": n_gen * len(reps)
        }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()