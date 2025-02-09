export const SOLANA_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
export const DEXSCREENER_API = 'https://api.dexscreener.com/';

export const SAFETY_THRESHOLDS = {
  MIN_LIQUIDITY_USD: 50000, // Minimum $50k liquidity
  MIN_VOLUME_24H: 10000,    // Minimum $10k daily volume
  MIN_VOLUME_LIQUIDITY_RATIO: 0.5, // Healthy trading volume ratio
  MIN_PRICE_CHANGE: 0,      // Only positive momentum
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
      BUY_PRESSURE: 0.7,    // 70% buys
      VOLUME_SPIKE: 3,      // 3x volume/liquidity
      PRICE_ACCEL: 2.0,     // Price moving 2x faster than average
    },
    MODERATE: {
      BUY_PRESSURE: 0.6,    // 60% buys
      VOLUME_SPIKE: 2,      // 2x volume/liquidity
      PRICE_ACCEL: 1.5,     // 1.5x price acceleration
    }
  },
  SELL: {
    STRONG: {
      BUY_PRESSURE_DROP: 0.4,  // Buy ratio drops below 40%
      VOLUME_DROP: 0.5,        // Volume drops by 50%
      PRICE_DECEL: 0.5,        // Price momentum drops by half
    },
    MODERATE: {
      BUY_PRESSURE_DROP: 0.45, // Buy ratio drops below 45%
      VOLUME_DROP: 0.7,        // Volume drops by 30%
      PRICE_DECEL: 0.7,        // Price momentum slows by 30%
    }
  }
}; 