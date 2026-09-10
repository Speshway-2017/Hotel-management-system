import 'dart:async';
import 'package:flutter/material.dart';
import '../../models/notification_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../services/notification_service.dart';
import '../../core/constants/api_endpoints.dart';

class ManagerNotificationProvider with ChangeNotifier {
  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _selectedCategory = 'All';
  StreamSubscription? _fcmForegroundSub;
  StreamSubscription? _fcmTapSub;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
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
      return _notifications.where((n) => n.category.toLowerCase() == _selectedCategory.toLowerCase()).toList();
    }
  }

  ManagerNotificationProvider() {
    _registerSocketListeners();
    _registerFcmListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('notification_received', (_) => fetchNotifications(silent: true));
    SocketService.on('notification_created', (_) => fetchNotifications(silent: true));
    SocketService.on('new_notification', (_) => fetchNotifications(silent: true));
    SocketService.on('manager_notification', (_) => fetchNotifications(silent: true));
    SocketService.on('unread_notifications_count_updated', (_) => fetchNotifications(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchNotifications(silent: true));
    SocketService.on('feedback_received', (_) => fetchNotifications(silent: true));
    SocketService.on('feedback_created', (_) => fetchNotifications(silent: true));
    SocketService.on('approval_created', (_) => fetchNotifications(silent: true));
    SocketService.on('booking_created', (_) => fetchNotifications(silent: true));
    SocketService.on('booking_updated', (_) => fetchNotifications(silent: true));
    SocketService.on('reservation_created', (_) => fetchNotifications(silent: true));
  }

  void _registerFcmListeners() {
    _fcmForegroundSub = NotificationService.onForegroundMessage.listen((_) {
      fetchNotifications(silent: true);
    });
    _fcmTapSub = NotificationService.onNotificationTap.listen((_) {
      fetchNotifications(silent: true);
    });
  }

  @override
  void dispose() {
    _fcmForegroundSub?.cancel();
    _fcmTapSub?.cancel();
    super.dispose();
  }

  void setCategory(String category) {
    if (_selectedCategory != category) {
      _selectedCategory = category;
      notifyListeners();
    }
  }

  Future<void> fetchNotifications({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final response = await ApiService.get(ApiEndpoints.managerNotifications);
      if (response.success && response.data != null) {
        final list = response.data as List<dynamic>;
        _notifications = list.map((e) => NotificationModel.fromJson(e as Map<String, dynamic>)).toList();
      } else {
        if (!silent) _errorMessage = response.message;
      }
    } catch (e) {
      if (!silent) _errorMessage = e.toString();
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
    final idx = _notifications.indexWhere((n) => n.id == id);
    if (idx != -1 && !_notifications[idx].isRead) {
      final old = _notifications[idx];
      _notifications[idx] = NotificationModel(
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
      final response = await ApiService.post('${ApiEndpoints.managerNotifications}/$id/read');
      if (!response.success) {
        fetchNotifications(silent: true);
      }
    } catch (_) {
      fetchNotifications(silent: true);
    }
  }

  Future<void> markAsUnread(String id) async {
    final idx = _notifications.indexWhere((n) => n.id == id);
    if (idx != -1 && _notifications[idx].isRead) {
      final old = _notifications[idx];
      _notifications[idx] = NotificationModel(
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
      final response = await ApiService.post('${ApiEndpoints.managerNotifications}/$id/unread');
      if (!response.success) {
        fetchNotifications(silent: true);
      }
    } catch (_) {
      fetchNotifications(silent: true);
    }
  }

  Future<void> toggleReadStatus(String id) async {
    final notif = _notifications.firstWhere((n) => n.id == id, orElse: () => NotificationModel(id: '', title: '', message: ''));
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
      await ApiService.post('${ApiEndpoints.managerNotifications}/read-all');
    } catch (_) {
      fetchNotifications(silent: true);
    }
  }
}
