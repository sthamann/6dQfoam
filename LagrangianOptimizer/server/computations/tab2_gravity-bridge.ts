import { spawn } from "child_process";
import path from "path";

// Use the Python interpreter from the virtual environment
const PYTHON_EXECUTABLE = path.join(process.cwd(), ".venv", "bin", "python3");

export interface GravityCheckConfig {
  coeffs: number[];
}

export interface GravityResult {
  psi0: number[];
  GNewton: number;
}

/**
 * Compute the bulk spin-2 zero mode profile and Newton constant
 * using Python/SciPy boundary value problem solver
 */
export function computeGNewton(cfg: GravityCheckConfig): Promise<GravityResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "grav_zero.py");
    
    // Spawn the Python script with full config
    const proc = spawn(PYTHON_EXECUTABLE, [scriptPath, JSON.stringify(cfg)]);
    
    let stdout = "";
    let stderr = "";
    
    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error}`));
      }
    });
    
    proc.on("error", (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
  });
}