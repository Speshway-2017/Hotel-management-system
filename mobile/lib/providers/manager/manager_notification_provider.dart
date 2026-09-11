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
  Timer? _debounceTimer;

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
      final target = _selectedCategory.trim().toLowerCase();
      return _notifications.where((n) {
        final cat = n.category.trim().toLowerCase();
        final type = n.type.trim().toLowerCase();
        if (target == 'reservations' && (cat.contains('reserv') || cat.contains('book') || type.contains('reserv') || type.contains('book'))) {
          return true;
        }
        if (target == 'approvals' && (cat.contains('approval') || type.contains('approval'))) {
          return true;
        }
        if (target == 'payments' && (cat.contains('pay') || cat.contains('bill') || type.contains('pay'))) {
          return true;
        }
        if (target == 'guest experience' && (cat.contains('guest') || cat.contains('feedback') || cat.contains('review'))) {
          return true;
        }
        if (target == 'operations' && (cat.contains('operat') || cat.contains('room') || cat.contains('shift') || cat.contains('staff'))) {
          return true;
        }
        return cat == target || type == target;
      }).toList();
    }
  }

  ManagerNotificationProvider() {
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
    SocketService.on('manager_notification', (_) => _debouncedFetchNotifications());
    SocketService.on('unread_notifications_count_updated', (_) => _debouncedFetchNotifications());
    SocketService.on('dashboard_sync', (_) => _debouncedFetchNotifications());
    SocketService.on('feedback_received', (_) => _debouncedFetchNotifications());
    SocketService.on('feedback_created', (_) => _debouncedFetchNotifications());
    SocketService.on('approval_created', (_) => _debouncedFetchNotifications());
    SocketService.on('booking_created', (_) => _debouncedFetchNotifications());
    SocketService.on('booking_updated', (_) => _debouncedFetchNotifications());
    SocketService.on('reservation_created', (_) => _debouncedFetchNotifications());
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
        final fetched = list.map((e) => NotificationModel.fromJson(e as Map<String, dynamic>)).toList();
        
        // Clean deduplication by ID or composite key
        final seenIds = <String>{};
        final seenKeys = <String>{};
        final unique = <NotificationModel>[];
        for (final n in fetched) {
          final compositeKey = '${n.title.trim().toLowerCase()}__${n.message.trim().toLowerCase()}';
          if (n.id.isNotEmpty) {
            if (!seenIds.contains(n.id)) {
              seenIds.add(n.id);
              seenKeys.add(compositeKey);
              unique.add(n);
            }
          } else if (!seenKeys.contains(compositeKey)) {
            seenKeys.add(compositeKey);
            unique.add(n);
          }
        }
        _notifications = unique;
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
