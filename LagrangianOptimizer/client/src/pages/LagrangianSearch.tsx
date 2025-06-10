import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import ControlPanel from "@/components/ControlPanel";
import WebGLVisualization from "@/components/WebGLVisualization";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import FoundationEquationDisplay from "@/components/FoundationEquationDisplay";
import SystemHealthDashboard from "@/components/SystemHealthDashboard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useGeneticAlgorithm } from "@/hooks/useGeneticAlgorithm";
import type { GAParameters, GAUpdate } from "@shared/schema";

export default function LagrangianSearch() {
  const [gaParams, setGAParams] = useState<GAParameters>({
    populationSize: 800,
    mutationRate: 0.1,
    mutationSigma: 0.08,
    mutationRateGauge: 0.5,
    mutationSigmaGauge: 0.02,
    mutationRateGrav: 0.8,
    mutationSigmaGrav: 50_000_000,
    crossoverRate: 0.75,
    eliteCount: 8,
    workerThreads: 16,
    gaugeRange: 0.15,
    gravRange: 500_000_000,
    maxGenerations: 30_000,
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

  const { startGA, stopGA, exportResults, isRunning } = useGeneticAlgorithm();

  const { isConnected, connectionStatus } = useWebSocket((update: GAUpdate) => {
    console.log('Received GA update:', update);
    setGAUpdate(update);
  });

  const handleStartGA = async () => {
    try {
      await startGA(gaParams);
    } catch (error) {
      console.error("Failed to start GA:", error);
    }
  };

  const handleStopGA = async () => {
    try {
      await stopGA();
    } catch (error) {
      console.error("Failed to stop GA:", error);
    }
  };

  const handleExport = async () => {
    try {
      await exportResults();
    } catch (error) {
      console.error("Failed to export results:", error);
    }
  };

  return (
    <div className="flex h-full bg-carbon-900 text-carbon-10 font-sans">
      {/* Left Sidebar - Control Panel */}
      <div className="w-80 bg-carbon-800 border-r border-carbon-700 flex flex-col">
        <div className="p-6 border-b border-carbon-700">
          <h1 className="text-xl font-semibold text-carbon-10 mb-2">
            Lagrangian Search
          </h1>
          <p className="text-sm text-carbon-30">
            Field Equation Discovery via Genetic Algorithm
          </p>
          <div className="mt-3 flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs text-carbon-40">{connectionStatus}</span>
          </div>
        </div>

        <ControlPanel
          parameters={gaParams}
          onParametersChange={setGAParams}
          onStart={handleStartGA}
          onStop={handleStopGA}
          onExport={handleExport}
          isRunning={isRunning}
          status={gaUpdate}
        />
      </div>

      {/* Center - 3D Visualization */}
      <div className="flex-1 flex flex-col">
        <div className="bg-carbon-800 border-b border-carbon-700 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-carbon-20">
              6D Foam Visualization
            </h2>
            <div className="flex items-center space-x-2 text-sm text-carbon-40">
              <i className="fas fa-cube" />
              <span>3D Projection</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-carbon-40">Generation:</span>
              <span className="font-mono text-blue-400">
                {gaUpdate.generation}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-carbon-40">Best Fitness:</span>
              <span className="font-mono text-green-400">
                {gaUpdate.best?.fitness?.toExponential(3) || "N/A"}
              </span>
            </div>
          </div>
        </div>

        <ErrorBoundary>
          <WebGLVisualization gaUpdate={gaUpdate} />
        </ErrorBoundary>
      </div>

      {/* Right Sidebar - Statistics */}
      <div className="w-96 bg-carbon-800 border-l border-carbon-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-carbon-700">
          <h2 className="text-lg font-semibold text-carbon-10">
            Performance Analytics
          </h2>
          <p className="text-sm text-carbon-30">
            Real-time GA metrics and chromosome data
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <ErrorBoundary>
            <SystemHealthDashboard gaUpdate={gaUpdate} />
          </ErrorBoundary>
          <ErrorBoundary>
            <FoundationEquationDisplay />
          </ErrorBoundary>
          <ErrorBoundary>
            <PerformanceAnalysis gaUpdate={gaUpdate} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
