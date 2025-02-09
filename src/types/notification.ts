export type NotificationType = 'ENTRY' | 'EXIT' | 'ALERT' | 'STOP_LOSS' | 'TAKE_PROFIT';

export interface Notification {
  type: NotificationType;
  message: string;
  timestamp: Date;
  importance: 'high' | 'medium' | 'low';
} 