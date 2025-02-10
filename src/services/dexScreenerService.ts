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
  marketCap?: number;
  totalSupply?: number;
  hourlyAcceleration?: number;
  volumeAcceleration?: number;
  isEarlyPhase?: boolean;
  buyRatio?: number;
  txns?: {
    h24?: {
      buys: number;
      sells: number;
    };
  };
}

// Move this to the top of the file as a utility function
const calculatePriceMomentum = (pair: any) => {
  if (!pair.priceChange?.h1 || !pair.priceChange?.h24) return 0;

  // Compare 1h price change to average hourly change over 24h
  const hourlyAverage = pair.priceChange.h24 / 24;
  const currentHourly = pair.priceChange.h1;
  
  // Calculate relative momentum
  const momentum = currentHourly - hourlyAverage;
  
  // Normalize to a -100 to +100 scale
  // This will show how much faster/slower current movement is compared to average
  const normalizedValue = Math.min(Math.max(momentum * 2, -100), 100);
  
  return Number(normalizedValue.toFixed(2));
};

// Add new thresholds to our analysis
const SAFETY_THRESHOLDS = {
  MIN_LIQUIDITY: 100_000, // $100k minimum liquidity
  MIN_VOLUME: 500_000,    // $500k minimum volume
  MIN_TRANSACTIONS: 150,  // Minimum transactions
  MAX_MCAP: 150_000_000, // $150M max market cap
  WHALE_THRESHOLD: 0.05,  // 5% max wallet holding
  PRICE_SPIKE_WARNING: 50, // 50% price increase warning
  VOLUME_LIQUIDITY_RATIO_MAX: 10, // Max healthy volume/liquidity ratio
  LIQUIDITY: {
    MIN: 100_000,    // $100k minimum liquidity
    HEALTHY: 500_000 // $500k healthy liquidity
  },
  VOLUME: {
    MIN_24H: 500_000,  // $500k minimum daily volume
    HEALTHY_24H: 750_000 // $750k healthy daily volume
  },
  TRANSACTIONS: {
    MIN_24H: 150 // Minimum daily transactions
  },
  RATIOS: {
    MAX_VOL_LIQ: 10,  // Maximum healthy volume/liquidity ratio
    MIN_BUY_RATIO: 0.4 // Minimum healthy buy ratio
  },
  MARKET_CAP: {
    MIN_VIABLE: 500_000,      // $500k minimum
    HEALTHY: 5_000_000,       // $5M healthy range
    SWEET_SPOT: 100_000_000,  // $100M good exit point
    MAX_UPSIDE: 150_000_000   // $150M limited upside
  },
  WHALE: {
    TRANSACTION_IMPACT: 0.05,    // 5% of liquidity per transaction
    VOLUME_LIQUIDITY_MULT: 3,    // Volume exceeding 3x liquidity
    LARGE_HOLDER_PERCENT: 0.05,  // 5% or more of supply
    MAX_WALLET_CONCENTRATION: 0.1 // 10% max in single wallet
  }
};

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
          const hourlyAcceleration = calculatePriceMomentum(pair);
          
          const volumeAcceleration = pair.volume?.h1 
            ? (pair.volume.h1 * 24) / (pair.volume.h24 || 1)
            : 0;

          // Determine if token is in early phase
          const isEarlyPhase = 
            Number(hourlyAcceleration) > 1.5 && // Price moving faster recently
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
              : 0,
            marketCap: pair.fdv || 0,
            totalSupply: pair.baseToken?.totalSupply || 0
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
  // Get safety issues and exit signals
  const safetyIssues = analyzeSafetyMetrics(token);
  const exitSignals = getExitSignals(token);
  const marketCapWarnings = analyzeMarketCap(token);
  const whaleWarnings = detectWhaleActivity(token);
  const allWarnings = [...safetyIssues, ...exitSignals, ...marketCapWarnings, ...whaleWarnings];

  // Calculate key metrics with safe defaults
  const buyRatio = token.buyRatio ?? 0;
  const volLiqRatio = token.volume24h / token.liquidity;
  const priceAccel = token.hourlyAcceleration ?? 0;

  // If there are serious safety issues, mark as AVOID
  if (safetyIssues.length >= 2) {
    return {
      signal: 'AVOID',
      confidence: 90,
      reasons: [
        '⛔️ Multiple risk factors detected',
        ...allWarnings
      ],
      indicators: {
        buyPressure: { value: buyRatio, trend: 'down' },
        volumeMetric: { value: volLiqRatio, trend: 'down' },
        priceMovement: { value: priceAccel, trend: 'down' }
      }
    };
  }

  // Calculate signal strength
  let signal: SignalStrength = 'HOLD';
  let confidence = 50; // Base confidence

  // Strong Buy Conditions
  if (
    buyRatio >= TRADING_SIGNALS.BUY.STRONG.BUY_PRESSURE &&
    volLiqRatio >= TRADING_SIGNALS.BUY.STRONG.VOLUME_SPIKE &&
    priceAccel >= TRADING_SIGNALS.BUY.STRONG.PRICE_ACCEL
  ) {
    signal = 'STRONG_BUY';
    confidence = 90;
  }
  // Moderate Buy Conditions
  else if (
    buyRatio >= TRADING_SIGNALS.BUY.MODERATE.BUY_PRESSURE &&
    volLiqRatio >= TRADING_SIGNALS.BUY.MODERATE.VOLUME_SPIKE &&
    priceAccel >= TRADING_SIGNALS.BUY.MODERATE.PRICE_ACCEL
  ) {
    signal = 'MODERATE_BUY';
    confidence = 70;
  }
  // Strong Sell Conditions
  else if (
    buyRatio <= TRADING_SIGNALS.SELL.STRONG.BUY_PRESSURE_DROP ||
    volLiqRatio <= TRADING_SIGNALS.SELL.STRONG.VOLUME_DROP ||
    priceAccel <= TRADING_SIGNALS.SELL.STRONG.PRICE_DECEL
  ) {
    signal = 'STRONG_SELL';
    confidence = 85;
  }
  // Consider Sell Conditions
  else if (
    buyRatio <= TRADING_SIGNALS.SELL.MODERATE.BUY_PRESSURE_DROP ||
    volLiqRatio <= TRADING_SIGNALS.SELL.MODERATE.VOLUME_DROP ||
    priceAccel <= TRADING_SIGNALS.SELL.MODERATE.PRICE_DECEL
  ) {
    signal = 'CONSIDER_SELL';
    confidence = 65;
  }

  return {
    signal,
    confidence,
    reasons: allWarnings,
    indicators: {
      buyPressure: {
        value: buyRatio,
        trend: getBuyPressureTrend(buyRatio)
      },
      volumeMetric: {
        value: volLiqRatio,
        trend: getVolumeTrend(volLiqRatio)
      },
      priceMovement: {
        value: priceAccel,
        trend: getPriceTrend(priceAccel)
      }
    }
  };
};

