import { PythonShell } from 'python-shell';
import path from 'path';

export interface Foam3dParams {
  coefficients: number[];
  c_model?: number;
  alpha_model?: number;
}

export interface Foam3dResult {
  success: boolean;
  lorentzEpsilon?: number;
  error?: string;
}

export async function computeFoam3d(params: Foam3dParams): Promise<Foam3dResult> {
  try {
    const scriptPath = path.join(process.cwd(), 'server', 'computations', 'rel_lorentz_isotropy', 'worker.py');
    
    const options = {
      mode: 'json' as const,
      pythonPath: 'python3',
      args: [JSON.stringify(params)]
    };

    const results = await PythonShell.run(scriptPath, options);
    return results[0] as Foam3dResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in Lorentz isotropy computation'
    };
  }
}