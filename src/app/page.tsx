'use client';

import { useState, useEffect } from 'react';
import { TokenScanner, TokenTrader } from '../services/tokenScanner';
import { fetchTrendingTokens, createSignalSummary, fetchTokenPrice } from '../services/dexScreenerService';
import TokenDetails from '../components/TokenDetails';
import type { TrendingToken, SignalStrength } from '../types/token';
import { NotificationService } from '../services/notificationService';
import NotificationPanel from '../components/NotificationPanel';
import PositionTrackerPanel from '../components/PositionTrackerPanel';
import { PositionTracker } from '../services/positionTracker';
import type { Position } from '../types/position';
import type { Notification } from '../types/notification';
import { RISK_SCORE } from '../config/constants';
import classNames from 'classnames';
import TradeModal from '../components/TradeModal';
import { PositionManager } from '../services/positionManager';
import { RiskAnalyzer } from '../services/riskAnalyzer';
import { WatchlistManager } from '../services/watchlistManager';
import WatchlistPanel from '../components/WatchlistPanel';

export default function Home() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [positions, setPositions] = useState<Map<string, Position>>(new Map());
  const [tradeDetails, setTradeDetails] = useState<any>(null);
  const [tradeModal, setTradeModal] = useState<{
    isOpen: boolean;
    details: any;
  }>({
    isOpen: false,
    details: null
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);

  const notificationService = new NotificationService();
  const positionTracker = PositionTracker.getInstance();
  const positionManager = PositionManager.getInstance();
  const riskAnalyzer = RiskAnalyzer.getInstance();
  const watchlistManager = WatchlistManager.getInstance();

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
    
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(loadTrendingTokens, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification: Notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 10));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Update prices every 10 seconds
    const interval = setInterval(async () => {
      // Update positions
      const positions = positionManager.getAllPositions();
      for (const position of positions) {
        try {
          const updatedPrice = await fetchTokenPrice(position.tokenAddress);
          if (updatedPrice) {
            positionManager.updatePrice(position.tokenAddress, updatedPrice);
          }
        } catch (error) {
          console.error('Error updating position price:', error);
        }
      }

      // Update watchlist
      const watchlistItems = watchlistManager.getWatchlist();
      for (const item of watchlistItems) {
        try {
          const updatedPrice = await fetchTokenPrice(item.token.address);
          if (updatedPrice) {
            watchlistManager.updatePrice(item.token.address, updatedPrice);
          }
        } catch (error) {
          console.error('Error updating watchlist price:', error);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateWatchlist = () => {
      setWatchlistItems(watchlistManager.getWatchlist());
    };

    // Initial load
    updateWatchlist();

    // Update every 5 seconds
    const interval = setInterval(updateWatchlist, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async (address: string) => {
    setSelectedToken(address);
  };

  const handleAddPosition = (token: TrendingToken, amount: number) => {
    const stops = {
      initialStop: token.price * 0.85, // 15% stop loss
      trailingStop: token.price * 0.9,  // 10% trailing stop
    };

    const position: Position = {
      tokenAddress: token.address,
      entryPrice: token.price,
      entryTime: new Date(),
      amount,
      stopLoss: stops.initialStop,
      takeProfit: token.price * 1.5, // 50% take profit
      trailingStop: stops.trailingStop
    };

    const newPositions = new Map(positions);
    newPositions.set(token.address, position);
    setPositions(newPositions);

    notificationService.notify(
      'ENTRY',
      `New position opened for ${token.symbol}`,
      'medium'
    );
  };

  const TokenCard = ({ token }: { token: TrendingToken }) => {
    const summary = createSignalSummary(token);

    const handleQuickTrade = async () => {
      console.log('Quick Trade clicked');
      const analysis = await TokenTrader.analyzeTrade(token);
      console.log('Analysis:', analysis);
      
      if (analysis.shouldEnter && analysis.tradingPlan) {
        const riskAnalysis = riskAnalyzer.analyzeRisk(
          token,
          positionManager.getAllPositions()
        );

        console.log('Setting trade modal with details:', {
          token,
          ...analysis.tradingPlan,
          risk: riskAnalysis
        });

        setTradeModal({
          isOpen: true,
          details: {
            token,
            ...analysis.tradingPlan,
            risk: riskAnalysis
          }
        });
      } else {
        console.log('Trade not recommended:', analysis.warnings);
        notificationService.notify(
          'ALERT',
          analysis.warnings.join('\n'),
          'high'
        );
      }
    };

    return (
      <div className="p-4 border rounded-lg bg-gradient-to-b from-gray-800/50 to-gray-900/50">
        {/* Header with Name and Status */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-xl font-bold">{token.name} ({token.symbol})</h2>
            <div className="text-sm text-gray-400 flex items-center">
              {token.address.slice(0, 16)}...
              <button 
                onClick={() => navigator.clipboard.writeText(token.address)}
                className="ml-2 px-2 py-0.5 text-xs bg-gray-700 rounded hover:bg-gray-600"
              >
                Copy
              </button>
            </div>
          </div>
          <span className={classNames(
            'px-3 py-1 rounded font-bold',
            {
              'bg-green-500': summary.verdict === 'STRONG_BUY',
              'bg-green-300': summary.verdict === 'MODERATE_BUY',
              'bg-red-500': summary.verdict === 'AVOID',
              'bg-yellow-500': summary.verdict === 'CAUTION',
              'bg-gray-300': summary.verdict === 'NEUTRAL'
            }
          )}>
            {summary.verdict}
          </span>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <div className="text-gray-400">Buy Pressure</div>
            <div className="text-xl font-mono">{summary.keyMetrics.buyPressure}</div>
          </div>
          <div>
            <div className="text-gray-400">Vol/Liq Ratio</div>
            <div className="text-xl font-mono">{(token.volume24h / token.liquidity).toFixed(2)}x</div>
          </div>
          <div>
            <div className="text-gray-400">Price</div>
            <div className="text-xl font-mono">${token.price.toFixed(8)}</div>
          </div>
        </div>

        {/* Analysis Section */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-green-500 mb-2">Bullish Factors</h3>
            {summary.bullishFactors.map((factor: string) => (
              <div key={factor} className="text-sm mb-2">{factor}</div>
            ))}
          </div>
          <div>
            <h3 className="font-bold text-red-500 mb-2">Risk Factors</h3>
            {summary.bearishFactors.map((factor: string) => (
              <div key={factor} className="text-sm mb-2">{factor}</div>
            ))}
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-4 pt-3 border-t border-gray-700 grid grid-cols-3 text-sm text-gray-400">
          <div>Volume 24h: ${(token.volume24h / 1000).toFixed(1)}k</div>
          <div>Liquidity: ${(token.liquidity / 1000).toFixed(1)}k</div>
          <div className={token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}>
            24h Change: {token.priceChange24h.toFixed(2)}%
          </div>
        </div>

        {/* Add margin-top to separate from stats */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => {
              console.log('Adding to watchlist:', token);
              const watchlistItem = watchlistManager.addToWatchlist(token);
              console.log('Added watchlist item:', watchlistItem);
              notificationService.notify(
                'INFO',
                `Added ${token.name} to watchlist`,
                'low'
              );
              // Force a re-render
              setTrendingTokens([...trendingTokens]);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Add to Watchlist
          </button>
          <button
            onClick={handleQuickTrade}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold text-white"
          >
            Quick Trade
          </button>
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                Auto-refresh {autoRefresh ? 'enabled' : 'disabled'}
              </span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full
                  transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                  ${autoRefresh ? 'bg-indigo-600' : 'bg-gray-600'}
                `}
              >
                <span className="sr-only">Toggle auto-refresh</span>
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${autoRefresh ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
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
                <TokenCard key={token.address} token={token} />
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

        <div className="grid grid-cols-1 gap-6 mt-8">
          <PositionTrackerPanel 
            positions={positionManager.getAllPositions()}
            onClosePosition={(address) => {
              positionManager.closePosition(address);
            }}
          />
          
          <WatchlistPanel
            items={watchlistItems}
            onRemove={(address) => {
              watchlistManager.removeFromWatchlist(address);
              setWatchlistItems(watchlistManager.getWatchlist());
            }}
            onAddAlert={(address, price, type) => {
              watchlistManager.addPriceAlert(address, price, type);
              setWatchlistItems(watchlistManager.getWatchlist());
            }}
            onAddNote={(address, note) => {
              watchlistManager.addNote(address, note);
              setWatchlistItems(watchlistManager.getWatchlist());
            }}
          />
        </div>
      </div>

      {/* Add the TokenDetails modal */}
      {selectedToken && (
        <TokenDetails
          tokenAddress={selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}

      {tradeModal.isOpen && (
        <TradeModal
          isOpen={tradeModal.isOpen}
          onClose={() => {
            console.log('Closing modal');
            setTradeModal({ isOpen: false, details: null });
          }}
          tradeDetails={tradeModal.details}
          onExecute={() => {
            console.log('Executing trade');
            handleAddPosition(tradeModal.details.token, tradeModal.details.size);
            setTradeModal({ isOpen: false, details: null });
          }}
        />
      )}

      <NotificationPanel notifications={notifications} />
    </main>
  );
} 