// ---------------------------------------------------------------------------
// src/lib/physicsAccuracy.ts   ──  nur noch Thin-Wrapper für die Shared-Utils
// ---------------------------------------------------------------------------

/* ❶  Alles, was es bereits in der Shared-Lib gibt, unverändert durchreichen */
export * from "@shared/lib/physicsAccuracy";

/* ❷  Zusätzliche Web-UI-Helper, die nur das Frontend braucht */
import { solvedDigits as solvedDigitsShared } from "@shared/lib/physicsAccuracy";
import { C_TARGET, ALPHA_TARGET, G_TARGET } from "@shared/physics/constants";

/** Alias – kompatibel zu alter API */
export const solvedDigits = solvedDigitsShared;
export const digitsSolved = solvedDigitsShared;

/** absolute relative error  e = |model-target| / target */
export const relErr = (model: number, target: number) =>
  Math.abs(model - target) / target;

/** Fortschritts-Balkenbreite (0 – 100 %) linear zu gelösten Stellen */
export const barWidth = (digits: number, full = 16) =>
  Math.round((digits / full) * 100);

/** Komfort-Wrapper für c, α und G  – liefert Fehler, Stellen & Balken-% */
export const cStats = (c_model: number) => {
  const e = relErr(c_model, C_TARGET);
  const d = solvedDigitsShared(e);
  return { e, d, bar: barWidth(d) };
};
export const alphaStats = (a_model: number) => {
  const e = relErr(a_model, ALPHA_TARGET);
  const d = solvedDigitsShared(e);
  return { e, d, bar: barWidth(d) };
};
export const gStats = (g_model: number) => {
  const e = relErr(g_model, G_TARGET);
  const d = solvedDigitsShared(e);
  return { e, d, bar: barWidth(d) };
};

/** Grober Physik-Gesundheits-Check für HUD-Ampel */
export const isPhysicallyHealthy = (deltaC: number, deltaAlpha: number) =>
  deltaC < 1e-6 && deltaAlpha < 1e-6;

export const getHealthLevel = (
  deltaC: number,
  deltaAlpha: number,
): "error" | "warning" | "ok" => {
  if (deltaC > 1e-2 || deltaAlpha > 1e-2) return "error";
  if (deltaC > 1e-4 || deltaAlpha > 1e-4) return "warning";
  return "ok";
};
