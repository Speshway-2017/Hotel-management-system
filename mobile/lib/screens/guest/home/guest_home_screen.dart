import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/room_model.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import 'package:hour_stay_mobile/providers/manager/room_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';

class GuestHomeScreen extends StatefulWidget {
  const GuestHomeScreen({super.key});

  @override
  State<GuestHomeScreen> createState() => _GuestHomeScreenState();
}

class _GuestHomeScreenState extends State<GuestHomeScreen> {
  String _stayType = 'hourly';
  int _selectedHours = 3;
  String _selectedCategory = 'all';

  @override
  Widget build(BuildContext context) {
    final roomProvider = context.watch<RoomProvider>();
    final availableRooms = roomProvider.rooms.where((r) => r.status.toLowerCase() == 'available').toList();

    var filteredRooms = availableRooms;
    if (_selectedCategory != 'all') {
      filteredRooms = filteredRooms.where((r) => r.type.toLowerCase().contains(_selectedCategory.toLowerCase())).toList();
    }

    return RefreshIndicator(
      onRefresh: () => roomProvider.fetchAll(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Hero Banner
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primary, Color(0xFF1E40AF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withAlpha(60),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.secondary,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'FLEXIBLE HOURLY STAYS',
                        style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const Icon(Icons.hotel_class, color: AppColors.secondary, size: 24),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Book Luxury Rooms\nBy The Hour',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Pay only for the time you stay. Enjoy premium 5-star amenities.',
                  style: TextStyle(color: Colors.white.withAlpha(200), fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Stay Type Selector
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _stayType = 'hourly'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _stayType == 'hourly' ? AppColors.primary : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          'Hourly Stays',
                          style: TextStyle(
                            color: _stayType == 'hourly' ? Colors.white : AppColors.textSecondary,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _stayType = 'overnight'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _stayType == 'overnight' ? AppColors.primary : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          'Overnight (24h)',
                          style: TextStyle(
                            color: _stayType == 'overnight' ? Colors.white : AppColors.textSecondary,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Hour selection pills (if hourly selected)
          if (_stayType == 'hourly') ...[
            const Text(
              'Select Duration',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [2, 3, 6, 12, 24].map((hours) {
                  final isSelected = _selectedHours == hours;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('$hours Hours'),
                      selected: isSelected,
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                      onSelected: (val) {
                        if (val) setState(() => _selectedHours = hours);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Room Category Filter
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildCategoryChip('All Rooms', 'all'),
                const SizedBox(width: 8),
                _buildCategoryChip('Deluxe', 'deluxe'),
                const SizedBox(width: 8),
                _buildCategoryChip('Suite', 'suite'),
                const SizedBox(width: 8),
                _buildCategoryChip('Standard', 'standard'),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Available Rooms Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Available Rooms (${filteredRooms.length})',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (roomProvider.isLoading && roomProvider.rooms.isEmpty)
            const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
          else if (filteredRooms.isEmpty)
            EmptyState(
              icon: Icons.hotel_outlined,
              title: 'No Rooms Available',
              message: 'Currently there are no rooms available matching this category.',
              actionText: 'Refresh',
              onAction: () => roomProvider.fetchAll(),
            )
          else
            ...filteredRooms.map((room) => _buildRoomCard(context, room)),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(String label, String value) {
    final isSelected = _selectedCategory == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppColors.secondary,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AppColors.textPrimary,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
      onSelected: (val) {
        if (val) setState(() => _selectedCategory = value);
      },
    );
  }

  Widget _buildRoomCard(BuildContext context, RoomModel room) {
    final price = _stayType == 'hourly'
        ? (room.rates[_selectedHours] ?? (room.basePrice / 24 * _selectedHours))
        : room.basePrice;

    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Room ${room.roomNumber}',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    Text(
                      '${room.type} • Floor ${room.floor}',
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.success.withAlpha(20),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'Available Now',
                    style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ),
              ],
            ),
            if (room.amenities.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: room.amenities.take(3).map((a) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(a, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                  );
                }).toList(),
              ),
            ],
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      Formatters.currency(price),
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                    Text(
                      _stayType == 'hourly' ? 'for $_selectedHours hours' : 'per night',
                      style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                    ),
                  ],
                ),
                ElevatedButton(
                  onPressed: () => _showBookingConfirmationDialog(context, room, price),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Book Now'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showBookingConfirmationDialog(BuildContext context, RoomModel room, double price) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Confirm Your Stay', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Room: ${room.roomNumber} (${room.type})'),
            const SizedBox(height: 4),
            Text('Stay Type: ${_stayType == "hourly" ? "$_selectedHours Hours" : "Overnight"}'),
            const SizedBox(height: 4),
            Text('Total Amount: ${Formatters.currency(price)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
            const SizedBox(height: 12),
            const Text(
              'Your booking will be reserved instantly and added to your active stays.',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              final bookingProvider = context.read<GuestBookingProvider>();
              final roomProv = context.read<RoomProvider>();
              final messenger = ScaffoldMessenger.of(context);

              final checkIn = DateTime.now();
              final checkOut = _stayType == 'hourly'
                  ? checkIn.add(Duration(hours: _selectedHours))
                  : checkIn.add(const Duration(days: 1));

              final success = await bookingProvider.bookRoom(
                roomId: room.id,
                checkIn: checkIn.toIso8601String(),
                checkOut: checkOut.toIso8601String(),
                stayType: _stayType,
                hours: _stayType == 'hourly' ? _selectedHours : null,
                totalAmount: price,
              );

              if (success && mounted) {
                messenger.showSnackBar(
                  const SnackBar(
                    content: Text('Stay booked successfully! Check My Stays tab.'),
                    backgroundColor: AppColors.success,
                  ),
                );
                roomProv.fetchAll();
              } else if (mounted) {
                messenger.showSnackBar(
                  SnackBar(
                    content: Text(bookingProvider.errorMessage ?? 'Failed to complete booking'),
                    backgroundColor: AppColors.error,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
            ),
            child: const Text('Confirm & Book'),
          ),
        ],
      ),
    );
  }
}
