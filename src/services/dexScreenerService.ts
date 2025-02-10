import axios from 'axios';
import { DEXSCREENER_API } from '../config/constants';
import { ALERT_THRESHOLDS, TRADING_SIGNALS, PRICE_ACTION, TOKEN_MATURITY, VOLUME_ANALYSIS, TRADING_STRATEGY, CHART_PATTERNS, SMART_MONEY } from '../config/constants';
import { TrendingToken, SignalStrength, TradingSignal } from '../types/token';
import { analyzeTimeWindow, analyzeMomentumSustainability } from './timeAnalysisService';

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

const ENTRY_STRATEGY = {
  SCALING: {
    INITIAL: 0.3,     // 30% of planned position
    SECONDARY: 0.3,   // Another 30% on confirmation
    FINAL: 0.4        // Final 40% when fully confident
  },
  CONDITIONS: {
    INITIAL: {
      MIN_BUY_RATIO: 0.65,    // 65% buys minimum
      MAX_VOLATILITY: 50,     // Max 50% daily change
      MIN_LIQUIDITY: 250_000  // $250k minimum liquidity
    },
    ADD: {
      PRICE_DIP: -5,          // Buy more on 5% dips
      VOLUME_INCREASE: 1.5,    // 50% volume increase
      STRONG_BOUNCE: 3        // 3% bounce from support
    }
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
        const signalAnalysis = analyzeTradingSignals(token);
        
        // Debug the trading signal
        console.log('Trading signal:', {
          symbol: token.symbol,
          signal: signalAnalysis.signal,
          score: signalAnalysis.score,
          confidence: signalAnalysis.confidence
        });

        filteredTokens.push({
          ...token,
          tradingSignal: {
            ...signalAnalysis,
            score: signalAnalysis.score // Explicitly include the score
          }
        });
      }
    }

    // Add debug logging
    console.log('Filtered tokens with risk scores:', 
      filteredTokens.map(t => ({
        symbol: t.symbol,
        riskScore: t.tradingSignal?.score
      }))
    );

    // Sort by score and return
    return filteredTokens
      .sort((a, b) => (b.tradingSignal?.score || 0) - (a.tradingSignal?.score || 0))
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
const calculateRiskScore = (token: TokenMetrics): { score: number; factors: string[] } => {
  let riskScore = 50; // Base score
  const riskFactors: string[] = [];

  // Market cap risk (-20 to +20)
  const marketCap = token.marketCap ?? 0;
  if (marketCap < SAFETY_THRESHOLDS.MARKET_CAP.MIN_VIABLE) {
    riskScore += 20;
    riskFactors.push('Very low market cap');
  } else if (marketCap > SAFETY_THRESHOLDS.MARKET_CAP.SWEET_SPOT) {
    riskScore -= 20;
    riskFactors.push('Large established market cap');
  }

  // Liquidity risk (-15 to +15)
  if (token.liquidity < SAFETY_THRESHOLDS.LIQUIDITY.MIN) {
    riskScore += 15;
    riskFactors.push('Low liquidity');
  } else if (token.liquidity > SAFETY_THRESHOLDS.LIQUIDITY.HEALTHY) {
    riskScore -= 15;
    riskFactors.push('Healthy liquidity');
  }

  // Volume patterns (-10 to +10)
  const volLiqRatio = token.volume24h / token.liquidity;
  if (volLiqRatio > SAFETY_THRESHOLDS.RATIOS.MAX_VOL_LIQ) {
    riskScore += 10;
    riskFactors.push('High volume vs liquidity');
  } else if (volLiqRatio < 3) {
    riskScore -= 10;
    riskFactors.push('Stable volume patterns');
  }

  // Transaction patterns (-5 to +5)
  const totalTxns = (token.txns?.h24?.buys ?? 0) + (token.txns?.h24?.sells ?? 0);
  if (totalTxns < SAFETY_THRESHOLDS.TRANSACTIONS.MIN_24H) {
    riskScore += 5;
    riskFactors.push('Low transaction count');
  } else if (totalTxns > SAFETY_THRESHOLDS.TRANSACTIONS.MIN_24H * 3) {
    riskScore -= 5;
    riskFactors.push('High trading activity');
  }

  // Ensure score stays within 0-100 range
  return {
    score: Math.min(Math.max(Math.round(riskScore), 0), 100),
    factors: riskFactors
  };
};

