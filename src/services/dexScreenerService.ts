import axios from 'axios';
import { DEXSCREENER_API } from '../config/constants';

interface TrendingToken {
  address: string;
  name: string;
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
}

export const fetchTrendingTokens = async (): Promise<TrendingToken[]> => {
  try {
    // First get boosted/trending tokens
    const boostResponse = await axios.get(`${DEXSCREENER_API}/token-boosts/latest/v1`);
    const solanaBoosts = boostResponse.data.filter((boost: any) => boost.chainId === 'solana');
    
    // Get token details for each boosted token
    const tokenDetails = await Promise.all(
      solanaBoosts.map(async (boost: any) => {
        try {
          // According to docs: GET /tokens/v1/{chainId}/{tokenAddresses}
          const response = await axios.get(
            `${DEXSCREENER_API}/tokens/v1/solana/${boost.tokenAddress}`
          );
          
          if (response.data && response.data[0]) {
            const pair = response.data[0];
            return {
              address: pair.baseToken.address,
              name: pair.baseToken.name,
              symbol: pair.baseToken.symbol,
              price: parseFloat(pair.priceUsd) || 0,
              volume24h: pair.volume?.h24 || 0,
              priceChange24h: pair.priceChange?.h24 || 0,
              liquidity: pair.liquidity?.usd || 0,
              boostAmount: boost.amount || 0
            };
          }
        } catch (error) {
          console.error(`Error fetching token details for ${boost.tokenAddress}:`, error);
        }
        return null;
      })
    );

    // Filter out null results and sort by boost amount
    return tokenDetails
      .filter((token): token is TrendingToken => token !== null)
      .filter(token => 
        token.liquidity > 50000 && // Min $50k liquidity
        token.volume24h > 10000    // Min $10k daily volume
      )
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 10); // Top 10 tokens

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
    // According to docs: GET /tokens/v1/{chainId}/{tokenAddresses}
    const response = await axios.get(
      `${DEXSCREENER_API}/tokens/v1/solana/${tokenAddress}`
    );
    return response.data[0];
  } catch (error) {
    console.error('Error fetching token details:', error);
    return null;
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