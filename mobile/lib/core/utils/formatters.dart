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

  static String formatDate(dynamic dateInput) {
    if (dateInput == null) return '--';
    if (dateInput is DateTime) {
      return DateFormat('MMM dd, yyyy').format(dateInput);
    }
    final str = dateInput.toString();
    if (str.isEmpty) return '--';
    try {
      final date = DateTime.parse(str);
      return DateFormat('MMM dd, yyyy').format(date);
    } catch (_) {
      return str;
    }
  }

  static String date(dynamic dateInput) => formatDate(dateInput);

  static String formatDateTime(dynamic dateInput) {
    if (dateInput == null) return '--';
    if (dateInput is DateTime) {
      return DateFormat('MMM dd, yyyy • hh:mm a').format(dateInput);
    }
    final str = dateInput.toString();
    if (str.isEmpty) return '--';
    try {
      final date = DateTime.parse(str);
      return DateFormat('MMM dd, yyyy • hh:mm a').format(date);
    } catch (_) {
      return str;
    }
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
