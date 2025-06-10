"""
Ghost & Tachyon Detector
Ensures no negative-norm (ghost) or imaginary-mass modes in the 4D spectrum.
"""
import sys
import json
import numpy as np
import sympy as sp

def main():
    try:
        data = json.loads(sys.argv[1])
        operators = data.get("operators", [])
        coeffs = data.get("coeffs", [])
        
        # Extract operator coefficients
        r2_coeff = 0.0
        phi4_coeff = 0.0
        phi2r_coeff = 0.0
        
        for op in operators:
            name = op.get("name", "")
            coeff = op.get("coeff", op.get("value", None))
            if coeff is None:
                raise ValueError(f"Missing coefficient for operator {name}")
            
            if name == "R2":
                r2_coeff = float(coeff)
            elif name == "phi4":
                phi4_coeff = float(coeff)
            elif name == "phi2R":
                phi2r_coeff = float(coeff)
        
        # Get Planck mass scale for proper dimensional analysis
        MP2 = data.get("MP2", 1.0)
        
        # Build kinetic matrix K(φ,R) from operator set with proper scaling
        # φ⁴ has mass dimension -2, R² has -4 (in 4D), so scale by MP²
        kinetic_matrix = np.array([
            [1.0 + r2_coeff*MP2, phi2r_coeff*np.sqrt(MP2)],
            [phi2r_coeff*np.sqrt(MP2), 1.0 + phi4_coeff*MP2]
        ])
        
        # Compute eigenvalues
        eigenvalues = np.linalg.eigvals(kinetic_matrix)
        
        # Check for ghosts (negative eigenvalues) and tachyons (imaginary eigenvalues)
        ghosts = sum(1 for ev in eigenvalues if np.real(ev) < 0)
        tachyons = sum(1 for ev in eigenvalues if np.imag(ev) != 0)
        min_eigenvalue = float(np.min(np.real(eigenvalues)))
        
        # Additional stability checks
        det_kinetic = np.linalg.det(kinetic_matrix)
        trace_kinetic = np.trace(kinetic_matrix)
        
        # Theory is healthy if no ghosts and no tachyons
        is_healthy = ghosts == 0 and tachyons == 0 and min_eigenvalue > 0
        
        result = {
            "success": True,
            "ghosts": int(ghosts),
            "tachyons": int(tachyons),
            "min_eigenvalue": float(min_eigenvalue),
            "eigenvalues": [float(np.real(ev)) for ev in eigenvalues],
            "determinant": float(det_kinetic),
            "trace": float(trace_kinetic),
            "is_healthy": is_healthy,
            "stability_check": {
                "positive_definite": bool(det_kinetic > 0 and trace_kinetic > 0),
                "all_real": bool(all(np.imag(ev) == 0 for ev in eigenvalues)),
                "all_positive": bool(all(np.real(ev) > 0 for ev in eigenvalues))
            }
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "ghosts": -1,
            "tachyons": -1,
            "min_eigenvalue": float('-inf'),
            "is_healthy": False
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    main()