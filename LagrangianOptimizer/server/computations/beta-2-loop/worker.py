# ──────────────────────────────────────────────────────────────────────────────
# ── file: beta2loop.py
#     2‑loop stability of the UV fixed point (scalar + R² toy model)
# ----------------------------------------------------------------------------

import json
import sys

import sympy as sp
from mpmath import mp

mp.dps = 50
π = sp.pi


def _to_float(expr):  # helper to preserve precision until output
    return float(expr.evalf(mp.dps))


lam, a2, g = sp.symbols("lam a2 g", real=True)
# 2‑loop contributions (Literature: Machacek & Vaughn, *NPB* 222, 83 (1983))
beta_lam = 3 * lam**2 / (16 * π**2) + 17 * lam**3 / (768 * π**4)
beta_a2 = -5 * a2**2 / (96 * π**2) + a2**3 / (1152 * π**4)
beta_g = g * lam / (16 * π**2) + 5 * g**2 / (256 * π**4)


def main() -> None:
    try:
        payload = json.loads(sys.argv[1])
        operators = payload.get("operators", [])
        
        # Validate operators array
        if not operators:
            print(json.dumps({
                "success": False,
                "error": "No operators provided. Please run dimensional reduction test first."
            }))
            sys.exit(1)
            
        # Extract operator coefficients
        ops = {
            op["name"]: float(op["coeff"])
            for op in operators
            if isinstance(op, dict) and "name" in op and "coeff" in op
        }
        
        # Check if we have the required operators
        required_ops = ["phi4", "R2", "phi2R"]
        missing_ops = [op for op in required_ops if op not in ops]
        if missing_ops:
            print(json.dumps({
                "success": False,
                "error": f"Missing required operators: {', '.join(missing_ops)}"
            }))
            sys.exit(1)
        
        # Get values with defaults
        lam_val = ops.get("phi4", 0.0)
        a2_val = ops.get("R2", 0.0)
        g_val = ops.get("phi2R", 0.0)
        
        # Check if all values are zero
        if lam_val == 0.0 and a2_val == 0.0 and g_val == 0.0:
            print(json.dumps({
                "success": False,
                "error": "All operator coefficients are zero. Please ensure dimensional reduction test completed successfully."
            }))
            sys.exit(1)
            
        # Substitute values
        subs = {
            lam: lam_val,
            a2: a2_val,
            g: g_val
        }

        beta2 = {
            "phi4": _to_float(beta_lam.subs(subs)),
            "R2": _to_float(beta_a2.subs(subs)),
            "phi2R": _to_float(beta_g.subs(subs))
        }
        maxb = max(abs(v) for v in beta2.values())
        
        print(
            json.dumps({
                "success": True,
                "beta2": beta2,
                "maxBeta2": maxb,
                "convergent": maxb < 1e-3,
                "input_operators": ops  # Include input for debugging
            }))
            
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid JSON input: {str(e)}"
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Computation failed: {str(e)}"
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
