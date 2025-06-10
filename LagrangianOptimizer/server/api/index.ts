import express from 'express';
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { computationsRouter } from './computations';
import { geneticAlgorithmRouter } from './genetic-algorithm';
import { ga2Router, initGA2WebSocket } from './ga2';
import { sessionsRouter } from './sessions';
import { relativityRouter } from './relativity';
import { theoryRouter } from './theory';
import { anomalyRouter } from './anomaly';

const router = express.Router();

// Mount sub-routers
router.use('/computations', computationsRouter);
router.use('/genetic-algorithm', geneticAlgorithmRouter);
router.use('/ga2', ga2Router);
router.use('/sessions', sessionsRouter);
router.use('/relativity', relativityRouter);
router.use('/theory', theoryRouter);
router.use('/anomaly', anomalyRouter);

// GA-specific routes with WebSocket support
let wsClients: Set<WebSocket> = new Set();

export async function registerRoutes(app: express.Application): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time GA updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Initialize GA2 WebSocket server
  initGA2WebSocket(httpServer);
  
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    wsClients.add(ws);
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      wsClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });
  });

  // Mount the main API router
  app.use('/api', router);
  
  // GA export route
  router.get('/ga/export', async (req, res) => {
    try {
      const { storage } = await import('../core/storage');
      const results = await storage.getLatestResults();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=lagrangian_candidates.json');
      res.json({
        timestamp: new Date().toISOString(),
        target_constants: {
          c_exp: 299792458.0,
          alpha_exp: 0.007297352566,
        },
        operator_catalog: [
          "(∂_t φ)²",
          "(∂_x φ)²", 
          "φ²",
          "(∂_t φ)² φ²",
          "F²_tx"
        ],
        candidates: results
      });
      
    } catch (error) {
      console.error('Error exporting results:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to export results' 
      });
    }
  });

  // Experiments route
  router.get('/experiments', async (req, res) => {
    try {
      const { storage } = await import('../core/storage');
      const experiments = await storage.getExperiments();
      res.json(experiments);
    } catch (error) {
      console.error('Error fetching experiments:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch experiments' });
    }
  });

  // Session-specific routes
  router.get('/sessions/:sessionId/test-dependencies/:testName', async (req, res) => {
    try {
      const { sessionId, testName } = req.params;
      const { storage } = await import('../core/storage');
      
      const dependencyCheck = await storage.checkTestDependencies(sessionId, testName);
      
      res.json({
        success: true,
        ...dependencyCheck
      });
      
    } catch (error) {
      console.error(`Error checking dependencies for ${req.params.testName}:`, error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.get('/sessions/:sessionId/operators/:testName', async (req, res) => {
    try {
      const { sessionId, testName } = req.params;
      const { storage } = await import('../core/storage');
      
      const operators = await storage.getOperatorsFromTest(sessionId, testName);
      
      res.json({
        success: true,
        operators: operators || []
      });
      
    } catch (error) {
      console.error(`Error getting operators from ${req.params.testName}:`, error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test endpoint for debugging operator retrieval
  router.get('/sessions/:sessionId/debug/operators', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { storage } = await import('../core/storage');
      
      // Get all test results for the session
      const allTests = await storage.getTestResults(sessionId);
      const reduce6dTest = allTests.find(t => t.name === 'reduce_6d_to_4d');
      
      res.json({
        success: true,
        debug: {
          totalTests: allTests.length,
          testNames: allTests.map(t => t.name),
          reduce6dTestFound: !!reduce6dTest,
          reduce6dResult: reduce6dTest?.resultJson || null,
          operators: (reduce6dTest?.resultJson as any)?.operators || []
        }
      });
      
    } catch (error) {
      console.error('Error in debug endpoint:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.get('/sessions/:sessionId/test-results', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { storage } = await import('../core/storage');
      
      const testResults = await storage.getTestResults(sessionId);
      
      res.json({
        success: true,
        results: testResults
      });
      
    } catch (error) {
      console.error(`Error getting test results for session ${req.params.sessionId}:`, error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return httpServer;
}