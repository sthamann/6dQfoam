#!/usr/bin/env python3
"""
High-precision Python worker for 20+ digit calculations
Uses Python's decimal module for arbitrary precision arithmetic
"""

import sys
import json
import math
from decimal import Decimal, getcontext
from typing import List, Dict, Any

# Default precision - will be set dynamically based on generation
DEFAULT_PRECISION = 16

def set_precision_for_generation(generation: int = 0) -> None:
    """
    Adaptive precision: use lower precision for early exploration,
    higher precision for fine-tuning
    """
    ctx = getcontext()
    if generation < 500:
        ctx.prec = 16  # Fast exploration
    elif generation < 1000:
        ctx.prec = 20  # Medium precision
    else:
        ctx.prec = 30  # High precision for final convergence

# Set initial precision
set_precision_for_generation(0)

# Import high-precision physical constants from shared source
from shared_constants import C_TARGET_DEC, ALPHA_TARGET_DEC, G_TARGET_DEC

C_LIGHT = C_TARGET_DEC
ALPHA_TARGET = ALPHA_TARGET_DEC
PI = Decimal('3.141592653589793238462643383279')

# Tolerance constants
EPS_C = Decimal('1e-6')   # Relative tolerance for C
EPS_G = Decimal('1e-4')   # Relative tolerance for G

# Operators matching JavaScript implementation
OPERATORS = [
    "(∂_tφ)²",  # 0 - Kinetic term for scalar field
    "(∂_xφ)²",  # 1 - Spatial gradient term
    "φ²",  # 2 - Mass term for scalar field
    "(∂_tφ)²φ²",  # 3 - Self-interaction term
    "g_em",  # 4 - Electromagnetic-scalar field coupling constant
    "ξ"  # 5 - Gravitational-scalar field coupling constant
]

# 6 coefficients from now on
N_OPS = 6


