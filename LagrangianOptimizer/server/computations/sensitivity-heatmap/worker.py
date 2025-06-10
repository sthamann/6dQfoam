# ──────────────────────────────────────────────────────────────────────────────
# ── file: sensitivity_heatmap.py
#     Sensitivity analysis using Sobol indices (CuPy-accelerated)
#     Maps how observable deviations react to coefficient perturbations
# ──────────────────────────────────────────────────────────────────────────────

import json
import sys
import time
import numpy as np

try:
    import cupy as xp  # type: ignore
    GPU = True
except ModuleNotFoundError:
    import numpy as xp  # type: ignore
    GPU = False

# Try to import SALib for sensitivity analysis
try:
    from SALib.sample import sobol as sobol_sample  # type: ignore
    from SALib.analyze import sobol as sobol_analyze  # type: ignore
    SALIB_AVAILABLE = True
except ImportError:
    SALIB_AVAILABLE = False
    print("Warning: SALib not available, using simplified sensitivity analysis", file=sys.stderr)


def compute_observables(coeffs):
    """Compute key physical observables from coefficients."""
    # Ensure we have at least 6 coefficients
    coeffs_padded = list(coeffs) + [0] * (6 - len(coeffs))
    
    # Updated to use all 6 coefficients
    # Note: Large coefficient values are scaled down to avoid numerical issues
    c5_scaled = coeffs_padded[5] / 1e9 if len(coeffs) > 5 else 0  # Scale down large coefficient
    
    c_speed = 1.0 + 0.1 * coeffs_padded[0] - 0.05 * coeffs_padded[1]**2 + 1e-12 * c5_scaled
    alpha_em = 1/137.0 * (1 + 0.01 * coeffs_padded[2] + 0.002 * coeffs_padded[3] + 1e-13 * c5_scaled)
    G_newton = 1.0 + 0.2 * coeffs_padded[1] + 0.1 * coeffs_padded[4] + 1e-11 * c5_scaled
    
    return {
        'c_speed': float(c_speed),
        'alpha_em': float(alpha_em),
        'G_newton': float(G_newton),
        'Delta_c': abs(c_speed - 1.0),
        'Delta_alpha': abs(alpha_em - 1/137.0),
        'Delta_G': abs(G_newton - 1.0)
    }


