import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../core/constants/api_endpoints.dart';
import 'storage_service.dart';

class ApiResponse<T> {
  final bool success;
  final int statusCode;
  final T? data;
  final String? message;

  ApiResponse({
    required this.success,
    required this.statusCode,
    this.data,
    this.message,
  });
}

class ApiService {
  static String? _resolvedBaseUrl;

  static Future<String> getBaseUrl() async {
    if (_resolvedBaseUrl != null) return _resolvedBaseUrl!;

    final customUrl = await StorageService.getBaseUrl();
    if (customUrl != null && customUrl.trim().isNotEmpty) {
      _resolvedBaseUrl = customUrl.trim();
      ApiEndpoints.setBaseUrl(_resolvedBaseUrl!);
      return _resolvedBaseUrl!;
    }

    _resolvedBaseUrl = ApiEndpoints.getDefaultBaseUrl();
    return _resolvedBaseUrl!;
  }

  static Future<void> _updateWorkingBaseUrl(String url) async {
    _resolvedBaseUrl = url;
    ApiEndpoints.setBaseUrl(url);
    await StorageService.saveBaseUrl(url);
    await StorageService.saveSocketUrl(ApiEndpoints.getDefaultSocketUrl(url));
  }

  static Future<Map<String, String>> _getHeaders() async {
    final token = await StorageService.getToken();
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static Future<ApiResponse<dynamic>> _executeWithFallback(
    Future<http.Response> Function(String baseUrl, Map<String, String> headers) requestFn,
  ) async {
    final headers = await _getHeaders();
    final currentBase = await getBaseUrl();

    try {
      final response = await requestFn(currentBase, headers).timeout(const Duration(seconds: 4));
      return _handleResponse(response);
    } catch (e) {
      debugPrint('⚠️ Request failed on $currentBase ($e). Probing candidate endpoints...');

      // Probe candidate endpoints
      final candidates = ApiEndpoints.getCandidateBaseUrls()
          .where((url) => url != currentBase)
          .toList();

      for (final candidate in candidates) {
        try {
          final response = await requestFn(candidate, headers).timeout(const Duration(seconds: 2));
          debugPrint('✅ Connection succeeded with candidate: $candidate');
          await _updateWorkingBaseUrl(candidate);
          return _handleResponse(response);
        } catch (_) {
          continue;
        }
      }

      return ApiResponse(
        success: false,
        statusCode: 500,
        message: e is SocketException || e is TimeoutException
            ? 'Unable to connect to HMS server. Please ensure the backend is running.'
            : 'Connection error: ${e.toString()}',
      );
    }
  }

  static Future<ApiResponse<dynamic>> get(String endpoint) async {
    return _executeWithFallback((baseUrl, headers) {
      final uri = Uri.parse('$baseUrl$endpoint');
      return http.get(uri, headers: headers);
    });
  }

  static Future<ApiResponse<dynamic>> post(String endpoint, [Map<String, dynamic>? body]) async {
    return _executeWithFallback((baseUrl, headers) {
      final uri = Uri.parse('$baseUrl$endpoint');
      return http.post(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
    });
  }

  static Future<ApiResponse<dynamic>> put(String endpoint, [Map<String, dynamic>? body]) async {
    return _executeWithFallback((baseUrl, headers) {
      final uri = Uri.parse('$baseUrl$endpoint');
      return http.put(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
    });
  }

  static Future<ApiResponse<dynamic>> patch(String endpoint, [Map<String, dynamic>? body]) async {
    return _executeWithFallback((baseUrl, headers) {
      final uri = Uri.parse('$baseUrl$endpoint');
      return http.patch(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
    });
  }

  static Future<ApiResponse<dynamic>> delete(String endpoint) async {
    return _executeWithFallback((baseUrl, headers) {
      final uri = Uri.parse('$baseUrl$endpoint');
      return http.delete(uri, headers: headers);
    });
  }

  static ApiResponse<dynamic> _handleResponse(http.Response response) {
    dynamic bodyData;
    String? message;

    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        bodyData = decoded['data'] ?? decoded;
        message = decoded['message']?.toString();
      } else {
        bodyData = decoded;
      }
    } catch (_) {
      bodyData = response.body;
      message = response.body;
    }

    final isSuccess = response.statusCode >= 200 && response.statusCode < 300;
    return ApiResponse(
      success: isSuccess,
      statusCode: response.statusCode,
      data: bodyData,
      message: message ?? (isSuccess ? 'Success' : 'Request failed (${response.statusCode})'),
    );
  }
}
