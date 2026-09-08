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
        _payments = list.map((e) => PaymentModel.fromJson(e as Map<String, dynamic>)).toList();
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
}
