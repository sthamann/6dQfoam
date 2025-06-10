// Core computation modules
// export * from './lagrangian'; // Removed - using GA system instead
export * from './gravity-zero';
export * from './foam-3d';
export * from './anomaly-scan';

// Additional computation modules
export * from './beta-2-loop';
export * from './ghost-scan';
export * from './global-anomaly';
export * from './inflation-fit';
export * from './reduce-6d-to-4d';
export * from './rg-flow';
export * from './stability-test';

// New computation modules (tests 10-19)
export * from './sensitivity-heatmap';
export * from './lyapunov-spectrum';
export * from './auto-rg-3loop';
export * from './positivity-unitarity';
export * from './finite-t-phase';
export * from './noise-robustness';
export * from './parameter-inference';
export * from './surrogate-model';
export * from './vacuum-decay';
export * from './einstein-boltzmann';

// Tab2 services (bridge modules)
export { runLorentzCheck } from './tab2_foam-bridge';
export { computeGNewton } from './tab2_gravity-bridge';
export type { LorentzCheckConfig } from './tab2_foam-bridge';
export type { GravityCheckConfig, GravityResult } from './tab2_gravity-bridge';