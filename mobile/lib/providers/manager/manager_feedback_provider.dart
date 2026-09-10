import 'package:flutter/material.dart';
import '../../models/feedback_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../services/storage_service.dart';
import '../../core/constants/api_endpoints.dart';

class ManagerFeedbackProvider with ChangeNotifier {
  List<FeedbackModel> _feedbacks = [];
  bool _isLoading = false;
  String? _errorMessage;
  DateTime? _lastViewedAt;
  bool _isFeedbackOpen = false;

  List<FeedbackModel> get feedbacks => _feedbacks;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get error => _errorMessage;
  bool get isFeedbackOpen => _isFeedbackOpen;

  int get unreadCount {
    if (_isFeedbackOpen) return 0;
    if (_feedbacks.isEmpty) return 0;
    if (_lastViewedAt == null) {
      return _feedbacks.where((f) => f.status.toLowerCase() == 'pending').length;
    }
    return _feedbacks.where((f) {
      if (f.createdAt.isEmpty) return false;
      final dt = DateTime.tryParse(f.createdAt);
      if (dt == null) return false;
      return dt.toUtc().isAfter(_lastViewedAt!.toUtc());
    }).length;
  }

  double get averageRating {
    if (_feedbacks.isEmpty) return 0.0;
    final total = _feedbacks.fold(0.0, (acc, f) => acc + f.rating);
    return total / _feedbacks.length;
  }

  ManagerFeedbackProvider() {
    _registerSocketListeners();
    _initLastViewed();
  }

  Future<void> _initLastViewed() async {
    _lastViewedAt = await StorageService.getLastViewedFeedback();
    notifyListeners();
  }

  Future<void> markAsViewed() async {
    _isFeedbackOpen = true;
    _lastViewedAt = DateTime.now().toUtc();
    notifyListeners();
    await StorageService.saveLastViewedFeedback(_lastViewedAt!);
  }

  void markAsClosed() {
    _isFeedbackOpen = false;
    notifyListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('feedback_created', (_) => fetchFeedbacks(silent: true));
    SocketService.on('feedback_updated', (_) => fetchFeedbacks(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchFeedbacks(silent: true));
  }

  Future<void> fetchAll({bool silent = false}) => fetchFeedbacks(silent: silent);
  Future<void> fetchAllFeedback({bool silent = false}) => fetchFeedbacks(silent: silent);

  Future<void> fetchFeedbacks({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final response = await ApiService.get(ApiEndpoints.managerFeedback);
      if (response.success && response.data != null) {
        final list = response.data as List<dynamic>;
        _feedbacks = list.map((e) => FeedbackModel.fromJson(e as Map<String, dynamic>)).toList();
        if (_isFeedbackOpen) {
          _lastViewedAt = DateTime.now().toUtc();
          StorageService.saveLastViewedFeedback(_lastViewedAt!);
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

  Future<bool> respondFeedback(String id, String responseText) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.post('${ApiEndpoints.managerFeedback}/$id/respond', {
      'response': responseText,
      'status': 'Resolved',
    });
    _isLoading = false;

    if (response.success) {
      await fetchFeedbacks(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateFeedbackStatus(String id, String status) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.put('${ApiEndpoints.managerFeedback}/$id/status', {
      'status': status,
    });
    _isLoading = false;

    if (response.success) {
      await fetchFeedbacks(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteFeedback(String id) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.delete('${ApiEndpoints.managerFeedback}/$id');
    _isLoading = false;

    if (response.success) {
      await fetchFeedbacks(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> createFeedback(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    final response = await ApiService.post(ApiEndpoints.managerFeedback, data);
    _isLoading = false;

    if (response.success) {
      await fetchFeedbacks(silent: true);
      return true;
    } else {
      _errorMessage = response.message;
      notifyListeners();
      return false;
    }
  }
}
