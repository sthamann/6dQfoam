import { PythonShell } from 'python-shell';
import path from 'path';

export interface AnomalyScanParams {
  fermions?: Array<{
    u1: number;
    su3: number;
    su2: number;
    chirality: 'L' | 'R';
  }>;
}

export interface AnomalyScanResult {
  success: boolean;
  anomalies?: {
    gravitational: number;
    u1: number;
    su3: number;
    mixed: number;
  };
  error?: string;
}

export async function computeAnomalyScan(params: AnomalyScanParams): Promise<AnomalyScanResult> {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'anomaly_scan.py');
    
    const options = {
      mode: 'json' as const,
      pythonPath: 'python3',
      args: [JSON.stringify(params)]
    };

    const results = await PythonShell.run(scriptPath, options);
    return results[0] as AnomalyScanResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in anomaly scan computation'
    };
  }
}