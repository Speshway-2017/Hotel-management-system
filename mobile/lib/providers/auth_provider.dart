import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/storage_service.dart';
import '../services/socket_service.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _user;
  bool _isLoading = false;
  bool _isInitializing = true;
  String? _errorMessage;

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isInitializing => _isInitializing;
  bool get isAuthenticated => _user != null;
  String? get errorMessage => _errorMessage;

  bool get isManager => _user?.isManagerRole == true;
  bool get isGuest => _user?.isGuestRole == true;

  Future<void> init() => initAuth();

  Future<void> initAuth() async {
    _isInitializing = true;
    notifyListeners();

    try {
      final token = await StorageService.getToken();
      if (token != null && token.isNotEmpty) {
        final savedUser = await StorageService.getUser();
        if (savedUser != null) {
          _user = savedUser;
          await SocketService.connect(_user?.propertyId);
          _refreshProfile();
        }
      }
    } catch (_) {
    } finally {
      _isInitializing = false;
      notifyListeners();
    }
  }

  Future<void> _refreshProfile() async {
    final res = await AuthService.getProfile();
    if (res.success && res.data != null) {
      _user = res.data;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final response = await AuthService.login(email, password);
    _isLoading = false;

    if (response.success && response.data != null) {
      _user = response.data;
      notifyListeners();
      return true;
    } else {
      _errorMessage = response.message ?? 'Login failed';
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String name,
    required String email,
    required String password,
    required String mobile,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final response = await AuthService.register(
      name: name,
      email: email,
      password: password,
      mobile: mobile,
    );
    _isLoading = false;

    if (response.success && response.data != null) {
      _user = response.data;
      notifyListeners();
      return true;
    } else {
      _errorMessage = response.message ?? 'Registration failed';
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateProfile(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();

    final res = await AuthService.updateProfile(data);
    _isLoading = false;

    if (res.success && res.data != null) {
      _user = res.data;
      notifyListeners();
      return true;
    } else {
      _errorMessage = res.message;
      notifyListeners();
      return false;
    }
  }

  Future<bool> forgotPassword(String email) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final res = await AuthService.forgotPassword(email);
    _isLoading = false;

    if (res.success) {
      notifyListeners();
      return true;
    } else {
      _errorMessage = res.message ?? 'Failed to send OTP';
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyOtp(String email, String otp) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final res = await AuthService.verifyOtp(email, otp);
    _isLoading = false;

    if (res.success) {
      notifyListeners();
      return true;
    } else {
      _errorMessage = res.message ?? 'Invalid or expired OTP code';
      notifyListeners();
      return false;
    }
  }

  Future<bool> resetPassword({
    required String email,
    required String otp,
    required String newPassword,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final res = await AuthService.resetPassword(email, otp, newPassword);
    _isLoading = false;

    if (res.success) {
      notifyListeners();
      return true;
    } else {
      _errorMessage = res.message ?? 'Failed to reset password';
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await AuthService.logout();
    _user = null;
    notifyListeners();
  }
}
