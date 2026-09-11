import 'package:flutter/material.dart';
import '../../models/approval_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../core/constants/api_endpoints.dart';

class ApprovalProvider with ChangeNotifier {
  List<ApprovalModel> _approvals = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _statusFilter = 'All';

  List<ApprovalModel> get approvals => _approvals;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get error => _errorMessage;
  String get statusFilter => _statusFilter;

  List<ApprovalModel> get filteredApprovals {
    if (_statusFilter == 'All') return _approvals;
    return _approvals.where((a) => a.status.toLowerCase() == _statusFilter.toLowerCase()).toList();
  }

  int get pendingCount => _approvals.where((a) => a.status.toLowerCase() == 'pending').length;
  int get approvedCount => _approvals.where((a) => a.status.toLowerCase() == 'approved').length;
  int get processingCount => _approvals.where((a) => a.status.toLowerCase() == 'processing').length;
  int get refundedCount => _approvals.where((a) => a.status.toLowerCase() == 'refunded').length;
  int get rejectedCount => _approvals.where((a) => a.status.toLowerCase() == 'rejected').length;

  ApprovalProvider() {
    _registerSocketListeners();
  }

  void setFilter(String filter) {
    _statusFilter = filter;
    notifyListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('approval_updated', (_) => fetchApprovals(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchApprovals(silent: true));
    SocketService.on('new_approval', (_) => fetchApprovals(silent: true));
    SocketService.on('approval_received', (_) => fetchApprovals(silent: true));
  }

  Future<void> fetchAll({bool silent = false}) => fetchApprovals(silent: silent);

  Future<void> fetchApprovals({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final response = await ApiService.get(ApiEndpoints.managerApprovals);
      if (response.success && response.data != null) {
        final list = response.data as List<dynamic>;
        _approvals = list.map((item) => ApprovalModel.fromJson(item as Map<String, dynamic>)).toList();
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

  Future<bool> respond(String id, String action, {String remarks = ''}) {
    return decideApproval(id, action, remarks);
  }

  Future<bool> processApproval(String id, String action, {String remarks = ''}) {
    return decideApproval(id, action, remarks);
  }

  Future<bool> decideApproval(String id, String action, String reason) async {
    // Normalize status
    String finalStatus = action;
    final actLower = action.toLowerCase();
    if (actLower == 'approved' || actLower == 'approve') {
      finalStatus = 'Approved';
    } else if (actLower == 'rejected' || actLower == 'reject') {
      finalStatus = 'Rejected';
    } else if (actLower == 'processing' || actLower == 'process') {
      finalStatus = 'Processing';
    } else if (actLower == 'refunded' || actLower == 'refund') {
      finalStatus = 'Refunded';
    }

    final idx = _approvals.indexWhere((a) => a.id == id);
    if (idx != -1) {
      final old = _approvals[idx];
      _approvals[idx] = ApprovalModel(
        id: old.id,
        category: old.category,
        requestedBy: old.requestedBy,
        guest: old.guest,
        bookingId: old.bookingId,
        room: old.room,
        amount: old.amount,
        value: old.value,
        reason: old.reason,
        description: old.description,
        status: finalStatus,
        propertyId: old.propertyId,
        decisionReason: reason.isNotEmpty ? reason : (
          finalStatus == 'Approved' ? 'Approved via Mobile App' :
          finalStatus == 'Processing' ? 'Processing Payout via Mobile App' :
          finalStatus == 'Refunded' ? 'Refund Completed via Mobile App' :
          'Rejected via Mobile App'
        ),
        decidedBy: 'Manager',
        decidedAt: DateTime.now().toIso8601String(),
        createdAt: old.createdAt,
      );
      notifyListeners();
    }

    try {
      final response = await ApiService.post('${ApiEndpoints.managerApprovals}/$id', {
        'action': finalStatus,
        'decisionReason': reason,
      });

      if (response.success) {
        fetchApprovals(silent: true);
        return true;
      } else {
        _errorMessage = response.message;
        fetchApprovals(silent: true);
        return false;
      }
    } catch (e) {
      _errorMessage = e.toString();
      fetchApprovals(silent: true);
      return false;
    }
  }
}
