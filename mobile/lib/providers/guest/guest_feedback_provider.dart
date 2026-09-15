import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../models/feedback_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';

class GuestFeedbackProvider with ChangeNotifier {
  List<FeedbackModel> _feedbacks = [];
  bool _isLoading = false;
  String? _error;

  List<FeedbackModel> get feedbacks => _feedbacks;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get errorMessage => _error;

  double get averageRating {
    if (_feedbacks.isEmpty) return 0.0;
    final sum = _feedbacks.fold(0.0, (acc, f) => acc + f.rating);
    return sum / _feedbacks.length;
  }

  int get totalReviews => _feedbacks.length;

  GuestFeedbackProvider() {
    _registerSocketListeners();
  }

  void _registerSocketListeners() {
    SocketService.on('feedback_created', (_) => fetchMyFeedbacks(silent: true));
    SocketService.on('feedback_updated', (_) => fetchMyFeedbacks(silent: true));
    SocketService.on('feedback_deleted', (_) => fetchMyFeedbacks(silent: true));
    SocketService.on('dashboard_sync', (_) => fetchMyFeedbacks(silent: true));
  }

  Future<void> fetchMyFeedbacks({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _error = null;
      notifyListeners();
    }

    try {
      final response = await ApiService.get(ApiEndpoints.guestFeedback);
      if (response.success && response.data != null) {
        if (response.data is List) {
          final List list = response.data as List;
          _feedbacks = list.map((e) => FeedbackModel.fromJson(e as Map<String, dynamic>)).toList();
        } else if (response.data is Map<String, dynamic>) {
          final list = (response.data['feedbacks'] ?? response.data['reviews'] ?? response.data['data']) as List<dynamic>? ?? [];
          _feedbacks = list.map((e) => FeedbackModel.fromJson(e as Map<String, dynamic>)).toList();
        }
      } else {
        if (!silent) _error = response.message;
      }
    } catch (e) {
      if (!silent) _error = e.toString();
    } finally {
      if (!silent) {
        _isLoading = false;
        notifyListeners();
      } else {
        notifyListeners();
      }
    }
  }

  Future<bool> submitFeedback({
    required String bookingId,
    String? reservationId,
    required double rating,
    required String comment,
    required Map<String, int> categoryRatings,
    String? propertyId,
    String? hotelName,
    String? room,
    String? roomType,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final body = <String, dynamic>{
        'bookingId': bookingId.isNotEmpty ? bookingId : (reservationId ?? ''),
        'reservationId': bookingId.isNotEmpty ? bookingId : (reservationId ?? ''),
        'rating': rating,
        'comment': comment,
        'comments': comment,
        'categories': categoryRatings,
      };
      if (propertyId != null) body['propertyId'] = propertyId;
      if (hotelName != null) body['hotelName'] = hotelName;
      if (room != null) body['room'] = room;
      if (roomType != null) body['roomType'] = roomType;

      final response = await ApiService.post(
        ApiEndpoints.guestFeedback,
        body,
      );

      _isLoading = false;

      if (response.success) {
        await fetchMyFeedbacks(silent: true);
        return true;
      } else {
        _error = response.message;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateFeedback({
    required String feedbackId,
    required double rating,
    required String comment,
    required Map<String, int> categoryRatings,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService.put(
        '${ApiEndpoints.guestFeedback}/$feedbackId',
        {
          'rating': rating,
          'comment': comment,
          'comments': comment,
          'categories': categoryRatings,
        },
      );

      _isLoading = false;

      if (response.success) {
        await fetchMyFeedbacks(silent: true);
        return true;
      } else {
        _error = response.message;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _isLoading = false;
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}
