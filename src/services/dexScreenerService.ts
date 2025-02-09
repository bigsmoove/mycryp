import axios from 'axios';
import { DEXSCREENER_API } from '../config/constants';
import { ALERT_THRESHOLDS, TRADING_SIGNALS } from '../config/constants';
import { TrendingToken, SignalStrength, TradingSignal } from '../types/token';

interface TokenProfile {
  tokenAddress: string;
  name?: string;
  symbol?: string;
  description?: string;
  icon?: string;
  links?: Array<{
    type?: string;
    label?: string;
    url: string;
  }>;
}

interface TokenMetrics extends TrendingToken {
  hourlyAcceleration?: number;
  volumeAcceleration?: number;
  isEarlyPhase?: boolean;
  buyRatio?: number;
}

export const fetchTrendingTokens = async (): Promise<TrendingToken[]> => {
  try {
    console.log('Fetching trending tokens...');
    const response = await axios.get(`${DEXSCREENER_API}/token-profiles/latest/v1`);
    
    console.log('API Response:', response.data);

    if (!response.data) {
      console.warn('No data received from DexScreener');
      return [];
    }

    // Filter for Solana tokens and ensure we have valid token addresses
    const solanaProfiles = response.data.filter((profile: any) => 
      profile.chainId === 'solana' && profile.tokenAddress
    ).slice(0, 10); // Take only first 10 to reduce API calls

    console.log('Solana Profiles:', solanaProfiles); // Debug log

    // Get pair data for each token
    const tokens = await Promise.all(
      solanaProfiles.map(async (profile: TokenProfile) => {
        try {
          // Use the correct endpoint format from DexScreener docs
          const pairsResponse = await axios.get(
            `${DEXSCREENER_API}/latest/dex/tokens/${profile.tokenAddress}`
          );

          console.log(`Pairs data for ${profile.tokenAddress}:`, pairsResponse.data);

          if (!pairsResponse.data?.pairs) return null;

          const pair = pairsResponse.data.pairs[0];
          
          // Calculate acceleration metrics
          const hourlyAcceleration = pair.priceChange?.h1 
            ? (pair.priceChange.h1 / (pair.priceChange.h24 / 24))
            : 0;
          
          const volumeAcceleration = pair.volume?.h1 
            ? (pair.volume.h1 * 24) / (pair.volume.h24 || 1)
            : 0;

          // Determine if token is in early phase
          const isEarlyPhase = 
            hourlyAcceleration > 1.5 && // Price moving faster recently
            volumeAcceleration > 1.2 && // Volume increasing
            pair.priceChange?.h24 < 50 && // Not already pumped too much
            (pair.txns?.h24?.buys ?? 0) > (pair.txns?.h24?.sells ?? 0); // More buys than sells

          return {
            address: profile.tokenAddress,
            name: pair.baseToken?.name || profile.name || 'Unknown',
            symbol: pair.baseToken?.symbol || profile.symbol || 'Unknown',
            price: parseFloat(pair.priceUsd) || 0,
            volume24h: pair.volume?.h24 || 0,
            priceChange24h: pair.priceChange?.h24 || 0,
            liquidity: pair.liquidity?.usd || 0,
            dexId: pair.dexId,
            pairAddress: pair.pairAddress,
            icon: profile.icon,
            description: profile.description,
            links: profile.links,
            hourlyAcceleration,
            volumeAcceleration,
            isEarlyPhase,
            buyRatio: pair.txns?.h24?.buys 
              ? pair.txns.h24.buys / (pair.txns.h24.buys + pair.txns.h24.sells) 
              : 0
          };
        } catch (error) {
          console.error(`Error fetching pair data for ${profile.tokenAddress}:`, error);
          return null;
        }
      })
    );

    console.log('Processed tokens:', tokens); // Debug log

    // Filter and process tokens
    const filteredTokens = [];
    for (const token of tokens) {
      if (!token) continue;

      // Enhanced safety and momentum checks
      const safetyCheck = 
        token.liquidity >= ALERT_THRESHOLDS.MIN_LIQUIDITY &&
        token.volume24h >= ALERT_THRESHOLDS.MIN_VOLUME;

      if (!safetyCheck) continue;

      // Momentum indicators
      const volumeToLiquidityRatio = token.volume24h / token.liquidity;
      const buyPressure = token.buyRatio ?? 0;
      const priceAcceleration = token.hourlyAcceleration ?? 0;

      const momentumCheck =
        volumeToLiquidityRatio > 0.3 && // Healthy trading volume
        buyPressure > 0.5 &&            // More buys than sells
        priceAcceleration > 1.0;        // Price gaining momentum

      if (momentumCheck) {
        const tradingSignal = analyzeTradingSignals(token);
        
        // Calculate comprehensive score
        const { WEIGHTS } = ALERT_THRESHOLDS;
        const score = (
          (volumeToLiquidityRatio * WEIGHTS.VOLUME_LIQUIDITY) +
          (buyPressure * WEIGHTS.BUY_PRESSURE) +
          (priceAcceleration * WEIGHTS.PRICE_MOMENTUM) +
          (Math.min(token.priceChange24h, 100) * WEIGHTS.PERFORMANCE / 100)
        );

        const alerts: string[] = [];
        
        if (volumeToLiquidityRatio > ALERT_THRESHOLDS.VOLUME_SPIKE) {
          alerts.push('🚨 Volume Spike Alert');
        }
        
        if (buyPressure > ALERT_THRESHOLDS.BUY_PRESSURE) {
          alerts.push('💫 Strong Buy Pressure');
        }
        
        if (priceAcceleration > ALERT_THRESHOLDS.PRICE_ACCELERATION) {
          alerts.push('🚀 Price Acceleration');
        }

        filteredTokens.push({
          ...token,
          score,
          indicators: {
            volumeToLiquidityRatio: volumeToLiquidityRatio.toFixed(2),
            buyPressure: buyPressure.toFixed(2),
            priceAcceleration: priceAcceleration.toFixed(2),
            volumeSpike: volumeToLiquidityRatio > ALERT_THRESHOLDS.VOLUME_SPIKE,
            buyPressureSurge: buyPressure > ALERT_THRESHOLDS.BUY_PRESSURE,
            priceAccelerationAlert: priceAcceleration > ALERT_THRESHOLDS.PRICE_ACCELERATION
          },
          alerts,
          tradingSignal
        });
      }
    }

    console.log('Filtered tokens:', filteredTokens);

    // Sort by score and return
    return filteredTokens
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);

  } catch (error) {
    console.error('Error in fetchTrendingTokens:', error);
    return [];
  }
};

