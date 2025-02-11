import { WatchlistItem, PriceAlert } from '../services/watchlistManager';

interface WatchlistPanelProps {
  items: WatchlistItem[];
  onRemove: (address: string) => void;
  onAddAlert: (address: string, price: number, type: 'above' | 'below') => void;
  onAddNote: (address: string, note: string) => void;
}

export default function WatchlistPanel({ 
  items, 
  onRemove, 
  onAddAlert, 
  onAddNote 
}: WatchlistPanelProps) {
  console.log('WatchlistPanel rendering with items:', items);

  if (items.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Watchlist</h2>
        <div className="text-gray-400 text-center py-4">
          No tokens in watchlist. Click "Add to Watchlist" on any token to start tracking it.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4">Watchlist</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.token.address} className="border border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold">{item.token.name}</h3>
                <div className="text-sm text-gray-400">
                  Added {new Date(item.addedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => onRemove(item.token.address)}
                className="text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>

            {/* Price Alerts */}
            <div className="mb-4">
              <div className="text-gray-400 text-sm mb-2">Price Alerts</div>
              <div className="grid grid-cols-2 gap-2">
                {item.alerts.map((alert: PriceAlert, i) => (
                  <div 
                    key={i}
                    className={`text-xs p-2 rounded ${
                      alert.triggered 
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-gray-700'
                    }`}
                  >
                    {alert.type === 'above' ? '↑' : '↓'} ${alert.targetPrice.toFixed(8)}
                  </div>
                ))}
              </div>
              
              {/* Add Alert Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const price = parseFloat(form.price.value);
                  const type = form.type.value as 'above' | 'below';
                  onAddAlert(item.token.address, price, type);
                  form.reset();
                }}
                className="mt-2 flex gap-2"
              >
                <input
                  type="number"
                  name="price"
                  step="0.00000001"
                  placeholder="Alert price"
                  className="flex-1 bg-gray-700 rounded px-2 py-1 text-sm"
                />
                <select 
                  name="type"
                  className="bg-gray-700 rounded px-2 py-1 text-sm"
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Notes */}
            <div>
              <div className="text-gray-400 text-sm mb-2">Notes</div>
              <textarea
                value={item.notes}
                onChange={(e) => onAddNote(item.token.address, e.target.value)}
                className="w-full bg-gray-700 rounded p-2 text-sm"
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 