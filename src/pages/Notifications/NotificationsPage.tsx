import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Notification } from '../../types';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://dqnjtkbxtscjikalkajq.supabase.co/rest/v1/notifications';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxbmp0a2J4dHNjamlrYWxrYWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxOTYxNjksImV4cCI6MjA2Mjc3MjE2OX0.sS4N6FIbWa2AZRD4MOTNiJcohRt5FMXCbrec2ROuKYw';

// Hàm lấy giờ hiện tại theo VN
function getNowVN() {
  const now = new Date();
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
}
// Kiểm tra notification đã gửi browser notification chưa (dựa vào localStorage)
function isNotified(id: string) {
  return localStorage.getItem('notified_' + id) === '1';
}
// Đánh dấu đã gửi notification
function setNotified(id: string) {
  localStorage.setItem('notified_' + id, '1');
}

const NotificationsPage: React.FC = () => {
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    if (!session?.access_token || !user) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}?user_id_receiver=eq.${user.id}&order=created_at.desc`, {
        headers: {
          apikey: API_KEY,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Lỗi fetch notification');
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Lọc notification đã đến giờ nhắc (theo giờ VN)
  const filterVisible = (notis: Notification[]) => {
    const nowVN = getNowVN();
    return notis.filter(n => {
      if (!n.remind_time) return true;
      const remindTimeVN = new Date(new Date(n.remind_time).getTime() + 7 * 60 * 60 * 1000);
      return remindTimeVN <= nowVN;
    });
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line
  }, [session, user]);

  useEffect(() => {
    setVisibleNotifications(filterVisible(notifications));
  }, [notifications]);

  // Gửi Chrome Notification đúng giờ nhắc
  useEffect(() => {
    const interval = setInterval(() => {
      const nowVN = getNowVN();
      notifications.forEach(n => {
        if (
          n.remind_time &&
          !isNotified(n.id) &&
          new Date(new Date(n.remind_time).getTime() + 7 * 60 * 60 * 1000) <= nowVN
        ) {
          if (Notification.permission === 'granted') {
            new Notification(n.title, {
              body: n.message,
              icon: '/images/logo/logo.png'
            });
          }
          setNotified(n.id);
        }
      });
      setVisibleNotifications(filterVisible(notifications));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [notifications]);

  // Xin quyền notification khi vào trang
  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = async (id: string) => {
    if (!session?.access_token) return;
    try {
      await fetch(`${API_URL}?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: API_KEY,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ read: true }),
      });
      setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.event_id) {
      navigate(`/calendar?event=${notification.event_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event_reminder':
        return '🔔';
      case 'event_invitation':
        return '📨';
      case 'event_created':
        return '📅';
      default:
        return '📌';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Thông báo</h1>
      {loading ? <p>Đang tải thông báo...</p> : null}
      {visibleNotifications.length === 0 && !loading && <p>Không có thông báo nào.</p>}
      <ul className="space-y-3">
        {visibleNotifications.map((n) => (
          <li 
            key={n.id} 
            className={`p-4 rounded-lg border ${n.read ? 'bg-gray-100' : 'bg-yellow-50 border-yellow-300'} 
              flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors`}
            onClick={() => handleNotificationClick(n)}
          >
            <div className="flex items-start space-x-3">
              <span className="text-xl">{getNotificationIcon(n.type)}</span>
    <div>
                <div className="font-semibold">{n.title || 'Thông báo'}</div>
                <div className="text-sm text-gray-600">{n.message}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {n.remind_time ? (
                    <>
                      Nhắc lúc: {new Date(new Date(n.remind_time).getTime() + 7 * 60 * 60 * 1000).toLocaleString('vi-VN')}
                    </>
                  ) : (
                    new Date(n.created_at).toLocaleString('vi-VN')
                  )}
                </div>
              </div>
            </div>
            {!n.read && (
              <span className="ml-4 px-2 py-1 rounded-full bg-blue-500 text-white text-xs">
                Mới
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationsPage; 