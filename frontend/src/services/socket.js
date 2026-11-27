import { io } from 'socket.io-client';
import { invalidateApiCache } from './apiClient';

const getSocketUrl = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal && (!envUrl || envUrl.includes('speshway.site'))) {
      return 'http://localhost:5000';
    }
    return envUrl || window.location.origin;
  }
  return envUrl || 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

const getAuthToken = () => (typeof window !== 'undefined' ? localStorage.getItem('hms_token') : null);

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  withCredentials: true,
  auth: (cb) => {
    cb({ token: getAuthToken() || undefined });
  },
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 10000
});

// Helper to get current authenticated user's property ID
export const getCurrentPropertyId = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('hms_user') : null;
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.role === 'super-admin') return 'all';
      return user?.propertyId || null;
    }
  } catch (e) {}
  return null;
};

// Join property room on connect (only when authenticated)
export const joinCurrentProperty = () => {
  const token = getAuthToken();
  if (!token) return;
  const propertyId = getCurrentPropertyId();
  if (propertyId) {
    socket.emit('join_property', propertyId);
  }
};

const reconnectSocketWithAuth = () => {
  if (socket.connected) {
    socket.disconnect();
  }
  socket.connect();
};

socket.on('connect', () => {
  joinCurrentProperty();
});

socket.on('reconnect', () => {
  joinCurrentProperty();
});

socket.on('connect_error', () => {
  // Silent fallback without console spam
});

// Re-join property or reconnect with updated JWT if login/logout/refresh occurs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'hms_user' || e.key === 'hms_token') {
      reconnectSocketWithAuth();
    }
  });
  window.addEventListener('user-profile-updated', () => {
    reconnectSocketWithAuth();
  });
  window.addEventListener('auth-token-refreshed', () => {
    reconnectSocketWithAuth();
  });
  window.addEventListener('user-logged-out', () => {
    reconnectSocketWithAuth();
  });
}

export const ALL_REALTIME_EVENTS = [
  'booking_updated',
  'booking_created',
  'booking_deleted',
  'room_status_changed',
  'room_created',
  'room_updated',
  'room_deleted',
  'availability_changed',
  'checkin_completed',
  'checkout_completed',
  'payment_logged',
  'payment_added',
  'payment_updated',
  'guest_updated',
  'property_created',
  'property_updated',
  'property_deleted',
  'user_created',
  'user_updated',
  'user_deleted',
  'staff_updated',
  'subscription_plan_updated',
  'subscription_request_created',
  'subscription_request_updated',
  'coupon_created',
  'coupon_updated',
  'coupon_deleted',
  'contact_created',
  'contact_updated',
  'contact_deleted',
  'feedback_received',
  'feedback_created',
  'feedback_updated',
  'feedback_deleted',
  'notification_created',
  'notification_received',
  'new_notification',
  'guest_notification',
  'manager_notification',
  'notification_updated',
  'notification_deleted',
  'unread_notifications_count_updated',
  'dashboard_sync'
];

/**
 * Universal subscription helper for real-time synchronization across dashboards.
 * Features 250ms debouncing and automatic API cache invalidation.
 * @param {Function} callback - Function called with (data, eventName) when an event matches.
 * @param {Array<string>} [events] - Optional list of specific events to listen for. Defaults to all sync events.
 * @returns {Function} cleanup function to unsubscribe listeners.
 */
export const subscribeRealtimeSync = (callback, events = ALL_REALTIME_EVENTS) => {
  let debounceTimer = null;

  const debouncedHandler = (eventName) => (data = {}) => {
    try {
      // Invalidate frontend cache on relevant data change events
      invalidateApiCache();

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        callback(data, eventName);
      }, 200);
    } catch (err) {
      console.error('Realtime sync handler error:', err);
    }
  };

  const activeHandlers = [];
  events.forEach((evt) => {
    const fn = debouncedHandler(evt);
    socket.on(evt, fn);
    activeHandlers.push({ evt, fn });
  });

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    activeHandlers.forEach(({ evt, fn }) => {
      socket.off(evt, fn);
    });
  };
};

/**
 * Emit a real-time event enriched with current propertyId
 */
export const emitRealtimeEvent = (eventName, data = {}) => {
  try {
    const propertyId = getCurrentPropertyId();
    invalidateApiCache();
    socket.emit(eventName, {
      ...data,
      propertyId: data.propertyId || propertyId || null,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('Realtime event emit warning:', err);
  }
};

// Expose globally to guarantee availability across all components and execution contexts
if (typeof window !== 'undefined') {
  window.emitRealtimeEvent = emitRealtimeEvent;
  window.subscribeRealtimeSync = subscribeRealtimeSync;
  window.socket = socket;
}
if (typeof globalThis !== 'undefined') {
  globalThis.emitRealtimeEvent = emitRealtimeEvent;
  globalThis.subscribeRealtimeSync = subscribeRealtimeSync;
  globalThis.socket = socket;
}

export default socket;

