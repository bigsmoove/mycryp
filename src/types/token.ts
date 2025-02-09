export interface TokenIndicators {
  volumeToLiquidityRatio: string;
  buyPressure: string;
  priceAcceleration: string;
  volumeSpike?: boolean;
  buyPressureSurge?: boolean;
  priceAccelerationAlert?: boolean;
}

export interface TrendingToken {
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
  indicators?: TokenIndicators;
  alerts?: string[];
  score?: number;
} 