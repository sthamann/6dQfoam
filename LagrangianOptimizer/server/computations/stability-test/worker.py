# ──────────────────────────────────────────────────────────────────────────────
# ── file: stability_test.py
#     128³ leap-frog energy-conservation check (CuPy-accelerated)
# ----------------------------------------------------------------------------

import json
import sys
import time

try:
    import cupy as xp  # type: ignore
    GPU = True
except ModuleNotFoundError:  # pragma: no cover
    import numpy as xp  # type: ignore
    GPU = False

import numpy as _np

N = 128
L = 5.0
DX = L / N
DT = 0.1 * DX  # generous CFL
STEPS = 10_000


def lap(field: xp.ndarray) -> xp.ndarray:
    """Discrete Laplacian with periodic boundaries (6-point stencil)."""
    return (
        xp.roll(field, 1, 0)
        + xp.roll(field, -1, 0)
        + xp.roll(field, 1, 1)
        + xp.roll(field, -1, 1)
        + xp.roll(field, 1, 2)
        + xp.roll(field, -1, 2)
        - 6 * field
    ) / DX**2


def energy(phi: xp.ndarray, pi: xp.ndarray, m2: float) -> float:
    """Total discretised energy (gradient + potential + kinetic)."""
    # Vollständiger räumlicher Gradient in x, y, z
    gx, gy, gz = xp.gradient(phi, DX, axis=(0, 1, 2))
    grad = 0.5 * xp.sum(gx**2 + gy**2 + gz**2)

    pot = 0.5 * m2 * xp.sum(phi**2)
    kin = 0.5 * xp.sum(pi**2)

    total = grad + pot + kin
    return float(total.get() if GPU else total)


def main() -> None:
    coeffs = json.loads(sys.argv[1])["coeffs"]
    m2 = coeffs[2]  # m²-Term kommt an Index 2

    rng = _np.random.default_rng(0)
    phi = xp.asarray(rng.standard_normal((N,) * 3) * 1e-4)
    pi = xp.zeros_like(phi)

    e0 = energy(phi, pi, m2)
    t0 = time.time()
    for _ in range(STEPS):
        pi += 0.5 * DT * (lap(phi) - m2 * phi)
        phi += DT * pi
        pi += 0.5 * DT * (lap(phi) - m2 * phi)
    e1 = energy(phi, pi, m2)

    print(
        json.dumps(
            {
                "success": True,
                "passed": e1 / e0 < 10,
                "energyRatio": e1 / e0,
                "runtime": time.time() - t0,
            }
        )
    )


if __name__ == "__main__":
    main()
