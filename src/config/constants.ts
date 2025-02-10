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

export const CHART_PATTERNS = {
  BULLISH: {
    BREAKOUT: {
      MIN_GAIN: 10,        // 10% minimum price gain
      VOLUME_SPIKE: 2,     // 2x normal volume
      MIN_BUY_RATIO: 0.65  // 65% buys minimum
    },
    ACCUMULATION: {
      MAX_RANGE: 5,        // 5% price range
      MIN_BUY_RATIO: 0.7,  // 70% buys
      MIN_DURATION: 60     // 60 minutes minimum
    },
    MOMENTUM: {
      MIN_ACCELERATION: 15,  // 15% acceleration
      SUSTAINED_MINS: 30,    // Sustained for 30 mins
      VOLUME_INCREASE: 1.5   // 50% volume increase
    }
  },
  BEARISH: {
    DISTRIBUTION: {
      SELL_SIZE: 0.05,     // 5% of liquidity per sale
      TIME_WINDOW: 60,     // Look back 60 minutes
      MAX_BUY_RATIO: 0.4   // Less than 40% buys
    },
    BREAKDOWN: {
      SUPPORT_BREAK: -10,  // 10% below support
      VOLUME_SPIKE: 2,     // 2x volume on breakdown
      MAX_BUY_RATIO: 0.3   // Less than 30% buys
    },
    EXHAUSTION: {
      MIN_GAIN: 50,        // 50% gain in period
      VOLUME_DROP: 0.5,    // 50% volume drop
      MOMENTUM_CHANGE: -20 // Momentum shifted negative
    }
  }
};

export const SMART_MONEY = {
  THRESHOLDS: {
    LARGE_TX: 50_000,      // $50k+ transactions
    WHALE_ENTRY: 100_000,  // $100k+ single entry
    ACCUMULATION: {
      TIME_WINDOW: 60,     // 60 minute window
      MIN_BUYS: 3,         // At least 3 large buys
      MAX_SELLS: 1,        // Maximum 1 large sell
      MIN_BUY_RATIO: 0.7   // 70% buys minimum
    },
    DISTRIBUTION: {
      LARGE_SELLS: 3,      // 3+ large sells
      MAX_BUY_RATIO: 0.4,  // Less than 40% buys
      VOLUME_SPIKE: 2      // 2x normal volume
    }
  },
  SIGNALS: {
    CONFIDENCE: {
      HIGH: 90,
      MEDIUM: 70,
      LOW: 50
    }
  }
};

export const TIME_ANALYSIS = {
  TRADING_WINDOWS: {
    UTC: {
      PEAK_HOURS: [
        { start: 13, end: 21 },  // 13:00-21:00 UTC (US trading hours)
        { start: 1, end: 9 }     // 01:00-09:00 UTC (Asia trading hours)
      ],
      QUIET_HOURS: [
        { start: 22, end: 0 },   // Low volume periods
        { start: 10, end: 12 }
      ]
    }
  },
  VOLATILITY: {
    HIGH: {
      start: 14,    // 14:00 UTC
      end: 20,      // 20:00 UTC
      multiplier: 1.5  // Adjust position size
    },
    LOW: {
      multiplier: 0.7  // Reduce position size
    }
  },
  MOMENTUM: {
    MIN_SUSTAINED_MINS: 30,  // Minimum time for trend confirmation
    ACCELERATION_THRESHOLD: 15  // % change in momentum
  }
};

export const TRADING_RULES = {
  ENTRY: {
    REQUIRED: {
      MIN_BUY_PRESSURE: 0.65,      // Increased from 0.60 - want strong buying
      MIN_VOL_LIQ_RATIO: 2,        // Keep 2x minimum for adequate volume
      MIN_LIQUIDITY: 100_000,      // Increased from 50k - safer liquidity
      MAX_PRICE_INCREASE: 150,     // Lowered from 200 - don't chase too high
      MIN_TRANSACTIONS: 75,        // Increased from 50 - more validation
      MAX_SINGLE_WALLET: 0.05,     // Max 5% in single wallet
      MIN_HOLDERS: 100             // Minimum unique holders
    },
    SMART_MONEY: {
      MIN_AVG_TRANSACTION: 1000,   // $1k minimum avg transaction
      WHALE_BUYING: true,          // Must see institutional buying
      NO_LARGE_SELLS: true,        // No recent large sells
      ACCUMULATION_TIME: 30        // Minutes of accumulation
    },
    MOMENTUM: {
      MIN_ACCELERATION: 25,        // Steady growth
      MAX_ACCELERATION: 150,       // Not too parabolic
      SUSTAINED_MINUTES: 15        // Must hold momentum
    }
  },
  EXIT: {
    TAKE_PROFIT: [
      { PERCENT: 0.3, AT_PROFIT: 0.20 },  // Take 30% off at 20% profit
      { PERCENT: 0.4, AT_PROFIT: 0.35 },  // Take 40% off at 35% profit
      { PERCENT: 0.3, AT_PROFIT: 0.50 }   // Take final 30% at 50% profit
    ],
    STOP_LOSS: {
      INITIAL: 0.93,              // Tighter 7% stop loss
      TRAILING: 0.95              // 5% trailing stop in profit
    },
    EMERGENCY: {
      MAX_PRICE_DROP: 5,          // Tightened from 7% to 5%
      MIN_BUY_PRESSURE: 0.40,     // Exit if buying dies
      LIQUIDITY_DROP: 0.30        // Exit if liquidity drops 30%
    }
  },
  POSITION: {
    MAX_SIZE: 0.005,              // Reduced from 0.01 - more conservative
    SCALING: {
      INITIAL: 0.4,               // Start smaller
      FINAL: 0.6                  // Add more on confirmation
    }
  },
  RUG_PROTECTION: {
    MIN_TIME_LOCKED: 48,          // Increased from 24h to 48h
    MAX_OWNER_WALLET: 0.03,       // Reduced from 5% to 3%
    BLACKLIST: [
      'MINT',
      'WHITELIST',
      'TAX',
      'BLACKLIST',
      'PAUSE',                    // Added more suspicious functions
      'EXCLUDE',
      'REWARD',
      'REBASE'
    ]
  }
}; 