export const SOLANA_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';
export const DEXSCREENER_API = 'https://api.dexscreener.com';

export const SAFETY_THRESHOLDS = {
  MIN_LIQUIDITY_SOL: 50, // Minimum liquidity in SOL
  MIN_HOLDERS: 100, // Minimum number of holders
  MIN_TRADING_VOLUME: 1000, // Minimum 24h trading volume in USD
  MAX_WALLET_PERCENTAGE: 5, // Maximum percentage a single wallet can hold
  MIN_LIQUIDITY_LOCKED_PERCENTAGE: 80, // Minimum percentage of liquidity that should be locked
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