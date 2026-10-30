import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../core/constants/api_endpoints.dart';
import '../firebase_options.dart';
import '../screens/guest/notifications/guest_notifications_screen.dart';
import '../screens/manager/notifications/manager_notifications_screen.dart';
import 'api_service.dart';
import 'storage_service.dart';

/// Global navigator key for notification tap deep linking across the app.
final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

/// High importance Android notification channel for system tray alerts.
const AndroidNotificationChannel _highImportanceChannel = AndroidNotificationChannel(
  'hourstay_high_importance_channel',
  'Hour Stay Notifications',
  description: 'This channel is used for HMS guest and manager notifications & alerts.',
  importance: Importance.max,
  playSound: true,
  enableVibration: true,
);

final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

/// Top-level background message handler required by Firebase Cloud Messaging.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    debugPrint('📬 [FCM BACKGROUND] Message received: ${message.messageId}');
    debugPrint('📬 [FCM BACKGROUND] Title: ${message.notification?.title ?? message.data['title']}');
    debugPrint('📬 [FCM BACKGROUND] Body: ${message.notification?.body ?? message.data['body']}');
    debugPrint('📬 [FCM BACKGROUND] Data: ${message.data}');

    // If message is data-only (no top-level notification payload), show local notification in system tray
    if (message.notification == null) {
      final title = (message.data['title'] ?? '').toString().trim();
      final body = (message.data['body'] ?? message.data['message'] ?? '').toString().trim();
      if (title.isNotEmpty || body.isNotEmpty) {
        final flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
        const androidChannel = AndroidNotificationChannel(
          'hourstay_high_importance_channel',
          'Hour Stay Notifications',
          description: 'This channel is used for HMS guest and manager notifications & alerts.',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
        );
        await flutterLocalNotificationsPlugin
            .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
            ?.createNotificationChannel(androidChannel);

        await flutterLocalNotificationsPlugin.show(
          message.hashCode,
          title.isNotEmpty ? title : 'Hour Stay',
          body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              androidChannel.id,
              androidChannel.name,
              channelDescription: androidChannel.description,
              importance: Importance.max,
              priority: Priority.max,
              icon: '@mipmap/ic_launcher',
              playSound: true,
              enableVibration: true,
              visibility: NotificationVisibility.public,
              category: AndroidNotificationCategory.reminder,
            ),
            iOS: const DarwinNotificationDetails(
              presentAlert: true,
              presentBadge: true,
              presentSound: true,
            ),
          ),
          payload: jsonEncode(message.data),
        );
      }
    }
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

  /// Initialize Firebase, local notifications, and configure Firebase Cloud Messaging listeners.
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

      // 3. Initialize Flutter Local Notifications for Android foreground banners
      const initializationSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
      const initializationSettingsDarwin = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );
      const initializationSettings = InitializationSettings(
        android: initializationSettingsAndroid,
        iOS: initializationSettingsDarwin,
      );

      await _localNotifications.initialize(
        initializationSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          debugPrint('🎯 [LOCAL NOTIF TAP] User tapped local notification: ${response.payload}');
          if (response.payload != null && response.payload!.isNotEmpty) {
            try {
              final Map<String, dynamic> data = jsonDecode(response.payload!);
              _routeNotificationData(data);
            } catch (_) {
              _routeNotificationData({});
            }
          } else {
            _routeNotificationData({});
          }
        },
      );

      // 4. Create Android Notification Channel
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_highImportanceChannel);

      // Request Android 13+ notification permissions via local notifications plugin as well
      await _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();

      // 5. Set presentation options for foreground notifications
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // 6. Register Background Message Handler
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // 7. Handle Foreground Messages: Show Heads-up Local Notification & notify streams
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('📩 [FCM FOREGROUND] Push notification received:');
        debugPrint('   Message ID: ${message.messageId}');
        debugPrint('   Title: ${message.notification?.title ?? message.data['title']}');
        debugPrint('   Body: ${message.notification?.body ?? message.data['body']}');
        debugPrint('   Data: ${message.data}');

        _foregroundMessageController.add(message);

        // Display local heads-up notification in system tray
        final title = message.notification?.title ?? message.data['title'] ?? 'Hour Stay';
        final body = message.notification?.body ?? message.data['body'] ?? '';

        if (title.isNotEmpty || body.isNotEmpty) {
          showLocalNotification(
            title: title,
            body: body,
            payload: message.data,
            id: message.hashCode,
          );
        }
      });

      // 8. Handle notification click when app is in background
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('🚀 [FCM RESUMED] User tapped notification from background:');
        debugPrint('   Title: ${message.notification?.title ?? message.data['title']}');
        debugPrint('   Data: ${message.data}');
        _notificationTapController.add(message);
        _handleNotificationTapRouting(message);
      });

      // 9. Handle notification click when app was launched from terminated state
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        debugPrint('🎯 [FCM TERMINATED] App launched from terminated state via notification:');
        debugPrint('   Title: ${initialMessage.notification?.title ?? initialMessage.data['title']}');
        debugPrint('   Data: ${initialMessage.data}');
        Future.delayed(const Duration(milliseconds: 1200), () {
          _notificationTapController.add(initialMessage);
          _handleNotificationTapRouting(initialMessage);
        });
      }

      // 10. Handle Token Refresh
      messaging.onTokenRefresh.listen((newToken) async {
        debugPrint('🔄 [FCM REFRESH] FCM Token refreshed: $newToken');
        _cachedToken = newToken;
        await syncTokenWithBackend(newToken);
      });

      // 11. Fetch current device token & subscribe to broadcast topics
      try {
        _cachedToken = await messaging.getToken();
        if (_cachedToken != null) {
          debugPrint('================================================================');
          debugPrint('📱 [FCM DEVICE TOKEN GENERATED SUCCESSFULLY]:');
          debugPrint('   $_cachedToken');
          debugPrint('================================================================');

          // Subscribe to general broadcast topics
          try {
            await messaging.subscribeToTopic('hourstay_global');
            await messaging.subscribeToTopic('hourstay_all');
            await messaging.subscribeToTopic('hourstay_guest');
            await messaging.subscribeToTopic('hourstay_manager');
          } catch (_) {}

          // Automatically sync with backend if user is already authenticated
          unawaited(syncTokenWithBackend(_cachedToken));
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
    _routeNotificationData(message.data);
  }

  static Future<void> _routeNotificationData(Map<String, dynamic> data) async {
    try {
      debugPrint('🎯 [FCM ROUTE] Routing notification with data: $data');
      final navState = rootNavigatorKey.currentState;
      if (navState == null) return;

      final user = await StorageService.getUser();
      final userRole = (user?.role ?? data['role']?.toString() ?? 'guest').toLowerCase();

      if (userRole == 'manager') {
        navState.push(
          MaterialPageRoute(builder: (_) => const ManagerNotificationsScreen()),
        );
      } else {
        navState.push(
          MaterialPageRoute(builder: (_) => const GuestNotificationsScreen()),
        );
      }
    } catch (err) {
      debugPrint('⚠️ [FCM ROUTE ERROR] $err');
    }
  }

  static final Map<String, int> _recentNotificationTimestamps = {};

  /// Displays a local heads-up system notification in the device tray
  static Future<void> showLocalNotification({
    required String title,
    required String body,
    Map<String, dynamic>? payload,
    int? id,
  }) async {
    try {
      final cleanTitle = title.trim();
      final cleanBody = body.trim();
      if (cleanTitle.isEmpty && cleanBody.isEmpty) return;

      final dedupKey = '${cleanTitle.toLowerCase()}:::${cleanBody.toLowerCase()}';
      final now = DateTime.now().millisecondsSinceEpoch;
      if (_recentNotificationTimestamps.containsKey(dedupKey)) {
        final last = _recentNotificationTimestamps[dedupKey]!;
        if (now - last < 8000) {
          debugPrint('ℹ️ [LOCAL NOTIF] Suppressing duplicate notification within 8s: "$cleanTitle"');
          return;
        }
      }
      _recentNotificationTimestamps[dedupKey] = now;
      if (_recentNotificationTimestamps.length > 100) {
        _recentNotificationTimestamps.removeWhere((_, time) => now - time > 60000);
      }

      final notifId = id ?? (DateTime.now().millisecondsSinceEpoch.remainder(100000));
      await _localNotifications.show(
        notifId,
        cleanTitle.isNotEmpty ? cleanTitle : 'Hour Stay',
        cleanBody,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _highImportanceChannel.id,
            _highImportanceChannel.name,
            channelDescription: _highImportanceChannel.description,
            importance: Importance.max,
            priority: Priority.max,
            icon: '@mipmap/ic_launcher',
            playSound: true,
            enableVibration: true,
            visibility: NotificationVisibility.public,
            category: AndroidNotificationCategory.reminder,
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
          ),
        ),
        payload: payload != null ? jsonEncode(payload) : null,
      );
      debugPrint('🔔 [LOCAL NOTIF] Displayed notification in system tray: "$cleanTitle"');
    } catch (e) {
      debugPrint('⚠️ [LOCAL NOTIF ERROR] Failed to display local notification: $e');
    }
  }

  /// Sends the current FCM device token to the backend for the logged-in or guest user.
  static Future<bool> syncTokenWithBackend([String? explicitToken]) async {
    try {
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

      final savedUser = await StorageService.getUser();
      final body = <String, dynamic>{
        'token': token,
        'platform': defaultTargetPlatform.name,
        if (savedUser != null) ...{
          'userId': savedUser.id,
          'email': savedUser.email,
          'phone': savedUser.mobile,
          'role': savedUser.role,
        }
      };

      debugPrint('📤 [FCM SYNC] Sending FCM token to backend (/auth/fcm-token)...');
      final response = await ApiService.post(ApiEndpoints.fcmToken, body);

      if (response.success) {
        debugPrint('✅ [FCM SYNC SUCCESS] FCM token registered with backend for ${savedUser?.email ?? "device"}.');
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
