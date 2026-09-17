import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../models/notification_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../services/notification_service.dart';

class GuestNotificationProvider with ChangeNotifier {
  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  String? _error;
  String _selectedCategory = 'All';
  StreamSubscription? _fcmForegroundSub;
  StreamSubscription? _fcmTapSub;
  Timer? _debounceTimer;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get errorMessage => _error;
  String get selectedCategory => _selectedCategory;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  List<NotificationModel> get filteredNotifications {
    if (_selectedCategory == 'All') {
      return _notifications;
    } else if (_selectedCategory == 'Unread') {
      return _notifications.where((n) => !n.isRead).toList();
    } else if (_selectedCategory == 'Read') {
      return _notifications.where((n) => n.isRead).toList();
    } else {
      final target = _selectedCategory.trim().toLowerCase();
      return _notifications.where((n) {
        final cat = n.category.trim().toLowerCase();
        final type = n.type.trim().toLowerCase();
        final msg = n.message.trim().toLowerCase();
        final title = n.title.trim().toLowerCase();

        if (target == 'bookings' && (cat.contains('book') || cat.contains('reserv') || cat.contains('stay') || cat.contains('check') || cat.contains('room') || type.contains('book') || type.contains('check') || type.contains('stay') || title.contains('booking') || title.contains('reservation') || title.contains('check-in') || title.contains('checked in') || title.contains('check-out') || title.contains('checked out') || title.contains('room assigned') || msg.contains('booking') || msg.contains('reservation') || msg.contains('check-in') || msg.contains('checked in') || msg.contains('check-out') || msg.contains('checked out') || msg.contains('room assigned'))) {
          return true;
        }
        if (target == 'payments' &&
            (cat.contains('pay') ||
                cat.contains('bill') ||
                cat.contains('folio') ||
                cat.contains('refund') ||
                type.contains('pay') ||
                type.contains('refund') ||
                msg.contains('paid') ||
                msg.contains('payment') ||
                msg.contains('refund') ||
                title.contains('payment') ||
                title.contains('refund'))) {
          return true;
        }
        if (target == 'announcements' && (cat.contains('announc') || cat.contains('alert') || cat.contains('promo') || type.contains('announc') || cat.contains('general'))) {
          return true;
        }
        return cat == target || type == target;
      }).toList();
    }
  }