const analyzePriceAction = (token: TokenMetrics): string[] => {
  const insights: string[] = [];
  const { HEALTHY_GROWTH, MOMENTUM, CONSOLIDATION } = PRICE_ACTION.THRESHOLDS;
  
  // Check for healthy growth
  if (token.priceChange24h > HEALTHY_GROWTH.MIN && token.priceChange24h < HEALTHY_GROWTH.MAX) {
    insights.push('📈 Healthy price growth - not overheated');
  } else if (token.priceChange24h > HEALTHY_GROWTH.MAX) {
    insights.push('🔥 Price potentially overheated - exercise caution');
  }
  
  // Check for potential reversal
  if (token.hourlyAcceleration && token.hourlyAcceleration < MOMENTUM.REVERSAL) {
    insights.push('⚠️ Momentum slowing - potential reversal');
  } else if (token.hourlyAcceleration && token.hourlyAcceleration > MOMENTUM.STRONG) {
    insights.push('🚀 Strong upward momentum detected');
  }
  
  // Check for consolidation
  const priceMovement = Math.abs(token.priceChange24h);
  const volLiqRatio = token.volume24h / token.liquidity;
  
  if (priceMovement < CONSOLIDATION.RANGE && volLiqRatio > CONSOLIDATION.MIN_VOL_RATIO) {
    insights.push('🎯 Healthy consolidation with good volume');
  }
  
  return insights;
};

const analyzeTokenMaturity = (token: TokenMetrics): { classification: string; reasons: string[] } => {
  const reasons: string[] = [];
  const marketCap = token.marketCap ?? 0;
  
  // Check if it's a new token
  if (
    marketCap < TOKEN_MATURITY.THRESHOLDS.NEW_TOKEN.MAX_MARKET_CAP &&
    (token.txns?.h24?.buys ?? 0) + (token.txns?.h24?.sells ?? 0) < 1000
  ) {
    reasons.push('🌱 New token - early stage investment');
    return { classification: 'NEW', reasons };
  }
  
  // Check if it's established
  if (
    marketCap > TOKEN_MATURITY.THRESHOLDS.ESTABLISHED_TOKEN.MIN_MARKET_CAP &&
    token.liquidity > SAFETY_THRESHOLDS.LIQUIDITY.HEALTHY * 2
  ) {
    reasons.push('🏛️ Established token - mature market');
    return { classification: 'ESTABLISHED', reasons };
  }
  
  reasons.push('📈 Growing token - development phase');
  return { classification: 'GROWING', reasons };
};

