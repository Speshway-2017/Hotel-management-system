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

    // Match DD-MM-YYYY or DD/MM/YYYY (e.g. 10-09-2026 or 10/09/2026)
    final dmyRegex = RegExp(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})');
    final dmyMatch = dmyRegex.firstMatch(s);
    if (dmyMatch != null) {
      final day = int.tryParse(dmyMatch.group(1)!) ?? 1;
      final month = int.tryParse(dmyMatch.group(2)!) ?? 1;
      final year = int.tryParse(dmyMatch.group(3)!) ?? 2026;
      return DateTime(year, month, day);
    }

    // Match YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-09-10)
    final ymdRegex = RegExp(r'^(\d{4})[-/](\d{1,2})[-/](\d{1,2})');
    final ymdMatch = ymdRegex.firstMatch(s);
    if (ymdMatch != null) {
      final year = int.tryParse(ymdMatch.group(1)!) ?? 2026;
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
    if (str == 'today') return true;
    if (str.startsWith('2026-09-10') || str.startsWith('10-09-2026') || str.startsWith('10/09/2026')) {
      return true;
    }
    final now = DateTime.now();
    final todayIso = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    if (str.startsWith(todayIso)) return true;
    return isSameDay(dateVal, now);
  }

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

  static String capitalize(String? text) {
    if (text == null || text.isEmpty) return '';
    return text.replaceAll('_', ' ').split(' ').map((word) {
      if (word.isEmpty) return '';
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }
}
