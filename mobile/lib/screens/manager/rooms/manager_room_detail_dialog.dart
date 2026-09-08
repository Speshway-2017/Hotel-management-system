import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/room_model.dart';
import 'package:hour_stay_mobile/providers/manager/room_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_button.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';

class ManagerRoomDetailDialog extends StatefulWidget {
  final RoomModel room;

  const ManagerRoomDetailDialog({super.key, required this.room});

  static Future<void> show(BuildContext context, RoomModel room) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ManagerRoomDetailDialog(room: room),
    );
  }

  @override
  State<ManagerRoomDetailDialog> createState() => _ManagerRoomDetailDialogState();
}

class _ManagerRoomDetailDialogState extends State<ManagerRoomDetailDialog> {
  late String _currentStatus;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.room.status;
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _isLoading = true);
    final roomProvider = context.read<RoomProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    final success = await roomProvider.updateStatus(widget.room.id, status);
    setState(() => _isLoading = false);

    if (success && mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Room ${widget.room.roomNumber} set to ${Formatters.capitalize(status)}'),
          backgroundColor: AppColors.success,
        ),
      );
      navigator.pop();
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(content: Text(roomProvider.errorMessage ?? 'Update failed'), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final room = widget.room;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Room ${room.roomNumber}',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  Text(
                    '${room.type} • Floor ${room.floor}',
                    style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                  ),
                ],
              ),
              StatusBadge(status: _currentStatus, fontSize: 13),
            ],
          ),
          const SizedBox(height: 16),

          // Hourly Rates Table
          const Text(
            'Hourly & Overnight Pricing',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Base Overnight (24h)', style: TextStyle(fontWeight: FontWeight.w500)),
                    Text(Formatters.currency(room.basePrice), style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                  ],
                ),
                const Divider(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: room.rates.entries.map((e) {
                    return Column(
                      children: [
                        Text('${e.key}h', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        const SizedBox(height: 4),
                        Text(
                          '\$${e.value}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Amenities
          if (room.amenities.isNotEmpty) ...[
            const Text(
              'Amenities',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: room.amenities.map((a) {
                return Chip(
                  label: Text(a, style: const TextStyle(fontSize: 12)),
                  backgroundColor: AppColors.background,
                  padding: EdgeInsets.zero,
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
          ],

          // Quick Status Change Actions
          const Text(
            'Update Room Status',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: CustomButton(
                  text: 'Available',
                  backgroundColor: AppColors.success,
                  isLoading: _isLoading,
                  onPressed: () => _updateStatus('available'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: CustomButton(
                  text: 'Cleaning',
                  backgroundColor: AppColors.warning,
                  isLoading: _isLoading,
                  onPressed: () => _updateStatus('cleaning'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: CustomButton(
                  text: 'Maintenance',
                  backgroundColor: AppColors.error,
                  isLoading: _isLoading,
                  onPressed: () => _updateStatus('maintenance'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
