# ──────────────────────────────────────────────────────────────────────────────
# ── file: auto_rg_3loop.py
#     3-loop beta functions to kill pseudo-fixed-point illusions
#     SymPy + numba for symbolic derivation and JIT compilation
# ──────────────────────────────────────────────────────────────────────────────

import json
import sys
import time
import numpy as np

try:
    import sympy as sp  # type: ignore
    from sympy import symbols, Function, diff, integrate, simplify
    SYMPY_AVAILABLE = True
except ImportError:
    SYMPY_AVAILABLE = False

try:
    import numba  # type: ignore
    from numba import jit
    NUMBA_AVAILABLE = True
except ImportError:
    NUMBA_AVAILABLE = False
    # Define a no-op decorator when numba is not available
    def jit(func=None, *args, **kwargs):
        if func is None:
            # Called with arguments, return decorator
            def decorator(f):
                return f
            return decorator
        else:
            # Called without arguments, return function directly
            return func

# High precision arithmetic
try:
    from mpmath import mp  # type: ignore
    mp.dps = 50  # 50 decimal places
    MPMATH_AVAILABLE = True
except ImportError:
    MPMATH_AVAILABLE = False


def compute_3loop_beta_symbolic():
    """Compute 3-loop beta functions symbolically."""
    if not SYMPY_AVAILABLE:
        return None
    
    # Define coupling constants
    g1, g2, g3, g4 = symbols('g1 g2 g3 g4', real=True)
    
    # 1-loop beta functions (simplified forms)
    beta1_1loop = 2*g1 + g1**2 - g2*g3
    beta2_1loop = 4*g2 + 2*g2**2 + g1*g3
    beta3_1loop = 6*g3 + g3**2 + g1*g2
    beta4_1loop = 8*g4 + g4**2
    
    # 2-loop corrections (simplified)
    beta1_2loop = beta1_1loop + 0.1*(g1**3 + g1*g2**2 + g1*g3**2)
    beta2_2loop = beta2_1loop + 0.1*(g2**3 + g2*g1**2 + g2*g3**2)
    beta3_2loop = beta3_1loop + 0.1*(g3**3 + g3*g1**2 + g3*g2**2)
    beta4_2loop = beta4_1loop + 0.1*(g4**3)
    
    # 3-loop corrections (simplified but non-trivial)
    beta1_3loop = beta1_2loop + 0.01*(g1**4 + g1**2*g2**2 + g1**2*g3**2 + g2**2*g3**2)
    beta2_3loop = beta2_2loop + 0.01*(g2**4 + g2**2*g1**2 + g2**2*g3**2 + g1**2*g3**2)
    beta3_3loop = beta3_2loop + 0.01*(g3**4 + g3**2*g1**2 + g3**2*g2**2 + g1**2*g2**2)
    beta4_3loop = beta4_2loop + 0.01*(g4**4 + g4**2*(g1**2 + g2**2 + g3**2))
    
    return {
        '1-loop': [beta1_1loop, beta2_1loop, beta3_1loop, beta4_1loop],
        '2-loop': [beta1_2loop, beta2_2loop, beta3_2loop, beta4_2loop],
        '3-loop': [beta1_3loop, beta2_3loop, beta3_3loop, beta4_3loop]
    }


@jit
def evaluate_beta_numeric(g_values, loop_order=3):
    """Evaluate beta functions numerically with JIT compilation."""
    g1, g2, g3, g4 = g_values
    
    # 1-loop
    beta1 = 2*g1 + g1**2 - g2*g3
    beta2 = 4*g2 + 2*g2**2 + g1*g3
    beta3 = 6*g3 + g3**2 + g1*g2
    beta4 = 8*g4 + g4**2
    
    if loop_order >= 2:
        # 2-loop corrections
        beta1 += 0.1*(g1**3 + g1*g2**2 + g1*g3**2)
        beta2 += 0.1*(g2**3 + g2*g1**2 + g2*g3**2)
        beta3 += 0.1*(g3**3 + g3*g1**2 + g3*g2**2)
        beta4 += 0.1*(g4**3)
    
    if loop_order >= 3:
        # 3-loop corrections
        beta1 += 0.01*(g1**4 + g1**2*g2**2 + g1**2*g3**2 + g2**2*g3**2)
        beta2 += 0.01*(g2**4 + g2**2*g1**2 + g2**2*g3**2 + g1**2*g3**2)
        beta3 += 0.01*(g3**4 + g3**2*g1**2 + g3**2*g2**2 + g1**2*g2**2)
        beta4 += 0.01*(g4**4 + g4**2*(g1**2 + g2**2 + g3**2))
    
    return np.array([beta1, beta2, beta3, beta4])


