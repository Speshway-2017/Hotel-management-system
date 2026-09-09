import 'package:flutter/material.dart';
import '../../models/room_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../core/constants/api_endpoints.dart';

class RoomProvider with ChangeNotifier {
  List<RoomModel> _rooms = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _categoryFilter = 'All';
  String _statusFilter = 'All';

  List<RoomModel> get rooms => _rooms;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get error => _errorMessage;
  String get categoryFilter => _categoryFilter;
  String get statusFilter => _statusFilter;

  List<RoomModel> get filteredRooms {
    return _rooms.where((rm) {
      final matchesCategory = _categoryFilter == 'All' || rm.category == _categoryFilter;
      final matchesStatus = _statusFilter == 'All' || rm.status.toLowerCase() == _statusFilter.toLowerCase();
      return matchesCategory && matchesStatus;
    }).toList();
  }

  int get totalRooms => _rooms.length;
  int get availableRooms => _rooms.where((r) => r.status.toLowerCase() == 'available').length;
  int get occupiedRooms => _rooms.where((r) => r.status.toLowerCase() == 'occupied').length;
  int get reservedRooms => _rooms.where((r) => r.status.toLowerCase() == 'reserved').length;
  int get maintenanceRooms => _rooms.where((r) => r.status.toLowerCase() == 'blocked' || r.status.toLowerCase() == 'maintenance' || r.status.toLowerCase() == 'cleaning').length;

  double get occupancyRate => _rooms.isEmpty ? 0.0 : ((occupiedRooms + reservedRooms) / _rooms.length) * 100;

  RoomProvider() {
    _registerSocketListeners();
  }

  void setCategoryFilter(String cat) {
    _categoryFilter = cat;
    notifyListeners();
  }

  void setStatusFilter(String stat) {
    _statusFilter = stat;
    notifyListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('room_status_changed', (_) => fetchRooms(silent: true));
    SocketService.on('availability_changed', (_) => fetchRooms(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchRooms(silent: true));
  }

  Future<void> fetchAll({bool silent = false}) => fetchRooms(silent: silent);

  Future<void> fetchRooms({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final response = await ApiService.get(ApiEndpoints.managerRooms);
      if (response.success && response.data != null) {
        if (response.data is List<dynamic>) {
          final list = response.data as List<dynamic>;
          _rooms = list.map((item) => RoomModel.fromJson(item as Map<String, dynamic>)).toList();
        } else if (response.data is Map<String, dynamic> && response.data['rooms'] != null) {
          final list = response.data['rooms'] as List<dynamic>;
          _rooms = list.map((item) => RoomModel.fromJson(item as Map<String, dynamic>)).toList();
        }
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

  Future<bool> updateStatus(String idOrRoomNumber, String newStatus) async {
    // Check if matching id or roomNumber
    final found = _rooms.firstWhere(
      (r) => r.id == idOrRoomNumber || r.roomNumber == idOrRoomNumber,
      orElse: () => _rooms.isNotEmpty ? _rooms.first : RoomModel(id: idOrRoomNumber, roomNumber: idOrRoomNumber, category: 'Standard'),
    );
    return updateRoomStatus(found.roomNumber.isNotEmpty ? found.roomNumber : idOrRoomNumber, newStatus);
  }

  Future<bool> updateRoomStatus(String roomNumber, String newStatus) async {
    final response = await ApiService.put('${ApiEndpoints.managerRooms}/$roomNumber/status', {
      'status': newStatus,
    });

    if (response.success) {
      final idx = _rooms.indexWhere((r) => r.roomNumber == roomNumber);
      if (idx != -1) {
        final old = _rooms[idx];
        _rooms[idx] = old.copyWith(
          status: newStatus,
          operationalStatus: newStatus,
          isAvailable: newStatus.toLowerCase() == 'available',
        );
        notifyListeners();
      }
      return true;
    }
    return false;
  }

  Future<bool> createRoom(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.post(ApiEndpoints.managerRooms, data);
    _isLoading = false;

    if (response.success) {
      await fetchRooms(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateRoom(String id, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.put('${ApiEndpoints.managerRooms}/$id', data);
    _isLoading = false;

    if (response.success) {
      await fetchRooms(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteRoom(String id) async {
    final response = await ApiService.delete('${ApiEndpoints.managerRooms}/$id');
    if (response.success) {
      _rooms.removeWhere((r) => r.id == id || r.roomNumber == id);
      notifyListeners();
      return true;
    }
    return false;
  }
}
