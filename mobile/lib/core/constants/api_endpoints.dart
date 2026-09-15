import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiEndpoints {
  // Local PC network configuration for physical device testing
  static const String localHostIp = '192.168.88.17';
  static const String localPort = '5000';

  // Environment URLs
  static const String devBaseUrl = 'http://192.168.88.17:5000/api';
  static const String productionBaseUrl = 'https://booknstay.speshway.site/api';

  static const String devSocketUrl = 'http://192.168.88.17:5000';
  static const String productionSocketUrl = 'https://booknstay.speshway.site';

  // Build mode awareness
  static bool get isProduction => kReleaseMode;

  static String baseUrl = getDefaultBaseUrl();

  static void setBaseUrl(String url) {
    baseUrl = url;
  }

  static String getDefaultBaseUrl() {
    if (kReleaseMode) {
      return productionBaseUrl;
    }
    if (kIsWeb) {
      return 'http://localhost:$localPort/api';
    } else if (Platform.isAndroid) {
      return devBaseUrl;
    } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
      return 'http://127.0.0.1:$localPort/api';
    } else {
      return devBaseUrl;
    }
  }

  static List<String> getCandidateBaseUrls() {
    if (kReleaseMode) {
      return const [productionBaseUrl];
    }
    if (kIsWeb) {
      return const ['http://localhost:$localPort/api'];
    }
    return const [
      devBaseUrl,
      'http://127.0.0.1:$localPort/api',
      'http://10.0.2.2:$localPort/api',
      'http://localhost:$localPort/api',
    ];
  }

  static String getDefaultSocketUrl([String? explicitBaseUrl]) {
    final activeBase = explicitBaseUrl ?? baseUrl;
    if (activeBase.endsWith('/api')) {
      return activeBase.substring(0, activeBase.length - 4);
    }
    if (kReleaseMode) {
      return productionSocketUrl;
    }
    if (kIsWeb) {
      return 'http://localhost:$localPort';
    } else if (Platform.isAndroid) {
      return devSocketUrl;
    } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
      return 'http://127.0.0.1:$localPort';
    } else {
      return devSocketUrl;
    }
  }

  static String resolveImageUrl(String? url) {
    if (url == null || url.trim().isEmpty) return '';
    final s = url.trim();
    if (s.startsWith('data:image')) return s;

    // Relative uploads path
    if (s.startsWith('/uploads/') || s.startsWith('uploads/')) {
      final base = getDefaultSocketUrl();
      final cleanPath = s.startsWith('/') ? s : '/$s';
      return '$base$cleanPath';
    }

    // Rewriting localhost / 127.0.0.1 for mobile clients
    if (!kIsWeb && (s.contains('localhost:5000') || s.contains('127.0.0.1:5000'))) {
      final base = getDefaultSocketUrl();
      return s
          .replaceAll('http://localhost:5000', base)
          .replaceAll('http://127.0.0.1:5000', base);
    }

    return s;
  }

  // Auth Routes
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String forgotPassword = '/auth/forgot-password';
  static const String verifyOtp = '/auth/verify-otp';
  static const String resetPassword = '/auth/reset-password';
  static const String profile = '/auth/profile';
  static const String logout = '/auth/logout';
  static const String fcmToken = '/auth/fcm-token';

  // Manager Routes
  static const String property = '/manager/property';
  static const String managerReservations = '/manager/reservations';
  static const String reservations = '/manager/reservations';
  static const String managerRooms = '/manager/rooms';
  static const String rooms = '/manager/rooms';
  static const String managerApprovals = '/manager/approvals';
  static const String approvals = '/manager/approvals';
  static const String managerStaff = '/manager/staff';
  static const String staff = '/manager/staff';
  static const String managerShifts = '/manager/shifts';
  static const String managerAttendance = '/manager/attendance';
  static const String managerFeedback = '/manager/feedback';
  static const String feedback = '/manager/feedback';
  static const String managerPayments = '/manager/payments';
  static const String payments = '/manager/payments';
  static const String managerBilling = '/manager/billing';
  static const String managerNotifications = '/manager/notifications';
  static const String notifications = '/manager/notifications';
  static const String managerGuests = '/manager/guests';

  // Guest Routes
  static const String guestDashboard = '/guest/dashboard';
  static const String guestBookings = '/guest/bookings';
  static const String myBookings = '/guest/bookings';
  static const String guestFolio = '/guest/folio';
  static const String folios = '/guest/folio';
  static const String guestFeedback = '/guest/feedback';
  static const String myFeedback = '/guest/feedback';
  static const String guestProfile = '/guest/profile';
  static const String guestNotifications = '/guest/notifications';
  static const String guestNotificationsReadAll = '/guest/notifications/read-all';
  static const String guestChangePassword = '/guest/change-password';
  static const String guestRooms = '/guest/rooms';
  static const String guestPayments = '/guest/payments';
  static const String guestPayBalance = '/guest/payments/pay-balance';
  static const String guestRefund = '/guest/refund';
  static const String guestSettings = '/guest/settings';
  static const String guestNotificationSettings = '/guest/notifications-settings';
  static const String guestExportData = '/guest/export-data';
  static const String guestDeleteAccount = '/guest/delete-account-request';
  static const String publicProperties = '/public/properties';
}
