import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/manager/reservation_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_button.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';

class ManagerReservationDetailScreen extends StatefulWidget {
  final ReservationModel reservation;

  const ManagerReservationDetailScreen({super.key, required this.reservation});

  @override
  State<ManagerReservationDetailScreen> createState() => _ManagerReservationDetailScreenState();
}

class _ManagerReservationDetailScreenState extends State<ManagerReservationDetailScreen> {
  late ReservationModel _reservation;

  @override
  void initState() {
    super.initState();
    _reservation = widget.reservation;
  }

  Future<void> _updateStatus(String newStatus) async {
    final provider = context.read<ReservationProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final success = await provider.updateStatus(_reservation.id, newStatus);
    if (success && mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Reservation status changed to ${Formatters.capitalize(newStatus)}'),
          backgroundColor: AppColors.success,
        ),
      );
      setState(() {
        _reservation = _reservation.copyWith(status: newStatus);
      });
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(provider.errorMessage ?? 'Failed to update status'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Booking #${_reservation.reservationNumber}'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header card
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
                        'Room ${_reservation.roomNumber}',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      StatusBadge(status: _reservation.status, fontSize: 13),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Stay Type: ${Formatters.capitalize(_reservation.stayType)}${_reservation.stayType == "hourly" ? " (${_reservation.hours} Hours)" : ""}',
                    style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Amount', style: TextStyle(color: AppColors.textSecondary)),
                      Text(
                        Formatters.currency(_reservation.totalAmount),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Payment Status', style: TextStyle(color: AppColors.textSecondary)),
                      StatusBadge(status: _reservation.paymentStatus),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Guest Information
            const Text(
              'Guest Details',
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
                  _buildDetailRow(Icons.person_outline, 'Guest Name', _reservation.guestName),
                  const Divider(height: 16),
                  _buildDetailRow(Icons.email_outlined, 'Email', _reservation.guestEmail),
                  const Divider(height: 16),
                  _buildDetailRow(Icons.phone_outlined, 'Phone', _reservation.guestPhone),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Timings
            const Text(
              'Stay Schedule',
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
                  _buildDetailRow(Icons.login, 'Check-In', Formatters.dateTime(_reservation.checkIn)),
                  const Divider(height: 16),
                  _buildDetailRow(Icons.logout, 'Check-Out', Formatters.dateTime(_reservation.checkOut)),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Manager Actions
            const Text(
              'Manage Reservation Status',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (_reservation.status.toLowerCase() != 'confirmed' && _reservation.status.toLowerCase() != 'checked_in')
                  CustomButton(
                    text: 'Confirm Booking',
                    backgroundColor: AppColors.primary,
                    icon: Icons.check_circle_outline,
                    onPressed: () => _updateStatus('confirmed'),
                  ),
                if (_reservation.status.toLowerCase() == 'confirmed')
                  CustomButton(
                    text: 'Check-In Guest',
                    backgroundColor: AppColors.success,
                    icon: Icons.meeting_room,
                    onPressed: () => _updateStatus('checked_in'),
                  ),
                if (_reservation.status.toLowerCase() == 'checked_in')
                  CustomButton(
                    text: 'Check-Out Guest',
                    backgroundColor: AppColors.secondary,
                    icon: Icons.key_off,
                    onPressed: () => _updateStatus('checked_out'),
                  ),
                if (_reservation.status.toLowerCase() != 'cancelled' && _reservation.status.toLowerCase() != 'checked_out')
                  CustomButton(
                    text: 'Cancel Reservation',
                    backgroundColor: AppColors.error,
                    isOutlined: true,
                    textColor: AppColors.error,
                    icon: Icons.cancel_outlined,
                    onPressed: () => _updateStatus('cancelled'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.textTertiary),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textTertiary)),
            const SizedBox(height: 2),
            Text(
              value.isNotEmpty ? value : 'N/A',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
          ],
        ),
      ],
    );
  }
}