// Get specific token details
export const getTokenDetails = async (tokenAddress: string): Promise<any> => {
  try {
    const pairsData = await axios.get(
      `${DEXSCREENER_API}/latest/dex/tokens/${tokenAddress}`
    );

    if (!pairsData.data?.pairs) {
      throw new Error('No token data found');
    }

    const mainPair = pairsData.data.pairs[0];
    const allPairs = pairsData.data.pairs;

    return {
      baseToken: mainPair.baseToken,
      priceUsd: mainPair.priceUsd || '0',
      priceChange: mainPair.priceChange || { h24: 0 },
      volume: mainPair.volume || { h24: 0 },
      liquidity: mainPair.liquidity || { usd: 0 },
      txns: mainPair.txns || { h24: { buys: 0, sells: 0 } },
      pairs: allPairs,
      marketCap: mainPair.fdv || 0,
      totalVolume: allPairs.reduce((sum: number, pair: any) => 
        sum + (pair.volume?.h24 || 0), 0
      ),
      totalLiquidity: allPairs.reduce((sum: number, pair: any) => 
        sum + (pair.liquidity?.usd || 0), 0
      )
    };
  } catch (error) {
    console.error('Error fetching token details:', error);
    return {
      baseToken: { name: 'Unknown', symbol: 'Unknown' },
      priceUsd: '0',
      priceChange: { h24: 0 },
      volume: { h24: 0 },
      liquidity: { usd: 0 },
      txns: { h24: { buys: 0, sells: 0 } },
      pairs: [],
      marketCap: 0,
      totalVolume: 0,
      totalLiquidity: 0
    };
  }
};

// Get token pairs/pools
export const getTokenPairs = async (tokenAddress: string): Promise<any> => {
  try {
    const response = await axios.get(
      `${DEXSCREENER_API}/latest/dex/tokens/${tokenAddress}`
    );
    return response.data?.pairs || [];
  } catch (error) {
    console.error('Error fetching token pairs:', error);
    return [];
  }
};

// Update the getTokenHistory function to use available data
export const getTokenHistory = async (tokenAddress: string): Promise<any[]> => {
  try {
    // Get all pairs for the token
    const pairs = await getTokenPairs(tokenAddress);
    if (!pairs?.[0]) return [];

    // Use the first pair's price data
    const mainPair = pairs[0];
    
    // Create a simple price history from available data
    const now = Date.now();
    const history = [
      {
        time: new Date(now - 24 * 60 * 60 * 1000).toISOString(), // 24h ago
        value: parseFloat(mainPair.priceUsd) / (1 + (mainPair.priceChange?.h24 || 0) / 100)
      },
      {
        time: new Date(now).toISOString(), // current
        value: parseFloat(mainPair.priceUsd)
      }
    ];

    return history;
  } catch (error) {
    console.error('Error creating token history:', error);
    return [];
  }
};

