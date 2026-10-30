import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/api_endpoints.dart';
import '../../models/notification_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../services/notification_service.dart';
import '../../services/storage_service.dart';
import 'guest_booking_provider.dart';

class GuestNotificationProvider with ChangeNotifier {
  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  String? _error;
  String _selectedCategory = 'All';
  StreamSubscription? _fcmForegroundSub;
  StreamSubscription? _fcmTapSub;
  Timer? _debounceTimer;
  final Set<String> _shownLocalNotificationKeys = {};

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

  int getCountForCategory(String category) {
    if (category == 'All') {
      return _notifications.length;
    } else if (category == 'Unread') {
      return unreadCount;
    } else if (category == 'Read') {
      return _notifications.length - unreadCount;
    } else {
      final target = category.trim().toLowerCase();
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
      }).length;
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
    SocketService.on('notification_created', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('new_notification', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('guest_notification', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('unread_notifications_count_updated', (_) => _debouncedFetchNotifications());
    SocketService.on('dashboard_sync', (_) => _debouncedFetchNotifications());
    SocketService.on('booking_created', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('booking_updated', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('room_status_changed', (_) => _debouncedFetchNotifications());
    SocketService.on('room_assigned', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('stay_extended', (data) {
      _debouncedFetchNotifications();
      _handleSocketStayExtended(data);
    });
    SocketService.on('checkin_completed', (data) {
      _debouncedFetchNotifications();
      _handleSocketCheckinCompleted(data);
    });
    SocketService.on('checkout_completed', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('payment_logged', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('payment_added', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('payment_updated', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('refund_requested', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('refund_status_updated', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('charge_added', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('feedback_updated', (data) {
      _debouncedFetchNotifications();
      _handleSocketIncomingAlert(data);
    });
    SocketService.on('feedback_received', (_) => _debouncedFetchNotifications());
  }

  Future<void> _handleSocketStayExtended(dynamic data) async {
    try {
      if (data is! Map) return;
      final b = data['booking'];
      final bMap = b is Map ? b : <dynamic, dynamic>{};
      final bId = (data['bookingId'] ?? bMap['bookingId'] ?? bMap['_id'] ?? '').toString();
      final checkOut = (data['checkOut'] ?? bMap['checkOut'] ?? '').toString();
      final guestEmail = (data['email'] ?? bMap['email'] ?? bMap['guestEmail'] ?? '').toString().toLowerCase().trim();

      final currentUser = await StorageService.getUser();
      bool isMatch = true;
      if (currentUser != null && guestEmail.isNotEmpty) {
        isMatch = currentUser.email.toLowerCase().trim() == guestEmail;
      }

      if (isMatch) {
        const title = 'Stay Extended';
        final body = checkOut.isNotEmpty
            ? 'Your stay reservation #${bId.isNotEmpty ? bId : ""} has been extended to $checkOut. Enjoy your continued stay!'
            : 'Your stay reservation #${bId.isNotEmpty ? bId : ""} has been extended. Enjoy your continued stay!';
        final dedupKey = 'extend_${bId}_${DateTime.now().minute}';

        if (!_shownLocalNotificationKeys.contains(dedupKey)) {
          _shownLocalNotificationKeys.add(dedupKey);
          await NotificationService.showLocalNotification(
            title: title,
            body: body,
            payload: {
              'bookingId': bId,
              'action': 'extended',
              'category': 'Stay',
              'role': 'guest'
            },
          );
        }
      }
    } catch (e) {
      debugPrint('⚠️ Error in _handleSocketStayExtended: $e');
    }
  }

  Future<void> _handleSocketCheckinCompleted(dynamic data) async {
    try {
      if (data is! Map) return;
      final action = (data['action'] ?? '').toString();
      final status = (data['status'] ?? '').toString();
      final b = data['booking'];
      final bMap = b is Map ? b : <dynamic, dynamic>{};

      final bId = (data['bookingId'] ?? bMap['bookingId'] ?? bMap['_id'] ?? '').toString();
      final guestEmail = (data['email'] ?? bMap['email'] ?? bMap['guestEmail'] ?? '').toString().toLowerCase().trim();
      final guestPhone = (data['phone'] ?? bMap['phone'] ?? bMap['guestPhone'] ?? '').toString().trim();
      final guestName = (data['guest'] ?? bMap['guest'] ?? bMap['guestName'] ?? '').toString().trim();
      final room = (data['roomNumber'] ?? bMap['roomNumber'] ?? bMap['room'] ?? '').toString();

      final currentUser = await StorageService.getUser();
      bool isMatch = false;
      if (currentUser != null) {
        if (guestEmail.isNotEmpty && currentUser.email.toLowerCase().trim() == guestEmail) isMatch = true;
        if (guestPhone.isNotEmpty && currentUser.mobile.contains(guestPhone)) isMatch = true;
        if (guestName.isNotEmpty && currentUser.name.toLowerCase().contains(guestName.toLowerCase())) isMatch = true;
      } else {
        isMatch = true;
      }

      if (isMatch && (action == 'checkin' || status == 'Checked-in' || action.isEmpty)) {
        final title = 'Check-in Confirmed!';
        final roomText = room.isNotEmpty ? 'Room $room' : 'your room';
        final body = 'Welcome! You have checked in to $roomText. Enjoy your stay!${bId.isNotEmpty ? " [Ref: #$bId]" : ""}';
        final dedupKey = 'checkin_${bId}_${DateTime.now().minute}';

        if (!_shownLocalNotificationKeys.contains(dedupKey)) {
          _shownLocalNotificationKeys.add(dedupKey);
          await NotificationService.showLocalNotification(
            title: title,
            body: body,
            payload: {
              'bookingId': bId,
              'action': 'checkin',
              'category': 'Check-in',
              'role': 'guest'
            },
          );
        }
      }
    } catch (e) {
      debugPrint('⚠️ Error in _handleSocketCheckinCompleted: $e');
    }
  }

  Future<void> _handleSocketIncomingAlert(dynamic data) async {
    try {
      if (data is! Map) return;
      final notif = data['notification'] is Map ? data['notification'] : data;
      String title = (notif['title'] ?? data['title'] ?? '').toString().trim();
      String body = (notif['message'] ?? data['message'] ?? notif['body'] ?? data['body'] ?? '').toString().trim();
      final category = (notif['category'] ?? data['category'] ?? 'General').toString();
      final email = (notif['email'] ?? data['email'] ?? notif['guestEmail'] ?? data['guestEmail'] ?? '').toString().toLowerCase().trim();
      final phone = (notif['phone'] ?? data['phone'] ?? notif['guestPhone'] ?? data['guestPhone'] ?? '').toString().trim();
      final targetUserId = (notif['userId'] ?? data['userId'] ?? '').toString().trim();
      final targetRole = (notif['role'] ?? data['role'] ?? '').toString().toLowerCase().trim();
      final bId = (notif['bookingId'] ?? data['bookingId'] ?? '').toString();
      final action = (notif['action'] ?? data['action'] ?? '').toString();

      // Ensure friendly title/body if inferred from action
      if (title.isEmpty) {
        if (action == 'checkin_reminder') {
          final mins = notif['minutesRemaining'] ?? data['minutesRemaining'] ?? 15;
          title = 'Check-in in $mins Minutes';
          body = body.isNotEmpty ? body : 'Your check-in time is approaching in $mins minutes.';
        } else if (action == 'checkin_arrived') {
          title = 'Check-in Time Arrived';
          body = body.isNotEmpty ? body : 'Your scheduled check-in time has arrived! Welcome to Hour Stay.';
        } else if (action == 'room_assigned') {
          title = 'Room Assigned';
          body = body.isNotEmpty ? body : 'A room has been assigned for your reservation #${bId.isNotEmpty ? bId : ""}.';
        } else if (action == 'charge_added') {
          title = 'Folio Charge Added';
          body = body.isNotEmpty ? body : 'A new service charge was posted to your folio #${bId.isNotEmpty ? bId : ""}.';
        } else if (action == 'payment') {
          title = 'Payment Received';
          body = body.isNotEmpty ? body : 'Payment was recorded for your stay.';
        }
      }

      if (title.isEmpty && body.isEmpty) return;

      // Disallow administrative account deletion alerts
      final lowerTitle = title.toLowerCase();
      final lowerBody = body.toLowerCase();
      if (lowerTitle.contains('account deleted') ||
          lowerTitle.contains('deleted account') ||
          lowerBody.contains('permanently deleted their account')) {
        return;
      }

      final currentUser = await StorageService.getUser();
      bool isMatch = false;
      if (currentUser != null) {
        if (targetUserId.isNotEmpty && targetUserId != 'all' && targetUserId != 'null' && targetUserId != 'undefined') {
          if (currentUser.id == targetUserId || currentUser.email.toLowerCase().trim() == targetUserId.toLowerCase()) {
            isMatch = true;
          }
        }
        if (email.isNotEmpty && currentUser.email.toLowerCase().trim() == email) {
          isMatch = true;
        }
        if (phone.isNotEmpty) {
          final cleanP = phone.replaceAll(RegExp(r'[^0-9]'), '');
          final cleanUserP = currentUser.mobile.replaceAll(RegExp(r'[^0-9]'), '');
          if (cleanUserP.contains(cleanP) || cleanP.contains(cleanUserP)) {
            isMatch = true;
          }
        }
        if (targetUserId.isEmpty || targetUserId == 'all' || targetUserId == 'null' || targetUserId == 'undefined') {
          if (targetRole == 'guest' || targetRole == 'all' || targetRole.isEmpty) {
            isMatch = true;
          }
        }
      } else {
        isMatch = true;
      }

      if (!isMatch) return;

      final isCheckinArrivedAlert = lowerTitle.contains('check-in time arrived') ||
          lowerTitle.contains('ready for check-in') ||
          lowerBody.contains('reception desk to complete check-in') ||
          lowerBody.contains('front desk is preparing your room key');

      if (isCheckinArrivedAlert) {
        final bProv = rootNavigatorKey.currentContext?.read<GuestBookingProvider>();
        final hasActiveStay = bProv != null && (bProv.currentStay != null || bProv.bookings.any((b) {
          final s = b.status.toLowerCase().trim();
          return s == 'checked-in' || s == 'checked_in' || s == 'staying' || s == 'in-house';
        }));
        if (hasActiveStay) {
          debugPrint('ℹ️ [GuestNotif] Skipping check-in arrival alert: guest is already in-house/checked-in.');
          return;
        }
      }

      final dedupKey = '${title.toLowerCase()}:::${body.toLowerCase()}';
      if (!_shownLocalNotificationKeys.contains(dedupKey)) {
        _shownLocalNotificationKeys.add(dedupKey);
        await NotificationService.showLocalNotification(
          title: title,
          body: body,
          payload: {
            'bookingId': bId,
            'category': category,
            'role': 'guest',
            'action': action
          },
        );
      }

      // Optimistically insert into _notifications list so the guest app displays it immediately
      final notifId = (notif['_id'] ?? notif['id'] ?? data['notificationId'] ?? DateTime.now().millisecondsSinceEpoch.toString()).toString();
      final existsKey = '${title.toLowerCase()}__${body.toLowerCase()}';
      final exists = _notifications.any((n) =>
          (n.id.isNotEmpty && n.id == notifId) ||
          ('${n.title.trim().toLowerCase()}__${n.message.trim().toLowerCase()}' == existsKey));
      if (!exists) {
        _notifications.insert(
          0,
          NotificationModel(
            id: notifId,
            title: title,
            message: body,
            category: (category.isNotEmpty && category != 'General') ? category : 'Check-in',
            isRead: false,
            propertyId: (notif['propertyId'] ?? data['propertyId'] ?? 'HS-9HQ8P').toString(),
            createdAt: DateTime.now().toIso8601String(),
          ),
        );
        notifyListeners();
      }
    } catch (e) {
      debugPrint('⚠️ Error in _handleSocketIncomingAlert: $e');
    }
  }

  void _registerFcmListeners() {
    _fcmForegroundSub = NotificationService.onForegroundMessage.listen((msg) {
      final title = (msg.notification?.title ?? msg.data['title']?.toString() ?? '').trim();
      final body = (msg.notification?.body ?? msg.data['message']?.toString() ?? msg.data['body']?.toString() ?? '').trim();
      final cat = (msg.data['category']?.toString() ?? 'Check-in').trim();
      final notifId = (msg.data['notificationId']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString()).trim();
      if (title.isNotEmpty || body.isNotEmpty) {
        final key = '${title.toLowerCase()}__${body.toLowerCase()}';
        final exists = _notifications.any((n) =>
            (n.id.isNotEmpty && n.id == notifId) ||
            ('${n.title.trim().toLowerCase()}__${n.message.trim().toLowerCase()}' == key));
        if (!exists) {
          _notifications.insert(
            0,
            NotificationModel(
              id: notifId,
              title: title,
              message: body,
              category: cat.isNotEmpty ? cat : 'Check-in',
              isRead: false,
              propertyId: msg.data['propertyId']?.toString() ?? 'HS-9HQ8P',
              createdAt: DateTime.now().toIso8601String(),
            ),
          );
          notifyListeners();
        }
      }
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

        // Record all fetched notification keys to ensure seen state
        for (final n in unique) {
          _shownLocalNotificationKeys.add(n.id);
          _shownLocalNotificationKeys.add('${n.title.trim().toLowerCase()}:::${n.message.trim().toLowerCase()}');
        }
      } else {
        if (!silent && response.statusCode != 401) {
          _error = 'Unable to connect to server. Please check your connection.';
        }
      }
    } catch (e) {
      if (!silent) _error = 'Unable to connect to server. Please check your connection.';
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
