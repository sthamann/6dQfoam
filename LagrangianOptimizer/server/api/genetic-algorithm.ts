import express from "express";
import { GeneticAlgorithm } from "../genetic-algorithm/index";
import { broadcastUpdate } from "../core"; // Corrected import path

import type { GAParameters } from "@shared/schema";

const router = express.Router();
let currentGA: GeneticAlgorithm | null = null;

// Start genetic algorithm
router.post("/start", async (req, res) => {
  try {
    if (currentGA && currentGA.isRunning()) {
      return res.status(400).json({
        success: false,
        error: "Genetic algorithm is already running",
      });
    }

    const parameters: GAParameters = {
      ...req.body,
      mutationRate: req.body.mutationRate || 0.25, // Increased default mutation rate
      workerThreads: req.body.workerThreads || 4, // Use 4 workers for parallelization
      mutationRateGauge: req.body.mutationRateGauge ?? 0.2,
      mutationSigmaGauge: req.body.mutationSigmaGauge ?? 0.02,
      gaugeRange: req.body.gaugeRange ?? 0.15, //  <<< NEU
    };
    currentGA = new GeneticAlgorithm(parameters);

    // Set up real-time update broadcasting via WebSocket
    currentGA.onUpdate((update) => {
      console.log(
        `Broadcasting GA update: Generation ${update.generation}, Status: ${update.status}`,
      );
      broadcastUpdate(update);
    });

    // Also listen for event-based updates
    currentGA.on("update", (update) => {
      console.log(
        `Event-based GA update: Generation ${update.generation}, Status: ${update.status}`,
      );
      broadcastUpdate(update);
    });

    // Start GA in background to avoid blocking response
    currentGA.start().catch((error) => {
      console.error("GA execution error:", error);
      broadcastUpdate({
        generation: 0,
        bestFitness: Infinity,
        averageFitness: Infinity,
        stagnation: 0,
        topCandidates: [],
        throughput: 0,
        status: "stopped",
        error: error.message,
      });
    });

    res.json({
      success: true,
      message: "Genetic algorithm started",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Stop genetic algorithm
router.post("/stop", (req, res) => {
  try {
    if (currentGA) {
      currentGA.stop();
      res.json({
        success: true,
        message: "Genetic algorithm stopped",
      });
    } else {
      res.status(400).json({
        success: false,
        error: "No genetic algorithm is running",
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Force population reset with unconstrained coefficients
router.post("/force-reset", async (req, res) => {
  try {
    if (!currentGA) {
      return res.status(400).json({
        success: false,
        error: "No genetic algorithm is running",
      });
    }

    await currentGA.forceUnconstrainedReset();
    res.json({ success: true, message: "Population reset with unconstrained coefficients" });
  } catch (error) {
    console.error("Error forcing reset:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get genetic algorithm status
router.get("/status", (req, res) => {
  try {
    if (currentGA) {
      res.json({
        success: true,
        status: currentGA.getStatus(),
      });
    } else {
      res.json({
        success: true,
        status: {
          generation: 0,
          bestFitness: Infinity,
          averageFitness: Infinity,
          stagnation: 0,
          topCandidates: [],
          throughput: 0,
          status: "stopped",
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Export genetic algorithm results
router.get("/export", async (req, res) => {
  try {
    const { storage } = await import("../core/storage");
    const activeSession = await storage.getActiveSession();
    const results = activeSession
      ? await storage.getRunsForSession(activeSession.id)
      : [];

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=lagrangian_candidates.json",
    );
    res.json({
      timestamp: new Date().toISOString(),
      target_constants: {
        c_exp: 299792458.0,
        alpha_exp: 0.007297352566,
      },
      operator_catalog: ["(∂_t φ)²", "(∂_x φ)²", "φ²", "(∂_t φ)² φ²", "F²_tx"],
      candidates: results,
    });
  } catch (error) {
    console.error("Error exporting results:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export results",
    });
  }
});

export { router as geneticAlgorithmRouter };
