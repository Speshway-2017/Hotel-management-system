import 'package:flutter/material.dart';

class AppColors {
  // Hour Stay Brand Palette (Navy Slate, Royal Indigo, Warm Gold / Amber)
  static const Color primary = Color(0xFF0D1B2A); // Navy #0D1B2A
  static const Color primaryLight = Color(0xFF1E293B); // Slate 800
  static const Color primaryMedium = Color(0xFF334155); // Slate 700

  static const Color navy = Color(0xFF0D1B2A);
  static const Color navyDeep = Color(0xFF081420);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color blush = Color(0xFFFF6B8B);
  static const Color focusCyan = Color(0xFF12B1D1);
  static const Color surfaceSoft = Color(0xFFE7E9EE);

  static const Color accent = Color(0xFF2563EB); // Royal Blue
  static const Color accentLight = Color(0xFF60A5FA);
  
  static const Color gold = Color(0xFFF5C06A); // Warm Amber/Gold #F5C06A
  static const Color goldLight = Color(0xFFF59E0B);
  static const Color goldBg = Color(0xFFFEF3C7);
  static const Color secondary = Color(0xFFD97706);

  // Backgrounds & Surface
  static const Color background = Color(0xFFF8FAFC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color cardBackground = Color(0xFFFFFFFF);
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderDark = Color(0xFFCBD5E1);

  // Text Colors
  static const Color textPrimary = Color(0xFF0D1B2A);
  static const Color textSecondary = Color(0xFF667085);
  static const Color textMuted = Color(0xFF98A2B3);
  static const Color textTertiary = Color(0xFF94A3B8);

  // Status & Badges
  static const Color success = Color(0xFF2E7D32);
  static const Color successBg = Color(0xFFDCFCE7);
  static const Color warning = Color(0xFFC77700);
  static const Color warningBg = Color(0xFFFEF3C7);
  static const Color danger = Color(0xFFC62828);
  static const Color dangerBg = Color(0xFFFEE2E2);
  static const Color error = Color(0xFFC62828);
  static const Color info = Color(0xFF1565C0);
  static const Color infoBg = Color(0xFFE0F2FE);
  static const Color purple = Color(0xFF5B21B6);
  static const Color purpleBg = Color(0xFFEDE9FE);

  static Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'available':
      case 'active':
      case 'settled':
      case 'paid':
      case 'approved':
      case 'present':
        return success;
      case 'checked-in':
      case 'checked_in':
      case 'occupied':
      case 'staying':
        return accent;
      case 'pending':
      case 'reserved':
      case 'cleaning':
        return warning;
      case 'checked-out':
      case 'checked_out':
      case 'completed':
        return purple;
      case 'cancelled':
      case 'rejected':
      case 'blocked':
      case 'maintenance':
      case 'absent':
      case 'no-show':
        return danger;
      default:
        return textSecondary;
    }
  }

  static Color getStatusBgColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'available':
      case 'active':
      case 'settled':
      case 'paid':
      case 'approved':
      case 'present':
        return successBg;
      case 'checked-in':
      case 'checked_in':
      case 'occupied':
      case 'staying':
        return infoBg;
      case 'pending':
      case 'reserved':
      case 'cleaning':
        return warningBg;
      case 'checked-out':
      case 'checked_out':
      case 'completed':
        return purpleBg;
      case 'cancelled':
      case 'rejected':
      case 'blocked':
      case 'maintenance':
      case 'absent':
      case 'no-show':
        return dangerBg;
      default:
        return const Color(0xFFF1F5F9);
    }
  }
}
