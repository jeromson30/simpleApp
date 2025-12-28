import React, { useState, useEffect, useRef } from 'react';
import { Bell, Mail, Check, CheckCheck, X } from 'lucide-react';
import '../styles/components/notification-center.css';

const NotificationCenter = ({ API_BASE, AuthService }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const headers = AuthService.getAuthHeaders();
      const response = await fetch(`${API_BASE}/notifications?limit=20`, { headers });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const headers = AuthService.getAuthHeaders();
      const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  const markAllAsRead = async () => {
    setLoading(true);
    try {
      const headers = AuthService.getAuthHeaders();
      const response = await fetch(`${API_BASE}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'email_sent':
      case 'email_opened':
        return <Mail size={16} className="notification-type-icon email" />;
      default:
        return <Bell size={16} className="notification-type-icon default" />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          {/* Header */}
          <div className="notification-dropdown-header">
            <h3>Notifications</h3>
            <div className="notification-dropdown-actions">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="notification-mark-all"
                  disabled={loading}
                  title="Tout marquer comme lu"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="notification-close"
                title="Fermer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="notification-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={48} style={{ opacity: 0.2 }} />
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-item-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-item-content">
                    <p className="notification-item-title">{notification.title}</p>
                    <p className="notification-item-message">{notification.message}</p>
                    <p className="notification-item-time">{formatTime(notification.created_at)}</p>
                  </div>
                  {!notification.is_read && (
                    <div className="notification-unread-dot" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="notification-dropdown-footer">
              <button className="notification-view-all">
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
