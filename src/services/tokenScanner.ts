import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { SOLANA_RPC_ENDPOINT, DEXSCREENER_API, SAFETY_THRESHOLDS, BLACKLISTED_PATTERNS, TRADING_RULES } from '../config/constants';
import { TokenMetrics } from '../types/token';

interface TokenSafetyCheck {
  isSecure: boolean;
  reasons: string[];
  score: number;
}

interface EnhancedTokenCheck extends TokenSafetyCheck {
  momentumScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  warnings: string[];
}

interface DexPair {
  liquidity?: {
    usd?: number;
  };
  volume?: {
    h24?: number;
  };
  txns?: {
    h24?: {
      buys: number;
      sells: number;
    };
  };
  priceChange?: {
    h24?: number;
    h1?: number;
  };
}

interface DexData {
  pairs?: DexPair[];
  liquidity?: {
    usd?: number;
  };
  volume?: {
    h24?: number;
  };
  txns?: {
    h24?: {
      buys: number;
      sells: number;
    };
  };
  priceChange?: {
    h24?: number;
  };
}

export class TokenScanner {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_ENDPOINT);
  }

  async scanToken(tokenAddress: string): Promise<EnhancedTokenCheck> {
    try {
      const tokenKey = new PublicKey(tokenAddress);
      const reasons: string[] = [];
      const warnings: string[] = [];
      let score = 100;
      let momentumScore = 0;

      // Check liquidity
      const liquidityCheck = await this.checkLiquidity(tokenAddress);
      if (!liquidityCheck.isSecure) {
        reasons.push(liquidityCheck.reason || 'Insufficient liquidity');
        score -= 30;
      }

      // Get token data from DexScreener for other checks
      const pairData = await this.getPairData(tokenAddress);
      if (!pairData) {
        reasons.push('Unable to fetch token data');
        return {
          isSecure: false,
          reasons,
          warnings,
          score: 0,
          momentumScore: 0,
          riskLevel: 'High'
        };
      }

      // Rest of the existing checks using pairData
      if (this.isLiquidityConcentrated({ pairs: [pairData] })) {
        warnings.push('High liquidity concentration in single pool');
        score -= 15;
      }

      // Check for suspicious trading patterns
      if (this.hasSuspiciousTrading({ pairs: [pairData] })) {
        warnings.push('Suspicious trading patterns detected');
        score -= 25;
      }

      // Momentum and volatility checks
      const volatilityScore = this.calculateVolatility({ pairs: [pairData] });
      if (volatilityScore > 50) {
        warnings.push('High price volatility');
        score -= 20;
      }

      momentumScore = this.calculateMomentumScore({ pairs: [pairData] });

      return {
        isSecure: score >= 70,
        reasons,
        warnings,
        score,
        momentumScore,
        riskLevel: this.calculateRiskLevel(score, momentumScore)
      };
    } catch (error) {
      console.error('Error scanning token:', error);
      return {
        isSecure: false,
        reasons: ['Error scanning token'],
        warnings: [],
        score: 0,
        momentumScore: 0,
        riskLevel: 'High'
      };
    }
  }

  private async checkLiquidity(tokenAddress: string): Promise<{ isSecure: boolean; reason?: string }> {
    try {
      const pairData = await this.getPairData(tokenAddress);
      const liquidity = pairData?.liquidity?.usd || 0;

      if (liquidity < SAFETY_THRESHOLDS.LIQUIDITY.MIN) {
        return {
          isSecure: false,
          reason: `Low liquidity ($${liquidity.toLocaleString()}). Minimum required: $${SAFETY_THRESHOLDS.LIQUIDITY.MIN.toLocaleString()}`
        };
      }

      return { isSecure: true };
    } catch (error) {
      console.error('Error checking liquidity:', error);
      return {
        isSecure: false,
        reason: 'Unable to verify token liquidity'
      };
    }
  }

  private isLiquidityConcentrated(dexData: DexData): boolean {
    const pairs = dexData.pairs || [];
    if (pairs.length === 0) return false;

    const totalLiquidity = pairs.reduce((sum: number, pair: DexPair) => 
      sum + (pair.liquidity?.usd ?? 0), 0
    );

    // Check if any single pool has > 80% of total liquidity
    return pairs.some((pair: DexPair) => 
      ((pair.liquidity?.usd ?? 0) / totalLiquidity) > 0.8
    );
  }

  private hasSuspiciousTrading(dexData: DexData): boolean {
    const buys = dexData.txns?.h24?.buys ?? 0;
    const sells = dexData.txns?.h24?.sells ?? 0;
    const volume = dexData.volume?.h24 ?? 0;
    const liquidity = dexData.liquidity?.usd ?? 0;

    return (
      // Extremely high volume compared to liquidity
      (volume > liquidity * 3) ||
      // Very unbalanced buy/sell ratio
      (buys > sells * 5 || sells > buys * 5) ||
      // Too few transactions for volume
      (volume > 50000 && (buys + sells) < 10)
    );
  }

  private calculateVolatility(dexData: DexData): number {
    return Math.abs(dexData.priceChange?.h24 ?? 0);
  }

  private calculateMomentumScore(dexData: DexData): number {
    // Extract values with defaults
    const priceChange = dexData.priceChange?.h24 ?? 0;
    const volume = dexData.volume?.h24 ?? 0;
    const liquidity = dexData.liquidity?.usd ?? 1; // Default to 1 to avoid division by zero
    const buys = dexData.txns?.h24?.buys ?? 0;
    const sells = dexData.txns?.h24?.sells ?? 0;
    const totalTxns = buys + sells;

    // Weighted momentum factors
    const priceWeight = 0.4;
    const volumeWeight = 0.3;
    const txnWeight = 0.3;

    const priceScore = Math.min(Math.max(priceChange, 0), 100) / 100;
    const volumeScore = Math.min(volume / liquidity, 1);
    const txnScore = totalTxns > 0 ? buys / totalTxns : 0;

    return (
      priceScore * priceWeight +
      volumeScore * volumeWeight +
      txnScore * txnWeight
    ) * 100;
  }

  private calculateRiskLevel(
    safetyScore: number, 
    momentumScore: number
  ): 'Low' | 'Medium' | 'High' {
    if (safetyScore >= 80 && momentumScore < 70) return 'Low';
    if (safetyScore >= 60 && momentumScore < 85) return 'Medium';
    return 'High';
  }

  private async getPairData(tokenAddress: string): Promise<DexPair | null> {
    try {
      const response = await axios.get(
        `${DEXSCREENER_API}/latest/dex/tokens/${tokenAddress}`
      );

      if (!response.data?.pairs || response.data.pairs.length === 0) {
        return null;
      }

      // Return the first pair's data (usually the most liquid pair)
      return response.data.pairs[0];
    } catch (error) {
      console.error('Error fetching pair data:', error);
      return null;
    }
  }
}

