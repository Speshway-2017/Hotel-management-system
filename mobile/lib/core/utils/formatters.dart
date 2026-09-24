import 'package:intl/intl.dart';

class Formatters {
  static final NumberFormat currencyFormat = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 0,
  );

  static final NumberFormat compactCurrencyFormat = NumberFormat.compactCurrency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 1,
  );

  static String formatCurrency(dynamic amount) {
    if (amount == null) return '₹0';
    final val = double.tryParse(amount.toString()) ?? 0.0;
    return currencyFormat.format(val);
  }

  static String currency(dynamic amount) => formatCurrency(amount);

  static DateTime? parseDateSafe(dynamic val) {
    if (val == null) return null;
    if (val is DateTime) return val.toLocal();
    final s = val.toString().trim();
    if (s.isEmpty) return null;
    if (s.toLowerCase() == 'today') return DateTime.now();
    if (s.toLowerCase() == 'tomorrow') return DateTime.now().add(const Duration(days: 1));

    // Handle ISO timestamps with T or Z using standard DateTime.parse first so timezone is respected
    if (s.contains('T') || s.endsWith('Z')) {
      try {
        final dt = DateTime.parse(s);
        return dt.toLocal();
      } catch (_) {}
    }

    // Match DD-MM-YYYY or DD/MM/YYYY (e.g. 11-09-2026 or 11/09/2026)
    final dmyRegex = RegExp(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})');
    final dmyMatch = dmyRegex.firstMatch(s);
    if (dmyMatch != null) {
      final day = int.tryParse(dmyMatch.group(1)!) ?? 1;
      final month = int.tryParse(dmyMatch.group(2)!) ?? 1;
      final year = int.tryParse(dmyMatch.group(3)!) ?? DateTime.now().year;
      return DateTime(year, month, day);
    }

    // Match YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-09-11)
    final ymdRegex = RegExp(r'^(\d{4})[-/](\d{1,2})[-/](\d{1,2})');
    final ymdMatch = ymdRegex.firstMatch(s);
    if (ymdMatch != null) {
      final year = int.tryParse(ymdMatch.group(1)!) ?? DateTime.now().year;
      final month = int.tryParse(ymdMatch.group(2)!) ?? 1;
      final day = int.tryParse(ymdMatch.group(3)!) ?? 1;
      return DateTime(year, month, day);
    }

    // Fallback standard parse
    try {
      final dt = DateTime.parse(s);
      return dt.toLocal();
    } catch (_) {
      return null;
    }
  }

  static bool isSameDay(dynamic dateA, [dynamic dateB]) {
    if (dateA == null) return false;
    final dA = parseDateSafe(dateA);
    final dB = dateB != null ? parseDateSafe(dateB) : DateTime.now();
    if (dA == null || dB == null) return false;
    return dA.year == dB.year && dA.month == dB.month && dA.day == dB.day;
  }

  static bool isToday(dynamic dateVal) {
    if (dateVal == null) return false;
    final str = dateVal.toString().trim().toLowerCase();
    if (str.isEmpty) return false;
    if (str == 'today') return true;
    final now = DateTime.now();
    final todayIso = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final todayDmy = "${now.day.toString().padLeft(2, '0')}-${now.month.toString().padLeft(2, '0')}-${now.year}";
    final todayDmySlash = "${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}";
    if (str.startsWith(todayIso) || str.startsWith(todayDmy) || str.startsWith(todayDmySlash)) {
      return true;
    }
    return isSameDay(dateVal, now);
  }

  static const String standardCheckInTime = '12:00 PM';
  static const String standardCheckOutTime = '11:00 AM';

  static String formatDate(dynamic dateInput) {
    if (dateInput == null) return '--';
    final dt = parseDateSafe(dateInput);
    if (dt == null) {
      final s = dateInput.toString();
      return s.isNotEmpty ? s : '--';
    }
    return DateFormat('MMM dd, yyyy').format(dt);
  }

  static String date(dynamic dateInput) => formatDate(dateInput);

  static String formatDateTime(dynamic dateInput) {
    if (dateInput == null) return '--';
    final dt = parseDateSafe(dateInput);
    if (dt == null) {
      final s = dateInput.toString();
      return s.isNotEmpty ? s : '--';
    }
    return DateFormat('MMM dd, yyyy • hh:mm a').format(dt);
  }

  static String dateTime(dynamic dateInput) => formatDateTime(dateInput);

  static String formatCheckInDateTime(dynamic dateInput) {
    if (dateInput == null) return '--';
    final s = dateInput.toString().trim();
    if (s.isEmpty) return '--';
    final dt = parseDateSafe(dateInput);
    if (dt == null) return s;
    // If time is midnight or date-only string, default to standard check-in: 12:00 PM
    if (dt.hour == 0 && dt.minute == 0) {
      final fixed = DateTime(dt.year, dt.month, dt.day, 12, 0);
      return DateFormat('MMM dd, yyyy • hh:mm a').format(fixed);
    }
    return DateFormat('MMM dd, yyyy • hh:mm a').format(dt);
  }

  static String checkInDateTime(dynamic dateInput) => formatCheckInDateTime(dateInput);

  static String formatCheckOutDateTime(dynamic dateInput) {
    if (dateInput == null) return '--';
    final s = dateInput.toString().trim();
    if (s.isEmpty) return '--';
    final dt = parseDateSafe(dateInput);
    if (dt == null) return s;
    // If time is midnight or date-only string, default to standard check-out: 11:00 AM
    if (dt.hour == 0 && dt.minute == 0) {
      final fixed = DateTime(dt.year, dt.month, dt.day, 11, 0);
      return DateFormat('MMM dd, yyyy • hh:mm a').format(fixed);
    }
    return DateFormat('MMM dd, yyyy • hh:mm a').format(dt);
  }

  static String checkOutDateTime(dynamic dateInput) => formatCheckOutDateTime(dateInput);

  static DateTime parseScheduledCheckIn(dynamic dateInput, [String? timeStr]) {
    final parsed = parseDateSafe(dateInput);
    if (parsed == null) {
      final now = DateTime.now();
      return DateTime(now.year, now.month, now.day, 12, 0);
    }
    if (parsed.hour != 0 || parsed.minute != 0) {
      return parsed;
    }
    if (timeStr != null && timeStr.trim().isNotEmpty) {
      final t = _parseTimeString(timeStr);
      if (t != null) {
        return DateTime(parsed.year, parsed.month, parsed.day, t.hour, t.minute);
      }
    }
    return DateTime(parsed.year, parsed.month, parsed.day, 12, 0);
  }

  static DateTime parseScheduledCheckOut(dynamic dateInput, [String? timeStr]) {
    final parsed = parseDateSafe(dateInput);
    if (parsed == null) {
      final now = DateTime.now();
      return DateTime(now.year, now.month, now.day, 11, 0);
    }
    if (parsed.hour != 0 || parsed.minute != 0) {
      return parsed;
    }
    if (timeStr != null && timeStr.trim().isNotEmpty) {
      final t = _parseTimeString(timeStr);
      if (t != null) {
        return DateTime(parsed.year, parsed.month, parsed.day, t.hour, t.minute);
      }
    }
    return DateTime(parsed.year, parsed.month, parsed.day, 11, 0);
  }

  static ({int hour, int minute})? _parseTimeString(String timeStr) {
    final clean = timeStr.trim().toUpperCase();
    final match = RegExp(r'^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$').firstMatch(clean);
    if (match != null) {
      var h = int.tryParse(match.group(1)!) ?? 12;
      final m = match.group(2) != null ? (int.tryParse(match.group(2)!) ?? 0) : 0;
      final ampm = match.group(3);
      if (ampm == 'PM' && h < 12) h += 12;
      if (ampm == 'AM' && h == 12) h = 0;
      return (hour: h, minute: m);
    }
    return null;
  }

  static bool isCheckInAllowed(dynamic dateInput, [String? timeStr, DateTime? customNow]) {
    final scheduled = parseScheduledCheckIn(dateInput, timeStr);
    final now = customNow ?? DateTime.now();
    return now.isAfter(scheduled) || now.isAtSameMomentAs(scheduled);
  }

  static bool isCheckOutDue(dynamic dateInput, [String? timeStr, DateTime? customNow]) {
    final scheduled = parseScheduledCheckOut(dateInput, timeStr);
    final now = customNow ?? DateTime.now();
    return now.isAfter(scheduled);
  }

  static String getCheckInTimeRemaining(dynamic dateInput, [String? timeStr, DateTime? customNow]) {
    final scheduled = parseScheduledCheckIn(dateInput, timeStr);
    final now = customNow ?? DateTime.now();
    if (now.isAfter(scheduled) || now.isAtSameMomentAs(scheduled)) {
      return 'Check-in is now open';
    }
    final diff = scheduled.difference(now);
    if (diff.inDays > 0) {
      return 'Check-in opens in ${diff.inDays}d ${diff.inHours % 24}h (${checkInDateTime(dateInput)})';
    } else if (diff.inHours > 0) {
      return 'Check-in opens in ${diff.inHours}h ${diff.inMinutes % 60}m (at ${DateFormat('hh:mm a').format(scheduled)})';
    } else if (diff.inMinutes > 0) {
      return 'Check-in opens in ${diff.inMinutes}m (at ${DateFormat('hh:mm a').format(scheduled)})';
    } else {
      return 'Check-in opens in less than a minute';
    }
  }

  static String capitalize(String? text) {
    if (text == null || text.isEmpty) return '';
    return text.replaceAll('_', ' ').split(' ').map((word) {
      if (word.isEmpty) return '';
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }
}
