export interface TokenIndicators {
  volumeToLiquidityRatio: string;
  buyPressure: string;
  priceAcceleration: string;
  volumeSpike?: boolean;
  buyPressureSurge?: boolean;
  priceAccelerationAlert?: boolean;
}

export type SignalStrength = 'STRONG_BUY' | 'MODERATE_BUY' | 'HOLD' | 'CONSIDER_SELL' | 'STRONG_SELL';

export interface TradingSignal {
  signal: SignalStrength;
  confidence: number;
  reasons: string[];
  indicators: {
    buyPressure: {
      value: number;
      trend: 'up' | 'down' | 'neutral';
    };
    volumeMetric: {
      value: number;
      trend: 'up' | 'down' | 'neutral';
    };
    priceMovement: {
      value: number;
      trend: 'up' | 'down' | 'neutral';
    };
  };
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
  tradingSignal?: TradingSignal;
} 