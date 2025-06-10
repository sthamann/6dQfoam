import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  doublePrecision,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import authoritative physics constants
export { ALPHA_TARGET, C_TARGET, FOUR_PI, PI } from "./physics/constants";

// Sessions - Project containers
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  tags: text("tags").array(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Runs - GA runs or manual coefficient entries
export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().$type<"ga" | "manual">(),
  coeffs: doublePrecision("coeffs").array().notNull(), // [c_tt, c_xx, c_yy, c_zz, c_xy, c_grav]
  fitness: doublePrecision("fitness"),
  generation: integer("generation"),
  runtimeMs: integer("runtime_ms"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Physics constants precision tracking
  cModel: doublePrecision("c_model"),
  alphaModel: doublePrecision("alpha_model"), 
  gModel: doublePrecision("g_model"),
  deltaC: doublePrecision("delta_c"),
  deltaAlpha: doublePrecision("delta_alpha"),
  deltaG: doublePrecision("delta_g"),
  isPinned: boolean("is_pinned").notNull().default(false),
  pinnedAt: timestamp("pinned_at"),
});

// Test Results - Physics test results storage
export const testResults = pgTable("test_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" }),
  testType: text("test_type").notNull(), // 'lorentz_isotropy', 'spin2_zero', etc.
  testName: text("test_name").notNull(),
  equationKey: text("equation_key").notNull(), // Identifier for the equation tested
  
  // Input parameters
  inputCoefficients: doublePrecision("input_coefficients").array().notNull(),
  inputCModel: doublePrecision("input_c_model"),
  inputAlphaModel: doublePrecision("input_alpha_model"),
  
  // Output results
  outputData: jsonb("output_data").notNull(), // All test-specific output
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  
  // Interpretation
  interpretation: text("interpretation"),
  classification: text("classification"),
  
  // Metadata
  computationTimeMs: integer("computation_time_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tests - Individual physics test results
export const tests = pgTable("tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // 'foam3d', 'grav_zero', etc.
  inputHash: text("input_hash"), // SHA-256 for caching
  success: boolean("success").notNull(),
  runtimeMs: integer("runtime_ms"),
  resultJson: jsonb("result_json"), // Complete Python script output
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Reports - Markdown exports, PDFs, snapshots
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  mimeType: text("mime_type").notNull(),
  blob: text("blob"), // For markdown content, stored as text
  generatedBy: text("generated_by").notNull().default("auto"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Parameters – Important physical constants extracted from tests
export const parameters = pgTable("parameters", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  runId: uuid("run_id")
    .references(() => runs.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. 'lorentz_epsilon', 'newton_g4', 'planck_mp2'
  value: doublePrecision("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const sessionsRelations = relations(sessions, ({ many }) => ({
  runs: many(runs),
  reports: many(reports),
}));

export const runsRelations = relations(runs, ({ one, many }) => ({
  session: one(sessions, {
    fields: [runs.sessionId],
    references: [sessions.id],
  }),
  tests: many(tests),
}));

export const testsRelations = relations(tests, ({ one }) => ({
  run: one(runs, {
    fields: [tests.runId],
    references: [runs.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  session: one(sessions, {
    fields: [reports.sessionId],
    references: [sessions.id],
  }),
}));

export const parametersRelations = relations(parameters, ({ one }) => ({
  session: one(sessions, { fields: [parameters.sessionId], references: [sessions.id] }),
  run: one(runs, { fields: [parameters.runId], references: [runs.id] }),
}));

// Zod schemas for validation
export const insertSessionSchema = createInsertSchema(sessions, {
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const insertRunSchema = createInsertSchema(runs, {
  kind: z.enum(["ga", "manual"]),
  coeffs: z.array(z.number()).min(5).max(6), // Allow both 5 (relativity) and 6 (GA) coefficients
  fitness: z.number().optional(),
  generation: z.number().int().optional(),
  runtimeMs: z.number().int().optional(),
  meta: z.any().optional(),
  cModel: z.number().optional(),
  alphaModel: z.number().optional(),
  gModel: z.number().optional(),
  deltaC: z.number().optional(),
  deltaAlpha: z.number().optional(),
  deltaG: z.number().optional(),
  isPinned: z.boolean().optional(),
  pinnedAt: z.date().optional(),
});

export const insertTestSchema = createInsertSchema(tests, {
  name: z.string().min(1),
  inputHash: z.string().optional(),
  success: z.boolean(),
  runtimeMs: z.number().int().optional(),
  resultJson: z.any().optional(),
});

export const insertReportSchema = createInsertSchema(reports, {
  title: z.string().min(1),
  mimeType: z.string().min(1),
  blob: z.string().optional(),
  generatedBy: z.string().default("auto"),
});

export const insertParameterSchema = createInsertSchema(parameters, {
  name: z.string().min(1),
  value: z.number(),
});

// Additional schemas for compatibility with GA system
export const gaParametersSchema = z.object({
  populationSize: z.number().int().min(1),
  mutationRate: z.number().min(0).max(1),
  crossoverRate: z.number().min(0).max(1),
  maxGenerations: z.number().int().min(1),
  fitnessThreshold: z.number().optional(),
  eliteCount: z.number().int().min(1).optional(),
  workerThreads: z.number().int().min(1).optional(),
  mutationRateGauge: z.number().min(0).max(1).optional(),
  mutationSigmaGauge: z.number().min(0).optional(),
  // ── NEW: gravity-gene step sizes ───────────────────────────
  mutationRateGrav: z.number().min(0).max(1).optional(),
  mutationSigmaGrav: z.number().min(0).optional(),
  gaugeRange: z.number().min(0).optional(),
  gravRange: z.number().min(0).optional(),
  usePython: z.boolean().optional(),
  useUltraMode: z.boolean().optional(), // Runmode Ultra: enforces g_em = c₃
});

export const gaUpdateSchema = z.object({
  generation: z.number().int(),
  bestFitness: z.number().optional(),
  averageFitness: z.number().nullable().optional(),
  stagnation: z.number().int().optional(),
  best: z
    .object({
      coefficients: z.array(z.number()),
      fitness: z.number(),
      c_model: z.number(),
      alpha_model: z.number(),
      delta_c: z.number(),
      delta_alpha: z.number(),
      g_model: z.number(),
      delta_g: z.number(),
      generation: z.number().int(),
      // New physics-based fields
      phi0: z.number().optional(),
      elegance_score: z.number().optional(),
      elegance_details: z.object({
        c3_elegance: z.number(),
        coupling_simplicity: z.number(),
        relation_bonus: z.number(),
      }).optional(),
      g_em: z.number().optional(),
      xi: z.number().optional(),
    })
    .optional(),
  topCandidates: z.array(
    z.object({
      coefficients: z.array(z.number()),
      fitness: z.number(),
      c_model: z.number(),
      alpha_model: z.number(),
      delta_c: z.number(),
      delta_alpha: z.number(),
      g_model: z.number(),
      delta_g: z.number(),
      generation: z.number().int(),
      // New physics-based fields
      phi0: z.number().optional(),
      elegance_score: z.number().optional(),
      elegance_details: z.object({
        c3_elegance: z.number(),
        coupling_simplicity: z.number(),
        relation_bonus: z.number(),
      }).optional(),
      g_em: z.number().optional(),
      xi: z.number().optional(),
    }),
  ),
  throughput: z.number(),
  status: z.enum(["running", "stopped", "completed"]),
  isUltraMode: z.boolean().optional(), // Ultra mode active status
});

// Anomaly scan payload for compatibility
export const anomalyScanPayload = z.object({
  fermions: z.array(
    z.object({
      su3: z.number().int(),
      su2: z.number().int(),
      u1: z.number(),
      chirality: z.enum(["L", "R"]),
    }),
  ),
});

// Fermion representation type
export type FermionRep = {
  su3: number;
  su2: number;
  u1: number;
  chirality: "L" | "R";
};

// Test Results types
export const insertTestResultSchema = createInsertSchema(testResults);
export type InsertTestResult = z.infer<typeof insertTestResultSchema>;
export type TestResult = typeof testResults.$inferSelect;

// Inferred types
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Run = typeof runs.$inferSelect;
export type InsertRun = z.infer<typeof insertRunSchema>;

export type Test = typeof tests.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type GAParameters = z.infer<typeof gaParametersSchema>;
export type GAUpdate = z.infer<typeof gaUpdateSchema>;
export type Candidate = GAUpdate["topCandidates"][0];

export type Parameter = typeof parameters.$inferSelect;
export type InsertParameter = z.infer<typeof insertParameterSchema>;
