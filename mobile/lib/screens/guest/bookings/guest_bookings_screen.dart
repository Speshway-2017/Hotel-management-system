import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'guest_booking_detail_screen.dart';

class GuestBookingsScreen extends StatefulWidget {
  const GuestBookingsScreen({super.key});

  @override
  State<GuestBookingsScreen> createState() => _GuestBookingsScreenState();
}

class _GuestBookingsScreenState extends State<GuestBookingsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GuestBookingProvider>().fetchMyBookings();
    });
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = context.watch<GuestBookingProvider>();
    final bookings = bookingProvider.bookings;

    final activeBookings = bookings.where((b) => b.status.toLowerCase() != 'checked_out' && b.status.toLowerCase() != 'cancelled').toList();
    final pastBookings = bookings.where((b) => b.status.toLowerCase() == 'checked_out' || b.status.toLowerCase() == 'cancelled').toList();

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            color: AppColors.surface,
            child: TabBar(
              indicatorColor: AppColors.primary,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              tabs: [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Active Stays'),
                      if (activeBookings.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${activeBookings.length}',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const Tab(text: 'Past Stays'),
              ],
            ),
          ),
        ),
        body: RefreshIndicator(
          onRefresh: () => bookingProvider.fetchMyBookings(),
          child: TabBarView(
            children: [
              // Active Tab
              bookingProvider.isLoading && bookings.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : activeBookings.isEmpty
                      ? EmptyState(
                          icon: Icons.calendar_today_outlined,
                          title: 'No Active Stays',
                          message: 'You have no active or upcoming reservations right now.',
                          actionText: 'Refresh',
                          onAction: () => bookingProvider.fetchMyBookings(),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: activeBookings.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final b = activeBookings[index];
                            return _buildStayCard(context, b);
                          },
                        ),

              // Past Tab
              pastBookings.isEmpty
                  ? EmptyState(
                      icon: Icons.history,
                      title: 'No Past Stays',
                      message: 'Completed reservations will appear here.',
                      actionText: 'Refresh',
                      onAction: () => bookingProvider.fetchMyBookings(),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: pastBookings.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final b = pastBookings[index];
                        return _buildStayCard(context, b);
                      },
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStayCard(BuildContext context, dynamic b) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => GuestBookingDetailScreen(booking: b),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
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
                          'Room ${b.roomNumber}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '#${b.reservationNumber}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                      ),
                    ],
                  ),
                  StatusBadge(status: b.status),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                '${Formatters.capitalize(b.stayType)}${b.stayType == "hourly" ? " (${b.hours} Hours)" : " (Overnight)"}',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 4),
              Text(
                'Check-In: ${Formatters.dateTime(b.checkIn)}',
                style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
              ),
              const Divider(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    Formatters.currency(b.totalAmount),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                  ),
                  const Row(
                    children: [
                      Text('View Details', style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600)),
                      SizedBox(width: 4),
                      Icon(Icons.chevron_right, size: 16, color: AppColors.primary),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
