import axios from 'axios';
import { DEXSCREENER_API } from '../config/constants';
import { TokenScanner } from '../services/tokenScanner';

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

interface TrendingToken {
  address: string;
  name: string;
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  dexId?: string;
  pairAddress?: string;
  icon?: string;
  description?: string;
  links?: Array<{
    type?: string;
    label?: string;
    url: string;
  }>;
  buyRatio?: number;      // Ratio of buys to total transactions
  priceChange1h?: number; // 1h price change for faster signals
  volumeChange?: number;  // Volume change vs previous period
  txCount?: number;       // Transaction count
}

interface TokenMetrics extends TrendingToken {
  hourlyAcceleration?: number;
  volumeAcceleration?: number;
  isEarlyPhase?: boolean;
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
        token.liquidity >= 25000 && // Minimum $25k liquidity
        token.volume24h >= 5000;    // Minimum $5k daily volume

      // Momentum indicators
      const volumeToLiquidityRatio = token.volume24h / token.liquidity;
      const buyPressure = token.buyRatio ?? 0;
      const priceAcceleration = token.hourlyAcceleration ?? 0;

      const momentumCheck =
        volumeToLiquidityRatio > 0.3 && // Healthy trading volume
        buyPressure > 0.5 &&            // More buys than sells
        priceAcceleration > 1.0;        // Price gaining momentum

      if (safetyCheck && momentumCheck) {
        // Calculate comprehensive score
        const score = (
          (volumeToLiquidityRatio * 30) +     // Volume/Liquidity ratio (30%)
          (buyPressure * 25) +                 // Buy pressure (25%)
          (priceAcceleration * 25) +           // Price momentum (25%)
          (Math.min(token.priceChange24h, 100) * 0.2) // Price performance (20%)
        );

        filteredTokens.push({
          ...token,
          score,
          indicators: {
            volumeToLiquidityRatio: volumeToLiquidityRatio.toFixed(2),
            buyPressure: buyPressure.toFixed(2),
            priceAcceleration: priceAcceleration.toFixed(2)
          }
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