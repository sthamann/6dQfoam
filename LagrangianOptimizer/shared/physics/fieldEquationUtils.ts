/**
 * Utilities zur Normierung und Konventionierung
 * Normiert c₀ → –0.5 und erzwingt negatives Vorzeichen für c₂ (Masse) und c₄ (Maxwell)
 */

export function normalizeAndConform(raw: number[]): number[] {
  if (raw.length !== 6) {
    throw new Error("Field equation requires exactly 6 coefficients");
  }

  const [c0, c1, c2, c3, c4, c5] = raw;
  const scale = -0.5 / c0;
  function round(v: number) {
    return parseFloat(v.toPrecision(15));
  }
  return [
    -0.5,
    round(c1 * scale),
    round(-Math.abs(c2 * scale)),
    round(c3 * scale),
    round(-Math.abs(c4 * scale)),
    round(c5 * scale), // κ just scales, stays positive/negative
  ];
}
