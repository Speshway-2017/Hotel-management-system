import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/utils/formatters.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final double fontSize;
  final EdgeInsets padding;

  const StatusBadge({
    super.key,
    required this.status,
    this.fontSize = 11,
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
  });

  @override
  Widget build(BuildContext context) {
    final color = AppColors.getStatusColor(status);
    final bgColor = AppColors.getStatusBgColor(status);

    String displayStatus = status.replaceAll('_', ' ').replaceAll('-', ' ').trim();
    displayStatus = Formatters.capitalize(displayStatus);

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withAlpha(70), width: 1),
      ),
      child: Text(
        displayStatus.isNotEmpty ? displayStatus : Formatters.capitalize(status),
        style: TextStyle(
          color: color,
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}
