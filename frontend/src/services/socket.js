import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

// Helper to get current authenticated user's property ID
export const getCurrentPropertyId = () => {
  try {
    const raw = localStorage.getItem('hms_user');
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
  console.log('⚡ Connected to HMS Realtime Socket.io server:', socket.id);
  joinCurrentProperty();
});

socket.on('reconnect', () => {
  console.log('🔄 Reconnected to HMS Realtime Socket.io server:', socket.id);
  joinCurrentProperty();
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from HMS Realtime Socket.io server');
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
  'dashboard_sync'
];

/**
 * Universal subscription helper for real-time synchronization across dashboards.
 * @param {Function} callback - Function called with (data, eventName) when an event matches.
 * @param {Array<string>} [events] - Optional list of specific events to listen for. Defaults to all sync events.
 * @returns {Function} cleanup function to unsubscribe listeners.
 */
export const subscribeRealtimeSync = (callback, events = ALL_REALTIME_EVENTS) => {
  const currentPropId = getCurrentPropertyId();
  const rawUser = typeof window !== 'undefined' ? localStorage.getItem('hms_user') : null;
  const isSuperAdmin = rawUser && rawUser.includes('"role":"super-admin"');

  const handler = (eventName) => (data = {}) => {
    // If payload has propertyId and user is restricted to a property, verify match
    if (data.propertyId && currentPropId && !isSuperAdmin) {
      const p1 = String(data.propertyId).trim().toLowerCase();
      const p2 = String(currentPropId).trim().toLowerCase();
      const isWildcard = p1 === 'all' || p1 === 'property_all' || p2 === 'all' || p2 === 'property_all';
      const isMatching = p1 === p2 || isWildcard || (p1.includes('jai') && p2.includes('jai')) || (p1.includes('9hq8p') && p2.includes('9hq8p'));
      if (!isMatching) {
        return; // Ignore events intended for other properties
      }
    }
    try {
      callback(data, eventName);
    } catch (err) {
      console.error('Realtime sync handler error:', err);
    }
  };

  const activeHandlers = [];
  events.forEach((evt) => {
    const fn = handler(evt);
    socket.on(evt, fn);
    activeHandlers.push({ evt, fn });
  });

  return () => {
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
  socket.emit(eventName, {
    ...data,
    propertyId: data.propertyId || propertyId || null,
    timestamp: Date.now()
  });
};

