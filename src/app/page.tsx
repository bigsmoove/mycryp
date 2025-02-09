'use client';

import { useState, useEffect } from 'react';
import { TokenScanner } from '../services/tokenScanner';
import { fetchTrendingTokens } from '../services/dexScreenerService';
import TokenDetails from '../components/TokenDetails';
import type { TrendingToken, SignalStrength } from '../types/token';

export default function Home() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  useEffect(() => {
    const loadTrendingTokens = async () => {
      setIsLoadingTrending(true);
      setApiError(null);
      try {
        const tokens = await fetchTrendingTokens();
        if (tokens.length === 0) {
          setApiError('No trending tokens found. Please try again later.');
        }
        setTrendingTokens(tokens);
      } catch (error) {
        setApiError('Unable to fetch trending tokens. Please try again later.');
        console.error('Error loading trending tokens:', error);
      }
      setIsLoadingTrending(false);
    };

    loadTrendingTokens();
    const interval = setInterval(loadTrendingTokens, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async (address: string) => {
    setSelectedToken(address);
  };

  const TrendingTokenCard = ({ token }: { token: TrendingToken }) => {
    const getSignalColor = (signal: SignalStrength) => {
      switch (signal) {
        case 'STRONG_BUY': return 'bg-green-500';
        case 'MODERATE_BUY': return 'bg-green-300';
        case 'HOLD': return 'bg-yellow-400';
        case 'CONSIDER_SELL': return 'bg-red-300';
        case 'STRONG_SELL': return 'bg-red-500';
        default: return 'bg-gray-400';
      }
    };

    const getTrendArrow = (trend: 'up' | 'down' | 'neutral') => {
      switch (trend) {
        case 'up': return '↑';
        case 'down': return '↓';
        case 'neutral': return '→';
      }
    };

    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        {/* Token Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{token.name} ({token.symbol})</h3>
            <p className="text-sm text-gray-400">Price: ${token.price.toFixed(8)}</p>
          </div>
          
          {/* Trading Signal Badge */}
          {token.tradingSignal?.signal && (
            <div className={`px-3 py-1 rounded-full text-white text-sm font-bold ${
              getSignalColor(token.tradingSignal.signal)
            }`}>
              {token.tradingSignal.signal.replace('_', ' ')}
            </div>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Buy Pressure */}
          <div className="bg-gray-700 p-2 rounded">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Buy Pressure</span>
              {token.tradingSignal?.indicators.buyPressure.trend && (
                <span>{getTrendArrow(token.tradingSignal.indicators.buyPressure.trend)}</span>
              )}
            </div>
            <p className="font-semibold">
              {token.tradingSignal?.indicators.buyPressure.value.toFixed(2) ?? '0.00'}
            </p>
          </div>

          {/* Volume Metric */}
          <div className="bg-gray-700 p-2 rounded">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Vol/Liq Ratio</span>
              {token.tradingSignal?.indicators.volumeMetric.trend && (
                <span>{getTrendArrow(token.tradingSignal.indicators.volumeMetric.trend)}</span>
              )}
            </div>
            <p className="font-semibold">
              {token.tradingSignal?.indicators.volumeMetric.value.toFixed(2) ?? '0.00'}
            </p>
          </div>

          {/* Price Movement */}
          <div className="bg-gray-700 p-2 rounded">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Price Momentum</span>
              {token.tradingSignal?.indicators.priceMovement.trend && (
                <span>{getTrendArrow(token.tradingSignal.indicators.priceMovement.trend)}</span>
              )}
            </div>
            <p className="font-semibold">
              {token.tradingSignal?.indicators.priceMovement.value.toFixed(2) ?? '0.00'}
            </p>
          </div>
        </div>

        {/* Signal Reasons */}
        {token.tradingSignal?.reasons && token.tradingSignal.reasons.length > 0 && (
          <div className="mt-2 space-y-1">
            {token.tradingSignal.reasons.map((reason, index) => (
              <p key={index} className="text-sm text-gray-300">• {reason}</p>
            ))}
          </div>
        )}

        {/* Token Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-400">
          <p>Volume 24h: ${token.volume24h.toLocaleString()}</p>
          <p>Liquidity: ${token.liquidity.toLocaleString()}</p>
          <p>Price Change: 
            <span className={token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}>
              {token.priceChange24h.toFixed(2)}%
            </span>
          </p>
          <p>Confidence: {token.tradingSignal?.confidence ?? 0}%</p>
          
          {/* Add address with copy button */}
          <div className="col-span-2 mt-2 flex items-center gap-2 border-t border-gray-700 pt-2">
            <span className="text-xs font-mono text-gray-500">
              {token.address.slice(0, 8)}...{token.address.slice(-8)}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(token.address);
                // Optional: Add a toast notification for copy success
              }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Copy
            </button>
            <button
              onClick={() => handleScan(token.address)}
              className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-xs transition-colors"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen p-8 bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          Solana Token Safety Scanner
        </h1>

        {/* Trending Tokens Section */}
        <div className="mb-8 bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Trending Tokens</h2>
            <span className="text-sm text-gray-400">
              Auto-refreshes every 30s
            </span>
          </div>
          
          {apiError ? (
            <div className="text-red-400 p-4 rounded bg-red-900/20 text-center">
              {apiError}
              <button 
                onClick={() => window.location.reload()}
                className="ml-4 underline hover:text-red-300"
              >
                Retry
              </button>
            </div>
          ) : isLoadingTrending ? (
            <div className="text-white flex items-center justify-center p-4">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading trending tokens...
            </div>
          ) : (
            <div className="grid gap-4">
              {trendingTokens.map((token) => (
                <TrendingTokenCard key={token.address} token={token} />
              ))}
            </div>
          )}
        </div>

        {/* Scanner Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Token Scanner</h2>
          <div className="mb-4">
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="Enter token address"
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          
          <button
            onClick={() => handleScan(tokenAddress)}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Scanning...' : 'Scan Token'}
          </button>

          {scanResult && (
            <div className="mt-6 p-4 rounded bg-gray-700">
              <div className={`text-xl font-bold mb-2 ${
                scanResult.isSecure ? 'text-green-400' : 'text-red-400'
              }`}>
                Safety Score: {scanResult.score}/100
              </div>
              
              {scanResult.reasons.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-white font-bold mb-2">Warnings:</h3>
                  <ul className="list-disc pl-5 text-red-300">
                    {scanResult.reasons.map((reason: string, index: number) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add the TokenDetails modal */}
      {selectedToken && (
        <TokenDetails
          tokenAddress={selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}
    </main>
  );
} 