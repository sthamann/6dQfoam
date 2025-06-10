/** Grenzwerte & Presets, zentral */
export const TERM_LIMITS = {
  // |c₂|  – Massterm (φ²)
  MASS_MAX: 0.8,
  // |c₃|  – Selbstkopplung (∂ₜφ)² φ²
  INTERACTION_MAX: 0.35,
  // g_em – Electromagnetic coupling range
  EM_COUPLING_MIN: -100,
  EM_COUPLING_MAX: 100,
  // ξ – Gravitational coupling range
  // Must be positive for stable gravity, and small enough to satisfy M_pl² - ξφ² > 0
  // With typical φ₀ values around 1-10, ξ should be < 0.1 for safety
  GRAV_COUPLING_MIN: 0,      // No negative values allowed
  GRAV_COUPLING_MAX: 0.1,    // Conservative upper bound to ensure stability
  LORENTZ_MAX: 0.3, // ~30 % Abweichung – reicht fürs Grob‑Exploring
};

export const PRESET_EXPLORATION = {
  couplingRange: 50,    // Wide range for initial exploration
  mutationSigma: 0.2,
};

export const PRESET_PRECISION = {
  couplingRange: 10,    // Narrower range for fine-tuning
  mutationSigma: 0.05,
};
