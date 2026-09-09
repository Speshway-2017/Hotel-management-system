import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/constants/api_endpoints.dart';
import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/guest/guest_booking_provider.dart';
import 'providers/guest/guest_feedback_provider.dart';
import 'providers/guest/guest_folio_provider.dart';
import 'providers/guest/guest_notification_provider.dart';
import 'providers/manager/approval_provider.dart';
import 'providers/manager/guest_provider.dart';
import 'providers/manager/manager_feedback_provider.dart';
import 'providers/manager/manager_notification_provider.dart';
import 'providers/manager/payment_provider.dart';
import 'providers/manager/reservation_provider.dart';
import 'providers/manager/room_provider.dart';
import 'providers/manager/staff_provider.dart';
import 'screens/role_gate.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/register_screen.dart';
import 'screens/auth/forgot_password_screen.dart';
import 'services/notification_service.dart';
import 'services/socket_service.dart';
import 'services/storage_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase & Notification Service (FCM)
  await NotificationService.initialize();

  // Load custom server URL if previously configured (ignore stale localhost/127.0.0.1)
  final savedUrl = await StorageService.getBaseUrl();
  if (savedUrl != null && savedUrl.isNotEmpty && !savedUrl.contains('127.0.0.1')) {
    ApiEndpoints.setBaseUrl(savedUrl);
  } else {
    final defaultApi = ApiEndpoints.getDefaultBaseUrl();
    ApiEndpoints.setBaseUrl(defaultApi);
    await StorageService.saveBaseUrl(defaultApi);
    await StorageService.saveSocketUrl(ApiEndpoints.getDefaultSocketUrl(defaultApi));
  }

  // Initialize socket
  SocketService.connect();

  runApp(const HourStayApp());
}

class HourStayApp extends StatelessWidget {
  const HourStayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..init()),
        ChangeNotifierProvider(create: (_) => ReservationProvider()),
        ChangeNotifierProvider(create: (_) => RoomProvider()),
        ChangeNotifierProvider(create: (_) => ApprovalProvider()),
        ChangeNotifierProvider(create: (_) => StaffProvider()),
        ChangeNotifierProvider(create: (_) => GuestProvider()),
        ChangeNotifierProvider(create: (_) => PaymentProvider()),
        ChangeNotifierProvider(create: (_) => ManagerFeedbackProvider()),
        ChangeNotifierProvider(create: (_) => ManagerNotificationProvider()),
        ChangeNotifierProvider(create: (_) => GuestBookingProvider()),
        ChangeNotifierProvider(create: (_) => GuestFolioProvider()),
        ChangeNotifierProvider(create: (_) => GuestFeedbackProvider()),
        ChangeNotifierProvider(create: (_) => GuestNotificationProvider()),
      ],
      child: MaterialApp(
        title: 'Hour Stay',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const RoleGate(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/register': (context) => const RegisterScreen(),
          '/forgot-password': (context) => const ForgotPasswordScreen(),
        },
      ),
    );
  }
}
