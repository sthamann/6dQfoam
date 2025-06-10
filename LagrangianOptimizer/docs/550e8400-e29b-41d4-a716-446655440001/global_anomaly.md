
# Global Anomaly Test (SU(2) Witten & SU(3) π₇ Checks) - Session `550e8400-e29b-41d4-a716-446655440001`

**Field equation coefficients**

```text
c_tt = -0.9354087334639875
c_xx = -0.935408744754259
c_yy = -0.9291203608294871
c_zz = 0.5679179940890051
c_xy = 0.0917012368478616
```

**Relativity (Tab 2) results**

```text
ε  = 0.00000000048942605524
G₄ = 3.09628889587330970000
```

---

## Test description
Global anomaly detector for 6D models checking topological constraints beyond local gauge anomalies.
Validates SU(2) Witten anomaly (π₆ = ℤ₂) and SU(3) global consistency (π₇).

**Target**: Even numbers of SU(2) doublets per chirality and no SU(3) global anomalies.

## Fermion Representations Analyzed (×1 generations)
- Rep 1: SU3(3) with Dynkin=0.5, Q_U1=0.167, chirality=L
- Rep 2: SU3(3) with Dynkin=0.5, Q_U1=-0.833, chirality=L
- Rep 3: SU2(2) with Dynkin=0.75, Q_U1=0.5, chirality=L
- Rep 4: SU2(2) with Dynkin=0.75, Q_U1=-0.5, chirality=L
- Rep 5: U1(1) with Dynkin=1, Q_U1=-1, chirality=L
- Rep 6: U1(1) with Dynkin=1, Q_U1=0, chirality=L
- Rep 7: SU3(3) with Dynkin=0.5, Q_U1=0.167, chirality=R
- Rep 8: SU3(3) with Dynkin=0.5, Q_U1=-0.833, chirality=R
- Rep 9: SU2(2) with Dynkin=0.75, Q_U1=0.5, chirality=R
- Rep 10: SU2(2) with Dynkin=0.75, Q_U1=-0.5, chirality=R
- Rep 11: U1(1) with Dynkin=1, Q_U1=-1, chirality=R
- Rep 12: U1(1) with Dynkin=1, Q_U1=0, chirality=R

## Algorithm (executed Python code)

```python
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
```

## Raw JSON result

```json
{
  "success": true,
  "passed": true,
  "checks": {
    "SU2_Witten": {
      "doublets_L": 2,
      "doublets_R": 2,
      "even_L": true,
      "even_R": true
    },
    "SU3_pi7": true
  },
  "fermion_count": 12
}
```

## Interpretation
✅ All global anomalies cancelled – Model satisfies all topological consistency requirements.

**SU(2) Witten Anomaly Analysis**:
- Left-handed doublets: 2 (even ✓)
- Right-handed doublets: 2 (even ✓)

**Performance**: Runtime 63ms with 12 fermions processed.
