import { TokenMetrics } from '../types/token';
import { NotificationService } from './notificationService';

export interface PriceAlert {
  tokenAddress: string;
  targetPrice: number;
  type: 'above' | 'below';
  triggered: boolean;
}

export interface WatchlistItem {
  token: TokenMetrics;
  addedAt: Date;
  alerts: PriceAlert[];
  notes: string;
}

export class WatchlistManager {
  private static instance: WatchlistManager;
  private watchlist: Map<string, WatchlistItem> = new Map();
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = new NotificationService();
  }

  static getInstance(): WatchlistManager {
    if (!WatchlistManager.instance) {
      WatchlistManager.instance = new WatchlistManager();
    }
    return WatchlistManager.instance;
  }

  addToWatchlist(token: TokenMetrics, notes: string = '') {
    console.log('WatchlistManager.addToWatchlist called with:', token);
    
    const watchlistItem: WatchlistItem = {
      token,
      addedAt: new Date(),
      alerts: [],
      notes
    };

    this.watchlist.set(token.address, watchlistItem);
    console.log('Current watchlist:', this.getWatchlist());
    
    // Add default alerts
    this.addPriceAlert(token.address, token.price * 1.1, 'above'); // +10%
    this.addPriceAlert(token.address, token.price * 0.9, 'below'); // -10%

    return watchlistItem;
  }

  addPriceAlert(tokenAddress: string, targetPrice: number, type: 'above' | 'below') {
    const item = this.watchlist.get(tokenAddress);
    if (!item) return;

    const alert: PriceAlert = {
      tokenAddress,
      targetPrice,
      type,
      triggered: false
    };

    item.alerts.push(alert);
  }

  updatePrice(tokenAddress: string, currentPrice: number) {
    const item = this.watchlist.get(tokenAddress);
    if (!item) return;

    item.alerts.forEach(alert => {
      if (alert.triggered) return;

      const triggered = alert.type === 'above' 
        ? currentPrice >= alert.targetPrice
        : currentPrice <= alert.targetPrice;

      if (triggered) {
        alert.triggered = true;
        this.notificationService.notify(
          'ALERT',
          `Price ${alert.type} ${alert.targetPrice.toFixed(8)} for ${tokenAddress}`,
          'medium'
        );
      }
    });
  }

  removeFromWatchlist(tokenAddress: string) {
    this.watchlist.delete(tokenAddress);
  }

  getWatchlist(): WatchlistItem[] {
    return Array.from(this.watchlist.values());
  }

  addNote(tokenAddress: string, note: string) {
    const item = this.watchlist.get(tokenAddress);
    if (!item) return;
    
    item.notes = note;
  }
} 