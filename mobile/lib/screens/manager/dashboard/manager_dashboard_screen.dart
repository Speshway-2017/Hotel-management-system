import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/manager/approval_provider.dart';
import 'package:hour_stay_mobile/providers/manager/guest_provider.dart';
import 'package:hour_stay_mobile/providers/manager/manager_feedback_provider.dart';
import 'package:hour_stay_mobile/providers/manager/manager_notification_provider.dart';
import 'package:hour_stay_mobile/providers/manager/payment_provider.dart';
import 'package:hour_stay_mobile/providers/manager/reservation_provider.dart';
import 'package:hour_stay_mobile/providers/manager/room_provider.dart';
import 'package:hour_stay_mobile/providers/manager/staff_provider.dart';
import 'package:hour_stay_mobile/widgets/server_config_dialog.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import '../feedback/manager_feedback_screen.dart';
import '../guests/manager_guests_screen.dart';
import '../operations/manager_today_operations_screen.dart';
import '../reservations/manager_create_reservation_screen.dart';
import '../reservations/manager_reservation_detail_screen.dart';
import '../staff/manager_staff_screen.dart';

class ManagerDashboardScreen extends StatefulWidget {
  const ManagerDashboardScreen({super.key});

  @override
  State<ManagerDashboardScreen> createState() => _ManagerDashboardScreenState();
}

