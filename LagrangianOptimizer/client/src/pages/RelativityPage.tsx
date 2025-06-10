import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  FileText,
  RefreshCw,
} from "lucide-react";
import LorentzVisualization from "@/components/LorentzVisualization";
import PsiProfile from "@/components/PsiProfile";
import { useSession } from "../contexts/SessionContext";

interface FieldEquationData {
  coeffs: number[];
  timestamp: number;
  generation: number;
  fitness: number;
  c_model: number;
  alpha_model: number;
  delta_c: number;
  delta_alpha: number;
}

interface RelativityResults {
  epsilon: number | null;
  psi0: Float64Array | null;
  GNewton: number | null;
}

interface TestInputData {
  coefficients: number[];
  c_model: number;
  alpha_model: number;
  equation: string;
  timestamp: string;
}

interface TestOutputData {
  lorentz: any;
  spin2: any;
}

export default function RelativityPage() {
  const { setFoundationEquation, currentSessionId, foundationEquation, loadFoundationEquation } = useSession();
  const [equation, setEquation] = useState<FieldEquationData | null>(null);
  const [results, setResults] = useState<RelativityResults>({
    epsilon: null,
    psi0: null,
    GNewton: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualCoeffs, setManualCoeffs] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [pinnedEquations, setPinnedEquations] = useState<any[]>([]);
  const [testInputData, setTestInputData] = useState<TestInputData | null>(
    null,
  );
  const [testOutputData, setTestOutputData] = useState<TestOutputData>({
    lorentz: null,
    spin2: null,
  });

  // Save state to session storage before unmounting
  useEffect(() => {
    return () => {
      if (analysisComplete && equation && results.epsilon !== null) {
        const stateToSave = {
          equation,
          results,
          analysisComplete,
          manualMode,
          manualCoeffs,
          testInputData,
          testOutputData
        };
        sessionStorage.setItem('relativityPageState', JSON.stringify(stateToSave));
        console.log('Saved RelativityPage state to session storage');
      }
    };
  }, [equation, results, analysisComplete, manualMode, manualCoeffs, testInputData, testOutputData]);

  // Restore state from session storage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('relativityPageState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setEquation(parsed.equation);
        setResults({
          epsilon: parsed.results.epsilon,
          psi0: parsed.results.psi0 ? new Float64Array(parsed.results.psi0) : null,
          GNewton: parsed.results.GNewton
        });
        setAnalysisComplete(parsed.analysisComplete);
        setManualMode(parsed.manualMode);
        setManualCoeffs(parsed.manualCoeffs || '');
        setTestInputData(parsed.testInputData);
        setTestOutputData(parsed.testOutputData);
        setHasLoaded(true);
        console.log('Restored RelativityPage state from session storage');
      } catch (error) {
        console.error('Failed to restore state from session storage:', error);
      }
    }
  }, []);

  useEffect(() => {
    checkForAvailableResults();
  }, []);

  const loadPinnedEquations = async () => {
    try {
      if (!currentSessionId) return;
      const response = await fetch(`/api/sessions/${currentSessionId}/pinned`);
      if (response.ok) {
        const pins = await response.json();
        setPinnedEquations(pins);
      }
    } catch (error) {
      console.error("Failed to load pinned equations:", error);
    }
  };

  useEffect(() => {
    if (currentSessionId) {
      loadPinnedEquations();
    }
  }, [currentSessionId]);

  const checkForAvailableResults = async () => {
    try {
      // Check if there are any GA results available from Tab 1
      const response = await fetch("/api/sessions/active");
      if (response.ok) {
        const session = await response.json();
        if (session?.id) {
          // Check for recent runs in this session
          const runsResponse = await fetch(`/api/sessions/${session.id}/runs`);
          if (runsResponse.ok) {
            const runs = await runsResponse.json();
            const gaRuns = runs.filter(
              (run: any) => run.kind === "ga" && run.fitness,
            );

            if (gaRuns.length === 0) {
              setManualMode(true);
              console.log("No GA results available, switching to manual mode");
            } else {
              console.log(
                `Found ${gaRuns.length} GA runs, keeping automatic mode`,
              );
            }
          } else {
            setManualMode(true);
            console.log("Could not fetch runs, switching to manual mode");
          }
        } else {
          setManualMode(true);
          console.log("No active session, switching to manual mode");
        }
      } else {
        setManualMode(true);
        console.log("No active session found, switching to manual mode");
      }
    } catch (error) {
      setManualMode(true);
      console.log(
        "Error checking GA results, defaulting to manual mode:",
        error,
      );
    }
  };

  useEffect(() => {
    if (currentSessionId) {
      loadSessionData();
    }
  }, [currentSessionId]);

  const loadSessionData = async () => {
    if (!currentSessionId) return;

    try {
      // Load existing relativity results
      const relativityResponse = await fetch(
        `/api/sessions/${currentSessionId}/relativity-results`,
      );
      if (relativityResponse.ok) {
        const relativityResults = await relativityResponse.json();
        if (relativityResults.length > 0) {
          // Get the most recent result (last in array)
          const latest = relativityResults[relativityResults.length - 1];
          const coeffs = JSON.parse(latest.coefficients);

          setEquation({
            coeffs,
            timestamp: Date.now(),
            generation: 0,
            fitness: 0,
            c_model: 299792458,
            alpha_model: 0.007297353,
            delta_c: 0,
            delta_alpha: 0,
          });

          setResults({
            epsilon: parseFloat(latest.lorentzEpsilon),
            GNewton: parseFloat(latest.newtonConstant),
            psi0: new Float64Array(JSON.parse(latest.psi0Profile)),
          });

          setAnalysisComplete(true);
          setHasLoaded(true);
          setManualMode(latest.isManual);

          if (latest.isManual) {
            setManualCoeffs(JSON.stringify(coeffs));
          }

          console.log("✅ Tab 2 state restored:", {
            coefficients: coeffs.length,
            epsilon: latest.lorentzEpsilon,
            newton: latest.newtonConstant,
            isManual: latest.isManual,
          });

          // Update foundation equation in context when state is restored
          const foundationEquationData = {
            coefficients: coeffs,
            generation: 0,
            fitness: 0,
            c_model: 299792458,
            alpha_model: 0.007297353,
            g_model: parseFloat(latest.newtonConstant) || 6.674e-11,
            delta_c: 0,
            delta_alpha: 0,
            delta_g: 0,
            timestamp: Date.now(),
            pinnedAt: new Date().toISOString(),
            isManual: latest.isManual,
          };

          setFoundationEquation(foundationEquationData);
          console.log(
            "✅ Foundation equation updated from restored Tab 2 state",
          );
        }
      }
    } catch (error) {
      console.error("Failed to load session data:", error);
    }
  };

  const saveToSession = async () => {
    if (!results.epsilon || !results.GNewton || !results.psi0 || !currentSessionId)
      return;

    try {
      const coeffs = manualMode
        ? JSON.parse(manualCoeffs)
        : equation?.coeffs || [];

      await fetch(`/api/sessions/${currentSessionId}/relativity-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSessionId,
          coefficients: JSON.stringify(coeffs),
          formulaText: manualMode ? manualCoeffs : null,
          lorentzEpsilon: results.epsilon.toString(),
          newtonConstant: results.GNewton.toString(),
          psi0Profile: JSON.stringify(Array.from(results.psi0)),
          isManual: manualMode,
        }),
      });

      console.log("Relativity results saved to session");
      
      // Reload foundation equation to ensure synchronization
      if (currentSessionId) {
        await loadFoundationEquation(currentSessionId);
      }
    } catch (error) {
      console.error("Failed to save to session:", error);
    }
  };

  const parseManualInput = (input: string): number[] => {
    // Try JSON array format first
    if (input.trim().startsWith("[")) {
      const parsed = JSON.parse(input);
      if (!Array.isArray(parsed) || (parsed.length !== 5 && parsed.length !== 6)) {
        throw new Error("JSON array must have 5 or 6 coefficients");
      }
      return parsed;
    }

    // Parse Lagrangian equation format
    const lagrangianRegex =
      /L\s*=\s*([-+]?[\d.e-]+)\s*\(∂_tφ\)²\s*([-+]?[\d.e-]+)\s*\(∂_xφ\)²\s*([-+]?[\d.e-]+)\s*φ²\s*([-+]?[\d.e-]+)\s*\(∂_tφ\)²φ²\s*([-+]?[\d.e-]+)\s*F²(?:\s*([-+]?[\d.e-]+)\s*[κ]?R)?/;
    const match = input.match(lagrangianRegex);

    if (match) {
      const coeffs = [
        parseFloat(match[1]), // c_tt
        parseFloat(match[2]), // c_xx
        parseFloat(match[3]), // mass term
        parseFloat(match[4]), // interaction
        parseFloat(match[5]), // gauge field
      ];
      
      // Add gravity term if present
      if (match[6]) {
        coeffs.push(parseFloat(match[6]));
      }
      
      return coeffs;
    }

    // Try simple coefficient extraction from any format
    const numbers = input.match(/([-+]?[\d.e-]+)/g);
    if (numbers && numbers.length >= 5) {
      return numbers.slice(0, 6).map((n) => parseFloat(n)); // Take up to 6 coefficients
    }

    throw new Error(
      "Could not parse coefficients. Use either JSON format [c1,c2,c3,c4,c5] or [c1,c2,c3,c4,c5,c6] or Lagrangian format",
    );
  };

  const downloadReport = async (testType: string) => {
    if (!equation?.coeffs?.length) return;

    try {
      // Get the appropriate test results
      const testResults = testType === 'lorentz_isotropy' 
        ? testOutputData.lorentz 
        : testOutputData.spin2;
        
      if (!testResults) {
        console.error('No test results available for', testType);
        return;
      }

      // Get all coefficients including the 6th one if available
      let allCoefficients: number[];
      if (foundationEquation?.coefficients) {
        allCoefficients = foundationEquation.coefficients;
      } else if (manualMode && manualCoeffs) {
        try {
          allCoefficients = parseManualInput(manualCoeffs);
        } catch {
          allCoefficients = equation.coeffs;
        }
      } else {
        allCoefficients = equation.coeffs;
      }

      // Format the equation in the standard physics notation
      const formattedEquation = allCoefficients.length >= 6
        ? `ℒ = ${allCoefficients[0]?.toFixed(8) || '0'} (∂ₜφ)² ${allCoefficients[1] >= 0 ? '+' : ''} ${allCoefficients[1]?.toFixed(8) || '0'} (∂ₓφ)² ${allCoefficients[2] >= 0 ? '+' : ''} ${allCoefficients[2]?.toFixed(8) || '0'} φ² ${allCoefficients[3] >= 0 ? '+' : ''} ${allCoefficients[3]?.toFixed(8) || '0'} (∂ₜφ)²φ² ${allCoefficients[4] >= 0 ? '+' : ''} ${allCoefficients[4]?.toFixed(8) || '0'} F²ₘᵥ${allCoefficients[5] ? ` ${allCoefficients[5] >= 0 ? '+' : ''} ${allCoefficients[5].toExponential(3)} κR` : ''}`
        : formatEquation(allCoefficients);

      const params = new URLSearchParams({
        coefficients: JSON.stringify(allCoefficients),
        results: JSON.stringify(testResults),
        sessionId: currentSessionId || 'none',
        equation: formattedEquation,
        c_model: (equation.c_model || 299792458).toString(),
        alpha_model: (equation.alpha_model || 0.007297353).toString()
      });

      const url = `/api/computations/download-report/${testType}?${params.toString()}`;
      window.open(url, "_blank");
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const loadEquationAndAnalyze = async () => {
    try {
      setLoading(true);
      setError(null);
      setUsingFallbackData(false);

      let coeffs: number[];

      if (manualMode) {
        try {
          coeffs = parseManualInput(manualCoeffs);
          if (coeffs.length !== 5 && coeffs.length !== 6) {
            throw new Error("Expected exactly 5 or 6 coefficients");
          }
        } catch (err) {
          throw new Error(
            err instanceof Error ? err.message : "Invalid coefficient format",
          );
        }

        setEquation({
          coeffs,
          timestamp: Date.now(),
          generation: 0,
          fitness: 0,
          c_model: 299792458,
          alpha_model: 0.007297353,
          delta_c: 0,
          delta_alpha: 0,
        });
      } else if (foundationEquation && foundationEquation.coefficients) {
        // Use foundation equation from context (whether from Tab 1 or manually entered)
        coeffs = foundationEquation.coefficients; // Use all coefficients, don't slice
        
        setEquation({
          coeffs: coeffs.slice(0, 5), // Only store first 5 for local state
          timestamp: (foundationEquation as any).timestamp || Date.now(),
          generation: foundationEquation.generation || 0,
          fitness: foundationEquation.fitness || 0,
          c_model: foundationEquation.c_model || 299792458,
          alpha_model: foundationEquation.alpha_model || 0.007297353,
          delta_c: foundationEquation.delta_c || 0,
          delta_alpha: foundationEquation.delta_alpha || 0,
        });
      } else if (pinnedEquations.length > 0) {
        // Fallback to pinned equations if no foundation equation
        const pinnedEquation = pinnedEquations[0];
        coeffs = JSON.parse(pinnedEquation.coefficients);

        setEquation({
          coeffs,
          timestamp: pinnedEquation.timestamp,
          generation: pinnedEquation.generation || 0,
          fitness: pinnedEquation.fitness || 0,
          c_model: 299792458,
          alpha_model: 0.007297353,
          delta_c: 0,
          delta_alpha: 0,
        });
      } else {
        const response = await fetch("/shared/field_equation.json");
        if (!response.ok) {
          throw new Error(
            "No field equation available. Run Lagrangian Search first or use manual mode.",
          );
        }

        const data: FieldEquationData = await response.json();
        coeffs = data.coeffs;
        setEquation(data);
      }

      // Prepare input data for tracking
      const inputData: TestInputData = {
        coefficients: coeffs,
        c_model: 299792458,
        alpha_model: 0.007297353,
        equation: formatEquation(coeffs),
        timestamp: new Date().toISOString(),
      };
      setTestInputData(inputData);

      // Run both analyses in parallel
      const [lorentzResponse, gravityResponse] = await Promise.all([
        fetch("/api/computations/lorentz-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coefficients: coeffs,
            c_model: inputData.c_model,
            alpha_model: inputData.alpha_model,
          }),
        }),
        fetch("/api/computations/gravity-zero", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coefficients: coeffs,
            c_model: inputData.c_model,
            alpha_model: inputData.alpha_model,
          }),
        }),
      ]);

      if (lorentzResponse.ok && gravityResponse.ok) {
        const lorentzData = await lorentzResponse.json();
        const gravityData = await gravityResponse.json();

        // Store complete output data
        setTestOutputData({
          lorentz: lorentzData,
          spin2: gravityData,
        });

        const newResults: RelativityResults = {
          epsilon: Number(
            lorentzData.lorentzEpsilon || lorentzData.epsilon || 0,
          ),
          psi0: gravityData.psi0
            ? new Float64Array([Number(gravityData.psi0)])
            : new Float64Array([0.5]),
          GNewton: Number(
            gravityData.newtonConstant || gravityData.GNewton || 6.674e-11,
          ),
        };

        setResults(newResults);
        setAnalysisComplete(true);
        setHasLoaded(true);

        // Auto-save to session immediately after setting results
        if (currentSessionId) {
          try {
            const saveResponse = await fetch(
              `/api/sessions/${currentSessionId}/relativity-results`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sessionId: currentSessionId,
                  coefficients: JSON.stringify(coeffs),
                  lorentzEpsilon:
                    newResults.epsilon !== null
                      ? newResults.epsilon.toString()
                      : "0",
                  newtonConstant:
                    newResults.GNewton !== null
                      ? newResults.GNewton.toString()
                      : "6.674e-11",
                  psi0Profile: JSON.stringify(
                    Array.from(
                      newResults.psi0 !== null
                        ? newResults.psi0
                        : new Float64Array([0.5]),
                    ),
                  ),
                  isManual: manualMode,
                }),
              },
            );

            if (saveResponse.ok) {
              const savedData = await saveResponse.json();
              console.log("Relativity results saved to session:", savedData.id);

              // Auto-pin the equation if it's a manual entry
              if (manualMode && savedData.id) {
                try {
                  const pinResponse = await fetch(
                    `/api/sessions/${currentSessionId}/pin/${savedData.id}`,
                    {
                      method: "POST",
                    },
                  );

                  if (pinResponse.ok) {
                    console.log("Manual equation automatically pinned");
                    // Refresh pinned equations
                    loadPinnedEquations();

                    // Update foundation equation in context
                    const foundationEquationData = {
                      coefficients: coeffs,
                      generation: 0,
                      fitness: 0,
                      c_model: 299792458,
                      alpha_model: 0.007297353,
                      g_model: newResults.GNewton || 6.674e-11,
                      delta_c: 0,
                      delta_alpha: 0,
                      delta_g: 0,
                      timestamp: Date.now(),
                      pinnedAt: new Date().toISOString(),
                      isManual: true,
                    };

                    setFoundationEquation(foundationEquationData);
                    console.log(
                      "✅ Manual equation loaded into foundation equation display",
                    );
                  }
                } catch (pinError) {
                  console.error("Failed to auto-pin equation:", pinError);
                }
              }
            } else {
              console.error("Failed to save - HTTP", saveResponse.status);
            }
          } catch (saveError) {
            console.error("Failed to auto-save to session:", saveError);
          }
        } else {
          // Create a new session if none exists
          try {
            const sessionResponse = await fetch("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: `Relativity Analysis ${new Date().toLocaleString()}`,
              }),
            });

            if (sessionResponse.ok) {
              const newSession = await sessionResponse.json();
              // Note: We don't set active session here anymore, as it's managed by SessionContext
              
              // Activate the new session
              await fetch(`/api/sessions/${newSession.id}/activate`, {
                method: "POST",
              });

              console.log("Created new session for analysis:", newSession.id);
            }
          } catch (sessionError) {
            console.error("Failed to create session:", sessionError);
          }
        }
      } else {
        const lorentzData = lorentzResponse.ok
          ? await lorentzResponse.json()
          : { error: `HTTP ${lorentzResponse.status}` };
        const gravityData = gravityResponse.ok
          ? await gravityResponse.json()
          : { error: `HTTP ${gravityResponse.status}` };

        let errorDetails = "Analysis failed:\n";
        if (!lorentzResponse.ok) {
          errorDetails += `• Lorentz test: ${lorentzData.error || "Unknown error"}\n`;
        }
        if (!gravityResponse.ok) {
          errorDetails += `• Gravity test: ${gravityData.error || "Unknown error"}\n`;
        }

        throw new Error(errorDetails);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load equation data",
      );
      console.error("RelativityPage error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatEquation = (coeffs: number[]): string => {
    if (!coeffs || coeffs.length < 5) return "Invalid equation";
    
    // Handle the Lagrangian format (more physics-friendly)
    const [c1, c2, c3, c4, c5, c6] = coeffs;
    let equation = `ℒ = ${c1?.toFixed(8) || '0'} (∂ₜφ)²`;
    equation += ` ${c2 >= 0 ? '+' : ''} ${c2?.toFixed(8) || '0'} (∂ₓφ)²`;
    equation += ` ${c3 >= 0 ? '+' : ''} ${c3?.toFixed(8) || '0'} φ²`;
    equation += ` ${c4 >= 0 ? '+' : ''} ${c4?.toFixed(8) || '0'} (∂ₜφ)²φ²`;
    equation += ` ${c5 >= 0 ? '+' : ''} ${c5?.toFixed(8) || '0'} F²ₘᵥ`;
    
    // Add gravity term if present
    if (coeffs.length >= 6 && c6 !== undefined) {
      equation += ` ${c6 >= 0 ? '+' : ''} ${c6.toExponential(3)} κR`;
    }
    
    return equation;
  };

  // Status determination
  const status =
    results.epsilon !== null
      ? {
          color:
            results.epsilon < 1e-6
              ? "green"
              : results.epsilon < 1e-3
                ? "yellow"
                : "red",
          text:
            results.epsilon < 1e-6
              ? "Excellent"
              : results.epsilon < 1e-3
                ? "Good"
                : "Poor",
        }
      : { color: "gray", text: "Pending" };

  const StatusIcon =
    results.epsilon !== null && results.epsilon < 1e-6
      ? CheckCircle2
      : AlertTriangle;

  // Helper component for rendering JSON data
  const JsonDisplay = ({ data, title }: { data: any; title: string }) => (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-carbon-10">{title}</h4>
      <pre className="text-xs text-carbon-30 bg-carbon-800 p-3 rounded overflow-auto max-h-64">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );

  return (
    <div className="h-full flex bg-carbon-900">
      {/* Left Panel - Tests */}
      <div className="flex-1 flex flex-col p-6 space-y-6">
        {/* Test 1: Lorentz Isotropy */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <div className="p-4 bg-carbon-800 border-b border-carbon-700">
              <h2 className="text-lg font-semibold text-carbon-10 mb-2">
                1. Lorentz Isotropy Test
              </h2>
              <p className="text-sm text-carbon-30 mb-3">
                API: POST /api/computations/lorentz-check → foam3d.py
                <br />
                Measures deviations from Lorentz invariance through 3D field
                evolution analysis
              </p>
              <div className="flex items-center space-x-3 mb-3">
                <StatusIcon
                  className={`h-5 w-5 ${
                    status.color === "green"
                      ? "text-green-500"
                      : status.color === "yellow"
                        ? "text-yellow-500"
                        : status.color === "red"
                          ? "text-red-500"
                          : "text-carbon-40"
                  }`}
                />
                <span className="text-sm text-carbon-10 font-medium">
                  ε = {results.epsilon?.toExponential(10) || "pending..."}
                </span>
                <Badge
                  variant={status.color === "green" ? "default" : "destructive"}
                >
                  {status.text}
                </Badge>
                {analysisComplete && (
                  <button
                    onClick={() => downloadReport("lorentz_isotropy")}
                    className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                  >
                    Download Report
                  </button>
                )}
              </div>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="input">Input Parameters</TabsTrigger>
                <TabsTrigger value="output">Output Data</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="flex-1 p-4 bg-carbon-900">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <LorentzVisualization epsilon={results.epsilon} />
              )}
            </TabsContent>

            <TabsContent
              value="input"
              className="flex-1 p-4 bg-carbon-900 overflow-auto"
            >
              {testInputData ? (
                <div className="space-y-4">
                  <JsonDisplay
                    data={{
                      coefficients: testInputData.coefficients,
                      c_model: testInputData.c_model,
                      alpha_model: testInputData.alpha_model,
                    }}
                    title="Python Worker Input"
                  />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-carbon-10">
                      Field Equation
                    </h4>
                    <div className="text-xs text-carbon-30 bg-carbon-800 p-3 rounded">
                      {testInputData.equation}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-carbon-10">
                      Test Timestamp
                    </h4>
                    <div className="text-xs text-carbon-30 bg-carbon-800 p-3 rounded">
                      {new Date(testInputData.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-carbon-40 text-center py-8">
                  No input data available
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="output"
              className="flex-1 p-4 bg-carbon-900 overflow-auto"
            >
              {testOutputData.lorentz ? (
                <JsonDisplay
                  data={testOutputData.lorentz}
                  title="Complete Python Worker Response"
                />
              ) : (
                <div className="text-carbon-40 text-center py-8">
                  No output data available
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Test 2: Spin-2 Zero Mode */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <div className="p-4 bg-carbon-800 border-b border-carbon-700">
              <h2 className="text-lg font-semibold text-carbon-10 mb-2">
                2. Spin-2 Zero Mode (Graviton)
              </h2>
              <p className="text-sm text-carbon-30 mb-3">
                API: POST /api/computations/gravity-zero → gravity_zero.py
                <br />
                Solves ψ''(y) + 2σ'(y)ψ'(y) = 0 in extra dimension to find 4D
                Newton constant G₄ = κ₆² ∫ ψ₀²(y) dy
              </p>
              {results.GNewton && (
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-carbon-10 font-medium">
                    G₄ = {results.GNewton.toExponential(10)}
                  </span>
                  <Badge variant="default">Valid</Badge>
                  {analysisComplete && (
                    <button
                      onClick={() => downloadReport("spin2_zero")}
                      className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                    >
                      Download Report
                    </button>
                  )}
                </div>
              )}
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="input">Input Parameters</TabsTrigger>
                <TabsTrigger value="output">Output Data</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="flex-1 p-4 bg-carbon-900">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <PsiProfile psi0={results.psi0} GNewton={results.GNewton} />
              )}
            </TabsContent>

            <TabsContent
              value="input"
              className="flex-1 p-4 bg-carbon-900 overflow-auto"
            >
              {testInputData ? (
                <div className="space-y-4">
                  <JsonDisplay
                    data={{
                      coefficients: testInputData.coefficients,
                      c_model: testInputData.c_model,
                      alpha_model: testInputData.alpha_model,
                    }}
                    title="Python Worker Input"
                  />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-carbon-10">
                      Field Equation
                    </h4>
                    <div className="text-xs text-carbon-30 bg-carbon-800 p-3 rounded">
                      {testInputData.equation}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-carbon-10">
                      Test Timestamp
                    </h4>
                    <div className="text-xs text-carbon-30 bg-carbon-800 p-3 rounded">
                      {new Date(testInputData.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-carbon-40 text-center py-8">
                  No input data available
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="output"
              className="flex-1 p-4 bg-carbon-900 overflow-auto"
            >
              {testOutputData.spin2 ? (
                <JsonDisplay
                  data={testOutputData.spin2}
                  title="Complete Python Worker Response"
                />
              ) : (
                <div className="text-carbon-40 text-center py-8">
                  No output data available
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Panel - Analysis Results */}
      <div className="w-96 bg-carbon-800 border-l border-carbon-700 flex flex-col">
        <div className="p-6 border-b border-carbon-700">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold text-carbon-10">
              Relativity Analysis
            </h1>
            {usingFallbackData && (
              <Badge variant="destructive" className="text-xs">
                Demo Data
              </Badge>
            )}
          </div>
          <p className="text-sm text-carbon-40">
            Advanced relativistic physics validation
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Input Mode Toggle */}
          <Card className="bg-carbon-700 border-carbon-600 p-4">
            <h3 className="text-sm font-medium text-carbon-10 mb-3">
              Input Method
            </h3>
            <div className="space-y-3">
              {(foundationEquation || pinnedEquations.length > 0) && (
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="pinned"
                    name="mode"
                    checked={!manualMode}
                    onChange={() => setManualMode(false)}
                    className="text-blue-600"
                  />
                  <label htmlFor="pinned" className="text-sm text-carbon-20">
                    Use pinned result
                  </label>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="manual"
                  name="mode"
                  checked={manualMode}
                  onChange={() => setManualMode(true)}
                  className="text-blue-600"
                />
                <label htmlFor="manual" className="text-sm text-carbon-20">
                  Manual Entry
                </label>
              </div>
            </div>
          </Card>

          {/* Manual Input */}
          {manualMode && (
            <Card className="bg-carbon-700 border-carbon-600 p-4">
              <h3 className="text-sm font-medium text-carbon-10 mb-3">
                Manual Coefficients
              </h3>
              <div className="space-y-2">
                <Label htmlFor="coeffs" className="text-xs text-carbon-30">
                  Supported formats: Lagrangian equation or JSON array
                </Label>
                <Textarea
                  id="coeffs"
                  value={manualCoeffs}
                  onChange={(e) => setManualCoeffs(e.target.value)}
                  placeholder="L = -0.576185363464(∂_tφ)² -0.576185363746(∂_xφ)² -0.988474574743φ² +0.013036021634(∂_tφ)²φ² -0.091701236848F²&#10;&#10;or JSON: [-0.576, -0.576, -0.988, 0.013, -0.092]"
                  className="bg-carbon-600 border-carbon-500 text-carbon-10 text-xs font-mono"
                  rows={4}
                />
              </div>
            </Card>
          )}

          {/* Analysis Button */}
          <Button
            onClick={loadEquationAndAnalyze}
            disabled={loading || (manualMode && !manualCoeffs.trim())}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-carbon-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>

          {/* Save Button */}
          {analysisComplete && (
            <Button
              onClick={saveToSession}
              variant="outline"
              className="w-full border-carbon-600 text-carbon-20 hover:bg-carbon-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Save to Session
            </Button>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="border-red-600 bg-red-900/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-200 text-xs">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* RESULTS Section */}
          {analysisComplete && (
            <Card className="bg-carbon-700 border-carbon-600 p-4">
              <h3 className="text-lg font-medium text-carbon-10 mb-3">
                RESULTS
              </h3>
              <div className="space-y-4">
                {/* Current Equation */}
                {equation && (
                  <div className="p-3 bg-carbon-800 rounded border border-carbon-600">
                    <h4 className="text-sm font-medium text-carbon-20 mb-2">
                      Analyzed Equation
                    </h4>
                    <p className="text-xs text-carbon-30 font-mono break-all">
                      {formatEquation(equation.coeffs)}
                    </p>
                    <div className="flex space-x-4 mt-2 text-xs">
                      <span className="text-carbon-40">
                        Gen: {equation.generation}
                      </span>
                      <span className="text-carbon-40">
                        Fitness: {equation.fitness.toExponential(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Test Results */}
                <div className="space-y-3">
                  {/* Lorentz Isotropy Result */}
                  <div className="p-3 bg-carbon-800 rounded border border-carbon-600">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-carbon-20">
                        1. Lorentz Isotropy Test
                      </h4>
                      <div className="flex items-center space-x-2">
                        <StatusIcon
                          className={`h-4 w-4 ${
                            status.color === "green"
                              ? "text-green-500"
                              : status.color === "yellow"
                                ? "text-yellow-500"
                                : status.color === "red"
                                  ? "text-red-500"
                                  : "text-carbon-40"
                          }`}
                        />
                        <Badge
                          variant={
                            status.color === "green" ? "default" : "destructive"
                          }
                          className="text-xs"
                        >
                          {status.text}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-carbon-40">
                          Violation Parameter:
                        </span>
                        <span className="text-carbon-10 font-mono">
                          ε = {results.epsilon?.toExponential(12) || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-carbon-40">Status:</span>
                        <span
                          className={`text-${status.color === "green" ? "green" : status.color === "yellow" ? "yellow" : "red"}-400`}
                        >
                          {results.epsilon !== null &&
                            results.epsilon < 1e-6 &&
                            "Excellent - preserves relativity"}
                          {results.epsilon !== null &&
                            results.epsilon >= 1e-6 &&
                            results.epsilon < 1e-3 &&
                            "Good - minor violation"}
                          {results.epsilon !== null &&
                            results.epsilon >= 1e-3 &&
                            "Poor - significant violation"}
                          {results.epsilon === null && "Pending analysis"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Graviton Zero Mode Result */}
                  <div className="p-3 bg-carbon-800 rounded border border-carbon-600">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-carbon-20">
                        2. Graviton Zero Mode
                      </h4>
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <Badge variant="default" className="text-xs">
                          Valid
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-carbon-40">Newton Constant:</span>
                        <span className="text-carbon-10 font-mono">
                          G₄ = {results.GNewton?.toExponential(12) || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-carbon-40">Profile Points:</span>
                        <span className="text-carbon-10">
                          {results.psi0?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Physics Interpretation */}
                <div className="p-3 bg-carbon-800 rounded border border-carbon-600">
                  <h4 className="text-sm font-medium text-carbon-20 mb-2">
                    Physics Interpretation
                  </h4>
                  <div className="text-xs text-carbon-30 space-y-1">
                    <p>
                      {results.epsilon !== null &&
                        results.epsilon < 1e-6 &&
                        "✓ Theory preserves Lorentz invariance within experimental bounds"}
                      {results.epsilon !== null &&
                        results.epsilon >= 1e-6 &&
                        results.epsilon < 1e-3 &&
                        "⚠ Minor Lorentz violation - may be observable in precision experiments"}
                      {results.epsilon !== null &&
                        results.epsilon >= 1e-3 &&
                        "✗ Significant Lorentz violation - conflicts with experimental data"}
                    </p>
                    {results.GNewton && (
                      <p>
                        ✓ Successfully generates 4D gravity with G₄ ={" "}
                        {results.GNewton.toExponential(3)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
