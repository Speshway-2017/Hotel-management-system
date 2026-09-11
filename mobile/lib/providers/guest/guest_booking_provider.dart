import 'package:flutter/material.dart';
import '../../models/reservation_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../core/constants/api_endpoints.dart';

class GuestBookingProvider with ChangeNotifier {
  List<ReservationModel> _bookings = [];
  ReservationModel? _upcomingStay;
  ReservationModel? _currentStay;
  int _totalStays = 0;
  double _totalSpent = 0.0;
  bool _isLoading = false;
  String? _errorMessage;
  String _tabFilter = 'All';

  List<ReservationModel> get bookings => _bookings;
  ReservationModel? get upcomingStay => _upcomingStay;
  ReservationModel? get currentStay => _currentStay;
  int get totalStays => _totalStays;
  double get totalSpent => _totalSpent;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get error => _errorMessage;
  String get tabFilter => _tabFilter;

  List<ReservationModel> get filteredBookings {
    if (_tabFilter == 'Active') {
      return _bookings.where((b) => b.status == 'Checked-in' || b.status == 'Confirmed' || b.status == 'Paid').toList();
    } else if (_tabFilter == 'Past') {
      return _bookings.where((b) => b.status == 'Checked-out' || b.status == 'Completed').toList();
    } else if (_tabFilter == 'Cancelled') {
      return _bookings.where((b) => b.status == 'Cancelled').toList();
    }
    return _bookings;
  }

  GuestBookingProvider() {
    _registerSocketListeners();
  }

  void setTabFilter(String tab) {
    _tabFilter = tab;
    notifyListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('booking_created', (_) => fetchDashboardData(silent: true));
    SocketService.on('booking_updated', (_) => fetchDashboardData(silent: true));
    SocketService.on('checkin_completed', (_) => fetchDashboardData(silent: true));
    SocketService.on('checkout_completed', (_) => fetchDashboardData(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchDashboardData(silent: true));
  }

  Future<void> fetchMyBookings({bool silent = false}) => fetchDashboardData(silent: silent);

  Future<void> fetchDashboardData({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final dashRes = await ApiService.get(ApiEndpoints.guestDashboard);
      final listRes = await ApiService.get(ApiEndpoints.guestBookings);

      if (listRes.success && listRes.data != null) {
        final list = listRes.data as List<dynamic>;
        _bookings = list.map((e) => ReservationModel.fromJson(e as Map<String, dynamic>)).toList();
      }

      if (dashRes.success && dashRes.data != null) {
        final data = dashRes.data as Map<String, dynamic>;
        final stats = data['stats'] as Map<String, dynamic>?;
        if (stats != null) {
          if (stats['upcomingBooking'] != null) {
            _upcomingStay = ReservationModel.fromJson(stats['upcomingBooking']);
          } else {
            _upcomingStay = null;
          }

          if (stats['currentStay'] != null) {
            _currentStay = ReservationModel.fromJson(stats['currentStay']);
          } else {
            _currentStay = null;
          }

          _totalStays = int.tryParse(stats['totalStays']?.toString() ?? '0') ?? _bookings.length;
          _totalSpent = double.tryParse(stats['totalSpent']?.toString() ?? '0') ?? 0.0;
        }
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

  Future<bool> bookRoom({
    required String roomId,
    required String checkIn,
    required String checkOut,
    required String stayType,
    int? hours,
    required double totalAmount,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.post(ApiEndpoints.guestBookings, {
        'roomId': roomId,
        'checkIn': checkIn,
        'checkOut': checkOut,
        'stayType': stayType,
        'hours': hours,
        'totalAmount': totalAmount,
      });

      _isLoading = false;
      if (response.success) {
        await fetchDashboardData(silent: true);
        return true;
      } else {
        _errorMessage = response.message;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> extendBooking({
    required String bookingId,
    required String newCheckOut,
    int? additionalNights,
    int? extendHours,
    required double additionalAmount,
    String paymentMethod = 'UPI',
    bool paidNow = true,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.post('${ApiEndpoints.guestBookings}/$bookingId/extend', {
        'newCheckOut': newCheckOut,
        'additionalNights': additionalNights,
        'extendHours': extendHours,
        'additionalAmount': additionalAmount,
        'paymentMethod': paymentMethod,
        'paidNow': paidNow,
      });

      _isLoading = false;
      if (response.success) {
        await fetchDashboardData(silent: true);
        return true;
      } else {
        _errorMessage = response.message;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> requestExtension(String bookingId, int extendHours, [String? reason]) async {
    return extendBooking(
      bookingId: bookingId,
      newCheckOut: '',
      extendHours: extendHours,
      additionalAmount: 0.0,
      paidNow: false,
    );
  }

  Future<bool> cancelBooking({
    required String bookingId,
    String? reason,
    String? remarks,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.post('${ApiEndpoints.guestBookings}/$bookingId/cancel', {
        'reason': reason ?? 'Guest requested cancellation',
        'remarks': remarks ?? '',
      });

      _isLoading = false;
      if (response.success) {
        await fetchDashboardData(silent: true);
        return true;
      } else {
        _errorMessage = response.message;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> submitRefundRequest({
    required String bookingId,
    required double amount,
    required String reason,
    String? details,
    String refundMethod = 'UPI',
    String? upiId,
    String? accountHolder,
    String? accountNumber,
    String? ifscCode,
    String? bankName,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final payload = {
        'bookingId': bookingId,
        'amount': amount,
        'reason': reason,
        'details': details ?? '',
        'refundMethod': refundMethod,
        'upiId': upiId ?? '',
        'accountHolder': accountHolder ?? '',
        'accountNumber': accountNumber ?? '',
        'ifscCode': ifscCode ?? '',
        'bankName': bankName ?? '',
      };

      final response = await ApiService.post(ApiEndpoints.guestRefund, payload);

      _isLoading = false;
      if (response.success) {
        await fetchDashboardData(silent: true);
        return true;
      } else {
        _errorMessage = response.message;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }
}