const analyzeVolumeTrends = (token: TokenMetrics): string[] => {
  const insights: string[] = [];
  const buyRatio = token.buyRatio ?? 0.5;
  const buyVolume = token.volume24h * buyRatio;
  const sellVolume = token.volume24h * (1 - buyRatio);
  const buySellRatio = buyVolume / (sellVolume || 1);

  // Analyze buy/sell ratio
  if (buySellRatio > VOLUME_ANALYSIS.THRESHOLDS.BUY_SELL_RATIO.VERY_BULLISH) {
    insights.push(`💫 Very strong buy pressure - ${buySellRatio.toFixed(1)}x more buys than sells`);
  } else if (buySellRatio > VOLUME_ANALYSIS.THRESHOLDS.BUY_SELL_RATIO.BULLISH) {
    insights.push(`📈 Healthy buy pressure - ${buySellRatio.toFixed(1)}x more buys than sells`);
  } else if (buySellRatio < VOLUME_ANALYSIS.THRESHOLDS.BUY_SELL_RATIO.VERY_BEARISH) {
    insights.push(`⚠️ Heavy selling pressure - ${(1/buySellRatio).toFixed(1)}x more sells than buys`);
  }

  // Volume significance
  const volumeToLiq = token.volume24h / token.liquidity;
  if (volumeToLiq > VOLUME_ANALYSIS.THRESHOLDS.VOLUME_INCREASE.MAJOR) {
    insights.push(`🌊 Massive volume - ${volumeToLiq.toFixed(1)}x liquidity in 24h`);
  } else if (volumeToLiq > VOLUME_ANALYSIS.THRESHOLDS.VOLUME_INCREASE.SIGNIFICANT) {
    insights.push(`💫 High trading activity - ${volumeToLiq.toFixed(1)}x liquidity in 24h`);
  }

  return insights;
};

const calculatePriceTargets = (token: TokenMetrics) => {
  const { RESISTANCE_MULTIPLIER, SUPPORT_MULTIPLIER } = TRADING_STRATEGY.PRICE_TARGETS;
  
  const nextResistance = token.price * RESISTANCE_MULTIPLIER;
  const supportLevel = token.price * SUPPORT_MULTIPLIER;
  const riskRewardRatio = (nextResistance - token.price) / (token.price - supportLevel);

  return {
    entry: token.price,
    nextResistance,
    supportLevel,
    riskRewardRatio,
    stopLoss: supportLevel,
    targetProfit: nextResistance
  };
};

const suggestStrategy = (token: TokenMetrics): { 
  recommendation: string; 
  reasoning: string[];
  targets?: ReturnType<typeof calculatePriceTargets>;
} => {
  const reasoning: string[] = [];
  
  // Check market cap tier
  const marketCap = token.marketCap ?? 0;
  if (marketCap > TRADING_STRATEGY.MARKET_CAP_TIERS.LARGE) {
    return {
      recommendation: "WAIT",
      reasoning: ["🐋 Market cap too large - limited upside potential"]
    };
  }

  // Calculate targets
  const targets = calculatePriceTargets(token);
  
  // Check if risk/reward is attractive
  if (targets.riskRewardRatio < TRADING_STRATEGY.PRICE_TARGETS.MIN_RISK_REWARD) {
    return {
      recommendation: "WAIT",
      reasoning: [`📊 Risk/Reward ratio (${targets.riskRewardRatio.toFixed(2)}) below minimum`]
    };
  }

  // Check buy pressure
  const buyRatio = token.buyRatio ?? 0;
  if (buyRatio > TRADING_STRATEGY.ENTRY_CONDITIONS.STRONG_BUY_RATIO) {
    reasoning.push(`💫 Strong buy pressure (${(buyRatio * 100).toFixed(1)}% buys)`);
  }

  // Check liquidity
  if (token.liquidity > TRADING_STRATEGY.ENTRY_CONDITIONS.MIN_LIQUIDITY) {
    reasoning.push(`💧 Good liquidity ($${(token.liquidity / 1000).toFixed(1)}k)`);
  }

  // Make final recommendation
  if (reasoning.length >= 2) {
    return {
      recommendation: "ENTER",
      reasoning: [
        "🎯 Consider entering position",
        `📈 Target: $${targets.targetProfit.toFixed(8)}`,
        `🛑 Stop Loss: $${targets.stopLoss.toFixed(8)}`,
        ...reasoning
      ],
      targets
    };
  }

  return {
    recommendation: "MONITOR",
    reasoning: ["⏳ Wait for better setup"],
    targets
  };
};

