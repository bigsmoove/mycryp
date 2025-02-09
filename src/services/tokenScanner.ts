import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { SOLANA_RPC_ENDPOINT, DEXSCREENER_API, SAFETY_THRESHOLDS, BLACKLISTED_PATTERNS } from '../config/constants';

interface TokenSafetyCheck {
  isSecure: boolean;
  reasons: string[];
  score: number;
}

export class TokenScanner {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_ENDPOINT);
  }

  async scanToken(tokenAddress: string): Promise<TokenSafetyCheck> {
    try {
      const tokenKey = new PublicKey(tokenAddress);
      const reasons: string[] = [];
      let score = 100;

      // Get token data from DexScreener
      const { data: dexData } = await axios.get(
        `${DEXSCREENER_API}/tokens/${tokenAddress}`
      );

      // Basic checks
      if (!this.checkLiquidity(dexData)) {
        reasons.push('Insufficient liquidity');
        score -= 30;
      }

      if (!this.checkTradingVolume(dexData)) {
        reasons.push('Low trading volume');
        score -= 20;
      }

      if (this.hasBlacklistedWords(dexData.name)) {
        reasons.push('Contains suspicious keywords');
        score -= 25;
      }

      // Contract verification check
      const programInfo = await this.connection.getAccountInfo(tokenKey);
      if (!programInfo?.executable) {
        reasons.push('Contract not verified');
        score -= 40;
      }

      return {
        isSecure: score >= 70,
        reasons,
        score,
      };
    } catch (error) {
      console.error('Error scanning token:', error);
      return {
        isSecure: false,
        reasons: ['Error scanning token'],
        score: 0,
      };
    }
  }

  private checkLiquidity(dexData: any): boolean {
    return dexData.liquidity?.usd >= SAFETY_THRESHOLDS.MIN_LIQUIDITY_SOL;
  }

  private checkTradingVolume(dexData: any): boolean {
    return dexData.volume24h >= SAFETY_THRESHOLDS.MIN_TRADING_VOLUME;
  }

  private hasBlacklistedWords(name: string): boolean {
    return BLACKLISTED_PATTERNS.some(pattern => 
      name.toUpperCase().includes(pattern)
    );
  }
} 