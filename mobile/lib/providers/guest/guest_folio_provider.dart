import 'package:flutter/material.dart';
import '../../models/folio_model.dart';
import '../../services/api_service.dart';
import '../../core/constants/api_endpoints.dart';

class GuestFolioProvider with ChangeNotifier {
  List<FolioModel> _folios = [];
  FolioModel? _activeFolio;
  bool _isLoading = false;
  String? _errorMessage;

  List<FolioModel> get folios => _folios;
  FolioModel? get activeFolio => _activeFolio;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String? get error => _errorMessage;

  Future<void> fetchMyFolios({bool silent = false}) => fetchFolios(silent: silent);

  Future<void> fetchFolios({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final response = await ApiService.get(ApiEndpoints.guestFolio);
      if (response.success && response.data != null) {
        if (response.data is Map<String, dynamic>) {
          final data = response.data as Map<String, dynamic>;
          final list = data['folios'] as List<dynamic>? ?? [];
          _folios = list.map((e) => FolioModel.fromJson(e as Map<String, dynamic>)).toList();
        } else if (response.data is List<dynamic>) {
          final list = response.data as List<dynamic>;
          _folios = list.map((e) => FolioModel.fromJson(e as Map<String, dynamic>)).toList();
        }
        if (_folios.isNotEmpty) {
          _activeFolio = _folios.first;
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

  void selectFolio(FolioModel folio) {
    _activeFolio = folio;
    notifyListeners();
  }
}