const detectPatterns = (token: TokenMetrics): string[] => {
  const patterns: string[] = [];
  const { BULLISH, BEARISH } = CHART_PATTERNS;
  
  // Bullish Breakout Pattern
  if (
    token.priceChange24h > BULLISH.BREAKOUT.MIN_GAIN && 
    token.volume24h > token.liquidity * BULLISH.BREAKOUT.VOLUME_SPIKE &&
    (token.buyRatio ?? 0) > BULLISH.BREAKOUT.MIN_BUY_RATIO
  ) {
    patterns.push('🚀 Bullish Breakout Pattern Detected');
    patterns.push(`  • ${token.priceChange24h.toFixed(1)}% price increase`);
    patterns.push(`  • ${(token.volume24h / token.liquidity).toFixed(1)}x volume spike`);
  }
  
  // Accumulation Pattern
  if (
    Math.abs(token.priceChange24h) < BULLISH.ACCUMULATION.MAX_RANGE && 
    (token.buyRatio ?? 0) > BULLISH.ACCUMULATION.MIN_BUY_RATIO &&
    token.volume24h > SAFETY_THRESHOLDS.VOLUME.MIN_24H
  ) {
    patterns.push('📈 Accumulation Pattern - Potential Breakout Soon');
    patterns.push(`  • Strong buy ratio: ${((token.buyRatio ?? 0) * 100).toFixed(1)}%`);
    patterns.push(`  • Tight price range: ${Math.abs(token.priceChange24h).toFixed(1)}%`);
  }
  
  // Bearish Distribution Pattern
  if (
    (token.buyRatio ?? 1) < BEARISH.DISTRIBUTION.MAX_BUY_RATIO &&
    token.volume24h > token.liquidity * BEARISH.DISTRIBUTION.SELL_SIZE
  ) {
    patterns.push('🚨 Distribution Pattern - Possible Top');
    patterns.push(`  • Heavy selling: ${((1 - (token.buyRatio ?? 0)) * 100).toFixed(1)}% sells`);
    patterns.push(`  • Large volume: ${(token.volume24h / token.liquidity).toFixed(1)}x liquidity`);
  }
  
  // Momentum Pattern
  if (
    (token.hourlyAcceleration ?? 0) > BULLISH.MOMENTUM.MIN_ACCELERATION &&
    token.volume24h > token.liquidity * BULLISH.MOMENTUM.VOLUME_INCREASE
  ) {
    patterns.push('💫 Strong Momentum Pattern');
    patterns.push(`  • Acceleration: ${(token.hourlyAcceleration ?? 0).toFixed(1)}%`);
    patterns.push(`  • Volume increasing`);
  }

  return patterns;
};

const analyzeSmartMoney = (token: TokenMetrics): { 
  insights: string[];
  confidence: number;
} => {
  const insights: string[] = [];
  let confidence = SMART_MONEY.SIGNALS.CONFIDENCE.LOW;

  // Calculate key metrics
  const avgTxSize = token.volume24h / ((token.txns?.h24?.buys ?? 0) + (token.txns?.h24?.sells ?? 0) || 1);
  const buyRatio = token.buyRatio ?? 0;
  const volLiqRatio = token.volume24h / token.liquidity;

  // Detect whale accumulation
  if (avgTxSize > SMART_MONEY.THRESHOLDS.WHALE_ENTRY && buyRatio > SMART_MONEY.THRESHOLDS.ACCUMULATION.MIN_BUY_RATIO) {
    insights.push('🐋 Smart Money Accumulation Detected');
    insights.push(`  • Large buys averaging $${avgTxSize.toFixed(0)}`);
    insights.push(`  • Strong buy ratio: ${(buyRatio * 100).toFixed(1)}%`);
    confidence = SMART_MONEY.SIGNALS.CONFIDENCE.HIGH;
  }

  // Detect institutional buying
  if (avgTxSize > SMART_MONEY.THRESHOLDS.LARGE_TX && 
      volLiqRatio > 1.5 && 
      buyRatio > 0.6) {
    insights.push('🏛️ Institutional Buying Pattern');
    insights.push(`  • Average position size: $${avgTxSize.toFixed(0)}`);
    insights.push(`  • Volume ${volLiqRatio.toFixed(1)}x liquidity`);
    confidence = Math.max(confidence, SMART_MONEY.SIGNALS.CONFIDENCE.MEDIUM);
  }

  // Detect distribution
  if (avgTxSize > SMART_MONEY.THRESHOLDS.LARGE_TX && 
      buyRatio < SMART_MONEY.THRESHOLDS.DISTRIBUTION.MAX_BUY_RATIO &&
      volLiqRatio > SMART_MONEY.THRESHOLDS.DISTRIBUTION.VOLUME_SPIKE) {
    insights.push('⚠️ Smart Money Distribution');
    insights.push(`  • Large sells detected`);
    insights.push(`  • Heavy selling pressure: ${((1 - buyRatio) * 100).toFixed(1)}% sells`);
    confidence = SMART_MONEY.SIGNALS.CONFIDENCE.HIGH;
  }

  return { insights, confidence };
};

