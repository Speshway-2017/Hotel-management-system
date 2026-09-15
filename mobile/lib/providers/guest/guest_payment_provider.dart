import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../models/guest_payment_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';

class GuestPaymentProvider with ChangeNotifier {
  List<GuestPaymentModel> _payments = [];
  GuestPaymentSummary _summary = const GuestPaymentSummary();
  GuestPaymentModel? _activePayment;
  bool _isLoading = false;
  String? _errorMessage;

  List<GuestPaymentModel> get payments => _payments;
  GuestPaymentSummary get summary => _summary;
  GuestPaymentModel? get activePayment => _activePayment;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get error => _errorMessage;

  double get totalPaid => _summary.totalPaid > 0
      ? _summary.totalPaid
      : _payments.fold(0.0, (acc, p) => p.isSuccessful ? acc + p.amount : acc);

  double get pendingAmount => _summary.pendingAmount > 0
      ? _summary.pendingAmount
      : _payments.fold(0.0, (acc, p) => p.isPending ? acc + p.balance : acc);

  double get refundedAmount => _summary.refundedAmount > 0
      ? _summary.refundedAmount
      : _payments.fold(0.0, (acc, p) => p.isRefunded || p.isPartiallyRefunded ? acc + (p.refundInfo?.approvedAmount ?? p.amount) : acc);

  GuestPaymentProvider() {
    _registerSocketListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('payment_logged', (_) => fetchPayments(silent: true));
    SocketService.on('payment_updated', (_) => fetchPayments(silent: true));
    SocketService.on('booking_updated', (_) => fetchPayments(silent: true));
    SocketService.on('refund_requested', (_) => fetchPayments(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchPayments(silent: true));
  }

  void selectPayment(GuestPaymentModel payment) {
    _activePayment = payment;
    notifyListeners();
  }

  Future<void> fetchPayments({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final response = await ApiService.get(ApiEndpoints.guestPayments);
      if (response.success && response.data != null) {
        if (response.data is Map<String, dynamic>) {
          final map = response.data as Map<String, dynamic>;
          if (map.containsKey('summary') && map['summary'] is Map<String, dynamic>) {
            _summary = GuestPaymentSummary.fromJson(map['summary'] as Map<String, dynamic>);
          }
          if (map.containsKey('payments') && map['payments'] is List) {
            final list = map['payments'] as List<dynamic>;
            _payments = list.map((e) => GuestPaymentModel.fromJson(e as Map<String, dynamic>)).toList();
          }
        } else if (response.data is List<dynamic>) {
          final list = response.data as List<dynamic>;
          _payments = list.map((e) => GuestPaymentModel.fromJson(e as Map<String, dynamic>)).toList();
          _calculateSummaryLocally();
        }
      }

      // If payments empty, attempt fallback to real bookings endpoint
      if (_payments.isEmpty) {
        await _fetchFallbackFromBookings();
      }

      _calculateSummaryLocally();

      if (_payments.isNotEmpty && _activePayment != null) {
        _activePayment = _payments.firstWhere(
          (p) => p.id == _activePayment!.id,
          orElse: () => _payments.first,
        );
      }
    } catch (e) {
      if (_payments.isEmpty) {
        try {
          await _fetchFallbackFromBookings();
          _calculateSummaryLocally();
        } catch (_) {
          if (!silent) _errorMessage = e.toString();
        }
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _fetchFallbackFromBookings() async {
    final res = await ApiService.get(ApiEndpoints.guestBookings);
    if (res.success && res.data != null && res.data is List) {
      final list = res.data as List<dynamic>;
      final fallbackList = <GuestPaymentModel>[];
      for (final b in list) {
        if (b is Map<String, dynamic>) {
          final total = double.tryParse(b['amount']?.toString() ?? b['totalAmount']?.toString() ?? '0') ?? 0.0;
          final balance = double.tryParse(b['balance']?.toString() ?? '0') ?? 0.0;
          final isRefunded = b['status'] == 'Cancelled' || b['paymentStatus'] == 'Refunded' || b['refundStatus'] == 'Refunded';
          final bId = b['bookingId']?.toString() ?? b['id']?.toString() ?? '';
          
          fallbackList.add(GuestPaymentModel(
            id: 'PAY-$bId',
            paymentId: 'PAY-$bId',
            bookingId: bId,
            guestName: b['guest']?.toString() ?? 'Valued Guest',
            hotel: b['hotel']?.toString() ?? 'Hour Stay Luxury Hotel',
            city: b['city']?.toString() ?? 'Hyderabad',
            room: b['room']?.toString() ?? 'Standard Room',
            roomNumber: b['roomNumber']?.toString() ?? '101',
            amount: isRefunded ? total : (total - balance > 0 ? total - balance : total),
            totalAmount: total,
            paidAmount: isRefunded ? 0 : (total - balance),
            balance: balance,
            paymentMethod: b['paymentMethod']?.toString() ?? 'UPI',
            status: isRefunded ? 'Refunded' : (balance == 0 ? 'Successful' : 'Pending'),
            checkIn: b['checkIn']?.toString() ?? '',
            checkOut: b['checkOut']?.toString() ?? '',
            dates: b['dates']?.toString() ?? '',
            nights: int.tryParse(b['nights']?.toString() ?? '1') ?? 1,
            createdAt: b['createdAt']?.toString() ?? '',
            refundInfo: b['refundRequest'] is Map<String, dynamic>
                ? GuestRefundInfo.fromJson(b['refundRequest'] as Map<String, dynamic>)
                : null,
          ));
        }
      }
      if (fallbackList.isNotEmpty) {
        _payments = fallbackList;
      }
    }
  }

  void _calculateSummaryLocally() {
    final paid = _payments.fold(0.0, (acc, p) => p.isSuccessful ? acc + p.amount : acc);
    final pending = _payments.fold(0.0, (acc, p) => p.hasPendingBalance ? acc + p.balance : acc);
    final refunded = _payments.fold(0.0, (acc, p) => p.isRefunded || p.isPartiallyRefunded ? acc + (p.refundInfo?.approvedAmount ?? p.amount) : acc);

    _summary = GuestPaymentSummary(
      totalPaid: paid,
      pendingAmount: pending,
      refundedAmount: refunded,
      totalTransactions: _payments.length,
    );
  }

  Future<bool> payBalance({
    required String bookingId,
    required double amount,
    String paymentMethod = 'UPI',
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.post(ApiEndpoints.guestPayBalance, {
        'bookingId': bookingId,
        'amount': amount,
        'paymentMethod': paymentMethod,
      });

      _isLoading = false;

      if (response.success) {
        await fetchPayments(silent: true);
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
