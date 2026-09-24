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

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
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
      return user?.propertyId || null;
    }
  } catch (e) {}
  return null;
};

// Join property room on connect
export const joinCurrentProperty = () => {
  const propertyId = getCurrentPropertyId();
  if (propertyId) {
    socket.emit('join_property', propertyId);
  } else {
    socket.emit('join_property', 'property_all');
  }
};

socket.on('connect', () => {
  joinCurrentProperty();
});

socket.on('reconnect', () => {
  joinCurrentProperty();
});

socket.on('connect_error', (err) => {
  // Silent fallback to polling without console spam
});

// Re-join property if login changes or storage updates
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'hms_user') {
      joinCurrentProperty();
    }
  });
  window.addEventListener('user-profile-updated', () => {
    joinCurrentProperty();
  });
}

export const ALL_REALTIME_EVENTS = [
  'booking_updated',
  'booking_created',
  'booking_deleted',
  'room_status_changed',
  'availability_changed',
  'checkin_completed',
  'checkout_completed',
  'payment_logged',
  'payment_added',
  'payment_updated',
  'guest_updated',
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
  const propertyId = getCurrentPropertyId();
  invalidateApiCache();
  socket.emit(eventName, {
    ...data,
    propertyId: data.propertyId || propertyId || null,
    timestamp: Date.now()
  });
};

export default socket;
