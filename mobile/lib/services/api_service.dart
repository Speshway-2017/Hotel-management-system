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

  /// Fast active probe to dynamically discover reachable backend host.
  static Future<String?> probeFastWorkingBaseUrl() async {
    final customUrl = await StorageService.getBaseUrl();
    final candidates = <String>[
      if (customUrl != null && customUrl.trim().isNotEmpty && !customUrl.contains('192.168.1.14'))
        customUrl.trim(),
      ...ApiEndpoints.getCandidateBaseUrls(),
    ];

    for (final url in candidates) {
      try {
        final uri = Uri.parse('$url/health');
        final res = await http.get(uri).timeout(const Duration(milliseconds: 1500));
        if (res.statusCode == 200) {
          debugPrint('🎯 [NETWORK PROBE] Connected to HMS Backend at $url');
          await _updateWorkingBaseUrl(url);
          return url;
        }
      } catch (_) {
        continue;
      }
    }
    return null;
  }

  static Future<String> getBaseUrl() async {
    if (_resolvedBaseUrl != null &&
        _resolvedBaseUrl!.isNotEmpty &&
        !_resolvedBaseUrl!.contains('192.168.1.14')) {
      return _resolvedBaseUrl!;
    }

    final customUrl = await StorageService.getBaseUrl();
    if (customUrl != null &&
        customUrl.trim().isNotEmpty &&
        !customUrl.contains('192.168.1.14')) {
      _resolvedBaseUrl = customUrl.trim();
      ApiEndpoints.setBaseUrl(_resolvedBaseUrl!);
      return _resolvedBaseUrl!;
    }

    _resolvedBaseUrl = ApiEndpoints.getDefaultBaseUrl();
    ApiEndpoints.setBaseUrl(_resolvedBaseUrl!);
    await StorageService.saveBaseUrl(_resolvedBaseUrl!);
    await StorageService.saveSocketUrl(ApiEndpoints.getDefaultSocketUrl(_resolvedBaseUrl!));
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
            ? 'Unable to connect to HMS server ($currentBase). Please ensure your PC and phone are on the same Wi-Fi network (IP: 192.168.88.17).'
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

  static Future<ApiResponse<dynamic>> delete(String endpoint, [Map<String, dynamic>? body]) async {
    return _executeWithFallback((baseUrl, headers) {
      final uri = Uri.parse('$baseUrl$endpoint');
      return http.delete(
        uri,
        headers: headers,
        body: body != null ? jsonEncode(body) : null,
      );
    });
  }

  static Future<ApiResponse<dynamic>> uploadFile(
    String endpoint, {
    required String fieldName,
    required String filePath,
    Uint8List? fileBytes,
    String? fileName,
    Map<String, String>? fields,
    String method = 'PUT',
  }) async {
    final token = await StorageService.getToken();
    final baseUrl = await getBaseUrl();
    final uri = Uri.parse('$baseUrl$endpoint');

    try {
      final request = http.MultipartRequest(method, uri);
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      request.headers['Accept'] = 'application/json';

      if (fields != null) {
        request.fields.addAll(fields);
      }

      if (fileBytes != null && fileName != null) {
        request.files.add(http.MultipartFile.fromBytes(
          fieldName,
          fileBytes,
          filename: fileName,
        ));
      } else if (filePath.isNotEmpty) {
        request.files.add(await http.MultipartFile.fromPath(
          fieldName,
          filePath,
        ));
      }

      final streamedResponse = await request.send().timeout(const Duration(seconds: 20));
      final response = await http.Response.fromStream(streamedResponse);
      return _handleResponse(response);
    } catch (e) {
      return ApiResponse(
        success: false,
        statusCode: 500,
        message: 'Failed to upload file: ${e.toString()}',
      );
    }
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
