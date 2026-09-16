import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/auth_provider.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import 'package:hour_stay_mobile/providers/guest/guest_feedback_provider.dart';
import 'package:hour_stay_mobile/providers/guest/guest_folio_provider.dart';
import 'package:hour_stay_mobile/providers/guest/guest_notification_provider.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import '../bookings/guest_booking_detail_screen.dart';
import '../bookings/guest_bookings_screen.dart';
import '../feedback/guest_feedback_screen.dart';
import '../folio/guest_folio_screen.dart';
import '../search/guest_search_screen.dart';
import '../settings/guest_settings_screen.dart';

class GuestHomeScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigateTab;

  const GuestHomeScreen({
    super.key,
    this.onNavigateTab,
  });

  @override
  State<GuestHomeScreen> createState() => _GuestHomeScreenState();
}

class _GuestHomeScreenState extends State<GuestHomeScreen> {
  // Hour Stay Design Tokens matching Manager Dashboard
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
      _loadData();
    });
  }

  void _loadData() {
    context.read<GuestBookingProvider>().fetchDashboardData(silent: true);
    context.read<GuestFolioProvider>().fetchMyFolios();
    context.read<GuestFeedbackProvider>().fetchMyFeedbacks();
    context.read<GuestNotificationProvider>().fetchNotifications();
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = context.watch<GuestBookingProvider>();
    final folioProvider = context.watch<GuestFolioProvider>();
    final feedbackProvider = context.watch<GuestFeedbackProvider>();
    final authProvider = context.watch<AuthProvider>();

    final user = authProvider.user;
    final allBookings = bookingProvider.bookings;

    // Filter valid bookings (exclude cancelled/rejected/no-show)
    final validBookings = allBookings.where((b) {
      final st = b.status.trim().toLowerCase();
      return st != 'cancelled' &&
          st != 'canceled' &&
          st != 'rejected' &&
          st != 'no-show' &&
          st != 'no_show';
    }).toList();

    ReservationModel? inHouseStay;
    for (final b in validBookings) {
      final st = b.status.trim().toLowerCase();
      if (st == 'checked_in' || st == 'checked-in' || st == 'active' || st == 'staying') {
        inHouseStay = b;
        break;
      }
    }

    ReservationModel? upcomingBooking = bookingProvider.upcomingStay;
    if (upcomingBooking != null) {
      final st = upcomingBooking.status.trim().toLowerCase();
      if (st == 'cancelled' || st == 'canceled' || st == 'rejected' || st == 'no-show' || st == 'no_show') {
        upcomingBooking = null;
      }
    }
    if (upcomingBooking == null) {
      for (final b in validBookings) {
        final st = b.status.trim().toLowerCase();
        if (st == 'confirmed' || st == 'paid' || st == 'reserved' || st == 'pending' || st == 'booked') {
          upcomingBooking = b;
          break;
        }
      }
    }

    final spotlightStay = inHouseStay ?? upcomingBooking ?? (validBookings.isNotEmpty ? validBookings.first : null);

    final activeBookings = validBookings.where((b) {
      final st = b.status.trim().toLowerCase();
      return st != 'checked_out' && st != 'checked-out' && st != 'completed';
    }).toList();

    // KPI Metrics calculation
    final totalStays = bookingProvider.totalStays > 0 ? bookingProvider.totalStays : allBookings.length;
    final totalSpend = bookingProvider.totalSpent > 0
        ? bookingProvider.totalSpent
        : allBookings.fold<double>(0.0, (sum, b) => sum + b.totalAmount);
    final upcomingCount = allBookings.where((b) {
      final st = b.status.toLowerCase();
      return st == 'confirmed' || st == 'paid' || st == 'reserved';
    }).length;

    final String currentStayText = inHouseStay != null
        ? (inHouseStay.roomNumber.isNotEmpty ? 'Rm ${inHouseStay.roomNumber}' : (inHouseStay.room.isNotEmpty ? inHouseStay.room : 'Active'))
        : 'None';

    // Recent 3 Bookings
    final recentBookings = allBookings.take(3).toList();
    final bool isInitialLoading = bookingProvider.isLoading && allBookings.isEmpty;

    return Scaffold(
      backgroundColor: background,
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: () async {
          await Future.wait([
            bookingProvider.fetchDashboardData(),
            folioProvider.fetchMyFolios(),
            feedbackProvider.fetchMyFeedbacks(),
            context.read<GuestNotificationProvider>().fetchNotifications(),
          ]);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 100),
          children: [
            // 1. Redesigned Top Spotlight Card: Active / Upcoming Booking Card
            _buildTopSpotlightCard(
              context: context,
              spotlightStay: spotlightStay,
              userPropertyName: user?.propertyName,
            ),
            const SizedBox(height: 14),

            // 2. Section Header: Stay Overview KPI Section
            _buildSectionHeader(
              title: 'Stay Overview',
              subtitle: 'Your personal stays & spending metrics',
            ),
            const SizedBox(height: 8),

            // 3. Compact KPI Cards (4 Uniform Mini Metrics in a Row)
            _buildKpiRow(
              totalStays: totalStays,
              totalSpend: totalSpend,
              upcomingCount: upcomingCount,
              currentStayText: currentStayText,
            ),
            const SizedBox(height: 16),

            // 4. Section Header: Quick Actions
            _buildSectionHeader(
              title: 'Quick Actions',
              subtitle: 'Essential guest actions',
            ),
            const SizedBox(height: 8),

            // 5. Compact Quick Actions (4 Uniform Sized Buttons in a Row)
            _buildQuickActionsSection(
              context: context,
              activeBookingsCount: activeBookings.length,
              feedbackCount: feedbackProvider.feedbacks.length,
            ),
            const SizedBox(height: 18),

            // 6. Section Header: Recent Bookings (Last 3 Bookings)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _buildSectionHeader(
                  title: 'Recent Bookings',
                  subtitle: 'Your last reservations & stay history',
                ),
                TextButton.icon(
                  onPressed: () {
                    if (widget.onNavigateTab != null) {
                      widget.onNavigateTab!(2);
                    } else {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const GuestBookingsScreen()),
                      );
                    }
                  },
                  icon: const Icon(Icons.arrow_forward_rounded, size: 14, color: purple),
                  label: const Text(
                    'View All',
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

            // 7. Recent Bookings List (3 Visible)
            if (isInitialLoading)
              _buildLoadingBookingsCard()
            else if (bookingProvider.errorMessage != null && recentBookings.isEmpty)
              _buildErrorCard(context, bookingProvider.errorMessage!, () => bookingProvider.fetchDashboardData())
            else if (recentBookings.isEmpty)
              _buildEmptyBookingsCard(context)
            else
              ...recentBookings.map(
                (booking) => _buildBookingCard(context, booking),
              ),
          ],
        ),
      ),
    );
  }

  // --- 1. Redesigned Top Spotlight Card: Active / Upcoming Booking ---
  Widget _buildTopSpotlightCard({
    required BuildContext context,
    required ReservationModel? spotlightStay,
    required String? userPropertyName,
  }) {
    final bool hasStay = spotlightStay != null;

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
      child: hasStay
          ? InkWell(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => GuestBookingDetailScreen(booking: spotlightStay),
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
                        final stUpper = spotlightStay.status.toUpperCase();
                        final bool isInHouse = ['CHECKED-IN', 'CHECKED_IN', 'ACTIVE', 'STAYING'].contains(stUpper);
                        final bool isCheckedOut = ['CHECKED-OUT', 'CHECKED_OUT', 'COMPLETED'].contains(stUpper);
                        final String badgeText = isInHouse
                            ? 'CURRENT ACTIVE STAY'
                            : (isCheckedOut
                                ? 'COMPLETED STAY'
                                : (stUpper == 'CONFIRMED' ? 'UPCOMING RESERVATION' : '$stUpper RESERVATION'));
                        final Color badgeTone = isInHouse
                            ? emerald
                            : (isCheckedOut
                                ? gold
                                : (stUpper == 'CONFIRMED' ? const Color(0xFF38BDF8) : gold));

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
                                'Room ${spotlightStay.roomNumber.isNotEmpty ? spotlightStay.roomNumber : (spotlightStay.room.isNotEmpty ? spotlightStay.room : '101')}',
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

                    // Hotel / Property Name and Room Type
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                userPropertyName?.isNotEmpty == true ? userPropertyName! : 'Hour Stay Luxury Hotel',
                                style: const TextStyle(
                                  color: white,
                                  fontSize: 16.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.3,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${spotlightStay.roomType} • #${spotlightStay.bookingId}',
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
                            spotlightStay.hours != null && spotlightStay.hours! > 0
                                ? '${spotlightStay.hours}H Stay'
                                : '${spotlightStay.nights > 0 ? spotlightStay.nights : 1}N Stay (24h)',
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
                                Formatters.date(spotlightStay.checkIn),
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
                                Formatters.currency(spotlightStay.totalAmount),
                                style: const TextStyle(
                                  color: gold,
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                          Container(width: 1, height: 14, color: white.withAlpha(35)),
                          StatusBadge(status: spotlightStay.status),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),

                    // View Full Details Action
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Tap to view stay details & digital folio',
                          style: TextStyle(
                            color: cream.withAlpha(160),
                            fontSize: 9.5,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const Row(
                          children: [
                            Text(
                              'View Details',
                              style: TextStyle(
                                color: gold,
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(width: 2),
                            Icon(Icons.chevron_right_rounded, color: gold, size: 14),
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
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: cream.withAlpha(30),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: gold.withAlpha(100)),
                        ),
                        child: const Icon(Icons.hotel_rounded, size: 16, color: gold),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'No Active Booking',
                        style: TextStyle(
                          color: white,
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Book luxury rooms by the hour or reserve overnight stays with instant confirmation.',
                    style: TextStyle(color: cream.withAlpha(200), fontSize: 11),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: () {
                      if (widget.onNavigateTab != null) {
                        widget.onNavigateTab!(1);
                      } else {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const GuestSearchScreen()),
                        );
                      }
                    },
                    icon: const Icon(Icons.calendar_today_rounded, size: 13, color: gold),
                    label: const Text('Explore & Book Now', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: cream)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: navy,
                      foregroundColor: cream,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                        side: const BorderSide(color: gold),
                      ),
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
    required int totalStays,
    required double totalSpend,
    required int upcomingCount,
    required String currentStayText,
  }) {
    String spendFormatted;
    if (totalSpend >= 100000) {
      spendFormatted = '₹${(totalSpend / 100000).toStringAsFixed(1)}L';
    } else if (totalSpend >= 1000) {
      spendFormatted = '₹${(totalSpend / 1000).toStringAsFixed(1)}k';
    } else {
      spendFormatted = '₹${totalSpend.toStringAsFixed(0)}';
    }

    return Row(
      children: [
        Expanded(
          child: _buildMiniMetric(
            label: 'Total Stays',
            value: '$totalStays',
            subtitle: 'Stays',
            icon: Icons.hotel_rounded,
            color: navy,
            bgColor: cream,
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: _buildMiniMetric(
            label: 'Total Spend',
            value: spendFormatted,
            subtitle: 'Paid',
            icon: Icons.account_balance_wallet_rounded,
            color: const Color(0xFF2563EB),
            bgColor: const Color(0xFFEFF6FF),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: _buildMiniMetric(
            label: 'Upcoming',
            value: '$upcomingCount',
            subtitle: 'Stays',
            icon: Icons.login_rounded,
            color: purple,
            bgColor: const Color(0xFFF3E8FF),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: _buildMiniMetric(
            label: 'Current Stay',
            value: currentStayText,
            subtitle: 'In-House',
            icon: Icons.bed_rounded,
            color: const Color(0xFFD97706),
            bgColor: const Color(0xFFFEF3C7),
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
                fontSize: 13.5,
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

  // --- 4 Quick Action Cards in a Single Row (4 Uniform Cards) ---
  Widget _buildQuickActionsSection({
    required BuildContext context,
    required int activeBookingsCount,
    required int feedbackCount,
  }) {
    final actions = [
      _GuestQuickActionItem(
        label: 'My Bookings',
        icon: Icons.calendar_month_rounded,
        iconColor: navy,
        bgColor: const Color(0xFFFFF7E6),
        onTap: () {
          if (widget.onNavigateTab != null) {
            widget.onNavigateTab!(2);
          } else {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const GuestBookingsScreen()),
            );
          }
        },
      ),
      _GuestQuickActionItem(
        label: 'Digital Folio',
        icon: Icons.receipt_long_rounded,
        iconColor: purple,
        bgColor: const Color(0xFFF3E8FF),
        onTap: () {
          if (widget.onNavigateTab != null) {
            widget.onNavigateTab!(3);
          } else {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const GuestFolioScreen()),
            );
          }
        },
      ),
      _GuestQuickActionItem(
        label: 'Feedback',
        icon: Icons.star_rounded,
        iconColor: const Color(0xFFD97706),
        bgColor: const Color(0xFFFEF3C7),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const GuestFeedbackScreen()),
          );
        },
      ),
      _GuestQuickActionItem(
        label: 'Settings',
        icon: Icons.settings_rounded,
        iconColor: const Color(0xFF3730A3),
        bgColor: const Color(0xFFEEF2FF),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const GuestSettingsScreen()),
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

  Widget _buildQuickActionButton(_GuestQuickActionItem action) {
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
            Container(
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

  // --- 7. Recent Booking Card matching Manager Dashboard Style ---
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
                  'Room ${res.roomNumber.isNotEmpty ? res.roomNumber : '—'} (${res.roomType})',
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
                builder: (_) => GuestBookingDetailScreen(booking: res),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildEmptyBookingsCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder),
      ),
      child: Center(
        child: Column(
          children: [
            const Icon(Icons.event_note_outlined, color: muted, size: 28),
            const SizedBox(height: 6),
            const Text(
              'No recent bookings recorded yet',
              style: TextStyle(
                color: muted,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 10),
            ElevatedButton.icon(
              onPressed: () {
                if (widget.onNavigateTab != null) {
                  widget.onNavigateTab!(1);
                } else {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const GuestSearchScreen()),
                  );
                }
              },
              icon: const Icon(Icons.search_rounded, size: 13, color: gold),
              label: const Text('Book a Room', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: cream)),
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: cream,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                  side: const BorderSide(color: gold),
                ),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingBookingsCard() {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
      ),
      child: const Center(
        child: Column(
          children: [
            CircularProgressIndicator(strokeWidth: 2.5),
            SizedBox(height: 12),
            Text(
              'Loading your bookings...',
              style: TextStyle(fontSize: 12, color: muted, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorCard(BuildContext context, String message, VoidCallback onRetry) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFCA5A5)),
      ),
      child: Column(
        children: [
          const Icon(Icons.error_outline_rounded, color: Color(0xFFE53935), size: 28),
          const SizedBox(height: 8),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: Color(0xFFE53935), fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: onRetry,
            child: const Text('Tap to Retry', style: TextStyle(fontWeight: FontWeight.bold, color: navy)),
          ),
        ],
      ),
    );
  }
}

class _GuestQuickActionItem {
  final String label;
  final IconData icon;
  final Color iconColor;
  final Color bgColor;
  final VoidCallback onTap;

  _GuestQuickActionItem({
    required this.label,
    required this.icon,
    required this.iconColor,
    required this.bgColor,
    required this.onTap,
  });
}