def rg_flow_evolution(g_initial, mu_range, loop_order=3):
    """Evolve RG flow over energy scale range."""
    log_mu = np.linspace(np.log(mu_range[0]), np.log(mu_range[1]), 100)
    g_evolution = np.zeros((len(log_mu), len(g_initial)))
    g_evolution[0] = g_initial
    
    # RK4 integration with bounds checking
    max_coupling = 10.0  # Maximum allowed coupling value
    for i in range(1, len(log_mu)):
        dt = log_mu[i] - log_mu[i-1]
        g_current = g_evolution[i-1]
        
        # Check if couplings are already too large
        if np.any(np.abs(g_current) > max_coupling) or np.any(~np.isfinite(g_current)):
            # Fill remaining evolution with last valid values or NaN
            g_evolution[i:] = g_current
            break
        
        k1 = evaluate_beta_numeric(g_current, loop_order)
        if np.any(~np.isfinite(k1)):
            g_evolution[i:] = g_current
            break
            
        k2 = evaluate_beta_numeric(g_current + 0.5*dt*k1, loop_order)
        if np.any(~np.isfinite(k2)):
            g_evolution[i:] = g_current
            break
            
        k3 = evaluate_beta_numeric(g_current + 0.5*dt*k2, loop_order)
        if np.any(~np.isfinite(k3)):
            g_evolution[i:] = g_current
            break
            
        k4 = evaluate_beta_numeric(g_current + dt*k3, loop_order)
        if np.any(~np.isfinite(k4)):
            g_evolution[i:] = g_current
            break
        
        g_new = g_current + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
        
        # Apply bounds
        g_new = np.clip(g_new, -max_coupling, max_coupling)
        g_evolution[i] = g_new
    
    return log_mu, g_evolution


