import React, { useEffect, useState } from 'react';
import './Notification.css';

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationProps {
  notification: NotificationData;
  onDismiss: (id: string) => void;
}

const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show notification
    setIsVisible(true);

    // Auto dismiss after duration
    const duration = notification.duration || 5000;
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(notification.id), 300); // Wait for fade out
    }, duration);

    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`notification notification-${notification.type} ${isVisible ? 'notification-visible' : ''}`}>
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-icon">{getIcon()}</span>
          <h4 className="notification-title">{notification.title}</h4>
          <button 
            className="notification-close"
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onDismiss(notification.id), 300);
            }}
          >
            ×
          </button>
        </div>
        {notification.message && (
          <p className="notification-message">{notification.message}</p>
        )}
      </div>
    </div>
  );
};

export default Notification;