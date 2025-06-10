# ──────────────────────────────────────────────────────────────────────────────
# ── file: lyapunov_spectrum.py
#     Lyapunov spectrum analysis for foam dynamic stability
#     Detects chaos onset early (Kaustiken vermeiden)
#     Reduced to 3D for computational efficiency
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


N = 32  # Grid resolution (reduced for stability)
L = 5.0
DX = L / N
DT = 0.001 * DX  # Small timestep for accuracy
STEPS = 500  # Reduced for faster computation
N_LYAP = 3  # Number of Lyapunov exponents to compute


def laplacian_3d(field):
    """3D Laplacian with periodic boundaries."""
    lap = xp.zeros_like(field)
    
    # Sum over all 3 dimensions
    for dim in range(3):
        # Get axis permutation to put current dimension first
        axes = list(range(3))
        axes[0], axes[dim] = axes[dim], axes[0]
        
        # Transpose, apply 1D second derivative, transpose back
        field_t = xp.transpose(field, axes)
        lap_t = xp.zeros_like(field_t)
        
        # Second derivative in the first axis
        lap_t[1:-1] = (field_t[2:] - 2*field_t[1:-1] + field_t[:-2]) / DX**2
        # Periodic boundaries
        lap_t[0] = (field_t[1] - 2*field_t[0] + field_t[-1]) / DX**2
        lap_t[-1] = (field_t[0] - 2*field_t[-1] + field_t[-2]) / DX**2
        
        # Transpose back and add to total
        lap += xp.transpose(lap_t, axes)
    
    return lap


def rhs_foam(phi, pi, coeffs):
    """Right hand side of foam equations (3D version)."""
    # Validate coefficients
    if len(coeffs) < 5:
        raise ValueError(f"Expected at least 5 coefficients, got {len(coeffs)}")
    
    # Extract coefficients
    c0, c1, c2, c3, c4 = coeffs[:5]
    
    # Laplacian term
    lap_phi = laplacian_3d(phi)
    
    # Nonlinear terms
    nl_term = c1 * phi + c3 * phi**3
    
    # Time derivatives
    dphi_dt = pi
    dpi_dt = c0 * lap_phi - c2 * phi - nl_term
    
    return dphi_dt, dpi_dt


def gram_schmidt(vectors):
    """Gram-Schmidt orthonormalization for field vectors."""
    n_vectors = len(vectors)
    ortho_vectors = []
    
    for i in range(n_vectors):
        v = vectors[i].copy()
        
        # Subtract projections onto previous vectors
        for j in range(i):
            proj = xp.sum(v * ortho_vectors[j])
            v -= proj * ortho_vectors[j]
        
        # Normalize
        norm = xp.sqrt(xp.sum(v**2))
        if norm > 1e-10:
            v /= norm
            ortho_vectors.append(v)
        else:
            # Replace with random vector if degenerate
            v = xp.random.randn(*v.shape)
            norm = xp.sqrt(xp.sum(v**2))
            v /= norm
            ortho_vectors.append(v)
    
    return ortho_vectors