export class TokenTrader {
  private static validateEntry(token: TokenMetrics): {
    isValid: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    const { REQUIRED, SMART_MONEY, MOMENTUM } = TRADING_RULES.ENTRY;

    // Basic Safety Checks
    if (token.liquidity < REQUIRED.MIN_LIQUIDITY) {
      reasons.push(`❌ Low liquidity: $${token.liquidity}`);
    }
    
    if ((token.txns?.h24?.buys ?? 0) < REQUIRED.MIN_TRANSACTIONS) {
      reasons.push('❌ Too few transactions - possible fake volume');
    }

    // Smart Money Analysis
    const buyRatio = token.buyRatio ?? 0;
    const volLiqRatio = token.volume24h / token.liquidity;
    
    if (buyRatio < REQUIRED.MIN_BUY_PRESSURE) {
      reasons.push(`❌ Weak buy pressure: ${(buyRatio * 100).toFixed(1)}%`);
    }

    if (volLiqRatio < REQUIRED.MIN_VOL_LIQ_RATIO) {
      reasons.push(`❌ Low volume/liquidity: ${volLiqRatio.toFixed(1)}x`);
    }

    // Momentum Checks
    const acceleration = token.hourlyAcceleration ?? 0;
    if (acceleration < MOMENTUM.MIN_ACCELERATION) {
      reasons.push(`❌ Weak momentum: ${acceleration.toFixed(1)}%`);
    }
    if (acceleration > MOMENTUM.MAX_ACCELERATION) {
      reasons.push(`❌ Overheated: ${acceleration.toFixed(1)}%`);
    }

    // Price Movement
    if (token.priceChange24h > REQUIRED.MAX_PRICE_INCREASE) {
      reasons.push(`❌ Already pumped ${token.priceChange24h}% - too late`);
    }

    return {
      isValid: reasons.length === 0,
      reasons
    };
  }

  private static calculatePosition(token: TokenMetrics): {
    initialSize: number;
    finalSize: number;
    entry: number;
    stopLoss: number;
    targets: number[];
  } {
    const { POSITION, EXIT } = TRADING_RULES;
    
    // Calculate safe position size
    const maxPosition = token.liquidity * POSITION.MAX_SIZE;
    const initialSize = maxPosition * POSITION.SCALING.INITIAL;
    const finalSize = maxPosition * POSITION.SCALING.FINAL;

    // Set entry, stops and targets
    const entry = token.price;
    const stopLoss = entry * EXIT.STOP_LOSS.INITIAL;
    const targets = EXIT.TAKE_PROFIT.map(tp => 
      entry * (1 + tp.AT_PROFIT)
    );

    return {
      initialSize,
      finalSize,
      entry,
      stopLoss,
      targets
    };
  }

  public static async analyzeTrade(token: TokenMetrics): Promise<{
    shouldEnter: boolean;
    tradingPlan?: {
      entry: number;
      size: number;
      stopLoss: number;
      targets: number[];
      reasons: string[];
    };
    warnings: string[];
  }> {
    // Validate entry conditions
    const { isValid, reasons } = this.validateEntry(token);
    
    if (!isValid) {
      return {
        shouldEnter: false,
        warnings: reasons
      };
    }

    // Calculate position if valid
    const plan = this.calculatePosition(token);
    
    const bullishReasons = [
      `✅ Strong buy pressure: ${(token.buyRatio ?? 0 * 100).toFixed(1)}%`,
      `✅ High volume: ${(token.volume24h / token.liquidity).toFixed(1)}x liquidity`,
      `✅ Good momentum: ${token.hourlyAcceleration}% acceleration`
    ];

    return {
      shouldEnter: true,
      tradingPlan: {
        entry: plan.entry,
        size: plan.initialSize,
        stopLoss: plan.stopLoss,
        targets: plan.targets,
        reasons: bullishReasons
      },
      warnings: [`⚠️ Use max position size: $${plan.initialSize.toFixed(0)}`]
    };
  }
} 
