/** Grenzwerte & Presets, zentral */
export const TERM_LIMITS = {
  // |c₂|  – Massterm (φ²)
  MASS_MAX: 0.8,
  // |c₃|  – Selbstkopplung (∂ₜφ)² φ²
  INTERACTION_MAX: 0.35,
  // c₄   – Maxwell-Term, Vorzeichen fest
  GAUGE_SIGN: -1,
  // κ-Range in beiden Richtungen
  GRAV_MIN: -8e8,
  GRAV_MAX: 8e8,
  LORENTZ_MAX: 0.3, // ~30 % Abweichung – reicht fürs Grob‑Exploring
};

export const PRESET_EXPLORATION = {
  gaugeRange: 0.2,
  gravRange: 6e8,
  mutationSigma: 0.2,
};

export const PRESET_PRECISION = {
  gaugeRange: 0.05,
  gravRange: 2e8,
  mutationSigma: 0.05,
};
