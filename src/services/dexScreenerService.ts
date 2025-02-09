import axios from 'axios';
import { DEXSCREENER_API } from '../config/constants';

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

    // Get pair data for each token
    const tokens = await Promise.all(
      solanaProfiles.map(async (profile: TokenProfile) => {
        try {
          // Get token pairs data
          const pairsResponse = await axios.get(
            `${DEXSCREENER_API}/token-pairs/v1/solana/${profile.tokenAddress}`
          );

          if (!pairsResponse.data?.[0]) return null;

          const pair = pairsResponse.data[0];
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
            links: profile.links
          };
        } catch (error) {
          console.error(`Error fetching pair data for ${profile.tokenAddress}:`, error);
          return null;
        }
      })
    );

    // Filter out nulls and sort by volume
    return tokens
      .filter((token): token is TrendingToken => 
        token !== null &&
        token.liquidity >= 50000 && // Min $50k liquidity
        token.volume24h >= 10000    // Min $10k daily volume
      )
      .sort((a, b) => b.volume24h - a.volume24h);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('DexScreener API Error:', {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url
      });
    } else {
      console.error('Error fetching trending tokens:', error);
    }
    return [];
  }
};

// Get specific token details
export const getTokenDetails = async (tokenAddress: string): Promise<any> => {
  try {
    const [tokenData, pairsData] = await Promise.all([
      axios.get(`${DEXSCREENER_API}/tokens/v1/solana/${tokenAddress}`),
      axios.get(`${DEXSCREENER_API}/token-pairs/v1/solana/${tokenAddress}`)
    ]);

    if (!tokenData.data?.[0]) {
      throw new Error('No token data found');
    }

    const mainPair = tokenData.data[0];
    const allPairs = pairsData.data || [];

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
    // According to docs: GET /token-pairs/v1/{chainId}/{tokenAddress}
    const response = await axios.get(
      `${DEXSCREENER_API}/token-pairs/v1/solana/${tokenAddress}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching token pairs:', error);
    return null;
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