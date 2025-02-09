'use client';

import { useState, useEffect } from 'react';
import { getTokenDetails, getTokenPairs, getTokenHistory } from '../services/dexScreenerService';

interface TokenDetailsProps {
  tokenAddress: string;
  onClose: () => void;
}

export default function TokenDetails({ tokenAddress, onClose }: TokenDetailsProps) {
  const [details, setDetails] = useState<any>(null);
  const [pairs, setPairs] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTokenData = async () => {
      setLoading(true);
      try {
        const [tokenDetails, tokenPairs, priceHistory] = await Promise.all([
          getTokenDetails(tokenAddress),
          getTokenPairs(tokenAddress),
          getTokenHistory(tokenAddress)
        ]);

        setDetails(tokenDetails);
        setPairs(tokenPairs);
        setHistory(priceHistory);
      } catch (error) {
        console.error('Error loading token data:', error);
      }
      setLoading(false);
    };

    loadTokenData();
  }, [tokenAddress]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/80 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg max-w-4xl w-full p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            ✕
          </button>

          {/* Token Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {details?.baseToken?.name || 'Unknown'} ({details?.baseToken?.symbol || 'Unknown'})
            </h2>
            <p className="text-gray-400 mt-1">{tokenAddress}</p>
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm">Price</h3>
              <p className="text-xl font-bold text-white">
                ${parseFloat(details?.priceUsd || '0').toFixed(6)}
              </p>
              <span className={`text-sm ${
                (details?.priceChange?.h24 || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(details?.priceChange?.h24 || 0).toFixed(2)}% (24h)
              </span>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm">Total Volume (24h)</h3>
              <p className="text-xl font-bold text-white">
                ${(details?.totalVolume || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm">Total Liquidity</h3>
              <p className="text-xl font-bold text-white">
                ${(details?.totalLiquidity || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-gray-400 text-sm">Market Cap</h3>
              <p className="text-xl font-bold text-white">
                ${(details?.marketCap || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Trading Activity */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Trading Activity (24h)</h3>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Buy Orders</p>
                  <p className="text-green-400 font-bold">
                    {details?.txns?.h24?.buys || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Sell Orders</p>
                  <p className="text-red-400 font-bold">
                    {details?.txns?.h24?.sells || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trading Pairs with enhanced information */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Trading Pairs</h3>
            <div className="space-y-2">
              {details?.pairs?.map((pair: any) => (
                <div 
                  key={pair.pairAddress}
                  className="bg-gray-700 p-4 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">
                        {pair.baseToken.symbol}/{pair.quoteToken.symbol}
                      </p>
                      <p className="text-sm text-gray-400">
                        {pair.dexId} • Created {new Date(pair.pairCreatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white">
                        ${parseFloat(pair.priceUsd).toFixed(6)}
                      </p>
                      <p className="text-sm text-gray-400">
                        Vol: ${(pair.volume?.h24 || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Liquidity:</span>
                      <span className="text-white ml-2">
                        ${(pair.liquidity?.usd || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Price Change:</span>
                      <span className={`ml-2 ${
                        (pair.priceChange?.h24 || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(pair.priceChange?.h24 || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 