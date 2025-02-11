import { TokenMetrics } from '../types/token';
import { Position } from './positionManager';
import { TRADING_RULES } from '../config/constants';

export interface RiskAnalysis {
  maxPositionSize: number;
  recommendedSize: number;
  riskAmount: number;
  riskRewardRatio: number;
  stopDistance: number;
  potentialProfit: number;
  exposure: number;
  warnings: string[];
}

export class RiskAnalyzer {
  private static instance: RiskAnalyzer;
  private accountSize: number = 10000; // Default $10k, should be configurable

  static getInstance(): RiskAnalyzer {
    if (!RiskAnalyzer.instance) {
      RiskAnalyzer.instance = new RiskAnalyzer();
    }
    return RiskAnalyzer.instance;
  }

  setAccountSize(size: number) {
    this.accountSize = size;
  }

  analyzeRisk(token: TokenMetrics, existingPositions: Position[]): RiskAnalysis {
    const warnings: string[] = [];
    
    // Calculate position size limits
    const maxPositionSize = token.liquidity * TRADING_RULES.POSITION.MAX_SIZE;
    const stopDistance = 1 - TRADING_RULES.EXIT.STOP_LOSS.INITIAL;
    const riskPerTrade = 0.02; // 2% risk per trade
    
    // Calculate based on risk
    const riskAmount = this.accountSize * riskPerTrade;
    const recommendedSize = Math.min(
      maxPositionSize,
      riskAmount / stopDistance
    );

    // Calculate potential profit
    const highestTarget = 1 + Math.max(...TRADING_RULES.EXIT.TAKE_PROFIT.map(tp => tp.AT_PROFIT));
    const potentialProfit = recommendedSize * (highestTarget - 1);
    const riskRewardRatio = potentialProfit / riskAmount;

    // Calculate current exposure
    const totalExposure = existingPositions.reduce((sum, pos) => sum + pos.size, 0);
    const newExposure = (totalExposure + recommendedSize) / this.accountSize;

    // Risk checks
    if (newExposure > 0.3) {
      warnings.push('⚠️ High portfolio exposure (>30%)');
    }
    
    if (riskRewardRatio < 2) {
      warnings.push('⚠️ Low risk/reward ratio (<2:1)');
    }

    if (recommendedSize > maxPositionSize * 0.8) {
      warnings.push('⚠️ Large position relative to liquidity');
    }

    return {
      maxPositionSize,
      recommendedSize,
      riskAmount,
      riskRewardRatio,
      stopDistance,
      potentialProfit,
      exposure: newExposure,
      warnings
    };
  }
} 