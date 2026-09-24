import 'package:flutter/material.dart';

/// Centralized Input Validation Utility for Flutter Mobile App
/// Matches the web application Zod primitive schemas and real-time validation constraints.
class InputValidators {
  static const Color errorRed = Color(0xFFDC2626);

  /// Error text style in bold pure red (#DC2626)
  static const TextStyle errorTextStyle = TextStyle(
    color: errorRed,
    fontSize: 11,
    fontWeight: FontWeight.w700,
    height: 1.2,
  );

  /// Red error border style (#DC2626)
  static OutlineInputBorder errorOutlineBorder({double radius = 12, double width = 1.5}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(radius),
      borderSide: BorderSide(color: errorRed, width: width),
    );
  }

  /// Text only (names, cities, etc.) - rejects numbers
  static String? validateTextOnly(
    String? value, {
    String fieldName = 'Text field',
    bool required = true,
  }) {
    if (value == null || value.trim().isEmpty) {
      return required ? '$fieldName is required' : null;
    }
    if (RegExp(r'\d').hasMatch(value)) {
      return 'Text fields allow text only; numbers are not allowed';
    }
    return null;
  }

  /// Name validator - letters and spaces only, strictly no numbers
  static String? validateName(
    String? value, {
    String fieldName = 'Full name',
    bool required = true,
  }) {
    if (value == null || value.trim().isEmpty) {
      return required ? '$fieldName is required' : null;
    }
    if (RegExp(r'\d').hasMatch(value)) {
      return 'Name must contain letters only; numbers are not allowed';
    }
    if (value.trim().length < 2) {
      return '$fieldName must be at least 2 characters';
    }
    return null;
  }

  /// Number validator - digits only (whole numbers / integers)
  static String? validateNumber(
    String? value, {
    String fieldName = 'Number',
    bool required = true,
    num? min,
    num? max,
  }) {
    if (value == null || value.trim().isEmpty) {
      return required ? '$fieldName is required' : null;
    }
    final trimmed = value.trim();
    if (RegExp(r'[a-zA-Z]').hasMatch(trimmed) || int.tryParse(trimmed) == null) {
      return 'Number fields allow numbers only; invalid text is not allowed';
    }
    final numVal = int.parse(trimmed);
    if (min != null && numVal < min) {
      return '$fieldName must be at least $min';
    }
    if (max != null && numVal > max) {
      return '$fieldName must be at most $max';
    }
    return null;
  }

  /// Amount / Price / Tariff validator - numbers and decimals only
  static String? validateAmount(
    String? value, {
    String fieldName = 'Amount',
    bool required = true,
    bool allowZero = true,
  }) {
    if (value == null || value.trim().isEmpty) {
      return required ? '$fieldName is required' : null;
    }
    final trimmed = value.trim();
    if (RegExp(r'[a-zA-Z]').hasMatch(trimmed)) {
      return 'Number fields allow numbers only; invalid text is not allowed';
    }
    final numVal = double.tryParse(trimmed);
    if (numVal == null) {
      return 'Amount must be a valid number or decimal only';
    }
    if (!allowZero && numVal <= 0) {
      return '$fieldName must be greater than 0';
    }
    if (numVal < 0) {
      return '$fieldName cannot be negative';
    }
    return null;
  }

  /// Phone validator - numbers only, 10 to 15 digits
  static String? validatePhone(
    String? value, {
    bool required = true,
  }) {
    if (value == null || value.trim().isEmpty) {
      return required ? 'Phone number is required' : null;
    }
    final trimmed = value.trim();
    if (RegExp(r'[a-zA-Z]').hasMatch(trimmed)) {
      return 'Phone number must contain numbers only; letters are not allowed';
    }
    final digitsOnly = trimmed.replaceAll(RegExp(r'\D'), '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return 'Phone number must be between 10 and 15 digits';
    }
    return null;
  }

  /// Email validator - valid email format only
  static String? validateEmail(
    String? value, {
    bool required = true,
  }) {
    if (value == null || value.trim().isEmpty) {
      return required ? 'Email address is required' : null;
    }
    final trimmed = value.trim();
    final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    if (!emailRegex.hasMatch(trimmed)) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  /// Bank account number validator - numbers only, 9 to 18 digits
  static String? validateAccountNumber(
    String? value, {
    bool required = true,
  }) {
    if (value == null || value.trim().isEmpty) {
      return required ? 'Bank account number is required' : null;
    }
    final trimmed = value.trim();
    if (RegExp(r'[a-zA-Z]').hasMatch(trimmed)) {
      return 'Account number allows numbers only; letters are not allowed';
    }
    if (!RegExp(r'^\d{9,18}$').hasMatch(trimmed)) {
      return 'Account number must be between 9 and 18 digits';
    }
    return null;
  }

  /// UPI ID validator - e.g. name@bank
  static String? validateUpi(
    String? value, {
    bool required = true,
  }) {
    if (value == null || value.trim().isEmpty) {
      return required ? 'UPI ID is required' : null;
    }
    final trimmed = value.trim();
    final upiRegex = RegExp(r'^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$');
    if (!upiRegex.hasMatch(trimmed)) {
      return 'Please enter a valid UPI ID (e.g. mobile@upi)';
    }
    return null;
  }
}
