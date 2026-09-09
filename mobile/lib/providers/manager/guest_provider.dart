import 'package:flutter/material.dart';
import '../../models/guest_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../core/constants/api_endpoints.dart';

class GuestProvider with ChangeNotifier {
  List<GuestModel> _guests = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<GuestModel> get guests => _guests;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  int get totalGuests => _guests.length;
  int get inHouseCount => _guests.where((g) => g.status.toLowerCase().contains('check') && g.status.toLowerCase().contains('in')).length;

  GuestProvider() {
    _registerSocketListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('booking_created', (_) => fetchGuests(silent: true));
    SocketService.on('booking_updated', (_) => fetchGuests(silent: true));
    SocketService.on('booking_deleted', (_) => fetchGuests(silent: true));
    SocketService.on('checkin_checkout', (_) => fetchGuests(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchGuests(silent: true));
  }

  Future<void> fetchAll({bool silent = false}) => fetchGuests(silent: silent);

  Future<void> fetchGuests({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final response = await ApiService.get(ApiEndpoints.managerGuests);
      if (response.success && response.data != null) {
        final list = response.data as List<dynamic>;
        _guests = list.map((e) => GuestModel.fromJson(e as Map<String, dynamic>)).toList();
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
}
