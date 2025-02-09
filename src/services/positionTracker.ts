import { TrendingToken } from '../types/token';
import { Position } from '../types/position';
import { NotificationService } from './notificationService';

interface Position {
  tokenAddress: string;
  entryPrice: number;
  entryTime: Date;
  amount: number;
  stopLoss: number;
  takeProfit: number;
  trailingStop: number;
}

interface PriceTarget {
  target: number;
  confidence: number;
  reason: string;
}

export class PositionTracker {
  private static instance: PositionTracker;
  private positions: Map<string, Position> = new Map();
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = new NotificationService();
  }

  public static getInstance(): PositionTracker {
    if (!PositionTracker.instance) {
      PositionTracker.instance = new PositionTracker();
    }
    return PositionTracker.instance;
  }

  calculatePriceTargets(token: TrendingToken): PriceTarget[] {
    const targets: PriceTarget[] = [];
    const volLiqRatio = token.volume24h / token.liquidity;
    const currentPrice = token.price;

    // Conservative target based on Vol/Liq ratio
    targets.push({
      target: currentPrice * (1 + (volLiqRatio * 0.5)),
      confidence: 80,
      reason: 'Conservative target based on volume/liquidity ratio'
    });

    // Moderate target
    targets.push({
      target: currentPrice * (1 + volLiqRatio),
      confidence: 60,
      reason: 'Moderate target based on current momentum'
    });

    // Aggressive target
    if (volLiqRatio > 2) {
      targets.push({
        target: currentPrice * (1 + (volLiqRatio * 2)),
        confidence: 30,
        reason: 'Aggressive target for high volume tokens'
      });
    }

    return targets;
  }

  calculateStops(token: TrendingToken): {
    initialStop: number;
    trailingStop: number;
  } {
    const volatility = Math.abs(token.priceChange24h) / 100;
    const currentPrice = token.price;

    return {
      initialStop: currentPrice * (1 - Math.min(volatility * 0.3, 0.15)), // Max 15% stop
      trailingStop: currentPrice * (1 - Math.min(volatility * 0.2, 0.10)) // Tighter trailing stop
    };
  }

  addPosition(token: TrendingToken, amount: number) {
    const stops = this.calculateStops(token);
    const targets = this.calculatePriceTargets(token);

    const position: Position = {
      tokenAddress: token.address,
      entryPrice: token.price,
      entryTime: new Date(),
      amount,
      stopLoss: stops.initialStop,
      takeProfit: targets[0].target, // Conservative target
      trailingStop: stops.trailingStop
    };

    this.positions.set(token.address, position);
    this.notifyPositionUpdate('ENTRY', position);
  }

  updatePosition(token: TrendingToken) {
    const position = this.positions.get(token.address);
    if (!position) return;

    // Update trailing stop if price has moved up
    if (token.price > position.entryPrice) {
      const newTrailingStop = token.price * 0.9; // 10% trailing stop
      if (newTrailingStop > position.trailingStop) {
        position.trailingStop = newTrailingStop;
        this.notifyPositionUpdate('TRAILING_STOP_UPDATE', position);
      }
    }

    // Check for stop loss or take profit hits
    if (token.price <= position.stopLoss) {
      this.notifyPositionUpdate('STOP_LOSS_HIT', position);
      this.positions.delete(token.address);
    } else if (token.price >= position.takeProfit) {
      this.notifyPositionUpdate('TAKE_PROFIT_HIT', position);
      this.positions.delete(token.address);
    }
  }

  private notifyPositionUpdate(type: string, position: Position) {
    // We'll implement the notification system next
    console.log(`${type} Alert for ${position.tokenAddress}:`, position);
  }
} 