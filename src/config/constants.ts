export const SOLANA_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
export const DEXSCREENER_API = 'https://api.dexscreener.com/';

export const SAFETY_THRESHOLDS = {
  MARKET_CAP: {
    MIN_VIABLE: 500_000,    // $500k minimum
    HEALTHY: 5_000_000,     // $5M healthy range
    SWEET_SPOT: 100_000_000, // $100M - good exit point
    MAX_UPSIDE: 150_000_000  // $150M limited upside
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
  },
  WHALE: {
    TRANSACTION_IMPACT: 0.05,    // 5% of liquidity per transaction
    VOLUME_LIQUIDITY_MULT: 3,    // Volume exceeding 3x liquidity
    LARGE_HOLDER_PERCENT: 0.05,  // 5% or more of supply
    MAX_WALLET_CONCENTRATION: 0.1 // 10% max in single wallet
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

export const RISK_SCORE = {
  WEIGHTS: {
    MARKET_CAP: 25,    // 25% of total score
    LIQUIDITY: 25,     // 25% of total score
    VOLUME: 20,        // 20% of total score
    TRANSACTIONS: 15,  // 15% of total score
    WHALE_RISK: 15     // 15% of total score
  },
  THRESHOLDS: {
    LOW_RISK: 30,      // Score below 30 is low risk
    MEDIUM_RISK: 60,   // Score below 60 is medium risk
    HIGH_RISK: 100     // Score above 60 is high risk
  }
};

export const PRICE_ACTION = {
  THRESHOLDS: {
    HEALTHY_GROWTH: {
      MIN: 20,   // 20% minimum growth
      MAX: 100   // 100% maximum healthy growth
    },
    MOMENTUM: {
      REVERSAL: -10,    // -10% momentum signals reversal
      STRONG: 15        // +15% momentum signals strength
    },
    CONSOLIDATION: {
      RANGE: 5,         // 5% price movement
      MIN_VOL_RATIO: 0.5  // 50% volume/liquidity ratio minimum
    }
  }
};

export const TOKEN_MATURITY = {
  THRESHOLDS: {
    NEW_TOKEN: {
      MAX_AGE_HOURS: 48,      // Less than 48 hours old
      MAX_HOLDERS: 1000,      // Less than 1000 holders
      MAX_MARKET_CAP: 10_000_000  // Under $10M market cap
    },
    ESTABLISHED_TOKEN: {
      MIN_AGE_HOURS: 168,     // At least 1 week old
      MIN_HOLDERS: 5000,      // Over 5000 holders
      MIN_MARKET_CAP: 50_000_000  // Over $50M market cap
    }
  }
};

export const VOLUME_ANALYSIS = {
  THRESHOLDS: {
    BUY_SELL_RATIO: {
      VERY_BULLISH: 3.0,    // Buy volume 3x sell volume
      BULLISH: 1.5,         // Buy volume 1.5x sell volume
      BEARISH: 0.67,        // Sell volume 1.5x buy volume
      VERY_BEARISH: 0.33    // Sell volume 3x buy volume
    },
    VOLUME_INCREASE: {
      SIGNIFICANT: 2.0,     // Volume doubled
      MAJOR: 5.0           // Volume 5x increase
    }
  }
};

export const TRADING_STRATEGY = {
  PRICE_TARGETS: {
    RESISTANCE_MULTIPLIER: 1.25,  // 25% upside target
    SUPPORT_MULTIPLIER: 0.85,     // 15% downside risk
    MIN_RISK_REWARD: 1.5         // Minimum reward/risk ratio
  },
  MARKET_CAP_TIERS: {
    MICRO: 10_000_000,        // < $10M
    SMALL: 100_000_000,       // < $100M
    MEDIUM: 1_000_000_000,    // < $1B
    LARGE: 10_000_000_000     // > $1B
  },
  ENTRY_CONDITIONS: {
    STRONG_BUY_RATIO: 0.75,   // 75% buys
    MIN_LIQUIDITY: 500_000,   // $500k minimum
    MAX_VOLATILITY: 100       // 100% max daily change
  }
}; 