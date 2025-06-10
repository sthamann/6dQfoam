import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, PinOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GAUpdate, Candidate } from "@shared/schema";
import { generateFieldEquationString } from "@shared/physics/fieldEquation";
import { useSession } from "../contexts/SessionContext";

import { C_TARGET, ALPHA_TARGET, G_TARGET } from "@shared/physics/constants";
import { solvedDigits, precisionTier } from "@shared/lib/physicsAccuracy";
import {
  cStats,
  alphaStats,
  gStats,
  isPhysicallyHealthy,
  getHealthLevel,
} from "@/lib/physicsAccuracy";

// Pin candidate function
async function pinCandidateToSession(
  candidate: Candidate, 
  sessionId: string
): Promise<void> {
  // First save the candidate as a run
  const runResponse = await fetch(`/api/sessions/${sessionId}/lagrangian-results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coefficients: JSON.stringify(candidate.coefficients),
      generation: candidate.generation || 0,
      fitness: candidate.fitness.toString(),
      cModel: candidate.c_model?.toString() || '0',
      alphaModel: candidate.alpha_model?.toString() || '0',
      gModel: candidate.g_model?.toString() || '0',
      deltaC: candidate.delta_c?.toString() || '0',
      deltaAlpha: candidate.delta_alpha?.toString() || '0',
      deltaG: candidate.delta_g?.toString() || '0',
      isManual: false
    })
  });

  if (!runResponse.ok) {
    throw new Error('Failed to save candidate to session');
  }

  const savedRun = await runResponse.json();
  
  // Then pin the run
  const pinResponse = await fetch(`/api/sessions/${sessionId}/pin/${savedRun.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!pinResponse.ok) {
    throw new Error('Failed to pin equation');
  }
}

interface PerformanceAnalysisProps {
  gaUpdate: GAUpdate;
}

export default function PerformanceAnalysis({
  gaUpdate,
}: PerformanceAnalysisProps) {
  const { ensureActiveSession, setFoundationEquation } = useSession();
  const { toast } = useToast();

  const handlePinCandidate = async (candidate: Candidate) => {
    try {
      const sessionId = await ensureActiveSession();
      await pinCandidateToSession(candidate, sessionId);
      setFoundationEquation(candidate);
      toast({
        title: "Field equation was saved to database",
        description: "Successfully pinned equation to session and set as foundation equation",
      });
    } catch (error) {
      toast({
        title: "Pin failed",
        description: error instanceof Error ? error.message : "Failed to pin equation",
        variant: "destructive",
      });
    }
  };

  // Pin Button Component
  function PinButton({ candidate, onPin }: { candidate: Candidate; onPin: () => void }) {
    const [isPinning, setIsPinning] = useState(false);

    const handlePin = async () => {
      setIsPinning(true);
      try {
        await onPin();
      } finally {
        setIsPinning(false);
      }
    };

    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
        onClick={handlePin}
        disabled={isPinning}
        title="Pin equation to session"
      >
        {isPinning ? (
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Pin className="h-3 w-3 text-blue-600 dark:text-blue-400" />
        )}
      </Button>
    );
  }

  if (!gaUpdate.best) {
    return (
      <Card className="bg-black/40 border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400">No data available</div>
        </CardContent>
      </Card>
    );
  }

  const {
    c_model,
    alpha_model,
    g_model,
    delta_c,
    delta_alpha,
    delta_g,
    fitness,
  } = gaUpdate.best;

  // Convert gravity coefficient to Newton's constant: G = 1/(16π|κ|)

  const G_calculated = g_model;

  // Calculate precision digits
  // Delegiere an gemeinsamen Helper
  const getDigitPrecision = (value: number, target: number) =>
    solvedDigits(Math.abs(value - target) / Math.abs(target), 16);

  const cDigits = getDigitPrecision(c_model, C_TARGET);
  const alphaDigits = getDigitPrecision(alpha_model, ALPHA_TARGET);
  const gDigits = G_calculated ? getDigitPrecision(G_calculated, G_TARGET) : 0;

  // Format with full precision - preserve trailing zeros for targets to show full precision capability
  const formatFullPrecision = (
    value: number,
    digits: number = 16,
    _isTarget?: boolean, // Unterstrich signalisiert „nicht benutzt“
  ) => value.toPrecision(digits);

  // Ultra-precision threshold for breakthrough detection
  const isUltraPrecision = (fitness: number): boolean => {
    return fitness < 1e-10;
  };

  // Color coding based on precision
  const getPrecisionColor = (digits: number) => {
    if (digits >= 10) return "text-green-400";
    if (digits >= 6) return "text-yellow-400";
    if (digits >= 3) return "text-orange-400";
    return "text-red-400";
  };

  const getConvergenceStatus = (digits: number) => {
    if (digits >= 10)
      return {
        status: "ULTRA-PRECISION",
        color: "bg-green-900/50 border-green-400 text-green-400",
      };
    if (digits >= 7)
      return {
        status: "HIGH-PRECISION",
        color: "bg-blue-900/50 border-blue-400 text-blue-400",
      };
    if (digits >= 4)
      return {
        status: "MEDIUM-PRECISION",
        color: "bg-yellow-900/50 border-yellow-400 text-yellow-400",
      };
    return {
      status: "LOW-PRECISION",
      color: "bg-red-900/50 border-red-400 text-red-400",
    };
  };

  const cStatus = getConvergenceStatus(cDigits);
  const alphaStatus = getConvergenceStatus(alphaDigits);
  const gStatus = getConvergenceStatus(gDigits);

  return (
    <Card className="bg-black/40 border-white/20">
      <CardHeader>
        <CardTitle className="text-white text-lg">
          Performance Analysis
        </CardTitle>
        <div className="text-sm text-gray-400">
          Full-Precision Physics Constants
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Target vs Current Comparison */}
        <div className="space-y-4">
          <div className="text-sm font-semibold text-white border-b border-white/20 pb-2">
            Physics Constants Comparison
          </div>

          {/* Speed of Light */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">
                Speed of Light (c)
              </span>
              <Badge className={cStatus.color}>{cStatus.status}</Badge>
            </div>
            <div className="bg-black/30 p-3 rounded-lg font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Target:</span>
                <span className="text-white">
                  {formatFullPrecision(C_TARGET, 16, true)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current:</span>
                <span className={getPrecisionColor(cDigits)}>
                  {formatFullPrecision(c_model, 16)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Error:</span>
                <span className="text-red-400">{delta_c.toExponential(3)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Digits:</span>
                <span className={getPrecisionColor(cDigits)}>
                  {cDigits} / 16
                </span>
              </div>
            </div>
          </div>

          {/* Fine Structure Constant */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">
                Fine Structure Constant (α)
              </span>
              <Badge className={alphaStatus.color}>{alphaStatus.status}</Badge>
            </div>
            <div className="bg-black/30 p-3 rounded-lg font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Target:</span>
                <span className="text-white">
                  {formatFullPrecision(ALPHA_TARGET, 16)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current:</span>
                <span className={getPrecisionColor(alphaDigits)}>
                  {formatFullPrecision(alpha_model, 16)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Error:</span>
                <span className="text-red-400">
                  {delta_alpha.toExponential(3)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Digits:</span>
                <span className={getPrecisionColor(alphaDigits)}>
                  {alphaDigits} / 16
                </span>
              </div>
            </div>
          </div>

          {/* Newton's Gravitational Constant */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">
                Newton's Gravitational Constant (G)
              </span>
              <Badge className={gStatus.color}>{gStatus.status}</Badge>
            </div>
            <div className="bg-black/30 p-3 rounded-lg font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Target:</span>
                <span className="text-white">{G_TARGET.toPrecision(15)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current:</span>
                <span className={getPrecisionColor(gDigits)}>
                  {G_calculated ? G_calculated.toPrecision(15) : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Error:</span>
                <span className="text-red-400">
                  {G_calculated
                    ? Math.abs(G_calculated - G_TARGET).toPrecision(10)
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Digits:</span>
                <span className={getPrecisionColor(gDigits)}>
                  {gDigits} / 16
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Performance */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-white border-b border-white/20 pb-2">
            Overall Performance
          </div>
          <div className="bg-black/30 p-3 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">Combined Fitness:</span>
              <span className="font-mono text-lg font-bold text-green-400">
                {fitness.toExponential(3)}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-400 to-emerald-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, 100 - fitness * 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-2 text-center">
              {fitness < 0.001
                ? "BREAKTHROUGH ACHIEVED"
                : fitness < 0.01
                  ? "EXCELLENT CONVERGENCE"
                  : fitness < 0.1
                    ? "GOOD PROGRESS"
                    : "SEARCHING..."}
            </div>
          </div>
        </div>

        {/* Generation Info */}
        <div className="text-xs text-gray-400 border-t border-white/10 pt-3">
          <div className="flex justify-between">
            <span>Generation:</span>
            <span className="text-white">{gaUpdate.generation}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Status:</span>
            <span className="text-green-400">{gaUpdate.status}</span>
          </div>
        </div>

        {/* Top Candidates Display */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-white border-b border-white/20 pb-2">
            Top 5 Candidates
          </div>
          {gaUpdate.topCandidates?.slice(0, 5).map((candidate, index) => {
            // Use unified physics accuracy calculations
            const cStats_result = candidate.c_model
              ? cStats(candidate.c_model)
              : { e: 1, d: 0, bar: 0 };
            const alphaStats_result = candidate.alpha_model
              ? alphaStats(candidate.alpha_model)
              : { e: 1, d: 0, bar: 0 };
            const gStats_result = candidate.g_model
              ? gStats(candidate.g_model)
              : { e: 1, d: 0, bar: 0 };

            // Extract values for display
            const cDigits = cStats_result.d;
            const alphaDigits = alphaStats_result.d;
            const gDigits = gStats_result.d;

            // Calculate percentage accuracy from relative error
            const cAccuracy = candidate.c_model
              ? (1 - cStats_result.e) * 100
              : 0;
            const alphaAccuracy = candidate.alpha_model
              ? (1 - alphaStats_result.e) * 100
              : 0;
            const gAccuracy = candidate.g_model
              ? (1 - gStats_result.e) * 100
              : 0;

            return (
              <div
                key={index}
                className="bg-gradient-to-r from-black/40 to-gray-900/40 p-4 rounded-lg border border-white/10 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-lg">
                      #{index + 1}
                    </span>
                    {index === 0 && (
                      <Badge className="bg-yellow-600/20 border-yellow-400 text-yellow-400">
                        BEST
                      </Badge>
                    )}
                    <PinButton 
                      candidate={candidate} 
                      onPin={() => handlePinCandidate(candidate)}
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Fitness</div>
                    <div className="font-mono text-emerald-400 font-bold">
                      {candidate.fitness?.toExponential(3) || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Physics Constants with Progress Bars */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-400 font-medium">
                        Speed of Light
                      </span>
                      <span className="text-blue-300 text-xs font-bold">
                        {cAccuracy.toFixed(6)}%
                      </span>
                    </div>
                    <div className="bg-black/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, cStats_result.bar)}%`,
                        }}
                      />
                    </div>
                    <div className="font-mono text-xs text-blue-300">
                      {formatFullPrecision(candidate.c_model || C_TARGET, 14)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {cDigits} digits precision
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-400 font-medium">
                        Fine Structure Constant
                      </span>
                      <span className="text-purple-300 text-xs font-bold">
                        {alphaAccuracy.toFixed(6)}%
                      </span>
                    </div>
                    <div className="bg-black/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-purple-400 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, alphaStats_result.bar)}%`,
                        }}
                      />
                    </div>
                    <div className="font-mono text-xs text-purple-300">
                      {formatFullPrecision(
                        candidate.alpha_model || ALPHA_TARGET,
                        14,
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {alphaDigits} digits precision
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-orange-400 font-medium">
                        Newton's Gravitational Constant
                      </span>
                      <span className="text-orange-300 text-xs font-bold">
                        {gAccuracy.toFixed(6)}%
                      </span>
                    </div>
                    <div className="bg-black/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-orange-600 to-orange-400 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, gStats_result.bar)}%`,
                        }}
                      />
                    </div>
                    <div className="font-mono text-xs text-orange-300">
                      {candidate.g_model?.toPrecision(15) ?? "N/A"}{" "}
                    </div>
                    <div className="text-xs text-gray-500">
                      {candidate.g_model
                        ? getDigitPrecision(candidate.g_model, G_TARGET) // direkt vergleichen
                        : 0}{" "}
                      digits precision
                    </div>
                  </div>
                </div>

                {/* Full Equation */}
                <div className="border-t border-white/10 pt-2">
                  <div className="text-gray-400 mb-1 text-xs">
                    Lagrangian Field Equation
                  </div>
                  <div className="font-mono text-xs leading-relaxed break-words">
                    {generateFieldEquationString(candidate.coefficients, {
                      normalized: true,
                      showPhysicalSigns: true,
                      precision: 8,
                      format: "unicode",
                    })}
                  </div>
                </div>


              </div>
            );
          })}
        </div>

        {/* Precision Breakthrough Indicator */}
        {(cDigits >= 10 || alphaDigits >= 6) && (
          <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-400 rounded-lg p-3">
            <div className="text-green-400 font-bold text-center animate-pulse">
              PRECISION BREAKTHROUGH
            </div>
            <div className="text-xs text-green-300 text-center mt-1">
              {cDigits >= 10 && "Light speed: Ultra-precision "}
              {alphaDigits >= 6 && "Fine structure: High-precision"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
