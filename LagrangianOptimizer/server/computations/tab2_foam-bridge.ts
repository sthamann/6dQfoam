import { spawn } from "child_process";
import path from "path";

// Use the Python interpreter from the virtual environment
const PYTHON_EXECUTABLE = path.join(process.cwd(), ".venv", "bin", "python3");

export interface LorentzCheckConfig {
  coeffs: number[];
}

/**
 * Run 3+1 dimensional Lorentz isotropy check using Python/NumPy simulation
 * Returns the maximum Lorentz violation epsilon
 */
export function runLorentzCheck(cfg: LorentzCheckConfig): Promise<number> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "scripts", "foam3d.py");
    // Pass coefficients as individual arguments: c_tt c_xx c_yy c_zz c_xy
    const args = [scriptPath, ...cfg.coeffs.map(String)];
    const proc = spawn(PYTHON_EXECUTABLE, args);
    
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
        // Try to parse as JSON first (new format)
        const result = JSON.parse(stdout.trim());
        if (result.success) {
          // Use anisotropy as epsilon for Lorentz violation measure
          if (typeof result.anisotropy === 'number') {
            resolve(result.anisotropy);
            return;
          }
          // Fallback to epsilon field if available
          if (typeof result.epsilon === 'number') {
            resolve(result.epsilon);
            return;
          }
        }
        
        // Fall back to parsing as plain number (old format)
        const epsilon = parseFloat(stdout.trim());
        if (isNaN(epsilon)) {
          reject(new Error(`Invalid output from Python script: ${stdout}`));
          return;
        }
        resolve(epsilon);
      } catch (error) {
        // If JSON parsing fails, try plain number
        const epsilon = parseFloat(stdout.trim());
        if (isNaN(epsilon)) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
          return;
        }
        resolve(epsilon);
      }
    });
    
    proc.on("error", (error) => {
      reject(new Error(`Failed to spawn Python process: ${error.message}`));
    });
  });
}