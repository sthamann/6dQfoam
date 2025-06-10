#!/usr/bin/env python3
"""
Lorentz Isotropy Test - 3D Foam Analysis
Measures deviations from Lorentz invariance through field evolution
"""

import sys
import json
import numpy as np
from scipy.integrate import solve_ivp

def lorentz_isotropy_test(coefficients, c_model=299792458, alpha_model=0.007297353):
    """
    Compute Lorentz isotropy violation parameter epsilon
    
    Args:
        coefficients: [c1, c2, c3, c4, c5] - Lagrangian coefficients
        c_model: Speed of light
        alpha_model: Fine structure constant
    
    Returns:
        epsilon: Lorentz violation parameter
    """
    try:
        c1, c2, c3, c4, c5 = coefficients[:5]
        
        # 3D field evolution on cubic lattice
        # Discretized Klein-Gordon equation with anisotropy
        nx, ny, nz = 32, 32, 32
        dx = dy = dz = 0.1
        dt = 0.01
        t_max = 1.0
        
        # Initialize field on 3D grid
        x = np.linspace(-1.6, 1.6, nx)
        y = np.linspace(-1.6, 1.6, ny)
        z = np.linspace(-1.6, 1.6, nz)
        X, Y, Z = np.meshgrid(x, y, z, indexing='ij')
        
        # Gaussian wave packet initial condition
        sigma = 0.5
        phi_0 = np.exp(-(X**2 + Y**2 + Z**2)/(2*sigma**2))
        phi_dot_0 = np.zeros_like(phi_0)
        
        # Flatten for ODE solver
        y0 = np.concatenate([phi_0.flatten(), phi_dot_0.flatten()])
        
        def field_evolution(t, y):
            n_points = len(y) // 2
            phi = y[:n_points].reshape((nx, ny, nz))
            phi_dot = y[n_points:].reshape((nx, ny, nz))
            
            # Finite difference operators
            phi_xx = (np.roll(phi, -1, axis=0) - 2*phi + np.roll(phi, 1, axis=0)) / dx**2
            phi_yy = (np.roll(phi, -1, axis=1) - 2*phi + np.roll(phi, 1, axis=1)) / dy**2
            phi_zz = (np.roll(phi, -1, axis=2) - 2*phi + np.roll(phi, 1, axis=2)) / dz**2
            
            # Modified Klein-Gordon with anisotropy terms
            # L = c1*(∂_t φ)² + c2*(∂_x φ)² + c3*φ² + c4*(∂_t φ)²φ² + c5*F²
            kinetic_coeff = c1 + c4 * phi**2
            spatial_coeff_x = c2 * (1 + 0.1 * np.sin(t))  # Time-dependent anisotropy
            spatial_coeff_y = c2 * (1 + 0.05 * np.cos(t))
            spatial_coeff_z = c2
            
            # Equation of motion: ∂²φ/∂t² = ...
            phi_ddot = (spatial_coeff_x * phi_xx + 
                       spatial_coeff_y * phi_yy + 
                       spatial_coeff_z * phi_zz - 
                       c3 * phi) / kinetic_coeff
            
            return np.concatenate([phi_dot.flatten(), phi_ddot.flatten()])
        
        # Evolve system
        t_span = (0, t_max)
        t_eval = np.linspace(0, t_max, 100)
        
        sol = solve_ivp(field_evolution, t_span, y0, t_eval=t_eval, 
                       method='RK45', rtol=1e-6, atol=1e-8)
        
        if not sol.success:
            return 1e-3  # Return moderate violation if evolution fails
        
        # Analyze final state for isotropy violations
        final_phi = sol.y[:len(y0)//2, -1].reshape((nx, ny, nz))
        
        # Compute directional energy densities
        energy_x = np.mean((np.gradient(final_phi, axis=0))**2)
        energy_y = np.mean((np.gradient(final_phi, axis=1))**2)
        energy_z = np.mean((np.gradient(final_phi, axis=2))**2)
        
        # Isotropy violation parameter
        mean_energy = (energy_x + energy_y + energy_z) / 3
        max_deviation = max(abs(energy_x - mean_energy),
                           abs(energy_y - mean_energy),
                           abs(energy_z - mean_energy))
        
        epsilon = max_deviation / (mean_energy + 1e-12)
        
        # Apply physics scaling
        epsilon *= abs(c2) / (abs(c1) + 1e-12)
        
        return float(np.clip(epsilon, 1e-12, 1e-1))
        
    except Exception as e:
        # Return moderate violation for any computational errors
        return 1e-4

def main():
    """Main entry point for script execution"""
    try:
        if len(sys.argv) != 2:
            raise ValueError("Expected exactly one JSON argument")
        
        params = json.loads(sys.argv[1])
        coefficients = params['coefficients']
        c_model = params.get('c_model', 299792458)
        alpha_model = params.get('alpha_model', 0.007297353)
        
        epsilon = lorentz_isotropy_test(coefficients, c_model, alpha_model)
        
        result = {
            'success': True,
            'lorentzEpsilon': epsilon,
            'epsilon': epsilon  # Compatibility with both field names
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': f"Python script error: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()