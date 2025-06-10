import express from 'express';
import { computeGravityZero } from '../computations/gravity-zero';
import { computeFoam3d } from '../computations/foam-3d';
import { computeAnomalyScan } from '../computations/anomaly-scan';
import { OptimizedLagrangianEvaluator } from '../genetic-algorithm/lagrangian-optimized';
import { ReportGenerator } from '../utils/report-generator';

const router = express.Router();

// Gravity zero mode computation
router.post('/gravity-zero', async (req, res) => {
  try {
    const result = await computeGravityZero(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Lorentz isotropy check (foam 3D)
router.post('/lorentz-check', async (req, res) => {
  try {
    const result = await computeFoam3d(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Anomaly scan computation
router.post('/anomaly-scan', async (req, res) => {
  try {
    const result = await computeAnomalyScan(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Lagrangian evaluation endpoint for testing
router.post('/lagrangian/evaluate', async (req, res) => {
  try {
    const { coefficients } = req.body;
    const result = OptimizedLagrangianEvaluator.evaluateChromosomeJS(coefficients);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Download report endpoint
router.get('/download-report/:testType', async (req, res) => {
  try {
    const { testType } = req.params;
    const { coefficients, results, sessionId, equation, c_model, alpha_model } = req.query;
    
    console.log('Download report endpoint called:', {
      testType,
      hasCoefficients: !!coefficients,
      hasResults: !!results,
      queryKeys: Object.keys(req.query)
    });
    
    if (!coefficients || !results) {
      return res.status(400).json({ error: 'Missing coefficients or results' });
    }
    
    // Validate test type
    if (testType !== 'lorentz_isotropy' && testType !== 'spin2_zero') {
      console.error(`Invalid test type received: "${testType}"`);
      return res.status(400).json({ error: `Invalid test type: ${testType}` });
    }
    
    let parsedCoeffs, parsedResults;
    try {
      parsedCoeffs = JSON.parse(coefficients as string);
      parsedResults = JSON.parse(results as string);
      console.log('Parsed data:', {
        coefficientsLength: parsedCoeffs.length,
        resultsKeys: Object.keys(parsedResults)
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(400).json({ error: 'Invalid JSON in coefficients or results' });
    }
    
    // Generate report using the ReportGenerator
    const report = ReportGenerator.generateReport({
      testType: testType as 'lorentz_isotropy' | 'spin2_zero',
      coefficients: parsedCoeffs,
      results: parsedResults,
      sessionId: sessionId as string,
      equation: equation as string,
      c_model: c_model ? Number(c_model) : undefined,
      alpha_model: alpha_model ? Number(alpha_model) : undefined
    });
    
    console.log('Report generated, length:', report.length);
    console.log('Report contains placeholders:', report.includes('{{'));
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${testType}_report_${Date.now()}.md"`);
    res.send(report);
    
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as computationsRouter };