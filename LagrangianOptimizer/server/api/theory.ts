import express from "express";
import { spawn } from "child_process";
import { storage } from "../core/storage";
import { generateMarkdownReport } from "../utils/markdown";
import { anomalyScanPayload } from "@shared/schema";
import path from "path";

const router = express.Router();

// Use the Python interpreter from the virtual environment
const PYTHON_EXECUTABLE = path.join(process.cwd(), ".venv", "bin", "python3");

// Helper function to execute a python script and save the result as a test
const executeAndSaveTest = async (
  res: express.Response,
  testName: string,
  scriptPath: string,
  payload: any,
  getSuccess: (result: any) => boolean = (result) => result.success,
) => {
  try {
    const activeSession = await storage.getActiveSession();
    if (!activeSession) {
      return res
        .status(400)
        .json({ success: false, error: "No active session found." });
    }
    const latestRun = await storage.getLatestRunForSession(activeSession.id);
    if (!latestRun) {
      return res
        .status(400)
        .json({
          success: false,
          error: "No runs found in the active session to test.",
        });
    }

    const startTime = Date.now();
    const python = spawn(PYTHON_EXECUTABLE, [scriptPath, JSON.stringify(payload)]);

    let output = "";
    let error = "";

    python.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });
    python.stderr.on("data", (data: Buffer) => {
      error += data.toString();
    });

    python.on("close", async (code: number) => {
      const runtime = Date.now() - startTime;
      if (code !== 0) {
        console.error(`Python script ${scriptPath} failed: ${error}`);
        return res
          .status(500)
          .json({
            success: false,
            error: `Python script failed: ${error || "Unknown error"}`,
          });
      }

      try {
        const result = JSON.parse(output.trim());

        await storage.createTestResult({
          runId: latestRun.id,
          name: testName,
          success: getSuccess(result),
          runtimeMs: runtime,
          resultJson: result,
        });

        await generateMarkdownReport(testName, { ...payload, result, runtime });

        res.json({ ...result, runtime });
      } catch (e) {
        console.error(`Error processing result from ${scriptPath}:`, e);
        res
          .status(500)
          .json({
            success: false,
            error: `Failed to process script output: ${e instanceof Error ? e.message : "Unknown error"}`,
          });
      }
    });
  } catch (e) {
    console.error(`Error running test ${testName}:`, e);
    res
      .status(500)
      .json({
        success: false,
        error: `Failed to run test: ${e instanceof Error ? e.message : "Unknown error"}`,
      });
  }
};

// --- ROUTES ---

router.post("/reduce", async (req, res) => {
  const { coeffs, psi0 } = req.body;
  if (!coeffs || !Array.isArray(coeffs) || !psi0) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Invalid payload: `coeffs` and `psi0` are required.",
      });
  }
  await executeAndSaveTest(
    res,
    "reduce_6d_to_4d",
    "./server/computations/reduce-6d-to-4d/worker.py",
    { coeffs, psi0 },
  );
});

router.post("/rgflow", async (req, res) => {
  const { operators } = req.body;
  if (!operators || !Array.isArray(operators)) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Invalid payload: `operators` array is required.",
      });
  }
  await executeAndSaveTest(
    res,
    "rg_flow",
    "./server/computations/rg-flow/worker.py",
    { operators },
  );
});

router.post("/stability", async (req, res) => {
  const { coeffs } = req.body;
  if (!coeffs || !Array.isArray(coeffs)) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Invalid payload: `coeffs` array is required.",
      });
  }
  await executeAndSaveTest(
    res,
    "stability_test",
    "./server/computations/stability-test/worker.py",
    { coeffs },
    (result) => result.passed,
  );
});

router.post("/beta2loop", async (req, res) => {
  const { operators } = req.body;
  if (!operators || !Array.isArray(operators)) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Invalid payload: `operators` array is required.",
      });
  }
  await executeAndSaveTest(
    res,
    "beta_2_loop",
    "./server/computations/beta-2-loop/worker.py",
    { operators },
    (result) => result.convergent,
  );
});

router.post("/anomaly", async (req, res) => {
  try {
    const payload = anomalyScanPayload.parse(req.body);
    await executeAndSaveTest(
      res,
      "anomaly_scan",
      "./server/computations/anomaly-scan/worker.py",
      payload,
      (result) => result.anomalies_cancelled,
    );
  } catch (error) {
    res.status(400).json({ success: false, error: String(error) });
  }
});

router.post("/global", async (req, res) => {
  const { reps, generations } = req.body;
  if (!Array.isArray(reps)) {
    return res
      .status(400)
      .json({ success: false, error: "Missing `reps` array." });
  }
  await executeAndSaveTest(
    res,
    "global_anomaly",
    "./server/computations/global-anomaly/worker.py",
    { reps, generations },
    (result) => result.passed,
  );
});

router.post("/ghost", async (req, res) => {
  const { operators } = req.body;
  if (!operators || !Array.isArray(operators)) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Invalid payload: `operators` array is required.",
      });
  }
  await executeAndSaveTest(
    res,
    "ghost_scan",
    "./server/computations/ghost-scan/worker.py",
    { operators },
    (result) => result.is_healthy,
  );
});

