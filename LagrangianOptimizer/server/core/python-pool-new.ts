// File: server/core/python-pool-new.ts
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';

interface Job {
  payload: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

// Use the Python interpreter from the virtual environment
const PYTHON_EXECUTABLE = path.join(process.cwd(), ".venv", "bin", "python3");

export class PythonWorker {
  public isBusy = false;
  private process: ChildProcessWithoutNullStreams;
  private job: Job | null = null;
  private scriptPath: string;
  private isReady: boolean;
  
  constructor(scriptPath: string) {
    this.scriptPath = scriptPath;
    this.process = spawn(PYTHON_EXECUTABLE, ['-u', scriptPath], { stdio: 'pipe' });
    this.isReady = false;
    this.process.stdout!.on('data', this.onResponse.bind(this));
    this.process.stderr!.on('data', (data) => this.onError(new Error(data.toString())));
    this.process.on('exit', (code) => {
      if (code !== 0) this.onError(new Error(`Worker exited with code ${code}`));
    });
  }

  run(job: Job): void {
    this.isBusy = true;
    this.job = job;
    this.process.stdin!.write(JSON.stringify(job.payload) + '\n');
  }

  private onResponse(buffer: Buffer): void {
    if (!this.job) return;
    try {
      this.job.resolve(JSON.parse(buffer.toString()));
    } catch (e: any) {
      this.job.reject(new Error(`Invalid JSON from Python: ${e.message}`));
    } finally {
      this.job = null;
      this.isBusy = false;
    }
  }

  private onError(error: Error): void {
    if (this.job) this.job.reject(error);
    this.job = null;
    this.isBusy = false;
  }

  kill(): void {
    this.process.kill();
  }
}

export class PythonPool {
  private workers: PythonWorker[] = [];
  private jobQueue: Job[] = [];

  constructor(private scriptPath: string, private poolSize: number) {}

  public initialize() {
    console.log(`Initializing Python pool with ${this.poolSize} workers.`);
    for (let i = 0; i < this.poolSize; i++) {
      this.workers.push(new PythonWorker(this.scriptPath));
    }
  }

  public execute(payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.jobQueue.push({ payload, resolve, reject });
      this.dispatch();
    });
  }

  private dispatch() {
    while (this.jobQueue.length > 0) {
      const worker = this.workers.find(w => !w.isBusy);
      if (!worker) break;
      const job = this.jobQueue.shift()!;
      worker.run(job);
    }
  }

  public shutdown(): void {
    for (const worker of this.workers) {
      worker.kill();
    }
    this.workers = [];
    this.jobQueue = [];
  }
}

const lagrangianWorkerScript = path.resolve(process.cwd(), 'server', 'genetic-algorithm', 'py_worker.py');
export const lagrangianPool = new PythonPool(lagrangianWorkerScript, 8); // 8 workers for high throughput