class _ManagerDashboardScreenState extends State<ManagerDashboardScreen> {
  // Hour Stay Design Tokens
  static const Color navy = Color(0xFF0D1B2A);
  static const Color purple = Color(0xFF5B21B6);
  static const Color gold = Color(0xFFF5C06A);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color white = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF8A8F98);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color emerald = Color(0xFF10B981);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _ensureDataLoaded();
    });
  }

  void _ensureDataLoaded() {
    context.read<ReservationProvider>().fetchAll(silent: true);
    context.read<RoomProvider>().fetchAll(silent: true);
    context.read<ApprovalProvider>().fetchAll(silent: true);
    context.read<PaymentProvider>().fetchAll(silent: true);
    context.read<ManagerFeedbackProvider>().fetchAll(silent: true);
    context.read<GuestProvider>().fetchGuests(silent: true);
    context.read<StaffProvider>().fetchAll(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final resProvider = context.watch<ReservationProvider>();
    final roomProvider = context.watch<RoomProvider>();
    final approvalProvider = context.watch<ApprovalProvider>();
    final paymentProvider = context.watch<PaymentProvider>();
    final guestProvider = context.watch<GuestProvider>();
    final feedbackProvider = context.watch<ManagerFeedbackProvider>();
    final staffProvider = context.watch<StaffProvider>();

    final pendingApprovals = approvalProvider.pendingCount;

    // Active in-house stays
    final inHouseReservations = resProvider.reservations.where((r) {
      final st = r.status.toLowerCase();
      return st == 'checked-in' || st == 'checked_in' || st == 'active' || st == 'staying';
    }).toList();

    final inHouseCount = inHouseReservations.length;

    // Today's operational metrics (Today's Arrivals, Departures & Revenue strictly for today)
    final todayArrivals = resProvider.reservations.where((r) {
      final st = r.status.toLowerCase();
      if (st == 'cancelled' || st == 'rejected' || st == 'no-show' || st == 'no_show') {
        return false;
      }
      return Formatters.isToday(r.checkIn);
    }).length;

    final todayDepartures = resProvider.reservations.where((r) {
      final st = r.status.toLowerCase();
      if (st == 'cancelled' || st == 'rejected' || st == 'no-show' || st == 'no_show') {
        return false;
      }
      return Formatters.isToday(r.checkOut);
    }).length;

    // Calculate today's revenue (from completed payments today or today's checked-in/settled stays)
    double todayRevenue = paymentProvider.payments
        .where((p) => p.isCompleted && Formatters.isToday(p.createdAt))
        .fold(0.0, (acc, p) => acc + p.amount);

    if (todayRevenue == 0.0) {
      todayRevenue = resProvider.reservations
          .where((r) => (Formatters.isToday(r.checkIn) || Formatters.isToday(r.createdAt)) && ['paid', 'checked-in', 'checked_in', 'completed', 'confirmed'].contains(r.status.toLowerCase()))
          .fold(0.0, (acc, r) => acc + r.totalAmount);
    }

    // Active Spotlight Reservation for the top card (Spotlights latest/active reservation)
    final ReservationModel? spotlightReservation = resProvider.reservations.isNotEmpty
        ? resProvider.reservations.first
        : (inHouseReservations.isNotEmpty ? inHouseReservations.first : null);

    final feedbackCount = feedbackProvider.unreadCount;
    final recentReservations = resProvider.reservations.take(6).toList();
    final isInitialLoading = resProvider.isLoading && resProvider.reservations.isEmpty;

    return Scaffold(
      backgroundColor: background,
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: () async {
          await Future.wait([
            resProvider.fetchAll(),
            roomProvider.fetchAll(),
            approvalProvider.fetchAll(),
            paymentProvider.fetchAll(),
            guestProvider.fetchGuests(),
            feedbackProvider.fetchAll(),
            staffProvider.fetchAll(),
            context.read<ManagerNotificationProvider>().fetchNotifications(),
          ]);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 100),
          children: [
            // 1. Redesigned Top Spotlight Card (Active / Latest Booking Details)
            _buildTopSpotlightCard(
              context: context,
              activeReservation: spotlightReservation,
            ),
            const SizedBox(height: 14),

            // 2. Section Header: Today's Operations KPI Section
            _buildSectionHeader(
              title: "Today's Operations",
              subtitle: 'Live daily operational pulse & turns',
            ),
            const SizedBox(height: 8),

            // 3. Compact KPI Cards for Today's Operations
            _buildKpiRow(
              arrivals: todayArrivals,
              departures: todayDepartures,
              inHouse: inHouseCount,
              todayRevenue: todayRevenue,
            ),
            const SizedBox(height: 16),

            // 4. Section Header: Quick Actions
            _buildSectionHeader(
              title: 'Quick Actions',
              subtitle: 'Operations & Management Tools',
            ),
            const SizedBox(height: 8),

            // 5. Compact Quick Actions (Uniform Sized Cards)
            _buildQuickActionsSection(
              context: context,
              pendingApprovals: pendingApprovals,
              feedbackCount: feedbackCount,
              resProvider: resProvider,
              roomProvider: roomProvider,
              paymentProvider: paymentProvider,
            ),
            const SizedBox(height: 18),

            // 6. Recent Bookings Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _buildSectionHeader(
                  title: 'Recent Bookings',
                  subtitle: 'Latest guest reservations & stays',
                ),
                TextButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const ManagerCreateReservationScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.add, size: 14, color: purple),
                  label: const Text(
                    'New Booking',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: purple,
                    ),
                  ),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // 7. Recent Bookings List
            if (isInitialLoading)
              _buildLoadingBookingsCard()
            else if (resProvider.errorMessage != null && recentReservations.isEmpty)
              _buildErrorCard(context, resProvider.errorMessage!, () => resProvider.fetchAll())
            else if (recentReservations.isEmpty)
              _buildEmptyBookingsCard()
            else
              ...recentReservations.map(
                (res) => _buildBookingCard(context, res),
              ),
          ],
        ),
      ),
    );
  }

  // --- Redesigned Top Card: Active / Latest Reservation Spotlight ---
  Widget _buildTopSpotlightCard({
    required BuildContext context,
    required ReservationModel? activeReservation,
  }) {
    final bool hasReservation = activeReservation != null && activeReservation.guest.isNotEmpty;

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [navy, Color(0xFF1E1B4B), Color(0xFF3B1D70)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: gold.withAlpha(75),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(80),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: hasReservation
          ? InkWell(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => ManagerReservationDetailScreen(reservation: activeReservation),
                  ),
                );
              },
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Badge row: Active stay indicator + Room number
                    Builder(
                      builder: (context) {
                        final stUpper = activeReservation.status.toUpperCase();
                        final bool isInHouse = ['CHECKED-IN', 'CHECKED_IN', 'ACTIVE', 'STAYING'].contains(stUpper);
                        final String badgeText = isInHouse
                            ? 'ACTIVE IN-HOUSE GUEST'
                            : (stUpper == 'CONFIRMED' ? 'LATEST RESERVATION' : '$stUpper RESERVATION');
                        final Color badgeTone = isInHouse
                            ? emerald
                            : (stUpper == 'CONFIRMED' ? const Color(0xFF38BDF8) : gold);

                        return Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                              decoration: BoxDecoration(
                                color: badgeTone.withAlpha(30),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: badgeTone.withAlpha(120),
                                  width: 0.9,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 5,
                                    height: 5,
                                    decoration: BoxDecoration(
                                      color: badgeTone,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    badgeText,
                                    style: TextStyle(
                                      color: badgeTone,
                                      fontSize: 8.5,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                              decoration: BoxDecoration(
                                color: cream,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: gold, width: 1),
                                boxShadow: [
                                  BoxShadow(
                                    color: gold.withAlpha(40),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                              ),
                              child: Text(
                                'Room ${activeReservation.roomNumber.isNotEmpty ? activeReservation.roomNumber : (activeReservation.room.isNotEmpty ? activeReservation.room : '101')}',
                                style: const TextStyle(
                                  color: navy,
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 8),

                    // Guest Name and Room Type
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                activeReservation.guestName,
                                style: const TextStyle(
                                  color: white,
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.3,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${activeReservation.roomType} • ${activeReservation.bookingId}',
                                style: TextStyle(
                                  color: cream.withAlpha(200),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: white.withAlpha(20),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: white.withAlpha(35)),
                          ),
                          child: Text(
                            '${activeReservation.nights > 0 ? activeReservation.nights : 1}N Stay (24h)',
                            style: const TextStyle(
                              color: gold,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Stay Details Pill Container
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: white.withAlpha(15),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: white.withAlpha(30)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.login_rounded, color: cream, size: 13),
                              const SizedBox(width: 4),
                              Text(
                                Formatters.date(activeReservation.checkIn),
                                style: const TextStyle(
                                  color: white,
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          Container(width: 1, height: 14, color: white.withAlpha(35)),
                          Row(
                            children: [
                              const Icon(Icons.payments_outlined, color: gold, size: 13),
                              const SizedBox(width: 4),
                              Text(
                                Formatters.currency(activeReservation.totalAmount),
                                style: const TextStyle(
                                  color: gold,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                          Container(width: 1, height: 14, color: white.withAlpha(35)),
                          StatusBadge(status: activeReservation.status),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),

                    // View Full Folio & Actions Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Tap to manage stay & room assignments',
                          style: TextStyle(
                            color: cream.withAlpha(160),
                            fontSize: 9.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Row(
                          children: [
                            const Text(
                              'View Details',
                              style: TextStyle(
                                color: gold,
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(width: 2),
                            const Icon(Icons.chevron_right_rounded, color: gold, size: 14),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            )
          : Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'No Active In-House Stays',
                    style: TextStyle(
                      color: white,
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Ready for new check-ins and hourly turns today.',
                    style: TextStyle(color: cream.withAlpha(200), fontSize: 11),
                  ),
                  const SizedBox(height: 10),
                  ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const ManagerCreateReservationScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.add, size: 14, color: navy),
                    label: const Text('New Reservation', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: navy)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: gold,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  // --- Section Header Helper ---
  Widget _buildSectionHeader({
    required String title,
    String? subtitle,
    Widget? trailing,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w800,
                color: navy,
                letterSpacing: -0.2,
              ),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 1),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 10.5,
                  color: muted,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        ),
        ?trailing,
      ],
    );
  }

  // --- 4 KPI Cards in a Single Row (Uniform Mini Metrics) ---
  Widget _buildKpiRow({
    required int arrivals,
    required int departures,
    required int inHouse,
    required double todayRevenue,
  }) {
    String revFormatted;
    if (todayRevenue >= 100000) {
      revFormatted = '₹${(todayRevenue / 100000).toStringAsFixed(1)}L';
    } else if (todayRevenue >= 1000) {
      revFormatted = '₹${(todayRevenue / 1000).toStringAsFixed(1)}k';
    } else {
      revFormatted = '₹${todayRevenue.toStringAsFixed(0)}';
    }

    return Row(
      children: [
        Expanded(
          child: _buildMiniMetric(
            label: 'Arrivals',
            value: '$arrivals',
            subtitle: 'Today',
            icon: Icons.login_rounded,
            color: purple,
            bgColor: const Color(0xFFF3E8FF),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: _buildMiniMetric(
            label: 'Departures',
            value: '$departures',
            subtitle: 'Today',
            icon: Icons.logout_rounded,
            color: const Color(0xFFD97706),
            bgColor: const Color(0xFFFEF3C7),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: _buildMiniMetric(
            label: 'In-House',
            value: '$inHouse',
            subtitle: 'Active',
            icon: Icons.hotel_rounded,
            color: navy,
            bgColor: cream,
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: _buildMiniMetric(
            label: 'Today Rev',
            value: revFormatted,
            subtitle: 'Sales',
            icon: Icons.account_balance_wallet_rounded,
            color: const Color(0xFF2563EB),
            bgColor: const Color(0xFFEFF6FF),
          ),
        ),
      ],
    );
  }

  Widget _buildMiniMetric({
    required String label,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 8),
      decoration: BoxDecoration(
        color: bgColor.withAlpha(120),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withAlpha(60),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(4),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(3.5),
                decoration: BoxDecoration(
                  color: white,
                  borderRadius: BorderRadius.circular(6),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(10),
                      blurRadius: 2,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Icon(icon, size: 11, color: color),
              ),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 8.5,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: color == navy ? navy : color,
                letterSpacing: -0.3,
                height: 1.0,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              color: Color(0xFF334155),
            ),
          ),
        ],
      ),
    );
  }

  // --- 4 Quick Action Cards in a Single Row (4 Cards Per Row) ---
  Widget _buildQuickActionsSection({
    required BuildContext context,
    required int pendingApprovals,
    required int feedbackCount,
    required ReservationProvider resProvider,
    required RoomProvider roomProvider,
    required PaymentProvider paymentProvider,
  }) {
    final actions = [
      _QuickActionItem(
        label: "Today's Ops",
        icon: Icons.speed_rounded,
        iconColor: navy,
        bgColor: const Color(0xFFFFF7E6),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const ManagerTodayOperationsScreen(),
            ),
          );
        },
      ),
      _QuickActionItem(
        label: 'Guests',
        icon: Icons.people_alt_rounded,
        iconColor: purple,
        bgColor: const Color(0xFFF3E8FF),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ManagerGuestsScreen()),
          );
        },
      ),
      _QuickActionItem(
        label: 'Staff & Shifts',
        icon: Icons.badge_rounded,
        iconColor: const Color(0xFF3730A3),
        bgColor: const Color(0xFFEEF2FF),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ManagerStaffScreen(initialIndex: 0)),
          );
        },
      ),
      _QuickActionItem(
        label: 'Feedback',
        icon: Icons.star_rounded,
        iconColor: const Color(0xFFD97706),
        bgColor: const Color(0xFFFEF3C7),
        badgeCount: feedbackCount,
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ManagerFeedbackScreen()),
          );
        },
      ),
    ];

    return Row(
      children: actions
          .map(
            (act) => Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: _buildQuickActionButton(act),
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildQuickActionButton(_QuickActionItem action) {
    return InkWell(
      onTap: action.onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 60,
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 3),
        decoration: BoxDecoration(
          color: white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: action.iconColor.withAlpha(30),
            width: 1.0,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(4),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Badge(
              isLabelVisible: (action.badgeCount ?? 0) > 0,
              backgroundColor: const Color(0xFFE53935),
              label: Text(
                '${action.badgeCount}',
                style: const TextStyle(fontSize: 7, fontWeight: FontWeight.bold),
              ),
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: action.bgColor,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: action.iconColor.withAlpha(35),
                    width: 1.0,
                  ),
                ),
                child: Center(
                  child: Icon(
                    action.icon,
                    color: action.iconColor,
                    size: 12,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 3.5),
            Text(
              action.label,
              style: const TextStyle(
                fontSize: 9.5,
                fontWeight: FontWeight.w700,
                color: navy,
                letterSpacing: -0.2,
                height: 1.0,
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  // --- Booking Card ---
  Widget _buildBookingCard(BuildContext context, ReservationModel res) {
    final isHourly = res.stayType.toLowerCase() == 'hourly';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder, width: 1.0),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(5),
            blurRadius: 5,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          leading: Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: isHourly ? const Color(0xFFF3E8FF) : const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(9),
              border: Border.all(
                color: isHourly ? purple.withAlpha(50) : const Color(0xFF2563EB).withAlpha(50),
              ),
            ),
            child: Center(
              child: Text(
                res.roomNumber.isNotEmpty ? res.roomNumber : '?',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  color: isHourly ? purple : const Color(0xFF2563EB),
                  fontSize: 11.5,
                ),
              ),
            ),
          ),
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  res.guestName,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13.5,
                    color: navy,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              StatusBadge(status: res.status),
            ],
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: isHourly ? purple.withAlpha(15) : navy.withAlpha(10),
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: Text(
                        isHourly ? 'Hourly (${res.hours ?? 3}h)' : 'Overnight (${res.nights}n)',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          color: isHourly ? purple : navy,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      Formatters.currency(res.totalAmount),
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: emerald,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  'Check-in: ${Formatters.checkInDateTime(res.checkIn)}',
                  style: const TextStyle(fontSize: 10, color: muted),
                ),
              ],
            ),
          ),
          trailing: const Icon(Icons.chevron_right_rounded, color: muted, size: 18),
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => ManagerReservationDetailScreen(reservation: res),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildEmptyBookingsCard() {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder),
      ),
      child: const Center(
        child: Column(
          children: [
            Icon(Icons.event_note_outlined, color: muted, size: 28),
            SizedBox(height: 6),
            Text(
              'No recent bookings recorded yet',
              style: TextStyle(
                color: muted,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingBookingsCard() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder),
      ),
      child: const Center(
        child: Column(
          children: [
            SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2.2, color: purple),
            ),
            SizedBox(height: 10),
            Text(
              'Fetching real-time records from database...',
              style: TextStyle(
                color: muted,
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorCard(BuildContext context, String message, VoidCallback onRetry) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.cloud_off_rounded, color: Color(0xFFDC2626), size: 22),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Could not connect to database',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF991B1B),
                        fontSize: 12.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      message,
                      style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 11),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              OutlinedButton.icon(
                onPressed: () => ServerConfigDialog.show(context),
                icon: const Icon(Icons.tune_rounded, size: 13, color: navy),
                label: const Text('Server Settings', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: navy)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  side: BorderSide(color: navy.withAlpha(60)),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 14, color: white),
                label: const Text('Retry Connection', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: white)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: purple,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuickActionItem {
  final String label;
  final IconData icon;
  final Color iconColor;
  final Color bgColor;
  final VoidCallback onTap;
  final int? badgeCount;

  const _QuickActionItem({
    required this.label,
    required this.icon,
    required this.iconColor,
    required this.bgColor,
    required this.onTap,
    this.badgeCount,
  });
}
