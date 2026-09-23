import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import '../core/constants/api_endpoints.dart';
import 'storage_service.dart';

typedef SocketEventCallback = void Function(dynamic data);

class SocketService {
  static socket_io.Socket? _socket;
  static bool _isConnected = false;
  static final Map<String, List<SocketEventCallback>> _listeners = {};

  static bool get isConnected => _isConnected;

  // Singleton instance
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  void init([String? propertyId]) => connect(propertyId);
  void reconnect([String? propertyId]) {
    disconnect();
    connect(propertyId);
  }

  static Future<void> connect([String? propertyId]) async {
    if (_socket != null && _isConnected) return;

    try {
      final customSocketUrl = await StorageService.getSocketUrl();
      final socketUrl = (customSocketUrl != null &&
              customSocketUrl.trim().isNotEmpty &&
              !customSocketUrl.contains('192.168.1.14'))
          ? customSocketUrl.trim()
          : ApiEndpoints.getDefaultSocketUrl();

      debugPrint('🔌 Connecting Socket.IO at $socketUrl');

      _socket = socket_io.io(
        socketUrl,
        socket_io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(10)
            .setReconnectionDelay(2000)
            .build(),
      );

      _socket!.onConnect((_) {
        _isConnected = true;
        debugPrint('⚡ Socket.IO Connected: ${_socket?.id}');
        final prop = propertyId ?? 'HS-9HQ8P';
        _socket!.emit('join_property', prop);
        _socket!.emit('join_property', 'HS-9HQ8P');
        _socket!.emit('join_property', 'HS-9HQ8P');
        _socket!.emit('join_property', 'HS-MUM');
        _socket!.emit('join_property', 'HS-UDA');
        _socket!.emit('join_property', 'all');
      });

      _socket!.onDisconnect((_) {
        _isConnected = false;
        debugPrint('🔌 Socket.IO Disconnected');
      });

      _socket!.onConnectError((err) {
        _isConnected = false;
        debugPrint('❌ Socket.IO Connect Error: $err');
      });

      final defaultEvents = {
        'booking_created',
        'booking_updated',
        'booking_deleted',
        'reservation_created',
        'room_status_changed',
        'availability_changed',
        'checkin_completed',
        'checkout_completed',
        'payment_logged',
        'payment_added',
        'payment_updated',
        'approval_created',
        'approval_updated',
        'user_created',
        'user_updated',
        'user_deleted',
        'notification_created',
        'notification_received',
        'new_notification',
        'manager_notification',
        'unread_notifications_count_updated',
        'feedback_received',
        'feedback_created',
        'feedback_updated',
        'dashboard_sync',
      };

      final allEvents = {...defaultEvents, ..._listeners.keys};

      for (final evt in allEvents) {
        _socket!.off(evt);
        _socket!.on(evt, (data) {
          debugPrint('📡 Live Event: $evt -> $data');
          _notifyListeners(evt, data);
        });
      }
    } catch (e) {
      debugPrint('❌ Socket.IO Init error: $e');
    }
  }

  static void on(String event, SocketEventCallback callback) {
    final isNew = !_listeners.containsKey(event);
    if (isNew) {
      _listeners[event] = [];
    }
    _listeners[event]!.add(callback);

    if (isNew && _socket != null) {
      _socket!.off(event);
      _socket!.on(event, (data) {
        debugPrint('📡 Live Event: $event -> $data');
        _notifyListeners(event, data);
      });
    }
  }

  static void off(String event, [SocketEventCallback? callback]) {
    if (!_listeners.containsKey(event)) return;
    if (callback != null) {
      _listeners[event]!.remove(callback);
    } else {
      _listeners.remove(event);
    }
  }

  static void emit(String event, [dynamic data]) {
    if (_socket != null && _isConnected) {
      _socket!.emit(event, data);
    }
  }

  static void _notifyListeners(String event, dynamic data) {
    if (_listeners.containsKey(event)) {
      for (final cb in List<SocketEventCallback>.from(_listeners[event]!)) {
        try {
          cb(data);
        } catch (e) {
          debugPrint('Error in socket callback for $event: $e');
        }
      }
    }
  }

  static void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _listeners.clear();
  }
}
