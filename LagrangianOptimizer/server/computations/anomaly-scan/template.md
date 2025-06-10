# Anomaly Cancellation Test Report

## Test Configuration
- **Date**: {{date}}
- **Session ID**: {{sessionId}}
- **Fermion Count**: {{fermionCount}}
- **Generations**: {{generations}}

## Fermion Content
{{#each fermions}}
- {{group}} {{chirality}}-handed, dim={{dim}}, T={{dynkin}}, Y={{q_u1}}
{{/each}}

## Test Results

### Anomaly Cancellation Status
**Result**: {{#if anomalies_cancelled}}✅ PASSED{{else}}❌ FAILED{{/if}}

### Anomaly Coefficients (After Green-Schwarz)
{{#each traces}}
- **{{@key}}**: {{this}}
{{/each}}

### Original Traces (Before Green-Schwarz)
{{#each traces_original}}
- **{{@key}}**: {{this}}
{{/each}}

### Green-Schwarz Parameters
- **K_GS**: {{GS_factors.k_GS}}

## Analysis

### Gauge Sector
- SU(3) anomalies: {{#if su3_cancelled}}Cancelled{{else}}Non-zero{{/if}}
- SU(2) anomalies: {{#if su2_cancelled}}Cancelled{{else}}Non-zero{{/if}}
- U(1) anomalies: {{#if u1_cancelled}}Cancelled (with GS){{else}}Non-zero{{/if}}

### Gravitational Sector
- Pure gravitational: {{#if grav_cancelled}}Cancelled{{else}}Non-zero{{/if}}
- Mixed gauge-gravity: {{#if mixed_cancelled}}Cancelled{{else}}Non-zero{{/if}}

## Physics Interpretation
{{#if anomalies_cancelled}}
The theory is anomaly-free and quantum mechanically consistent. All gauge and gravitational anomalies cancel either directly or through the Green-Schwarz mechanism.
{{else}}
⚠️ The theory has uncancelled anomalies and is quantum mechanically inconsistent. Consider:
- Adjusting fermion content
- Adding additional fermion generations
- Modifying gauge representations
{{/if}}

## Technical Notes
- Tolerance used: 1e-12
- Quadratic Casimirs: SU(2)=3/4, SU(3)=4/3
- Computation includes both irreducible and reducible traces