import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { GAUpdate } from "@shared/schema";
import { kappaToG } from "@shared/lib/physicsAccuracy"; // neu
interface EvaluatorDiagnostics {
  ok: boolean;
  js: {
    coefficients: number[];
    fitness: number;
    c_model: number;
    alpha_model: number;
    g_model: number;
    delta_c: number;
    delta_alpha: number;
    delta_g: number;
    generation: number;
  };
  py: {
    coefficients: number[];
    fitness: number;
    c_model: number;
    alpha_model: number;
    g_model: number;
    delta_c: number;
    delta_alpha: number;
    delta_g: number;
    generation: number;
  };
}

interface SystemHealthProps {
  gaUpdate?: GAUpdate;
}

export default function SystemHealthDashboard({ gaUpdate }: SystemHealthProps) {
  const { data: diagnostics, isLoading } = useQuery<EvaluatorDiagnostics>({
    queryKey: ["/api/diagnostics/evaluator"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="bg-black/40 border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400">Checking system status...</div>
        </CardContent>
      </Card>
    );
  }

  if (!diagnostics) {
    return (
      <Card className="bg-black/40 border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-400">Unable to connect to diagnostics</div>
        </CardContent>
      </Card>
    );
  }

  // Analyze system health - use GA data if available, otherwise use diagnostic consistency
  const jsHealthy = diagnostics.js.fitness < 1e-10;
  const pyHealthy = diagnostics.py.fitness < 1e-10;
  const evaluatorsConsistent = diagnostics.ok;

  // If GA is running, use GA data for physics assessment
  let physicsConsistent = false;
  if (gaUpdate?.best) {
    physicsConsistent =
      Math.abs(gaUpdate.best.c_model - 299792458) < 1 &&
      Math.abs(gaUpdate.best.alpha_model - 0.007297352566405895) < 1e-15;
  } else {
    // When GA isn't running, consider system healthy if evaluators are consistent
    physicsConsistent = evaluatorsConsistent;
  }

  const overallStatus =
    jsHealthy && pyHealthy && physicsConsistent
      ? "healthy"
      : evaluatorsConsistent
        ? "warning"
        : "critical";

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case "critical":
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (healthy: boolean) =>
    healthy ? "text-green-400" : "text-red-400";
  const getStatusBadge = (healthy: boolean) =>
    healthy ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400";

  const formatPrecision = (value: number, target: number) => {
    const error = Math.abs(value - target);
    if (error === 0) return "Perfect";
    const digits = Math.max(
      0,
      Math.floor(-Math.log10(error / Math.abs(target))),
    );
    return `${Math.min(digits, 16)} digits`;
  };

  return (
    <Card className="bg-black/40 border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center gap-2">
          {getStatusIcon(overallStatus)}
          System Health
          <Badge
            className={
              overallStatus === "healthy"
                ? "bg-green-500/20 text-green-400"
                : overallStatus === "warning"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-red-500/20 text-red-400"
            }
          >
            {overallStatus.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Physics Constants Status */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-white font-medium mb-2">Physics Constants</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {gaUpdate?.best ? (
              // Show current genetic algorithm results
              <>
                <div>
                  <div className="text-gray-400">Speed of Light</div>
                  <div
                    className={getStatusColor(
                      Math.abs(gaUpdate.best.c_model - 299792458) < 1,
                    )}
                  >
                    {gaUpdate.best.c_model.toLocaleString()} m/s
                  </div>
                  <div className="text-xs text-gray-500">
                    Precision:{" "}
                    {formatPrecision(gaUpdate.best.c_model, 299792458)}
                  </div>
                  <div className="text-xs text-blue-400">Current GA Result</div>
                </div>
                <div>
                  <div className="text-gray-400">Fine Structure</div>
                  <div
                    className={getStatusColor(
                      Math.abs(
                        gaUpdate.best.alpha_model - 0.007297352566405895,
                      ) < 1e-15,
                    )}
                  >
                    {gaUpdate.best.alpha_model.toPrecision(16)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Precision:{" "}
                    {formatPrecision(
                      gaUpdate.best.alpha_model,
                      0.007297352566405895,
                    )}
                  </div>
                  <div className="text-xs text-blue-400">Current GA Result</div>
                </div>
                <div>
                  <div className="text-gray-400">Newton's G</div>
                  {(() => {
                    const PI = Math.PI;
                    const G_TARGET = 6.6743e-11;
                    const kappa = gaUpdate.best.g_model; //  κ  aus Evaluator
                    const G_calculated = kappa ? kappaToG(kappa) : null; //  ⇒  G
                    return (
                      <>
                        <div
                          className={getStatusColor(
                            G_calculated
                              ? Math.abs(G_calculated - G_TARGET) < 1e-15
                              : false,
                          )}
                        >
                          {G_calculated?.toPrecision(15) ?? "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Precision:{" "}
                          {G_calculated
                            ? formatPrecision(G_calculated, G_TARGET)
                            : "N/A"}
                        </div>
                        <div className="text-xs text-blue-400">
                          Current GA Result
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            ) : (
              // Show diagnostic evaluator results when GA isn't running
              <>
                <div>
                  <div className="text-gray-400">Speed of Light</div>
                  <div
                    className={getStatusColor(
                      Math.abs(diagnostics.py.c_model - 299792458) < 1,
                    )}
                  >
                    {diagnostics.py.c_model.toLocaleString()} m/s
                  </div>
                  <div className="text-xs text-gray-500">
                    Precision:{" "}
                    {formatPrecision(diagnostics.py.c_model, 299792458)}
                  </div>
                  <div className="text-xs text-yellow-400">Diagnostic Test</div>
                </div>
                <div>
                  <div className="text-gray-400">Fine Structure</div>
                  <div
                    className={getStatusColor(
                      Math.abs(
                        diagnostics.py.alpha_model - 0.007297352566405895,
                      ) < 1e-15,
                    )}
                  >
                    {diagnostics.py.alpha_model.toFixed(16)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Precision:{" "}
                    {formatPrecision(
                      diagnostics.py.alpha_model,
                      0.007297352566405895,
                    )}
                  </div>
                  <div className="text-xs text-yellow-400">Diagnostic Test</div>
                </div>
                <div>
                  <div className="text-gray-400">Newton's G</div>
                  {(() => {
                    const PI = Math.PI;
                    const G_TARGET = 6.6743e-11;
                    const kappa = diagnostics.py.g_model;
                    const G_calculated = kappa ? kappaToG(kappa) : null;
                    return (
                      <>
                        <div
                          className={getStatusColor(
                            G_calculated
                              ? Math.abs(G_calculated - G_TARGET) < 1e-15
                              : false,
                          )}
                        >
                          {G_calculated ? G_calculated.toPrecision(15) : "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Precision:{" "}
                          {G_calculated
                            ? formatPrecision(G_calculated, G_TARGET)
                            : "N/A"}
                        </div>
                        <div className="text-xs text-yellow-400">
                          Diagnostic Test
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Evaluator Performance */}
        <div className="border-l-4 border-purple-500 pl-4">
          <h3 className="text-white font-medium mb-2">Evaluator Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Python Evaluator</span>
              <div className="flex items-center gap-2">
                <Badge className={getStatusBadge(pyHealthy)}>
                  {pyHealthy ? "Optimal" : "Issues"}
                </Badge>
                <span className="text-xs text-gray-500">
                  Fitness: {diagnostics.py.fitness.toExponential(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">JavaScript Evaluator</span>
              <div className="flex items-center gap-2">
                <Badge className={getStatusBadge(jsHealthy)}>
                  {jsHealthy ? "Optimal" : "Issues"}
                </Badge>
                <span className="text-xs text-gray-500">
                  Fitness: {diagnostics.js.fitness.toExponential(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* System Status Summary */}
        <div className="border-l-4 border-green-500 pl-4">
          <h3 className="text-white font-medium mb-2">Status Summary</h3>
          <div className="text-sm space-y-1">
            {overallStatus === "healthy" && (
              <div className="text-green-400">
                ✓ All systems operational -{" "}
                {gaUpdate?.best
                  ? "Genetic algorithm running with optimal physics precision"
                  : "Evaluators synchronized and ready for genetic algorithm"}
              </div>
            )}
            {overallStatus === "warning" && (
              <div className="text-yellow-400">
                ⚠{" "}
                {gaUpdate?.best
                  ? "Genetic algorithm active - Physics optimization in progress"
                  : "System ready - Evaluators consistent, awaiting genetic algorithm start"}
              </div>
            )}
            {overallStatus === "critical" && (
              <div className="text-red-400">
                ✗ Evaluator consistency issues detected - JavaScript/Python
                results divergent
              </div>
            )}
            <div className="text-xs text-gray-500 mt-2">
              Last checked: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
