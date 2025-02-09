import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { SOLANA_RPC_ENDPOINT, DEXSCREENER_API, SAFETY_THRESHOLDS, BLACKLISTED_PATTERNS } from '../config/constants';

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

      // Get token data from DexScreener
      const { data: dexData } = await axios.get(
        `${DEXSCREENER_API}/tokens/v1/solana/${tokenAddress}`
      );

      // Enhanced security checks
      if (!this.checkLiquidity(dexData)) {
        reasons.push('Insufficient liquidity');
        score -= 30;
      }

      // Check liquidity concentration
      if (this.isLiquidityConcentrated(dexData)) {
        warnings.push('High liquidity concentration in single pool');
        score -= 15;
      }

      // Check for suspicious trading patterns
      if (this.hasSuspiciousTrading(dexData)) {
        warnings.push('Suspicious trading patterns detected');
        score -= 25;
      }

      // Momentum and volatility checks
      const volatilityScore = this.calculateVolatility(dexData);
      if (volatilityScore > 50) {
        warnings.push('High price volatility');
        score -= 20;
      }

      momentumScore = this.calculateMomentumScore(dexData);

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

  private checkLiquidity(dexData: DexData): boolean {
    const liquidityUsd = dexData.liquidity?.usd ?? 0;
    return liquidityUsd >= SAFETY_THRESHOLDS.MIN_LIQUIDITY_USD;
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
} 