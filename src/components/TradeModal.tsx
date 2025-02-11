import { TokenMetrics } from '../types/token';
import { RiskAnalysis } from '../services/riskAnalyzer';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeDetails: {
    token: TokenMetrics;
    entry: number;
    size: number;
    stopLoss: number;
    targets: number[];
    reasons: string[];
    risk: RiskAnalysis;
  };
  onExecute: () => void;
}

export default function TradeModal({ isOpen, onClose, tradeDetails, onExecute }: TradeModalProps) {
  if (!isOpen) return null;

  const { token, entry, size, stopLoss, targets, reasons, risk } = tradeDetails;
  const riskAmount = (entry - stopLoss) * (size / entry);
  const potentialProfit = (targets[targets.length - 1] - entry) * (size / entry);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Trade Analysis: {token.name}</h2>

        {/* Risk Analysis Section */}
        <div className="mb-6">
          <h3 className="text-yellow-400 font-bold mb-2">Risk Analysis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400">Risk/Reward</div>
              <div className="font-mono">{risk.riskRewardRatio.toFixed(2)}x</div>
            </div>
            <div>
              <div className="text-gray-400">Portfolio Exposure</div>
              <div className="font-mono">{(risk.exposure * 100).toFixed(1)}%</div>
            </div>
          </div>
          {risk.warnings.length > 0 && (
            <div className="mt-2 text-yellow-500 text-sm">
              {risk.warnings.map((warning, i) => (
                <div key={i}>{warning}</div>
              ))}
            </div>
          )}
        </div>

        {/* Entry Analysis */}
        <div className="mb-6">
          <h3 className="text-green-400 font-bold mb-2">Entry Analysis</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400">Entry Price</div>
              <div className="font-mono">${entry.toFixed(8)}</div>
            </div>
            <div>
              <div className="text-gray-400">Position Size</div>
              <div className="font-mono">${size.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div className="mb-6">
          <h3 className="text-red-400 font-bold mb-2">Risk Management</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400">Stop Loss</div>
              <div className="font-mono">${stopLoss.toFixed(8)}</div>
            </div>
            <div>
              <div className="text-gray-400">Risk Amount</div>
              <div className="font-mono">${riskAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Profit Targets */}
        <div className="mb-6">
          <h3 className="text-blue-400 font-bold mb-2">Profit Targets</h3>
          <div className="grid grid-cols-2 gap-4">
            {targets.map((target, i) => (
              <div key={i}>
                <div className="text-gray-400">Target {i + 1}</div>
                <div className="font-mono">${target.toFixed(8)}</div>
              </div>
            ))}
            <div>
              <div className="text-gray-400">Potential Profit</div>
              <div className="font-mono text-green-400">+${potentialProfit.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Analysis Reasons */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">Analysis</h3>
          <ul className="space-y-1">
            {reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={onExecute}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
          >
            Execute Trade
          </button>
        </div>
      </div>
    </div>
  );
} 