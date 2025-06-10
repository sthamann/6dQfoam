/**
 * Enhanced schema for 6D-foam visualization data
 */
import { z } from 'zod';

export const foamFrameSchema = z.object({
  gen: z.number(),
  best: z.object({
    coeffs: z.instanceof(Float32Array),
    deltaC: z.number(),
    deltaA: z.number()
  }),
  lattice: z.instanceof(Float32Array).nullable()
});

export type FoamFrame = z.infer<typeof foamFrameSchema>;

export const gaUpdateEnhancedSchema = z.object({
  runId: z.string(),
  generation: z.number(),
  best: z.object({
    coefficients: z.array(z.number()),
    fitness: z.number(),
    c_model: z.number(),
    alpha_model: z.number(),
    delta_c: z.number(),
    delta_alpha: z.number(),
    generation: z.number()
  }),
  topCandidates: z.array(z.object({
    coefficients: z.array(z.number()),
    fitness: z.number(),
    c_model: z.number(),
    alpha_model: z.number(),
    delta_c: z.number(),
    delta_alpha: z.number(),
    generation: z.number()
  })),
  foamFrame: foamFrameSchema.optional()
});

export type GAUpdateEnhanced = z.infer<typeof gaUpdateEnhancedSchema>;