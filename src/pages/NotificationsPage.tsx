import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';
import { Bell, CheckCheck, Clock } from 'lucide-react';

type Page = 'login' | 'onboarding' | 'schemes' | 'schemeDetail' | 'reportIssue' | 'myIssues' | 'officialDashboard' | 'notifications';

interface Props {
  navigate: (page: Page) => void;
}

export function NotificationsPage({ navigate }: Props) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const lang = i18n.language as 'en' | 'te';

  useEffect(() => {
    const loadNotifications = async () => {
      if (!profile) return;
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
      } else if (data) {
        setNotifications(data as Notification[]);
      }
      setLoading(false);
    };
    loadNotifications();
  }, [profile]);

  const handleMarkAllRead = async () => {
    if (!profile) return;
    setMarkingAll(true);
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) {
      setMarkingAll(false);
      return;
    }
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
      .eq('user_id', profile.id);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
    setMarkingAll(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);

    if (diffHrs < 1) {
      const diffMin = Math.floor(diffMs / (1000 * 60));
      return diffMin < 1 ? 'Just now' : `${diffMin}m ago`;
    }
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500 text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-[#0A3D91] text-white px-4 py-8">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-[#FF9933]" />
              {t('notifications.title')}
            </h1>
            <p className="text-white/80 text-sm mt-1">{t('notifications.subtitle')}</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-2">
        {notifications.length === 0 ? (
          <div className="card text-center py-12">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('notifications.noNotifications')}</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const message = lang === 'te' ? notif.message_te : notif.message_en;
            return (
              <div
                key={notif.id}
                className={`card fade-in flex items-start gap-3 ${
                  !notif.is_read ? 'border-l-4 border-l-[#FF9933]' : ''
                }`}
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                    notif.is_read ? 'bg-gray-100' : 'bg-[#FF9933]/10'
                  }`}
                >
                  <Bell
                    className={`w-5 h-5 ${
                      notif.is_read ? 'text-gray-400' : 'text-[#FF9933]'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      notif.is_read ? 'text-gray-500' : 'text-gray-900 font-medium'
                    }`}
                  >
                    {message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{formatDate(notif.created_at)}</span>
                    {!notif.is_read && (
                      <span className="badge badge-warning text-xs ml-auto">
                        {t('notifications.new')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
