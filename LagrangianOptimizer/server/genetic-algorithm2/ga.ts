import { Worker } from "worker_threads";
import { EventEmitter } from "events";
import { OptimizedLagrangianEvaluator } from "./lagrangian-optimized";
import { HighPrecisionEvaluator } from "./precision-evaluator";
import { N_OPS, IDX_GAUGE, IDX_GRAV, SymbolicMath } from "./operators"; // <-- NEU
import type { GAParameters, Candidate, GAUpdate } from "@shared/schema";
import { exportBestEquation } from "../exportField";
import { ALPHA_TARGET, G_TARGET, C_TARGET } from "@shared/physics/constants";
import { kappaToG, GToKappa, solvedDigits } from "@shared/lib/physicsAccuracy"; // << NEU
import { PRESET_EXPLORATION, PRESET_PRECISION, TERM_LIMITS } from "./constants";
/**
 * Genetic Algorithm implementation for Lagrangian field equation search
 * Ports the GA logic from the Python script with Worker Thread parallelization
 */
export class GeneticAlgorithm extends EventEmitter {
  private parameters: GAParameters;
  private population: number[][];
  private generation: number;
  private isRunningFlag: boolean;
  private isEmergencyRecoveryActive: boolean = false;
  private recoveryStartGeneration: number = 0;
  private workers: Worker[];
  private topCandidates: Candidate[];
  private bestCandidate: Candidate | null;
  private startTime: number;
  private evaluationCount: number;
  private hallOfFame: Candidate[];
  private static readonly HOF_SIZE = 30; // max. Einträge
  private mode: "explore" | "precision"; // Preset-Schalter
  private updateCallback?: (update: GAUpdate) => void;
  private convergenceCounter: number;
  private stagnationCounter: number;
  private digitHistory: { gen: number; dc: number; da: number; dg: number }[] =
    [];
  /** tiefe Stagnation (sobald > 30) */
  private deepStagnation = 0;
  private lastBestFitness: number;
  private mutationSigma: number;
  private stagnation: number;
  private gravityStagnation: number;
  private lastGravityCoeff: number;
  private longTermStagnation: number = 0;  // Track extended stagnation
  private isUltraModeActive: boolean = false; // Runmode Ultra status

  public static readonly PRESET: GAParameters = {
    populationSize: 800,
    mutationRate: 0.1,
    mutationRateGauge: 0.5,
    mutationSigmaGauge: 0.05,
    /* ─ Gravitational gene defaults ───────────────────────────── */
    mutationRateGrav: 0.3,
    mutationSigmaGrav: 1_000_000, // Large mutations for gravity exploration
    crossoverRate: 0.75,
    eliteCount: 8,
    workerThreads: 16,
    gaugeRange: 0.15,
    gravRange: 400_000_000, // Expanded to reach required 298M coefficient
    maxGenerations: 30_000,
    usePython: false,
    useUltraMode: true, // Runmode Ultra: auto-activates when α and G reach 5+ digits precision
  };

  constructor(parameters: Partial<GAParameters> = {}) {
    super();

    this.parameters = { ...GeneticAlgorithm.PRESET, ...parameters };
    Object.assign(this.parameters, PRESET_EXPLORATION);
    // Initialize all class properties
    this.population = [];
    this.hallOfFame = [];
    this.mode = "explore";
    this.generation = 0;
    this.isRunningFlag = false;
    this.workers = [];
    this.topCandidates = [];
    this.bestCandidate = null;
    this.startTime = 0;
    this.evaluationCount = 0;
    this.convergenceCounter = 0;
    this.stagnationCounter = 0;
    this.lastBestFitness = Infinity;
    this.mutationSigma = 0.15; // Default mutation sigma for non-gauge/non-grav coefficients
    this.stagnation = 0;
    this.gravityStagnation = 0;
    this.lastGravityCoeff = 0;
    if (this.parameters.gravRange === undefined)
      this.parameters.gravRange = 0.5;
    if (this.parameters.mutationRateGrav === undefined)
      this.parameters.mutationRateGrav = this.parameters.mutationRate;
    if (this.parameters.mutationSigmaGrav === undefined)
      this.parameters.mutationSigmaGrav = 1_000_000;
    
    // Initialize Ultra mode if enabled
    if (this.parameters.useUltraMode) {
      console.log("🚀 Runmode Ultra enabled: g_em = c₃ constraint will be enforced");
    }

    // Quick sanity test - verify evaluator can achieve target precision
    console.log("Running evaluator sanity test...");
    this.runSanityTest();
  }
  /* ============================================================= *
   * 2) ALPHA-PROBE-INJEKTOR                                       *
   *     legt bei Stagnation ein feines Cluster um den besten Gauge *
   * ============================================================= */
  private injectAlphaProbes(bestGauge: number) {
    const probeCount = Math.floor(this.parameters.populationSize * 0.05); // 5 %
    for (let k = 0; k < probeCount; k++) {
      const sign = Math.sign(bestGauge) || -1;
      const off =
        (Math.random() < 0.5 ? -1 : 1) * Math.pow(10, -3 - Math.random() * 4); // 1e-3…1e-7
      const g = bestGauge * (1 + off);
      // Generate completely new random individual instead of using hardcoded base
      const ind = this.makeIndividual();
      ind[IDX_GAUGE] = g; // Only override gauge coefficient
      this.population.push(ind);
    }
  }
  /**
   * Quick sanity test to verify evaluator precision capabilities
   */
  private runSanityTest(): void {
    const ideal = 0.007297352566;
    const coeff = ideal * 4 * Math.PI; // ≈ 0.091657
    const testCoeffs = [1, -1, 0, 0, coeff];

    const candidate =
      OptimizedLagrangianEvaluator.evaluateChromosomeJS(testCoeffs);
    console.log(
      `Sanity test result: delta_alpha = ${candidate.delta_alpha.toExponential(3)}`,
    );

    if (candidate.delta_alpha < 1e-6) {
      console.log("✓ Evaluator can achieve sub-microscopic precision");
    } else {
      console.log("⚠ Evaluator precision may be limited");
    }
  }

  /**
   * Generate a random individual (chromosome) with adaptive ranges
   */
  private makeIndividual(): number[] {
    // Generate coefficients that are more likely to satisfy hard constraints
    // Start with values that produce C close to target
    
    // For C = sqrt(-B/A) where A = -2*c0, B = -2*c1
    // We want C = 299792458, so c1/c0 = C^2
    // Let's start with c0 = -0.5, then c1 = 0.5 * C^2 (in natural units where C_target = 1)
    
    const c0 = -0.5 + (Math.random() - 0.5) * 0.1; // Small variation around -0.5
    const c1 = -c0 + (Math.random() - 0.5) * 0.001; // This ensures c1/c0 ≈ 1, with tiny variation
    
    // Mass and interaction terms for stable potential
    const c2 = Math.random() * 0.3; // Mass term (positive for stable VEV)
    const c3 = Math.random() * 0.2 + 0.01; // Self-interaction (positive, nonzero)
    
    // New coupling constants
    const { EM_COUPLING_MIN, EM_COUPLING_MAX, GRAV_COUPLING_MIN, GRAV_COUPLING_MAX } = TERM_LIMITS;
    const { couplingRange } = this.mode === "precision" ? PRESET_PRECISION : PRESET_EXPLORATION;
    
    // Start with small coupling values to explore near zero
    let g_em, xi;
    if (Math.random() < 0.1) { // In 10% der Fälle: Weite Suche
        g_em = (Math.random() - 0.5) * TERM_LIMITS.EM_COUPLING_MAX * 2;
        // For xi, ensure it stays within safe bounds for gravitational stability
        xi = Math.random() * TERM_LIMITS.GRAV_COUPLING_MAX;
    } else { // In 90% der Fälle: Fokussierte Suche nahe Null
        g_em = (Math.random() - 0.5) * couplingRange;
        // For xi, use smaller values to ensure stability
        xi = Math.random() * Math.min(couplingRange * 0.01, TERM_LIMITS.GRAV_COUPLING_MAX);
    }
    
    const coeffs = [c0, c1, c2, c3, g_em, xi];
    
    // Only enforce g_em = c₃ if Ultra mode is actually active (not just enabled)
    if (this.isUltraModeActive) {
      coeffs[4] = coeffs[3]; // g_em = c₃
    }
    
    return coeffs;
  }

