import { Notification } from '../types/notification';

interface NotificationPanelProps {
  notifications: Notification[];
}

const NotificationPanel = ({ notifications }: NotificationPanelProps) => {
  const getImportanceColor = (importance: 'high' | 'medium' | 'low') => {
    switch (importance) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[40vh] overflow-y-auto bg-gray-800 rounded-lg shadow-lg">
      <div className="p-3 bg-gray-700 rounded-t-lg border-b border-gray-600">
        <h3 className="text-white font-bold">Notifications</h3>
      </div>
      <div className="p-2 space-y-2">
        {notifications.map((notification, index) => (
          <div 
            key={index} 
            className={`p-3 rounded-lg bg-gray-700 border-l-4 ${getImportanceColor(notification.importance)}`}
          >
            <div className="flex justify-between items-start">
              <span className="text-sm font-semibold text-white">
                {notification.type}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-gray-300 mt-1">{notification.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationPanel; 