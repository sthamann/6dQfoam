import { PythonShell } from 'python-shell';
import path from 'path';

export interface Reduce6Dto4DParams {
  coeffs: number[];
  psi0: number[];
}

export interface Reduce6Dto4DResult {
  success: boolean;
  MP2?: number;
  operators?: Array<{
    name: string;
    coeff: number;
  }>;
  error?: string;
}

export async function computeReduce6Dto4D(params: Reduce6Dto4DParams): Promise<Reduce6Dto4DResult> {
  try {
    const scriptPath = path.join(process.cwd(), 'server', 'computations', 'reduce-6d-to-4d', 'worker.py');
    
    const options = {
      mode: 'json' as const,
      pythonPath: 'python3',
      args: [JSON.stringify(params)]
    };

    const results = await PythonShell.run(scriptPath, options);
    return results[0] as Reduce6Dto4DResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in 6D to 4D reduction computation'
    };
  }
}