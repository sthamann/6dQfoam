import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import type { GAParameters, GAUpdate } from '@shared/schema';
import { GeneticAlgorithm } from '../genetic-algorithm2/ga';

const router = Router();

// Store active GA instance
let gaInstance: GeneticAlgorithm | null = null;
let wsClients: Set<WebSocket> = new Set();

// Initialize WebSocket server for GA2 updates
export function initGA2WebSocket(server: any): WebSocketServer {
  console.log('Initializing GA2 WebSocket server on path /ws/ga2');
  
  const wss = new WebSocketServer({ 
    noServer: true, // We will handle the upgrade manually
  });

  console.log('GA2 WebSocket server created');

  wss.on('connection', (ws) => {
    console.log('GA2 WebSocket client connected');
    wsClients.add(ws);

    // Handle ping/pong for keepalive
    ws.on('message', (message) => {
      if (message.toString() === '__ping__') {
        ws.send('__pong__');
      }
    });

    ws.on('close', () => {
      console.log('GA2 WebSocket client disconnected');
      wsClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('GA2 WebSocket error:', error);
      wsClients.delete(ws);
    });

    // Send current status if GA is running
    if (gaInstance && gaInstance.isRunning()) {
      ws.send(JSON.stringify(gaInstance.getStatus()));
    }
  });

  return wss;
}

// Broadcast update to all connected clients
function broadcastUpdate(update: GAUpdate) {
  console.log(`GA2 Broadcasting to ${wsClients.size} clients:`, {
    generation: update.generation,
    fitness: update.best?.fitness,
    status: update.status
  });
  
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(update));
      } catch (error) {
        console.error('GA2 WebSocket send error:', error);
      }
    }
  });
}

// Start GA2
router.post('/start', async (req, res) => {
  try {
    const params: GAParameters = req.body;

    if (gaInstance && gaInstance.isRunning()) {
      return res.status(400).json({ error: 'GA2 is already running' });
    }

    // Create new GA instance with physics-based model
    gaInstance = new GeneticAlgorithm(params);

    // Set up update listener using EventEmitter pattern
    gaInstance.on('update', (update) => {
      broadcastUpdate(update);
    });

    // Also set up callback for backwards compatibility
    gaInstance.onUpdate((update) => {
      // This is redundant but ensures updates are sent
      console.log('GA2 update callback fired:', {
        generation: update.generation,
        status: update.status
      });
    });

    // Start the GA
    gaInstance.start().catch((error) => {
      console.error('GA2 runtime error:', error);
    });

    res.json({ success: true, message: 'GA2 started successfully' });
  } catch (error) {
    console.error('Failed to start GA2:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Stop GA2
router.post('/stop', async (req, res) => {
  try {
    if (!gaInstance || !gaInstance.isRunning()) {
      return res.status(400).json({ error: 'GA2 is not running' });
    }

    await gaInstance.stop();
    gaInstance = null;

    res.json({ success: true, message: 'GA2 stopped successfully' });
  } catch (error) {
    console.error('Failed to stop GA2:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get GA2 status
router.get('/status', (req, res) => {
  if (!gaInstance) {
    return res.json({ 
      running: false,
      message: 'GA2 not initialized'
    });
  }

  const status = gaInstance.getStatus();
  res.json({
    running: gaInstance.isRunning(),
    ...status
  });
});

// Toggle Ultra Mode during runtime
router.post('/toggle-ultra-mode', (req, res) => {
  try {
    if (!gaInstance || !gaInstance.isRunning()) {
      return res.status(400).json({ error: 'GA2 is not running' });
    }

    const { enabled } = req.body;
    const result = gaInstance.toggleUltraMode(enabled);
    
    res.json({ 
      success: true, 
      ultraModeActive: result.isActive,
      message: result.message 
    });
  } catch (error) {
    console.error('Failed to toggle Ultra Mode:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Export GA2 results
router.get('/export', (req, res) => {
  if (!gaInstance) {
    return res.status(400).json({ error: 'GA2 not initialized' });
  }

  const status = gaInstance.getStatus();
  const exportData = {
    timestamp: new Date().toISOString(),
    generation: status.generation,
    best: status.best,
    topCandidates: status.topCandidates,
    physicsModel: 'unified_field_theory_with_vev',
    operators: [
      "(∂_t φ)²",
      "(∂_x φ)²", 
      "φ²",
      "(∂_t φ)² φ²",
      "g_em",
      "ξ"
    ]
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=physics-ga-results-gen${status.generation}.json`);
  res.json(exportData);
});

export const ga2Router = router; 