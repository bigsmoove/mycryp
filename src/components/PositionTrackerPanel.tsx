import { Position } from '../services/positionManager';

interface PositionTrackerPanelProps {
  positions: Position[];
  onClosePosition: (address: string) => void;
}

export default function PositionTrackerPanel({ positions, onClosePosition }: PositionTrackerPanelProps) {
  if (positions.length === 0) return null;

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4">Active Positions</h2>
      <div className="space-y-4">
        {positions.map((position) => (
          <div key={position.tokenAddress} className="border border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold">{position.tokenAddress.slice(0, 8)}...</h3>
                <div className="text-sm text-gray-400">
                  Entered at ${position.entry.toFixed(8)}
                </div>
              </div>
              <div className={`text-lg font-bold ${
                (position.pnlPercent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {position.pnlPercent?.toFixed(2)}%
              </div>
            </div>

            {/* Position Details */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-gray-400 text-sm">Size</div>
                <div className="font-mono">${position.size.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Current Value</div>
                <div className="font-mono">
                  ${((position.currentPrice ?? position.entry) * position.size).toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Stop Loss</div>
                <div className="font-mono text-red-400">${position.stopLoss.toFixed(8)}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Trailing Stop</div>
                <div className="font-mono text-yellow-400">${position.trailingStop.toFixed(8)}</div>
              </div>
            </div>

            {/* Targets */}
            <div className="mb-4">
              <div className="text-gray-400 text-sm mb-2">Take Profit Targets</div>
              <div className="grid grid-cols-3 gap-2">
                {position.targets.map((target, i) => (
                  <div 
                    key={i}
                    className={`text-xs p-2 rounded ${
                      (position.currentPrice ?? 0) >= target 
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-gray-700'
                    }`}
                  >
                    TP{i + 1}: ${target.toFixed(8)}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => onClosePosition(position.tokenAddress)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
              >
                Close Position
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 