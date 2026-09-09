import 'package:flutter/material.dart';
import '../../models/staff_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../core/constants/api_endpoints.dart';

class StaffProvider with ChangeNotifier {
  List<StaffModel> _staffList = [];
  List<ShiftModel> _shifts = [];
  List<AttendanceModel> _attendance = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<StaffModel> get staffList => _staffList;
  List<ShiftModel> get shifts => _shifts;
  List<AttendanceModel> get attendance => _attendance;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get error => _errorMessage;

  StaffProvider() {
    _registerSocketListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('user_created', (_) => fetchAll(silent: true));
    SocketService.on('user_updated', (_) => fetchAll(silent: true));
    SocketService.on('user_deleted', (_) => fetchAll(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchAll(silent: true));
  }

  Future<void> fetchStaff({bool silent = false}) => fetchAll(silent: silent);

  Future<void> fetchAll({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final staffRes = await ApiService.get(ApiEndpoints.managerStaff);
      final shiftRes = await ApiService.get(ApiEndpoints.managerShifts);
      final attRes = await ApiService.get(ApiEndpoints.managerAttendance);

      if (staffRes.success && staffRes.data != null) {
        final list = staffRes.data as List<dynamic>;
        _staffList = list.map((e) => StaffModel.fromJson(e as Map<String, dynamic>)).toList();
      }

      if (shiftRes.success && shiftRes.data != null) {
        final list = shiftRes.data as List<dynamic>;
        _shifts = list.map((e) => ShiftModel.fromJson(e as Map<String, dynamic>)).toList();
      }

      if (attRes.success && attRes.data != null) {
        final list = attRes.data as List<dynamic>;
        _attendance = list.map((e) => AttendanceModel.fromJson(e as Map<String, dynamic>)).toList();
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

  Future<bool> addStaff(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.post(ApiEndpoints.managerStaff, data);
    _isLoading = false;

    if (response.success) {
      await fetchAll(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateStaff(String id, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.put('${ApiEndpoints.managerStaff}/$id', data);
    _isLoading = false;

    if (response.success) {
      await fetchAll(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteStaff(String id) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.delete('${ApiEndpoints.managerStaff}/$id');
    _isLoading = false;

    if (response.success) {
      await fetchAll(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> assignShift(String userId, String username, String shiftType) async {
    final response = await ApiService.post('${ApiEndpoints.managerShifts}/assign', {
      'userId': userId,
      'username': username,
      'shiftType': shiftType,
    });

    if (response.success) {
      await fetchAll(silent: true);
      return true;
    }
    return false;
  }
}
