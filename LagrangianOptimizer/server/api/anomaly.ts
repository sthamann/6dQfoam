import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';

const router = express.Router();

// Get default representations
router.get("/default-reps", async (req, res) => {
  try {
    const fallbackPath = path.join(process.cwd(), "public/examples/sm6d.json");
    
    try {
      await fs.access(fallbackPath);
      const raw = await fs.readFile(fallbackPath, "utf8");
      res.json(JSON.parse(raw));
    } catch {
      res.status(404).json({ success: false, message: "Default reps not found" });
    }
  } catch (error) {
    console.error('Error loading default reps:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Get saved representations
router.get("/reps", async (req, res) => {
  try {
    const repsPath = path.join(process.cwd(), "data", "reps.json");
    
    try {
      await fs.access(repsPath);
      const raw = await fs.readFile(repsPath, "utf8");
      res.json(JSON.parse(raw));
    } catch {
      res.status(404).json({ success: false, message: "No reps found" });
    }
  } catch (error) {
    console.error('Error loading reps:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

// Save representations
router.post("/reps", async (req, res) => {
  try {
    const { anomalyScanPayload } = await import('@shared/schema');
    
    // Validate request body
    anomalyScanPayload.parse(req.body);
    
    const repsPath = path.join(process.cwd(), "data", "reps.json");
    
    // Ensure data directory exists
    await fs.mkdir(path.dirname(repsPath), { recursive: true });
    
    await fs.writeFile(repsPath, JSON.stringify(req.body.reps, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving reps:', error);
    res.status(400).json({ success: false, error: String(error) });
  }
});

export { router as anomalyRouter };