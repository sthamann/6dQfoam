# ──────────────────────────────────────────────────────────────────────────────
# ── file: positivity_unitarity.py
#     S-Matrix positivity and unitarity bounds check
#     Uses convex optimization to test EFT bounds in 4D projection
# ──────────────────────────────────────────────────────────────────────────────

import json
import sys
import time
import numpy as np

try:
    import cvxpy as cp  # type: ignore
    CVXPY_AVAILABLE = True
except ImportError:
    CVXPY_AVAILABLE = False


def check_positivity_bounds(operators):
    """Check S-matrix positivity bounds using convex optimization."""
    if not CVXPY_AVAILABLE:
        # Fallback to simple checks
        return check_simple_positivity(operators)
    
    # Extract operator coefficients
    alpha_values = []
    rho_values = []
    
    for op in operators:
        if isinstance(op, dict):
            name = op.get('name', '')
            coeff = float(op.get('coeff', 0))
            
            if 'R2' in name or 'curvature' in name.lower():
                alpha_values.append(coeff)
            elif 'phi4' in name or 'quartic' in name.lower():
                rho_values.append(coeff)
            elif 'phi2R' in name or 'mixed' in name.lower():
                # Mixed operators contribute to both
                alpha_values.append(coeff * 0.5)
                rho_values.append(coeff * 0.5)
    
    # Ensure we have at least some coefficients
    if not alpha_values:
        alpha_values = [0.1]
    if not rho_values:
        rho_values = [0.1]
    
    # Define convex optimization problem
    # Variables
    n_alpha = len(alpha_values)
    n_rho = len(rho_values)
    
    alpha = cp.Variable(n_alpha)
    rho = cp.Variable(n_rho)
    
    # Constraints from unitarity and positivity
    constraints = []
    
    # Positivity constraints: all coefficients must be positive
    constraints.append(alpha >= 0)
    constraints.append(rho >= 0)
    
    # Additional EFT bounds (simplified Adams et al. style)
    # For gravity: a_0 + a_2 s^2 > 0 for all s > 0
    # This translates to constraints on combinations of operators
    
    # Unitarity bounds: |a_l| < 1 for partial wave amplitudes
    # Simplified: sum of coefficients bounded
    constraints.append(cp.sum(alpha) <= 1.0)
    constraints.append(cp.sum(rho) <= 1.0)
    
    # Cross-constraints from dispersion relations
    if n_alpha > 0 and n_rho > 0:
        constraints.append(alpha[0] + rho[0] >= 0.01)  # Ensure non-trivial solution
    
    # Objective: minimize distance from input values
    alpha_target = np.array(alpha_values)
    rho_target = np.array(rho_values)
    
    objective = cp.Minimize(
        cp.sum_squares(alpha - alpha_target) + 
        cp.sum_squares(rho - rho_target)
    )
    
    # Solve
    prob = cp.Problem(objective, constraints)
    
    try:
        prob.solve(solver=cp.OSQP)
        
        if prob.status in ['optimal', 'optimal_inaccurate']:
            # Check if solution satisfies all bounds
            alpha_sol = alpha.value
            rho_sol = rho.value
            
            # Check positivity
            alpha_positive = np.all(alpha_sol >= -1e-6)
            rho_positive = np.all(rho_sol >= -1e-6)
            
            # Check how close we are to original values
            alpha_deviation = np.linalg.norm(alpha_sol - alpha_target)
            rho_deviation = np.linalg.norm(rho_sol - rho_target)
            
            bounds_satisfied = (
                alpha_positive and rho_positive and
                alpha_deviation < 0.1 and rho_deviation < 0.1
            )
            
            return {
                'bounds_satisfied': bounds_satisfied,
                'alpha_positive': alpha_positive,
                'rho_positive': rho_positive,
                'alpha_deviation': float(alpha_deviation),
                'rho_deviation': float(rho_deviation),
                'alpha_values': alpha_sol.tolist(),
                'rho_values': rho_sol.tolist(),
                'optimization_status': prob.status
            }
        else:
            return {
                'bounds_satisfied': False,
                'alpha_positive': False,
                'rho_positive': False,
                'optimization_status': prob.status,
                'error': 'Optimization failed'
            }
            
    except Exception as e:
        return {
            'bounds_satisfied': False,
            'error': str(e),
            'optimization_status': 'error'
        }


def check_simple_positivity(operators):
    """Simple positivity check without cvxpy."""
    alpha_positive = True
    rho_positive = True
    
    for op in operators:
        if isinstance(op, dict):
            coeff = float(op.get('coeff', 0))
            name = op.get('name', '')
            
            if coeff < 0:
                if 'R2' in name or 'curvature' in name.lower():
                    alpha_positive = False
                elif 'phi4' in name or 'quartic' in name.lower():
                    rho_positive = False
    
    return {
        'bounds_satisfied': alpha_positive and rho_positive,
        'alpha_positive': alpha_positive,
        'rho_positive': rho_positive,
        'alpha_deviation': 0.0,
        'rho_deviation': 0.0,
        'optimization_status': 'simple_check'
    }


def check_unitarity_cuts(operators):
    """Check unitarity constraints on scattering amplitudes."""
    # Extract relevant couplings
    couplings = []
    for op in operators:
        if isinstance(op, dict):
            couplings.append(float(op.get('coeff', 0)))
    
    if not couplings:
        couplings = [0.1]  # Default
    
    # Compute partial wave amplitudes (simplified)
    # a_0 = sum of s-wave contributions
    a_0 = sum(abs(c) for c in couplings) / len(couplings)
    
    # Higher partial waves (simplified model)
    a_1 = a_0 * 0.5
    a_2 = a_0 * 0.25
    
    # Unitarity bound: |a_l| < 1
    unitarity_satisfied = all(abs(a) < 1.0 for a in [a_0, a_1, a_2])
    
    # Froissart bound: sigma_tot < C log^2(s)
    # Check growth of total cross section
    froissart_satisfied = a_0 < 0.5  # Simplified criterion
    
    return {
        'unitarity_satisfied': unitarity_satisfied,
        'froissart_satisfied': froissart_satisfied,
        'partial_waves': {
            'a_0': float(a_0),
            'a_1': float(a_1),
            'a_2': float(a_2)
        }
    }


def main():
    try:
        data = json.loads(sys.argv[1])
        operators = data.get("operators", [])
        coeffs = data.get("coeffs", [])
        
        start_time = time.time()
        
        # Check positivity bounds
        positivity_results = check_positivity_bounds(operators)
        
        # Check unitarity cuts
        unitarity_results = check_unitarity_cuts(operators)
        
        # Combined pass/fail
        all_bounds_satisfied = (
            positivity_results['bounds_satisfied'] and
            unitarity_results['unitarity_satisfied'] and
            unitarity_results['froissart_satisfied']
        )
        
        runtime = time.time() - start_time
        
        result = {
            "success": True,
            "all_bounds_satisfied": all_bounds_satisfied,
            "positivity": positivity_results,
            "unitarity": unitarity_results,
            "cvxpy_available": CVXPY_AVAILABLE,
            "runtime": runtime * 1000  # ms
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "all_bounds_satisfied": False
        }))
        sys.exit(1)


if __name__ == "__main__":
    main() 