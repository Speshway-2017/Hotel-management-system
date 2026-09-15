import 'package:flutter/material.dart';
import '../../core/constants/api_endpoints.dart';
import '../../services/api_service.dart';

class GuestNotificationSettings {
  final bool emailConfirmations;
  final bool smsAlerts;
  final bool pushNotifications;
  final bool promotionalOffers;
  final bool checkInReminders;

  GuestNotificationSettings({
    this.emailConfirmations = true,
    this.smsAlerts = true,
    this.pushNotifications = true,
    this.promotionalOffers = false,
    this.checkInReminders = true,
  });

  GuestNotificationSettings copyWith({
    bool? emailConfirmations,
    bool? smsAlerts,
    bool? pushNotifications,
    bool? promotionalOffers,
    bool? checkInReminders,
  }) {
    return GuestNotificationSettings(
      emailConfirmations: emailConfirmations ?? this.emailConfirmations,
      smsAlerts: smsAlerts ?? this.smsAlerts,
      pushNotifications: pushNotifications ?? this.pushNotifications,
      promotionalOffers: promotionalOffers ?? this.promotionalOffers,
      checkInReminders: checkInReminders ?? this.checkInReminders,
    );
  }

  factory GuestNotificationSettings.fromJson(Map<String, dynamic>? json) {
    if (json == null) return GuestNotificationSettings();
    return GuestNotificationSettings(
      emailConfirmations: json['emailConfirmations'] ?? true,
      smsAlerts: json['smsAlerts'] ?? true,
      pushNotifications: json['pushNotifications'] ?? true,
      promotionalOffers: json['promotionalOffers'] ?? false,
      checkInReminders: json['checkInReminders'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'emailConfirmations': emailConfirmations,
      'smsAlerts': smsAlerts,
      'pushNotifications': pushNotifications,
      'promotionalOffers': promotionalOffers,
      'checkInReminders': checkInReminders,
    };
  }
}

class GuestAppPreferences {
  final String currency;
  final String language;
  final String theme;
  final bool biometricLogin;
  final bool hapticFeedback;

  GuestAppPreferences({
    this.currency = 'INR (₹)',
    this.language = 'English (IN)',
    this.theme = 'System',
    this.biometricLogin = false,
    this.hapticFeedback = true,
  });

  GuestAppPreferences copyWith({
    String? currency,
    String? language,
    String? theme,
    bool? biometricLogin,
    bool? hapticFeedback,
  }) {
    return GuestAppPreferences(
      currency: currency ?? this.currency,
      language: language ?? this.language,
      theme: theme ?? this.theme,
      biometricLogin: biometricLogin ?? this.biometricLogin,
      hapticFeedback: hapticFeedback ?? this.hapticFeedback,
    );
  }

  factory GuestAppPreferences.fromJson(Map<String, dynamic>? json) {
    if (json == null) return GuestAppPreferences();
    return GuestAppPreferences(
      currency: json['currency'] ?? 'INR (₹)',
      language: json['language'] ?? 'English (IN)',
      theme: json['theme'] ?? 'System',
      biometricLogin: json['biometricLogin'] ?? false,
      hapticFeedback: json['hapticFeedback'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'currency': currency,
      'language': language,
      'theme': theme,
      'biometricLogin': biometricLogin,
      'hapticFeedback': hapticFeedback,
    };
  }
}

class GuestSettingsProvider with ChangeNotifier {
  GuestNotificationSettings _notificationSettings = GuestNotificationSettings();
  GuestAppPreferences _preferences = GuestAppPreferences();
  bool _twoFactorAuth = false;
  DateTime? _lastPasswordChange;
  bool _isLoading = false;
  bool _isSaving = false;
  String? _errorMessage;

  GuestNotificationSettings get notificationSettings => _notificationSettings;
  GuestAppPreferences get preferences => _preferences;
  bool get twoFactorAuth => _twoFactorAuth;
  DateTime? get lastPasswordChange => _lastPasswordChange;
  bool get isLoading => _isLoading;
  bool get isSaving => _isSaving;
  String? get errorMessage => _errorMessage;

