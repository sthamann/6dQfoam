import express from 'express';
import { storage } from '../core/storage';

const router = express.Router();

// Get all sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await storage.getAllSessions();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get active session
router.get('/active', async (req, res) => {
  try {
    const session = await storage.getActiveSession();
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({
        success: false,
        error: 'No active session found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new session
router.post('/', async (req, res) => {
  try {
    const session = await storage.createSession(req.body);
    res.json(session);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get session by ID
router.get('/:id', async (req, res) => {
  try {
    const session = await storage.getSession(req.params.id);
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update session
router.patch('/:id', async (req, res) => {
  try {
    const session = await storage.updateSession(req.params.id, req.body);
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete session
router.delete('/:id', async (req, res) => {
  try {
    const success = await storage.deleteSession(req.params.id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Set active session
router.post('/:id/activate', async (req, res) => {
  try {
    await storage.setActiveSession(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get runs for session
router.get('/:id/runs', async (req, res) => {
  try {
    const runs = await storage.getRunsForSession(req.params.id);
    res.json(runs);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save lagrangian results to session
router.post('/:id/lagrangian-results', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const {
      coefficients,
      generation,
      fitness,
      cModel,
      alphaModel,
      gModel,
      deltaC,
      deltaAlpha,
      deltaG,
      isManual
    } = req.body;

    const savedRun = await storage.saveLagrangianResult(sessionId, {
      coeffs: JSON.parse(coefficients),
      generation: parseInt(generation),
      fitness: parseFloat(fitness),
      cModel: parseFloat(cModel),
      alphaModel: parseFloat(alphaModel),
      gModel: parseFloat(gModel),
      deltaC: parseFloat(deltaC),
      deltaAlpha: parseFloat(deltaAlpha),
      deltaG: parseFloat(deltaG)
    });

    res.json(savedRun);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get lagrangian results for session
router.get('/:id/lagrangian-results', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const runs = await storage.getRunsForSession(sessionId);
    
    // Transform runs to match the expected format
    const results = runs.map(run => ({
      id: run.id,
      coefficients: run.coeffs,
      generation: run.generation,
      fitness: run.fitness,
      c_model: run.cModel,
      alpha_model: run.alphaModel,
      g_model: run.gModel,
      delta_c: run.deltaC,
      delta_alpha: run.deltaAlpha,
      delta_g: run.deltaG,
      isPinned: run.isPinned,
      pinnedAt: run.pinnedAt,
      createdAt: run.createdAt
    }));
    
    res.json(results);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get pinned equations for session
router.get('/:id/pinned', async (req, res) => {
  try {
    const pinnedEquations = await storage.getPinnedEquations(req.params.id);
    res.json(pinnedEquations);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Pin an equation
router.post('/:sessionId/pin/:runId', async (req, res) => {
  try {
    const pinnedRun = await storage.pinEquation(req.params.runId);
    res.json({ success: true, run: pinnedRun });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Unpin an equation
router.delete('/:sessionId/pin/:runId', async (req, res) => {
  try {
    const unpinnedRun = await storage.unpinEquation(req.params.runId);
    res.json({ success: true, run: unpinnedRun });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save relativity results to session
router.post('/:id/relativity-results', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const {
      coefficients,
      formulaText,
      lorentzEpsilon,
      newtonConstant,
      psi0Profile,
      isManual
    } = req.body;

    const savedResult = await storage.saveRelativityResult(sessionId, {
      coefficients,
      formulaText,
      lorentzEpsilon,
      newtonConstant,
      psi0Profile,
      isManual: isManual || false
    });

    res.json(savedResult);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get relativity results for session
router.get('/:id/relativity-results', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const results = await storage.getRelativityResults(sessionId);
    res.json(results);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save unified theory results to session
router.post('/:id/theory-results', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { runId, ...data } = req.body;
    const savedResult = await storage.saveTheoryResult(sessionId, data, runId);
    res.json(savedResult);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get unified theory results for session
router.get('/:id/theory-results', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const results = await storage.getTheoryResults(sessionId);
    res.json(results);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get important parameters for session
router.get('/:id/parameters', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const params = await storage.getParametersForSession(sessionId);
    res.json(params);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Save test result from Tab 3
router.post('/:id/test-results', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { testName, testResult, runtime, coefficients, runId } = req.body;

    let run;
    
    if (runId) {
      // Use existing run ID instead of creating a new one
      run = await storage.getRunById(runId);
      if (!run) {
        throw new Error(`Run with ID ${runId} not found`);
      }
    } else {
      // Create a run for this test (legacy behavior)
      // First get or create a run for these coefficients
      const coeffs = coefficients ? JSON.parse(coefficients) : [0, 0, 0, 0, 0];
      const normalizedCoeffs = coeffs.length === 5 ? [...coeffs, 0.001] : coeffs;
      
      run = await storage.createRun({
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
    }

    // Save the test result
    const result = JSON.parse(testResult);
    const test = await storage.createTestResult({
      runId: run.id,
      name: testName,
      success: result.success || result.passed || true,
      runtimeMs: runtime,
      resultJson: result
    });

    res.json({ success: true, test });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as sessionsRouter };