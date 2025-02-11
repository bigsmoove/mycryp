import { TokenMetrics } from '../types/token';
import { NotificationService } from './notificationService';
import { TRADING_RULES } from '../config/constants';

export interface Position {
  tokenAddress: string;
  entry: number;
  size: number;
  stopLoss: number;
  trailingStop: number;
  targets: number[];
  currentPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  highestPrice?: number;
  lowestPrice?: number;
  entryTime: Date;
  alerts: Set<string>;
}

export class PositionManager {
  private static instance: PositionManager;
  private positions: Map<string, Position> = new Map();
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = new NotificationService();
  }

  static getInstance(): PositionManager {
    if (!PositionManager.instance) {
      PositionManager.instance = new PositionManager();
    }
    return PositionManager.instance;
  }

  addPosition(token: TokenMetrics, size: number) {
    const { POSITION, EXIT } = TRADING_RULES;
    
    const position: Position = {
      tokenAddress: token.address,
      entry: token.price,
      size,
      stopLoss: token.price * EXIT.STOP_LOSS.INITIAL,
      trailingStop: token.price * EXIT.STOP_LOSS.TRAILING,
      targets: EXIT.TAKE_PROFIT.map(tp => token.price * (1 + tp.AT_PROFIT)),
      currentPrice: token.price,
      highestPrice: token.price,
      lowestPrice: token.price,
      entryTime: new Date(),
      alerts: new Set()
    };

    this.positions.set(token.address, position);
    this.startMonitoring(token.address);
    
    return position;
  }

  private startMonitoring(tokenAddress: string) {
    // Monitor price and update position
    setInterval(() => this.updatePosition(tokenAddress), 10000);
  }

  private updatePosition(tokenAddress: string) {
    const position = this.positions.get(tokenAddress);
    if (!position) return;

    // TODO: Get current price from DexScreener
    // For now, simulate price updates
    const currentPrice = position.currentPrice! * (1 + (Math.random() * 0.02 - 0.01));
    
    this.updateMetrics(tokenAddress, currentPrice);
    this.checkStops(tokenAddress, currentPrice);
    this.checkTargets(tokenAddress, currentPrice);
  }

  private updateMetrics(tokenAddress: string, currentPrice: number) {
    const position = this.positions.get(tokenAddress);
    if (!position) return;

    position.currentPrice = currentPrice;
    position.highestPrice = Math.max(position.highestPrice!, currentPrice);
    position.lowestPrice = Math.min(position.lowestPrice!, currentPrice);
    
    position.pnl = (currentPrice - position.entry) * position.size;
    position.pnlPercent = ((currentPrice - position.entry) / position.entry) * 100;
  }

  private checkStops(tokenAddress: string, currentPrice: number) {
    const position = this.positions.get(tokenAddress);
    if (!position) return;

    // Check stop loss
    if (currentPrice <= position.stopLoss && !position.alerts.has('stop_loss')) {
      this.notificationService.notify(
        'ALERT',
        `⚠️ Stop loss hit for ${tokenAddress} at $${currentPrice.toFixed(8)}`,
        'high'
      );
      position.alerts.add('stop_loss');
    }

    // Update trailing stop
    const trailingStopDistance = position.entry * (1 - TRADING_RULES.EXIT.STOP_LOSS.TRAILING);
    const newTrailingStop = position.highestPrice! - trailingStopDistance;
    
    if (newTrailingStop > position.trailingStop) {
      position.trailingStop = newTrailingStop;
    }
  }

  private checkTargets(tokenAddress: string, currentPrice: number) {
    const position = this.positions.get(tokenAddress);
    if (!position) return;

    position.targets.forEach((target, index) => {
      const alertKey = `target_${index}`;
      if (currentPrice >= target && !position.alerts.has(alertKey)) {
        this.notificationService.notify(
          'ALERT',
          `🎯 Take profit target ${index + 1} reached at $${currentPrice.toFixed(8)}`,
          'medium'
        );
        position.alerts.add(alertKey);
      }
    });
  }

  getPosition(tokenAddress: string): Position | undefined {
    return this.positions.get(tokenAddress);
  }

  getAllPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  closePosition(tokenAddress: string) {
    const position = this.positions.get(tokenAddress);
    if (!position) return;

    this.positions.delete(tokenAddress);
    this.notificationService.notify(
      'EXIT',
      `Closed position for ${tokenAddress} with P&L: ${position.pnl?.toFixed(2)} (${position.pnlPercent?.toFixed(2)}%)`,
      'medium'
    );
  }

  public updatePrice(tokenAddress: string, currentPrice: number) {
    const position = this.positions.get(tokenAddress);
    if (!position) return;

    this.updateMetrics(tokenAddress, currentPrice);
    this.checkStops(tokenAddress, currentPrice);
    this.checkTargets(tokenAddress, currentPrice);
  }
} 