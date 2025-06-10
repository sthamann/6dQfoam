/**
 * High-precision evaluator for 20+ digit calculations
 * Uses Python with decimal module for arbitrary precision arithmetic
 */
import { PythonShell } from "python-shell";
import type { Candidate } from "@shared/schema";
import path from "path";
import * as os from "os";
import { cpus } from "os";
export class HighPrecisionEvaluator {
  private static workers: PythonShell[] = [];
  private static workerQueue: number[] = [];
  private static busyWorkers = new Set<number>();
  private static poolSize =
    (os as any).availableParallelism?.() ?? os.cpus().length;
  private static initialized = false;

  /**
   * Initialize high-precision Python worker pool
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log(
      "Initializing high-precision evaluator pool for 20+ digit calculations...",
    );

    try {
      const workerPath = path.join(
        process.cwd(),
        "server/genetic-algorithm/high_precision_worker.py",
      );

      for (let i = 0; i < this.poolSize; i++) {
        const worker = new PythonShell("high_precision_worker.py", {
          mode: "json",
          pythonOptions: ["-u"],
          scriptPath: path.join(process.cwd(), "server/genetic-algorithm"),
          stderrParser: (line) =>
            console.error(`High-precision worker ${i} error:`, line),
        });

        // Test worker precision
        await this.testWorkerPrecision(worker, i);

        this.workers[i] = worker;
        this.workerQueue.push(i);
      }

      this.initialized = true;
      console.log(
        `High-precision evaluator pool initialized with ${this.poolSize} workers`,
      );
    } catch (error) {
      console.error("Failed to initialize high-precision evaluator:", error);
      throw error;
    }
  }

  /**
   * Test worker precision capabilities
   */
  private static async testWorkerPrecision(
    worker: PythonShell,
    workerId: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${workerId} precision test timeout`));
      }, 5000);

      worker.send({ command: "test_precision" });

      const messageHandler = (response: any) => {
        clearTimeout(timeout);
        worker.removeListener("message", messageHandler);

        if (response.precision_digits >= 20) {
          console.log(
            `✓ Worker ${workerId} supports ${response.precision_digits} digit precision`,
          );
          resolve();
        } else {
          reject(
            new Error(
              `Worker ${workerId} insufficient precision: ${response.precision_digits} digits`,
            ),
          );
        }
      };

      worker.on("message", messageHandler);
    });
  }

  /**
   * Evaluate single chromosome with high precision
   */
  static async evaluateChromosome(coefficients: number[], generation: number = 0): Promise<Candidate> {
    if (!this.initialized) {
      await this.initialize();
    }

    const workerId = await this.getAvailableWorker();

    try {
      this.busyWorkers.add(workerId);
      const worker = this.workers[workerId];

      return new Promise<Candidate>((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.removeListener("message", messageHandler);
          this.releaseWorker(workerId);
          reject(new Error("High-precision evaluation timeout"));
        }, 20000); // Longer timeout for high-precision calculations

        worker.send({ command: "evaluate", coefficients, generation });

        const messageHandler = (result: any) => {
          clearTimeout(timeout);
          worker.removeListener("message", messageHandler);
          this.releaseWorker(workerId);

          resolve({
            coefficients: [...coefficients],
            fitness: result.fitness,
            c_model: result.c_model,
            alpha_model: result.alpha_model,
            g_model: result.g_model,
            delta_g: result.delta_g,
            delta_c: result.delta_c,
            delta_alpha: result.delta_alpha,
            generation: generation,
          });
        };

        worker.on("message", messageHandler);
      });
    } catch (error) {
      this.releaseWorker(workerId);
      throw error;
    }
  }

  /**
   * Evaluate population with high precision
   */
  static async evaluatePopulation(
    population: number[][],
    generation: number = 0,
  ): Promise<Candidate[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(
      `Evaluating ${population.length} chromosomes with 20+ digit precision...`,
    );

    const promises = population.map((coefficients) =>
      this.evaluateChromosome(coefficients, generation),
    );

    return Promise.all(promises);
  }

  /**
   * Get available worker
   */
  private static async getAvailableWorker(): Promise<number> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.workerQueue.length > 0) {
          resolve(this.workerQueue.shift()!);
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  /**
   * Release worker back to queue
   */
  private static releaseWorker(workerId: number): void {
    this.busyWorkers.delete(workerId);
    this.workerQueue.push(workerId);
  }

  /**
   * Cleanup workers
   */
  static async dispose(): Promise<void> {
    for (const worker of this.workers) {
      if (worker && worker.childProcess) {
        worker.kill();
      }
    }
    this.workers = [];
    this.workerQueue = [];
    this.busyWorkers.clear();
    this.initialized = false;
  }

  /**
   * Check if candidate meets ultra-high precision criteria
   */
  static isUltraPrecise(candidate: Candidate): boolean {
    return candidate.delta_c < 1e-15 && candidate.delta_alpha < 1e-15;
  }
}
