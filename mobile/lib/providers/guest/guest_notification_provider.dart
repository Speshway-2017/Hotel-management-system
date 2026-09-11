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
  StreamSubscription? _fcmForegroundSub;
  StreamSubscription? _fcmTapSub;
  Timer? _debounceTimer;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  GuestNotificationProvider() {
    _registerSocketListeners();
    _registerFcmListeners();
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

  Future<void> markAsRead(String id) async {
    final index = _notifications.indexWhere((n) => n.id == id);
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

    try {
      final response = await ApiService.post('${ApiEndpoints.guestNotifications}/$id/read');
      if (!response.success) {
        // Fallback to patch if post isn't supported
        await ApiService.patch('${ApiEndpoints.guestNotifications}/$id/read');
      }
    } catch (_) {
      fetchNotifications(silent: true);
    }
  }

  Future<void> markAsUnread(String id) async {
    final index = _notifications.indexWhere((n) => n.id == id);
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

    try {
      final response = await ApiService.post('${ApiEndpoints.guestNotifications}/$id/unread');
      if (!response.success) {
        await ApiService.patch('${ApiEndpoints.guestNotifications}/$id/unread');
      }
    } catch (_) {
      fetchNotifications(silent: true);
    }
  }

  Future<void> toggleReadStatus(String id) async {
    final notif = _notifications.firstWhere(
      (n) => n.id == id,
      orElse: () => NotificationModel(id: '', title: '', message: ''),
    );
    if (notif.id.isEmpty) return;
    if (notif.isRead) {
      await markAsUnread(id);
    } else {
      await markAsRead(id);
    }
  }

  Future<void> markAllAsRead() async {
    if (_notifications.isEmpty) return;

    // Optimistic update
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
      fetchNotifications(silent: true);
    }
  }

  void addRealtimeNotification(NotificationModel notification) {
    _notifications.insert(0, notification);
    notifyListeners();
  }
}
