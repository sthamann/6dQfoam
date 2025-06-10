/**
 * Default configuration for the Lagrangian field equation discovery system
 * Configurable parameters for genetic algorithm and visualization
 */

export const DEFAULT_GA_CONFIG = {
  // Population parameters
  populationSize: 160,
  eliteCount: 4,
  
  // Genetic operators
  mutationRate: 0.12,
  crossoverRate: 0.75,
  tournamentSize: 4,
  
  // Evolution parameters
  maxGenerations: 40,
  convergenceThreshold: 1e-4,
  convergenceGenerations: 5,
  
  // Performance parameters
  workerThreads: 8,
  batchSize: 20,
  
  // Mathematical precision
  coefficientRange: [-10, 10],
  mutationSigma: 0.1,
  
  // Target physics constants
  targetSpeedOfLight: 299792458.0, // m/s
  targetFineStructure: 7.2973525693e-3,
  
  // Fitness thresholds
  excellentFitness: 1e-4,
  goodFitness: 1e-3,
  
  // Visualization parameters
  updateInterval: 100, // ms between updates
  maxParticles: 10000,
  animationFPS: 60
};

export const PHYSICS_CONSTANTS = {
  SPEED_OF_LIGHT: 299792458.0, // m/s (exact)
  FINE_STRUCTURE: 7.2973525693e-3, // dimensionless (CODATA 2018)
  PLANCK_LENGTH: 1.616255e-35, // m (future extension)
  PLANCK_TIME: 5.391247e-44 // s (future extension)
};

export const API_CONFIG = {
  maxConcurrentRuns: 4,
  resultsCacheSize: 100,
  downloadTimeout: 30000, // ms
  statusUpdateInterval: 500 // ms
};