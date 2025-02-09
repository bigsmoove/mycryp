import { Position } from '../types/position';

interface PositionTrackerProps {
  positions: Map<string, Position>;
  onClosePosition: (tokenAddress: string) => void;
}

const PositionTracker = ({ positions, onClosePosition }: PositionTrackerProps) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-4">Active Positions</h3>
      <div className="space-y-3">
        {Array.from(positions.values()).map((position) => (
          <div key={position.tokenAddress} className="bg-gray-700 p-3 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-white">{position.tokenAddress.slice(0, 8)}...</h4>
                <p className="text-sm text-gray-400">
                  Entry: ${position.entryPrice.toFixed(8)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">
                  Amount: {position.amount}
                </p>
                <button
                  onClick={() => onClosePosition(position.tokenAddress)}
                  className="mt-2 px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded"
                >
                  Close Position
                </button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-800 p-2 rounded">
                <span className="text-gray-400">Stop Loss:</span>
                <span className="text-red-400 ml-2">
                  ${position.stopLoss.toFixed(8)}
                </span>
              </div>
              <div className="bg-gray-800 p-2 rounded">
                <span className="text-gray-400">Take Profit:</span>
                <span className="text-green-400 ml-2">
                  ${position.takeProfit.toFixed(8)}
                </span>
              </div>
              <div className="col-span-2 bg-gray-800 p-2 rounded">
                <span className="text-gray-400">Trailing Stop:</span>
                <span className="text-yellow-400 ml-2">
                  ${position.trailingStop.toFixed(8)}
                </span>
              </div>
            </div>
          </div>
        ))}
        {positions.size === 0 && (
          <p className="text-gray-400 text-center py-4">No active positions</p>
        )}
      </div>
    </div>
  );
};

export default PositionTracker; 