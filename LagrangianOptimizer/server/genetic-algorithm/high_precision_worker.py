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
    "(∂_tφ)²",  # 0
    "(∂_xφ)²",  # 1
    "φ²",  # 2
    "(∂_tφ)²φ²",  # 3
    "F²",  # 4 – Maxwell → alpha
    "κR"  # 5 – GR / Einstein-Hilbert term  (gravity)
]

# 6 coefficients from now on
N_OPS = 6


def evaluate_chromosome_high_precision(
        coefficients: List[float], generation: int = 0) -> Dict[str, Any]:
    """
    High-precision chromosome evaluation using Decimal arithmetic
    Provides adaptive precision based on generation number
    """
    # Set precision based on generation
    set_precision_for_generation(generation)
    
    try:
        if len(coefficients) != N_OPS:
            raise ValueError(
                f"Expected {N_OPS} coefficients, got {len(coefficients)}")

        # Convert to high-precision decimals
        coeffs = [Decimal(str(c)) for c in coefficients]

        # Extract coefficients - match JavaScript implementation exactly
        c0, c1 = coeffs[0], coeffs[1]

        # Validate c0 coefficient (denominator in speed of light calculation)
        if abs(c0) < Decimal('1e-15'):
            return {
                "fitness": float('1e9'),
                "c_model": 0,
                "alpha_model": 0,
                "g_model": 0,
                "delta_c": 1,
                "delta_alpha": 1,
                "delta_g": 1,
                "coefficients": coefficients
            }

        # Removed sign-flip constraints to allow free coefficient exploration

        # Use proper dispersion relation - match operators.ts calculation
        # From Euler-Lagrange: A*ω² + B*k² = 0 where A = -2*c0, B = -2*c1
        A_coeff = -2 * c0
        B_coeff = -2 * c1
        c_squared = -B_coeff / A_coeff

        # ───────── Neue weiche Behandlung für negatives c² ──────────
        extra_penalty = Decimal('0')  # kommt später auf die Fitness
        if c_squared < 0:
            extra_penalty = Decimal(
                '5')  # moderate Strafe statt sofortigem Abbruch
            c_squared = -c_squared  # mit positivem Wert weiterrechnen

        if c_squared == 0 or c_squared != c_squared:  # Check for zero or NaN
            return {
                "fitness": float('1000'),
                "c_model": 0,
                "alpha_model": 0,
                "g_model": 0,
                "delta_c": 1,
                "delta_alpha": 1,
                "delta_g": 1,
                "coefficients": coefficients
            }

        # Handle complex c² values exactly like JavaScript - line 111
        # c_model = Math.sqrt(Math.abs(cSquared)) * C_TARGET * Math.sign(cSquared);
        c_model = (abs(c_squared).sqrt()) * C_TARGET_DEC * (1 if c_squared >= 0
                                                            else -1)

        # Apply fallback for large values like JavaScript - lines 112-115
        if abs(c_model) > 2 * C_TARGET_DEC:
            c_model = abs(c_squared).sqrt()  # Natural units fallback

        # Fine structure constant: α = |c4| / (4π) - line 117
        c4 = coeffs[4]  # Index 4 is the Maxwell coefficient
        alpha_model = abs(c4) / (4 * PI)

        # Gravity constant calculation - using index 5 for gravity coefficient
        grav_coeff = coeffs[5]  # Index 5 is the gravity coefficient
        # ----- neue κ→G-Heuristik ---------------------------------------------
        if abs(grav_coeff) < Decimal('1e-30'):
            G_model = Decimal('Infinity')
            delta_G = Decimal('1')
        elif Decimal('1e-13') < abs(grav_coeff) < Decimal('1e-2'):
            # scheint schon Newton G zu sein
            G_model = grav_coeff
            delta_G = abs(G_model - G_TARGET_DEC) / G_TARGET_DEC
        else:
            # treat as κ
            G_model = Decimal(1) / (16 * PI * abs(grav_coeff))
            delta_G = abs(G_model - G_TARGET_DEC) / G_TARGET_DEC

        # Gravity model for output
        g_model = float(G_model) if G_model != Decimal('Infinity') else float(
            'inf')

        # Calculate relative errors exactly like JavaScript - lines 127-128
        delta_c = abs(c_model - C_TARGET_DEC) / C_TARGET_DEC
        delta_alpha = abs(alpha_model - ALPHA_TARGET_DEC) / ALPHA_TARGET_DEC

        # Hard constraints on fundamental constants
        deltaC_relative = delta_c  # Already calculated as relative error
        deltaG_relative = delta_G
        
        # PROGRESSIVE CONSTRAINT TIGHTENING
        # Start with loose constraints and gradually tighten them
        if generation < 10:
            # Warmup: very relaxed
            effective_eps_c = Decimal('0.01')  # 1%
            effective_eps_g = Decimal('0.1')   # 10%
        elif generation < 100:
            # Progressive tightening from generation 10 to 100
            progress = Decimal(generation - 10) / Decimal(90)
            # Exponential decay
            c_ratio = EPS_C / Decimal('0.01')
            g_ratio = EPS_G / Decimal('0.1')
            effective_eps_c = Decimal('0.01') * (c_ratio ** progress)
            effective_eps_g = Decimal('0.1') * (g_ratio ** progress)
        else:
            # After generation 100: full constraints (with emergency relaxation)
            effective_eps_c = EPS_C
            effective_eps_g = EPS_G
            
            # Emergency relaxation for extreme stagnation
            if generation > 500:
                # Very slight relaxation to help stuck populations
                stagnation_factor = Decimal('1') + Decimal(generation - 500) * Decimal('0.0001')  # 0.01% per generation after 500
                effective_eps_c = min(EPS_C * stagnation_factor, EPS_C * Decimal('2'))  # Max 2x relaxation
                effective_eps_g = min(EPS_G * stagnation_factor, EPS_G * Decimal('2'))  # Max 2x relaxation
        
        # Log constraint status periodically
        if generation % 50 == 0 and generation > 0:
            # Debug logging disabled to prevent JSON parsing errors
            # print(f"Generation {generation} constraints: C < {effective_eps_c:.2e}, G < {effective_eps_g:.2e}")
            pass
        
        # Reject candidates that violate C or G tolerances
        if deltaC_relative > effective_eps_c or deltaG_relative > effective_eps_g:
            return {
                "fitness": float('1e9'),  # Knock-out fitness
                "c_model": 0,
                "alpha_model": 0,
                "g_model": 0,
                "delta_c": 1,
                "delta_alpha": 1,
                "delta_g": 1,
                "coefficients": coefficients
            }

        # Check if constants have reached target precision
        c_exact = abs(c_model - C_TARGET_DEC) < EPS_C
        c_digits = math.floor(-math.log10(float(delta_c))) if delta_c > 0 else 16
        g_digits = math.floor(-math.log10(float(delta_G))) if delta_G > 0 else 16
        
        # Since C and G are now hard constraints, we don't need adaptive weights
        # Focus is entirely on optimizing alpha

        # Fitness calculation with penalties - exactly match JavaScript lines 131-144
        ghost_penalty = 1 if ((c0 > 0 and coeffs[1] > 0) or
                              (c0 < 0 and coeffs[1] < 0)) else 0
        tachyon_penalty = 0.5 if coeffs[2] > 0 else 0
        em_penalty = 0.05 if c4 > 0 else 0  # c4 should be negative

        # Use logarithmic scaling for gravity like JavaScript - lines 137-144
        gravity_penalty = math.log10(1 + float(delta_G)) if delta_G > 0 else 0

        #fitness = (float(delta_c) + float(delta_alpha) +
        #           0.1 * gravity_penalty + ghost_penalty + tachyon_penalty +
        #           em_penalty)

        # unmittelbar vor fitness-Berechnung
        struct_penalty = Decimal('0.2') * max(Decimal('0'), abs(coeffs[2]) - Decimal('0.5')) + \
                         Decimal('0.1') * max(Decimal('0'), abs(coeffs[3]) - Decimal('0.25'))

        fitness = (float(delta_alpha) +  # Only optimize alpha - C and G are hard constraints
                   ghost_penalty + tachyon_penalty +
                   em_penalty + float(extra_penalty) + float(struct_penalty))

        return {
            "fitness": float(fitness),
            "c_model": float(c_model),
            "alpha_model": float(alpha_model),
            "g_model": g_model,
            "delta_c": float(delta_c),
            "delta_alpha": float(delta_alpha),
            "delta_g": float(delta_G),
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
