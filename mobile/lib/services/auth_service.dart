import '../core/constants/api_endpoints.dart';
import '../models/user_model.dart';
import 'api_service.dart';
import 'storage_service.dart';
import 'socket_service.dart';

class AuthService {
  static Future<ApiResponse<UserModel>> login(String email, String password) async {
    final response = await ApiService.post(ApiEndpoints.login, {
      'email': email.trim(),
      'password': password,
    });

    if (response.success && response.data != null) {
      final data = response.data as Map<String, dynamic>;
      final token = data['token']?.toString();
      final userMap = data['user'] as Map<String, dynamic>?;

      if (token != null && userMap != null) {
        final user = UserModel.fromJson(userMap);
        await StorageService.saveToken(token);
        await StorageService.saveUser(user);
        
        // Connect Socket.IO
        await SocketService.connect(user.propertyId);

        return ApiResponse(
          success: true,
          statusCode: response.statusCode,
          data: user,
          message: response.message,
        );
      }
    }

    return ApiResponse(
      success: false,
      statusCode: response.statusCode,
      message: response.message ?? 'Login failed. Please check credentials.',
    );
  }

  static Future<ApiResponse<UserModel>> register({
    required String name,
    required String email,
    required String password,
    required String mobile,
  }) async {
    final response = await ApiService.post(ApiEndpoints.register, {
      'name': name.trim(),
      'email': email.trim(),
      'password': password,
      'mobile': mobile.trim(),
      'role': 'guest',
    });

    if (response.success && response.data != null) {
      final data = response.data as Map<String, dynamic>;
      final token = data['token']?.toString();
      final userMap = data['user'] as Map<String, dynamic>?;

      if (token != null && userMap != null) {
        final user = UserModel.fromJson(userMap);
        await StorageService.saveToken(token);
        await StorageService.saveUser(user);
        await SocketService.connect();

        return ApiResponse(
          success: true,
          statusCode: response.statusCode,
          data: user,
          message: response.message,
        );
      }
    }

    return ApiResponse(
      success: false,
      statusCode: response.statusCode,
      message: response.message ?? 'Registration failed',
    );
  }

  static Future<ApiResponse<UserModel>> getProfile() async {
    final response = await ApiService.get(ApiEndpoints.profile);
    if (response.success && response.data != null) {
      final user = UserModel.fromJson(response.data as Map<String, dynamic>);
      await StorageService.saveUser(user);
      return ApiResponse(
        success: true,
        statusCode: response.statusCode,
        data: user,
        message: response.message,
      );
    }
    return ApiResponse(
      success: false,
      statusCode: response.statusCode,
      message: response.message,
    );
  }

  static Future<ApiResponse<UserModel>> updateProfile(Map<String, dynamic> updateData) async {
    final response = await ApiService.put(ApiEndpoints.profile, updateData);
    if (response.success && response.data != null) {
      final user = UserModel.fromJson(response.data as Map<String, dynamic>);
      await StorageService.saveUser(user);
      return ApiResponse(
        success: true,
        statusCode: response.statusCode,
        data: user,
        message: response.message,
      );
    }
    return ApiResponse(
      success: false,
      statusCode: response.statusCode,
      message: response.message,
    );
  }

  static Future<ApiResponse<dynamic>> forgotPassword(String email) async {
    return await ApiService.post(ApiEndpoints.forgotPassword, {'email': email.trim()});
  }

  static Future<ApiResponse<dynamic>> verifyOtp(String email, String otp) async {
    return await ApiService.post(ApiEndpoints.verifyOtp, {
      'email': email.trim(),
      'otp': otp.trim(),
    });
  }

  static Future<ApiResponse<dynamic>> resetPassword(String email, String otp, String password) async {
    return await ApiService.post(ApiEndpoints.resetPassword, {
      'email': email.trim(),
      'otp': otp.trim(),
      'password': password,
    });
  }

  static Future<void> logout() async {
    try {
      await ApiService.post(ApiEndpoints.logout);
    } catch (_) {}
    SocketService.disconnect();
    await StorageService.clear();
  }
}