def evaluate_chromosome_high_precision(
        coefficients: List[float], generation: int = 0) -> Dict[str, Any]:
    """
    High-precision chromosome evaluation using Decimal arithmetic
    Implements the new physics model with VEV and effective constants
    """
    # Set precision based on generation
    set_precision_for_generation(generation)
    
    try:
        if len(coefficients) != N_OPS:
            raise ValueError(
                f"Expected {N_OPS} coefficients, got {len(coefficients)}")

        # Convert to high-precision decimals
        coeffs = [Decimal(str(c)) for c in coefficients]
        c0, c1, c2, c3, g_em, xi = coeffs

        # Phase 1: Calculate VEV and check potential stability
        # V(φ) = -½c₂φ² + ¼c₃φ⁴
        phi0 = Decimal('0')
        is_real_vev = False
        fitness_penalty = Decimal('0')
        
        if c2 > 0 and c3 > 0:
            # VEV: φ₀ = √(c₂/c₃)
            phi0 = (c2 / c3).sqrt()
            is_real_vev = True
        else:
            # Unstable potential - add penalty
            fitness_penalty += Decimal('10')
        
        # Phase 2: Calculate effective observables
        if phi0 > 0:
            # α_eff = α_standard / (1 + g_em * φ₀²)
            alpha_eff = ALPHA_TARGET_DEC / (Decimal('1') + g_em * phi0 * phi0)
            # G_eff = G_standard / (1 + ξ * φ₀²)
            G_eff = G_TARGET_DEC / (Decimal('1') + xi * phi0 * phi0)
        else:
            alpha_eff = ALPHA_TARGET_DEC
            G_eff = G_TARGET_DEC
        
        # Phase 3: Calculate model speed of light (still from dispersion relation)
        # Use proper dispersion relation - match operators.ts calculation
        # From Euler-Lagrange: A*ω² + B*k² = 0 where A = -2*c0, B = -2*c1
        A_coeff = -2 * c0
        B_coeff = -2 * c1
        
        if abs(A_coeff) < Decimal('1e-15'):
            return {
                "fitness": float('1000'),
                "c_model": 0,
                "alpha_model": 0,
                "g_model": 0,
                "delta_c": 1,
                "delta_alpha": 1,
                "delta_g": 1,
                "phi0": 0,
                "elegance_score": 0,
                "g_em": float(g_em),
                "xi": float(xi),
                "coefficients": coefficients
            }
        
        c_squared = -B_coeff / A_coeff
        
        if c_squared <= 0:
            fitness_penalty += Decimal('5')
            c_squared = abs(c_squared)
        
        c_model = c_squared.sqrt() * C_TARGET_DEC
        
        # Phase 4: Calculate deviations
        delta_c = abs(c_model - C_TARGET_DEC) / C_TARGET_DEC
        delta_alpha = abs(alpha_eff - ALPHA_TARGET_DEC) / ALPHA_TARGET_DEC
        delta_g = abs(G_eff - G_TARGET_DEC) / G_TARGET_DEC

        # Phase 5: Apply progressive constraints (same as TypeScript)
        if generation < 10:
            effective_eps_c = Decimal('0.01')  # 1%
            effective_eps_g = Decimal('0.1')   # 10%
        elif generation < 100:
            progress = Decimal(generation - 10) / Decimal(90)
            c_ratio = EPS_C / Decimal('0.01')
            g_ratio = EPS_G / Decimal('0.1')
            effective_eps_c = Decimal('0.01') * (c_ratio ** progress)
            effective_eps_g = Decimal('0.1') * (g_ratio ** progress)
        else:
            effective_eps_c = EPS_C
            effective_eps_g = EPS_G
            
            if generation > 500:
                stagnation_factor = Decimal('1') + Decimal(generation - 500) * Decimal('0.0001')
                effective_eps_c = min(EPS_C * stagnation_factor, EPS_C * Decimal('2'))
                effective_eps_g = min(EPS_G * stagnation_factor, EPS_G * Decimal('2'))
        
        # Reject candidates that violate C or G tolerances
        if delta_c > effective_eps_c or delta_g > effective_eps_g:
            return {
                "fitness": float('1e9'),  # Knock-out fitness
                "c_model": 0,
                "alpha_model": 0,
                "g_model": 0,
                "delta_c": 1,
                "delta_alpha": 1,
                "delta_g": 1,
                "phi0": 0,
                "elegance_score": 0,
                "g_em": float(g_em),
                "xi": float(xi),
                "coefficients": coefficients
            }

        # Phase 6: Calculate elegance score
        target_c3 = Decimal('1') / (Decimal('8') * PI)
        c3_elegance = max(Decimal('0'), Decimal('1') - abs(c3 - target_c3) / target_c3)
        
        # Coupling simplicity (near zero is elegant)
        coupling_simplicity = max(Decimal('0'), Decimal('1') - (abs(g_em) + abs(xi)) / Decimal('200'))
        
        # Check for mathematical relations
        relation_bonus = Decimal('0')
        if abs(g_em - c3) < Decimal('0.01'):
            relation_bonus += Decimal('0.25')
        if abs(xi - c3 * c3) < Decimal('0.01'):
            relation_bonus += Decimal('0.25')
        
        elegance_score = Decimal('0.5') * c3_elegance + Decimal('0.3') * coupling_simplicity + Decimal('0.2') * relation_bonus

        # Phase 7: Physical constraints
        is_ghost_free = c0 < 0 and c1 > 0
        ghost_penalty = Decimal('0') if is_ghost_free else Decimal('1')
        
        is_tachyon_free = c2 >= 0  # In new model, c2 should be positive for stable VEV
        tachyon_penalty = Decimal('0') if is_tachyon_free else Decimal('0.5')
        
        # Lorentz isotropy check
        if c0 != 0:
            a = -c0
            b = c1
            if a > 0 and b > 0:
                v = (b / a).sqrt()
                lorentz_eps = abs(v - Decimal('1'))
            else:
                lorentz_eps = Decimal('1')
        else:
            lorentz_eps = Decimal('1')
        
        if lorentz_eps < Decimal('1e-12'):
            lorentz_penalty = Decimal('0')
        elif lorentz_eps < Decimal('1e-8'):
            lorentz_penalty = Decimal('10') * lorentz_eps
        else:
            lorentz_penalty = Decimal('100') * lorentz_eps

        # Phase 8: Final fitness calculation
        # Focus on alpha since C and G are hard constraints
        # Include elegance as a small negative contribution (bonus)
        fitness = (delta_alpha +
                   ghost_penalty +
                   tachyon_penalty +
                   lorentz_penalty +
                   fitness_penalty -
                   Decimal('0.1') * elegance_score)  # Elegance bonus

        return {
            "fitness": float(fitness),
            "c_model": float(c_model),
            "alpha_model": float(alpha_eff),
            "g_model": float(G_eff),
            "delta_c": float(delta_c),
            "delta_alpha": float(delta_alpha),
            "delta_g": float(delta_g),
            "phi0": float(phi0),
            "elegance_score": float(elegance_score),
            "elegance_details": {
                "c3_elegance": float(c3_elegance),
                "coupling_simplicity": float(coupling_simplicity),
                "relation_bonus": float(relation_bonus)
            },
            "g_em": float(g_em),
            "xi": float(xi),
            "coefficients": coefficients,
            "precision_mode": "high_precision_decimal"
        }

    except Exception as e:
        # Log the error for debugging
        print(f"Python evaluator error: {e}")
        print(f"Coefficients: {coefficients}")
        import traceback
        traceback.print_exc()
        return {
            "fitness": float('1e9'),
            "c_model": 0,
            "alpha_model": 0,
            "g_model": 0,
            "delta_c": 1,
            "delta_alpha": 1,
            "delta_g": 1,
            "phi0": 0,
            "elegance_score": 0,
            "g_em": coefficients[4] if len(coefficients) > 4 else 0,
            "xi": coefficients[5] if len(coefficients) > 5 else 0,
            "coefficients": coefficients,
            "error": str(e)
        }


def main():
    """Main worker loop for high-precision calculations"""
    try:
        for line in sys.stdin:
            if line.strip():
                data = json.loads(line.strip())

                if data.get('command') == 'evaluate':
                    result = evaluate_chromosome_high_precision(
                        data['coefficients'], data['generation'])
                    print(json.dumps(result))
                    sys.stdout.flush()

                elif data.get('command') == 'ping':
                    print(
                        json.dumps({
                            "status": "ready",
                            "precision": getcontext().prec,
                            "mode": "high_precision_decimal"
                        }))
                    sys.stdout.flush()

                elif data.get('command') == 'test_precision':
                    # Test precision capabilities
                    test_alpha = Decimal('0.007297352566411018123456789')
                    result = {
                        "test_value": str(test_alpha),
                        "precision_digits":
                        len(str(test_alpha).replace('.', '')),
                        "context_precision": getcontext().prec
                    }
                    print(json.dumps(result))
                    sys.stdout.flush()

    except KeyboardInterrupt:
        pass
    except Exception as e:
        error_response = {
            "error": str(e),
            "precision_mode": "high_precision_decimal"
        }
        print(json.dumps(error_response), file=sys.stderr)


if __name__ == "__main__":
    main()
