import { receptionistService } from './receptionist';
import { isToday, formatDisplayDate } from '@/utils/dateUtils';
import { extractRoomNumber } from '@/utils/roomUtils';
import { subscribeRealtimeSync } from './socket';

/**
 * High-Performance In-Memory Reception Data Cache
 * Enables instant (0ms) zero-flicker tab navigation across all front desk pages.
 */
class ReceptionDataCache {
  constructor() {
    this.cache = new Map();
    this.isPrefetching = false;
    this.hasPrefetched = false;
    this.setupSocketSync();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  has(key) {
    return this.cache.has(key);
  }

  invalidate(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  setupSocketSync() {
    if (typeof window === 'undefined') return;
    try {
      subscribeRealtimeSync((data, eventName) => {
        // When real-time events fire, invalidate or trigger background refresh
        if (eventName?.includes('booking') || eventName?.includes('checkin') || eventName?.includes('checkout')) {
          this.prefetchAll(true);
        } else if (eventName?.includes('room')) {
          this.cache.delete('rooms');
          this.cache.delete('dashboard');
        } else if (eventName?.includes('payment')) {
          this.cache.delete('payments');
          this.cache.delete('dashboard');
        } else if (eventName?.includes('feedback')) {
          this.cache.delete('feedback');
          this.cache.delete('dashboard');
        }
      });
    } catch (e) {
      // Ignore in non-browser env
    }
  }

  /**
   * Transforms raw arrivals bookings into clean, ready-to-render items
   */
  processArrivals(rawData) {
    const raw = Array.isArray(rawData) ? rawData : [];
    return raw
      .filter(b => (isToday(b.checkIn) || String(b.checkIn).toLowerCase() === 'today') && b.status !== 'Checked-out' && b.status !== 'Checked Out' && b.status !== 'Cancelled')
      .map(b => {
        const cleanRoom = extractRoomNumber(b) || '101';
        const cleanRoomType = b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : (cleanRoom.startsWith('2') ? 'Deluxe Room' : cleanRoom.startsWith('3') ? 'Executive Suite' : cleanRoom.startsWith('4') ? 'Presidential Suite' : 'Standard Room'));

        return {
          id: b.bookingId || b.id || b._id,
          _id: b._id || b.id || b.bookingId,
          bookingId: b.bookingId || b.id || b._id,
          name: b.guest || b.name || 'Guest',
          guest: b.guest || b.name || 'Guest',
          phone: b.phone || '--',
          email: b.email || `${(b.guest || 'guest').toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          room: cleanRoom,
          roomNumber: cleanRoom,
          type: cleanRoomType,
          roomType: cleanRoomType,
          roomReady: true,
          isEarly: false,
          idVerification: 'Verified',
          paymentStatus: Number(b.balance || 0) === 0 || b.paymentStatus === 'Paid' ? 'Paid' : 'Pending',
          source: b.source || 'Direct Web',
          status: b.status === 'Confirmed' ? 'Pre-checked' : (b.status === 'Checked-in' || b.status === 'Checked In' ? 'Checked-In' : b.status),
          time: formatDisplayDate(b.checkIn) || 'Today',
          checkIn: b.checkIn || 'Today',
          checkOut: b.checkOut || 'Tomorrow',
          nights: b.nights || 1,
          amount: b.amount || 0,
          balance: b.balance || 0
        };
      });
  }

  /**
   * Transforms raw departures bookings into clean, ready-to-render items
   */
  processDepartures(rawData) {
    const raw = Array.isArray(rawData) ? rawData : [];
    return raw
      .filter(b => (isToday(b.checkOut) || String(b.checkOut).toLowerCase() === 'today') && b.status !== 'Cancelled')
      .map(b => {
        const rmNum = extractRoomNumber(b) || b.roomNumber || (b.room ? b.room.split(' ')[0] : '101');
        const rmType = b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : 'Standard Room');
        return {
          id: b.bookingId || b.id || b._id,
          _id: b._id || b.id || b.bookingId,
          bookingId: b.bookingId || b.id || b._id,
          name: b.guest || b.name || 'Guest',
          guest: b.guest || b.name || 'Guest',
          phone: b.phone || '--',
          email: b.email || `${(b.guest || 'guest').toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          room: rmNum,
          roomNumber: rmNum,
          type: rmType,
          roomType: rmType,
          nights: Number(b.nights || 1),
          duration: `${b.nights || 1} Nights`,
          time: formatDisplayDate(b.checkOut) || 'Today',
          checkOut: b.checkOut || 'Today',
          checkIn: b.checkIn || 'Today',
          isLate: false,
          isCorporate: false,
          corporateAccount: '',
          balance: Number(b.balance || 0),
          paymentStatus: Number(b.balance || 0) === 0 ? 'Paid' : 'Pending',
          status: (b.status === 'Checked-out' || b.status === 'Checked Out') ? 'Checked Out' : (Number(b.balance || 0) > 0 ? 'Pending Balance' : 'Ready')
        };
      });
  }

  /**
   * Transforms raw guests bookings into clean, ready-to-render in-house guest items
   */
  processGuests(rawData) {
    const raw = Array.isArray(rawData) ? rawData : [];
    return raw.map(b => {
      const rmNum = extractRoomNumber(b) || b.roomNumber || (b.room ? b.room.split(' ')[0] : '—');
      const rmType = b.roomType || (b.room && b.room.includes('·') ? b.room.split('·')[1]?.trim() : 'Standard Room');
      const bal = Number(b.balance !== undefined ? b.balance : 0);
      const guestName = b.guest || b.name || 'Guest';
      return {
        id: b.bookingId || b.id || b._id,
        _id: b._id || b.id || b.bookingId,
        bookingId: b.bookingId || b.id || b._id,
        name: guestName,
        guest: guestName,
        phone: b.phone || '--',
        email: b.email || `${guestName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        room: rmNum,
        roomNumber: rmNum,
        roomType: rmType,
        checkIn: b.checkIn || 'Today',
        checkOut: b.checkOut || 'Tomorrow',
        duration: b.duration || `${b.nights || 1} Nights`,
        nights: b.nights || 1,
        pax: b.pax || '2 Adults',
        amount: Number(b.amount || b.totalAmount || 0),
        balance: bal,
        paymentStatus: b.paymentStatus || (bal === 0 ? 'Paid' : 'Pending'),
        status: b.status === 'Checked-in' || b.status === 'Checked In' ? 'Staying' : (b.status || 'Staying'),
        vipTier: b.vipTier || 'Gold Elite',
        specialRequests: b.specialRequests || b.notes || 'None',
        timeline: b.timeline || [
          { time: b.checkIn || 'Today', action: 'Guest in-house active stay.' }
        ]
      };
    });
  }

  /**
   * Silently pre-fetches all primary reception datasets in parallel
   */
  async prefetchAll(force = false) {
    if (this.isPrefetching) return;
    if (this.hasPrefetched && !force) return;

    this.isPrefetching = true;
    try {
      await Promise.allSettled([
        receptionistService.getArrivals().then(res => {
          if (res?.data) {
            this.set('arrivals', this.processArrivals(res.data));
          }
        }),
        receptionistService.getDepartures().then(res => {
          if (res?.data) {
            this.set('departures', this.processDepartures(res.data));
          }
        }),
        receptionistService.getGuests().then(res => {
          const raw = res && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
          this.set('guests', this.processGuests(raw));
        }),
        receptionistService.getRooms().then(res => {
          if (res?.success && res.data) {
            this.set('rooms', res.data);
          }
        }),
        receptionistService.getReservations().then(res => {
          if (res?.success && res.data) {
            const list = res.data.map(r => {
              const cleanRmNum = extractRoomNumber(r);
              const rmNum = cleanRmNum || "Unassigned";
              const rmType = r.roomType || (r.room && r.room.includes('·') ? r.room.split('·')[1]?.trim() : (r.room && !r.room.match(/\b\d{3,4}\b/) ? r.room : (cleanRmNum?.startsWith('2') ? 'Deluxe Room' : cleanRmNum?.startsWith('3') ? 'Executive Suite' : cleanRmNum?.startsWith('4') ? 'Presidential Suite' : 'Standard Room')));
              return {
                ...r,
                room: rmNum,
                roomNumber: rmNum,
                roomType: rmType
              };
            });
            this.set('reservations', list);
          }
        }),
        receptionistService.getFeedback().then(res => {
          if (res?.success && Array.isArray(res.data)) {
            this.set('feedback', res.data);
          }
        }),
        receptionistService.getPayments().then(res => {
          if (res?.success && Array.isArray(res.data)) {
            this.set('payments', res.data);
          }
        }),
        receptionistService.getNotifications().then(res => {
          if (res?.success && Array.isArray(res.data)) {
            this.set('notifications', res.data);
          }
        })
      ]);
      this.hasPrefetched = true;
    } catch (e) {
      console.warn("Reception prefetch failed softly:", e);
    } finally {
      this.isPrefetching = false;
    }
  }
}

export const receptionCache = new ReceptionDataCache();
export default receptionCache;
