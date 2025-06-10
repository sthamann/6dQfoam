import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Play, Square, Download } from "lucide-react";
import type { GAParameters, GAUpdate } from "@shared/schema";

interface ControlPanelProps {
  parameters: GAParameters;
  onParametersChange: (params: GAParameters) => void;
  onStart: () => void;
  onStop: () => void;
  onExport: () => void;
  isRunning: boolean;
  status: GAUpdate;
}

export default function ControlPanel({
  parameters,
  onParametersChange,
  onStart,
  onStop,
  onExport,
  isRunning,
  status,
}: ControlPanelProps) {
  const updateParameter = (key: keyof GAParameters, value: number) => {
    onParametersChange({
      ...parameters,
      [key]: value,
    });
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6">
      {/* GA Parameters */}
      <Card className="bg-carbon-800 border-carbon-700">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-medium text-carbon-20 uppercase tracking-wide">
            GA Parameters
          </h3>

          <div className="space-y-4">
            <div>
              <Label className="text-sm text-carbon-30">Population Size</Label>
              <div className="mt-2">
                <Input
                  type="number"
                  value={parameters.populationSize}
                  onChange={(e) =>
                    updateParameter("populationSize", parseInt(e.target.value))
                  }
                  min={32}
                  max={512}
                  className="input-field-fix"
                />
                <p className="text-xs text-carbon-50 mt-1">
                  Number of candidate solutions per generation. Higher values explore more field equations but require more computation.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm text-carbon-30">Mutation Rate</Label>
              <div className="mt-2 space-y-2">
                <Slider
                  value={[parameters.mutationRate]}
                  onValueChange={([value]) => updateParameter("mutationRate", value)}
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-carbon-40">
                  <span>0.01</span>
                  <span className="font-mono">{parameters.mutationRate.toFixed(2)}</span>
                  <span>0.50</span>
                </div>
                <p className="text-xs text-carbon-50 mt-1">
                  Probability of coefficient modification per generation. Higher values increase exploration but may disrupt good solutions.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm text-carbon-30">Crossover Rate</Label>
              <div className="mt-2 space-y-2">
                <Slider
                  value={[parameters.crossoverRate]}
                  onValueChange={([value]) => updateParameter("crossoverRate", value)}
                  min={0.3}
                  max={0.95}
                  step={0.05}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-carbon-40">
                  <span>0.30</span>
                  <span className="font-mono">{parameters.crossoverRate.toFixed(2)}</span>
                  <span>0.95</span>
                </div>
                <p className="text-xs text-carbon-50 mt-1">
                  Probability of combining two parent solutions to create offspring. Higher values promote solution mixing.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm text-carbon-30">Elite Count</Label>
              <div className="mt-2">
                <Input
                  type="number"
                  value={parameters.eliteCount}
                  onChange={(e) =>
                    updateParameter("eliteCount", parseInt(e.target.value))
                  }
                  min={2}
                  max={32}
                  className="input-field-fix"
                />
                <p className="text-xs text-carbon-50 mt-1">
                  Number of best solutions preserved unchanged each generation. Prevents loss of good solutions during evolution.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm text-carbon-30">Max Generations</Label>
              <div className="mt-2">
                <Input
                  type="number"
                  value={parameters.maxGenerations}
                  onChange={(e) =>
                    updateParameter("maxGenerations", parseInt(e.target.value))
                  }
                  min={5}
                  max={500}
                  className="input-field-fix"
                />
                <div className="text-xs text-carbon-40 mt-1">
                  Evolution cycles (5-500). Higher values find better solutions.
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm text-carbon-30">Worker Threads</Label>
              <div className="mt-2">
                <Input
                  type="number"
                  value={parameters.workerThreads}
                  onChange={(e) =>
                    updateParameter("workerThreads", parseInt(e.target.value))
                  }
                  min={1}
                  max={16}
                  className="input-field-fix"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control Buttons */}
      <div className="space-y-3">
        <Button
          onClick={onStart}
          disabled={isRunning}
          className={`w-full ${
            isRunning
              ? "bg-carbon-600 text-carbon-40"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? "Running..." : "Start Evolution"}
        </Button>

        <Button
          onClick={onStop}
          disabled={!isRunning}
          variant="destructive"
          className="w-full"
        >
          <Square className="w-4 h-4 mr-2" />
          Stop Evolution
        </Button>

        <Button
          onClick={onExport}
          variant="outline"
          className="w-full bg-carbon-700 hover:bg-carbon-600 text-carbon-20 border-carbon-600"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Candidates
        </Button>
      </div>

      {/* Current Status */}
      <Card className="bg-carbon-800 border-carbon-700">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-medium text-carbon-20 uppercase tracking-wide">
            Status
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-carbon-30">Generation:</span>
              <span className="text-sm font-mono text-carbon-10">
                {status.generation}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-carbon-30">Best Fitness:</span>
              <span className="text-sm font-mono text-carbon-10">
                {status.best?.fitness?.toExponential(2) || "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-carbon-30">Chromosomes/sec:</span>
              <span className="text-sm font-mono text-carbon-10">
                {status.throughput}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Physics Constants */}
      <Card className="bg-carbon-800 border-carbon-700">
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-medium text-carbon-20 uppercase tracking-wide">
            Target Constants
          </h3>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-carbon-30">c (m/s):</span>
              <span className="text-sm font-mono text-carbon-10">
                299,792,458
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-carbon-30">α:</span>
              <span className="text-sm font-mono text-carbon-10">
                7.297×10⁻³
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
