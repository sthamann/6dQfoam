import express from 'express';
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { computationsRouter } from '../api/computations';
import { geneticAlgorithmRouter } from '../api/genetic-algorithm';
import { ga2Router, initGA2WebSocket } from '../api/ga2';
import { sessionsRouter } from '../api/sessions';
import { theoryRouter } from '../api/theory';
import { relativityRouter } from '../api/relativity';
import { anomalyRouter } from '../api/anomaly';
import { diagnosticsRouter } from '../api/diagnostics';
import { physicsHealthRouter } from '../api/physics-health';

let wsClients: Set<WebSocket> = new Set();

// Broadcast update to all connected clients
export function broadcastUpdate(update: any) {
  const message = JSON.stringify(update);
  console.log(`Broadcasting to ${wsClients.size} clients:`, update.generation ? `Gen ${update.generation}, Status ${update.status}` : 'Initial message');
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    } else {
      console.log('Removing disconnected WebSocket client');
      wsClients.delete(ws);
    }
  });
}

export async function registerRoutes(app: express.Application): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time GA updates (Tab 1)
  const wssGA1 = new WebSocketServer({ noServer: true });
  
  // Initialize GA2 WebSocket server (Tab 2)
  const wssGA2 = initGA2WebSocket(httpServer);
  
  // Handle WebSocket upgrade requests manually
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = request.url;

    if (pathname === '/ws/ga2') {
      wssGA2.handleUpgrade(request, socket, head, (ws) => {
        wssGA2.emit('connection', ws, request);
      });
    } else if (pathname === '/ws') {
      wssGA1.handleUpgrade(request, socket, head, (ws) => {
        wssGA1.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });
  
  wssGA1.on('connection', (ws) => {
    console.log('Client connected to WebSocket (GA1)');
    wsClients.add(ws);
    
    // Handle ping/pong for keepalive
    ws.on('message', (message) => {
      if (message.toString() === '__ping__') {
        ws.send('__pong__');
      }
    });
    
    // Send initial status
    ws.send(JSON.stringify({
      generation: 0,
      topCandidates: [],
      throughput: 0,
      status: "stopped"
    }));
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket (GA1)');
      wsClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error (GA1):', error);
      wsClients.delete(ws);
    });
  });

  // API routes
  app.use('/api/computations', computationsRouter);
  app.use('/api/genetic-algorithm', geneticAlgorithmRouter);
  app.use('/api/ga2', ga2Router);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/theory', theoryRouter);
  app.use('/api/relativity', relativityRouter);
  app.use('/api/anomaly', anomalyRouter);
  app.use('/api/diagnostics', diagnosticsRouter);
  app.use('/api/physics-health', physicsHealthRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      server: 'physics-simulation-platform'
    });
  });

  return httpServer;
}