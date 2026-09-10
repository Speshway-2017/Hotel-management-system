import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../core/constants/api_endpoints.dart';
import '../firebase_options.dart';
import '../screens/manager/notifications/manager_notifications_screen.dart';
import 'api_service.dart';
import 'storage_service.dart';

/// Global navigator key for notification tap deep linking across the app.
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

/// Top-level background message handler required by Firebase Cloud Messaging.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    debugPrint('📬 [FCM BACKGROUND] Message received: ${message.messageId}');
    debugPrint('📬 [FCM BACKGROUND] Title: ${message.notification?.title}');
    debugPrint('📬 [FCM BACKGROUND] Body: ${message.notification?.body}');
    debugPrint('📬 [FCM BACKGROUND] Data: ${message.data}');
  } catch (e) {
    debugPrint('⚠️ [FCM BACKGROUND] Error handling background message: $e');
  }
}

class NotificationService {
  static bool _isInitialized = false;
  static String? _cachedToken;

  static final StreamController<RemoteMessage> _foregroundMessageController =
      StreamController<RemoteMessage>.broadcast();
  static final StreamController<RemoteMessage> _notificationTapController =
      StreamController<RemoteMessage>.broadcast();

  /// Stream of foreground push notifications.
  static Stream<RemoteMessage> get onForegroundMessage => _foregroundMessageController.stream;

  /// Stream of notifications tapped by the user (from system tray or banner).
  static Stream<RemoteMessage> get onNotificationTap => _notificationTapController.stream;

  /// Returns the latest cached FCM token, if available.
  static String? get cachedToken => _cachedToken;

  /// Initialize Firebase and configure Firebase Cloud Messaging listeners.
  static Future<void> initialize() async {
    if (_isInitialized) {
      debugPrint('ℹ️ [FCM] NotificationService already initialized.');
      return;
    }

    try {
      debugPrint('🚀 [FCM] Initializing Firebase & NotificationService...');

      // 1. Initialize Firebase Core
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );

      final messaging = FirebaseMessaging.instance;

      // 2. Request Notification Permissions (Including Android 13+ & iOS)
      final settings = await messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      debugPrint('🔔 [FCM] Permission status: ${settings.authorizationStatus}');

      // 3. Set presentation options for foreground notifications
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // 4. Register Background Message Handler
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // 5. Handle Foreground Messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('📩 [FCM FOREGROUND] Push notification received:');
        debugPrint('   Message ID: ${message.messageId}');
        debugPrint('   Title: ${message.notification?.title}');
        debugPrint('   Body: ${message.notification?.body}');
        debugPrint('   Data: ${message.data}');
        _foregroundMessageController.add(message);
      });

      // 6. Handle notification click when app is in background
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('🚀 [FCM RESUMED] User tapped notification from background:');
        debugPrint('   Title: ${message.notification?.title}');
        debugPrint('   Data: ${message.data}');
        _notificationTapController.add(message);
        _handleNotificationTapRouting(message);
      });

      // 7. Handle notification click when app was launched from terminated state
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        debugPrint('🎯 [FCM TERMINATED] App launched from terminated state via notification:');
        debugPrint('   Title: ${initialMessage.notification?.title}');
        debugPrint('   Data: ${initialMessage.data}');
        Future.delayed(const Duration(milliseconds: 1000), () {
          _notificationTapController.add(initialMessage);
          _handleNotificationTapRouting(initialMessage);
        });
      }

      // 8. Handle Token Refresh
      messaging.onTokenRefresh.listen((newToken) async {
        debugPrint('🔄 [FCM REFRESH] FCM Token refreshed: $newToken');
        _cachedToken = newToken;
        await syncTokenWithBackend(newToken);
      });

      // 9. Fetch current device token
      try {
        _cachedToken = await messaging.getToken();
        if (_cachedToken != null) {
          debugPrint('✅ [FCM TOKEN] Device Token retrieved successfully:');
          debugPrint('   $_cachedToken');
        } else {
          debugPrint('⚠️ [FCM TOKEN] getToken returned null (may occur on non-supported platforms).');
        }
      } catch (tokenErr) {
        debugPrint('⚠️ [FCM TOKEN] Failed to retrieve device token: $tokenErr');
      }

      _isInitialized = true;
      debugPrint('✅ [FCM] NotificationService initialized successfully.');
    } catch (e, stack) {
      debugPrint('❌ [FCM INIT ERROR] Failed to initialize NotificationService: $e');
      debugPrint(stack.toString());
    }
  }

  static void _handleNotificationTapRouting(RemoteMessage message) {
    try {
      debugPrint('🎯 [FCM ROUTE] Routing notification tap with data: ${message.data}');
      final navState = rootNavigatorKey.currentState;
      if (navState != null) {
        navState.push(
          MaterialPageRoute(builder: (_) => const ManagerNotificationsScreen()),
        );
      }
    } catch (err) {
      debugPrint('⚠️ [FCM ROUTE ERROR] $err');
    }
  }

  /// Sends the current FCM device token to the backend for the logged-in user.
  static Future<bool> syncTokenWithBackend([String? explicitToken]) async {
    try {
      final authToken = await StorageService.getToken();
      if (authToken == null || authToken.isEmpty) {
        debugPrint('ℹ️ [FCM SYNC] User not authenticated. Token will sync upon login.');
        return false;
      }

      String? token = explicitToken ?? _cachedToken;
      if (token == null || token.isEmpty) {
        try {
          token = await FirebaseMessaging.instance.getToken();
          _cachedToken = token;
        } catch (_) {}
      }

      if (token == null || token.isEmpty) {
        debugPrint('⚠️ [FCM SYNC] No FCM token available to send to backend.');
        return false;
      }

      debugPrint('📤 [FCM SYNC] Sending FCM token to backend...');
      final response = await ApiService.post(ApiEndpoints.fcmToken, {
        'token': token,
        'platform': defaultTargetPlatform.name,
      });

      if (response.success) {
        debugPrint('✅ [FCM SYNC SUCCESS] FCM token registered with backend for authenticated user.');
        return true;
      } else {
        debugPrint('❌ [FCM SYNC ERROR] Backend rejected FCM token: ${response.message}');
        return false;
      }
    } catch (e) {
      debugPrint('❌ [FCM SYNC EXCEPTION] Error syncing FCM token with backend: $e');
      return false;
    }
  }

  /// Removes the device token from the backend upon user logout.
  static Future<void> removeTokenFromBackend() async {
    try {
      final authToken = await StorageService.getToken();
      if (authToken == null || authToken.isEmpty) return;

      final token = _cachedToken;
      debugPrint('🗑️ [FCM] Removing device token from backend on logout...');
      await ApiService.delete(
        ApiEndpoints.fcmToken,
        token != null ? {'token': token} : null,
      );
      debugPrint('✅ [FCM] Device token removed from backend.');
    } catch (e) {
      debugPrint('⚠️ [FCM] Failed to unregister token from backend: $e');
    }
  }
}
