import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Download, Upload } from "lucide-react";
import { FermionRep } from "@shared/schema";

interface AnomalyResult {
  success: boolean;
  anomalies_cancelled: boolean;
  traces: Record<string, string>;
  traces_original?: Record<string, string>;
  GS_factors: Record<string, number> | null;
  fermion_count: number;
  runtime: number;
  error?: string;
}

interface GlobalAnomalyResult {
  success: boolean;
  passed: boolean;
  checks: {
    SU2_Witten: {
      doublets_L: number;
      doublets_R: number;
      even_L: boolean;
      even_R: boolean;
    };
    SU3_pi7: boolean;
  };
  fermion_count: number;
  runtime?: number;
  error?: string;
}

interface AnomalyEditorProps {
  onResult: (result: AnomalyResult) => void;
  onGlobalResult?: (result: GlobalAnomalyResult) => void;
}

export function AnomalyEditor({ onResult, onGlobalResult }: AnomalyEditorProps) {
  const [reps, setReps] = useState<FermionRep[]>([]);
  const [generations, setGenerations] = useState(1);
  const [loading, setLoading] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [result, setResult] = useState<AnomalyResult | null>(null);
  const [globalResult, setGlobalResult] = useState<GlobalAnomalyResult | null>(null);
  const [showDebugTraces, setShowDebugTraces] = useState(false);

  // Load initial data
  useEffect(() => {
    fetch("/api/anomaly/reps")
      .then(r => r.ok ? r.json() : fetch("/api/anomaly/default-reps").then(r => r.json()))
      .then(data => {
        if (data.reps) {
          setReps(data.reps);
        } else if (Array.isArray(data)) {
          setReps(data);
        }
      })
      .catch(console.error);
  }, []);

  const addRep = () => {
    setReps([...reps, {
      group: "SU2",
      dim: 2,
      dynkin: 0.75,
      q_u1: 0.0,
      chirality: "L"
    }]);
  };

  const removeRep = (index: number) => {
    setReps(reps.filter((_, i) => i !== index));
  };

  const updateRep = (index: number, field: keyof FermionRep, value: any) => {
    const newReps = [...reps];
    newReps[index] = { ...newReps[index], [field]: value };
    setReps(newReps);
  };

  const saveReps = async () => {
    try {
      await fetch("/api/anomaly/reps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reps })
      });
    } catch (error) {
      console.error("Failed to save reps:", error);
    }
  };

  const runScan = async () => {
    setLoading(true);
    try {
      await saveReps(); // Save current reps first
      
      const response = await fetch("/api/theory/anomaly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reps, generations })
      });
      
      const scanResult = await response.json();
      setResult(scanResult);
      onResult(scanResult);
    } catch (error) {
      const errorResult: AnomalyResult = {
        success: false,
        anomalies_cancelled: false,
        traces: {},
        GS_factors: null,
        fermion_count: reps.length,
        runtime: 0,
        error: String(error)
      };
      setResult(errorResult);
      onResult(errorResult);
    } finally {
      setLoading(false);
    }
  };

  const runGlobalScan = async () => {
    setGlobalLoading(true);
    try {
      await saveReps(); // Save current reps first
      
      const response = await fetch("/api/theory/global", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reps, generations })
      });
      
      const globalScanResult = await response.json();
      setGlobalResult(globalScanResult);
      if (onGlobalResult) {
        onGlobalResult(globalScanResult);
      }
    } catch (error) {
      const errorResult: GlobalAnomalyResult = {
        success: false,
        passed: false,
        checks: {
          SU2_Witten: { doublets_L: 0, doublets_R: 0, even_L: true, even_R: true },
          SU3_pi7: true
        },
        fermion_count: reps.length,
        runtime: 0,
        error: String(error)
      };
      setGlobalResult(errorResult);
      if (onGlobalResult) {
        onGlobalResult(errorResult);
      }
    } finally {
      setGlobalLoading(false);
    }
  };

  const loadExample = async () => {
    try {
      const response = await fetch("/api/anomaly/default-reps");
      const data = await response.json();
      if (data.reps) {
        setReps(data.reps);
      }
    } catch (error) {
      console.error("Failed to load example:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            6D Fermion Representations
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadExample}>
                <Download className="w-4 h-4 mr-2" />
                Load SM Example
              </Button>
              <Button variant="outline" size="sm" onClick={addRep}>
                <Plus className="w-4 h-4 mr-2" />
                Add Rep
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Dimension</TableHead>
                <TableHead>Dynkin Index</TableHead>
                <TableHead>U(1) Charge</TableHead>
                <TableHead>Chirality</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reps.map((rep, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={rep.group}
                      onValueChange={(value) => updateRep(index, "group", value)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="U1">U(1)</SelectItem>
                        <SelectItem value="SU2">SU(2)</SelectItem>
                        <SelectItem value="SU3">SU(3)</SelectItem>
                        <SelectItem value="SO10">SO(10)</SelectItem>
                        <SelectItem value="E6">E6</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={rep.dim}
                      onChange={(e) => updateRep(index, "dim", parseInt(e.target.value))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={rep.dynkin}
                      onChange={(e) => updateRep(index, "dynkin", parseFloat(e.target.value))}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.001"
                      value={rep.q_u1}
                      onChange={(e) => updateRep(index, "q_u1", parseFloat(e.target.value))}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={rep.chirality}
                      onValueChange={(value) => updateRep(index, "chirality", value)}
                    >
                      <SelectTrigger className="w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="R">R</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRep(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="generations" className="text-sm">Generations:</Label>
                <Input
                  id="generations"
                  type="number"
                  value={generations}
                  onChange={(e) => setGenerations(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20"
                  min="1"
                  max="10"
                />
              </div>
              <span className="text-sm text-muted-foreground">
                Total fermions: {reps.length * generations}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {reps.length} fermion representations × {generations} generations
              </span>
              <div className="flex gap-2">
                <Button onClick={runScan} disabled={loading || reps.length === 0}>
                  {loading ? "Running Local..." : "Local Anomaly Scan"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={runGlobalScan} 
                  disabled={globalLoading || reps.length === 0}
                >
                  {globalLoading ? "Running Global..." : "Global Anomaly Test"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Anomaly Scan Results
              {result.anomalies_cancelled ? (
                <Badge className="bg-green-600">✓ All anomalies cancelled</Badge>
              ) : (
                <Badge variant="destructive">✗ Anomaly detected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded">
                <p className="text-red-700 dark:text-red-300 text-sm">{result.error}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Fermion Count</Label>
                <p className="font-mono">{result.fermion_count}</p>
              </div>
              <div>
                <Label>Runtime</Label>
                <p className="font-mono">{result.runtime}ms</p>
              </div>
            </div>

            {result.traces && Object.keys(result.traces).length > 0 && (
              <div>
                <Label>Anomaly Traces (After Green-Schwarz)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono">
                  {Object.entries(result.traces).map(([trace, value]) => (
                    <div key={trace} className="flex justify-between p-2 bg-muted rounded">
                      <span>{trace}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
                
                {result.traces_original && showDebugTraces && (
                  <>
                    <Label className="mt-4">Original Traces (Before Green-Schwarz)</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono">
                      {Object.entries(result.traces_original).map(([trace, value]) => (
                        <div key={trace} className="flex justify-between p-2 bg-muted/50 rounded">
                          <span>{trace}:</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                {result.traces_original && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDebugTraces(!showDebugTraces)}
                    className="mt-2 text-xs"
                  >
                    {showDebugTraces ? 'Hide' : 'Show'} Debug Traces
                  </Button>
                )}
              </div>
            )}

            {result.GS_factors && (
              <div>
                <Label>Green-Schwarz Factors</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono">
                  {Object.entries(result.GS_factors).map(([factor, value]) => (
                    <div key={factor} className="flex justify-between p-2 bg-muted rounded">
                      <span>{factor}:</span>
                      <span>{value.toExponential(3)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Copy these factors into your Lagrangian for anomaly cancellation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {globalResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Global Anomaly Test Results
              {globalResult.passed ? (
                <Badge className="bg-green-600">✓ All global anomalies cancelled</Badge>
              ) : (
                <Badge variant="destructive">✗ Global anomaly detected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {globalResult.error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded">
                <p className="text-red-700 dark:text-red-300 text-sm">{globalResult.error}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Fermion Count</Label>
                <p className="font-mono">{globalResult.fermion_count}</p>
              </div>
              {globalResult.runtime && (
                <div>
                  <Label>Runtime</Label>
                  <p className="font-mono">{globalResult.runtime}ms</p>
                </div>
              )}
            </div>

            <div>
              <Label>SU(2) Witten Anomaly (π₆)</Label>
              <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-muted rounded">
                <div>
                  <span className="text-xs text-muted-foreground">Left-handed doublets:</span>
                  <p className="font-mono text-sm">{globalResult.checks.SU2_Witten.doublets_L}</p>
                  <span className={`text-xs ${globalResult.checks.SU2_Witten.even_L ? 'text-green-600' : 'text-red-600'}`}>
                    {globalResult.checks.SU2_Witten.even_L ? '✓ Even (safe)' : '✗ Odd (anomalous)'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Right-handed doublets:</span>
                  <p className="font-mono text-sm">{globalResult.checks.SU2_Witten.doublets_R}</p>
                  <span className={`text-xs ${globalResult.checks.SU2_Witten.even_R ? 'text-green-600' : 'text-red-600'}`}>
                    {globalResult.checks.SU2_Witten.even_R ? '✓ Even (safe)' : '✗ Odd (anomalous)'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                The SU(2) Witten anomaly requires an even number of doublets per chirality to avoid global inconsistencies.
              </p>
            </div>

            <div>
              <Label>SU(3) Global Anomaly (π₇)</Label>
              <div className="p-3 bg-muted rounded">
                <span className={`text-sm ${globalResult.checks.SU3_pi7 ? 'text-green-600' : 'text-red-600'}`}>
                  {globalResult.checks.SU3_pi7 ? '✓ No global anomaly' : '✗ Global anomaly detected'}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Fundamental SU(3) representations automatically cancel global anomalies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}