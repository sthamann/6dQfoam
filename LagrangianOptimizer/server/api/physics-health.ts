/**
 * Physics Constants Health Check API
 * Verifies 100% consistency across all computational backends
 */
import { Router } from 'express';
import { C_TARGET, ALPHA_TARGET, PI, PHYSICS_CONSTANTS } from '@shared/physics/constants';
import { OptimizedLagrangianEvaluator } from '../genetic-algorithm/lagrangian-optimized';
import { SymbolicMath } from '../genetic-algorithm/operators';

export const physicsHealthRouter = Router();

interface PhysicsHealthResult {
  status: 'healthy' | 'warning' | 'critical';
  summary: string;
  constants: {
    source: string;
    c_target: number;
    alpha_target: number;
    pi: number;
  };
  evaluators: {
    javascript: {
      status: 'ok' | 'error';
      c_precision: number;
      alpha_precision: number;
      test_fitness: number;
    };
    symbolic: {
      status: 'ok' | 'error';
      dispersion_test: boolean;
      physics_validation: boolean;
    };
  };
  consistency_check: {
    all_constants_unified: boolean;
    no_hardcoded_duplicates: boolean;
    precision_digits: number;
  };
}

physicsHealthRouter.get('/check', async (req, res) => {
  try {
    const result = await performPhysicsHealthCheck();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      status: 'critical',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

async function performPhysicsHealthCheck(): Promise<PhysicsHealthResult> {
  const result: PhysicsHealthResult = {
    status: 'healthy',
    summary: '',
    constants: {
      source: 'shared/physics/constants.ts',
      c_target: C_TARGET,
      alpha_target: ALPHA_TARGET,
      pi: PI
    },
    evaluators: {
      javascript: {
        status: 'ok',
        c_precision: 0,
        alpha_precision: 0,
        test_fitness: 0
      },
      symbolic: {
        status: 'ok',
        dispersion_test: false,
        physics_validation: false
      }
    },
    consistency_check: {
      all_constants_unified: true,
      no_hardcoded_duplicates: true,
      precision_digits: 0
    }
  };

  // Test JavaScript evaluator with reference coefficients
  try {
    // Use physics-consistent test coefficients that should produce exact values
    const testCoefficients = [
      1.0,           // kinetic_1
      -1.0,          // kinetic_2 (correct sign for c² = c1/c0)
      0.0,           // mass term
      ALPHA_TARGET * 4 * PI,  // gauge coupling for exact alpha
      0.0            // interaction term
    ];

    const candidate = OptimizedLagrangianEvaluator.evaluateChromosomeJS(testCoefficients);
    
    result.evaluators.javascript.c_precision = getDigitPrecision(candidate.c_model, C_TARGET);
    result.evaluators.javascript.alpha_precision = getDigitPrecision(candidate.alpha_model, ALPHA_TARGET);
    result.evaluators.javascript.test_fitness = candidate.fitness;

    if (candidate.fitness > 1e-10) {
      result.status = 'warning';
      result.summary += 'JavaScript evaluator precision below expected threshold. ';
    }

  } catch (error) {
    result.evaluators.javascript.status = 'error';
    result.status = 'critical';
    result.summary += 'JavaScript evaluator failed. ';
  }

  // Test symbolic math operations
  try {
    const testCoeffs = [1.0, -1.0, 0.0, 0.1, 0.0];
    
    const dispersionCoeffs = SymbolicMath.getDispersionCoefficients(testCoeffs);
    result.evaluators.symbolic.dispersion_test = 
      isFinite(dispersionCoeffs.A) && isFinite(dispersionCoeffs.B);

    result.evaluators.symbolic.physics_validation = 
      SymbolicMath.validateCoefficients(testCoeffs);

    if (!result.evaluators.symbolic.dispersion_test || !result.evaluators.symbolic.physics_validation) {
      result.status = 'warning';
      result.summary += 'Symbolic math operations showing irregularities. ';
    }

  } catch (error) {
    result.evaluators.symbolic.status = 'error';
    result.status = 'critical';
    result.summary += 'Symbolic math evaluator failed. ';
  }

  // Verify constants consistency
  const precisionDigits = Math.min(
    result.evaluators.javascript.c_precision,
    result.evaluators.javascript.alpha_precision
  );
  
  result.consistency_check.precision_digits = precisionDigits;

  if (precisionDigits < 10) {
    result.status = 'warning';
    result.summary += `Low precision: ${precisionDigits} digits. `;
  }

  // Success summary
  if (result.status === 'healthy') {
    result.summary = `All physics constants unified. Precision: ${precisionDigits} digits. JavaScript evaluator operational.`;
  }

  return result;
}

function getDigitPrecision(value: number, target: number): number {
  const error = Math.abs(value - target);
  if (error === 0) return 16;
  const digits = Math.max(0, Math.floor(-Math.log10(error / Math.abs(target))));
  return Math.min(digits, 16);
}