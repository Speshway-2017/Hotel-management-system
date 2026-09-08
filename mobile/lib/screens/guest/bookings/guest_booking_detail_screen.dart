import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_button.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import '../feedback/guest_add_feedback_screen.dart';

class GuestBookingDetailScreen extends StatefulWidget {
  final ReservationModel booking;

  const GuestBookingDetailScreen({super.key, required this.booking});

  @override
  State<GuestBookingDetailScreen> createState() => _GuestBookingDetailScreenState();
}

class _GuestBookingDetailScreenState extends State<GuestBookingDetailScreen> {
  late ReservationModel _booking;
  int _extendHours = 2;
  bool _isExtending = false;

  @override
  void initState() {
    super.initState();
    _booking = widget.booking;
  }

  Future<void> _requestExtension() async {
    setState(() => _isExtending = true);
    final provider = context.read<GuestBookingProvider>();
    final messenger = ScaffoldMessenger.of(context);

    final success = await provider.requestExtension(_booking.id, _extendHours, 'Guest requested $_extendHours additional hours');
    setState(() => _isExtending = false);

    if (success && mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Extension request for $_extendHours hours submitted to manager!'),
          backgroundColor: AppColors.success,
        ),
      );
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(content: Text(provider.errorMessage ?? 'Request failed'), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Stay #${_booking.reservationNumber}'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Room ${_booking.roomNumber}',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      StatusBadge(status: _booking.status, fontSize: 13),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Stay: ${Formatters.capitalize(_booking.stayType)}${_booking.stayType == "hourly" ? " (${_booking.hours}h)" : ""}',
                    style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Amount', style: TextStyle(color: AppColors.textSecondary)),
                      Text(
                        Formatters.currency(_booking.totalAmount),
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Payment', style: TextStyle(color: AppColors.textSecondary)),
                      StatusBadge(status: _booking.paymentStatus),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Schedule Info
            const Text(
              'Stay Timings',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.login, size: 20, color: AppColors.primary),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Check-In Time', style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                          const SizedBox(height: 2),
                          Text(Formatters.dateTime(_booking.checkIn), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ),
                  const Divider(height: 16),
                  Row(
                    children: [
                      const Icon(Icons.logout, size: 20, color: AppColors.secondary),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Check-Out Time', style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                          const SizedBox(height: 2),
                          Text(Formatters.dateTime(_booking.checkOut), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Extend Stay Box (For active hourly stays)
            if (_booking.status.toLowerCase() == 'checked_in' || _booking.status.toLowerCase() == 'confirmed') ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.secondary.withAlpha(15),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.secondary.withAlpha(60)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.more_time, color: AppColors.secondary),
                        SizedBox(width: 8),
                        Text(
                          'Need More Time?',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.secondary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Request an hourly extension without leaving your room.',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [1, 2, 3, 6].map((h) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text('+$h Hours'),
                            selected: _extendHours == h,
                            selectedColor: AppColors.secondary,
                            labelStyle: TextStyle(
                              color: _extendHours == h ? Colors.white : AppColors.textPrimary,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                            onSelected: (val) {
                              if (val) setState(() => _extendHours = h);
                            },
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 12),
                    CustomButton(
                      text: 'Request Extension (+$_extendHours Hours)',
                      backgroundColor: AppColors.secondary,
                      isLoading: _isExtending,
                      onPressed: _requestExtension,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Write Review Button if checked_out
            if (_booking.status.toLowerCase() == 'checked_out') ...[
              CustomButton(
                text: 'Leave a Review for this Stay',
                backgroundColor: AppColors.primary,
                icon: Icons.star_rate,
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => GuestAddFeedbackScreen(reservationId: _booking.id),
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
            ],
          ],
        ),
      ),
    );
  }
}