// Update analyzeTradingSignals to include smart money analysis
const analyzeTradingSignals = (token: TokenMetrics): TradingSignal => {
  const { classification, reasons: maturityReasons } = analyzeTokenMaturity(token);
  const volumeInsights = analyzeVolumeTrends(token);
  const patterns = detectPatterns(token);
  const { insights: smartMoneyInsights, confidence: smartMoneyConfidence } = analyzeSmartMoney(token);
  const safetyIssues = analyzeSafetyMetrics(token);
  const exitSignals = getExitSignals(token);
  const marketCapWarnings = analyzeMarketCap(token);
  const whaleWarnings = detectWhaleActivity(token);
  const priceActionInsights = analyzePriceAction(token);
  const { score: riskScore, factors: riskFactors } = calculateRiskScore(token);
  
  // Debug the risk score calculation
  console.log('Risk score calculation:', {
    symbol: token.symbol,
    calculatedScore: riskScore,
    marketCap: token.marketCap,
    liquidity: token.liquidity,
    factors: riskFactors
  });

  const entryStrategy = calculateEntryStrategy(token);
  const strategy = suggestStrategy(token);
  
  const timeWindow = analyzeTimeWindow();
  const momentumSustainability = analyzeMomentumSustainability(token);
  
  // Adjust position sizing based on time window
  if (entryStrategy.recommendation === 'SCALE_IN') {
    entryStrategy.sizing = {
      initial: entryStrategy.sizing.initial * timeWindow.volatilityMultiplier,
      secondary: entryStrategy.sizing.secondary * timeWindow.volatilityMultiplier,
      final: entryStrategy.sizing.final * timeWindow.volatilityMultiplier
    };
  }

  // Add time-based insights
  const timeBasedInsights = [
    timeWindow.isPeakHour ? '⏰ Peak trading hours - good liquidity expected' :
    timeWindow.isQuietHour ? '💤 Quiet trading period - consider waiting' :
    '👍 Normal trading hours',
    
    momentumSustainability.isSustained
      ? `🌊 Strong momentum ${momentumSustainability.timeQualifier}`
      : '⚠️ Recent movement - await confirmation'
  ];

  const allWarnings = [
    ...timeBasedInsights,
    ...patterns,
    ...smartMoneyInsights,
    ...maturityReasons,
    ...volumeInsights,
    ...safetyIssues,
    ...exitSignals,
    ...marketCapWarnings,
    ...whaleWarnings,
    ...priceActionInsights,
    ...riskFactors.map(f => `  • ${f}`),
    ...strategy.reasoning,
    ...entryStrategy.reasoning  // Add entry strategy insights
  ];

  // Calculate signal strength
  let signal: SignalStrength = 'HOLD';
  let confidence = 50;

  // Get values with safe defaults
  const buyRatio = token.buyRatio ?? 0;
  const marketCap = token.marketCap ?? 0;
  const volLiqRatio = token.volume24h / token.liquidity;
  const acceleration = token.hourlyAcceleration ?? 0;

  // Strong Buy Conditions
  if (
    buyRatio >= TRADING_SIGNALS.BUY.STRONG.BUY_PRESSURE &&
    volLiqRatio >= TRADING_SIGNALS.BUY.STRONG.VOLUME_SPIKE &&
    acceleration >= TRADING_SIGNALS.BUY.STRONG.PRICE_ACCEL
  ) {
    signal = 'STRONG_BUY';
    confidence = 90;
  }
  // Moderate Buy Conditions
  else if (
    buyRatio >= TRADING_SIGNALS.BUY.MODERATE.BUY_PRESSURE &&
    volLiqRatio >= TRADING_SIGNALS.BUY.MODERATE.VOLUME_SPIKE &&
    acceleration >= TRADING_SIGNALS.BUY.MODERATE.PRICE_ACCEL
  ) {
    signal = 'MODERATE_BUY';
    confidence = 70;
  }
  // Strong Sell Conditions
  else if (
    buyRatio <= TRADING_SIGNALS.SELL.STRONG.BUY_PRESSURE_DROP ||
    volLiqRatio <= TRADING_SIGNALS.SELL.STRONG.VOLUME_DROP ||
    acceleration <= TRADING_SIGNALS.SELL.STRONG.PRICE_DECEL
  ) {
    signal = 'STRONG_SELL';
    confidence = 85;
  }
  // Consider Sell Conditions
  else if (
    buyRatio <= TRADING_SIGNALS.SELL.MODERATE.BUY_PRESSURE_DROP ||
    volLiqRatio <= TRADING_SIGNALS.SELL.MODERATE.VOLUME_DROP ||
    acceleration <= TRADING_SIGNALS.SELL.MODERATE.PRICE_DECEL
  ) {
    signal = 'CONSIDER_SELL';
    confidence = 65;
  }

  // Adjust confidence based on all signals
  confidence = Math.max(confidence, smartMoneyConfidence);

  return {
    signal,
    confidence,
    reasons: allWarnings,
    score: riskScore,
    strategy: strategy.recommendation,
    priceTargets: strategy.targets,
    entryPlan: {              // Add entry plan
      recommendation: entryStrategy.recommendation,
      sizing: entryStrategy.sizing,
      entry: entryStrategy.entry
    },
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
        value: acceleration,
        trend: getPriceTrend(acceleration)
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

const calculateEntryStrategy = (token: TokenMetrics): {
  recommendation: string;
  entry: number;
  sizing: {
    initial: number;
    secondary: number;
    final: number;
  };
  reasoning: string[];
} => {
  const reasoning: string[] = [];
  const { SCALING, CONDITIONS } = ENTRY_STRATEGY;
  
  // Check if conditions are right for entry
  if (
    token.liquidity >= CONDITIONS.INITIAL.MIN_LIQUIDITY &&
    (token.buyRatio ?? 0) >= CONDITIONS.INITIAL.MIN_BUY_RATIO &&
    Math.abs(token.priceChange24h) <= CONDITIONS.INITIAL.MAX_VOLATILITY
  ) {
    const maxPositionUsd = Math.min(token.liquidity * 0.01, 10000); // 1% of liquidity or $10k max
    
    return {
      recommendation: 'SCALE_IN',
      entry: token.price,
      sizing: {
        initial: maxPositionUsd * SCALING.INITIAL,
        secondary: maxPositionUsd * SCALING.SECONDARY,
        final: maxPositionUsd * SCALING.FINAL
      },
      reasoning: [
        '🎯 Conditions favorable for scaled entry:',
        `  • Initial Buy: $${(maxPositionUsd * SCALING.INITIAL).toFixed(0)}`,
        `  • Second Buy: $${(maxPositionUsd * SCALING.SECONDARY).toFixed(0)} on ${CONDITIONS.ADD.PRICE_DIP}% dip`,
        `  • Final Buy: $${(maxPositionUsd * SCALING.FINAL).toFixed(0)} on momentum confirmation`
      ]
    };
  }
  
  return {
    recommendation: 'WAIT',
    entry: token.price,
    sizing: { initial: 0, secondary: 0, final: 0 },
    reasoning: ['⏳ Wait for better entry conditions']
  };
};

export const createSignalSummary = (token: TokenMetrics): {
  verdict: string;
  score: number;
  bullishFactors: string[];
  bearishFactors: string[];
  keyMetrics: {
    price: string;
    buyPressure: string;
    volume: string;
    liquidity: string;
    marketCap: string;
  };
  tradingPlan?: {
    entry: string;
    target: string;
    stopLoss: string;
    position: string;
  };
} => {
  const bullishFactors: string[] = [];
  const bearishFactors: string[] = [];
  
  // Categorize existing signals
  const buyRatio = token.buyRatio ?? 0;
  const volLiqRatio = token.volume24h / token.liquidity;
  const acceleration = token.hourlyAcceleration ?? 0;

  // Add Bullish Factors
  if (buyRatio > 0.65) {
    bullishFactors.push(`🔥 Strong buy pressure (${(buyRatio * 100).toFixed(1)}% buys)`);
  }
  if (volLiqRatio > 2) {
    bullishFactors.push(`📈 High volume (${volLiqRatio.toFixed(1)}x liquidity)`);
  }
  if (acceleration > 15) {
    bullishFactors.push(`🚀 Strong momentum (${acceleration.toFixed(1)}% acceleration)`);
  }

  // Add Bearish Factors
  if (token.liquidity < 250_000) {
    bearishFactors.push(`💧 Low liquidity ($${(token.liquidity / 1000).toFixed(1)}k)`);
  }
  if (token.priceChange24h > 100) {
    bearishFactors.push(`⚠️ Overheated (+${token.priceChange24h.toFixed(1)}% in 24h)`);
  }
  if ((token.marketCap ?? 0) < 1_000_000) {
    bearishFactors.push(`⚠️ Very low market cap ($${((token.marketCap ?? 0) / 1000).toFixed(1)}k)`);
  }

  // Calculate overall verdict
  const bullishCount = bullishFactors.length;
  const bearishCount = bearishFactors.length;
  const verdict = bullishCount > bearishCount * 2 ? 'STRONG_BUY' :
                 bullishCount > bearishCount ? 'MODERATE_BUY' :
                 bearishCount > bullishCount * 2 ? 'AVOID' :
                 bearishCount > bullishCount ? 'CAUTION' : 'NEUTRAL';

  // Calculate trading plan if verdict is positive
  const tradingPlan = (verdict === 'STRONG_BUY' || verdict === 'MODERATE_BUY') ? {
    entry: `$${token.price.toFixed(8)}`,
    target: `$${(token.price * 1.45).toFixed(8)}`,
    stopLoss: `$${(token.price * 0.85).toFixed(8)}`,
    position: `$${Math.min(token.liquidity * 0.01, 10000).toFixed(0)}`
  } : undefined;

  return {
    verdict,
    score: (bullishCount * 20) - (bearishCount * 15) + 50, // Base 50, adjust up/down
    bullishFactors,
    bearishFactors,
    keyMetrics: {
      price: `$${token.price.toFixed(8)}`,
      buyPressure: `${(buyRatio * 100).toFixed(1)}%`,
      volume: `$${(token.volume24h / 1000).toFixed(1)}k`,
      liquidity: `$${(token.liquidity / 1000).toFixed(1)}k`,
      marketCap: `$${((token.marketCap ?? 0) / 1000).toFixed(1)}k`
    },
    tradingPlan
  };
}; 