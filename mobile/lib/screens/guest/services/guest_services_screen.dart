import 'package:flutter/material.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';

class GuestServicesScreen extends StatelessWidget {
  const GuestServicesScreen({super.key});

  final List<Map<String, dynamic>> _services = const [
    {
      'title': 'Room Cleaning & Housekeeping',
      'desc': 'Request fresh linens, towels, or full room cleaning.',
      'icon': Icons.cleaning_services_outlined,
      'color': AppColors.primary,
    },
    {
      'title': 'In-Room Dining',
      'desc': 'Order gourmet meals, snacks, and refreshing beverages.',
      'icon': Icons.restaurant_outlined,
      'color': AppColors.secondary,
    },
    {
      'title': 'Luggage & Bellhop Assistance',
      'desc': 'Assistance with your bags upon check-in or departure.',
      'icon': Icons.luggage_outlined,
      'color': AppColors.success,
    },
    {
      'title': 'Wake-up Call & Concierge',
      'desc': 'Set an automated wake-up call or speak with the concierge.',
      'icon': Icons.alarm_outlined,
      'color': AppColors.warning,
    },
    {
      'title': 'Extra Amenities & Toiletries',
      'desc': 'Request additional pillows, dental kits, or bathrobes.',
      'icon': Icons.bathtub_outlined,
      'color': AppColors.primary,
    },
    {
      'title': 'Airport & City Transfer',
      'desc': 'Schedule private taxi or luxury chauffeur service.',
      'icon': Icons.directions_car_outlined,
      'color': AppColors.secondary,
    },
  ];

  void _requestService(BuildContext context, String serviceName) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Request $serviceName'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Enter any special instructions for the front desk staff:'),
            SizedBox(height: 12),
            TextField(
              decoration: InputDecoration(
                hintText: 'e.g. Please bring at 3:00 PM',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('$serviceName requested! Front desk notified.'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            child: const Text('Submit Request'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primary.withAlpha(15),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.primary.withAlpha(40)),
            ),
            child: const Row(
              children: [
                Icon(Icons.room_service, color: AppColors.primary, size: 32),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Hotel Concierge & Services', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      SizedBox(height: 2),
                      Text('Instant requests directly dispatched to the hotel staff on duty.', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          ..._services.map((s) {
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: (s['color'] as Color).withAlpha(25),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(s['icon'] as IconData, color: s['color'] as Color, size: 22),
                ),
                title: Text(s['title'] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(s['desc'] as String, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                ),
                trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textTertiary),
                onTap: () => _requestService(context, s['title'] as String),
              ),
            );
          }),
        ],
      ),
    );
  }
}
