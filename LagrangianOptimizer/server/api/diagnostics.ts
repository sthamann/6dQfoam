import { Router } from "express";
import { OptimizedLagrangianEvaluator } from "../genetic-algorithm/lagrangian-optimized";
import { HighPrecisionEvaluator } from "../genetic-algorithm/precision-evaluator";
import { ALPHA_TARGET, C_TARGET, G_TARGET } from "@shared/physics/constants";

export const diagnosticsRouter = Router();

diagnosticsRouter.get("/evaluator", async (_req, res) => {
  // trivial reference genome with 6 coefficients including gravity
  // Use exact target values to test evaluator consistency
  const coeffs = [
    -0.5,                         // c0: time kinetic (gives c² = 1)
    0.5,                          // c1: space kinetic  
    0,                            // c2: mass term
    0,                            // c3: interaction
    -ALPHA_TARGET * 4 * Math.PI,  // c4: gauge (gives exact alpha)
    G_TARGET                      // c5: gravity (exact G value)
  ];

  // Pass generation 0 to use relaxed warmup constraints for diagnostics
  const js = OptimizedLagrangianEvaluator.evaluateChromosomeJS(coeffs, 0);
  const py = await HighPrecisionEvaluator.evaluateChromosome(coeffs, 0);

  // Check evaluator consistency with reasonable tolerances for floating-point differences
  const deltaC_diff = Math.abs(js.delta_c - py.delta_c);
  const deltaAlpha_diff = Math.abs(js.delta_alpha - py.delta_alpha);
  const cModel_diff = Math.abs(js.c_model - py.c_model) / C_TARGET;
  const alphaModel_diff = Math.abs(js.alpha_model - py.alpha_model) / ALPHA_TARGET;
  
  const ok =
      deltaC_diff < 1e-10 &&        // Allow small differences in delta calculations
      deltaAlpha_diff < 1e-10 &&     // Allow small differences in delta calculations
      cModel_diff < 1e-12 &&         // Very tight tolerance for actual c value
      alphaModel_diff < 1e-10;       // Reasonable tolerance for alpha

  res.json({ ok, js, py });
});