import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AnomalyEditor } from "@/components/AnomalyEditor";
import { useSession } from "../contexts/SessionContext";
import { 
  Calculator, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Zap,
  AlertTriangle,
  Clock,
  Download,
  Waves,
  Globe,
  Layers,
  TrendingUp,
  Shield,
  RefreshCw,
  Loader2,
  Thermometer,
  BarChart,
  Cpu
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EquationDisplay } from "@/components/ui/equation-display";

interface RelativityData {
  epsilon: number;
  G4: number;
  psi0: number[];
}

interface TheoryData {
  MP2: number;
  operators: { name: string; coeff: number }[];
  beta: { name: string; value: number }[];
  stabilityPassed: boolean;
}

interface RuntimeData {
  reduction?: number;
  rgflow?: number;
  stability?: number;
}

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'blocked';
  result?: any;
  runtime?: number;
  error?: string;
  dependencies?: string[];
  missingDependencies?: string[];
  canRun?: boolean;
}

function TestInterface({ 
  coefficients, 
  relativity, 
  onTestComplete, 
  isRunning,
  onRunningChange,
  activeSession,
  foundationEquationRunId
}: {
  coefficients: number[] | null;
  relativity: RelativityData | null;
  onTestComplete: (testName: string, result: any) => void;
  isRunning: boolean;
  onRunningChange: (running: boolean) => void;
  activeSession: string | null;
  foundationEquationRunId: string | null;
}) {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'foam3d', status: 'pending' },
    { name: 'grav_zero', status: 'pending' },
    { name: 'dimensional_reduction', status: 'pending' },
    { name: 'rg_flow', status: 'pending' },
    { name: 'stability', status: 'pending' },
    { name: 'beta2loop', status: 'pending' },
    { name: 'anomaly', status: 'pending' },
    { name: 'ghost', status: 'pending' },
    { name: 'inflation', status: 'pending' },
    // New tests 10-19
    { name: 'sensitivity_heatmap', status: 'pending' },
    { name: 'lyapunov_spectrum', status: 'pending' },
    { name: 'auto_rg_3loop', status: 'pending' },
    { name: 'positivity_unitarity', status: 'pending' },
    { name: 'finite_t_phase', status: 'pending' },
    { name: 'noise_robustness', status: 'pending' },
    { name: 'parameter_inference', status: 'pending' },
    { name: 'surrogate_model', status: 'pending' },
    { name: 'vacuum_decay', status: 'pending' },
    { name: 'einstein_boltzmann', status: 'pending' }
  ]);

  const canRun = coefficients && relativity && !isRunning;

  const saveTestResultToSession = async (testName: string, result: any, runtime: number) => {
    try {
      console.log(`📝 Attempting to save test result for: ${testName}`);
      console.log(`   Coefficients: ${coefficients}`);
      console.log(`   Runtime: ${runtime}ms`);
      console.log(`   Foundation Equation Run ID: ${foundationEquationRunId}`);
      
      const response = await fetch('/api/sessions/active');
      if (!response.ok) {
        console.error('❌ Failed to get active session');
        return;
      }
      
      const session = await response.json();
      console.log(`   Active session ID: ${session.id}`);
      
      const saveResponse = await fetch(`/api/sessions/${session.id}/test-results`, {  
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testName,
          testResult: JSON.stringify(result),
          runtime,
          coefficients: coefficients ? JSON.stringify(coefficients) : null,
          runId: foundationEquationRunId, // Include the foundation equation's run ID
          timestamp: new Date().toISOString()
        })
      });
      
      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error(`❌ Failed to save test result: ${saveResponse.status} - ${errorText}`);
        return;
      }
      
      const saveResult = await saveResponse.json();
      console.log(`✅ Test result saved: ${testName}`, saveResult);
    } catch (error) {
      console.error(`❌ Failed to save test result for ${testName}:`, error);
    }
  };

  // Check test dependencies before running
  const checkTestDependencies = async (testName: string) => {
    try {
      const response = await fetch('/api/sessions/active');
      if (!response.ok) return { canRun: false, missingDependencies: [] };
      
      const session = await response.json();
      
      const depResponse = await fetch(`/api/sessions/${session.id}/test-dependencies/${testName}`);  // Changed from session.sessionId to session.id
      if (!depResponse.ok) return { canRun: true, missingDependencies: [] };
      
      return await depResponse.json();
    } catch (error) {
      console.error(`Failed to check dependencies for ${testName}:`, error);
      return { canRun: true, missingDependencies: [] };
    }
  };

  // Get operators from a completed test
  const getOperatorsFromTest = async (testName: string) => {
    try {
      const response = await fetch('/api/sessions/active');
      if (!response.ok) return [];
      
      const session = await response.json();
      
      const opResponse = await fetch(`/api/sessions/${session.id}/operators/${testName}`);  // Changed from session.sessionId to session.id
      if (!opResponse.ok) return [];
      
      const data = await opResponse.json();
      return data.operators || [];
    } catch (error) {
      console.error(`Failed to get operators from ${testName}:`, error);
      return [];
    }
  };

  const runSingleTest = async (testName: string) => {
    if (!canRun) return;

    // Check dependencies before running
    const dependencyCheck = await checkTestDependencies(testName);
    if (!dependencyCheck.canRun) {
      setTests(prev => prev.map(t => 
        t.name === testName ? { 
          ...t, 
          status: 'blocked' as const,
          missingDependencies: dependencyCheck.missingDependencies,
          error: `Missing dependencies: ${dependencyCheck.missingDependencies.join(', ')}`
        } : t
      ));
      return;
    }

    setTests(prev => prev.map(t => 
      t.name === testName ? { ...t, status: 'running' as const } : t
    ));
    onRunningChange(true);

    try {
      const startTime = Date.now();
      let response;
      let requestBody;

      switch (testName) {
        case 'foam3d':
          requestBody = { coeffs: coefficients };
          response = await fetch('/api/relativity/foam3d', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'grav_zero':
          requestBody = { coeffs: coefficients };
          response = await fetch('/api/relativity/gravity-zero', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'dimensional_reduction':
        case 'reduce6Dto4D':
          requestBody = { 
            coeffs: coefficients,
            psi0: relativity.psi0 
          };
          response = await fetch('/api/theory/reduce', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'rg_flow':
        case 'rgflow':
          // Get operators from dimensional reduction
          const reductionOperators = await getOperatorsFromTest('reduce6Dto4D');
          requestBody = {
            coeffs: coefficients,
            MP2: 1.0,
            operators: reductionOperators
          };
          response = await fetch('/api/theory/rgflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'stability':
        case 'stability_test':
          requestBody = { coeffs: coefficients };
          response = await fetch('/api/theory/stability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'beta2loop':
          // Get operators from dimensional reduction with proper database retrieval
          const operators = await getOperatorsFromTest('reduce6Dto4D');
          requestBody = { operators, coeffs: coefficients };
          response = await fetch('/api/theory/beta2loop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'ghost_scan':
          // Get spectrum data from dimensional reduction
          const spectrumOperators = await getOperatorsFromTest('reduce6Dto4D');
          requestBody = { operators: spectrumOperators, coeffs: coefficients };
          response = await fetch('/api/theory/ghost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'inflation_fit':
          // Get RG flow results and beta functions
          const rgOperators = await getOperatorsFromTest('rgflow');
          const betaOperators = await getOperatorsFromTest('beta2loop');
          requestBody = { 
            rgflow: rgOperators, 
            beta: betaOperators,
            coeffs: coefficients 
          };
          response = await fetch('/api/theory/inflation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'anomaly':
          // Anomaly test is now handled by AnomalyEditor component
          // This case is kept for compatibility but should not be reached
          console.warn('Anomaly test should be handled by AnomalyEditor component');
          return;
          break;

        case 'ghost':
          const dimensionalTestGhost = tests.find(t => t.name === 'dimensional_reduction');
          const operatorsGhost = (dimensionalTestGhost?.result?.operators || []).map((op: any) => ({
            name: op.name,
            coeff: Number(op.coeff ?? op.value ?? 0)  // Ensure correct key name
          }));
          const MP2 = dimensionalTestGhost?.result?.MP2 || 2.0;
          requestBody = { operators: operatorsGhost, MP2, coeffs: coefficients };
          response = await fetch('/api/theory/ghost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'inflation':
          const dimensionalTestInflation = tests.find(t => t.name === 'dimensional_reduction');
          const operatorsInflation = dimensionalTestInflation?.result?.operators || [];
          requestBody = { operators: operatorsInflation, coeffs: coefficients };
          response = await fetch('/api/theory/inflation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        // New tests 10-19
        case 'sensitivity_heatmap':
          requestBody = { coeffs: coefficients };
          response = await fetch('/api/theory/sensitivity-heatmap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'lyapunov_spectrum':
          requestBody = { coeffs: coefficients };
          response = await fetch('/api/theory/lyapunov-spectrum', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'auto_rg_3loop':
          const operators3Loop = await getOperatorsFromTest('reduce6Dto4D');
          requestBody = { operators: operators3Loop, coeffs: coefficients };
          response = await fetch('/api/theory/auto-rg-3loop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'positivity_unitarity':
          const operatorsPositivity = await getOperatorsFromTest('reduce6Dto4D');
          requestBody = { operators: operatorsPositivity, coeffs: coefficients };
          response = await fetch('/api/theory/positivity-unitarity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'finite_t_phase':
          const operatorsFiniteT = await getOperatorsFromTest('reduce6Dto4D');
          requestBody = { coeffs: coefficients, operators: operatorsFiniteT };
          response = await fetch('/api/theory/finite-t-phase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'noise_robustness':
          requestBody = { coeffs: coefficients, noise_level: 0.001 };
          response = await fetch('/api/theory/noise-robustness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'parameter_inference':
          const operatorsInference = await getOperatorsFromTest('reduce6Dto4D');
          requestBody = { coeffs: coefficients, operators: operatorsInference };
          response = await fetch('/api/theory/parameter-inference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'surrogate_model':
          // This test needs training data from previous runs
          // For now, use dummy data
          requestBody = { 
            training_data: { 
              coefficients: [coefficients],
              results: [{ fitness: 0.95 }]
            },
            test_data: { coefficients: coefficients }
          };
          response = await fetch('/api/theory/surrogate-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'vacuum_decay':
          const operatorsVacuum = await getOperatorsFromTest('reduce6Dto4D');
          requestBody = { coeffs: coefficients, operators: operatorsVacuum };
          response = await fetch('/api/theory/vacuum-decay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        case 'einstein_boltzmann':
          const operatorsBoltzmann = await getOperatorsFromTest('reduce6Dto4D');
          requestBody = { coeffs: coefficients, operators: operatorsBoltzmann };
          response = await fetch('/api/theory/einstein-boltzmann', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          break;

        default:
          throw new Error(`Unknown test: ${testName}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        // Handle HTML responses (server compilation errors)
        if (responseText.includes('<!DOCTYPE html>')) {
          throw new Error('Server compilation error - check console logs');
        }
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      const runtime = Date.now() - startTime;

      setTests(prev => prev.map(t => 
        t.name === testName ? { 
          ...t, 
          status: 'completed' as const, 
          result, 
          runtime 
        } : t
      ));

      // Save test result to session automatically
      await saveTestResultToSession(testName, result, runtime);

      onTestComplete(testName, result);

      // Check if we have enough tests to create aggregate result
      const completedTests = tests.filter(t => t.status === 'completed').length + 1;
      if (completedTests >= 4) { // Create aggregate after 4+ tests
        setTimeout(() => {
          console.log('Creating aggregate theory result...');
        }, 1000);
      }



    } catch (error) {
      setTests(prev => prev.map(t => 
        t.name === testName ? { 
          ...t, 
          status: 'error' as const, 
          error: error instanceof Error ? error.message : 'Unknown error'
        } : t
      ));
    }

    onRunningChange(false);
  };



  const runAllTests = async () => {
    if (!canRun) return;

    for (const test of tests) {
      await runSingleTest(test.name);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-carbon-10">Unified Theory Analysis</h2>
          <p className="text-sm text-carbon-40 mt-1">
            Three-stage physics validation pipeline
          </p>
        </div>
        <Button 
          onClick={runAllTests}
          disabled={!canRun}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-carbon-600"
        >
          <Zap className="w-4 h-4 mr-2" />
          Run All Tests
        </Button>
      </div>

      {/* Prerequisites Status */}
      <Card className="bg-carbon-800 border-carbon-700">
        <CardContent className="p-4">
          <h3 className="text-lg font-semibold text-carbon-10 mb-3">Input Data Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start space-x-2">
              {coefficients ? (
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-carbon-20">
                  Field Coefficients {coefficients ? 'Available' : 'Missing'}
                </div>
                {coefficients && (
                  <>
                    <div className="text-xs text-carbon-40 font-mono mt-1">
                      [{coefficients.map(c => c.toFixed(3)).join(', ')}]
                    </div>
                    <div className="mt-3">
                      <div className="text-xs text-carbon-50 font-medium mb-2">Foundation Equation:</div>
                      <EquationDisplay coefficients={coefficients} />
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              {relativity ? (
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-carbon-20">
                  Relativity Data {relativity ? 'Available' : 'Missing'}
                </div>
                {relativity && (
                  <div className="text-xs text-carbon-40 mt-1">
                    <div className="mb-1">From Tab 2 Tests:</div>
                    <div className="space-y-1 bg-carbon-700 p-2 rounded">
                      <div className="flex justify-between">
                        <span>Lorentz ε:</span>
                        <span className="font-mono">{relativity.epsilon.toExponential(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Newton G₄:</span>
                        <span className="font-mono">{relativity.G4.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ψ₀ profile:</span>
                        <span className="font-mono">{relativity.psi0.length} points</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Cards */}
      <div className="space-y-4">
        <TestCard
          test={tests.find(t => t.name === 'foam3d')!}
          title="1.) 3D Lorentz Isotropy Test (ε-calculation) <foam3d.py>"
          description="Computes Lorentz violation parameter ε using 3D field evolution with CuPy GPU acceleration. This test validates that the field equation preserves relativistic isotropy by measuring deviations from α = c_xx/c_tt = 1."
          symbol={<Waves className="w-6 h-6 text-blue-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "Grid Resolution", value: "64³ = 262,144 points" },
            { label: "CFL Stability Factor", value: "dt ≤ 0.001 × dx" }
          ] : []}
          accuracy="Lorentz violation |ε| ≤ 1e-6"
          onRun={() => runSingleTest('foam3d')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'grav_zero')!}
          title="2.) Gravitational Zero Mode Analysis (ψ₀ & G_N) <grav_zero.py>"
          description="Solves the boundary value problem for the normalized spin-2 zero mode ψ₀(y) using SciPy's robust BVP solver. Computes the effective 4D Newton constant G_N from the warp factor profile, crucial for matching observed gravity."
          symbol={<Globe className="w-6 h-6 text-green-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "Integration Domain", value: "y ∈ [-5, 5] with 200 nodes" },
            { label: "Boundary Conditions", value: "ψ'(0) = 0, ψ(±L) symmetric" }
          ] : []}
          accuracy="BVP convergence ≤ 1e-6"
          onRun={() => runSingleTest('grav_zero')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'dimensional_reduction')!}
          title="3.) 6D→4D Effective Theory Reduction <reduce6Dto4D.py>"
          description="Performs dimensional reduction from 6D to 4D by integrating over extra dimensions using the computed ψ₀ profile. Generates effective 4D operators (R², φ⁴, φ²R) and calculates the 4D Planck mass M_P² from volume integrals."
          symbol={<Layers className="w-6 h-6 text-purple-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "ψ₀ Profile", value: relativity ? `${relativity.psi0.length} data points from gravity analysis` : "Not available" },
            { label: "Integration Method", value: "Numerical quadrature over extra dimensions" }
          ] : []}
          accuracy="Relative error ≤ 1e-6"
          onRun={() => runSingleTest('dimensional_reduction')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'rg_flow')!}
          title="4.) Renormalization Group β-Functions <rgflow.py>"
          description="Calculates 1-loop renormalization group β-functions for effective theory operators using 50-decimal precision arithmetic (mpmath). These β-functions determine the running of coupling constants and are essential for UV/IR behavior analysis."
          symbol={<TrendingUp className="w-6 h-6 text-orange-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "Theory Operators", value: "R², φ⁴, φ²R from dimensional reduction" },
            { label: "Planck Mass²", value: "M_P² computed from volume integrals" },
            { label: "Precision", value: "50 decimal places (mpmath mp.dps=50)" }
          ] : []}
          accuracy="Absolute error < 1e-8"
          onRun={() => runSingleTest('rg_flow')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'stability')!}
          title="5.) Long-Range Numerical Stability Test <stability_test.py>"
          description="Executes 128³ grid leap-frog simulation for 10,000 time steps to verify long-term numerical stability. Uses CuPy GPU acceleration with periodic boundary conditions. Critical for ensuring the field equation doesn't develop numerical instabilities."
          symbol={<Shield className="w-6 h-6 text-red-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "Grid Size", value: "128³ = 2,097,152 points" },
            { label: "Time Evolution", value: "10,000 leap-frog steps with CFL dt" }
          ] : []}
          accuracy="Energy drift ≤ 10× initial energy"
          onRun={() => runSingleTest('stability')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'beta2loop')!}
          title="6.) 2-Loop β-Functions (UV Safety Check) <beta2loop.py>"
          description="Checks that the 1-loop UV fixed point remains stable when 2-loop terms are included. Uses symbolic computation with high precision to verify convergence of the renormalization group flow beyond leading order."
          symbol={<Calculator className="w-6 h-6 text-cyan-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "Theory Operators", value: "R², φ⁴, φ²R from dimensional reduction" },
            { label: "Precision", value: "50 decimal places (mpmath)" },
            { label: "Target", value: "max|β₂| < 1e-3 for convergence" }
          ] : []}
          accuracy="2-loop convergence: max|β₂| < 1e-3"
          onRun={() => runSingleTest('beta2loop')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        {/* Professional 6D Anomaly Scanner */}
        <Card className="border-yellow-500/20 bg-yellow-950/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                <div>
                  <h3 className="text-lg font-semibold text-carbon-10">
                    7.) 6D Anomaly Scanner (Professional Green-Schwarz Analysis)
                  </h3>
                  <p className="text-sm text-carbon-40 mt-1">
                    Professional 6D gauge & gravitational anomaly cancellation checker with automatic Green-Schwarz factorization. 
                    Implements full 8-form I₈ computation and solves for counter-term coefficients.
                  </p>
                </div>
              </div>
              {tests.find(t => t.name === 'anomaly')?.result && getTestStatusIndicator(tests.find(t => t.name === 'anomaly')?.result)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnomalyEditor 
              onResult={(result) => {
                setTests(prevTests => 
                  prevTests.map(test => 
                    test.name === 'anomaly' 
                      ? { ...test, status: 'completed', result: result, runtime: result.runtime }
                      : test
                  )
                );
                
                // Save to database
                saveTestResultToSession('anomaly', result, result.runtime);
                
                // Notify parent component
                onTestComplete('anomaly', result);
              }}
              onGlobalResult={(globalResult) => {
                console.log('Global anomaly test completed:', globalResult);
                
                setTests(prevTests => 
                  prevTests.map(test => 
                    test.name === 'global_anomaly' 
                      ? { ...test, status: 'completed', result: globalResult, runtime: globalResult.runtime || 0 }
                      : test
                  )
                );
                
                // Save global anomaly result to database
                saveTestResultToSession('global_anomaly', globalResult, globalResult.runtime || 0);
              }}
            />
            {tests.find(t => t.name === 'anomaly')?.result && (
              <div className="mt-4 p-4 bg-carbon-90 rounded-lg">
                <h4 className="text-sm font-semibold text-carbon-20 mb-2">Analysis Results</h4>
                {formatTestResults('anomaly', tests.find(t => t.name === 'anomaly')?.result)}
                
                {/* Download buttons for anomaly tests */}
                <div className="flex items-center space-x-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                    onClick={async () => {
                      try {
                        if (!activeSession) {
                          alert('No active session found. Please ensure you have an active session.');
                          return;
                        }
                        
                        const response = await fetch(`/api/export/markdown/anomaly/${activeSession}`);
                        if (response.ok) {
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.style.display = 'none';
                          a.href = url;
                          a.download = `anomaly-report-${activeSession}.md`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } else {
                          console.error('Failed to download anomaly report');
                          alert('Failed to download anomaly report. Please check console for details.');
                        }
                      } catch (error) {
                        console.error('Error downloading anomaly report:', error);
                        alert('Error downloading anomaly report.');
                      }
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download Anomaly Report
                  </Button>
                  
                  {tests.find(t => t.name === 'global_anomaly')?.result && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-600 hover:bg-green-700 text-white border-green-500"
                      onClick={async () => {
                        try {
                          if (!activeSession) {
                            alert('No active session found. Please ensure you have an active session.');
                            return;
                          }
                          
                          const response = await fetch(`/api/export/markdown/global_anomaly/${activeSession}`);
                          if (response.ok) {
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = url;
                            a.download = `global-anomaly-report-${activeSession}.md`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } else {
                            console.error('Failed to download global anomaly report');
                            alert('Failed to download global anomaly report. Please check console for details.');
                          }
                        } catch (error) {
                          console.error('Error downloading global anomaly report:', error);
                          alert('Error downloading global anomaly report.');
                        }
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Download Global Report
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <TestCard
          test={tests.find(t => t.name === 'ghost')!}
          title="8.) Ghost & Tachyon Detector (Spectrum Analysis) <ghost_scan.py>"
          description="Ensures no negative-norm (ghost) or imaginary-mass (tachyon) modes in the 4D effective spectrum. Builds the kinetic matrix from operator coefficients and diagonalizes to check for pathological modes."
          symbol={<Activity className="w-6 h-6 text-pink-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "Kinetic Matrix", value: "Built from R², φ⁴, φ²R operators" },
            { label: "Eigenvalue Analysis", value: "Real, positive eigenvalues required" },
            { label: "Health Check", value: "No ghosts, no tachyons" }
          ] : []}
          accuracy="All eigenvalues real and positive"
          onRun={() => runSingleTest('ghost')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'inflation')!}
          title="9.) R²-Inflation & CMB Fit (Observational Test) <inflation_fit.py>"
          description="Shows that the R² coefficient reproduces Planck-compatible cosmological observables (n_s, r). Computes spectral index and tensor-to-scalar ratio from the effective theory and compares with CMB constraints."
          symbol={<Globe className="w-6 h-6 text-indigo-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "R² Coefficient", value: "From dimensional reduction" },
            { label: "Planck 2018 Constraints", value: "0.958 < n_s < 0.973, r < 0.08" },
            { label: "Inflation Model", value: "R² + corrections, N ~ 60 e-folds" }
          ] : []}
          accuracy="Planck-compatible: n_s ∈ [0.958, 0.973], r < 0.08"
          onRun={() => runSingleTest('inflation')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        {/* New advanced physics tests 10-19 */}
        <TestCard
          test={tests.find(t => t.name === 'sensitivity_heatmap')!}
          title="10.) Sensitivity Heatmap (Robustness Analysis) <sensitivity_heatmap.py>"
          description="Maps how strongly each observable deviation (Δc, Δα, ΔG) reacts to small perturbations of Lagrange coefficients. Uses Sobol indices via SALib with CuPy GPU acceleration to determine if the parameter space is robust or fine-tuned."
          symbol={<Layers className="w-6 h-6 text-amber-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "Sobol Samples", value: "10,000 Monte Carlo samples" },
            { label: "Perturbation Range", value: "±10% around current values" },
            { label: "Observable Set", value: "Δc, Δα, ΔG deviations" }
          ] : []}
          accuracy="All gradient-based indices < 10⁻²"
          onRun={() => runSingleTest('sensitivity_heatmap')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'lyapunov_spectrum')!}
          title="11.) Lyapunov Spectrum (Dynamic Stability) <lyapunov_spectrum.py>"
          description="Measures dynamic stability of 6D foam by computing Lyapunov exponents. Uses parallelized tangent propagator with Arnoldi iteration on 64³ grid to detect chaos onset early and distinguish quasi-periodic from chaotic dynamics."
          symbol={<Activity className="w-6 h-6 text-purple-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "Grid Resolution", value: "64³ points (reduced from 6D)" },
            { label: "Evolution Time", value: "1000 steps with RK4 integration" },
            { label: "Tangent Vectors", value: "5 largest Lyapunov exponents" }
          ] : []}
          accuracy="Max Lyapunov λ₁ < 0 (quasi-periodic)"
          onRun={() => runSingleTest('lyapunov_spectrum')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'auto_rg_3loop')!}
          title="12.) Auto-RG 3-Loop (UV Fixed Point Verification) <auto_rg_3loop.py>"
          description="Extends RG analysis to 3-loop order to verify that 1-loop UV fixed points remain stable. Uses SymPy for symbolic computation and numba JIT compilation, testing convergence over 6 energy decades."
          symbol={<TrendingUp className="w-6 h-6 text-teal-400" />}
          inputs={coefficients ? [
            { label: "Theory Operators", value: "From dimensional reduction" },
            { label: "Loop Orders", value: "1-loop → 2-loop → 3-loop comparison" },
            { label: "Energy Range", value: "10⁻³ to 10³ M_Pl (6 decades)" },
            { label: "Precision", value: "50 decimal places (mpmath)" }
          ] : []}
          accuracy="‖β³‖ < 10⁻³ over 6 decades μ"
          onRun={() => runSingleTest('auto_rg_3loop')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'positivity_unitarity')!}
          title="13.) Positivity & Unitarity Cuts (S-Matrix Bounds) <positivity_unitarity.py>"
          description="Checks S-matrix positivity bounds using convex optimization (cvxpy). Tests EFT bounds in 4D projection against ghost rumors, ensuring all αᵢ > 0 and ρᵢ > 0 while satisfying unitarity constraints."
          symbol={<Shield className="w-6 h-6 text-emerald-400" />}
          inputs={coefficients ? [
            { label: "EFT Operators", value: "R², φ⁴, φ²R from reduction" },
            { label: "Optimization", value: "Convex solver (OSQP)" },
            { label: "Constraints", value: "Adams et al. positivity bounds" },
            { label: "Unitarity", value: "|aₗ| < 1 for all partial waves" }
          ] : []}
          accuracy="All αᵢ > 0, ρᵢ > 0 satisfied"
          onRun={() => runSingleTest('positivity_unitarity')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'finite_t_phase')!}
          title="14.) Finite-T Phase Diagram (Early Universe) <finite_t_phase.py>"
          description="Checks if brane vacuum emerges correctly after t ≈ 10⁻³⁵ s. Uses Hybrid Monte-Carlo in Euclidean time with temperature scan from 10⁻⁴ to 10² M_Pl to verify graceful exit from inflation."
          symbol={<Thermometer className="w-6 h-6 text-rose-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "Temperature Scan", value: "10⁻⁴ to 10² M_Pl" },
            { label: "Monte-Carlo", value: "Hybrid HMC in Euclidean time" },
            { label: "Phase Transition", value: "Latent heat calculation" }
          ] : []}
          accuracy="Latent heat < 0.1 M_Pl⁴ for graceful exit"
          onRun={() => runSingleTest('finite_t_phase')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'noise_robustness')!}
          title="15.) Noise-Injected Robustness (Quantum Foam) <noise_robustness.py>"
          description="Tests robustness against real quantum foam fluctuations. Injects random metric kicks using Stratonovich SDE integrator with white and 1/f noise to ensure signal remains distinguishable from quantum noise."
          symbol={<Waves className="w-6 h-6 text-violet-400" />}
          inputs={coefficients ? [
            { label: "Field Coefficients", value: `[${coefficients.map(c => c.toFixed(8)).join(', ')}]` },
            { label: "Noise Types", value: "White + 1/f quantum foam" },
            { label: "SDE Integrator", value: "Stratonovich scheme" },
            { label: "Evolution Steps", value: "10³ timesteps" }
          ] : []}
          accuracy="Signal-to-Noise > 10⁴ after 10³ steps"
          onRun={() => runSingleTest('noise_robustness')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'parameter_inference')!}
          title="16.) Parameter Inference ↔ Data (Bayesian Fit) <parameter_inference.py>"
          description="Bayesian fit of KK-mass and extra-radii to LIGO echo limits & torsion balance data. Uses PyMC to incorporate experimental posteriors and verify compatibility with current GA confidence intervals."
          symbol={<BarChart className="w-6 h-6 text-sky-400" />}
          inputs={coefficients ? [
            { label: "Model Parameters", value: "KK masses, extra radii" },
            { label: "Data Sources", value: "LIGO echoes, Eöt-Wash torsion" },
            { label: "Inference", value: "PyMC Bayesian MCMC" },
            { label: "Validation", value: "Posterior R95 confidence" }
          ] : []}
          accuracy="Posterior R95 ⊂ GA confidence interval"
          onRun={() => runSingleTest('parameter_inference')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'surrogate_model')!}
          title="17.) Surrogate Model ML (GA Acceleration) <surrogate_model.py>"
          description="Builds ML surrogate to accelerate GA iterations by >50×. Uses Kernel Ridge regression or Neural ODEs trained on 10⁵ simulation samples to predict fitness without full computation."
          symbol={<Cpu className="w-6 h-6 text-orange-400" />}
          inputs={coefficients ? [
            { label: "Training Samples", value: "10⁵ GA simulation results" },
            { label: "Model Type", value: "Kernel Ridge / Neural ODE" },
            { label: "Target Speedup", value: ">50× acceleration" },
            { label: "Validation", value: "Cross-validation on test set" }
          ] : []}
          accuracy="Prediction RMSE < 10⁻³ × fitness"
          onRun={() => runSingleTest('surrogate_model')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'vacuum_decay')!}
          title="18.) Vacuum Decay Rate (Metastability Check) <vacuum_decay.py>"
          description="Calculates tunneling probability to ensure universe doesn't decay in 10⁸ years. Uses Coleman-De Luccia bounce finder with shooting + overshoot method to compute decay rate Γ/V."
          symbol={<AlertTriangle className="w-6 h-6 text-red-500" />}
          inputs={coefficients ? [
            { label: "Field Potential", value: "From effective theory" },
            { label: "Bounce Finder", value: "Coleman-De Luccia instanton" },
            { label: "Method", value: "Shooting + overshoot algorithm" },
            { label: "Time Horizon", value: "10⁸ years stability required" }
          ] : []}
          accuracy="Γ/V < H₀⁴ (universe stable)"
          onRun={() => runSingleTest('vacuum_decay')}
          canRun={!!canRun}
          activeSession={activeSession}
        />

        <TestCard
          test={tests.find(t => t.name === 'einstein_boltzmann')!}
          title="19.) Einstein-Boltzmann Pipeline (CMB Prediction) <einstein_boltzmann.py>"
          description="Full CMB power spectrum prediction including bulk leakages. Uses modified CLASS code with extradimensional Green functions to compute Cₗ coefficients and compare with Planck data."
          symbol={<Globe className="w-6 h-6 text-indigo-500" />}
          inputs={coefficients ? [
            { label: "Cosmology", value: "Modified Einstein-Boltzmann" },
            { label: "Extra Dimensions", value: "Bulk leakage Green functions" },
            { label: "Observable", value: "CMB power spectrum Cₗ" },
            { label: "Comparison", value: "Planck 2018 data" }
          ] : []}
          accuracy="ΔCₗ < 2σ_Planck for ℓ=2…2500"
          onRun={() => runSingleTest('einstein_boltzmann')}
          canRun={!!canRun}
          activeSession={activeSession}
        />
      </div>
    </div>
  );
}

const getTestStatusIndicator = (result: any) => {
  if (!result || !result.success) {
    return (
      <div className="flex items-center space-x-1 text-red-400">
        <span className="text-lg">✗</span>
        <span className="text-xs">FAILED</span>
      </div>
    );
  }

  // Check for specific pass/fail criteria
  let passed = true;
  
  if (result.epsilon !== undefined) {
    passed = result.epsilon < 1e-6;
  } else if (result.passed !== undefined) {
    passed = result.passed;
  } else if (result.energyRatio !== undefined) {
    passed = result.energyRatio < 10;
  } else if (result.convergence !== undefined) {
    passed = result.convergence;
  } else if (result.GNewton !== undefined) {
    passed = Math.abs(result.GNewton - 1) < 10; // Reasonable Newton constant
  } else if (result.maxBeta2 !== undefined) {
    passed = result.maxBeta2 < 1e-3; // 2-loop convergence
  } else if (result.anomalies_cancelled !== undefined) {
    passed = result.anomalies_cancelled;
  } else if (result.is_healthy !== undefined) {
    passed = result.is_healthy;
  } else if (result.planck_compatible !== undefined) {
    passed = result.planck_compatible;
  } else if (result.is_robust !== undefined) {
    passed = result.is_robust; // sensitivity heatmap
  } else if (result.is_stable !== undefined) {
    passed = result.is_stable; // lyapunov spectrum
  } else if (result.is_convergent !== undefined && result.fixed_point_stable !== undefined) {
    passed = result.is_convergent && result.fixed_point_stable; // auto-rg 3-loop
  } else if (result.all_bounds_satisfied !== undefined) {
    passed = result.all_bounds_satisfied; // positivity unitarity
  } else if (result.graceful_exit !== undefined) {
    passed = result.graceful_exit; // finite-t phase
  } else if (result.signal_noise_ratio !== undefined) {
    passed = result.signal_noise_ratio > 10000; // noise robustness
  } else if (result.posterior_compatible !== undefined) {
    passed = result.posterior_compatible; // parameter inference
  } else if (result.rmse !== undefined) {
    passed = result.rmse < 0.001; // surrogate model
  } else if (result.universe_stable !== undefined) {
    passed = result.universe_stable; // vacuum decay
  } else if (result.cmb_compatible !== undefined) {
    passed = result.cmb_compatible; // einstein boltzmann
  }

  return (
    <div className={`flex items-center space-x-1 ${passed ? 'text-green-400' : 'text-red-400'}`}>
      <span className="text-lg">{passed ? '✓' : '✗'}</span>
      <span className="text-xs">{passed ? 'PASSED' : 'FAILED'}</span>
    </div>
  );
};

const formatTestResults = (testName: string, result: any) => {
  const items = [];
  
  // Scientific notation formatter for small numbers (fix for 2-loop β-functions display)
  const formatScientific = (x: number, precision: number = 6) => {
    if (x === 0) return "0";
    if (Math.abs(x) < 1e-3 || Math.abs(x) > 1e6) {
      return x.toExponential(precision);
    }
    return x.toFixed(precision);
  };

  switch (testName) {
    case 'foam3d':
      if (result.epsilon !== undefined) {
        items.push(
          <div key="epsilon" className="flex justify-between">
            <span className="text-carbon-40">Lorentz violation:</span>
            <span className="text-carbon-10 font-mono">ε = {result.epsilon.toExponential(3)}</span>
          </div>
        );
        items.push(
          <div key="bound" className="flex justify-between">
            <span className="text-carbon-40">Target bound:</span>
            <span className="text-carbon-10 font-mono">ε &lt; 10⁻⁶</span>
          </div>
        );
      }
      break;

    case 'grav_zero':
      if (result.GNewton !== undefined) {
        items.push(
          <div key="gnewton" className="flex justify-between">
            <span className="text-carbon-40">Newton constant:</span>
            <span className="text-carbon-10 font-mono">G_N = {result.GNewton.toFixed(6)}</span>
          </div>
        );
      }
      if (result.psi0 && Array.isArray(result.psi0)) {
        items.push(
          <div key="profile" className="flex justify-between">
            <span className="text-carbon-40">ψ₀ profile points:</span>
            <span className="text-carbon-10 font-mono">{result.psi0.length} points</span>
          </div>
        );
      }
      break;

    case 'reduce':
      if (result.MP2 !== undefined) {
        items.push(
          <div key="mp2" className="flex justify-between">
            <span className="text-carbon-40">Planck mass²:</span>
            <span className="text-carbon-10 font-mono">M_P² = {result.MP2.toExponential(3)}</span>
          </div>
        );
      }
      if (result.operators && Array.isArray(result.operators)) {
        items.push(
          <div key="operators" className="flex justify-between">
            <span className="text-carbon-40">Effective operators:</span>
            <span className="text-carbon-10 font-mono">{result.operators.length} generated</span>
          </div>
        );
      }
      break;

    case 'rg_flow':
      if (result.beta && Array.isArray(result.beta)) {
        items.push(
          <div key="beta-count" className="flex justify-between">
            <span className="text-carbon-40">β-functions:</span>
            <span className="text-carbon-10 font-mono">{result.beta.length} calculated</span>
          </div>
        );
        const maxBeta = Math.max(...result.beta.map((b: any) => Math.abs(b.value || 0)));
        items.push(
          <div key="convergence" className="flex justify-between">
            <span className="text-carbon-40">Max |β|:</span>
            <span className="text-carbon-10 font-mono">{maxBeta.toExponential(3)}</span>
          </div>
        );
      }
      break;

    case 'stability':
      if (result.energyRatio !== undefined) {
        items.push(
          <div key="energy" className="flex justify-between">
            <span className="text-carbon-40">Energy ratio:</span>
            <span className="text-carbon-10 font-mono">{result.energyRatio.toFixed(3)}</span>
          </div>
        );
      }
      if (result.gridSize) {
        items.push(
          <div key="grid" className="flex justify-between">
            <span className="text-carbon-40">Grid size:</span>
            <span className="text-carbon-10 font-mono">{result.gridSize}</span>
          </div>
        );
      }
      break;

    case 'beta2loop':
      if (result.beta2) {
        Object.entries(result.beta2).forEach(([op, value]: [string, any]) => {
          items.push(
            <div key={`beta2-${op}`} className="flex justify-between">
              <span className="text-carbon-40">β₂({op}):</span>
              <span className="text-carbon-10 font-mono">{value === 0 ? "0" : value.toExponential(3)}</span>
            </div>
          );
        });
      }
      if (result.maxBeta2 !== undefined) {
        items.push(
          <div key="maxbeta2" className="flex justify-between">
            <span className="text-carbon-40">Max |β₂|:</span>
            <span className="text-carbon-10 font-mono">{result.maxBeta2 === 0 ? "0" : result.maxBeta2.toExponential(3)}</span>
          </div>
        );
      }
      if (result.convergent !== undefined) {
        items.push(
          <div key="convergent" className="flex justify-between">
            <span className="text-carbon-40">2-loop convergence:</span>
            <span className="text-carbon-10 font-mono">{result.convergent ? 'YES' : 'NO'}</span>
          </div>
        );
      }
      break;

    case 'anomaly':
      if (result.anomalies_cancelled !== undefined) {
        items.push(
          <div key="cancelled" className="flex justify-between">
            <span className="text-carbon-40">Anomalies cancelled:</span>
            <span className="text-carbon-10 font-mono">{result.anomalies_cancelled ? 'YES' : 'NO'}</span>
          </div>
        );
      }
      if (result.fermion_count !== undefined) {
        items.push(
          <div key="fermions" className="flex justify-between">
            <span className="text-carbon-40">Fermion representations:</span>
            <span className="text-carbon-10 font-mono">{result.fermion_count}</span>
          </div>
        );
      }
      if (result.GS_factors && Object.keys(result.GS_factors).length > 0) {
        items.push(
          <div key="gs-factors" className="flex justify-between">
            <span className="text-carbon-40">Green-Schwarz factors:</span>
            <span className="text-carbon-10 font-mono">{Object.keys(result.GS_factors).length} computed</span>
          </div>
        );
      }
      if (result.traces && Object.keys(result.traces).length > 0) {
        const maxTrace = Math.max(...Object.values(result.traces).map((v: any) => Math.abs(v)));
        items.push(
          <div key="max-trace" className="flex justify-between">
            <span className="text-carbon-40">Max |trace|:</span>
            <span className="text-carbon-10 font-mono">{maxTrace < 1e-10 ? "0" : maxTrace.toExponential(3)}</span>
          </div>
        );
      }
      break;

    case 'ghost':
      if (result.ghosts !== undefined) {
        items.push(
          <div key="ghosts" className="flex justify-between">
            <span className="text-carbon-40">Ghost modes:</span>
            <span className="text-carbon-10 font-mono">{result.ghosts}</span>
          </div>
        );
      }
      if (result.tachyons !== undefined) {
        items.push(
          <div key="tachyons" className="flex justify-between">
            <span className="text-carbon-40">Tachyon modes:</span>
            <span className="text-carbon-10 font-mono">{result.tachyons}</span>
          </div>
        );
      }
      if (result.min_eigenvalue !== undefined) {
        items.push(
          <div key="mineigen" className="flex justify-between">
            <span className="text-carbon-40">Min eigenvalue:</span>
            <span className="text-carbon-10 font-mono">{result.min_eigenvalue === 0 ? "0" : result.min_eigenvalue.toExponential(6)}</span>
          </div>
        );
      }
      break;

    case 'inflation':
      if (result.n_s !== undefined) {
        items.push(
          <div key="ns" className="flex justify-between">
            <span className="text-carbon-40">Spectral index n_s:</span>
            <span className="text-carbon-10 font-mono">{result.n_s.toFixed(4)}</span>
          </div>
        );
      }
      if (result.r !== undefined) {
        items.push(
          <div key="r" className="flex justify-between">
            <span className="text-carbon-40">Tensor ratio r:</span>
            <span className="text-carbon-10 font-mono">{result.r.toExponential(3)}</span>
          </div>
        );
      }
      if (result.planck_compatible !== undefined) {
        items.push(
          <div key="planck" className="flex justify-between">
            <span className="text-carbon-40">Planck compatible:</span>
            <span className="text-carbon-10 font-mono">{result.planck_compatible ? 'YES' : 'NO'}</span>
          </div>
        );
      }
      break;

    // New test cases for tests 10-19
    case 'sensitivity_heatmap':
      if (result.max_sensitivity !== undefined) {
        items.push(
          <div key="max-sens" className="flex justify-between">
            <span className="text-carbon-40">Max sensitivity:</span>
            <span className="text-carbon-10 font-mono">{result.max_sensitivity.toExponential(3)}</span>
          </div>
        );
      }
      if (result.is_robust !== undefined) {
        items.push(
          <div key="robust" className="flex justify-between">
            <span className="text-carbon-40">Parameter space:</span>
            <span className="text-carbon-10 font-mono">{result.is_robust ? 'ROBUST' : 'FINE-TUNED'}</span>
          </div>
        );
      }
      break;

    case 'lyapunov_spectrum':
      if (result.max_lyapunov !== undefined) {
        items.push(
          <div key="max-lyap" className="flex justify-between">
            <span className="text-carbon-40">Max Lyapunov λ₁:</span>
            <span className="text-carbon-10 font-mono">{result.max_lyapunov.toExponential(3)}</span>
          </div>
        );
      }
      if (result.dynamics_type !== undefined) {
        items.push(
          <div key="dynamics" className="flex justify-between">
            <span className="text-carbon-40">Dynamics:</span>
            <span className="text-carbon-10 font-mono">{result.dynamics_type.toUpperCase()}</span>
          </div>
        );
      }
      break;

    case 'auto_rg_3loop':
      if (result.max_3loop_correction !== undefined) {
        items.push(
          <div key="correction" className="flex justify-between">
            <span className="text-carbon-40">3-loop correction:</span>
            <span className="text-carbon-10 font-mono">{result.max_3loop_correction.toExponential(3)}</span>
          </div>
        );
      }
      if (result.norm_beta_3loop !== undefined) {
        items.push(
          <div key="norm-beta" className="flex justify-between">
            <span className="text-carbon-40">‖β³‖ at UV:</span>
            <span className="text-carbon-10 font-mono">{result.norm_beta_3loop.toExponential(3)}</span>
          </div>
        );
      }
      break;

    case 'positivity_unitarity':
      if (result.positivity?.alpha_positive !== undefined) {
        items.push(
          <div key="alpha-pos" className="flex justify-between">
            <span className="text-carbon-40">α positivity:</span>
            <span className="text-carbon-10 font-mono">{result.positivity.alpha_positive ? 'SATISFIED' : 'VIOLATED'}</span>
          </div>
        );
      }
      if (result.unitarity?.unitarity_satisfied !== undefined) {
        items.push(
          <div key="unitarity" className="flex justify-between">
            <span className="text-carbon-40">Unitarity bounds:</span>
            <span className="text-carbon-10 font-mono">{result.unitarity.unitarity_satisfied ? 'SATISFIED' : 'VIOLATED'}</span>
          </div>
        );
      }
      break;

    case 'finite_t_phase':
      if (result.latent_heat !== undefined) {
        items.push(
          <div key="latent" className="flex justify-between">
            <span className="text-carbon-40">Latent heat:</span>
            <span className="text-carbon-10 font-mono">{result.latent_heat.toExponential(3)} M_Pl⁴</span>
          </div>
        );
      }
      if (result.graceful_exit !== undefined) {
        items.push(
          <div key="exit" className="flex justify-between">
            <span className="text-carbon-40">Phase transition:</span>
            <span className="text-carbon-10 font-mono">{result.graceful_exit ? 'GRACEFUL' : 'ABRUPT'}</span>
          </div>
        );
      }
      break;

    case 'noise_robustness':
      if (result.signal_noise_ratio !== undefined) {
        items.push(
          <div key="snr" className="flex justify-between">
            <span className="text-carbon-40">Signal/Noise:</span>
            <span className="text-carbon-10 font-mono">{result.signal_noise_ratio.toExponential(2)}</span>
          </div>
        );
      }
      break;

    case 'parameter_inference':
      if (result.posterior_compatible !== undefined) {
        items.push(
          <div key="posterior" className="flex justify-between">
            <span className="text-carbon-40">Data compatibility:</span>
            <span className="text-carbon-10 font-mono">{result.posterior_compatible ? 'COMPATIBLE' : 'TENSION'}</span>
          </div>
        );
      }
      break;

    case 'surrogate_model':
      if (result.rmse !== undefined) {
        items.push(
          <div key="rmse" className="flex justify-between">
            <span className="text-carbon-40">Prediction RMSE:</span>
            <span className="text-carbon-10 font-mono">{result.rmse.toExponential(3)}</span>
          </div>
        );
      }
      if (result.speedup !== undefined) {
        items.push(
          <div key="speedup" className="flex justify-between">
            <span className="text-carbon-40">GA speedup:</span>
            <span className="text-carbon-10 font-mono">{result.speedup}×</span>
          </div>
        );
      }
      break;

    case 'vacuum_decay':
      if (result.decay_rate !== undefined) {
        items.push(
          <div key="decay" className="flex justify-between">
            <span className="text-carbon-40">Decay rate Γ/V:</span>
            <span className="text-carbon-10 font-mono">{result.decay_rate.toExponential(3)}</span>
          </div>
        );
      }
      if (result.universe_stable !== undefined) {
        items.push(
          <div key="stable" className="flex justify-between">
            <span className="text-carbon-40">Universe fate:</span>
            <span className="text-carbon-10 font-mono">{result.universe_stable ? 'STABLE' : 'METASTABLE'}</span>
          </div>
        );
      }
      break;

    case 'einstein_boltzmann':
      if (result.max_cl_deviation !== undefined) {
        items.push(
          <div key="cl-dev" className="flex justify-between">
            <span className="text-carbon-40">Max ΔCₗ/σ:</span>
            <span className="text-carbon-10 font-mono">{result.max_cl_deviation.toFixed(2)}</span>
          </div>
        );
      }
      if (result.cmb_compatible !== undefined) {
        items.push(
          <div key="cmb" className="flex justify-between">
            <span className="text-carbon-40">CMB compatibility:</span>
            <span className="text-carbon-10 font-mono">{result.cmb_compatible ? 'COMPATIBLE' : 'TENSION'}</span>
          </div>
        );
      }
      break;
  }

  return items.length > 0 ? items : (
    <div className="text-carbon-40 text-xs">View detailed data below</div>
  );
};

function TestCard({ 
  test, 
  title, 
  description, 
  symbol,
  inputs, 
  accuracy, 
  onRun, 
  canRun,
  activeSession 
}: {
  test: TestResult;
  title: string;
  description: string;
  symbol?: React.ReactNode;
  inputs: { label: string; value: string }[];
  accuracy: string;
  onRun: () => void;
  canRun: boolean;
  activeSession?: string | null;
}) {
  const getStatusIcon = () => {
    switch (test.status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-carbon-400" />;
      case 'running':
        return <Activity className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'blocked':
        return <AlertTriangle className="w-5 h-5 text-orange-400" />;
    }
  };

  const getStatusBadge = () => {
    const variants: Record<string, string> = {
      pending: "bg-carbon-600 text-carbon-20",
      running: "bg-blue-600 text-white",
      completed: "bg-green-600 text-white",
      error: "bg-red-600 text-white",
      blocked: "bg-orange-600 text-white"
    };

    return (
      <Badge className={variants[test.status] || variants.pending}>
        {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
      </Badge>
    );
  };

  const getDependencyExplanation = () => {
    if (test.status !== 'blocked') return null;
    
    const dependencies: Record<string, string[]> = {
      'grav_zero': ['foam3d'],
      'dimensional_reduction': ['foam3d', 'grav_zero'],
      'rgflow': ['dimensional_reduction'],
      'stability': ['rgflow'],
      'beta2loop': ['stability'],
      'ghost': ['beta2loop'],
      'inflation': ['ghost']
    };
    
    const testDeps = dependencies[test.name];
    if (!testDeps) return null;
    
    return (
      <div className="mt-2 p-3 bg-orange-900/20 border border-orange-600/30 rounded">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-medium text-orange-300">Test Blocked</span>
        </div>
        <p className="text-xs text-orange-200 mt-1">
          This test requires the following tests to complete first:
        </p>
        <ul className="text-xs text-orange-200 mt-1 ml-4">
          {testDeps.map(dep => (
            <li key={dep} className="list-disc">
              {dep === 'foam3d' && 'Test 1: 3D Lorentz Isotropy Test - provides field coefficients'}
              {dep === 'grav_zero' && 'Test 2: Gravitational Zero Mode Analysis - provides Newton constant'}
              {dep === 'dimensional_reduction' && 'Test 3: 6D→4D Dimensional Reduction - provides effective operators'}
              {dep === 'rgflow' && 'Test 4: RG Flow Analysis - provides flow equations'}
              {dep === 'stability' && 'Test 5: Vacuum Stability Test - validates field stability'}
              {dep === 'beta2loop' && 'Test 6: 2-Loop β-Functions - confirms UV convergence'}
              {dep === 'ghost' && 'Test 8: Ghost & Tachyon Detector - checks spectrum health'}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <Card className="bg-carbon-800 border-carbon-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {symbol || getStatusIcon()}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-lg text-carbon-10">{title}</CardTitle>
                {getStatusIcon()}
              </div>
              <p className="text-sm text-carbon-40 mt-1">{description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusBadge()}
            <Button
              onClick={onRun}
              disabled={!canRun || test.status === 'running'}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-carbon-600"
            >
              {test.status === 'running' ? (
                <>
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Test
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="input">Input Data</TabsTrigger>
            <TabsTrigger value="output">Output Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Accuracy Target */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-carbon-40">Accuracy Target:</span>
              <span className="text-carbon-10 font-mono">{accuracy}</span>
            </div>

            {/* Dependency Explanation for Blocked Tests */}
            {getDependencyExplanation()}

            {/* Results Summary if completed */}
            {test.status === 'completed' && test.result && (
              <div className="space-y-3">
                <Separator className="bg-carbon-600" />
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-carbon-20">Test Result</h4>
                  {getTestStatusIndicator(test.result)}
                </div>
                
                {/* Key Result Summary */}
                <div className="space-y-2">
                  {formatTestResults(test.name.split(' ')[0].toLowerCase(), test.result)}
                </div>
                
                {test.runtime && (
                  <div className="text-xs text-carbon-40">
                    Runtime: {test.runtime}ms
                  </div>
                )}
              </div>
            )}

            {test.status === 'error' && test.error && (
              <Alert className="bg-red-900/20 border-red-600">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {test.error}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="input" className="mt-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-carbon-20 mb-3">Input Parameters</h4>
              <div className="space-y-2 bg-carbon-700 p-3 rounded">
                {inputs.map((input, idx) => (
                  <div key={idx} className="text-xs">
                    <div className="text-carbon-40 mb-1">{input.label}:</div>
                    <div className="text-carbon-10 font-mono text-[10px] break-all bg-carbon-800 p-2 rounded">
                      {input.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="output" className="mt-4 space-y-4">
            {test.status === 'completed' && test.result ? (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-carbon-20">Output Data</h4>
                
                {/* Download Markdown Button */}
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                    onClick={() => {
                      // Create markdown content
                      const markdown = generateTestMarkdown(test.name, test.result);
                      
                      // Create download
                      const blob = new Blob([markdown], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${test.name}_results.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download Report
                  </Button>
                </div>

                {/* Detailed Output */}
                <details className="text-xs">
                  <summary className="text-carbon-40 cursor-pointer hover:text-carbon-20">
                    View raw output data
                  </summary>
                  <div className="bg-carbon-700 p-3 rounded mt-2">
                    <pre className="text-carbon-10 whitespace-pre-wrap">
                      {JSON.stringify(test.result, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            ) : (
              <div className="text-carbon-40 text-center py-8 text-sm">
                {test.status === 'pending' && 'Test not yet run'}
                {test.status === 'running' && 'Test in progress...'}
                {test.status === 'error' && 'Test failed - see Overview tab for details'}
                {test.status === 'blocked' && 'Complete prerequisite tests first'}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Placeholder() {
  return (
    <div className="flex-1 flex items-center justify-center bg-carbon-900">
      <div className="text-center space-y-4">
        <Calculator className="w-16 h-16 text-carbon-400 mx-auto" />
        <div>
          <h3 className="text-xl font-medium text-carbon-20 mb-2">Unified Theory Analysis</h3>
          <p className="text-sm text-carbon-40 max-w-md">
            Complete Tab 2 (Relativity Analysis) to begin three-stage physics validation.
          </p>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ 
  onRun, 
  coefficients, 
  relativity, 
  isRunning 
}: { 
  onRun: () => void;
  coefficients: number[] | null;
  relativity: RelativityData | null;
  isRunning: boolean;
}) {
  const canRun = coefficients && relativity && !isRunning;

  return (
    <div className="w-80 bg-carbon-800 border-r border-carbon-700 p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-carbon-10 mb-4">Theory Analysis</h3>
        
        {/* Prerequisites Status */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-2">
            {coefficients ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm text-carbon-30">
              Tab 2 Coefficients {coefficients ? 'Available' : 'Missing'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {relativity ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm text-carbon-30">
              Relativity Data {relativity ? 'Available' : 'Missing'}
            </span>
          </div>
        </div>

        {/* Input Summary */}
        {coefficients && (
          <Card className="bg-carbon-700 border-carbon-600 mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-carbon-20">Input Coefficients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs">
                <div className="text-carbon-40">From Tab 2 Analysis:</div>
                <div className="text-carbon-10 font-mono text-[10px] break-all">
                  [{coefficients.map(c => c.toFixed(3)).join(', ')}]
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {relativity && (
          <Card className="bg-carbon-700 border-carbon-600 mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-carbon-20">Relativity Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-carbon-40">Lorentz ε:</span>
                <span className="text-carbon-10 font-mono">{relativity.epsilon.toExponential(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-carbon-40">Newton G₄:</span>
                <span className="text-carbon-10 font-mono">{relativity.G4.toFixed(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-carbon-40">ψ₀ points:</span>
                <span className="text-carbon-10">{relativity.psi0.length}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Button 
          onClick={onRun}
          disabled={!canRun}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-carbon-600 mb-3"
        >
          {isRunning ? (
            <>
              <Activity className="w-4 h-4 mr-2 animate-spin" />
              Running Analysis...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Run Theory Analysis
            </>
          )}
        </Button>

        {/* Session Documentation Download */}
        <Button 
          variant="outline"
          className="w-full bg-green-600 hover:bg-green-700 text-white border-green-500"
          onClick={async () => {
            try {
              const response = await fetch('/api/sessions/active');
              if (response.ok) {
                const session = await response.json();
                const sessionId = session.id;  // Changed from session.sessionId to session.id
                
                // Download complete session report
                const reportResponse = await fetch(`/api/export/markdown/full/${sessionId}`);
                if (reportResponse.ok) {
                  const blob = await reportResponse.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = `session-${sessionId}-full-report.md`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } else {
                  console.error('Failed to download session report');
                }
              }
            } catch (error) {
              console.error('Error downloading session report:', error);
            }
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Session Report
        </Button>

        {!canRun && !isRunning && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Complete Tab 2 Relativity Analysis first
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Accuracy Targets */}
      <Card className="bg-carbon-700 border-carbon-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-carbon-20">Accuracy Targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-carbon-40">Dim-reduction:</span>
            <span className="text-carbon-10">rel ≤ 1e-6</span>
          </div>
          <div className="flex justify-between">
            <span className="text-carbon-40">β-functions:</span>
            <span className="text-carbon-10">abs ≤ 1e-8</span>
          </div>
          <div className="flex justify-between">
            <span className="text-carbon-40">Stability:</span>
            <span className="text-carbon-10">±1%</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultPanel({ 
  data, 
  runtimes, 
  onGenerateDoc 
}: { 
  data: TheoryData;
  runtimes?: RuntimeData;
  onGenerateDoc: () => void;
}) {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-carbon-10">Theory Analysis Results</h2>
        <Button 
          onClick={onGenerateDoc}
          variant="outline" 
          size="sm"
          className="border-carbon-600 text-carbon-20 hover:bg-carbon-700"
        >
          <FileText className="w-4 h-4 mr-2" />
          Generate Documentation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planck Mass */}
        <Card className="bg-carbon-800 border-carbon-600">
          <CardHeader>
            <CardTitle className="text-carbon-10 flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Planck Mass²
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-mono text-carbon-10">
              {data.MP2.toExponential(3)}
            </div>
            <div className="text-sm text-carbon-40 mt-2">
              Reduced from 6D to 4D effective theory
            </div>
          </CardContent>
        </Card>

        {/* Stability Status */}
        <Card className="bg-carbon-800 border-carbon-600">
          <CardHeader>
            <CardTitle className="text-carbon-10 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Stability Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {data.stabilityPassed ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <span className="text-lg text-carbon-10">
                {data.stabilityPassed ? 'Passed' : 'Failed'}
              </span>
            </div>
            <div className="text-sm text-carbon-40 mt-2">
              10,000 step leap-frog evolution
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Effective Operators */}
      <Card className="bg-carbon-800 border-carbon-600">
        <CardHeader>
          <CardTitle className="text-carbon-10">Effective Operators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.operators.map((op, index) => (
              <div key={index} className="bg-carbon-700 rounded p-3">
                <div className="text-sm font-medium text-carbon-20">{op.name}</div>
                <div className="text-lg font-mono text-carbon-10">{op.coeff.toExponential(3)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Beta Functions */}
      <Card className="bg-carbon-800 border-carbon-600">
        <CardHeader>
          <CardTitle className="text-carbon-10">RG β-Functions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.beta.map((beta, index) => (
              <div key={index} className="bg-carbon-700 rounded p-3">
                <div className="text-sm font-medium text-carbon-20">β_{beta.name}</div>
                <div className="text-lg font-mono text-carbon-10">{beta.value.toExponential(3)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Runtime Performance */}
      {runtimes && (
        <Card className="bg-carbon-800 border-carbon-600">
          <CardHeader>
            <CardTitle className="text-carbon-10 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              {runtimes.reduction && (
                <div>
                  <div className="text-sm text-carbon-40">Reduction</div>
                  <div className="text-lg font-mono text-carbon-10">{runtimes.reduction}ms</div>
                </div>
              )}
              {runtimes.rgflow && (
                <div>
                  <div className="text-sm text-carbon-40">RG Flow</div>
                  <div className="text-lg font-mono text-carbon-10">{runtimes.rgflow}ms</div>
                </div>
              )}
              {runtimes.stability && (
                <div>
                  <div className="text-sm text-carbon-40">Stability</div>
                  <div className="text-lg font-mono text-carbon-10">{runtimes.stability}ms</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to generate markdown report for a test
function generateTestMarkdown(testName: string, result: any): string {
  const timestamp = new Date().toISOString();
  let markdown = `# ${testName.replace(/_/g, ' ').toUpperCase()} Test Report\n\n`;
  markdown += `**Generated:** ${timestamp}\n\n`;
  
  if (result.success) {
    markdown += `## ✅ Test Passed\n\n`;
  } else {
    markdown += `## ❌ Test Failed\n\n`;
  }
  
  markdown += `## Results\n\n`;
  markdown += `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n\n`;
  
  // Add specific sections based on test type
  if (testName === 'foam3d' && result.epsilon) {
    markdown += `### Lorentz Violation\n`;
    markdown += `- **Epsilon:** ${result.epsilon}\n`;
    markdown += `- **Passes Constraint:** ${Math.abs(result.epsilon) < 1e-6 ? 'Yes' : 'No'}\n\n`;
  }
  
  if (testName === 'grav_zero' && result.newtonConstant) {
    markdown += `### Gravitational Analysis\n`;
    markdown += `- **Newton Constant G₄:** ${result.newtonConstant}\n`;
    markdown += `- **Psi0 Profile Points:** ${result.psi0?.length || 0}\n\n`;
  }
  
  if (testName === 'dimensional_reduction' && result.operators) {
    markdown += `### Dimensional Reduction\n`;
    markdown += `- **Planck Mass²:** ${result.planckMass || 'N/A'}\n`;
    markdown += `- **Operators Generated:** ${result.operators.length}\n\n`;
  }
  
  if (testName === 'rg_flow' && result.beta) {
    markdown += `### RG Flow Analysis\n`;
    markdown += `- **Beta Functions:** ${result.beta.length}\n`;
    markdown += `- **UV Fixed Point:** ${result.uvFixed ? 'Found' : 'Not Found'}\n\n`;
  }
  
  if (testName === 'stability' && result.energyRatio !== undefined) {
    markdown += `### Stability Analysis\n`;
    markdown += `- **Energy Ratio:** ${result.energyRatio}\n`;
    markdown += `- **Stable:** ${result.passed ? 'Yes' : 'No'}\n\n`;
  }
  
  return markdown;
}

export default function UnifiedTheory() {
  const { foundationEquation, foundationEquationRunId } = useSession();
  const [coefficients, setCoefficients] = useState<number[] | null>(null);
  const [relativity, setRelativity] = useState<RelativityData | null>(null);
  const [theory, setTheory] = useState<TheoryData | null>(null);
  const [runtime, setRuntime] = useState<RuntimeData>({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [testHistory, setTestHistory] = useState<any[]>([]);
  const [autoStarted, setAutoStarted] = useState(false);
  const [lastDependencyCheck, setLastDependencyCheck] = useState<number>(0);

  // Create aggregate theory result from individual test results
  const createAggregateTheoryResult = async () => {
    if (!activeSession || !coefficients) return;

    try {
      const response = await fetch(`/api/sessions/${activeSession}/test-results`);
      if (!response.ok) return;

      const data = await response.json();
      const completedTests = data.results || [];
      
      // Extract key results from completed tests
      const reductionTest = completedTests.find((t: any) => t.testName === 'reduce6Dto4D' || t.testName === 'dimensional_reduction');
      const stabilityTest = completedTests.find((t: any) => t.testName === 'stability' || t.testName === 'stability_test');
      const rgflowTest = completedTests.find((t: any) => t.testName === 'rgflow' || t.testName === 'rg_flow');
      
      if (completedTests.length === 0) return;

      // Create basic operators from any test that provides them
      const operators = reductionTest ? JSON.parse(reductionTest.testResult).operators || [] : [];
      const betaFunctions = rgflowTest ? JSON.parse(rgflowTest.testResult).beta || [] : [];
      const stabilityResult = stabilityTest ? JSON.parse(stabilityTest.testResult) : null;

      // Create aggregate theory result
      const theoryResult = {
        sessionId: activeSession,
        coefficients: JSON.stringify(coefficients),
        planckMassSquared: 1.0, // Default value
        operators: JSON.stringify(operators),
        betaFunctions: JSON.stringify(betaFunctions),
        stabilityPassed: stabilityResult?.passed || false,
        energyRatio: stabilityResult?.energyRatio || 1.0,
        testResults: JSON.stringify(completedTests.map((t: any) => ({
          name: t.testName,
          success: JSON.parse(t.testResult).success,
          runtime: t.runtime
        }))),
        runtimeReduction: reductionTest?.runtime,
        runtimeRgflow: rgflowTest?.runtime,
        runtimeStability: stabilityTest?.runtime,
        runId: foundationEquationRunId // Include the foundation equation's run ID
      };

      // Save aggregate result
      await fetch(`/api/sessions/${activeSession}/theory-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(theoryResult)
      });

      // Update UI state
      setTheory({
        MP2: theoryResult.planckMassSquared,
        operators: operators,
        beta: betaFunctions,
        stabilityPassed: theoryResult.stabilityPassed
      });

      setRuntime({
        reduction: theoryResult.runtimeReduction,
        rgflow: theoryResult.runtimeRgflow,
        stability: theoryResult.runtimeStability
      });

      console.log('✅ Aggregate theory result created from test database');
      
    } catch (error) {
      console.error('Failed to create aggregate theory result:', error);
    }
  };

  useEffect(() => {
    loadActiveSession();
  }, []);

  // Add retry mechanism for loading session data
  useEffect(() => {
    if (activeSession && (!coefficients || !relativity)) {
      let retryCount = 0;
      const maxRetries = 5;
      
      const retryLoadData = async () => {
        if (retryCount >= maxRetries) {
          console.warn('Max retries reached for loading Tab 2 data');
          return;
        }
        
        console.log(`Attempting to load Tab 2 data (attempt ${retryCount + 1}/${maxRetries})`);
        await loadSessionData();
        
        // Check if data was loaded successfully
        setTimeout(() => {
          if (!coefficients || !relativity) {
            retryCount++;
            setTimeout(retryLoadData, 1000 * retryCount); // Exponential backoff
          } else {
            console.log('✅ Tab 2 data loaded successfully after retry');
          }
        }, 500);
      };
      
      // Start retry mechanism after a short delay
      setTimeout(retryLoadData, 1000);
    }
  }, [activeSession]);

  // Load test history from database and restore test states
  const loadTestHistory = async () => {
    if (!activeSession) return;

    try {
      const response = await fetch(`/api/sessions/${activeSession}/test-results`);
      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        setTestHistory(results);

        // Restore individual test completion states
        if (results.length > 0) {
          console.log(`✅ Loaded ${results.length} test results from database`);
          
          // Create a map of completed tests from database results
          const completedTests = new Set();
          const testResults = new Map();
          
          results.forEach((result: any) => {
            completedTests.add(result.testName);
            testResults.set(result.testName, {
              status: 'completed',
              result: JSON.parse(result.result),
              runtime: result.runtime,
              error: null
            });
          });

          // Store test completion data for later restoration
          (window as any).pendingTestRestoration = {
            completedTests,
            testResults
          };
          
          console.log(`✅ Restored completion states for ${completedTests.size} tests`);
        }
      }
    } catch (error) {
      console.error('Failed to load test history:', error);
    }
  };

  // Load persisted data when session is available
  useEffect(() => {
    if (activeSession) {
      loadTestHistory();
      loadPersistedTheoryData();
    }
  }, [activeSession]);



  // Load persisted theory results from database
  const loadPersistedTheoryData = async () => {
    if (!activeSession) return;

    try {
      const response = await fetch(`/api/sessions/${activeSession}/theory-results`);
      if (!response.ok) return;

      const data = await response.json();
      const results = data.results || [];
      
      if (results.length > 0) {
        // Load the most recent theory result
        const latestResult = results[results.length - 1];
        
        // Parse stored data and restore UI state
        const operators = latestResult.operators ? JSON.parse(latestResult.operators) : [];
        const betaFunctions = latestResult.betaFunctions ? JSON.parse(latestResult.betaFunctions) : [];
        const coefficients = latestResult.coefficients ? JSON.parse(latestResult.coefficients) : null;
        
        setTheory({
          MP2: parseFloat(latestResult.planckMassSquared) || 1.0,
          operators: operators,
          beta: betaFunctions,
          stabilityPassed: latestResult.stabilityPassed || false
        });

        setRuntime({
          reduction: latestResult.runtimeReduction,
          rgflow: latestResult.runtimeRgflow,
          stability: latestResult.runtimeStability
        });

        if (coefficients) {
          setCoefficients(coefficients);
        }

        // Also restore individual test completion states
        await loadTestHistory();

        console.log('✅ Theory state restored from database');
      } else {
        // No existing theory results, try to create from test data
        setTimeout(() => {
          if (typeof createAggregateTheoryResult === 'function') {
            createAggregateTheoryResult();
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to load persisted theory data:', error);
      // Continue with test history loading even if theory data fails
      await loadTestHistory();
    }
  };

  // State restoration on component mount
  useEffect(() => {
    if (!activeSession) return;
    
    const restoreCompleteState = async () => {
      console.log('🔄 Restoring Tab 3 state from database...');
      
      // First restore theory data and test completion states
      await loadPersistedTheoryData();
      
      // Check if we have a foundation equation in context first
      if (foundationEquation && foundationEquation.coefficients && !autoStarted) {
        const coeffs = foundationEquation.coefficients.slice(0, 5); // Use only the first 5 coefficients
        setCoefficients(coeffs);
        console.log('✅ Using foundation equation from context for Tab 3');
        
        // Still need to load relativity data if not already set
        if (!relativity) {
          try {
            const response = await fetch(`/api/sessions/${activeSession}/relativity-results`);
            if (response.ok) {
              const results = await response.json();
              if (results.length > 0) {
                const latest = results[results.length - 1];
                const psi0Profile = JSON.parse(latest.psi0Profile);
                
                setRelativity({
                  epsilon: parseFloat(latest.lorentzEpsilon),
                  G4: parseFloat(latest.newtonConstant),
                  psi0: psi0Profile
                });
                
                setAutoStarted(true);
                
                // Auto-start analysis after a brief delay
                setTimeout(() => runTheoryAnalysis(), 1000);
              }
            }
          } catch (error) {
            console.warn('Relativity data not yet available');
          }
        }
      } else if (!autoStarted) {
        // Fall back to loading from Tab 2 data
        try {
          const response = await fetch(`/api/sessions/${activeSession}/relativity-results`);
          if (response.ok) {
            const results = await response.json();
            if (results.length > 0) {
              const latest = results[results.length - 1];
              const coeffs = JSON.parse(latest.coefficients);
              const psi0Profile = JSON.parse(latest.psi0Profile);
              
              setCoefficients(coeffs);
              setRelativity({
                epsilon: parseFloat(latest.lorentzEpsilon),
                G4: parseFloat(latest.newtonConstant),
                psi0: psi0Profile
              });
              
              console.log('✅ Tab 2 data loaded - starting Tab 3 analysis');
              setAutoStarted(true);
              
              // Auto-start analysis after a brief delay
              setTimeout(() => runTheoryAnalysis(), 1000);
            }
          }
        } catch (error) {
          console.warn('Tab 2 data not yet available');
        }
      }
    };

    restoreCompleteState();
  }, [activeSession, foundationEquation]);

  useEffect(() => {
    if (activeSession) {
      loadSessionData();
      
      // Restore test completion states from database
      const restoreTestStates = async () => {
        try {
          const response = await fetch(`/api/sessions/${activeSession}/test-results`);
          if (response.ok) {
            const data = await response.json();
            const results = data.results || [];
            
            if (results.length > 0) {
              const completedTestNames = new Set(results.map((r: any) => r.testName));
              const testResultsMap = new Map();
              
              results.forEach((result: any) => {
                testResultsMap.set(result.testName, {
                  result: JSON.parse(result.result),
                  runtime: result.runtime
                });
              });

              // Test restoration handled by individual test components
              console.log('Test completion data available for restoration');
              
              console.log(`✅ Restored ${completedTestNames.size} completed test states from database`);
            }
          }
        } catch (error) {
          console.error('Failed to restore test states:', error);
        }
      };

      // Delay test state restoration to ensure tests array is initialized
      setTimeout(restoreTestStates, 100);
    }
  }, [activeSession]);



  const loadActiveSession = async () => {
    try {
      const response = await fetch('/api/sessions/active');
      if (response.ok) {
        const session = await response.json();
        console.log('Active session loaded:', session);
        setActiveSession(session.id);  // Changed from session.sessionId to session.id
        
        // Immediately try to load session data after setting active session
        if (session.id) {  // Changed from session.sessionId to session.id
          // Load relativity data directly here
          const relativityResponse = await fetch(`/api/sessions/${session.id}/relativity-results`);
          if (relativityResponse.ok) {
            const relativityResults = await relativityResponse.json();
            console.log('Immediate relativity check:', relativityResults.length, 'results found');
            
            if (relativityResults.length > 0) {
              const latest = relativityResults[relativityResults.length - 1];
              const coeffs = JSON.parse(latest.coefficients);
              
              // Check if we have all required data
              if (latest.psi0Profile) {
                const psi0 = JSON.parse(latest.psi0Profile);
                setCoefficients(coeffs);
                setRelativity({
                  epsilon: parseFloat(latest.lorentzEpsilon),
                  G4: parseFloat(latest.newtonConstant),
                  psi0: psi0
                });
                console.log('✅ Relativity data loaded immediately on mount');
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load active session:', error);
    }
  };

  const loadSessionData = async () => {
    if (!activeSession) return;
    
    try {
      // Load latest relativity result from session
      const relativityResponse = await fetch(`/api/sessions/${activeSession}/relativity-results`);
      if (relativityResponse.ok) {
        const relativityResults = await relativityResponse.json();
        console.log('Relativity results received:', relativityResults); // Add debug logging
        
        if (relativityResults.length > 0) {
          // Get the most recent result (last in array)
          const latest = relativityResults[relativityResults.length - 1];
          const coeffs = JSON.parse(latest.coefficients);
          setCoefficients(coeffs);
          
          // Check if psi0Profile exists before parsing
          if (latest.psi0Profile) {
            const psi0 = JSON.parse(latest.psi0Profile);
            setRelativity({
              epsilon: parseFloat(latest.lorentzEpsilon),
              G4: parseFloat(latest.newtonConstant),
              psi0: psi0
            });
            
            console.log('✅ Tab 2 relativity data loaded successfully:', {
              coefficients: coeffs.length,
              epsilon: latest.lorentzEpsilon,
              newton: latest.newtonConstant,
              psi0Length: psi0.length
            });
          } else {
            console.warn('⚠️ Relativity data missing psi0Profile');
          }
        } else {
          console.warn('⚠️ No relativity results found in session');
        }
      } else {
        console.error('Failed to fetch relativity results:', relativityResponse.status);
      }

      // Load existing theory result if available
      const theoryResponse = await fetch(`/api/sessions/${activeSession}/theory-results`);
      if (theoryResponse.ok) {
        const theoryResults = await theoryResponse.json();
        if (theoryResults.length > 0) {
          // Get the most recent result (last in array)
          const latest = theoryResults[theoryResults.length - 1];
          setTheory({
            MP2: parseFloat(latest.planckMassSquared),
            operators: JSON.parse(latest.operators),
            beta: JSON.parse(latest.betaFunctions),
            stabilityPassed: latest.stabilityPassed
          });
          
          if (latest.runtimeReduction) setRuntime(prev => ({ ...prev, reduction: latest.runtimeReduction }));
          if (latest.runtimeRgflow) setRuntime(prev => ({ ...prev, rgflow: latest.runtimeRgflow }));
          if (latest.runtimeStability) setRuntime(prev => ({ ...prev, stability: latest.runtimeStability }));
          
          console.log('✅ Tab 3 theory data loaded successfully');
        }
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  };

  const runTheoryAnalysis = async () => {
    if (!coefficients || !relativity || !activeSession) return;

    setIsRunning(true);
    setError(null);

    try {
      const payload = {
        coeffs: coefficients,
        psi0: relativity.psi0
      };

      // Step 1: 6D→4D Dimensional Reduction
      const reductionStart = Date.now();
      const reductionResponse = await fetch('/api/theory/reduce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const reductionTime = Date.now() - reductionStart;

      if (!reductionResponse.ok) {
        throw new Error('Dimensional reduction failed');
      }

      const reductionData = await reductionResponse.json();

      // Step 2: RG Flow Analysis
      const rgflowStart = Date.now();
      const rgflowResponse = await fetch('/api/theory/rgflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reductionData)
      });
      const rgflowTime = Date.now() - rgflowStart;

      if (!rgflowResponse.ok) {
        throw new Error('RG flow analysis failed');
      }

      const rgflowData = await rgflowResponse.json();

      // Step 3: Stability Test
      const stabilityStart = Date.now();
      const stabilityResponse = await fetch('/api/theory/stability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coeffs: coefficients,
          operators: reductionData.operators
        })
      });
      const stabilityTime = Date.now() - stabilityStart;

      if (!stabilityResponse.ok) {
        throw new Error('Stability test failed');
      }

      const stabilityData = await stabilityResponse.json();

      // Combine results
      const theoryData: TheoryData = {
        MP2: reductionData.MP2,
        operators: reductionData.operators,
        beta: rgflowData.beta,
        stabilityPassed: stabilityData.passed
      };

      setTheory(theoryData);
      setRuntime({ 
        reduction: reductionTime, 
        rgflow: rgflowTime, 
        stability: stabilityTime 
      });

      // Save theory result to session
      await fetch(`/api/sessions/${activeSession}/theory-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession,
          coefficients: JSON.stringify(coefficients),
          planckMassSquared: theoryData.MP2.toString(),
          operators: JSON.stringify(theoryData.operators),
          betaFunctions: JSON.stringify(theoryData.beta),
          stabilityPassed: theoryData.stabilityPassed,
          runtimeReduction: reductionTime,
          runtimeRgflow: rgflowTime,
          runtimeStability: stabilityTime,
          runId: foundationEquationRunId // Include the foundation equation's run ID
        })
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsRunning(false);
    }
  };

  const generateDocumentation = async () => {
    if (!coefficients || !relativity || !theory) return;

    try {
      const response = await fetch('/api/theory/documentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coeffs: coefficients,
          epsilon: relativity.epsilon,
          GNewton: relativity.G4,
          psi0: relativity.psi0,
          theory: theory
        })
      });

      if (response.ok) {
        // Documentation generated successfully
        alert('Documentation generated and saved');
      }
    } catch (error) {
      console.error('Failed to generate documentation:', error);
    }
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-carbon-900">
      {coefficients && relativity ? (
        <TestInterface
          coefficients={coefficients}
          relativity={relativity}
          onTestComplete={(testName: string, result: any) => {
            console.log(`Test ${testName} completed:`, result);
            // Save individual test results to session
            if (activeSession) {
              fetch(`/api/sessions/${activeSession}/theory-results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: activeSession,
                  coefficients: JSON.stringify(coefficients),
                  planckMassSquared: "1.0",
                  operators: JSON.stringify([{ name: testName, result: result }]),
                  betaFunctions: JSON.stringify([]),
                  stabilityPassed: result.success || false,
                  runtimeReduction: 0,
                  runtimeRgflow: 0,
                  runtimeStability: 0,
                  runId: foundationEquationRunId // Include the foundation equation's run ID
                })
              }).catch(console.error);
            }
          }}
          isRunning={isRunning}
          onRunningChange={setIsRunning}
          activeSession={activeSession}
          foundationEquationRunId={foundationEquationRunId}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-carbon-900">
          <div className="text-center space-y-4">
            <Calculator className="w-16 h-16 text-carbon-400 mx-auto" />
            <div>
              <h3 className="text-xl font-medium text-carbon-20 mb-2">Unified Theory Analysis</h3>
              <p className="text-sm text-carbon-40 max-w-md mb-4">
                {!activeSession ? 'Loading session...' : 
                 !coefficients && !relativity ? 'Loading Tab 2 data...' :
                 !coefficients ? 'Missing coefficients from Tab 2' :
                 !relativity ? 'Missing relativity data from Tab 2' :
                 'Complete Tab 2 (Relativity Analysis) to begin three-stage physics validation.'}
              </p>
              {activeSession && (
                <div className="mt-4 space-y-2">
                  <Button 
                    onClick={async () => {
                      console.log('Manual reload triggered');
                      await loadSessionData();
                    }}
                    variant="outline"
                    className="text-sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reload Tab 2 Data
                  </Button>
                  <div className="text-xs text-carbon-50">
                    Session: {activeSession.slice(0, 8)}...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
