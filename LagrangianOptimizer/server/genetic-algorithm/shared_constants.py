from decimal import Decimal

# Speed of light in vacuum (CODATA-18)
C_TARGET_DEC = Decimal('299792458')  # m/s
ALPHA_TARGET_DEC = Decimal('0.007297352566405895')  # fine structure
# Newtonian gravitational constant (CODATA-18)
G_TARGET_DEC = Decimal('6.67430e-11')

# allow “from shared_constants import *”
__all__ = [
    "C_TARGET_DEC",
    "ALPHA_TARGET_DEC",
    "G_TARGET_DEC",
]
