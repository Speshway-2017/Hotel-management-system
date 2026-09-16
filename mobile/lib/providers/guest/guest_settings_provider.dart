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

class GuestHotelProfile {
  final String propertyId;
  final String hotelName;
  final String phone;
  final String email;
  final String address;
  final String city;
  final String state;
  final String country;
  final String pincode;
  final String website;

  GuestHotelProfile({
    this.propertyId = '',
    this.hotelName = 'Speshway Luxury Hotel',
    this.phone = '+91 1800 266 4687',
    this.email = 'concierge@hourstay.com',
    this.address = 'Banjara Hills, Road No. 12',
    this.city = 'Hyderabad, Telangana',
    this.state = '',
    this.country = 'India',
    this.pincode = '',
    this.website = '',
  });

  String get fullAddress {
    final list = <String>[];
    if (address.isNotEmpty) list.add(address);
    if (city.isNotEmpty && !address.toLowerCase().contains(city.toLowerCase())) list.add(city);
    if (state.isNotEmpty && !city.toLowerCase().contains(state.toLowerCase())) list.add(state);
    if (pincode.isNotEmpty) list.add(pincode);
    if (country.isNotEmpty && country.toLowerCase() != 'india') list.add(country);
    return list.isNotEmpty ? list.join(', ') : (address.isNotEmpty ? address : 'Banjara Hills, Road No. 12, Hyderabad, Telangana');
  }

  factory GuestHotelProfile.fromJson(Map<String, dynamic>? json) {
    if (json == null) return GuestHotelProfile();
    return GuestHotelProfile(
      propertyId: json['propertyId']?.toString() ?? '',
      hotelName: json['hotelName']?.toString().trim().isNotEmpty == true
          ? json['hotelName'].toString().trim()
          : 'Speshway Luxury Hotel',
      phone: json['phone']?.toString().trim().isNotEmpty == true
          ? json['phone'].toString().trim()
          : '+91 1800 266 4687',
      email: json['email']?.toString().trim().isNotEmpty == true
          ? json['email'].toString().trim()
          : 'concierge@hourstay.com',
      address: json['address']?.toString().trim().isNotEmpty == true
          ? json['address'].toString().trim()
          : '',
      city: json['city']?.toString().trim().isNotEmpty == true
          ? json['city'].toString().trim()
          : '',
      state: json['state']?.toString().trim() ?? '',
      country: json['country']?.toString().trim() ?? 'India',
      pincode: json['pincode']?.toString().trim() ?? '',
      website: json['website']?.toString().trim() ?? '',
    );
  }
}

class GuestSettingsProvider with ChangeNotifier {
  GuestNotificationSettings _notificationSettings = GuestNotificationSettings();
  GuestAppPreferences _preferences = GuestAppPreferences();
  GuestHotelProfile _hotelProfile = GuestHotelProfile();
  bool _twoFactorAuth = false;
  DateTime? _lastPasswordChange;
  bool _isLoading = false;
  bool _isSaving = false;
  String? _errorMessage;

  GuestNotificationSettings get notificationSettings => _notificationSettings;
  GuestAppPreferences get preferences => _preferences;
  GuestHotelProfile get hotelProfile => _hotelProfile;
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
        if (data['hotelProfile'] != null) {
          _hotelProfile = GuestHotelProfile.fromJson(data['hotelProfile'] as Map<String, dynamic>?);
        }
        
        final sec = data['securitySettings'] as Map<String, dynamic>?;
        if (sec != null) {
          _twoFactorAuth = sec['twoFactorAuth'] == true;
          if (sec['lastPasswordChange'] != null) {
            _lastPasswordChange = DateTime.tryParse(sec['lastPasswordChange'].toString());
          }
        }
      }

      // Also ensure we have the live property profile if needed
      if (_hotelProfile.address.isEmpty || _hotelProfile.email.isEmpty || _hotelProfile.email == 'concierge@hourstay.com') {
        try {
          final propRes = await ApiService.get(ApiEndpoints.publicProperties);
          if (propRes.success && propRes.data is List && (propRes.data as List).isNotEmpty) {
            final list = propRes.data as List;
            // Find property that has non-empty settings or HS-9HQ8P
            final target = list.firstWhere(
              (p) {
                if (p is! Map) return false;
                final s = p['settings'];
                if (s is Map) {
                  return (s['email'] != null && s['email'].toString().isNotEmpty) ||
                      (s['reservationEmail'] != null && s['reservationEmail'].toString().isNotEmpty) ||
                      (s['address'] != null && s['address'].toString().isNotEmpty);
                }
                return false;
              },
              orElse: () => list.firstWhere(
                (p) => p is Map && (p['_id'] == 'HS-9HQ8P' || p['id'] == 'HS-9HQ8P'),
                orElse: () => list.first,
              ),
            );

            if (target is Map<String, dynamic>) {
              final s = (target['settings'] as Map<String, dynamic>?) ?? {};
              final phone = s['contactNumber']?.toString().trim().isNotEmpty == true
                  ? s['contactNumber'].toString().trim()
                  : (s['phone']?.toString().trim().isNotEmpty == true
                      ? s['phone'].toString().trim()
                      : (target['phone']?.toString().trim() ?? _hotelProfile.phone));

              final email = s['reservationEmail']?.toString().trim().isNotEmpty == true
                  ? s['reservationEmail'].toString().trim()
                  : (s['email']?.toString().trim().isNotEmpty == true
                      ? s['email'].toString().trim()
                      : (target['email']?.toString().trim() ?? _hotelProfile.email));

              final address = s['address']?.toString().trim().isNotEmpty == true
                  ? s['address'].toString().trim()
                  : (target['address']?.toString().trim() ?? _hotelProfile.address);

              final city = s['city']?.toString().trim().isNotEmpty == true
                  ? s['city'].toString().trim()
                  : (target['city']?.toString().trim() ?? _hotelProfile.city);

              final hotelName = s['hotelName']?.toString().trim().isNotEmpty == true
                  ? s['hotelName'].toString().trim()
                  : (s['name']?.toString().trim().isNotEmpty == true
                      ? s['name'].toString().trim()
                      : (target['name']?.toString().trim() ?? _hotelProfile.hotelName));

              _hotelProfile = GuestHotelProfile(
                propertyId: target['_id']?.toString() ?? target['id']?.toString() ?? _hotelProfile.propertyId,
                hotelName: hotelName.isNotEmpty ? hotelName : _hotelProfile.hotelName,
                phone: phone.isNotEmpty ? phone : _hotelProfile.phone,
                email: email.isNotEmpty ? email : _hotelProfile.email,
                address: address.isNotEmpty ? address : _hotelProfile.address,
                city: city.isNotEmpty ? city : _hotelProfile.city,
                state: s['state']?.toString().trim() ?? _hotelProfile.state,
                country: s['country']?.toString().trim() ?? _hotelProfile.country,
                pincode: s['pincode']?.toString().trim() ?? _hotelProfile.pincode,
                website: s['website']?.toString().trim() ?? _hotelProfile.website,
              );
            }
          }
        } catch (_) {}
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
