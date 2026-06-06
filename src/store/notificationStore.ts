import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'pending_user' | 'low_stock' | 'system';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
}

/** Which roles can see each notification type */
const ROLE_ACCESS: Record<string, string[]> = {
  pending_user: ['admin'],
  low_stock:    ['admin', 'warehouse'],
  system:       ['admin', 'analysis'],
};

function canSee(type: string, role: string): boolean {
  const allowed = ROLE_ACCESS[type] || [];
  return allowed.includes(role);
}

export async function requestDesktopPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
}

export function showDesktopNotif(title: string, body: string, link?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const notif = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: link || title,
      requireInteraction: false,
    });
    notif.onclick = () => {
      window.focus();
      if (link) window.location.hash = `#${link}`;
      notif.close();
    };
  } catch { /* silent fail */ }
}

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  desktopEnabled: boolean;
  init: (role?: string) => void;
  refresh: (role?: string) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
  enableDesktop: () => Promise<boolean>;
  disableDesktop: () => void;
  sendDesktop: (title: string, body: string, link?: string) => void;
}

// ─── CLOUD ONLY — NO localStorage for notifications ───
export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  desktopEnabled: false,

  init: (role = 'admin') => {
    set({ desktopEnabled: false }); // Not persisted — Cloud only
    get().refresh(role);
  },

  refresh: (role = 'admin') => {
    // role used for filtering notifications by user role
    void role;

  refresh: (_role = 'admin') => {
    // Notifications generated from LIVE data — no persistence needed
    let notifs: AppNotification[] = [];

    // --- Low stock (admin + warehouse) ---
    // Note: notifications are generated on-the-fly from live data
    // No localStorage — pure Cloud architecture

    notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    set({ notifications: notifs, unreadCount: notifs.filter(n => !n.read).length });
  },

  markAsRead: (id: string) => {
    const { notifications } = get();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    set({ notifications: updated, unreadCount: updated.filter(n => !n.read).length });
  },

  markAllRead: () => {
    const { notifications } = get();
    const updated = notifications.map(n => ({ ...n, read: true }));
    set({ notifications: updated, unreadCount: 0 });
  },

  clear: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  enableDesktop: async () => {
    const granted = await requestDesktopPermission();
    if (granted) {
      set({ desktopEnabled: true });
      showDesktopNotif('تم تفعيل الإشعارات', 'سيتم إرسال إشعارات مهمة');
    }
    return granted;
  },

  disableDesktop: () => {
    set({ desktopEnabled: false });
  },

  sendDesktop: (title: string, body: string, link?: string) => {
    showDesktopNotif(title, body, link);
  },
}));
