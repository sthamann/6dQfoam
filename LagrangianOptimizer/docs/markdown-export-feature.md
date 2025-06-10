# Markdown Export Feature for Relativity Tests

## Overview

The Relativity Page (Tab 2) now includes comprehensive markdown report generation for both the Lorentz Isotropy Test and Spin-2 Zero Mode (Graviton) Test. Each test has a "Download Report" button that generates a detailed markdown file containing all test data, algorithm explanations, and physical interpretations.

## Features

### 1. Comprehensive Report Content

Each report includes:
- **Test metadata**: Unique ID, timestamp, session information
- **Input parameters**: All 6 Lagrangian coefficients, physical constants
- **Test configuration**: Grid parameters, numerical methods, tolerances
- **Results**: Primary test outputs with full precision
- **Physical interpretation**: Detailed explanation of what the results mean
- **Algorithm details**: Step-by-step explanation of the computational method
- **Full data dumps**: Complete JSON input/output for transparency

### 2. Template-Based Generation

Reports use templates located in:
- `server/computations/rel_lorentz_isotropy/template.md`
- `server/computations/rel_spin2_zero/template.md`

The templates use placeholder syntax `{{VARIABLE}}` and conditional blocks `{{#if CONDITION}}...{{/if}}`.

### 3. Physical Interpretations

#### Lorentz Test Classifications:
- **Excellent** (ε < 10⁻⁶): Theory preserves Lorentz symmetry
- **Good** (10⁻⁶ < ε < 10⁻⁴): Minor violations within experimental bounds
- **Moderate** (10⁻⁴ < ε < 10⁻²): Significant violations, likely ruled out
- **Strong** (ε > 10⁻²): Severe breakdown of Lorentz invariance

#### Spin-2 Test Classifications:
- **Strong Localization** (ψ₀ > 1): Effective 4D gravity at low energies
- **Normal Localization** (0.1 < ψ₀ < 1): Balanced 5D→4D transition
- **Weak Localization** (ψ₀ < 0.1): Gravity remains 5D, conflicts with observations

### 4. Algorithm Transparency

Each report explains the computational methods:

**Lorentz Test**:
- 3D field evolution on 32×32×32 grid
- Gaussian wave packet initial conditions
- Energy density calculation for isotropy measure
- Wave speed analysis for all spatial directions

**Spin-2 Test**:
- Warp factor construction from coefficients
- Differential equation solver for graviton profile
- Boundary value problem with localization conditions
- 4D Newton constant calculation from wavefunction integral

## Implementation

### ReportGenerator Class

Located in `server/utils/report-generator.ts`, handles:
- Template loading and parsing
- Placeholder substitution
- Conditional block processing
- Physical interpretation generation
- Fallback report generation if template fails

### API Endpoint

`GET /api/computations/download-report/:testType`

Query parameters:
- `coefficients`: JSON array of 6 coefficients
- `results`: JSON object with test outputs
- `sessionId`: Current session ID
- `equation`: Formatted equation string
- `c_model`: Speed of light value
- `alpha_model`: Fine structure constant

### Client Integration

The `downloadReport` function in `RelativityPage.tsx`:
1. Retrieves full test output data
2. Formats equation in standard physics notation
3. Constructs API request with all parameters
4. Opens download in new tab

## Example Reports

See example outputs:
- `docs/example-lorentz-report.md`
- `docs/example-spin2-report.md`

## Usage

1. Run any analysis in Tab 2 (manual or from Tab 1/pinned equation)
2. Wait for tests to complete
3. Click "Download Report" button for either test
4. Markdown file downloads with full analysis

The reports provide complete transparency into:
- What equation was tested
- How the tests were performed
- What the results mean physically
- All raw data for reproducibility 