import React from "react";
import { GAUpdate } from "@shared/schema";
import { C_TARGET, ALPHA_TARGET, G_TARGET } from "@shared/physics/constants";
import {
  solvedDigits,
  precisionTier,
  kappaToG,
} from "@shared/lib/physicsAccuracy";

/** formats numbers defensiv – gibt "—" zurück falls null, NaN oder ±∞ */
const fmt = (val: number | null | undefined, digits = 16) =>
  val != null && Number.isFinite(val) ? val.toPrecision(digits) : "—";

interface PhysicsHUDProps {
  gaUpdate: GAUpdate;
  deltaC: number;
  deltaAlpha: number;
  deltaG: number;
}

export default function PhysicsHUD({
  gaUpdate,
  deltaC,
  deltaAlpha,
  deltaG,
}: PhysicsHUDProps) {
  const { generation, best } = gaUpdate;
  const fitness = best?.fitness ?? 1;
  const cModel = best?.c_model ?? 0;
  const alphaModel = best?.alpha_model ?? 0;
  const gModel = best?.g_model ?? 0;
  // Fitness-Farbskala
  const getFitnessColor = (f: number) => {
    if (f < 1e-8) return "rgb(0,255,0)";
    if (f < 1e-6) return "rgb(128,255,0)";
    if (f < 1e-4) return "rgb(255,255,0)";
    if (f < 1e-2) return "rgb(255,128,0)";
    return "rgb(255,0,0)";
  };
  const getFitnessCategory = (f: number) => {
    if (f < 1e-8) return "Perfect";
    if (f < 1e-6) return "Excellent";
    if (f < 1e-4) return "Good";
    if (f < 1e-2) return "Fair";
    return "Poor";
  };
  const structErr =
    Math.max(0, Math.abs(best?.coefficients[2] ?? 0) - 0.5) +
    Math.max(0, Math.abs(best?.coefficients[3] ?? 0) - 0.25);

  // für den Mini-Gradient-Bar
  const fitnessNorm = Math.max(
    0,
    Math.min(1, 1 - Math.log10(fitness + 1e-12) / -12),
  );

  const solvedDigitsC = solvedDigits(deltaC);
  const solvedDigitsAlpha = solvedDigits(deltaAlpha);
  const solvedDigitsG = solvedDigits(deltaG);
  // Anzeige von Ziel und aktuell mit genau 16 Dezimalstellen
  const cTargetStr = C_TARGET.toFixed(16);
  const cModelStr = fmt(cModel, 16);

  const alphaTargetStr = ALPHA_TARGET.toFixed(16);
  const alphaModelStr = fmt(alphaModel, 16);

  // Neue Schwellen: ULTRA erst ab 16 gelösten Stellen
  const tierC = precisionTier(solvedDigitsC);
  const tierA = precisionTier(solvedDigitsAlpha);
  const tierG = precisionTier(solvedDigitsG);

  return (
    <div className="physics-hud absolute top-4 right-4 bg-black/80 text-white p-4 rounded-lg min-w-[18rem] backdrop-blur-sm border border-white/20">
      <h3 className="text-lg font-bold mb-3 text-cyan-400">Universe Physics</h3>
      {/* — Status & Errors */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">Generation:</span>
          <span className="font-mono text-yellow-400">{generation}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Fitness F:</span>
          <span
            className="font-mono"
            style={{ color: getFitnessColor(fitness) }}
          >
            {fitness.toExponential(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Δc (brane curvature):</span>
          <span className="font-mono text-blue-400">
            {deltaC.toExponential(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Δα (particle pulse):</span>
          <span className="font-mono text-purple-400">
            {deltaAlpha.toExponential(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">ΔG (gravity field):</span>
          <span className="font-mono text-orange-400">
            {deltaG.toExponential(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Δstruct (shape):</span>
          <span className="font-mono text-pink-400">
            {structErr.toExponential(2)}
          </span>
        </div>
      </div>
      {/* — Fitness-Gradient */}
      <div className="relative h-4 rounded-lg overflow-hidden">
        {/* Hauptfitness */}
        <div
          className="w-full h-1/2"
          style={{
            background:
              "linear-gradient(90deg,#ef4444 0%,#eab308 50%,#10b981 100%)",
          }}
        />
        {/* Structural */}
        <div
          className="w-full h-1/2 translate-y-full"
          style={{
            background:
              "linear-gradient(90deg,#ef4444 0%,#f59e0b 50%,#2563eb 100%)",
          }}
        />
        {/* Marker global */}
        <div
          className="absolute top-0 w-1 h-full bg-white"
          style={{ left: `${fitnessNorm * 100}%` }}
        />
        {/* Marker struct */}
        <div
          className="absolute top-1/2 w-1 h-1/2 bg-white"
          style={{ left: `${Math.min(structErr * 50, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Poor</span>
        <span>Good</span>
        <span>Perfect</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>global</span>
        <span className="pr-4">structural</span>
      </div>
      {/* — Ziel vs. Aktuell (16 Dezimalstellen) */}+
      {/* ─────────── Gravity ────────── */}+
      <div className="mt-4 pt-3 border-t border-white/20 text-xs space-y-1">
        <div className="font-semibold">Newton G:</div>{" "}
        <div className="pl-2 font-mono text-gray-300">
          Target:{" "}
          <span className="text-green-300">{G_TARGET.toPrecision(15)}</span>{" "}
        </div>{" "}
        <div className="pl-2 font-mono text-gray-100">
          Current:{" "}
          <span className="text-white">{fmt(kappaToG(gModel), 15)}</span>{" "}
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-white/20 text-xs space-y-1">
        <div className="font-semibold">Speed of Light (c):</div>
        <div className="pl-2 font-mono text-gray-300">
          Target: <span className="text-green-300">{cTargetStr}</span>
        </div>
        <div className="pl-2 font-mono text-gray-100">
          Current: <span className="text-white">{cModelStr}</span>
        </div>

        <div className="mt-2 font-semibold">Fine Structure (α):</div>
        <div className="pl-2 font-mono text-gray-300">
          Target: <span className="text-green-300">{alphaTargetStr}</span>
        </div>
        <div className="pl-2 font-mono text-gray-100">
          Current: <span className="text-white">{alphaModelStr}</span>
        </div>
      </div>
      {/* — Gelöste Stellen & Precision */}
      <div className="mt-4 pt-3 border-t border-white/20 text-xs space-y-2">
        <div className="flex justify-between">
          <span>Solved Digits (c):</span>
          <span className="font-mono">{solvedDigitsC} / 16</span>
        </div>
        <div className="flex justify-between">
          <span>Solved Digits (α):</span>
          <span className="font-mono">{solvedDigitsAlpha} / 16</span>
        </div>
        <div className="flex justify-between">
          <span>Solved Digits (G):</span>
          <span className="font-mono">{solvedDigitsG} / 16</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span>c precision:</span>
          <span className={tierC.badgeClass}> {tierC.label}</span>
        </div>
        <div className="flex justify-between">
          <span>α precision:</span>
          <span className={tierA.badgeClass}> {tierA.label}</span>
        </div>
        <div className="flex justify-between">
          <span>G precision:</span>
          <span className={tierG.badgeClass}> {tierG.label}</span>
        </div>
      </div>
      {/* — Zusatzinfo */}
      <div className="mt-4 text-xs text-gray-400 space-y-1">
        <div>• Grid warps ∝ |c_model – c_target|</div>
        <div>• Particles pulse ∝ |α_model – α_target|</div>
        <div>• Gravity fields ∝ |G_model – G_target|</div>
        <div>• Farben verschieben rot → grün, wenn F → 0</div>
      </div>
      {/* — Breakthrough */}
      {fitness < 1e-8 && (
        <div className="mt-3 p-2 bg-emerald-900/50 border border-emerald-400 rounded text-center">
          <div className="text-emerald-400 font-bold animate-pulse">
            🎯 BREAKTHROUGH!
          </div>
          <div className="text-xs text-emerald-300">
            Ultra-precision erreicht
          </div>
        </div>
      )}
    </div>
  );
}