const analyzeSafetyMetrics = (token: TokenMetrics) => {
  const safetyIssues: string[] = [];
  
  // Liquidity Check
  if (token.liquidity < SAFETY_THRESHOLDS.LIQUIDITY.MIN) {
    safetyIssues.push('🚨 Very low liquidity - high risk of price manipulation');
  } else if (token.liquidity < SAFETY_THRESHOLDS.LIQUIDITY.HEALTHY) {
    safetyIssues.push('⚠️ Low liquidity - exercise caution');
  }

  // Volume Check
  if (token.volume24h < SAFETY_THRESHOLDS.VOLUME.MIN_24H) {
    safetyIssues.push('🚨 Insufficient trading volume - low liquidity risk');
  }

  // Volume/Liquidity Health
  const volLiqRatio = token.volume24h / token.liquidity;
  if (volLiqRatio > SAFETY_THRESHOLDS.RATIOS.MAX_VOL_LIQ) {
    safetyIssues.push('⚠️ Unusually high volume vs liquidity - potential manipulation');
  }

  // Transaction Analysis
  const buyCount = token.txns?.h24?.buys ?? 0;
  const sellCount = token.txns?.h24?.sells ?? 0;
  const totalTxns = buyCount + sellCount;
  
  if (totalTxns < SAFETY_THRESHOLDS.TRANSACTIONS.MIN_24H) {
    safetyIssues.push('⚠️ Low transaction count - possible lack of interest');
  }
  
  if (sellCount > buyCount * 2) {
    safetyIssues.push('📉 Heavy selling pressure detected');
  }

  // Price Movement Analysis
  if (token.priceChange24h > 100) {
    safetyIssues.push('🎢 Extreme price movement - high volatility risk');
  }

  return safetyIssues;
};

