export const SOLANA_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
export const DEXSCREENER_API = 'https://api.dexscreener.com/';

export const SAFETY_THRESHOLDS = {
  MARKET_CAP: {
    MIN_VIABLE: 500_000,    // $500k minimum
    SWEET_SPOT: 100_000_000 // $100M - good exit point
  },
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
  }
};

// Updated patterns to catch more potential scams
export const BLACKLISTED_PATTERNS = [
  'TEST',
  'SCAM',
  'SAFE',
  'FAIR',
  'MOON',
  'ELON',
  'INU',
  'PEPE',
  'WOJAK',
  'DOGE',
  'SHIB',
  'BABY',
  'PUMP',
  'DUMP',
  'APE',
];

// Add rate limiting to prevent API abuse
export const API_RATE_LIMIT = {
  REQUESTS_PER_MINUTE: 30,
  TRENDING_REFRESH_INTERVAL: 30000, // 30 seconds
};

// Supported quote tokens for better price accuracy
export const STABLE_QUOTE_TOKENS = ['USDC', 'USDT'];

// Minimum requirements for valid pairs
export const PAIR_REQUIREMENTS = {
  MIN_LIQUIDITY_USD: 50000,
  MIN_VOLUME_24H: 10000,
};

export const ALERT_THRESHOLDS = {
  VOLUME_SPIKE: 3, // Volume 3x higher than average
  BUY_PRESSURE: 0.7, // 70% or more of transactions are buys
  PRICE_ACCELERATION: 2.0, // Price moving 2x faster than 24h average
  
  // Safety thresholds
  MIN_LIQUIDITY: 25000,  // $25k minimum liquidity
  MIN_VOLUME: 5000,      // $5k minimum volume
  MIN_TRADES: 20,        // Minimum trades in 24h
  
  // Scoring weights
  WEIGHTS: {
    VOLUME_LIQUIDITY: 30,
    BUY_PRESSURE: 25,
    PRICE_MOMENTUM: 25,
    PERFORMANCE: 20
  }
};

export const TRADING_SIGNALS = {
  BUY: {
    STRONG: {
      BUY_PRESSURE: 0.65,    // Lower from 0.7 - catch uptrends earlier
      VOLUME_SPIKE: 2.5,     // Lower from 3 
      PRICE_ACCEL: 1.5,      // Lower from 2.0
    },
    MODERATE: {
      BUY_PRESSURE: 0.55,    // Lower from 0.6
      VOLUME_SPIKE: 1.5,     // Lower from 2
      PRICE_ACCEL: 1.2,      // Lower from 1.5
    }
  },
  SELL: {
    STRONG: {
      BUY_PRESSURE_DROP: 0.35,  // Raise from 0.4
      VOLUME_DROP: 0.4,         // Lower from 0.5
      PRICE_DECEL: 0.4,         // Lower from 0.5
    },
    MODERATE: {
      BUY_PRESSURE_DROP: 0.45,  // Keep same
      VOLUME_DROP: 0.6,         // Lower from 0.7
      PRICE_DECEL: 0.6,         // Lower from 0.7
    }
  }
}; 