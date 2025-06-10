import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { GAParameters, GAUpdate, Candidate } from "@shared/schema";
import { Play, Pause, Download, Zap } from "lucide-react";
import { calculatePrecisionDigits, getPrecisionColorClass } from "@/lib/precision-utils";

export default function PhysicsLagrangianSearch() {
  const [gaParams, setGAParams] = useState<GAParameters>({
    populationSize: 800,
    mutationRate: 0.1,
    crossoverRate: 0.75,
    eliteCount: 8,
    workerThreads: 16,
    maxGenerations: 10000,
    usePython: false,
  });

  const [gaUpdate, setGAUpdate] = useState<GAUpdate>({
    generation: 0,
    bestFitness: Infinity,
    averageFitness: Infinity,
    stagnation: 0,
    topCandidates: [],
    throughput: 0,
    status: "stopped",
  });
  const [isRecovering, setIsRecovering] = useState(false);
  const [useUltraMode, setUseUltraMode] = useState(true); // Runmode Ultra toggle (enabled by default for auto-activation)

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Sync Ultra Mode status from server
  useEffect(() => {
    if (gaUpdate.isUltraMode !== undefined && gaUpdate.isUltraMode !== useUltraMode && isRunning) {
      setUseUltraMode(gaUpdate.isUltraMode);
    }
  }, [gaUpdate.isUltraMode]);

  const { connected: isConnected, status: connectionStatus } = useWebSocket((update: GAUpdate) => {
    console.log('Received physics GA update:', update);
    const hasBest = update.best && isFinite(update.best.fitness);
    setIsRecovering(!hasBest && update.status === 'running');
    // --- NEUE ÄNDERUNG START ---
    // Preserve the last known best candidate if the new update doesn't have one.
    setGAUpdate(prevUpdate => {
      return {
        ...update, // Take all new values like generation, status, etc.
        best: update.best || prevUpdate.best, // IMPORTANT: If new 'best' is null/undefined, keep the old one.
        topCandidates: update.topCandidates.length > 0 ? update.topCandidates : prevUpdate.topCandidates, // Also for top candidates
      };
    });
    

    // --- NEUE ÄNDERUNG ENDE ---
  
  }, '/ws/ga2');

  // Handle Ultra Mode toggle during runtime
  const handleUltraModeToggle = async (enabled: boolean) => {
    if (!isRunning) {
      // If GA is not running, just update the local state
      setUseUltraMode(enabled);
      return;
    }

    try {
      const response = await fetch('/api/ga2/toggle-ultra-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to toggle Ultra Mode');
      }
      
      // Update local state based on server response
      setUseUltraMode(result.ultraModeActive);
      
      // Show feedback to user
      if (result.ultraModeActive && enabled) {
        console.log('✅ Ultra Mode activated:', result.message);
      } else if (!result.ultraModeActive && enabled) {
        console.warn('⚠️ Ultra Mode not activated:', result.message);
        setError(result.message);
      }
    } catch (error) {
      console.error("Failed to toggle Ultra Mode:", error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      // Revert local state on error
      setUseUltraMode(!enabled);
    }
  };

  const handleStartGA = async () => {
    try {
      setError(null);
      const response = await fetch('/api/ga2/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...gaParams,
          useUltraMode: useUltraMode,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start GA: ${response.statusText}`);
      }
      
      setIsRunning(true);
    } catch (error) {
      console.error("Failed to start physics GA:", error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleStopGA = async () => {
    try {
      const response = await fetch('/api/ga2/stop', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to stop GA: ${response.statusText}`);
      }
      
      setIsRunning(false);
    } catch (error) {
      console.error("Failed to stop physics GA:", error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/ga2/export');
      if (!response.ok) {
        throw new Error(`Failed to export results: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `physics-ga-results-gen${gaUpdate.generation}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export results:", error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const formatCoefficient = (value: number, label: string) => {
    return (
      <div className="flex justify-between items-center py-1">
        <span className="text-carbon-40 text-sm">{label}:</span>
        <span className="font-mono text-sm">{value.toExponential(4)}</span>
      </div>
    );
  };

  const BestCandidateDisplay = ({ candidate, gaUpdate }: { candidate: Candidate | undefined; gaUpdate: GAUpdate }) => {
     // --- NEUE ÄNDERUNG START ---
  // If no candidate is provided, render a placeholder or nothing at all.
  // This prevents any attempt to access properties of 'undefined'.
  if (!candidate) {
    return (
      <Card className="p-4 bg-carbon-800 border-carbon-700">
        <h3 className="text-lg font-semibold mb-3 text-cyan-400">Best Candidate</h3>
        <div className="flex items-center justify-center h-full text-carbon-400">
          <p>Searching for a valid candidate...</p>
        </div>
      </Card>
    );
  }
    return (
      <Card className="p-4 bg-carbon-800 border-carbon-700">
        <h3 className="text-lg font-semibold mb-3 text-cyan-400">Best Candidate</h3>
        
        <div className="space-y-3">
          {/* Fitness Score */}
          <div className="flex justify-between items-center">
            <span className="text-carbon-40">Fitness:</span>
            <span className="font-mono text-green-400">{candidate.fitness.toExponential(6)}</span>
          </div>

          {/* VEV Display */}
          {candidate.phi0 !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-carbon-40">Vacuum Expectation Value (φ₀):</span>
              <span className="font-mono text-purple-400">{candidate.phi0.toFixed(6)}</span>
            </div>
          )}

          {/* Coupling Constants */}
          <div className="border-t border-carbon-600 pt-2">
            <h4 className="text-sm font-semibold text-carbon-20 mb-2">
              Coupling Constants
              {gaUpdate.isUltraMode && (
                <span className="ml-2 text-xs font-normal text-yellow-400">
                  (g_em = c₃ enforced)
                </span>
              )}
            </h4>
            {candidate.g_em !== undefined && (
              <div className="flex justify-between items-center py-1">
                <span className="text-carbon-40 text-sm">g_em (EM coupling):</span>
                <span className={`font-mono text-sm ${
                  gaUpdate.isUltraMode ? 'text-yellow-400' : ''
                }`}>
                  {candidate.g_em.toExponential(4)}
                  {gaUpdate.isUltraMode && candidate.coefficients[3] !== undefined && 
                    Math.abs(candidate.g_em - candidate.coefficients[3]) < 1e-10 && (
                      <span className="ml-2 text-xs text-yellow-400">= c₃</span>
                    )
                  }
                </span>
              </div>
            )}
            {candidate.xi !== undefined && formatCoefficient(candidate.xi, "ξ (Grav coupling)")}
          </div>

          {/* Effective Constants */}
          <div className="border-t border-carbon-600 pt-2">
            <h4 className="text-sm font-semibold text-carbon-20 mb-2">Effective Constants</h4>
            <div className="flex justify-between items-center py-1">
              <span className="text-carbon-40 text-sm">α_eff:</span>
              <span className="font-mono text-sm">{candidate.alpha_model.toExponential(8)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-carbon-40 text-sm">G_eff:</span>
              <span className="font-mono text-sm">{candidate.g_model.toExponential(8)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-carbon-40 text-sm">c_model:</span>
              <span className="font-mono text-sm">{candidate.c_model.toExponential(8)}</span>
            </div>
          </div>

          {/* Elegance Score */}
          {candidate.elegance_score !== undefined && (
            <div className="border-t border-carbon-600 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-carbon-40">Elegance Score:</span>
                <div className="flex items-center gap-2">
                  <Progress value={candidate.elegance_score * 100} className="w-20 h-2" />
                  <span className="font-mono text-sm text-yellow-400">
                    {(candidate.elegance_score * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              {candidate.elegance_details && (
                <div className="mt-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-carbon-50">c₃ proximity to 1/8π:</span>
                    <span>{(candidate.elegance_details.c3_elegance * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-carbon-50">Coupling simplicity:</span>
                    <span>{(candidate.elegance_details.coupling_simplicity * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-carbon-50">Mathematical relations:</span>
                    <span>{(candidate.elegance_details.relation_bonus * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* All Coefficients */}
          <div className="border-t border-carbon-600 pt-2">
            <h4 className="text-sm font-semibold text-carbon-20 mb-2">All Coefficients</h4>
            {candidate.coefficients.map((coeff, idx) => (
              <div key={idx} className="flex justify-between items-center py-0.5">
                <span className="text-carbon-50 text-xs">c{idx}:</span>
                <span className="font-mono text-xs">{coeff.toExponential(4)}</span>
              </div>
            ))}
          </div>
          
          {/* Field Equation */}
          <div className="border-t border-carbon-600 pt-2">
            <h4 className="text-sm font-semibold text-carbon-20 mb-2">Unified Field Lagrangian</h4>
            <div className="bg-carbon-850 p-3 rounded-lg">
              {(() => {
                const [c0, c1, c2, c3, g_em, xi] = candidate.coefficients;
                  
                  // Format coefficients nicely
                  const formatCoeff = (val: number): string => {
                    if (Math.abs(val) < 1e-10) return "0";
                    if (Math.abs(val) >= 1000 || Math.abs(val) < 0.001) {
                      return val.toExponential(3);
                    }
                    return val.toPrecision(4);
                  };
                  
                  // Helper to add terms with correct signs
                  const addTerm = (coeff: number, term: string, first: boolean = false): string => {
                    if (Math.abs(coeff) < 1e-10) return "";
                    const sign = coeff >= 0 ? "+" : "";
                    const prefix = first ? "" : " " + sign + " ";
                    return prefix + formatCoeff(coeff) + term;
                  };
                  
                  return (
                    <div className="text-sm font-mono text-center mb-3 text-green-400 space-y-2">
                      <div className="text-lg">ℒ =</div>
                      
                      {/* Kinetic terms */}
                      <div className="pl-4">
                        <span className="text-cyan-400">
                          {addTerm(c0, "(∂ₜφ)²", true)}
                          {addTerm(c1, "(∇φ)²")}
                        </span>
                        <span className="text-xs text-carbon-50 ml-2">← kinetic</span>
                      </div>
                      
                      {/* Potential terms */}
                      <div className="pl-4">
                        <span className="text-purple-400">
                          {addTerm(-c2/2, "φ²")}
                          {addTerm(c3/4, "(∂ₜφ)²φ²")}
                        </span>
                        <span className="text-xs text-carbon-50 ml-2">← potential</span>
                      </div>
                      
                      {/* EM coupling */}
                      {Math.abs(g_em) > 1e-10 && (
                        <div className="pl-4">
                          <span className="text-yellow-400">
                            + {formatCoeff(g_em)}φ²FᵤᵥF^ᵤᵥ
                            {gaUpdate.isUltraMode && " (≡ c₃φ²FᵤᵥF^ᵤᵥ)"}
                          </span>
                          <span className="text-xs text-carbon-50 ml-2">← EM coupling</span>
                        </div>
                      )}
                      
                      {/* Gravity coupling */}
                      <div className="pl-4">
                        <span className="text-blue-400">
                          {Math.abs(xi) > 1e-10 
                            ? `+ ${formatCoeff(xi/2)}φ²R`
                            : "+ ½(M²ₚₗ)R"
                          }
                        </span>
                        <span className="text-xs text-carbon-50 ml-2">← gravity</span>
                      </div>
                    </div>
                  );
                })()}
              
              {/* Derived quantities */}
              <div className="mt-3 pt-3 border-t border-carbon-700 grid grid-cols-2 gap-2 text-xs">
                <div className="text-carbon-30">
                  <span className="text-carbon-50">VEV:</span> φ₀ = {candidate.phi0?.toFixed(6) || "0"}
                </div>
                <div className="text-carbon-30">
                  <span className="text-carbon-50">M_pl,eff:</span> {
                    (() => {
                      const xi = candidate.coefficients[5];
                      const phi0 = candidate.phi0 || 0;
                      const mPlanckEff = Math.sqrt(Math.max(0, 1 - xi * phi0 * phi0));
                      return isFinite(mPlanckEff) ? mPlanckEff.toFixed(6) : "1.000000";
                    })()
                  }
                </div>
                {candidate.phi0 && candidate.phi0 > 0 && (
                  <>
                    <div className="text-carbon-30 col-span-2">
                      <span className="text-carbon-50">Potential minimum:</span> V(φ₀) = {
                        (() => {
                          const c2 = candidate.coefficients[2];
                          const c3 = candidate.coefficients[3];
                          const phi0 = candidate.phi0 || 0;
                          const V = -0.25 * c2 * c2 / c3;
                          return V.toExponential(3);
                        })()
                      }
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex h-full bg-carbon-900 text-carbon-10 font-sans">
      {/* Left Sidebar - Control Panel */}
      <div className="w-80 bg-carbon-800 border-r border-carbon-700 flex flex-col">
        <div className="p-6 border-b border-carbon-700">
          <h1 className="text-xl font-semibold text-carbon-10 mb-2">
            Physics-Based Lagrangian Search
          </h1>
          <p className="text-sm text-carbon-30 mb-3">
            Unified Field Theory with VEV & Coupling Constants
          </p>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="bg-purple-900/30 text-purple-300">
              6D Quantum Foam Model
            </Badge>
            {gaUpdate.isUltraMode && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                <Zap className="h-3 w-3 mr-1" />
                Ultra Mode
              </Badge>
            )}
          </div>
          <div className="mt-3 flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs text-carbon-40">{connectionStatus}</span>
          </div>
        </div>

        {/* GA Parameters */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Card className="p-4 bg-carbon-850 border-carbon-700">
            <h3 className="text-sm font-semibold mb-3">GA Parameters</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-carbon-40">Population Size</label>
                <Slider
                  value={[gaParams.populationSize]}
                  onValueChange={([v]) => setGAParams({ ...gaParams, populationSize: v })}
                  min={100}
                  max={2000}
                  step={100}
                  className="mt-1"
                />
                <div className="text-xs text-carbon-50 mt-1">{gaParams.populationSize}</div>
              </div>

              <div>
                <label className="text-xs text-carbon-40">Mutation Rate</label>
                <Slider
                  value={[gaParams.mutationRate]}
                  onValueChange={([v]) => setGAParams({ ...gaParams, mutationRate: v })}
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  className="mt-1"
                />
                <div className="text-xs text-carbon-50 mt-1">{gaParams.mutationRate.toFixed(2)}</div>
              </div>

              <div>
                <label className="text-xs text-carbon-40">Max Generations</label>
                <Slider
                  value={[gaParams.maxGenerations]}
                  onValueChange={([v]) => setGAParams({ ...gaParams, maxGenerations: v })}
                  min={1000}
                  max={50000}
                  step={1000}
                  className="mt-1"
                />
                <div className="text-xs text-carbon-50 mt-1">{gaParams.maxGenerations}</div>
              </div>
            </div>
            
            {/* Ultra Mode Toggle */}
            <div className="border-t border-carbon-700 mt-4 pt-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="ultra-mode-switch" className="text-xs text-carbon-40">
                  Runmode Ultra (g_em=c₃)
                </Label>
                <Switch
                  id="ultra-mode-switch"
                  checked={useUltraMode}
                  onCheckedChange={handleUltraModeToggle}
                />
              </div>
              <p className="text-xs text-carbon-50 mt-1">
                When α and G reach 5+ digits precision, enforces g_em=c₃ to focus on gravity optimization.
              </p>
              
              {/* Precision status display */}
              {gaUpdate.best && isRunning && (
                <div className="mt-3 p-2 bg-carbon-900 rounded">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-carbon-50">α precision:</span>
                      <span className={`font-mono ${getPrecisionColorClass(gaUpdate.best.delta_alpha)}`}>
                        {calculatePrecisionDigits(gaUpdate.best.delta_alpha)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-carbon-50">G precision:</span>
                      <span className={`font-mono ${getPrecisionColorClass(gaUpdate.best.delta_g)}`}>
                        {calculatePrecisionDigits(gaUpdate.best.delta_g)}
                      </span>
                    </div>
                    {!gaUpdate.isUltraMode && useUltraMode && (
                      <div className="text-amber-400 text-xs mt-2">
                        ⏳ Ultra Mode will activate when both reach 5+ digits
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Control Buttons */}
          <div className="space-y-2">
            <Button
              onClick={isRunning ? handleStopGA : handleStartGA}
              className="w-full"
              variant={isRunning ? "destructive" : "default"}
            >
              {isRunning ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Stop GA
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start GA
                </>
              )}
            </Button>
            
            <Button
              onClick={handleExport}
              variant="outline"
              className="w-full"
              disabled={!gaUpdate.best}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
          </div>

          {error && (
            <Card className="p-3 bg-red-900/20 border-red-800">
              <p className="text-sm text-red-400">{error}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Center - Main Display */}
      <div className="flex-1 flex flex-col">
        <div className="bg-carbon-800 border-b border-carbon-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-carbon-20">
              Evolution Progress
            </h2>
            <div className="flex items-center space-x-6">
              {gaUpdate.isUltraMode && (
                <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                  <Zap className="h-3 w-3 mr-1.5" />
                  Ultra Mode Active
                </Badge>
              )}
              <div className="flex items-center space-x-2">
                <span className="text-carbon-40 text-sm">Generation:</span>
                <span className="font-mono text-blue-400">
                  {gaUpdate.generation} / {gaParams.maxGenerations}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-carbon-40 text-sm">Throughput:</span>
                <span className="font-mono text-green-400">
                  {gaUpdate.throughput} chr/s
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            {/* Best Candidate */}
            <ErrorBoundary>
              <BestCandidateDisplay candidate={gaUpdate.best} gaUpdate={gaUpdate} />
            </ErrorBoundary>

            {/* Top Candidates List */}
            <Card className="p-4 bg-carbon-800 border-carbon-700">
              <h3 className="text-lg font-semibold mb-3 text-cyan-400">Top Candidates</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {gaUpdate.topCandidates.map((candidate, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-carbon-850 rounded-lg border border-carbon-700"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold">Rank #{idx + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        Fitness: {candidate.fitness.toExponential(3)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-carbon-50">α_eff:</span>
                        <span className="ml-1 font-mono">{candidate.alpha_model.toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-carbon-50">G_eff:</span>
                        <span className="ml-1 font-mono">{candidate.g_model.toExponential(3)}</span>
                      </div>
                      {candidate.elegance_score !== undefined && (
                        <div>
                          <span className="text-carbon-50">Elegance:</span>
                          <span className="ml-1 font-mono text-yellow-400">
                            {(candidate.elegance_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Evolution Charts */}
            <Card className="p-4 bg-carbon-800 border-carbon-700 col-span-2">
              <h3 className="text-lg font-semibold mb-3 text-cyan-400">Evolution Metrics</h3>
              <div className="h-64 flex items-center justify-center text-carbon-50">
                {/* TODO: Add evolution charts here */}
                <p>Evolution charts will be displayed here</p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Physics Insights */}
      <div className="w-96 bg-carbon-800 border-l border-carbon-700 flex flex-col">
        <div className="p-4 border-b border-carbon-700">
          <h2 className="text-lg font-semibold text-carbon-10">
            Physics Insights
          </h2>
          <p className="text-sm text-carbon-30">
            Emergent physics from unified field theory
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {gaUpdate.best && (
            <>
              {/* Physical Interpretation */}
              <Card className="p-4 bg-carbon-850 border-carbon-700">
                <h3 className="text-sm font-semibold mb-3 text-purple-400">Physical Interpretation</h3>
                <div className="space-y-2 text-sm">
                  {gaUpdate.best.phi0 && gaUpdate.best.phi0 > 0 ? (
                    <>
                      <p className="text-carbon-20">
                        The scalar field has a non-zero vacuum expectation value (VEV) of{" "}
                        <span className="font-mono text-purple-300">{gaUpdate.best.phi0.toFixed(4)}</span>,
                        indicating spontaneous symmetry breaking.
                      </p>
                      <p className="text-carbon-20">
                        The effective fine structure constant α_eff emerges from the coupling
                        between the electromagnetic field and the scalar field condensate.
                      </p>
                    </>
                  ) : (
                    <p className="text-carbon-20">
                      The scalar field potential is unstable or has zero VEV,
                      indicating no spontaneous symmetry breaking.
                    </p>
                  )}
                </div>
              </Card>

              {/* Mathematical Beauty */}
              {gaUpdate.best.elegance_score !== undefined && gaUpdate.best.elegance_score > 0.7 && (
                <Card className="p-4 bg-carbon-850 border-carbon-700 border-yellow-800/50">
                  <h3 className="text-sm font-semibold mb-3 text-yellow-400">
                    Mathematical Beauty Detected! ✨
                  </h3>
                  <p className="text-sm text-carbon-20">
                    This solution exhibits high mathematical elegance with special
                    relationships between parameters.
                  </p>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 