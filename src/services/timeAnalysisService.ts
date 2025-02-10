import { TIME_ANALYSIS } from '../config/constants';

export const analyzeTimeWindow = () => {
  const currentHour = new Date().getUTCHours();
  const { PEAK_HOURS, QUIET_HOURS } = TIME_ANALYSIS.TRADING_WINDOWS.UTC;

  // Check if we're in a peak trading window
  const isPeakHour = PEAK_HOURS.some(window => 
    currentHour >= window.start && currentHour <= window.end
  );

  // Check if we're in a quiet period
  const isQuietHour = QUIET_HOURS.some(window => 
    currentHour >= window.start && currentHour <= window.end
  );

  // Get volatility multiplier
  const { HIGH, LOW } = TIME_ANALYSIS.VOLATILITY;
  const volatilityMultiplier = 
    (currentHour >= HIGH.start && currentHour <= HIGH.end)
      ? HIGH.multiplier
      : LOW.multiplier;

  return {
    isPeakHour,
    isQuietHour,
    volatilityMultiplier,
    currentHour,
    recommendation: isPeakHour ? 'OPTIMAL_TRADING_WINDOW' : 
                   isQuietHour ? 'AVOID_TRADING' : 'NORMAL_TRADING'
  };
};

export const analyzeMomentumSustainability = (
  token: TokenMetrics,
  timeWindowMinutes: number = TIME_ANALYSIS.MOMENTUM.MIN_SUSTAINED_MINS
): {
  isSustained: boolean;
  momentum: number;
  timeQualifier: string;
} => {
  const momentum = token.hourlyAcceleration ?? 0;
  const isSustained = Math.abs(momentum) > TIME_ANALYSIS.MOMENTUM.ACCELERATION_THRESHOLD;

  return {
    isSustained,
    momentum,
    timeQualifier: isSustained 
      ? `Sustained for ${timeWindowMinutes}+ minutes`
      : 'Recent movement only'
  };
}; 