import { cStats, alphaStats, relErr, digitsSolved, barWidth } from '../physicsAccuracy';

describe('Physics Accuracy Helper', () => {
  test('digitsSolved matches bar width invariant', () => {
    // 1 ppm error → 6 digits, 37.5% bar
    const mockC = cStats(299792458 * (1 + 1e-6));
    expect(mockC.d).toBe(6);
    expect(mockC.bar).toBe(38); // rounded

    // exact value → 16 digits, 100%
    const exact = cStats(299792458);
    expect(exact.d).toBe(16);
    expect(exact.bar).toBe(100);
  });

  test('relative error calculation', () => {
    expect(relErr(299792458, 299792458)).toBe(0);
    expect(relErr(299792459, 299792458)).toBeCloseTo(3.34e-9, 11);
  });

  test('digits solved clamping', () => {
    expect(digitsSolved(1e-5)).toBe(5);
    expect(digitsSolved(1e-20)).toBe(16); // clamped at cap
    expect(digitsSolved(1)).toBe(0);      // clamped at floor
  });

  test('bar width scaling', () => {
    expect(barWidth(0)).toBe(0);
    expect(barWidth(8)).toBe(50);  // 8/16 * 100 = 50%
    expect(barWidth(16)).toBe(100);
  });

  test('alpha stats consistency', () => {
    const alphaExact = alphaStats(0.007297353);
    expect(alphaExact.d).toBe(16);
    expect(alphaExact.bar).toBe(100);
    
    const alphaNear = alphaStats(0.007297353 * (1 + 1e-8));
    expect(alphaNear.d).toBe(8);
    expect(alphaNear.bar).toBe(50);
  });
});