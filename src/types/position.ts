export interface Position {
  tokenAddress: string;
  entryPrice: number;
  entryTime: Date;
  amount: number;
  stopLoss: number;
  takeProfit: number;
  trailingStop: number;
} 