'use client';

import { useState, useEffect } from 'react';
import { TokenScanner } from '../services/tokenScanner';
import { fetchTrendingTokens } from '../services/dexScreenerService';
import TokenDetails from '../components/TokenDetails';
import type { TrendingToken } from '../types/token';

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
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-semibold">{token.name} ({token.symbol})</h3>
            <p className="text-sm text-gray-400">Price: ${token.price.toFixed(8)}</p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${
              token.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {token.priceChange24h.toFixed(2)}% (24h)
            </p>
          </div>
        </div>

        {/* Indicators */}
        <div className="grid grid-cols-3 gap-2 mb-2 text-sm">
          <div className="bg-gray-700 p-2 rounded">
            <p className="text-gray-400">Vol/Liq</p>
            <p className="font-semibold">{token.indicators?.volumeToLiquidityRatio}</p>
          </div>
          <div className="bg-gray-700 p-2 rounded">
            <p className="text-gray-400">Buy Pressure</p>
            <p className="font-semibold">{token.indicators?.buyPressure}</p>
          </div>
          <div className="bg-gray-700 p-2 rounded">
            <p className="text-gray-400">Momentum</p>
            <p className="font-semibold">{token.indicators?.priceAcceleration}</p>
          </div>
        </div>

        {/* Alerts */}
        {token.alerts && token.alerts.length > 0 && (
          <div className="mt-2">
            {token.alerts.map((alert: string, index: number) => (
              <div key={index} className="text-sm text-yellow-400 mb-1">
                {alert}
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 text-sm text-gray-400">
          <p>Volume 24h: ${token.volume24h.toLocaleString()}</p>
          <p>Liquidity: ${token.liquidity.toLocaleString()}</p>
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
                <div 
                  key={token.address}
                  className="bg-gray-700 p-4 rounded-lg flex justify-between items-center hover:bg-gray-600 transition-colors"
                >
                  <div>
                    <h3 className="text-white font-bold">{token.name} ({token.symbol})</h3>
                    <div className="space-y-1">
                      <p className="text-gray-300 text-sm">
                        Price: ${token.price.toFixed(6)}
                      </p>
                      <p className="text-gray-300 text-sm">
                        Volume 24h: ${token.volume24h.toLocaleString()}
                      </p>
                      <p className="text-gray-300 text-sm">
                        Liquidity: ${token.liquidity.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {token.priceChange24h.toFixed(2)}% (24h)
                    </p>
                    <button
                      onClick={() => handleScan(token.address)}
                      className="mt-2 px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                    >
                      Scan Token
                    </button>
                  </div>
                </div>
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