  private jitterPopulationWide(fraction = 0.2) {
    const n = Math.floor(this.population.length * fraction);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * this.population.length);
      // alle Gene außer c0,c1 leicht streuen
      this.population[idx] = this.population[idx].map((v, j) =>
        j < 2 ? v : v + this.gaussianRandom() * 3 * this.mutationSigma,
      );
    }
    console.log(`⚡ Population jittered (${n} individuals)`);
  }

  /**
   * Initialize population with random individuals
   */
  private initializePopulation(): void {
    this.population = Array.from(
      { length: this.parameters.populationSize },
      () => this.makeIndividual(),
    );
  }

  /**
   * Force complete population reset to apply new coefficient constraints
   */
  private forcePopulationReset(): void {
    console.log(
      "🔄 Forcing complete population reset with unconstrained coefficients",
    );
    this.initializePopulation();
    this.generation = 0;
    this.bestCandidate = null;
    this.topCandidates = [];
    this.evaluationCount = 0;
    this.convergenceCounter = 0;
    this.stagnationCounter = 0;
    this.gravityStagnation = 0;
    this.lastBestFitness = Infinity;
    this.lastGravityCoeff = 0;
  }

  /**
   * Mutate an individual (Gaussian mutation with adaptive scaling)
   * This function now includes a specialized strategy for "Runmode Ultra".
   */
  private mutate(individual: number[]): void {

    if (this.isUltraModeActive && this.bestCandidate) {
      // ================================================================
      // STRATEGIE 1: "ULTRA MODE" - GEZIELTE FEINJUSTIERUNG
      // ================================================================
      // In diesem Modus wissen wir, welche Gene welche Konstanten steuern.

      const { phi0 } = SymbolicMath.calculateVEV(this.bestCandidate.coefficients);
      const sigma = this.mutationSigma ?? 0.01; // Kleinere Basis-Sigma im Ultra Mode

      // 1. Gezielte Mutation von c₂ (Index 2) zur Optimierung von α
      // Formel: α_eff ≈ α_std / (1 + c₂)
      if (Math.random() < 0.7) { // Hohe Wahrscheinlichkeit für diese gezielte Mutation
        const alphaErr = this.bestCandidate.alpha_model - ALPHA_TARGET;
        // Wenn α_eff zu hoch ist, muss (1+c₂) kleiner werden -> c₂ muss sinken.
        const dir = -Math.sign(alphaErr);
        const relErr = Math.abs(alphaErr / ALPHA_TARGET);
        // Eine sehr kleine, gerichtete Anpassung, um nicht über das Ziel hinauszuschießen.
        const mutation = dir * relErr * individual[2] * 0.1; // Schrittweite nur 10% des Fehlers
        individual[2] += mutation;
      }

      // 2. Gezielte Mutation von ξ (Index 5) zur Optimierung von G
      // Formel: G_eff ≈ G_std / (1 + ξ*φ₀²)
      if (phi0 > 0 && Math.random() < 0.7) {
        const GErr = this.bestCandidate.g_model - G_TARGET;
        // Wenn G_eff zu hoch ist, muss (1+ξφ₀²) größer werden -> ξ muss steigen.
        const dir = Math.sign(GErr);
        const relErr = Math.abs(GErr / G_TARGET);
        const mutation = dir * relErr * (individual[5] || 0.001) * 0.1;
        individual[5] += mutation;
        
        // CRITICAL: Check stability condition after mutation
        // Ensure 1 - ξφ₀² > 0 to maintain attractive gravity
        const xiPhi2 = individual[5] * phi0 * phi0;
        if (xiPhi2 >= 0.9) { // Safety margin: keep xiPhi2 < 0.9 instead of < 1
          individual[5] = 0.9 / (phi0 * phi0); // Set to maximum safe value
          console.log(`Stability limit reached: capped ξ at ${individual[5].toFixed(6)} to maintain attractive gravity`);
        }
      }

      // 3. c₃ (Index 3) nur noch sehr selten und sanft mutieren, um die Eleganz zu erhalten
      if (Math.random() < 0.05) {
        individual[3] += this.gaussianRandom() * sigma * 0.01; // Sehr kleine Mutation
      }

      // 4. Kinetische Terme c₀, c₁ (Indizes 0, 1) ebenfalls sehr sanft mutieren
      if (Math.random() < 0.05) {
        individual[0] += this.gaussianRandom() * sigma * 0.001;
        individual[1] = -individual[0]; // Symmetrie beibehalten für c ≈ 1
      }

    } else {
      // ================================================================
      // STRATEGIE 2: "NORMAL MODE" - EXPLORATIVE SUCHE
      // ================================================================
      // Dies ist Ihre bisherige, gut funktionierende Logik für die normale Suche.
      for (let i = 0; i < individual.length; i++) {
        const isEMCoupling = i === 4;
        const isGravCoupling = i === 5;
        const mutationRate = this.parameters.mutationRate ?? 0.1;
        const sigma = this.mutationSigma ?? 0.1;

        if (Math.random() < mutationRate) {
          let mutation: number;
          if ((isEMCoupling || isGravCoupling) && this.bestCandidate) {
            const { phi0 } = SymbolicMath.calculateVEV(this.bestCandidate.coefficients);
            if (isEMCoupling && phi0 > 0) {
              const alphaErr = this.bestCandidate.alpha_model - ALPHA_TARGET;
              const relErr = alphaErr / ALPHA_TARGET;
              const dir = Math.sign(alphaErr);
              const stepFactor = Math.max(0.01, Math.min(1.0, Math.abs(relErr)));
              const deterministic = dir * stepFactor * (individual[i] || 0.1);
              const stochastic = this.gaussianRandom() * sigma * 0.01;
              mutation = deterministic + stochastic;
            } else if (isGravCoupling && phi0 > 0) {
              const GErr = this.bestCandidate.g_model - G_TARGET;
              const relErr = GErr / G_TARGET;
              const dir = Math.sign(GErr);
              const deterministic = dir * Math.abs(relErr) * 0.1;
              const stochastic = this.gaussianRandom() * sigma * 0.01;
              mutation = deterministic + stochastic;
            } else {
              mutation = this.gaussianRandom() * sigma;
            }
          } else if (i < 2) {
            mutation = this.gaussianRandom() * sigma * 0.01;
          } else {
            mutation = this.gaussianRandom() * sigma * 0.1;
          }
          individual[i] += mutation;
        }
      }
    }

    // --- Finale Schritte für BEIDE Modi ---

    // 1. Wende die Grenzen für alle Koeffizienten an
    const [c0, c1, c2, c3, g_em, xi] = individual;
    const { MASS_MAX, INTERACTION_MAX, EM_COUPLING_MIN, EM_COUPLING_MAX, GRAV_COUPLING_MIN, GRAV_COUPLING_MAX } = TERM_LIMITS;
    individual[0] = Math.max(-1.0, Math.min(1.0, c0));
    individual[1] = Math.max(-1.0, Math.min(1.0, c1));
    individual[2] = Math.max(0, Math.min(MASS_MAX, c2));
    individual[3] = Math.max(0.001, Math.min(INTERACTION_MAX, c3));
    individual[4] = Math.max(EM_COUPLING_MIN, Math.min(EM_COUPLING_MAX, g_em));
    individual[5] = Math.max(GRAV_COUPLING_MIN, Math.min(GRAV_COUPLING_MAX, xi));

    // 2. Erzwinge die g_em = c₃ Regel NACH allen Mutationen, falls im Ultra-Modus
    if (this.isUltraModeActive) {
      individual[4] = individual[3]; // g_em = c₃
    }
  }
  /**
   * Generate Gaussian random number (Box-Muller transform)
   */
  private gaussianRandom(): number {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Crossover two parents to create offspring
   */
  private crossover(
    parent1: number[],
    parent2: number[],
  ): [number[], number[]] {
    if (Math.random() >= this.parameters.crossoverRate) {
      return [parent1.slice(), parent2.slice()];
    }

    // Single-point crossover
    const crossoverPoint = Math.floor(Math.random() * (N_OPS - 1)) + 1;

    const child1 = [
      ...parent1.slice(0, crossoverPoint),
      ...parent2.slice(crossoverPoint),
    ];

    const child2 = [
      ...parent2.slice(0, crossoverPoint),
      ...parent1.slice(crossoverPoint),
    ];
    
    // In Ultra mode, enforce g_em = c₃ for both children
    if (this.isUltraModeActive) {
      child1[4] = child1[3]; // g_em = c₃
      child2[4] = child2[3]; // g_em = c₃
    }

    return [child1, child2];
  }

  /**
   * Tournament selection with alpha-aware precision mode
   */
  private tournamentSelection(
    candidates: { fitness: number; individual: number[] }[],
  ): number[] {
    const tournamentSize = 3;
    let best = candidates[Math.floor(Math.random() * candidates.length)];

    for (let i = 1; i < tournamentSize; i++) {
      const competitor =
        candidates[Math.floor(Math.random() * candidates.length)];

      // In precision mode, prioritize alpha proximity over general fitness
      if (
        this.bestCandidate &&
        this.bestCandidate.delta_c < 1e-6 &&
        this.bestCandidate.delta_alpha < 3e-3
      ) {
        // Calculate effective alpha values for comparison in the new physics model
        const { phi0: phi0_best } = SymbolicMath.calculateVEV(best.individual);
        const { phi0: phi0_comp } = SymbolicMath.calculateVEV(competitor.individual);
        
        const bestAlpha = SymbolicMath.calculateEffectiveFineStructure(best.individual, phi0_best);
        const competitorAlpha = SymbolicMath.calculateEffectiveFineStructure(competitor.individual, phi0_comp);

        const bestAlphaDist = Math.abs(bestAlpha - ALPHA_TARGET);
        const competitorAlphaDist = Math.abs(competitorAlpha - ALPHA_TARGET);

        // 70% chance to select based on alpha proximity, 30% on general fitness
        if (Math.random() < 0.7) {
          if (competitorAlphaDist < bestAlphaDist) {
            best = competitor;
          }
        } else {
          if (competitor.fitness < best.fitness) {
            best = competitor;
          }
        }
      } else {
        // Normal fitness-based selection
        if (competitor.fitness < best.fitness) {
          best = competitor;
        }
      }
    }

    return best.individual;
  }

  /**
   * Evaluate population using worker threads
   */
  private async evaluatePopulation(): Promise<Candidate[]> {
    const workerThreads = this.parameters.workerThreads ?? 16;
    const batchSize = Math.ceil(
      this.population.length / workerThreads,
    );
    const promises: Promise<Candidate[]>[] = [];

    for (let i = 0; i < workerThreads; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, this.population.length);

      if (start < end) {
        const batch = this.population.slice(start, end);
        // KORREKTUR: Der Zustand des Recovery Mode wird hier an die Batch-Verarbeitung übergeben.
        promises.push(this.evaluateBatch(batch));
      }
    }

    const results = await Promise.all(promises);
    const allCandidates = results.flat();

    // Set generation number
    allCandidates.forEach((candidate) => {
      // Sicherheitsabfrage, um Abstürze bei leeren Kandidaten zu verhindern
      if (candidate) {
        candidate.generation = this.generation;
      }
    });

    this.evaluationCount += allCandidates.length;

    return allCandidates;
  }
   /**
   * Evaluate a batch of chromosomes using JavaScript or high-precision Python evaluator
   */
   private async evaluateBatch(batch: number[][]): Promise<Candidate[]> {
    // Der isEmergencyRecoveryActive-Zustand wird aus der Klassenvariable gelesen
    // und an die eigentlichen Evaluierungs-Funktionen weitergegeben.
    if (this.parameters.usePython) {
      // Use high-precision Python evaluator for 20+ digit calculations
      console.log(
        `Using high-precision Python evaluator for ${batch.length} chromosomes`,
      );
      // HINWEIS: Auch der Python-Worker muss diese Logik implementieren.
      return await HighPrecisionEvaluator.evaluatePopulation(
        batch, 
        this.generation, 
        this.isEmergencyRecoveryActive, // <-- HIER WIRD DER ZUSTAND ÜBERGEBEN
        this.isUltraModeActive // Ultra mode status
      );
    } else {
      // Use optimized JavaScript evaluator for maximum speed (15-17 digit precision)
      return await OptimizedLagrangianEvaluator.evaluatePopulation(
        batch, 
        this.generation, 
        this.isEmergencyRecoveryActive, // <-- HIER WIRD DER ZUSTAND ÜBERGEBEN
        this.isUltraModeActive // Ultra mode status
      );
    }
  }
  /**
   * Run one generation of the genetic algorithm
   */
  private async runGeneration(): Promise<void> {
    // Evaluate population
    const candidates = await this.evaluatePopulation();
    
    // Debug logging
    console.log(`Generation ${this.generation}: Evaluated ${candidates.length} candidates`);
    const fitnessDistribution = candidates.map(c => c?.fitness ?? Infinity);
    console.log(`  Fitness range: ${Math.min(...fitnessDistribution).toExponential(2)} to ${Math.max(...fitnessDistribution).toExponential(2)}`);
    console.log(`  Candidates with fitness < 1e6: ${candidates.filter(c => c && c.fitness < 1e6).length}`);
    console.log(`  Candidates with fitness >= 1e9: ${candidates.filter(c => c && c.fitness >= 1e9).length}`);
    
    // --- PATCH: HARD VALIDATION GATE ----------------
    const filtered = (candidates ?? []).filter((c) => {
      if (!c || !c.coefficients) return false;

      // Count different rejection reasons
      let rejected = false;
      let reason = "";
      
      // Check fitness threshold (1e9 is our knock-out fitness)
      if (c.fitness >= 1e9) {
        rejected = true;
        reason = "hard_constraint_violation";
      }
      
      // Check for NaN or Infinity
      if (!rejected && (!isFinite(c.fitness) || isNaN(c.fitness))) {
        rejected = true;
        reason = "invalid_fitness";
      }
      
      // Basic coefficient sanity checks
      const co = c.coefficients;
      if (!rejected && co.some(v => !isFinite(v) || isNaN(v))) {
        rejected = true;
        reason = "invalid_coefficients";
      }
      
      // Log rejection reasons periodically
      if (rejected && this.generation % 10 === 0 && Math.random() < 0.1) {
        console.log(`  Rejected candidate: ${reason}, fitness=${c.fitness}`);
      }
      
      return !rejected;
    });
    
    console.log(`  After filtering: ${filtered.length} candidates passed all checks`);

   // HIER IST DIE KORREKTE STELLE FÜR DEN CHECK: NACH DEM FILTERN
   if (filtered.length === 0) {
    console.warn(`[RECOVERY] Generation ${this.generation}: Population collapse. Activating EMERGENCY RECOVERY.`);
    this.isEmergencyRecoveryActive = true;
    this.recoveryStartGeneration = this.generation;

    this.reseedFromHallOfFame(0.8, true); // true = starke Mutation
    
    while (this.population.length < this.parameters.populationSize) {
      this.population.push(this.makeIndividual());
    }
    
    this.mutationSigma = Math.min(this.mutationSigma * 2.0, 0.5);
    console.log(`  › Mutation sigma increased to ${this.mutationSigma.toFixed(3)}`);

    this.generation++;
    this.sendUpdate();
    return; // Beendet die Ausführung für diese fehlerhafte Generation
  }


    // Arbeite nur mit gültigen
    const candList = filtered;
    // Prüfen, ob der Recovery Mode verlassen werden kann
    if (this.isEmergencyRecoveryActive) {
      if (candList.length > this.parameters.populationSize * 0.1) {
        console.log("✅ Population recovered. Deactivating Emergency Recovery Mode.");
        this.isEmergencyRecoveryActive = false;
      }
    }
    // -------------------------------------------------
    // Sort by fitness (lower is better)
    /* ab hier nur noch mit candList arbeiten */
    candList.sort((a, b) => a.fitness - b.fitness);
    this.bestCandidate = candList[0];
    this.topCandidates = candList.slice(0, 10);

    // ⭑⭑⭑ Hall-of-Fame aktualisieren
    for (const cand of this.topCandidates) {
      if (!this.hallOfFame.some((h) => h.fitness === cand.fitness)) {
        this.hallOfFame.push(cand);
      }
    }
    this.hallOfFame.sort((a, b) => a.fitness - b.fitness);
    this.hallOfFame.splice(GeneticAlgorithm.HOF_SIZE);

    // Convergence check removed - continue evolution for full generation count

    // Create new population
    const newPopulation: number[][] = [];

    // Enhanced elitism with mandatory diversity in precision mode
    if (
      this.bestCandidate &&
      this.bestCandidate.delta_c < 1e-6 &&
      this.bestCandidate.delta_alpha < 3e-3
    ) {
      // In precision mode, enforce alpha diversity among elites
      const uniqueElites: Candidate[] = [];
      const alphaThreshold = 1e-12; // Very small threshold for alpha uniqueness

      for (const candidate of candList) {
        const candidateAlpha =
          Math.abs(candidate.coefficients[IDX_GAUGE]) / (4 * Math.PI);

        // Check if this alpha value is sufficiently different from existing elites
        const isUnique = uniqueElites.every((elite) => {
          const eliteAlpha =
            Math.abs(elite.coefficients[IDX_GAUGE]) / (4 * Math.PI);
          return Math.abs(candidateAlpha - eliteAlpha) > alphaThreshold;
        });

        if (isUnique || uniqueElites.length === 0) {
          uniqueElites.push(candidate);
          newPopulation.push(candidate.coefficients.slice());
        }

        if (uniqueElites.length >= (this.parameters.eliteCount ?? 8)) break;
      }

      // Fill remaining elite slots if needed with forced diversity
      while (newPopulation.length < (this.parameters.eliteCount ?? 8)) {
        const baseElite = uniqueElites[0].coefficients.slice();
        baseElite[IDX_GAUGE] +=
          (Math.random() - 0.5) * Math.abs(baseElite[IDX_GAUGE]) * 0.001;
        newPopulation.push(baseElite);
      }
    } else {
      // Ensure we don't try to preserve more elites than we have valid candidates
      const eliteCount = Math.min(this.parameters.eliteCount ?? 8, candList.length);
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push(candList[i].coefficients.slice());
      }
      
      // If we have fewer candidates than elite count, warn and fill with best available
      if (candList.length < (this.parameters.eliteCount ?? 8)) {
        console.warn(`⚠️ Only ${candList.length} candidates passed validation, but elite count is ${this.parameters.eliteCount ?? 8}`);
        // Fill remaining elite slots by repeating the best candidate with small variations
        while (newPopulation.length < (this.parameters.eliteCount ?? 8) && candList.length > 0) {
          const bestCandidate = candList[0].coefficients.slice();
          // Add small random perturbation to create diversity
          for (let j = 0; j < bestCandidate.length; j++) {
            bestCandidate[j] += this.gaussianRandom() * 0.001 * Math.abs(bestCandidate[j]);
          }
          newPopulation.push(bestCandidate);
        }
      }
    }

    // 10% fresh randoms every 50 stagnant generations
    if (this.stagnation === 30) {
      const inject = Math.floor(this.parameters.populationSize * 0.1);
      for (let k = 0; k < inject; k++) {
        newPopulation.push(this.makeIndividual());
      }
    }
    if (this.generation % 100 === 0) {
      // 100-Gen-Burst
      this.parameters.crossoverRate = 0.95;
      this.parameters.mutationRate = 0.3;
    }
    if (this.generation % 100 === 20) {
      // zurück
      this.parameters.crossoverRate = 0.75;
      this.parameters.mutationRate = 0.1;
    }

    // Generate rest of population through selection, crossover, and mutation
    const fitnessData = candList.map((c) => ({
      fitness: c.fitness,
      individual: c.coefficients,
    }));
    
    // Safety check: if we have very few candidates, regenerate some random ones
    if (fitnessData.length < 2) {
      console.warn(`⚠️ Only ${fitnessData.length} candidates available for breeding. Generating fresh population.`);
      // Fill the rest with fresh random individuals
      while (newPopulation.length < this.parameters.populationSize) {
        newPopulation.push(this.makeIndividual());
      }
    } else {
      // Normal breeding process
      while (newPopulation.length < this.parameters.populationSize) {
        let parent1 = this.tournamentSelection(fitnessData);
        let parent2 = this.tournamentSelection(fitnessData);
        // In precision mode, enforce parent diversity to prevent identical breeding
        if (
          this.bestCandidate &&
          this.bestCandidate.delta_c < 1e-6 &&
          this.bestCandidate.delta_alpha < 3e-3
        ) {
          let attempts = 0;
          const maxAttempts = 20;

          // Ensure parents have different alpha values
          while (attempts < maxAttempts) {
            const alpha1 = Math.abs(parent1[IDX_GAUGE]) / (4 * Math.PI);
            const alpha2 = Math.abs(parent2[IDX_GAUGE]) / (4 * Math.PI);
            const alphaDiff = Math.abs(alpha1 - alpha2);

            if (alphaDiff > 1e-12) break; // Parents are sufficiently different

            parent2 = this.tournamentSelection(fitnessData);
            attempts++;
          }

          // If still identical after many attempts, force diversity
          if (attempts >= maxAttempts) {
            const alpha1 = Math.abs(parent1[IDX_GAUGE]) / (4 * Math.PI);
            const targetAlphaDelta = (Math.random() - 0.5) * 1e-9; // Small random offset
            const newGauge =
              (alpha1 + targetAlphaDelta) *
              4 *
              Math.PI *
              Math.sign(parent1[IDX_GAUGE]);
            parent2 = parent1.slice();
            parent2[IDX_GAUGE] = newGauge;
          }
        }

        const [child1, child2] = this.crossover(parent1, parent2);

        // Removed sign-flip constraints to allow free coefficient exploration

        this.mutate(child1);
        this.mutate(child2);

        newPopulation.push(child1);
        if (newPopulation.length < this.parameters.populationSize) {
          newPopulation.push(child2);
        }
      }
    }

    // In precision mode, ensure gauge diversity across population
    if (
      this.bestCandidate &&
      this.bestCandidate.delta_c < 1e-6 &&
      this.bestCandidate.delta_alpha < 3e-3
    ) {
      this.maintainGaugeDiversity(newPopulation);

      // Additional step: Force unique alpha values for top candidates
      this.enforceTopCandidateDiversity(newPopulation);
    }

    this.population = newPopulation.slice(0, this.parameters.populationSize);
    this.generation++;

    // Occasional crossover boost
    if (this.generation % 200 === 0) this.parameters.crossoverRate = 0.9;
    if (this.generation % 200 === 10) this.parameters.crossoverRate = 0.75;

    // Adaptive mutation and auto-precision switching
    this.updateAdaptiveMutation();
    this.checkPrecisionSwitch();

    // Send update
    this.sendUpdate();
    
    // Log warmup status
    if (this.generation === 0) {
      console.log("🔥 WARMUP PERIOD: Generations 0-9 use relaxed constraints (C: 1%, G: 10%)");
    } else if (this.generation === 10) {
      console.log("📈 PROGRESSIVE TIGHTENING: Generations 10-99 gradually tighten constraints");
    } else if (this.generation === 100) {
      console.log("❄️ FULL CONSTRAINTS ACTIVE: C < 1 ppm, G < 100 ppm");
    }
  }

  /**
   * Update adaptive mutation parameters based on stagnation
   */
  private updateAdaptiveMutation(): void {
    /* --- Digi-Tracker -------------------------------------------------- */
    if (!this.bestCandidate) {
      // Wenn es keinen besten Kandidaten gibt (weil alle unphysikalisch waren),
      // können wir keine adaptiven Mutationen durchführen. Wir überspringen die Funktion.
      console.warn("Skipping adaptive mutation: No best candidate in this generation.");
      this.lastBestFitness = Infinity; // Setze die Fitness zurück, um eine Verbesserung in der nächsten Gen. zu ermöglichen
      return; 
    }
    
    // Check for automatic Ultra mode activation
    const precisionStatus = this.getConstantsPrecisionStatus(this.bestCandidate);
    if (
      !this.isUltraModeActive &&                           // Not already active
      this.parameters.useUltraMode &&                      // Feature enabled
      precisionStatus.a_digits >= 5 &&                     // α has 5+ digits precision
      precisionStatus.g_digits >= 5                        // G has 5+ digits precision
    ) {
      console.log("🚀 Switching to Runmode Ultra: Enforcing g_em = c₃ constraint.");
      console.log(`   Current precision: α=${precisionStatus.a_digits} digits, G=${precisionStatus.g_digits} digits`);
      console.log(`   Current best fitness: ${this.bestCandidate.fitness.toExponential(6)}`);
      this.isUltraModeActive = true;
      
      // Convert existing population to Ultra mode
      this.convertPopulationToUltraMode();
      console.log("   Ultra mode is now active. All future mutations will maintain g_em = c₃.");
    }
    this.digitHistory.push({
      gen: this.generation,
      dc: solvedDigits(this.bestCandidate?.delta_c ?? 1),
      da: solvedDigits(this.bestCandidate?.delta_alpha ?? 1),
      dg: solvedDigits(this.bestCandidate?.delta_g ?? 1),
    });
    if (this.digitHistory.length > 50) this.digitHistory.shift(); // Fenster 50 Gen.

    const last10 = this.digitHistory.slice(-10);
    const stagnated =
      last10.every((r) => r.dc <= last10[0].dc) &&
      last10.every((r) => r.da <= last10[0].da) &&
      last10.every((r) => r.dg <= last10[0].dg);

    this.deepStagnation = stagnated ? this.deepStagnation + 1 : 0;
    /* ------------------------------------------------------------------- */
    const improved = this.bestCandidate!.fitness < this.lastBestFitness - 1e-8;

    // Track gravity coefficient stagnation independently
    const currentGravCoeff = this.bestCandidate
      ? this.bestCandidate.coefficients[5]
      : 0;
    const gravityChanged =
      Math.abs(currentGravCoeff - this.lastGravityCoeff) > 1e3; // Detect significant gravity coefficient changes

    this.stagnation = improved ? 0 : this.stagnation + 1;
    this.gravityStagnation = gravityChanged ? 0 : this.gravityStagnation + 1;

    if (this.bestCandidate) {
      this.lastGravityCoeff = this.bestCandidate.coefficients[5];
    }

    if (improved) {
      this.mutationSigma = Math.max(this.mutationSigma * 0.9, 1e-5);
    } else if (this.stagnation % 30 === 0) {
      this.mutationSigma = Math.min(this.mutationSigma * 1.5, 0.2); // re-expand
    }

    if (this.stagnation === 50) {
      this.reannealAroundElite();
      this.stagnation = 0;
    }
    // --- Alpha-Probe-Trigger ------------------------------------------
    if (
      this.bestCandidate &&
      this.bestCandidate.delta_c < 1e-6 &&
      this.bestCandidate.delta_alpha > 5e-9 && // war 1e-4
      this.stagnation > 15 // früher 20
    ) {
      this.injectAlphaProbes(this.bestCandidate.coefficients[IDX_GAUGE]);
      console.log("» Alpha-Probes injiziert «");
    }
    // Additional stagnation breaking for precision mode (more aggressive)
    if (
      this.stagnation > 5 &&
      this.bestCandidate &&
      this.bestCandidate.delta_c < 1e-6 &&
      this.bestCandidate.delta_alpha < 3e-3
    ) {
      this.forceGaugeDiversity();
      this.stagnation = 0;
    }

    // ────────────────────────────────────────────────────────────────
    // Gravity-diversity trigger wenn G-Optimierung festhängt
    // ────────────────────────────────────────────────────────────────
    if (
      this.gravityStagnation > 6 && // ≥ 9 Generationen ohne Fortschritt
      this.bestCandidate && // es gibt einen Kandidaten
      this.bestCandidate.delta_c < 1e-7 && // c bereits ≈ Zielfertigkeit
      this.bestCandidate.delta_alpha < 1e-8 && // α hochpräzise
      this.bestCandidate.delta_g > 1e-4 // G noch deutlich daneben
    ) {
      // Schrittweite für Grav-Mutationen dynamisch vergrössern
      const currentSigmaGrav = this.parameters.mutationSigmaGrav ?? 1_000_000;
      this.parameters.mutationSigmaGrav = Math.min(
        currentSigmaGrav * 1.3,
        4e8,
      );
      if (this.bestCandidate?.delta_g < 1e-3)
        this.parameters.mutationSigmaGrav *= 0.5;

      // gezielt neue Varianten um Ziel-κ/G injizieren
      this.forceGravityDiversity();

      console.log(
        `Triggered gravity diversity: Δg=${this.bestCandidate.delta_g.toExponential(3)}, ` +
          `gravityStagnation=${this.gravityStagnation}`,
      );

      // Zähler zurücksetzen, damit der Trigger erst nach erneutem Festhängen feuert
      this.gravityStagnation = 0;
    }

    /* ----------------- optionale Mikro-Shake fürs Grav-Gen ----------------- */
    /* legt nur 20 % der Population leicht um ±0.5 % um,                       */
    /* falls wir zwar stagnieren, aber der große Grav-Trigger (oben) NICHT zog */

    if (
      this.gravityStagnation > 3 && // ≥ 4 Gen. ohne Grav-Fortschritt
      this.gravityStagnation <= 8 && // aber noch unter Groß-Trigger-Schwelle
      this.bestCandidate && // wir haben einen Kandidaten
      this.bestCandidate.delta_c < 1e-6 && // c sitzt
      this.bestCandidate.delta_alpha < 1e-8 && // α ≥ 8 Digits
      this.bestCandidate.delta_g > 1e-4 // G deutlich daneben
    ) {
      const shake =
        Math.abs(this.bestCandidate.coefficients[IDX_GRAV]) *
        0.2 *
        this.bestCandidate.delta_g; // ±0.5 %
      for (const ind of this.population) {
        if (Math.random() < 0.2) {
          // nur 20 % der Individuen
          ind[IDX_GRAV] += this.gaussianRandom() * shake;
        }
      }
      console.log(`ℹ️  Mild gravity shake injected (±0.5 %, 20 % pop)`);
    }

    if (this.bestCandidate?.delta_alpha < 1e-6) {
      this.parameters.mutationRateGauge = 0.9;
      this.parameters.mutationSigmaGauge = 2e-4; // statt 5e-5
    }

    /* --- leichte Öffnung, wenn Präzisions-Modus ins Stocken gerät ------- */
    if (this.mode === "precision" && this.stagnation > 10) {
      this.mutationSigma = Math.min(
        this.mutationSigma * 1.3,
        0.1,
      );
      this.parameters.mutationRate = Math.min(
        this.parameters.mutationRate * 1.2,
        0.3,
      );
      if (this.parameters.mutationSigmaGauge !== undefined) {
        this.parameters.mutationSigmaGauge = Math.min(
          this.parameters.mutationSigmaGauge * 1.3,
          5e-4,
        );
      }
    }

    if (this.bestCandidate) {
      this.lastBestFitness = this.bestCandidate.fitness;
      /* ----- geschärfte Schalter ---------- */
      if (this.bestCandidate.delta_c < 1e-6) {
        // Phase 2 – c lock-in → α hat Priorität
        this.parameters.mutationRateGauge = 0.8;
        this.parameters.mutationSigmaGauge = 5e-4;
      }
      if (this.bestCandidate.delta_alpha < 1e-6) {
        // Phase 3 – Fein-Finish
        this.parameters.mutationRateGauge = 0.9;
        this.parameters.mutationSigmaGauge = 5e-5;
      }
      // Phase 4 – Gauge Freeze: sobald 12 Digits erreicht
      if (this.bestCandidate.delta_alpha < 1e-10) {
        this.parameters.mutationRateGauge = 0.05; // nur noch 5 % Mutation
        this.parameters.mutationSigmaGauge = 2e-4; // winzige Steps
      }

      if (this.stagnation === 40) {
        // 80 Gen ohne Fortschritt
        console.log("💥 Stagnation-Kick!");
        this.reseedFromHallOfFame(0.15); // 40 % ersetzen
        this.mutationSigma *= 2.5;
        this.parameters.mutationRate *= 1.5;
        this.jitterPopulationWide(0.3);
        this.stagnation = 0;
      }

      /* --- Tiefen-Stagnation brechen ------------------------------------ */
      if (this.deepStagnation >= 20) {
        // 30 Gen. ohne neue Digits
        console.log("🛑 Deep stagnation – applying population jitter");
        this.reseedFromHallOfFame(0.15);
        this.jitterPopulationWide(0.25);
        this.mutationSigma *= 2; // Mutation verbreitern
        this.deepStagnation = 0;
      }
      
      /* --- Extended Long-Term Stagnation Recovery ---------------------- */
      // Track long-term stagnation (100+ generations without improvement)
      if (this.bestCandidate) {
        const currentFitness = this.bestCandidate.fitness;
        if (Math.abs(currentFitness - this.lastBestFitness) < 1e-12) {
          this.longTermStagnation++;
        } else {
          this.longTermStagnation = 0;
        }
        
        // Aggressive recovery for extended stagnation
        if (this.longTermStagnation >= 100) {
          console.log(`🚨 EXTENDED STAGNATION: ${this.longTermStagnation} generations without improvement!`);
          console.log(`   Best fitness stuck at: ${currentFitness.toExponential(6)}`);
          console.log(`   Only ${Math.floor(100 * 31/800)}% of candidates passing constraints`);
          
          // 1. Relax mutation parameters significantly
          this.parameters.mutationRate = Math.min(0.5, this.parameters.mutationRate * 3);
          this.mutationSigma = Math.min(0.3, this.mutationSigma * 5);
          this.parameters.mutationRateGauge = 0.95;
          this.parameters.mutationSigmaGauge = Math.min(1e-3, (this.parameters.mutationSigmaGauge ?? 0.05) * 10);
          this.parameters.mutationRateGrav = 0.8;
          this.parameters.mutationSigmaGrav = Math.min(1e9, (this.parameters.mutationSigmaGrav ?? 1_000_000) * 10);
          
          // 2. Inject massive diversity
          console.log("   💉 Injecting 50% new random individuals");
          const injectCount = Math.floor(this.parameters.populationSize * 0.5);
          const eliteCount = this.parameters.eliteCount ?? 8;
          for (let i = eliteCount; i < eliteCount + injectCount; i++) {
            if (i < this.population.length) {
              this.population[i] = this.makeIndividual();
            }
          }
          
          // 3. Force diversity in all dimensions
          this.forceGaugeDiversity();
          this.forceGravityDiversity();
          this.jitterPopulationWide(0.5); // 50% jitter
          
          // 4. Reseed from hall of fame with larger fraction
          this.reseedFromHallOfFame(0.3);
          
          console.log("   ✅ Applied aggressive recovery measures");
          
          // Reset counter but keep track of recovery attempts
          this.longTermStagnation = 50; // Don't reset to 0, but reduce significantly
        }
      }
      /* ------------------------------------------------------------------ */
    }

    // ⭑⭑⭑ Preset switch
    if (
      this.mode === "explore" &&
      this.bestCandidate &&
      this.bestCandidate.delta_alpha < 1e-5
    ) {
      Object.assign(this.parameters, PRESET_PRECISION);
      this.mode = "precision";
      console.log("🔧 switched to precision preset");
    }
  }

  /**
   * Force gravity coefficient diversity when stagnation is detected
   */
  private forceGravityDiversity(): void {
    if (!this.bestCandidate) return;

    const bestGrav = this.bestCandidate.coefficients[IDX_GRAV];
    const currentG = 1 / (16 * Math.PI * Math.abs(this.bestCandidate.g_model));
    const gravError = currentG - G_TARGET;

    console.log(
      `Force gravity diversity: current coeff=${bestGrav.toFixed(1)}, G=${currentG.toExponential(6)}, target=${G_TARGET.toExponential(6)}`,
    );

    // Replace 40% of population with gravity-directed variants toward exact G target
    const replaceCount = Math.floor(this.parameters.populationSize * 0.6); // 60 %
    const preserveCount = Math.floor(this.parameters.populationSize * 0.1);

    for (let i = preserveCount; i < replaceCount + preserveCount; i++) {
      const individual = this.bestCandidate.coefficients.slice();

      // Calculate target gravity coefficient for exact G
      const targetGModel = 1 / (16 * Math.PI * G_TARGET);
      const targetGrav = -targetGModel; // Negative by convention

      // Gradient from current gravity toward target gravity
      const progress = (i - preserveCount) / replaceCount;
      const nudgeFactor = 0.2 + progress * 0.6; // 20% to 80% nudge toward target

      individual[IDX_GRAV] =
        bestGrav +
        (targetGrav - bestGrav) * nudgeFactor +
        this.gaussianRandom() * Math.abs(bestGrav) * 0.01; // 1% random exploration

      this.population[i] = individual;
    }
    // Nach dem Injizieren: MutationSigmaGrav hochsetzen
    const currentMutationSigmaGrav = this.parameters.mutationSigmaGrav ?? 1_000_000;
    this.parameters.mutationSigmaGrav = Math.min(
      currentMutationSigmaGrav * 4,
      400_000_000,
    );
    console.log(
      `Force gravity diversity: injected ${replaceCount} G-directed variants toward target ${G_TARGET.toExponential(6)}`,
    );
  }

  /**
   * Force gauge coefficient diversity when precision mode stagnation is detected
   */
  private forceGaugeDiversity(): void {
    if (!this.bestCandidate) return;

    const bestGauge = this.bestCandidate.coefficients[IDX_GAUGE];
    const currentAlpha = Math.abs(bestGauge) / (4 * Math.PI);
    const alphaError = currentAlpha - ALPHA_TARGET;

    console.log(
      `Force gauge diversity: current gauge=${bestGauge.toFixed(6)}, alpha=${currentAlpha.toFixed(9)}, target=${ALPHA_TARGET.toFixed(9)}`,
    );

    // Replace 50% of population with directed variants toward exact alpha target
    const replaceCount = Math.floor(this.parameters.populationSize * 0.5);

    // Preserve top 10% alpha-optimal candidates
    const preserveCount = Math.floor(this.parameters.populationSize * 0.1);

    for (let i = preserveCount; i < replaceCount + preserveCount; i++) {
      const individual = this.bestCandidate.coefficients.slice();

      // Directed nudge toward exact alpha target
      const direction = Math.sign(alphaError);
      const targetGauge = ALPHA_TARGET * 4 * Math.PI * Math.sign(bestGauge);

      // Gradient from current gauge toward target gauge
      const progress = (i - preserveCount) / replaceCount;
      const nudgeFactor = 0.1 + progress * 0.4; // 10% to 50% nudge toward target

      individual[IDX_GAUGE] =
        bestGauge +
        (targetGauge - bestGauge) * nudgeFactor +
        this.gaussianRandom() * Math.abs(bestGauge) * 0.0001; // small random component

      this.population[i] = individual;
    }

    console.log(
      `Force gauge diversity: injected ${replaceCount} alpha-directed variants toward target ${ALPHA_TARGET.toFixed(9)}`,
    );
  }

  /**
   * Maintain gauge coefficient diversity across the population during precision mode
   */
  private maintainGaugeDiversity(population: number[][]): void {
    if (!this.bestCandidate) return;

    const bestGauge = this.bestCandidate.coefficients[IDX_GAUGE];

    // Ensure no more than 20% of population has identical gauge coefficients
    const maxIdentical = Math.floor(population.length * 0.1); // → 10 %
    const gaugeValues = population.map((ind) => ind[IDX_GAUGE]);

    // Count occurrences of each gauge value (higher precision for finer diversity)
    const gaugeCounts = new Map<string, number>();
    gaugeValues.forEach((val) => {
      const key = val.toFixed(14);
      gaugeCounts.set(key, (gaugeCounts.get(key) || 0) + 1);
    });

    // Apply diversity enforcement with ultra-fine perturbations
    let diversityApplied = 0;
    for (let i = 0; i < population.length; i++) {
      const gaugeKey = population[i][IDX_GAUGE].toFixed(12);
      if (gaugeCounts.get(gaugeKey)! > maxIdentical) {
        // Apply ultra-fine perturbation for sub-microscopic diversity
        const perturbation =
          this.gaussianRandom() *
          bestGauge *
          (0.0000001 + Math.random() * 0.00001);
        population[i][IDX_GAUGE] = bestGauge + perturbation;
        diversityApplied++;
      }
    }

    if (diversityApplied > 0) {
      console.log(
        `Maintained gauge diversity: applied ${diversityApplied} micro-perturbations`,
      );
    }
  }

  /**
   * Enforce diversity among top candidates to prevent identical clustering
   */
  private enforceTopCandidateDiversity(population: number[][]): void {
    if (!this.bestCandidate) return;

    // Sort population by fitness to identify top candidates
    const evaluated = population.map((coeffs) => {
      const alpha = Math.abs(coeffs[IDX_GAUGE]) / (4 * Math.PI);
      const alphaError = Math.abs(alpha - ALPHA_TARGET);
      return { coeffs, alphaError };
    });

    evaluated.sort((a, b) => a.alphaError - b.alphaError);

    // Ensure top 10 candidates have unique alpha values
    const topCount = Math.min(10, population.length);
    const uniqueAlphas = new Set<string>();

    for (let i = 0; i < topCount; i++) {
      const gaugeCoeff = evaluated[i].coeffs[IDX_GAUGE];
      const alpha = Math.abs(gaugeCoeff) / (4 * Math.PI);
      const alphaKey = alpha.toFixed(15);

      if (uniqueAlphas.has(alphaKey)) {
        // Force unique alpha by systematic offset toward target
        const baseAlpha =
          Math.abs(this.bestCandidate.coefficients[IDX_GAUGE]) / (4 * Math.PI);
        const targetDirection = ALPHA_TARGET - baseAlpha;
        const offsetScale = (i + 1) * 1e-10; // Progressively larger offsets

        const newAlpha =
          baseAlpha +
          targetDirection * offsetScale +
          (Math.random() - 0.5) * 1e-12;
        const newGauge = newAlpha * 4 * Math.PI * Math.sign(gaugeCoeff);

        evaluated[i].coeffs[IDX_GAUGE] = newGauge;
        uniqueAlphas.add(newAlpha.toFixed(15));
      } else {
        uniqueAlphas.add(alphaKey);
      }
    }
  }

  /**
   * Check if we should switch to high-precision Python mode
   */
  private checkPrecisionSwitch(): void {
    if (
      !this.parameters.usePython &&
      this.bestCandidate &&
      this.bestCandidate.delta_c < 1e-6 &&
      this.bestCandidate.delta_alpha < 1e-6
    ) {
      this.parameters.usePython = true;
      console.log("» Umschalten auf High-Precision-Python («)");
    }
  }

  /**
   * Force immediate population reset with unconstrained coefficients
   */
  async forceUnconstrainedReset(): Promise<void> {
    console.log("🔄 FORCING UNCONSTRAINED POPULATION RESET");
    this.forcePopulationReset();
    console.log(
      "✅ Population reset complete - all coefficients now unconstrained",
    );
  }
  /**
   * Reanneal population around elite candidates
   */
  private reannealAroundElite(): void {
    const keepCount = Math.floor(this.parameters.populationSize * 0.2);
    const elites = this.population.slice(0, keepCount);

    // Replace 80% of population with variants around elites
    for (let i = keepCount; i < this.parameters.populationSize; i++) {
      const eliteIndex = i % elites.length;
      const elite = elites[eliteIndex].slice();

      // Add small random perturbations
      for (let j = 0; j < elite.length; j++) {
        elite[j] += this.gaussianRandom() * 0.02;
      }

      this.population[i] = elite;
    }

    console.log("Reanneal: refreshed population around elite candidates");
  }

  /**
   * Send update to callback
   */
  private sendUpdate(): void {
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - this.startTime) / 1000;
    const throughput =
      elapsedSeconds > 0 ? this.evaluationCount / elapsedSeconds : 0;

    // Get precision status and log optimization focus
    const precisionStatus = this.getConstantsPrecisionStatus(this.bestCandidate);
    if (this.generation % 10 === 0 && this.bestCandidate) {
      console.log(`\n📊 Generation ${this.generation} Status:`);
      console.log(`   C: ${precisionStatus.c_digits} digits (tolerance: ${(this.bestCandidate.delta_c).toExponential(2)} < 1e-6)`);
      console.log(`   G: ${precisionStatus.g_digits} digits (tolerance: ${(this.bestCandidate.delta_g ?? 1).toExponential(2)} < 1e-4)`);
      console.log(`   α: ${precisionStatus.a_digits} digits ${precisionStatus.a_solved ? '✓ SOLVED' : '⟳ OPTIMIZING'}`);
      console.log(`   🎯 Hard constraints: C < 1ppm, G < 100ppm relative error`);
      console.log(`   🔬 All optimization effort focused on fine-structure constant α`);
    }

    const update: GAUpdate = {
      generation: this.generation,
      best: this.bestCandidate || undefined,
      topCandidates: this.topCandidates,
      throughput: Math.round(throughput),
      status: this.isRunningFlag ? "running" : "stopped",
      isUltraMode: this.isUltraModeActive, // Ultra mode status
    };

    // Export best equation for relativity analysis
    if (this.bestCandidate) {
      exportBestEquation({
        coeffs: this.bestCandidate.coefficients,
        timestamp: Date.now(),
        generation: this.generation,
        fitness: this.bestCandidate.fitness,
        c_model: this.bestCandidate.c_model,
        alpha_model: this.bestCandidate.alpha_model,
        g_model: this.bestCandidate.g_model,
        delta_c: this.bestCandidate.delta_c,
        delta_alpha: this.bestCandidate.delta_alpha,
        delta_g: this.bestCandidate.delta_g ?? 1,
      });
    }

    console.log(
      `Generation ${this.generation}, Best fitness: ${this.bestCandidate?.fitness?.toExponential(6) || "N/A"}`,
    );

    // Send update to callback if registered
    if (this.updateCallback) {
      this.updateCallback(update);
    }

    // Also emit as event for WebSocket broadcasting
    this.emit("update", update);
  }

  /**
   * Start the genetic algorithm
   */
  async start(): Promise<void> {
    if (this.isRunningFlag) {
      throw new Error("Genetic algorithm is already running");
    }

    this.isRunningFlag = true;
    this.generation = 0;
    this.evaluationCount = 0;
    this.startTime = Date.now();

    // Initialize population
    this.initializePopulation();

    // Set up auto-save interval every 30 seconds for Tab 1 best candidates
    const autoSaveInterval = setInterval(async () => {
      if (!this.isRunningFlag) {
        clearInterval(autoSaveInterval);
        return;
      }

      if (this.bestCandidate) {
        try {
          const { storage } = await import("../core/storage");
          const activeSession = await storage.getActiveSession();

          if (activeSession) {
            await storage.saveLagrangianResult(activeSession.id, {
              coeffs: this.bestCandidate.coefficients,
              generation: this.generation,
              fitness: this.bestCandidate.fitness,
              cModel: this.bestCandidate.c_model,
              alphaModel: this.bestCandidate.alpha_model,
              deltaC: this.bestCandidate.delta_c,
              deltaAlpha: this.bestCandidate.delta_alpha,
            });
            console.log(
              `✅ Auto-saved Tab 1 best candidate (gen ${this.generation}, fitness ${this.bestCandidate.fitness.toExponential(3)})`,
            );
          }
        } catch (error) {
          console.warn("⚠️ Tab 1 auto-save failed:", error);
        }
      }
    }, 30000); // 30 seconds

    console.log(
      `Starting GA with population size ${this.parameters.populationSize}`,
    );

    // Run evolution loop with proper async updates
    while (
      this.isRunningFlag &&
      this.generation < this.parameters.maxGenerations
    ) {
      try {
        await this.runGeneration();
        console.log(
          `Completed generation ${this.generation}, best fitness: ${this.bestCandidate?.fitness?.toExponential(3) || "N/A"}`,
        );

        // Check for convergence (disabled to allow full evolution)
        // Continue evolution for full generation count to explore solution space

        // Brief delay to allow WebSocket updates
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`Error in generation ${this.generation}:`, error);
        break;
      }
    }

    // Send final update
    if (this.updateCallback) {
      this.updateCallback({
        generation: this.generation,
        best: this.bestCandidate || undefined,
        topCandidates: this.topCandidates,
        throughput: 0,
        status: "completed",
      });
    }

    this.isRunningFlag = false;
    console.log(`GA completed after ${this.generation} generations`);
  }

  /**
   * Stop the genetic algorithm
   */
  async stop(): Promise<void> {
    console.log("Stopping genetic algorithm...");
    this.isRunningFlag = false;

    // Clean up workers safely
    if (this.workers && Array.isArray(this.workers)) {
      for (const worker of this.workers) {
        try {
          await worker.terminate();
        } catch (error) {
          console.warn("Error terminating worker:", error);
        }
      }
    }
    this.workers = [];
  }

  /**
   * Check if GA is running
   */
  isRunning(): boolean {
    return this.isRunningFlag;
  }

  /**
   * Get current status
   */
  getStatus(): GAUpdate {
    const currentTime = Date.now();
    const elapsedSeconds =
      this.startTime > 0 ? (currentTime - this.startTime) / 1000 : 0;
    const throughput =
      elapsedSeconds > 0 ? this.evaluationCount / elapsedSeconds : 0;

    return {
      generation: this.generation,
      best: this.bestCandidate || undefined,
      topCandidates: this.topCandidates,
      throughput: Math.round(throughput),
      status: this.isRunningFlag ? "running" : "stopped",
    };
  }

  /**
   * Set update callback
   */
  onUpdate(callback: (update: GAUpdate) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Toggle Ultra Mode during runtime
   */
  toggleUltraMode(enabled: boolean): { isActive: boolean; message: string } {
    if (!this.isRunningFlag) {
      return { 
        isActive: this.isUltraModeActive, 
        message: "GA is not running" 
      };
    }

    this.parameters.useUltraMode = enabled;

    if (enabled && !this.isUltraModeActive) {
      // Check if we meet the precision requirements
      const precisionStatus = this.getConstantsPrecisionStatus(this.bestCandidate);
      
      if (!this.bestCandidate) {
        return { 
          isActive: false, 
          message: "No best candidate available yet" 
        };
      }

      if (precisionStatus.a_digits < 5 || precisionStatus.g_digits < 5) {
        return { 
          isActive: false, 
          message: `Ultra Mode requires 5+ digits precision. Current: α=${precisionStatus.a_digits} digits, G=${precisionStatus.g_digits} digits` 
        };
      }

      // Activate Ultra Mode
      console.log("🚀 Manually activating Runmode Ultra");
      this.isUltraModeActive = true;
      
      // Convert population
      this.convertPopulationToUltraMode();
      
      return { 
        isActive: true, 
        message: "Ultra Mode activated successfully" 
      };
    } else if (!enabled && this.isUltraModeActive) {
      // Deactivate Ultra Mode
      console.log("🔄 Deactivating Runmode Ultra");
      this.isUltraModeActive = false;
      
      // Note: We don't revert the population as that would lose progress
      return { 
        isActive: false, 
        message: "Ultra Mode deactivated. Note: Population maintains g_em=c₃ constraint" 
      };
    }

    return { 
      isActive: this.isUltraModeActive, 
      message: this.isUltraModeActive ? "Ultra Mode already active" : "Ultra Mode already inactive" 
    };
  }

  /**
   * Convert population to Ultra Mode constraints
   */
  private convertPopulationToUltraMode(): void {
    if (!this.bestCandidate) return;

    console.log("   Converting population to Ultra mode constraints...");
    console.log(`   Best candidate before: g_em=${this.bestCandidate.coefficients[4].toExponential(3)}, c₃=${this.bestCandidate.coefficients[3].toExponential(3)}`);
    
    let convertedCount = 0;
    for (const individual of this.population) {
      // Simply enforce the constraint - no need for complex adjustments
      const oldGem = individual[4];
      individual[4] = individual[3]; // g_em = c₃
      
      if (Math.abs(oldGem - individual[3]) > 1e-10) {
        convertedCount++;
      }
    }
    
    // Also ensure best candidate follows the constraint
    if (this.bestCandidate) {
      this.bestCandidate.coefficients[4] = this.bestCandidate.coefficients[3];
    }
    
    console.log(`   ✅ Population converted to Ultra mode (${convertedCount}/${this.population.length} individuals modified)`);
  }

  private reseedFromHallOfFame(frac = 0.15, strongMutation = false) {
    if (this.hallOfFame.length === 0) return;
    const n = Math.floor(this.population.length * frac);

    for (let i = 0; i < n; i++) {
        const baseCandidate = this.hallOfFame[i % this.hallOfFame.length];
        const mutant = baseCandidate.coefficients.slice(); // Kopieren

        // ---- NEUE LOGIK START ----
        // Wende eine gezielte, starke Mutation auf diesen alten Champion an,
        // um ihn an die neuen, strengeren Constraints anzupassen.

        // Beispiel: Starke Mutation der Kopplungsgene, um neue Physik zu finden
        const emCouplingIndex = 4;
        const gravCouplingIndex = 5;

        // Stärkere Mutation im Notfallmodus
        const mutationStrength = strongMutation ? 0.5 : 0.1;
        
        // Starke Variation um den bekannten guten Wert
        mutant[emCouplingIndex] += this.gaussianRandom() * mutationStrength * (mutant[emCouplingIndex] || 0.1);
        mutant[gravCouplingIndex] += this.gaussianRandom() * mutationStrength * (mutant[gravCouplingIndex] || 0.1);

        // Auch die Potential-Terme leicht anpassen
        mutant[2] += this.gaussianRandom() * this.mutationSigma; // c₂
        mutant[3] += this.gaussianRandom() * this.mutationSigma; // c₃
        // ---- NEUE LOGIK ENDE ----
        
        // In Ultra mode, enforce g_em = c₃
        if (this.isUltraModeActive) {
          mutant[4] = mutant[3]; // g_em = c₃
        }

        this.population[this.population.length - 1 - i] = mutant;
    }
    console.log(`♻︎ HoF-reseed: ${n} Individuen durch **mutierte Champions** ersetzt`);
}

  /**
   * Check which physics constants have reached their target precision
   * C: needs exact match (299792458)
   * G: needs 5 digits precision  
   * α: optimize to maximum precision
   */
  private getConstantsPrecisionStatus(candidate: Candidate | null): {
    c_solved: boolean;
    g_solved: boolean;
    a_solved: boolean;
    c_digits: number;
    g_digits: number;
    a_digits: number;
  } {
    if (!candidate) {
      return {
        c_solved: false,
        g_solved: false,
        a_solved: false,
        c_digits: 0,
        g_digits: 0,
        a_digits: 0,
      };
    }

    // C is exactly defined, so we need exact match
    const c_exact_match = Math.abs(candidate.c_model - C_TARGET) < 1;
    const c_digits = solvedDigits(candidate.delta_c);
    const c_solved = c_exact_match || c_digits >= 9; // Accept 9 digits as "solved" for C

    // G needs 5 digits precision (as per CODATA uncertainty)
    const g_digits = solvedDigits(candidate.delta_g ?? 1);
    const g_solved = g_digits >= 5;

    // Alpha - we want maximum precision
    const a_digits = solvedDigits(candidate.delta_alpha);
    const a_solved = a_digits >= 14; // Near theoretical limit

    return {
      c_solved,
      g_solved,
      a_solved,
      c_digits,
      g_digits,
      a_digits,
    };
  }
}