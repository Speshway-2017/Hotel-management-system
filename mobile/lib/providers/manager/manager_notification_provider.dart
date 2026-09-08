import 'package:flutter/material.dart';
import '../../models/notification_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../core/constants/api_endpoints.dart';

class ManagerNotificationProvider with ChangeNotifier {
  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  ManagerNotificationProvider() {
    _registerSocketListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('notification_received', (_) => fetchNotifications(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchNotifications(silent: true));
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
    final response = await ApiService.post('${ApiEndpoints.managerNotifications}/$id/read');
    if (response.success) {
      final idx = _notifications.indexWhere((n) => n.id == id);
      if (idx != -1) {
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
    }
  }
}
