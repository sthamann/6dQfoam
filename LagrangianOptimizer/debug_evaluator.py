#!/usr/bin/env python3
"""
Debug script to test evaluator consistency between JavaScript and Python
"""

import sys
import json
from decimal import Decimal, getcontext

# Set precision
getcontext().prec = 30

# Constants
C_TARGET_DEC = Decimal('299792458')
ALPHA_TARGET_DEC = Decimal('0.007297352566405895')
PI = Decimal('3.141592653589793238462643383279')

def test_evaluator(coefficients):
    """Test the Python evaluator with known coefficients"""
    print(f"Testing coefficients: {coefficients}")
    
    # Convert to high-precision decimals
    coeffs = [Decimal(str(c)) for c in coefficients]
    c0, c1, c2, c3, c4, c5 = coeffs
    
    print(f"c0={c0}, c1={c1}")
    
    # Speed of light calculation - exact JavaScript match
    c_squared = -c1 / c0
    print(f"c_squared = -c1/c0 = {c_squared}")
    
    # JavaScript: c_model = Math.sqrt(Math.abs(cSquared)) * C_TARGET * Math.sign(cSquared);
    c_model = (abs(c_squared).sqrt()) * C_TARGET_DEC * (1 if c_squared >= 0 else -1)
    print(f"c_model = {c_model}")
    print(f"Expected c_model ≈ {C_TARGET_DEC}")
    
    # Fine structure constant: α = |c4| / (4π)
    alpha_model = abs(c4) / (4 * PI)
    print(f"alpha_model = {alpha_model}")
    print(f"Expected alpha_model ≈ {ALPHA_TARGET_DEC}")
    
    # Relative errors
    delta_c = abs(c_model - C_TARGET_DEC) / C_TARGET_DEC
    delta_alpha = abs(alpha_model - ALPHA_TARGET_DEC) / ALPHA_TARGET_DEC
    
    print(f"delta_c = {delta_c}")
    print(f"delta_alpha = {delta_alpha}")
    
    return {
        "c_model": float(c_model),
        "alpha_model": float(alpha_model),
        "delta_c": float(delta_c),
        "delta_alpha": float(delta_alpha)
    }

if __name__ == "__main__":
    # Test with known good coefficients that should give c ≈ 299792458
    # For c_squared = -c1/c0 = 1, we need c1 = -c0
    test_coeffs = [-1, 1, -0.1, 0.1, -ALPHA_TARGET_DEC * 4 * PI, -0.5]
    result = test_evaluator(test_coeffs)
    print(f"\nResult: {json.dumps(result, indent=2)}")