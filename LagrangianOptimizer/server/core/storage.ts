import { and, eq, desc } from "drizzle-orm";
import { db } from "./db";
import {
    sessions,
    runs,
    tests,
    insertRunSchema,
    insertTestSchema,
    parameters,
} from "@shared/schema";
import type {
    Session,
    InsertSession,
    Run,
    InsertRun,
    Test,
    InsertTest,
    Parameter,
    InsertParameter,
} from "@shared/schema";

export interface IStorage {
    // Session management
    createSession(session: InsertSession): Promise<Session>;
    getSession(id: string): Promise<Session | null>;
    getAllSessions(): Promise<Session[]>;
    getActiveSession(): Promise<Session | null>;
    updateSession(
        id: string,
        updates: Partial<InsertSession>,
    ): Promise<Session | null>;
    deleteSession(id: string): Promise<boolean>;
    setActiveSession(id: string): Promise<void>;

    // Runs (GA or Manual)
    createRun(run: InsertRun): Promise<Run>;
    getRunById(id: string): Promise<Run | null>;
    getRunsForSession(sessionId: string): Promise<Run[]>;
    getLatestRunForSession(sessionId: string): Promise<Run | null>;
    saveLagrangianResult(
        sessionId: string,
        data: Omit<InsertRun, "sessionId" | "kind" | "id" | "createdAt">,
    ): Promise<Run>;
    
    // Pin functionality
    pinEquation(runId: string): Promise<Run>;
    unpinEquation(runId: string): Promise<Run>;
    getPinnedEquations(sessionId: string): Promise<Run[]>;

    // Test Results
    createTestResult(testData: InsertTest): Promise<Test>;
    getTestResultsByRun(runId: string): Promise<Test[]>;
    getOperatorsFromTest(sessionId: string, testName: string): Promise<any[]>;
    checkTestDependencies(sessionId: string, testName: string): Promise<{ canRun: boolean; missingDependencies: string[] }>;
    
    // Relativity Results
    saveRelativityResult(sessionId: string, data: any): Promise<any>;
    getRelativityResults(sessionId: string): Promise<any[]>;

    // Unified Theory Results
    saveTheoryResult(sessionId: string, data: any, runId?: string): Promise<any>;
    getTheoryResults(sessionId: string): Promise<any[]>;

    // Parameter storage
    createParameter(param: InsertParameter): Promise<Parameter>;
    getParametersForSession(sessionId: string): Promise<Parameter[]>;
    getParametersForRun(runId: string): Promise<Parameter[]>;

    getTestResults(sessionId: string): Promise<(Test & { result: any; })[]>;
}

export class PostgresStorage implements IStorage {
    // === SESSION MANAGEMENT ===
    async createSession(session: InsertSession): Promise<Session> {
        const [created] = await db.insert(sessions).values(session).returning();
        return created;
    }