const getExitSignals = (token: TokenMetrics): string[] => {
  const signals: string[] = [];
  
  // Price Change Analysis
  if (token.priceChange24h > 200) {
    signals.push('🎯 Extreme gains - consider taking profits');
  }

  // Volume Analysis
  const volLiqRatio = token.volume24h / token.liquidity;
  if (volLiqRatio > SAFETY_THRESHOLDS.RATIOS.MAX_VOL_LIQ * 2) {
    signals.push('🔔 Volume/Liquidity ratio very high - potential top');
  }

  // Momentum Analysis
  if (token.hourlyAcceleration && token.hourlyAcceleration < -20) {
    signals.push('🔻 Strong downward momentum - protect profits');
  }

  return signals;
};

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

const analyzeMarketCap = (token: TokenMetrics): string[] => {
  const warnings: string[] = [];
  const marketCap = token.marketCap ?? 0;

  if (marketCap === 0) {
    warnings.push('⚠️ Unable to determine market cap - exercise caution');
    return warnings;
  }

  if (marketCap < SAFETY_THRESHOLDS.MARKET_CAP.MIN_VIABLE) {
    warnings.push(`🚨 Very low market cap ($${(marketCap / 1000).toFixed(1)}k) - high volatility risk`);
  } else if (marketCap < SAFETY_THRESHOLDS.MARKET_CAP.HEALTHY) {
    warnings.push(`⚠️ Low market cap ($${(marketCap / 1_000_000).toFixed(1)}M) - proceed with caution`);
  }

  if (marketCap > SAFETY_THRESHOLDS.MARKET_CAP.SWEET_SPOT) {
    warnings.push(`🎯 Large market cap ($${(marketCap / 1_000_000).toFixed(1)}M) - consider taking profits`);
  }

  if (marketCap > SAFETY_THRESHOLDS.MARKET_CAP.MAX_UPSIDE) {
    warnings.push(`📊 Market cap above optimal range ($${(marketCap / 1_000_000).toFixed(1)}M) - limited upside potential`);
  }

  return warnings;
};

const detectWhaleActivity = (token: TokenMetrics): string[] => {
  const warnings: string[] = [];
  
  // Calculate average transaction value
  const totalTxns = (token.txns?.h24?.buys ?? 0) + (token.txns?.h24?.sells ?? 0);
  const avgTxnValue = totalTxns > 0 ? token.volume24h / totalTxns : 0;
  
  // Calculate impact on liquidity
  const liquidityImpact = avgTxnValue / token.liquidity;
  
  // Check for large transactions relative to liquidity
  if (liquidityImpact > SAFETY_THRESHOLDS.WHALE.TRANSACTION_IMPACT) {
    warnings.push(`🐋 Large transactions (${(liquidityImpact * 100).toFixed(1)}% of liquidity) - whale activity detected`);
  }
  
  // Check for excessive volume relative to liquidity
  const volumeLiquidityRatio = token.volume24h / token.liquidity;
  if (volumeLiquidityRatio > SAFETY_THRESHOLDS.WHALE.VOLUME_LIQUIDITY_MULT) {
    warnings.push(`⚠️ Volume exceeds ${SAFETY_THRESHOLDS.WHALE.VOLUME_LIQUIDITY_MULT}x liquidity - possible manipulation`);
  }
  
  // Check for recent large sells
  const sellCount = token.txns?.h24?.sells ?? 0;
  const avgSellImpact = sellCount > 0 ? (token.volume24h * 0.5) / (sellCount * token.liquidity) : 0;
  if (avgSellImpact > SAFETY_THRESHOLDS.WHALE.TRANSACTION_IMPACT) {
    warnings.push('🚨 Large sell orders detected - potential whale distribution');
  }

  return warnings;
}; 