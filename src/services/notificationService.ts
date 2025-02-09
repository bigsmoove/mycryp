type NotificationType = 'ENTRY' | 'EXIT' | 'ALERT' | 'STOP_LOSS' | 'TAKE_PROFIT';

interface Notification {
  type: NotificationType;
  message: string;
  timestamp: Date;
  importance: 'high' | 'medium' | 'low';
}

export class NotificationService {
  private notifications: Notification[] = [];
  private subscribers: ((notification: Notification) => void)[] = [];

  notify(type: NotificationType, message: string, importance: 'high' | 'medium' | 'low' = 'medium') {
    const notification = {
      type,
      message,
      timestamp: new Date(),
      importance
    };

    this.notifications.push(notification);
    this.subscribers.forEach(subscriber => subscriber(notification));
  }

  subscribe(callback: (notification: Notification) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  getRecentNotifications(count: number = 10) {
    return this.notifications
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }
} 