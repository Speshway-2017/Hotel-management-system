import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../models/notification_model.dart';
import '../../services/api_service.dart';

class GuestNotificationProvider with ChangeNotifier {
  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  String? _error;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  Future<void> fetchNotifications() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.get(ApiEndpoints.guestNotifications);
      if (response.success && response.data != null) {
        if (response.data is List) {
          final List list = response.data as List;
          _notifications = list.map((e) => NotificationModel.fromJson(e as Map<String, dynamic>)).toList();
        } else if (response.data is Map<String, dynamic>) {
          final list = (response.data['notifications'] ?? response.data['data']) as List<dynamic>? ?? [];
          _notifications = list.map((e) => NotificationModel.fromJson(e as Map<String, dynamic>)).toList();
        }
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await ApiService.put('${ApiEndpoints.guestNotifications}/$id/read');
      final index = _notifications.indexWhere((n) => n.id == id);
      if (index != -1) {
        _notifications[index] = NotificationModel(
          id: _notifications[index].id,
          title: _notifications[index].title,
          message: _notifications[index].message,
          type: _notifications[index].type,
          isRead: true,
          createdAt: _notifications[index].createdAt,
        );
        notifyListeners();
      }
    } catch (e) {
      // silently handle
    }
  }

  void addRealtimeNotification(NotificationModel notification) {
    _notifications.insert(0, notification);
    notifyListeners();
  }
}
