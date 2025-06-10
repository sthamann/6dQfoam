/**
 * Genetic Algorithm module exports
 * Provides the main GeneticAlgorithm class and supporting utilities
 */

export { GeneticAlgorithm } from "./ga";
export { OptimizedLagrangianEvaluator } from "./lagrangian-optimized";
export { HighPrecisionEvaluator } from "./precision-evaluator";

/* ────────────────────────────────────────────────────────────────
   NEU – Operator-Indizes & Limits / Presets von constants.ts
   ──────────────────────────────────────────────────────────────── */
export { N_OPS, IDX_GAUGE, IDX_GRAV } from "./operators";
export { TERM_LIMITS, PRESET_EXPLORATION, PRESET_PRECISION } from "./constants";

/* Re-export shared types */
export type { GAParameters, Candidate, GAUpdate } from "@shared/schema";
