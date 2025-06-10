# Global Anomaly Test Report

## Test Configuration
- **Date**: {{date}}
- **Session ID**: {{sessionId}}
- **Total Fermions**: {{fermion_count}}
- **Generations**: {{generations}}

## Test Results

### Overall Status
**Result**: {{#if passed}}✅ PASSED{{else}}❌ FAILED{{/if}}

### SU(2) Witten Anomaly Check
- **Left-handed doublets**: {{checks.SU2_Witten.doublets_L}}
- **Right-handed doublets**: {{checks.SU2_Witten.doublets_R}}
- **Even L**: {{#if checks.SU2_Witten.even_L}}✅{{else}}❌{{/if}}
- **Even R**: {{#if checks.SU2_Witten.even_R}}✅{{else}}❌{{/if}}

### SU(3) Global Anomaly
- **Status**: {{#if checks.SU3_pi7}}✅ Automatically satisfied{{else}}❌ Failed{{/if}}

## Detailed Analysis

### Fermion Content by Gauge Group
{{#each fermion_summary}}
#### {{gauge_group}}
- Left-handed: {{left_count}}
- Right-handed: {{right_count}}
{{/each}}

### SU(2) Sector Analysis
{{#if checks.SU2_Witten.even_L}}
Left-handed sector: {{checks.SU2_Witten.doublets_L}} doublets (even) ✓
{{else}}
Left-handed sector: {{checks.SU2_Witten.doublets_L}} doublets (odd) ✗
- **Issue**: Odd number violates Witten anomaly constraint
- **Required**: Add or remove one SU(2)_L doublet
{{/if}}

{{#if checks.SU2_Witten.even_R}}
Right-handed sector: {{checks.SU2_Witten.doublets_R}} doublets (even) ✓
{{else}}
Right-handed sector: {{checks.SU2_Witten.doublets_R}} doublets (odd) ✗
- **Issue**: Odd number violates Witten anomaly constraint
- **Required**: Add or remove one SU(2)_R doublet
{{/if}}

## Physics Interpretation

### Quantum Consistency
{{#if passed}}
The theory is free from global anomalies:
- Well-defined partition function on all topologies
- Consistent fermionic measure in path integral
- No mod 2 phase ambiguities
- Compatible with compactification on S²
{{else}}
⚠️ **Global anomaly detected**: The theory is quantum mechanically inconsistent.

The presence of global anomalies implies:
- Ill-defined partition function on certain manifolds
- Path integral measure not well-defined
- Theory cannot be consistently quantized
- Incompatible with certain compactifications
{{/if}}

### Topological Considerations
The global anomaly constraints arise from:
- π₆(SU(2)) = ℤ₂ topology of the gauge group
- Pfaffian sign ambiguity in fermionic determinant
- Index theorem on 6-dimensional manifolds

{{#unless passed}}
### Remediation Options
To cancel the global anomaly:
{{#unless checks.SU2_Witten.even_L}}
1. Add one SU(2)_L doublet with appropriate quantum numbers
2. Or remove one existing SU(2)_L doublet
{{/unless}}
{{#unless checks.SU2_Witten.even_R}}
1. Add one SU(2)_R doublet with appropriate quantum numbers
2. Or remove one existing SU(2)_R doublet
{{/unless}}
3. Ensure local anomalies remain cancelled after modification
{{/unless}}

## Mathematical Notes
- SU(2) constraint: #doublets ≡ 0 (mod 2) per chirality
- Based on ∫[A⁶] ch₄(F) index calculation
- Independent of continuous parameters
- Robust topological constraint