    async getSession(id: string): Promise<Session | null> {
        const [session] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, id));
        return session || null;
    }

    async getAllSessions(): Promise<Session[]> {
        return await db
            .select()
            .from(sessions)
            .orderBy(desc(sessions.createdAt));
    }

    async getActiveSession(): Promise<Session | null> {
        const [session] = await db
            .select()
            .from(sessions)
            .where(eq(sessions.isActive, true));
        return session || null;
    }

    async updateSession(
        id: string,
        updates: Partial<InsertSession>,
    ): Promise<Session | null> {
        const [updated] = await db
            .update(sessions)
            .set(updates)
            .where(eq(sessions.id, id))
            .returning();
        return updated || null;
    }

    async deleteSession(id: string): Promise<boolean> {
        const result = await db.delete(sessions).where(eq(sessions.id, id));
        return (result.rowCount ?? 0) > 0;
    }

    async setActiveSession(id: string): Promise<void> {
        // First deactivate all sessions, then activate the specified one.
        await db.transaction(async (tx) => {
            await tx.update(sessions).set({ isActive: false });
            await tx
                .update(sessions)
                .set({ isActive: true })
                .where(eq(sessions.id, id));
        });
    }

    // === RUN MANAGEMENT ===
    async createRun(run: InsertRun): Promise<Run> {
        const validatedData = insertRunSchema.parse(run);
        const [created] = await db
            .insert(runs)
            .values(validatedData)
            .returning();
        return created;
    }

    async getRunById(id: string): Promise<Run | null> {
        const [run] = await db.select().from(runs).where(eq(runs.id, id));
        return run || null;
    }

    async getRunsForSession(sessionId: string): Promise<Run[]> {
        return await db
            .select()
            .from(runs)
            .where(eq(runs.sessionId, sessionId))
            .orderBy(desc(runs.createdAt));
    }

    async getLatestRunForSession(sessionId: string): Promise<Run | null> {
        const [run] = await db
            .select()
            .from(runs)
            .where(eq(runs.sessionId, sessionId))
            .orderBy(desc(runs.createdAt))
            .limit(1);
        return run || null;
    }

    async saveLagrangianResult(
        sessionId: string,
        data: Omit<InsertRun, "sessionId" | "kind" | "id" | "createdAt">,
    ): Promise<Run> {
        const runData: InsertRun = { ...data, sessionId, kind: "ga" };
        return this.createRun(runData);
    }

    // === PIN FUNCTIONALITY ===
    async pinEquation(runId: string): Promise<Run> {
        const [updated] = await db
            .update(runs)
            .set({ 
                isPinned: true, 
                pinnedAt: new Date() 
            })
            .where(eq(runs.id, runId))
            .returning();
        return updated;
    }

    async unpinEquation(runId: string): Promise<Run> {
        const [updated] = await db
            .update(runs)
            .set({ 
                isPinned: false, 
                pinnedAt: null 
            })
            .where(eq(runs.id, runId))
            .returning();
        return updated;
    }

    async getPinnedEquations(sessionId: string): Promise<Run[]> {
        return await db
            .select()
            .from(runs)
            .where(and(eq(runs.sessionId, sessionId), eq(runs.isPinned, true)))
            .orderBy(desc(runs.pinnedAt));
    }

    // === TEST RESULT MANAGEMENT ===
    async createTestResult(testData: InsertTest): Promise<Test> {
        const validatedData = insertTestSchema.parse(testData);
        const [created] = await db
            .insert(tests)
            .values(validatedData)
            .returning();

        // Automatically store important parameters from resultJson if present
        if (validatedData.resultJson) {
            const paramEntries: { name: string; value: number }[] = [];
            const mapNumber = (k: string, v: any) => {
                if (typeof v === "number" && !isNaN(v)) {
                    paramEntries.push({ name: k, value: v });
                }
            };
            const result = validatedData.resultJson as Record<string, any>;
            // list of known parameter keys
            const keys = [
                "lorentzEpsilon",
                "epsilon",
                "newtonConstant",
                "G4",
                "planckMassSquared",
                "MP2",
            ];
            for (const key of keys) {
                if (key in result) {
                    mapNumber(key, result[key]);
                }
            }
            if (paramEntries.length) {
                const run = await this.getRunById(created.runId);
                if (run) {
                    const paramsToInsert = paramEntries.map((p) => ({
                        sessionId: run.sessionId,
                        runId: run.id,
                        name: p.name,
                        value: p.value,
                    }));
                    await db.insert(parameters).values(paramsToInsert);
                }
            }
        }
        return created;
    }

    async getTestResultsByRun(runId: string): Promise<Test[]> {
        return await db
            .select()
            .from(tests)
            .where(eq(tests.runId, runId))
            .orderBy(desc(tests.createdAt));
    }

    // === RELATIVITY RESULTS ===
    async saveRelativityResult(sessionId: string, data: any): Promise<any> {
        // Parse coefficients and ensure 6 elements for database compatibility
        const coeffs = JSON.parse(data.coefficients || "[]");
        const normalizedCoeffs = coeffs.length === 5 ? [...coeffs, 0.001] : coeffs;
        
        // Create a new run for the relativity result
        const run = await this.createRun({
            sessionId,
            kind: "manual",
            coeffs: normalizedCoeffs,
            generation: 0,
            fitness: 0,
            cModel: 299792458,
            alphaModel: 0.007297353,
            gModel: 0.001,
            deltaC: 0,
            deltaAlpha: 0,
            deltaG: 0
        });

        // Store relativity-specific data as test results
        await this.createTestResult({
            runId: run.id,
            name: "relativity_analysis",
            success: true,
            runtimeMs: 0,
            resultJson: {
                lorentzEpsilon: data.lorentzEpsilon,
                newtonConstant: data.newtonConstant,
                psi0Profile: data.psi0Profile,
                isManual: data.isManual,
                formulaText: data.formulaText
            }
        });

        return {
            id: run.id,
            sessionId,
            coefficients: data.coefficients,
            lorentzEpsilon: data.lorentzEpsilon,
            newtonConstant: data.newtonConstant,
            psi0Profile: data.psi0Profile,
            isManual: data.isManual,
            createdAt: run.createdAt
        };
    }

    async getRelativityResults(sessionId: string): Promise<any[]> {
        // Get all runs for this session that have relativity test results
        const sessionRuns = await this.getRunsForSession(sessionId);
        const results = [];

        for (const run of sessionRuns) {
            const testResults = await this.getTestResultsByRun(run.id);
            const relativityTest = testResults.find(test => test.name === "relativity_analysis");
            
            if (relativityTest && relativityTest.resultJson) {
                const result = relativityTest.resultJson as any;
                results.push({
                    id: run.id,
                    sessionId,
                    coefficients: JSON.stringify(run.coeffs),
                    lorentzEpsilon: result.lorentzEpsilon,
                    newtonConstant: result.newtonConstant,
                    psi0Profile: result.psi0Profile,
                    isManual: result.isManual,
                    formulaText: result.formulaText,
                    createdAt: run.createdAt
                });
            }
        }

        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // === UNIFIED THEORY RESULTS ===
    async saveTheoryResult(sessionId: string, data: any, runId?: string): Promise<any> {
        // Parse coefficients and ensure length compatibility (append placeholder for gravity gene if missing)
        const coeffs = JSON.parse(data.coefficients || "[]");
        const normalizedCoeffs = coeffs.length === 5 ? [...coeffs, 0.001] : coeffs;

        let run: Run;
        
        if (runId) {
            // Use existing run ID instead of creating a new one
            const existingRun = await this.getRunById(runId);
            if (!existingRun) {
                throw new Error(`Run with ID ${runId} not found`);
            }
            run = existingRun;
        } else {
            // Create a dedicated run for the theory analysis result (legacy behavior)
            run = await this.createRun({
                sessionId,
                kind: "manual",
                coeffs: normalizedCoeffs,
                generation: 0,
                fitness: 0,
                cModel: 299792458,
                alphaModel: 0.007297353,
                gModel: 0.001,
                deltaC: 0,
                deltaAlpha: 0,
                deltaG: 0,
            });
        }

        // Persist the aggregated theory analysis as a single test entry
        await this.createTestResult({
            runId: run.id,
            name: "theory_analysis",
            success: data.stabilityPassed ?? true,
            runtimeMs:
                (data.runtimeReduction || 0) +
                (data.runtimeRgflow || 0) +
                (data.runtimeStability || 0),
            resultJson: {
                planckMassSquared: data.planckMassSquared,
                operators: data.operators,
                betaFunctions: data.betaFunctions,
                stabilityPassed: data.stabilityPassed,
                runtimeReduction: data.runtimeReduction,
                runtimeRgflow: data.runtimeRgflow,
                runtimeStability: data.runtimeStability,
            },
        });

        return {
            id: run.id,
            sessionId,
            coefficients: data.coefficients,
            planckMassSquared: data.planckMassSquared,
            operators: data.operators,
            betaFunctions: data.betaFunctions,
            stabilityPassed: data.stabilityPassed,
            runtimeReduction: data.runtimeReduction,
            runtimeRgflow: data.runtimeRgflow,
            runtimeStability: data.runtimeStability,
            createdAt: run.createdAt,
        };
    }

    async getTheoryResults(sessionId: string): Promise<any[]> {
        const sessionRuns = await this.getRunsForSession(sessionId);
        const results: any[] = [];

        for (const run of sessionRuns) {
            const tests = await this.getTestResultsByRun(run.id);
            const theoryTest = tests.find((t) => t.name === "theory_analysis");
            if (theoryTest && theoryTest.resultJson) {
                const result = theoryTest.resultJson as any;
                results.push({
                    id: run.id,
                    sessionId,
                    coefficients: JSON.stringify(run.coeffs),
                    planckMassSquared: result.planckMassSquared,
                    operators: result.operators,
                    betaFunctions: result.betaFunctions,
                    stabilityPassed: result.stabilityPassed,
                    runtimeReduction: result.runtimeReduction,
                    runtimeRgflow: result.runtimeRgflow,
                    runtimeStability: result.runtimeStability,
                    createdAt: run.createdAt,
                });
            }
        }

        return results.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
        );
    }

    // === PARAMETER STORAGE ===
    async createParameter(param: InsertParameter): Promise<Parameter> {
        const [created] = await db.insert(parameters).values(param).returning();
        return created;
    }

    async getParametersForSession(sessionId: string): Promise<Parameter[]> {
        return await db
            .select()
            .from(parameters)
            .where(eq(parameters.sessionId, sessionId))
            .orderBy(desc(parameters.createdAt));
    }

    async getParametersForRun(runId: string): Promise<Parameter[]> {
        return await db
            .select()
            .from(parameters)
            .where(eq(parameters.runId, runId))
            .orderBy(desc(parameters.createdAt));
    }

    async getTestResults(sessionId: string): Promise<(Test & { result: any; })[]> {
        const sessionRuns = await this.getRunsForSession(sessionId);
        const allTests: (Test & { result: any; })[] = [];
        for (const run of sessionRuns) {
            const testsForRun = await this.getTestResultsByRun(run.id);
            testsForRun.forEach((t) => {
                allTests.push({ ...t, result: t.resultJson });
            });
        }
        return allTests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async getOperatorsFromTest(sessionId: string, testName: string): Promise<any[]> {
        // Map test names to the actual test result names in the database
        const testNameMap: { [key: string]: string } = {
            'reduce6Dto4D': 'reduce_6d_to_4d',
            'dimensional_reduction': 'reduce_6d_to_4d',
            'rgflow': 'rg_flow',
            'beta2loop': 'beta_2_loop',
        };

        const actualTestName = testNameMap[testName] || testName;

        // Get the latest test result for this test type
        const allTests = await this.getTestResults(sessionId);
        const testResult = allTests.find(t => t.name === actualTestName);

        if (!testResult || !testResult.resultJson) {
            return [];
        }

        const result = testResult.resultJson as any;

        // Extract operators from the result
        if (result.operators && Array.isArray(result.operators)) {
            return result.operators;
        }

        // Some tests might store operators differently
        if (result.beta && Array.isArray(result.beta)) {
            return result.beta;
        }

        return [];
    }

    async checkTestDependencies(sessionId: string, testName: string): Promise<{ canRun: boolean; missingDependencies: string[] }> {
        const dependencies: { [key: string]: string[] } = {
            'dimensional_reduction': ['foam3d', 'grav_zero'],
            'reduce6Dto4D': ['foam3d', 'grav_zero'],
            'rg_flow': ['reduce_6d_to_4d'],
            'rgflow': ['reduce_6d_to_4d'],
            'beta2loop': ['reduce_6d_to_4d'],
            'beta_2_loop': ['reduce_6d_to_4d'],
            'ghost_scan': ['reduce_6d_to_4d'],
            'ghost': ['reduce_6d_to_4d'],
            'inflation_fit': ['rg_flow', 'beta_2_loop'],
            'inflation': ['rg_flow', 'beta_2_loop'],
            'auto_rg_3loop': ['reduce_6d_to_4d'],
            'positivity_unitarity': ['reduce_6d_to_4d'],
            'finite_t_phase': ['reduce_6d_to_4d'],
            'parameter_inference': ['reduce_6d_to_4d'],
            'vacuum_decay': ['reduce_6d_to_4d'],
            'einstein_boltzmann': ['reduce_6d_to_4d'],
        };

        const requiredTests = dependencies[testName] || [];
        if (requiredTests.length === 0) {
            return { canRun: true, missingDependencies: [] };
        }

        const allTests = await this.getTestResults(sessionId);
        const completedTestNames = allTests.map(t => t.name);
        
        const missingDependencies = requiredTests.filter(dep => !completedTestNames.includes(dep));
        
        return {
            canRun: missingDependencies.length === 0,
            missingDependencies
        };
    }
}

export const storage = new PostgresStorage();

// 👇 KORREKTUR: Fehlender Default-Export
export default storage;
