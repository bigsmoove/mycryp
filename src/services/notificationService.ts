import { NotificationType, Notification } from '../types/notification';

export class NotificationService {
  private subscribers: ((notification: Notification) => void)[] = [];

  public notify(
    type: NotificationType,
    message: string,
    priority: 'low' | 'medium' | 'high'
  ): void {
    const notification: Notification = {
      type,
      message,
      priority,
      timestamp: new Date()
    };

    this.subscribers.forEach(subscriber => subscriber(notification));
  }

  public subscribe(callback: (notification: Notification) => void): () => void {
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