import { PythonShell } from 'python-shell';
import path from 'path';

export interface GravityZeroParams {
  coefficients: number[];
  c_model?: number;
  alpha_model?: number;
}

export interface GravityZeroResult {
  success: boolean;
  psi0?: number;
  newtonConstant?: number;
  error?: string;
}

export async function computeGravityZero(params: GravityZeroParams): Promise<GravityZeroResult> {
  try {
    const scriptPath = path.join(process.cwd(), 'server', 'computations', 'rel_spin2_zero', 'worker.py');
    
    const options = {
      mode: 'json' as const,
      pythonPath: 'python3',
      args: [JSON.stringify(params)]
    };

    const results = await PythonShell.run(scriptPath, options);
    return results[0] as GravityZeroResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in Spin-2 zero mode computation'
    };
  }
}