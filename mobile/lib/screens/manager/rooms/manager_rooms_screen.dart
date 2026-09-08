import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/room_model.dart';
import 'package:hour_stay_mobile/providers/manager/room_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'manager_room_detail_dialog.dart';

class ManagerRoomsScreen extends StatefulWidget {
  const ManagerRoomsScreen({super.key});

  @override
  State<ManagerRoomsScreen> createState() => _ManagerRoomsScreenState();
}

class _ManagerRoomsScreenState extends State<ManagerRoomsScreen> {
  String _selectedFilter = 'all';

  @override
  Widget build(BuildContext context) {
    final roomProvider = context.watch<RoomProvider>();
    var rooms = roomProvider.rooms;

    if (_selectedFilter != 'all') {
      rooms = rooms.where((r) => r.status.toLowerCase() == _selectedFilter.toLowerCase()).toList();
    }

    final totalCount = roomProvider.rooms.length;
    final availableCount = roomProvider.rooms.where((r) => r.status.toLowerCase() == 'available').length;
    final occupiedCount = roomProvider.rooms.where((r) => r.status.toLowerCase() == 'occupied').length;
    final cleaningCount = roomProvider.rooms.where((r) => r.status.toLowerCase() == 'cleaning').length;

    return Scaffold(
      body: Column(
        children: [
          // Filter Chips summary
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: AppColors.surface,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('All ($totalCount)', 'all'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Available ($availableCount)', 'available'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Occupied ($occupiedCount)', 'occupied'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Cleaning ($cleaningCount)', 'cleaning'),
                ],
              ),
            ),
          ),
          const Divider(height: 1),

          // Rooms Grid
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => roomProvider.fetchAll(),
              child: roomProvider.isLoading && roomProvider.rooms.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : rooms.isEmpty
                      ? EmptyState(
                          icon: Icons.meeting_room_outlined,
                          title: 'No Rooms Found',
                          message: 'No rooms match the selected status filter.',
                          actionText: 'Refresh Rooms',
                          onAction: () => roomProvider.fetchAll(),
                        )
                      : GridView.builder(
                          padding: const EdgeInsets.all(16),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 0.95,
                          ),
                          itemCount: rooms.length,
                          itemBuilder: (context, index) {
                            final room = rooms[index];
                            return _buildRoomCard(room);
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoomCard(RoomModel room) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => ManagerRoomDetailDialog.show(context, room),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(20),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      room.roomNumber,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  StatusBadge(status: room.status, fontSize: 10, padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    room.type,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Floor ${room.floor} • Capacity ${room.capacity}',
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    Formatters.currency(room.basePrice),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary),
                  ),
                  const Text(
                    '/night',
                    style: TextStyle(fontSize: 10, color: AppColors.textTertiary),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : AppColors.textPrimary)),
      selected: isSelected,
      selectedColor: AppColors.primary,
      onSelected: (val) {
        if (val) setState(() => _selectedFilter = value);
      },
    );
  }
}
