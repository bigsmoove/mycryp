export type NotificationType = 
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'INFO'
  | 'ENTRY'
  | 'EXIT'
  | 'ALERT';

export interface Notification {
  type: NotificationType;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
} 