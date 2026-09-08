import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/providers/manager/reservation_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'manager_create_reservation_screen.dart';
import 'manager_reservation_detail_screen.dart';

class ManagerReservationsScreen extends StatefulWidget {
  const ManagerReservationsScreen({super.key});

  @override
  State<ManagerReservationsScreen> createState() => _ManagerReservationsScreenState();
}

class _ManagerReservationsScreenState extends State<ManagerReservationsScreen> {
  String _selectedFilter = 'all';
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ReservationProvider>();

    var list = provider.reservations;
    if (_selectedFilter != 'all') {
      list = list.where((r) => r.status.toLowerCase() == _selectedFilter.toLowerCase()).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((r) =>
        r.guestName.toLowerCase().contains(q) ||
        r.roomNumber.toLowerCase().contains(q) ||
        r.reservationNumber.toLowerCase().contains(q)
      ).toList();
    }

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Booking', style: TextStyle(color: Colors.white)),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ManagerCreateReservationScreen()),
          );
        },
      ),
      body: Column(
        children: [
          // Search & Filters bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppColors.surface,
            child: Column(
              children: [
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Search guest, room, or booking #...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onChanged: (v) => setState(() => _searchQuery = v),
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All', 'all'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Pending', 'pending'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Confirmed', 'confirmed'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Checked In', 'checked_in'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Checked Out', 'checked_out'),
                      const SizedBox(width: 6),
                      _buildFilterChip('Cancelled', 'cancelled'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: RefreshIndicator(
              onRefresh: () => provider.fetchAll(),
              child: provider.isLoading && provider.reservations.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : list.isEmpty
                      ? EmptyState(
                          icon: Icons.book_online_outlined,
                          title: 'No Reservations Found',
                          message: _searchQuery.isNotEmpty || _selectedFilter != 'all'
                              ? 'No bookings match your current filter criteria.'
                              : 'No reservations have been made yet.',
                          actionText: 'Refresh',
                          onAction: () => provider.fetchAll(),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: list.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final res = list[index];
                            return Card(
                              child: InkWell(
                                borderRadius: BorderRadius.circular(12),
                                onTap: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => ManagerReservationDetailScreen(reservation: res),
                                    ),
                                  );
                                },
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Row(
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: AppColors.primary.withAlpha(20),
                                                  borderRadius: BorderRadius.circular(6),
                                                ),
                                                child: Text(
                                                  'Room ${res.roomNumber}',
                                                  style: const TextStyle(
                                                    fontWeight: FontWeight.bold,
                                                    color: AppColors.primary,
                                                    fontSize: 12,
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Text(
                                                '#${res.reservationNumber}',
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  color: AppColors.textTertiary,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                              ),
                                            ],
                                          ),
                                          StatusBadge(status: res.status),
                                        ],
                                      ),
                                      const SizedBox(height: 10),
                                      Text(
                                        res.guestName,
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${Formatters.capitalize(res.stayType)}${res.stayType == "hourly" ? " (${res.hours}h)" : ""} • ${Formatters.date(res.checkIn)}',
                                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                      ),
                                      const Divider(height: 16),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            Formatters.currency(res.totalAmount),
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 15,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                          StatusBadge(
                                            status: res.paymentStatus,
                                            fontSize: 10,
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ),
        ],
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