router.post("/inflation", async (req, res) => {
  const { operators } = req.body;
  if (!operators || !Array.isArray(operators)) {
    return res
      .status(400)
      .json({
        success: false,
        error: "Invalid payload: `operators` array is required.",
      });
  }
  await executeAndSaveTest(
    res,
    "inflation_fit",
    "./server/computations/inflation-fit/worker.py",
    { operators },
    (result) => result.planck_compatible,
  );
});

// New routes for additional tests (10-19)

router.post("/sensitivity-heatmap", async (req, res) => {
  const { coeffs } = req.body;
  if (!coeffs || !Array.isArray(coeffs)) {
    return res.status(400).json({
      success: false,
      error: "Invalid payload: `coeffs` array is required.",
    });
  }
  await executeAndSaveTest(
    res,
    "sensitivity_heatmap",
    "./server/computations/sensitivity-heatmap/worker.py",
    { coeffs, n_samples: 10000 },
    (result) => result.is_robust,
  );
});

router.post("/lyapunov-spectrum", async (req, res) => {
  const { coeffs } = req.body;
  if (!coeffs || !Array.isArray(coeffs)) {
    return res.status(400).json({
      success: false,
      error: "Invalid payload: `coeffs` array is required.",
    });
  }
  await executeAndSaveTest(
    res,
    "lyapunov_spectrum",
    "./server/computations/lyapunov-spectrum/worker.py",
    { coeffs },
    (result) => result.is_stable,
  );
});

router.post("/auto-rg-3loop", async (req, res) => {
  const { operators, coeffs } = req.body;
  if (!operators || !Array.isArray(operators)) {
    return res.status(400).json({
      success: false,
      error: "Invalid payload: `operators` array is required.",
    });
  }
  await executeAndSaveTest(
    res,
    "auto_rg_3loop",
    "./server/computations/auto-rg-3loop/worker.py",
    { operators, coeffs },
    (result) => result.is_convergent && result.fixed_point_stable,
  );
});

router.post("/positivity-unitarity", async (req, res) => {
  const { operators, coeffs } = req.body;
  if (!operators || !Array.isArray(operators)) {
    return res.status(400).json({
      success: false,
      error: "Invalid payload: `operators` array is required.",
    });
  }
  await executeAndSaveTest(
    res,
    "positivity_unitarity",
    "./server/computations/positivity-unitarity/worker.py",
    { operators, coeffs },
    (result) => result.all_bounds_satisfied,
  );
});

router.post("/finite-t-phase", async (req, res) => {
  const { coeffs, operators } = req.body;
  if (!coeffs || !Array.isArray(coeffs)) {
    return res.status(400).json({
      success: false,
      error: "Invalid payload: `coeffs` array is required.",
    });
  }
  await executeAndSaveTest(
    res,
    "finite_t_phase",
    "./server/computations/finite-t-phase/worker.py",
    { coeffs, operators },
    (result) => result.graceful_exit,
  );
});

router.post("/noise-robustness", async (req, res) => {
  const { coeffs, noise_level } = req.body;
  if (!coeffs || !Array.isArray(coeffs)) {
    return res.status(400).json({
      success: false,
      error: "Invalid payload: `coeffs` array is required.",
    });
  }
  await executeAndSaveTest(
    res,
    "noise_robustness",
    "./server/computations/noise-robustness/worker.py",
    { coeffs, noise_level: noise_level || 0.001 },
    (result) => result.signal_noise_ratio > 10000,
  );
});

router.post("/parameter-inference", async (req, res) => {
  const { coeffs, operators } = req.body;
  if (!coeffs || !Array.isArray(coeffs)) {
    return res.status(400).json({
      success: false,
      error: "Invalid payload: `coeffs` array is required.",
    });
  }
  await executeAndSaveTest(
    res,
    "parameter_inference",
    "./server/computations/parameter-inference/worker.py",
    { coeffs, operators },
    (result) => result.posterior_compatible,
  );
});

router.post("/surrogate-model", async (req, res) => {
  const { training_data, test_data } = req.body;
  if (!training_data) {
    return res.status(400).json({
      success: false,
      error: "Invalid payload: `training_data` is required.",
    });
  }
  await executeAndSaveTest(
    res,
    "surrogate_model",
    "./server/computations/surrogate-model/worker.py",
    { training_data, test_data },
    (result) => result.rmse < 0.001,
  );
});

router.post("/vacuum-decay", async (req, res) => {
  const { coeffs, operators } = req.body;
  if (!coeffs || !Array.isArray(coeffs)) {
    return res.status(400).json({
      success: false,
      error: "Invalid payload: `coeffs` array is required.",
    });
  }
  await executeAndSaveTest(
    res,
    "vacuum_decay",
    "./server/computations/vacuum-decay/worker.py",
    { coeffs, operators },
    (result) => result.universe_stable,
  );
});

router.post("/einstein-boltzmann", async (req, res) => {
  const { coeffs, operators } = req.body;
  if (!coeffs || !Array.isArray(coeffs)) {
    return res.status(400).json({
      success: false,
      error: "Invalid payload: `coeffs` array is required.",
    });
  }
  await executeAndSaveTest(
    res,
    "einstein_boltzmann",
    "./server/computations/einstein-boltzmann/worker.py",
    { coeffs, operators },
    (result) => result.cmb_compatible,
  );
});

export { router as theoryRouter };