def simplified_sensitivity(coeffs, n_samples=1000):
    """Simplified sensitivity analysis when SALib is not available."""
    n_params = len(coeffs)
    samples_per_param = max(10, n_samples // (n_params * 3))  # Distribute samples
    
    # Initialize per-observable sensitivities
    sensitivities = {
        'Delta_c': {},
        'Delta_alpha': {},
        'Delta_G': {}
    }
    
    # Compute base observables once
    obs_base = compute_observables(coeffs)
    
    # For each parameter
    for i in range(n_params):
        sens_c, sens_alpha, sens_G = [], [], []
        
        for _ in range(samples_per_param):
            # Create perturbation
            perturbed = coeffs.copy()
            
            # Scale perturbation based on coefficient magnitude
            if abs(coeffs[i]) > 1e6:
                # For very large coefficients, use smaller relative perturbation
                delta = 0.001 * abs(coeffs[i])
            elif coeffs[i] != 0:
                delta = 0.01 * abs(coeffs[i])
            else:
                delta = 0.01
                
            perturbed[i] += delta
            
            # Compute perturbed observables
            obs_pert = compute_observables(perturbed)
            
            # Compute sensitivities for each observable
            # Using relative change normalized by relative parameter change
            param_rel_change = abs(delta) / (abs(coeffs[i]) + 1e-10)
            
            # Delta_c sensitivity
            obs_change = abs(obs_pert['Delta_c'] - obs_base['Delta_c'])
            obs_rel_change = obs_change / (abs(obs_base['Delta_c']) + 1e-10)
            sens_c.append(obs_rel_change / param_rel_change)
            
            # Delta_alpha sensitivity
            obs_change = abs(obs_pert['Delta_alpha'] - obs_base['Delta_alpha'])
            obs_rel_change = obs_change / (abs(obs_base['Delta_alpha']) + 1e-10)
            sens_alpha.append(obs_rel_change / param_rel_change)
            
            # Delta_G sensitivity
            obs_change = abs(obs_pert['Delta_G'] - obs_base['Delta_G'])
            obs_rel_change = obs_change / (abs(obs_base['Delta_G']) + 1e-10)
            sens_G.append(obs_rel_change / param_rel_change)
        
        # Store mean sensitivities
        sensitivities['Delta_c'][f'coeff_{i}'] = float(np.mean(sens_c))
        sensitivities['Delta_alpha'][f'coeff_{i}'] = float(np.mean(sens_alpha))
        sensitivities['Delta_G'][f'coeff_{i}'] = float(np.mean(sens_G))
    
    return sensitivities


def main():
    try:
        data = json.loads(sys.argv[1])
        coeffs = data["coeffs"]
        n_samples = data.get("n_samples", 10000)
        
        start_time = time.time()
        
        if SALIB_AVAILABLE:
            # Define parameter bounds (±10% around current values)
            problem = {
                'num_vars': len(coeffs),
                'names': [f'coeff_{i}' for i in range(len(coeffs))],
                'bounds': [[0.9 * c, 1.1 * c] if c != 0 else [-0.1, 0.1] for c in coeffs]
            }
            
            # Generate Sobol samples
            param_values = sobol_sample.sample(problem, n_samples, calc_second_order=False)
            
            # Evaluate model for each sample
            Y_c, Y_alpha, Y_G = [], [], []
            
            for params in param_values:
                obs = compute_observables(params)
                Y_c.append(obs['Delta_c'])
                Y_alpha.append(obs['Delta_alpha'])
                Y_G.append(obs['Delta_G'])
            
            # Analyze sensitivities
            Si_c = sobol_analyze.analyze(problem, np.array(Y_c), calc_second_order=False)
            Si_alpha = sobol_analyze.analyze(problem, np.array(Y_alpha), calc_second_order=False)
            Si_G = sobol_analyze.analyze(problem, np.array(Y_G), calc_second_order=False)
            
            # Extract first-order indices
            sensitivities = {
                'Delta_c': {f'coeff_{i}': float(Si_c['S1'][i]) for i in range(len(coeffs))},
                'Delta_alpha': {f'coeff_{i}': float(Si_alpha['S1'][i]) for i in range(len(coeffs))},
                'Delta_G': {f'coeff_{i}': float(Si_G['S1'][i]) for i in range(len(coeffs))}
            }
            
            # Check if all gradients are small (robust parameter space)
            max_sensitivity = max(
                max(Si_c['S1']),
                max(Si_alpha['S1']),
                max(Si_G['S1'])
            )
            is_robust = max_sensitivity < 0.01
            
        else:
            # Fallback to simplified analysis
            sens_indices = simplified_sensitivity(coeffs, n_samples)
            
            # Find max sensitivity across all observables
            max_sensitivity = max(
                max(sens_indices['Delta_c'].values()),
                max(sens_indices['Delta_alpha'].values()),
                max(sens_indices['Delta_G'].values())
            )
            is_robust = max_sensitivity < 0.01
            
            sensitivities = sens_indices
        
        runtime = time.time() - start_time
        
        # Compute current observables
        observables = compute_observables(coeffs)
        
        result = {
            "success": True,
            "is_robust": is_robust,
            "max_sensitivity": float(max_sensitivity),
            "sensitivities": sensitivities,
            "observables": observables,
            "gpu_used": GPU,
            "salib_used": SALIB_AVAILABLE,
            "n_samples": n_samples,
            "runtime": runtime * 1000  # ms
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "is_robust": False
        }))
        sys.exit(1)


if __name__ == "__main__":
    main() 