def compute_lyapunov_spectrum(coeffs):
    """Compute Lyapunov exponents using tangent space method."""
    shape = (N, N, N)
    
    # Initialize reference trajectory with smaller perturbation
    rng = np.random.default_rng(42)
    phi0 = xp.asarray(rng.standard_normal(shape) * 1e-5)
    pi0 = xp.zeros_like(phi0)
    
    # Initialize tangent vectors (orthonormal)
    tangent_vectors = []
    for i in range(N_LYAP):
        v_phi = xp.asarray(rng.standard_normal(shape))
        v_pi = xp.asarray(rng.standard_normal(shape))
        # Normalize
        norm = xp.sqrt(xp.sum(v_phi**2 + v_pi**2))
        tangent_vectors.append((v_phi/norm, v_pi/norm))
    
    # Storage for Lyapunov sums
    lyap_sums = np.zeros(N_LYAP)
    
    # Evolve reference trajectory and tangent vectors
    phi, pi = phi0.copy(), pi0.copy()
    
    for step in range(STEPS):
        # Store old state for linearization
        phi_old = phi.copy()
        
        # RK4 for reference trajectory
        k1_phi, k1_pi = rhs_foam(phi, pi, coeffs)
        k2_phi, k2_pi = rhs_foam(phi + 0.5*DT*k1_phi, pi + 0.5*DT*k1_pi, coeffs)
        k3_phi, k3_pi = rhs_foam(phi + 0.5*DT*k2_phi, pi + 0.5*DT*k2_pi, coeffs)
        k4_phi, k4_pi = rhs_foam(phi + DT*k3_phi, pi + DT*k3_pi, coeffs)
        
        phi += DT/6 * (k1_phi + 2*k2_phi + 2*k3_phi + k4_phi)
        pi += DT/6 * (k1_pi + 2*k2_pi + 2*k3_pi + k4_pi)
        
        # Evolve tangent vectors
        new_tangent_vectors = []
        for i, (v_phi, v_pi) in enumerate(tangent_vectors):
            # Linearized evolution
            dv_phi = v_pi
            dv_pi = coeffs[0] * laplacian_3d(v_phi) - coeffs[2] * v_phi
            
            # Add linearized nonlinear term if coefficient is non-zero
            if abs(coeffs[3]) > 1e-10:
                dv_pi -= 3*coeffs[3]*phi_old**2*v_phi
            
            # Update tangent vector (simple Euler for tangent space)
            v_phi_new = v_phi + DT * dv_phi
            v_pi_new = v_pi + DT * dv_pi
            
            new_tangent_vectors.append((v_phi_new, v_pi_new))
        
        # Gram-Schmidt reorthonormalization
        all_vectors = [xp.concatenate([v[0].flatten(), v[1].flatten()]) for v in new_tangent_vectors]
        ortho_vectors = gram_schmidt(all_vectors)
        
        # Extract growth rates and update Lyapunov sums
        for i in range(N_LYAP):
            # Calculate norm before orthonormalization
            old_norm = xp.sqrt(xp.sum(new_tangent_vectors[i][0]**2 + new_tangent_vectors[i][1]**2))
            if old_norm > 0:
                lyap_sums[i] += np.log(float(old_norm.get() if GPU else old_norm))
            
            # Update tangent vectors from orthonormalized set
            mid = len(ortho_vectors[i]) // 2
            tangent_vectors[i] = (
                ortho_vectors[i][:mid].reshape(shape),
                ortho_vectors[i][mid:].reshape(shape)
            )
    
    # Compute Lyapunov exponents
    lyapunov_exponents = lyap_sums / (STEPS * DT)
    
    return lyapunov_exponents


def main():
    try:
        # Parse input
        if len(sys.argv) < 2:
            raise ValueError("No input data provided")
            
        data = json.loads(sys.argv[1])
        
        # Validate input
        if "coeffs" not in data:
            raise ValueError("Missing 'coeffs' in input data")
            
        coeffs = data["coeffs"]
        if not isinstance(coeffs, list) or len(coeffs) < 5:
            raise ValueError("coeffs must be a list with at least 5 elements")
        
        # Convert to float array
        coeffs = [float(c) for c in coeffs]
        
        start_time = time.time()
        
        # Compute Lyapunov spectrum
        lyap_exponents = compute_lyapunov_spectrum(coeffs)
        
        # Sort in descending order
        lyap_exponents = np.sort(lyap_exponents)[::-1]
        
        # Check stability (largest exponent should be negative for stability)
        max_lyap = lyap_exponents[0]
        is_stable = max_lyap < 0.01  # Small positive threshold for numerical stability
        
        # Classify dynamics
        if max_lyap < -0.1:
            dynamics_type = "stable"
        elif max_lyap < 0.01:
            dynamics_type = "quasi-periodic"
        else:
            dynamics_type = "chaotic"
        
        runtime = time.time() - start_time
        
        result = {
            "success": True,
            "is_stable": bool(is_stable),
            "max_lyapunov": float(max_lyap),
            "lyapunov_spectrum": [float(l) for l in lyap_exponents],
            "dynamics_type": dynamics_type,
            "gpu_used": GPU,
            "grid_size": f"{N}^3",
            "timesteps": STEPS,
            "runtime": runtime * 1000  # ms
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        import traceback
        print(json.dumps({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc(),
            "is_stable": False,
            "max_lyapunov": 0.0,
            "lyapunov_spectrum": [],
            "dynamics_type": "unknown"
        }), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main() 