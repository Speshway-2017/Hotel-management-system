import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiEndpoints {
  // Local PC network configuration for physical device testing
  static const String localHostIp = '192.168.88.17';
  static const String localPort = '5000';

  // Production configuration switch
  static const bool useProduction = false;
  static const String productionBaseUrl = 'https://api.hourstay.com/api';

  static String baseUrl = getDefaultBaseUrl();

  static void setBaseUrl(String url) {
    baseUrl = url;
  }

  static String getDefaultBaseUrl() {
    if (useProduction) {
      return productionBaseUrl;
    }
    if (kIsWeb) {
      return 'http://localhost:$localPort/api';
    } else if (Platform.isAndroid) {
      // Physical Android devices connect via local Wi-Fi IP (192.168.88.17:5000)
      return 'http://$localHostIp:$localPort/api';
    } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
      return 'http://127.0.0.1:$localPort/api';
    } else {
      return 'http://$localHostIp:$localPort/api';
    }
  }

  static List<String> getCandidateBaseUrls() {
    if (useProduction) {
      return const [productionBaseUrl];
    }
    if (kIsWeb) {
      return const ['http://localhost:$localPort/api'];
    }
    return const [
      'http://$localHostIp:$localPort/api',
      'http://127.0.0.1:$localPort/api',
      'http://localhost:$localPort/api',
      'http://10.0.2.2:$localPort/api',
      'http://192.168.1.14:$localPort/api',
    ];
  }

  static String getDefaultSocketUrl([String? explicitBaseUrl]) {
    final activeBase = explicitBaseUrl ?? baseUrl;
    if (activeBase.endsWith('/api')) {
      return activeBase.substring(0, activeBase.length - 4);
    }
    if (useProduction) {
      return productionBaseUrl.replaceAll('/api', '');
    }
    if (kIsWeb) {
      return 'http://localhost:$localPort';
    } else if (Platform.isAndroid) {
      return 'http://$localHostIp:$localPort';
    } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
      return 'http://127.0.0.1:$localPort';
    } else {
      return 'http://$localHostIp:$localPort';
    }
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
  static const String publicProperties = '/public/properties';
}