  Future<void> fetchSettings({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final res = await ApiService.get(ApiEndpoints.guestSettings);
      if (res.success && res.data != null) {
        final data = res.data as Map<String, dynamic>;
        _notificationSettings = GuestNotificationSettings.fromJson(data['notificationSettings']);
        _preferences = GuestAppPreferences.fromJson(data['appPreferences']);
        
        final sec = data['securitySettings'] as Map<String, dynamic>?;
        if (sec != null) {
          _twoFactorAuth = sec['twoFactorAuth'] == true;
          if (sec['lastPasswordChange'] != null) {
            _lastPasswordChange = DateTime.tryParse(sec['lastPasswordChange'].toString());
          }
        }
      }
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateNotificationSetting(String key, bool value) async {
    // Optimistic update
    final previous = _notificationSettings;
    switch (key) {
      case 'emailConfirmations':
        _notificationSettings = _notificationSettings.copyWith(emailConfirmations: value);
        break;
      case 'smsAlerts':
        _notificationSettings = _notificationSettings.copyWith(smsAlerts: value);
        break;
      case 'pushNotifications':
        _notificationSettings = _notificationSettings.copyWith(pushNotifications: value);
        break;
      case 'promotionalOffers':
        _notificationSettings = _notificationSettings.copyWith(promotionalOffers: value);
        break;
      case 'checkInReminders':
        _notificationSettings = _notificationSettings.copyWith(checkInReminders: value);
        break;
    }
    notifyListeners();

    try {
      final res = await ApiService.put(
        ApiEndpoints.guestNotificationSettings,
        _notificationSettings.toJson(),
      );
      if (!res.success) {
        _notificationSettings = previous;
        notifyListeners();
        return false;
      }
      return true;
    } catch (_) {
      _notificationSettings = previous;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateAppPreference(String key, dynamic value) async {
    final prev = _preferences;
    switch (key) {
      case 'currency':
        _preferences = _preferences.copyWith(currency: value.toString());
        break;
      case 'language':
        _preferences = _preferences.copyWith(language: value.toString());
        break;
      case 'theme':
        _preferences = _preferences.copyWith(theme: value.toString());
        break;
      case 'biometricLogin':
        _preferences = _preferences.copyWith(biometricLogin: value == true);
        break;
      case 'hapticFeedback':
        _preferences = _preferences.copyWith(hapticFeedback: value == true);
        break;
    }
    notifyListeners();

    try {
      final res = await ApiService.put(
        ApiEndpoints.guestSettings,
        {
          'appPreferences': _preferences.toJson(),
          if (key == 'currency') 'currency': value.toString(),
          if (key == 'language') 'language': value.toString(),
        },
      );
      if (!res.success) {
        _preferences = prev;
        notifyListeners();
        return false;
      }
      return true;
    } catch (_) {
      _preferences = prev;
      notifyListeners();
      return false;
    }
  }

  Future<ApiResponse<dynamic>> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    _isSaving = true;
    notifyListeners();

    try {
      final res = await ApiService.post(
        ApiEndpoints.guestChangePassword,
        {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
      _isSaving = false;
      if (res.success) {
        _lastPasswordChange = DateTime.now();
      }
      notifyListeners();
      return res;
    } catch (e) {
      _isSaving = false;
      notifyListeners();
      return ApiResponse(success: false, statusCode: 500, message: e.toString());
    }
  }

  Future<ApiResponse<dynamic>> requestAccountDeletion({String reason = 'Guest requested deletion'}) async {
    try {
      return await ApiService.post(
        ApiEndpoints.guestDeleteAccount,
        {'reason': reason},
      );
    } catch (e) {
      return ApiResponse(success: false, statusCode: 500, message: e.toString());
    }
  }

  Future<ApiResponse<dynamic>> exportAccountData() async {
    try {
      return await ApiService.get(ApiEndpoints.guestExportData);
    } catch (e) {
      return ApiResponse(success: false, statusCode: 500, message: e.toString());
    }
  }
}