  GuestNotificationProvider() {
    _registerSocketListeners();
    _registerFcmListeners();
  }

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  void _debouncedFetchNotifications({Duration duration = const Duration(milliseconds: 300)}) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(duration, () {
      fetchNotifications(silent: true);
    });
  }

  void _registerSocketListeners() {
    SocketService.on('notification_received', (_) => _debouncedFetchNotifications());
    SocketService.on('notification_created', (_) => _debouncedFetchNotifications());
    SocketService.on('new_notification', (_) => _debouncedFetchNotifications());
    SocketService.on('guest_notification', (_) => _debouncedFetchNotifications());
    SocketService.on('unread_notifications_count_updated', (_) => _debouncedFetchNotifications());
    SocketService.on('dashboard_sync', (_) => _debouncedFetchNotifications());
    SocketService.on('booking_created', (_) => _debouncedFetchNotifications());
    SocketService.on('booking_updated', (_) => _debouncedFetchNotifications());
    SocketService.on('room_status_changed', (_) => _debouncedFetchNotifications());
    SocketService.on('room_assigned', (_) => _debouncedFetchNotifications());
    SocketService.on('checkin_completed', (_) => _debouncedFetchNotifications());
    SocketService.on('checkout_completed', (_) => _debouncedFetchNotifications());
    SocketService.on('payment_logged', (_) => _debouncedFetchNotifications());
    SocketService.on('payment_updated', (_) => _debouncedFetchNotifications());
  }

  void _registerFcmListeners() {
    _fcmForegroundSub = NotificationService.onForegroundMessage.listen((_) {
      _debouncedFetchNotifications();
    });
    _fcmTapSub = NotificationService.onNotificationTap.listen((_) {
      _debouncedFetchNotifications();
    });
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _fcmForegroundSub?.cancel();
    _fcmTapSub?.cancel();
    super.dispose();
  }

  Future<void> fetchNotifications({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _error = null;
      notifyListeners();
    }

    try {
      final response = await ApiService.get(ApiEndpoints.guestNotifications);
      if (response.success && response.data != null) {
        List<dynamic> list = [];
        if (response.data is List) {
          list = response.data as List;
        } else if (response.data is Map<String, dynamic>) {
          list = (response.data['notifications'] ?? response.data['data']) as List<dynamic>? ?? [];
        }
        final fetched = list.map((e) => NotificationModel.fromJson(e as Map<String, dynamic>)).toList();
        
        final seen = <String>{};
        final unique = <NotificationModel>[];
        for (final n in fetched) {
          final dedupKey = '${n.title.trim().toLowerCase()}_${n.message.trim().toLowerCase()}';
          if (!seen.contains(n.id) && !seen.contains(dedupKey)) {
            seen.add(n.id);
            seen.add(dedupKey);
            unique.add(n);
          }
        }
        _notifications = unique;
      } else {
        if (!silent) _error = response.message;
      }
    } catch (e) {
      if (!silent) _error = e.toString();
    } finally {
      if (!silent) {
        _isLoading = false;
        notifyListeners();
      } else {
        notifyListeners();
      }
    }
  }

  Future<void> markAsRead(String id, {String? title, String? message}) async {
    int index = -1;
    if (id.isNotEmpty) {
      index = _notifications.indexWhere((n) => n.id == id);
    }
    if (index == -1 && title != null && message != null) {
      index = _notifications.indexWhere((n) => n.title.trim() == title.trim() && n.message.trim() == message.trim());
    }

    if (index != -1 && !_notifications[index].isRead) {
      final old = _notifications[index];
      _notifications[index] = NotificationModel(
        id: old.id,
        title: old.title,
        message: old.message,
        category: old.category,
        isRead: true,
        propertyId: old.propertyId,
        createdAt: old.createdAt,
      );
      notifyListeners();
    }

    final targetId = index != -1 ? _notifications[index].id : id;
    final targetTitle = index != -1 ? _notifications[index].title : title;
    final targetMsg = index != -1 ? _notifications[index].message : message;

    final body = {
      if (targetTitle != null && targetTitle.isNotEmpty) 'title': targetTitle,
      if (targetMsg != null && targetMsg.isNotEmpty) 'message': targetMsg,
    };

    try {
      final endpointId = targetId.isNotEmpty ? targetId : 'general';
      final response = await ApiService.post('${ApiEndpoints.guestNotifications}/$endpointId/read', body);
      if (!response.success) {
        await ApiService.patch('${ApiEndpoints.guestNotifications}/$endpointId/read', body);
      }
    } catch (_) {
      // Keep optimistic update
    }
  }

  Future<void> markAsUnread(String id, {String? title, String? message}) async {
    int index = -1;
    if (id.isNotEmpty) {
      index = _notifications.indexWhere((n) => n.id == id);
    }
    if (index == -1 && title != null && message != null) {
      index = _notifications.indexWhere((n) => n.title.trim() == title.trim() && n.message.trim() == message.trim());
    }

    if (index != -1 && _notifications[index].isRead) {
      final old = _notifications[index];
      _notifications[index] = NotificationModel(
        id: old.id,
        title: old.title,
        message: old.message,
        category: old.category,
        isRead: false,
        propertyId: old.propertyId,
        createdAt: old.createdAt,
      );
      notifyListeners();
    }

    final targetId = index != -1 ? _notifications[index].id : id;
    final targetTitle = index != -1 ? _notifications[index].title : title;
    final targetMsg = index != -1 ? _notifications[index].message : message;

    final body = {
      if (targetTitle != null && targetTitle.isNotEmpty) 'title': targetTitle,
      if (targetMsg != null && targetMsg.isNotEmpty) 'message': targetMsg,
    };

    try {
      final endpointId = targetId.isNotEmpty ? targetId : 'general';
      final response = await ApiService.post('${ApiEndpoints.guestNotifications}/$endpointId/unread', body);
      if (!response.success) {
        await ApiService.patch('${ApiEndpoints.guestNotifications}/$endpointId/unread', body);
      }
    } catch (_) {
      // Keep optimistic update
    }
  }

  Future<void> toggleReadStatus(String id, {String? title, String? message}) async {
    int index = -1;
    if (id.isNotEmpty) {
      index = _notifications.indexWhere((n) => n.id == id);
    }
    if (index == -1 && title != null && message != null) {
      index = _notifications.indexWhere((n) => n.title.trim() == title.trim() && n.message.trim() == message.trim());
    }
    if (index != -1) {
      final notif = _notifications[index];
      if (notif.isRead) {
        await markAsUnread(notif.id, title: notif.title, message: notif.message);
      } else {
        await markAsRead(notif.id, title: notif.title, message: notif.message);
      }
    } else {
      await markAsRead(id, title: title, message: message);
    }
  }

  Future<void> markAllAsRead() async {
    if (_notifications.isEmpty) return;

    _notifications = _notifications.map((old) => NotificationModel(
      id: old.id,
      title: old.title,
      message: old.message,
      category: old.category,
      isRead: true,
      propertyId: old.propertyId,
      createdAt: old.createdAt,
    )).toList();
    notifyListeners();

    try {
      final response = await ApiService.post('${ApiEndpoints.guestNotifications}/read-all');
      if (!response.success) {
        await ApiService.patch('${ApiEndpoints.guestNotifications}/read-all');
      }
    } catch (_) {
      // Keep optimistic state
    }
  }

  void addRealtimeNotification(NotificationModel notification) {
    _notifications.insert(0, notification);
    notifyListeners();
  }
}
