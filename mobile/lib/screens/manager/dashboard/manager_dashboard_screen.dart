import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/providers/manager/approval_provider.dart';
import 'package:hour_stay_mobile/providers/manager/payment_provider.dart';
import 'package:hour_stay_mobile/providers/manager/reservation_provider.dart';
import 'package:hour_stay_mobile/providers/manager/room_provider.dart';
import 'package:hour_stay_mobile/widgets/stat_card.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import '../reservations/manager_reservation_detail_screen.dart';

class ManagerDashboardScreen extends StatelessWidget {
  const ManagerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final resProvider = context.watch<ReservationProvider>();
    final roomProvider = context.watch<RoomProvider>();
    final approvalProvider = context.watch<ApprovalProvider>();
    final paymentProvider = context.watch<PaymentProvider>();

    final totalRooms = roomProvider.rooms.length;
    final occupiedRooms = roomProvider.rooms.where((r) => r.status.toLowerCase() == 'occupied').length;
    final occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toStringAsFixed(0) : '0';

    final totalRevenue = paymentProvider.totalRevenue;
    final pendingApprovals = approvalProvider.pendingCount;
    final totalReservations = resProvider.reservations.length;

    final recentReservations = resProvider.reservations.take(5).toList();

    return RefreshIndicator(
      onRefresh: () async {
        await Future.wait([
          resProvider.fetchAll(),
          roomProvider.fetchAll(),
          approvalProvider.fetchAll(),
          paymentProvider.fetchAll(),
        ]);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header Welcome Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primary, Color(0xFF1E3A8A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withAlpha(50),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Hotel Overview',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Real-time metrics, hourly bookings, and pending approvals.',
                        style: TextStyle(
                          color: Colors.white.withAlpha(200),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(30),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.analytics_outlined, color: Colors.white, size: 28),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2x2 Metric Grid
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.35,
            children: [
              StatCard(
                title: 'Occupancy Rate',
                value: '$occupancyRate%',
                icon: Icons.pie_chart_outline,
                color: AppColors.primary,
              ),
              StatCard(
                title: 'Pending Approvals',
                value: '$pendingApprovals',
                icon: Icons.verified_user_outlined,
                color: pendingApprovals > 0 ? AppColors.warning : AppColors.success,
              ),
              StatCard(
                title: 'Total Bookings',
                value: '$totalReservations',
                icon: Icons.calendar_month_outlined,
                color: AppColors.secondary,
              ),
              StatCard(
                title: 'Total Revenue',
                value: Formatters.currency(totalRevenue),
                icon: Icons.attach_money_outlined,
                color: AppColors.success,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Recent Activity Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Recent Bookings',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              if (resProvider.isLoading)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ],
          ),
          const SizedBox(height: 12),

          if (recentReservations.isEmpty)
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: const Center(
                child: Text(
                  'No recent reservations recorded yet.',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              ),
            )
          else
            ...recentReservations.map((res) {
              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: CircleAvatar(
                    backgroundColor: AppColors.primary.withAlpha(25),
                    child: Text(
                      res.roomNumber,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  title: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          res.guestName,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      StatusBadge(status: res.status),
                    ],
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text(
                        '${res.stayType == "hourly" ? "Hourly (${res.hours}h)" : "Overnight"} • ${Formatters.currency(res.totalAmount)}',
                        style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Check-in: ${Formatters.date(res.checkIn)}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                      ),
                    ],
                  ),
                  trailing: const Icon(Icons.chevron_right, color: AppColors.textTertiary),
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => ManagerReservationDetailScreen(reservation: res),
                      ),
                    );
                  },
                ),
              );
            }),
        ],
      ),
    );
  }
}
