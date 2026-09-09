import 'package:flutter/material.dart';
import '../../models/reservation_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../core/constants/api_endpoints.dart';

class ReservationProvider with ChangeNotifier {
  List<ReservationModel> _reservations = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _statusFilter = 'All';
  String _searchQuery = '';

  List<ReservationModel> get reservations => _reservations;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get error => _errorMessage;
  String get statusFilter => _statusFilter;
  String get searchQuery => _searchQuery;

  List<ReservationModel> get filteredReservations {
    return _reservations.where((r) {
      final matchesStatus = _statusFilter == 'All' ||
          r.status.toLowerCase() == _statusFilter.toLowerCase();
      final matchesSearch = _searchQuery.isEmpty ||
          r.guest.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          r.bookingId.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          r.room.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          r.phone.contains(_searchQuery);
      return matchesStatus && matchesSearch;
    }).toList();
  }

  int get totalBookings => _reservations.length;
  int get activeCheckIns => _reservations.where((r) => r.status.toLowerCase() == 'checked-in' || r.status.toLowerCase() == 'checked_in').length;
  int get confirmedBookings => _reservations.where((r) => r.status.toLowerCase() == 'confirmed').length;
  int get pendingBookings => _reservations.where((r) => r.status.toLowerCase() == 'pending').length;

  ReservationProvider() {
    _registerSocketListeners();
  }

  void setFilter(String filter) {
    _statusFilter = filter;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('booking_created', (_) => fetchReservations(silent: true));
    SocketService.on('booking_updated', (_) => fetchReservations(silent: true));
    SocketService.on('booking_deleted', (_) => fetchReservations(silent: true));
    SocketService.on('checkin_completed', (_) => fetchReservations(silent: true));
    SocketService.on('checkout_completed', (_) => fetchReservations(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchReservations(silent: true));
  }

  Future<void> fetchAll({bool silent = false}) => fetchReservations(silent: silent);

  Future<void> fetchReservations({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final response = await ApiService.get(ApiEndpoints.managerReservations);
      if (response.success && response.data != null) {
        final list = response.data as List<dynamic>;
        _reservations = list.map((item) => ReservationModel.fromJson(item as Map<String, dynamic>)).toList();
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

  Future<bool> createReservation(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.post(ApiEndpoints.managerReservations, data);
    _isLoading = false;

    if (response.success) {
      await fetchReservations(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateStatus(String id, String status) async {
    return updateReservation(id, {'status': status});
  }

  Future<bool> updateReservationStatus(String id, String status) => updateStatus(id, status);

  Future<bool> updateReservation(String id, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.put('${ApiEndpoints.managerReservations}/$id', data);
    _isLoading = false;

    if (response.success) {
      await fetchReservations(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> assignRoom(String id, String roomNumber, String roomType) async {
    final response = await ApiService.post('${ApiEndpoints.managerReservations}/$id/assign-room', {
      'roomNumber': roomNumber,
      'roomType': roomType,
    });

    if (response.success) {
      await fetchReservations(silent: true);
      return true;
    }
    return false;
  }

  Future<bool> verifyIdProof(String id, String docType, String docNumber) async {
    final response = await ApiService.post('${ApiEndpoints.managerReservations}/$id/verify-id', {
      'idDocType': docType,
      'idDocNumber': docNumber,
      'idVerification': 'Verified',
    });

    if (response.success) {
      await fetchReservations(silent: true);
      return true;
    }
    return false;
  }

  Future<bool> extendReservation(String id, String newCheckOut, int additionalNights, double additionalAmount) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.post('${ApiEndpoints.managerReservations}/$id/extend', {
      'newCheckOut': newCheckOut,
      'additionalNights': additionalNights,
      'additionalAmount': additionalAmount,
    });
    _isLoading = false;

    if (response.success) {
      await fetchReservations(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteReservation(String id) async {
    final response = await ApiService.delete('${ApiEndpoints.managerReservations}/$id');
    if (response.success) {
      _reservations.removeWhere((r) => r.id == id || r.bookingId == id);
      notifyListeners();
      return true;
    }
    return false;
  }
}
