import express from "express";
import { runLorentzCheck } from "../computations/tab2_foam-bridge";
import { computeGNewton } from "../computations/tab2_gravity-bridge";
import { storage } from "../core/storage";
import { spawn } from "child_process";
import path from "path";

const router = express.Router();

// Use the Python interpreter from the virtual environment
const PYTHON_EXECUTABLE = path.join(process.cwd(), ".venv", "bin", "python3");

// Lorentz isotropy check
router.post("/lorentz-check", async (req, res) => {
  try {
    const { coeffs } = req.body;

    // ----------------------------------------------------------
    // ❶ Eingabe prüfen: 5 (klassisch) ODER 6 (GA-Chromosom)
    // ----------------------------------------------------------
    if (
      !Array.isArray(coeffs) ||
      (coeffs.length !== 5 && coeffs.length !== 6)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid coefficients array" });
    }

    const activeSession = await storage.getActiveSession();
    if (!activeSession) {
      return res
        .status(400)
        .json({ success: false, message: "No active session found." });
    }
    const latestRun = await storage.getLatestRunForSession(activeSession.id);
    if (!latestRun) {
      return res.status(400).json({
        success: false,
        message: "No runs found in active session to test.",
      });
    }

    const startTime = Date.now();
    // ----------------------------------------------------------
    // ❷ GA-Vector (6) → Tensor-Vector (5)
    //    yy = zz = xx   und   d_xy = 0
    // ----------------------------------------------------------
    const lorentzCoeffs =
      coeffs.length === 6
        ? [coeffs[0], coeffs[1], coeffs[1], coeffs[1], 0.0]
        : coeffs;

    const epsilon = await runLorentzCheck({ coeffs: lorentzCoeffs });
    const runtime = Date.now() - startTime;

    const result = {
      success: true,
      epsilon,
      interpretation:
        epsilon < 1e-6 ? "excellent" : epsilon < 1e-3 ? "good" : "poor",
    };

    await storage.createTestResult({
      runId: latestRun.id,
      name: "lorentz-check",
      success: true,
      runtimeMs: runtime,
      resultJson: result,
    });

    res.json(result);
  } catch (error) {
    console.error("Lorentz check failed:", error);
    res.status(500).json({
      success: false,
      message: `Lorentz analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
});

// Gravity zero mode computation
router.post("/gravity-zero", async (req, res) => {
  try {
    const { coeffs } = req.body;

    if (
      !Array.isArray(coeffs) ||
      (coeffs.length !== 5 && coeffs.length !== 6)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid coefficients array" });
    }

    const activeSession = await storage.getActiveSession();
    if (!activeSession) {
      return res
        .status(400)
        .json({ success: false, message: "No active session found." });
    }
    const latestRun = await storage.getLatestRunForSession(activeSession.id);
    if (!latestRun) {
      return res.status(400).json({
        success: false,
        message: "No runs found in active session to test.",
      });
    }

    const startTime = Date.now();
    const mapped =
      coeffs.length === 6
        ? [coeffs[0], coeffs[1], coeffs[1], coeffs[1], 0.0]
        : coeffs;
    const result = await computeGNewton({ coeffs: mapped });
    const runtime = Date.now() - startTime;

    await storage.createTestResult({
      runId: latestRun.id,
      name: "gravity-zero",
      success: true,
      runtimeMs: runtime,
      resultJson: result,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Gravity zero mode calculation failed:", error);
    res.status(500).json({
      success: false,
      message: `Gravity calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
});

// Foam3D test endpoint
router.post("/foam3d", async (req, res) => {
  try {
    const { coeffs } = req.body;

    if (
      !Array.isArray(coeffs) ||
      (coeffs.length !== 5 && coeffs.length !== 6)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid coefficients array" });
    }

    const activeSession = await storage.getActiveSession();
    if (!activeSession) {
      return res
        .status(400)
        .json({ success: false, message: "No active session found." });
    }
    const latestRun = await storage.getLatestRunForSession(activeSession.id);
    if (!latestRun) {
      return res.status(400).json({
        success: false,
        message: "No runs found in active session to test.",
      });
    }

    const startTime = Date.now();
    const mapped =
      coeffs.length === 6
        ? [coeffs[0], coeffs[1], coeffs[1], coeffs[1], 0.0]
        : coeffs;

    // Run the foam3d computation using the worker script
    const python = spawn(PYTHON_EXECUTABLE, ["./server/computations/foam-3d/worker.py", JSON.stringify({ coeffs: mapped })]);
    
    let stdout = "";
    let error = "";

    python.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    python.stderr.on("data", (data: Buffer) => {
      error += data.toString();
    });

    python.on("close", async (code: number) => {
      const runtime = Date.now() - startTime;
      
      if (code !== 0) {
        console.error(`Foam3D computation failed: ${error}`);
        return res.status(500).json({
          success: false,
          message: `Foam3D computation failed: ${error || "Unknown error"}`,
        });
      }

      try {
        const result = JSON.parse(stdout.trim());
        
        await storage.createTestResult({
          runId: latestRun.id,
          name: "foam3d",
          success: true,
          runtimeMs: runtime,
          resultJson: result,
        });

        res.json({ success: true, ...result, runtime });
      } catch (parseError) {
        console.error("Failed to parse foam3d output:", parseError);
        res.status(500).json({
          success: false,
          message: `Failed to parse computation output: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        });
      }
    });

    python.on("error", (err) => {
      console.error("Failed to spawn foam3d process:", err);
      res.status(500).json({
        success: false,
        message: `Failed to run computation: ${err.message}`,
      });
    });
    
  } catch (error) {
    console.error("Foam3D test failed:", error);
    res.status(500).json({
      success: false,
      message: `Foam3D test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
});

export { router as relativityRouter };
