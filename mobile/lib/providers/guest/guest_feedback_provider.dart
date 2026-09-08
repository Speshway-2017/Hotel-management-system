import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../models/feedback_model.dart';
import '../../services/api_service.dart';

class GuestFeedbackProvider with ChangeNotifier {
  List<FeedbackModel> _feedbacks = [];
  bool _isLoading = false;
  String? _error;

  List<FeedbackModel> get feedbacks => _feedbacks;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchMyFeedbacks() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.get(ApiEndpoints.guestFeedback);
      if (response.success && response.data != null) {
        if (response.data is List) {
          final List list = response.data as List;
          _feedbacks = list.map((e) => FeedbackModel.fromJson(e as Map<String, dynamic>)).toList();
        } else if (response.data is Map<String, dynamic>) {
          final list = (response.data['feedbacks'] ?? response.data['reviews']) as List<dynamic>? ?? [];
          _feedbacks = list.map((e) => FeedbackModel.fromJson(e as Map<String, dynamic>)).toList();
        }
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> submitFeedback({
    required String reservationId,
    required double rating,
    required String comment,
    required Map<String, int> categoryRatings,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.post(
        ApiEndpoints.guestFeedback,
        {
          'reservationId': reservationId,
          'rating': rating,
          'comment': comment,
          'categories': categoryRatings,
        },
      );
      if (response.success) {
        await fetchMyFeedbacks();
        return true;
      } else {
        _error = response.message;
        _isLoading = false;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
