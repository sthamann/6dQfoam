/**
 * Zentraler Helper für Präzisions­angaben.
 *  - errorRel   := |value_model – value_target| / value_target  (0 … ∞)
 *  - Rückgabe   := Anzahl gelöster Dezimalstellen [0‥16]
 */
export function solvedDigits(errorRel: number, maxDigits = 16): number {
  if (!Number.isFinite(errorRel) || errorRel <= 0) return maxDigits; // perfekt
  return Math.min(maxDigits, Math.max(0, Math.floor(-Math.log10(errorRel))));
}
/**
 * Convert Einstein–Hilbert coupling κ  ➜  Newton’s G
 *
 * • If the input already looks like Newton G (≈10⁻¹³ … 10⁻²) the value is
 *   returned unchanged – you can keep calling the helper everywhere.
 * • Otherwise it is treated as κ and converted via  G = 1 / (16 π |κ|).
 */
export function kappaToG(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;

  const abs = Math.abs(raw);

  // heuristics:   |G|  ~ 6.7 × 10⁻¹¹   ⇒ 10⁻¹³ … 10⁻² is “safe zone”
  if (abs < 1e-2 && abs > 1e-13) {
    // looks like Newton G already – pass through
    return raw;
  }

  // assume κ  and convert
  return raw < 0 ? 1 / (16 * Math.PI * abs) : null;
}
/**
 * Hilfsfunktion → UI-Badge je nach Digit-Zahl
 */
export function precisionTier(digits: number) {
  if (digits >= 12)
    return {
      label: "HIGH-PRECISION",
      badgeClass: "bg-green-900/50 border-green-400 text-green-400",
    };
  if (digits >= 9)
    return {
      label: "MEDIUM-PRECISION",
      badgeClass: "bg-yellow-900/50 border-yellow-400 text-yellow-400",
    };
  return {
    label: "LOW-PRECISION",
    badgeClass: "bg-red-900/50 border-red-400 text-red-400",
  };
}

/**
 * Konvertiert G zu κ (Umkehrfunktion von kappaToG)
 * κ = 1/(16πG) in natürlichen Einheiten
 */
export function GToKappa(G: number): number {
  return -1 / (16 * Math.PI * G);
}