// Add this new function to analyze trading signals
const analyzeTradingSignals = (token: TokenMetrics): TradingSignal => {
  const buyPressure = token.buyRatio ?? 0;
  const volumeToLiquidityRatio = token.volume24h / token.liquidity;
  const priceAcceleration = token.hourlyAcceleration ?? 0;

  // Determine trends
  const getBuyPressureTrend = (current: number, threshold: number = 0.5): 'up' | 'down' | 'neutral' => {
    if (current > threshold + 0.1) return 'up';
    if (current < threshold - 0.1) return 'down';
    return 'neutral';
  };

  const getVolumeTrend = (ratio: number): 'up' | 'down' | 'neutral' => {
    if (ratio > TRADING_SIGNALS.BUY.STRONG.VOLUME_SPIKE) return 'up';
    if (ratio < TRADING_SIGNALS.SELL.STRONG.VOLUME_DROP) return 'down';
    return 'neutral';
  };

  const getPriceTrend = (acceleration: number): 'up' | 'down' | 'neutral' => {
    if (acceleration > TRADING_SIGNALS.BUY.MODERATE.PRICE_ACCEL) return 'up';
    if (acceleration < TRADING_SIGNALS.SELL.MODERATE.PRICE_DECEL) return 'down';
    return 'neutral';
  };

  // Calculate signal strength
  let signal: SignalStrength = 'HOLD';
  const reasons: string[] = [];
  let confidence = 50; // Base confidence

  // Strong Buy Conditions
  if (
    buyPressure >= TRADING_SIGNALS.BUY.STRONG.BUY_PRESSURE &&
    volumeToLiquidityRatio >= TRADING_SIGNALS.BUY.STRONG.VOLUME_SPIKE &&
    priceAcceleration >= TRADING_SIGNALS.BUY.STRONG.PRICE_ACCEL
  ) {
    signal = 'STRONG_BUY';
    confidence = 90;
    reasons.push('Strong buying pressure with high volume');
    reasons.push('Price showing significant upward momentum');
  }
  // Moderate Buy Conditions
  else if (
    buyPressure >= TRADING_SIGNALS.BUY.MODERATE.BUY_PRESSURE &&
    volumeToLiquidityRatio >= TRADING_SIGNALS.BUY.MODERATE.VOLUME_SPIKE &&
    priceAcceleration >= TRADING_SIGNALS.BUY.MODERATE.PRICE_ACCEL
  ) {
    signal = 'MODERATE_BUY';
    confidence = 70;
    reasons.push('Moderate buying pressure detected');
    reasons.push('Volume and price showing positive trends');
  }
  // Strong Sell Conditions
  else if (
    buyPressure <= TRADING_SIGNALS.SELL.STRONG.BUY_PRESSURE_DROP ||
    volumeToLiquidityRatio <= TRADING_SIGNALS.SELL.STRONG.VOLUME_DROP ||
    priceAcceleration <= TRADING_SIGNALS.SELL.STRONG.PRICE_DECEL
  ) {
    signal = 'STRONG_SELL';
    confidence = 85;
    reasons.push('Significant selling pressure detected');
    if (buyPressure <= TRADING_SIGNALS.SELL.STRONG.BUY_PRESSURE_DROP) {
      reasons.push('Heavy sell-side dominance');
    }
    if (volumeToLiquidityRatio <= TRADING_SIGNALS.SELL.STRONG.VOLUME_DROP) {
      reasons.push('Volume dropping significantly');
    }
  }
  // Consider Sell Conditions
  else if (
    buyPressure <= TRADING_SIGNALS.SELL.MODERATE.BUY_PRESSURE_DROP ||
    volumeToLiquidityRatio <= TRADING_SIGNALS.SELL.MODERATE.VOLUME_DROP ||
    priceAcceleration <= TRADING_SIGNALS.SELL.MODERATE.PRICE_DECEL
  ) {
    signal = 'CONSIDER_SELL';
    confidence = 65;
    reasons.push('Weakening market metrics detected');
    reasons.push('Consider taking profits or setting stop-loss');
  }

  return {
    signal,
    confidence,
    reasons,
    indicators: {
      buyPressure: {
        value: buyPressure,
        trend: getBuyPressureTrend(buyPressure)
      },
      volumeMetric: {
        value: volumeToLiquidityRatio,
        trend: getVolumeTrend(volumeToLiquidityRatio)
      },
      priceMovement: {
        value: priceAcceleration,
        trend: getPriceTrend(priceAcceleration)
      }
    }
  };
}; 