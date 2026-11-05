import { FORECAST_MIN_POINTS, forecastBurnout } from '../utils/forecast';

describe('forecastBurnout', () => {
  it('needs enough calculated points', () => {
    expect(forecastBurnout([null, null, 10, 12], 12)).toBeNull();
    expect(forecastBurnout(new Array(FORECAST_MIN_POINTS - 1).fill(20), 20)).toBeNull();
  });

  it('detects a rising trend and the days until the high-risk zone', () => {
    const series = [null, null, 20, 24, 28, 32, 36, 40];
    const forecast = forecastBurnout(series, 40)!;
    expect(forecast.trend).toBe('rising');
    expect(forecast.slopePerDay).toBeCloseTo(4);
    expect(forecast.daysToHigh).toBe(5); // 40 + 4*5 = 60
    expect(forecast.projected.map((p) => p.score)).toEqual([44, 52, 68]);
  });

  it('does not flag the high zone when already there', () => {
    const forecast = forecastBurnout([55, 58, 61, 64, 67, 70], 70)!;
    expect(forecast.trend).toBe('rising');
    expect(forecast.daysToHigh).toBeNull();
  });

  it('detects a falling trend and clamps projections to 0..100', () => {
    const forecast = forecastBurnout([40, 34, 28, 22, 16, 10], 10)!;
    expect(forecast.trend).toBe('falling');
    expect(forecast.projected[2].score).toBe(0);
  });

  it('calls a flat series stable', () => {
    const forecast = forecastBurnout([30, 31, 30, 29, 30, 31], 31)!;
    expect(forecast.trend).toBe('stable');
    expect(forecast.daysToHigh).toBeNull();
  });
});
