import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';

class StorageService {
  static const String _keyToken = 'hms_mobile_token';
  static const String _keyUser = 'hms_mobile_user';
  static const String _keyBaseUrl = 'hms_mobile_base_url';
  static const String _keySocketUrl = 'hms_mobile_socket_url';

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyToken, token);
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyToken);
  }

  static Future<void> saveUser(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUser, jsonEncode(user.toJson()));
  }

  static Future<UserModel?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userStr = prefs.getString(_keyUser);
    if (userStr == null) return null;
    try {
      return UserModel.fromJson(jsonDecode(userStr));
    } catch (_) {
      return null;
    }
  }

  static Future<void> saveBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyBaseUrl, url);
  }

  static Future<String?> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyBaseUrl);
  }

  static Future<void> saveSocketUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keySocketUrl, url);
  }

  static Future<String?> getSocketUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keySocketUrl);
  }

  // Instance aliases for convenience
  Future<void> saveServerUrl(String url) => saveBaseUrl(url);
  Future<String?> getServerUrl() => getBaseUrl();

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyUser);
  }
}