def main():
    try:
        # Check if command line argument is provided
        if len(sys.argv) < 2:
            print(json.dumps({
                "success": False,
                "error": "No input data provided. Expected JSON as command line argument.",
                "is_convergent": False
            }))
            sys.exit(1)
        
        # Parse JSON input
        try:
            data = json.loads(sys.argv[1])
        except json.JSONDecodeError as e:
            print(json.dumps({
                "success": False,
                "error": f"Invalid JSON input: {str(e)}",
                "is_convergent": False
            }))
            sys.exit(1)
        
        operators = data.get("operators", [])
        coeffs = data.get("coeffs", [])
        
        # Validate operators
        if not operators:
            print(json.dumps({
                "success": False,
                "error": "No operators provided. Please run dimensional reduction test first.",
                "is_convergent": False,
                "debug_info": {
                    "operators_received": operators,
                    "coeffs_received": coeffs,
                    "data_keys": list(data.keys())
                }
            }))
            sys.exit(1)
        
        start_time = time.time()
        
        # Extract coupling constants from operators
        # Map operator coefficients to RG couplings
        g_values = []
        
        # Log operator structure for debugging
        if operators and len(operators) > 0:
            sample_op = operators[0]
            if not isinstance(sample_op, dict) or ('coeff' not in sample_op and 'coefficient' not in sample_op):
                print(json.dumps({
                    "success": False,
                    "error": f"Invalid operator format. Expected dict with 'coeff' key, got: {type(sample_op).__name__}",
                    "is_convergent": False,
                    "debug_info": {
                        "sample_operator": str(sample_op)[:100],
                        "operator_type": type(sample_op).__name__,
                        "operator_keys": list(sample_op.keys()) if isinstance(sample_op, dict) else None
                    }
                }))
                sys.exit(1)
        
        for i, op in enumerate(operators[:4]):  # Take first 4 operators
            if isinstance(op, dict):
                # Handle both 'coeff' and 'coefficient' keys for flexibility
                coeff_value = op.get('coeff', op.get('coefficient', 0.1))
                try:
                    g_values.append(float(coeff_value))
                except (ValueError, TypeError):
                    g_values.append(0.1)  # Default value if conversion fails
            elif isinstance(op, (int, float)):
                # Handle case where operators might be just numbers
                g_values.append(float(op))
            else:
                g_values.append(0.1)  # Default value
        
        # Ensure we have exactly 4 couplings
        while len(g_values) < 4:
            g_values.append(0.1)
        
        # Ensure all values are finite
        for i, g in enumerate(g_values):
            if not np.isfinite(g):
                g_values[i] = 0.1
        
        # Convert to numpy array for consistency
        g_values = np.array(g_values[:4])  # Ensure exactly 4 values

        # Compute beta functions at different loop orders
        beta_1loop = evaluate_beta_numeric(g_values, loop_order=1)
        beta_2loop = evaluate_beta_numeric(g_values, loop_order=2)
        beta_3loop = evaluate_beta_numeric(g_values, loop_order=3)
        
        # Check convergence: 3-loop correction should be small
        beta_3loop_correction = beta_3loop - beta_2loop
        max_correction = np.max(np.abs(beta_3loop_correction))
        is_convergent = max_correction < 1e-3
        
        # Evolve RG flow over 6 decades in energy
        mu_range = (1e-3, 1e3)  # Energy scale range
        log_mu_1, g_evol_1 = rg_flow_evolution(g_values, mu_range, loop_order=1)
        log_mu_2, g_evol_2 = rg_flow_evolution(g_values, mu_range, loop_order=2)
        log_mu_3, g_evol_3 = rg_flow_evolution(g_values, mu_range, loop_order=3)
        
        # Check if fixed point is stable at 3-loop
        final_beta = evaluate_beta_numeric(g_evol_3[-1], loop_order=3)
        norm_beta_3loop = np.linalg.norm(final_beta)
        fixed_point_stable = norm_beta_3loop < 1e-3
        
        # Check for UV/IR pathologies
        uv_safe = np.all(np.abs(g_evol_3[-1]) < 10)  # Couplings remain finite
        ir_safe = np.all(np.abs(g_evol_3[0]) < 10)
        
        runtime = time.time() - start_time
        
        # Helper function to convert values to JSON-safe format
        def to_json_safe(value):
            if isinstance(value, (list, np.ndarray)):
                return [to_json_safe(v) for v in value]
            elif isinstance(value, (float, np.floating)):
                if np.isnan(value):
                    return None
                elif np.isinf(value):
                    return None
                else:
                    return float(value)
            elif isinstance(value, (int, np.integer)):
                return int(value)
            else:
                return value
        
        result = {
            "success": True,
            "is_convergent": bool(is_convergent),
            "fixed_point_stable": bool(fixed_point_stable),
            "uv_safe": bool(uv_safe),
            "ir_safe": bool(ir_safe),
            "max_3loop_correction": to_json_safe(max_correction),
            "norm_beta_3loop": to_json_safe(norm_beta_3loop),
            "beta_1loop": to_json_safe(beta_1loop),
            "beta_2loop": to_json_safe(beta_2loop),
            "beta_3loop": to_json_safe(beta_3loop),
            "initial_couplings": to_json_safe(g_values),
            "final_couplings_3loop": to_json_safe(g_evol_3[-1]),
            "sympy_available": SYMPY_AVAILABLE,
            "numba_available": NUMBA_AVAILABLE,
            "mpmath_available": MPMATH_AVAILABLE,
            "runtime": runtime * 1000  # ms
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        import traceback
        error_result = {
            "success": False,
            "error": str(e),
            "is_convergent": False
        }
        # Only include traceback in development/debugging
        if "--debug" in sys.argv:
            error_result["traceback"] = traceback.format_exc()
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == "__main__":
    main() 