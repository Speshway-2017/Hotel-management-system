import 'package:flutter/material.dart';
import '../../models/payment_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../core/constants/api_endpoints.dart';

class PaymentProvider with ChangeNotifier {
  List<PaymentModel> _payments = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<PaymentModel> get payments => _payments;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get error => _errorMessage;

  double get totalRevenue => _payments.fold(0.0, (acc, p) => p.isCompleted ? acc + p.amount : acc);
  double get totalPaymentsAmount => _payments.fold(0.0, (acc, p) => acc + p.amount);

  double get settledTotal => _payments.fold(0.0, (acc, p) => (p.isCompleted || p.status.toLowerCase() == 'settled' || p.status.toLowerCase() == 'paid') ? acc + p.amount : acc);
  int get settledCount => _payments.where((p) => p.isCompleted || p.status.toLowerCase() == 'settled' || p.status.toLowerCase() == 'paid').length;

  double get pendingTotal => _payments.fold(0.0, (acc, p) => p.status.toLowerCase() == 'pending' ? acc + p.amount : acc);
  int get pendingCount => _payments.where((p) => p.status.toLowerCase() == 'pending').length;

  double get refundedTotal => _payments.fold(0.0, (acc, p) => (p.status.toLowerCase() == 'refunded' || p.status.toLowerCase() == 'refund') ? acc + p.amount : acc);
  int get refundedCount => _payments.where((p) => p.status.toLowerCase() == 'refunded' || p.status.toLowerCase() == 'refund').length;

  PaymentProvider() {
    _registerSocketListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('payment_logged', (_) => fetchPayments(silent: true));
    SocketService.on('payment_added', (_) => fetchPayments(silent: true));
    SocketService.on('payment_updated', (_) => fetchPayments(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchPayments(silent: true));
  }

  Future<void> fetchAll({bool silent = false}) => fetchPayments(silent: silent);

  Future<void> fetchPayments({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final response = await ApiService.get(ApiEndpoints.managerPayments);
      if (response.success && response.data != null) {
        final list = response.data as List<dynamic>;
        final parsed = list.map((e) => PaymentModel.fromJson(e as Map<String, dynamic>)).toList();
        final seen = <String>{};
        final unique = <PaymentModel>[];
        for (final p in parsed) {
          final key = p.bookingId.isNotEmpty ? '${p.bookingId}_${p.guestName.toLowerCase().trim()}' : p.id;
          if (!seen.contains(key)) {
            seen.add(key);
            unique.add(p);
          }
        }
        _payments = unique;
      } else {
        if (!silent) _errorMessage = response.message;
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

  Future<bool> logPayment(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.post(ApiEndpoints.managerPayments, data);
    _isLoading = false;

    if (response.success) {
      await fetchPayments(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> recordPayment(Map<String, dynamic> data) => logPayment(data);

  Future<bool> updatePaymentStatus(String id, String status) async {
    // Optimistic update
    final idx = _payments.indexWhere((p) => p.id == id);
    if (idx != -1) {
      final old = _payments[idx];
      _payments[idx] = PaymentModel(
        id: old.id,
        bookingId: old.bookingId,
        guestName: old.guestName,
        roomNumber: old.roomNumber,
        amount: old.amount,
        paymentMethod: old.paymentMethod,
        status: status,
        propertyId: old.propertyId,
        createdAt: old.createdAt,
      );
      notifyListeners();
    }

    try {
      final response = await ApiService.put('${ApiEndpoints.managerPayments}/$id', {
        'status': status,
      });

      if (response.success) {
        fetchPayments(silent: true);
        return true;
      } else {
        _errorMessage = response.message;
        fetchPayments(silent: true);
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      fetchPayments(silent: true);
      return false;
    }
  }

  Future<bool> settleFolio(String bookingId, double amountPaid) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.post('${ApiEndpoints.managerBilling}/$bookingId/payment', {
      'amountPaid': amountPaid,
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
  }

  Future<bool> deletePayment(String id) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.delete('${ApiEndpoints.managerPayments}/$id');
    _isLoading = false;

    if (response.success) {
      await fetchPayments(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }
}
