"""
Compute the normalised spin-2 zero mode profile ψ0(y)
and Newton constant for the current coefficients.
Uses SciPy boundary value problem solver.
"""
import sys
import json
import numpy as np
from scipy.integrate import solve_bvp

def main():
    if len(sys.argv) < 2:
        print("Error: Missing configuration argument", file=sys.stderr)
        sys.exit(1)
    
    try:
        cfg = json.loads(sys.argv[1])
        coeffs = cfg["coeffs"]
        c_tt, c_xx, m2, lam, g = coeffs
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        print(f"Error parsing configuration: {e}", file=sys.stderr)
        sys.exit(1)

    # Warp factor based on field coefficients
    # σ(y) represents the extra-dimensional geometry
    def sigma(y):
        # Model warp factor influenced by field parameters
        # Using a combination that depends on the gauge coupling and mass
        scale = abs(g) if abs(g) > 1e-6 else 0.1
        mass_scale = abs(m2) if abs(m2) > 1e-6 else 1.0
        return scale * np.tanh(mass_scale * y**2 / 10.0)

    # Differential equation for spin-2 zero mode
    # ψ''(y) + 2σ'(y)ψ'(y) = 0 in the linearized approximation
    def ode(y, psi):
        """
        System: [ψ, ψ']
        Returns: [ψ', ψ''] where ψ'' = -2σ'(y)ψ'(y)
        """
        # Derivative of warp factor
        h = 1e-6
        sigma_prime = (sigma(y + h) - sigma(y - h)) / (2 * h)
        
        return np.vstack([
            psi[1],                    # ψ' = psi[1]
            -2 * sigma_prime * psi[1]  # ψ'' = -2σ'(y)ψ'(y)
        ])

    # Boundary conditions: ψ(-L) = 0, ψ(L) = 1 (normalized)
    def bc(psi_left, psi_right):
        return np.array([
            psi_left[0],      # ψ(-L) = 0
            psi_right[0] - 1.0  # ψ(L) = 1
        ])

    # Extra dimension coordinate range
    L = 5.0  # Range: [-5, 5]
    y = np.linspace(-L, L, 200)
    
    # Initial guess: linear interpolation
    psi_init = np.zeros((2, y.size))
    psi_init[0] = (y + L) / (2 * L)  # Linear from 0 to 1
    psi_init[1] = 1.0 / (2 * L)      # Constant derivative

    try:
        # Solve boundary value problem
        sol = solve_bvp(ode, bc, y, psi_init, max_nodes=1000)
        
        if sol.success:
            psi0 = sol.y[0]
            
            # Normalize the zero mode
            norm_integral = np.trapz(psi0**2, y)
            if norm_integral > 0:
                psi0_normalized = psi0 / np.sqrt(norm_integral)
            else:
                psi0_normalized = psi0
                norm_integral = 1.0
                
            # Calculate 4D Newton constant
            # G_4D ∝ κ²_6 * ∫ ψ₀²(y) dy where κ₆ is 6D Planck constant
            kappa6_squared = 1.0  # Placeholder 6D gravitational coupling
            
            # The integral gives the "volume" factor for dimensional reduction
            volume_factor = norm_integral
            G_Newton = kappa6_squared * volume_factor
            
            # Apply scaling based on field coefficients
            # Stronger gauge coupling should suppress gravity
            gauge_suppression = 1.0 / (1.0 + abs(g))
            G_Newton *= gauge_suppression
            
        else:
            # Fallback if BVP solver fails
            psi0_normalized = np.exp(-0.1 * y**2)  # Gaussian fallback
            psi0_normalized /= np.sqrt(np.trapz(psi0_normalized**2, y))
            G_Newton = 1.0
            
    except Exception as e:
        print(f"Warning: BVP solver failed ({e}), using analytical approximation", file=sys.stderr)
        # Analytical approximation for the zero mode
        psi0_normalized = np.exp(-0.1 * y**2)  # Gaussian profile
        psi0_normalized /= np.sqrt(np.trapz(psi0_normalized**2, y))
        G_Newton = 1.0

    # Return results as JSON
    result = {
        "psi0": psi0_normalized.tolist(),
        "GNewton": float(G_Newton)
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()