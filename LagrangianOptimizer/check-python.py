#!/usr/bin/env python3
import sys
import os

print(f"Python executable: {sys.executable}")
print(f"Python version: {sys.version}")
print(f"Python path: {sys.path[0]}")
print()

# Check for required modules
modules = ['numpy', 'scipy', 'mpmath', 'sympy']
for module in modules:
    try:
        __import__(module)
        print(f"✓ {module} is installed")
    except ImportError:
        print(f"✗ {module} is NOT installed") 