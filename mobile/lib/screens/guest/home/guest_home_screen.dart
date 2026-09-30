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
import '../../auth/login_screen.dart';
import '../bookings/guest_booking_detail_screen.dart';
import '../bookings/guest_bookings_screen.dart';
import '../feedback/guest_feedback_screen.dart';
import '../folio/guest_folio_screen.dart';
import '../search/guest_search_screen.dart';
import 'package:hour_stay_mobile/colours.dart';

class GuestHomeScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigateTab;
  final bool? isGuestMode;

  const GuestHomeScreen({
    super.key,
    this.onNavigateTab,
    this.isGuestMode,
  });

  @override
  State<GuestHomeScreen> createState() => _GuestHomeScreenState();
}

class _GuestHomeScreenState extends State<GuestHomeScreen> {

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    final user = context.read<AuthProvider>().user;
    if (user != null) {
      context.read<GuestBookingProvider>().fetchDashboardData(silent: true);
      context.read<GuestFolioProvider>().fetchMyFolios();
      context.read<GuestFeedbackProvider>().fetchMyFeedbacks();
      context.read<GuestNotificationProvider>().fetchNotifications();
    }
  }

  void _onBookStayTapped(BuildContext context) {
    if (widget.onNavigateTab != null) {
      widget.onNavigateTab!(1); // Navigate to Search / Book Stay tab
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const GuestSearchScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = context.watch<GuestBookingProvider>();
    final folioProvider = context.watch<GuestFolioProvider>();
    final feedbackProvider = context.watch<GuestFeedbackProvider>();
    final authProvider = context.watch<AuthProvider>();

    final user = authProvider.user;
    final bool isGuestMode = widget.isGuestMode ?? (user == null);
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

    // Collect active stays: Current in-house stays first, followed by upcoming reservations
    final List<ReservationModel> activeStays = [];

    // 1. Current / In-house stays first
    for (final b in validBookings) {
      final st = b.status.trim().toLowerCase();
      if (st == 'checked_in' || st == 'checked-in' || st == 'active' || st == 'staying' || st == 'in-house') {
        activeStays.add(b);
      }
    }

    // 2. Upcoming stays next (avoiding duplicates)
    for (final b in validBookings) {
      final st = b.status.trim().toLowerCase();
      if (st == 'confirmed' || st == 'paid' || st == 'reserved' || st == 'pending' || st == 'booked') {
        final alreadyAdded = activeStays.any((item) {
          if (item.id.isNotEmpty && b.id.isNotEmpty && item.id == b.id) return true;
          if (item.bookingId.isNotEmpty && b.bookingId.isNotEmpty && item.bookingId == b.bookingId) return true;
          return false;
        });
        if (!alreadyAdded) {
          activeStays.add(b);
        }
      }
    }

    final activeBookings = validBookings.where((b) {
      final st = b.status.trim().toLowerCase();
      return st != 'checked_out' && st != 'checked-out' && st != 'completed';
    }).toList();

    // Recent 3 Bookings
    final recentBookings = allBookings.take(3).toList();
    final bool isInitialLoading = bookingProvider.isLoading && allBookings.isEmpty;

    return Scaffold(
      backgroundColor: background,
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: () async {
          if (user != null) {
            await Future.wait([
              bookingProvider.fetchDashboardData(),
              folioProvider.fetchMyFolios(),
              feedbackProvider.fetchMyFeedbacks(),
              context.read<GuestNotificationProvider>().fetchNotifications(),
            ]);
          }
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 100),
          children: [
            if (isGuestMode) ...[
              // 1. Guest Mode Features & Services Showcase (Replaces Quick Actions & Recent Bookings)
              _buildFeaturesAndServicesSection(context),
            ] else ...[
              // 1. Active / Upcoming Stays Carousel (Hidden if no active stays)
              if (activeStays.isNotEmpty) ...[
                GuestStaysCarousel(
                  stays: activeStays,
                  userPropertyName: user?.propertyName,
                ),
                const SizedBox(height: 16),
              ],

              // 2. Section Header: Quick Actions
              _buildSectionHeader(
                title: 'Quick Actions',
                subtitle: 'Essential guest actions',
              ),
              const SizedBox(height: 8),

              // 3. Compact Quick Actions (4 Uniform Sized Buttons in a Row)
              _buildQuickActionsSection(
                context: context,
                activeBookingsCount: activeBookings.length,
                feedbackCount: feedbackProvider.feedbacks.length,
              ),
              const SizedBox(height: 18),

              // 4. Section Header: Recent Bookings (Last 3 Bookings)
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
                        widget.onNavigateTab!(0);
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

              // 5. Recent Bookings List (3 Visible)
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

  // --- 4 Fixed Luxury Quick Action Cards in a Single Row ---
  Widget _buildQuickActionsSection({
    required BuildContext context,
    required int activeBookingsCount,
    required int feedbackCount,
  }) {
    final user = context.read<AuthProvider>().user;
    final actions = [
      _GuestQuickActionItem(
        label: 'Bookings',
        subtitle: 'My Stays',
        icon: Icons.calendar_month_rounded,
        gradientColors: const [Color(0xFF0D1B2A), Color(0xFF1E293B)],
        accentColor: navy,
        badgeText: activeBookingsCount > 0 ? '$activeBookingsCount' : null,
        badgeBgColor: gold,
        badgeTextColor: navy,
        onTap: () {
          if (user == null) {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          } else if (widget.onNavigateTab != null) {
            widget.onNavigateTab!(0);
          } else {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const GuestBookingsScreen()),
            );
          }
        },
      ),
      _GuestQuickActionItem(
        label: 'Search',
        subtitle: 'Explore',
        icon: Icons.travel_explore_rounded,
        gradientColors: const [Color(0xFF4F46E5), Color(0xFF7C3AED)],
        accentColor: const Color(0xFF4F46E5),
        onTap: () {
          if (widget.onNavigateTab != null) {
            widget.onNavigateTab!(1);
          } else {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const GuestSearchScreen()),
            );
          }
        },
      ),
      _GuestQuickActionItem(
        label: 'Folio',
        subtitle: 'Invoices',
        icon: Icons.receipt_long_rounded,
        gradientColors: const [Color(0xFF059669), Color(0xFF10B981)],
        accentColor: const Color(0xFF059669),
        onTap: () {
          if (user == null) {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          } else if (widget.onNavigateTab != null) {
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
        subtitle: 'Reviews',
        icon: Icons.star_rounded,
        gradientColors: const [Color(0xFFD97706), Color(0xFFF59E0B)],
        accentColor: const Color(0xFFD97706),
        badgeText: feedbackCount > 0 ? '$feedbackCount' : null,
        badgeBgColor: const Color(0xFFFEF3C7),
        badgeTextColor: const Color(0xFFB45309),
        onTap: () {
          if (user == null) {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          } else {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const GuestFeedbackScreen()),
            );
          }
        },
      ),
    ];

    return Row(
      children: actions
          .map(
            (action) => Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3.5),
                child: _buildQuickActionCard(action),
              ),
            ),
          )
          .toList(),
    );
  }

  Widget _buildQuickActionCard(_GuestQuickActionItem item) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: item.onTap,
        borderRadius: BorderRadius.circular(14),
        splashColor: item.accentColor.withAlpha(25),
        highlightColor: item.accentColor.withAlpha(12),
        child: Ink(
          height: 80,
          decoration: BoxDecoration(
            color: white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: cardBorder,
              width: 1.1,
            ),
            boxShadow: [
              BoxShadow(
                color: navy.withAlpha(8),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Gradient Icon Box with Optional Notification Badge
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 34,
                    height: 34,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: item.gradientColors,
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: item.gradientColors.first.withAlpha(50),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Icon(
                        item.icon,
                        color: Colors.white,
                        size: 18,
                      ),
                    ),
                  ),
                  if (item.badgeText != null)
                    Positioned(
                      top: -4,
                      right: -6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4.5, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: item.badgeBgColor ?? gold,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: white, width: 1.2),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(30),
                              blurRadius: 3,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Text(
                          item.badgeText!,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            color: item.badgeTextColor ?? navy,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              // Card Label
              Text(
                item.label,
                style: const TextStyle(
                  fontSize: 11,
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
      ),
    );
  }

  // --- 7. Recent Booking Card matching Premium Card Style ---
  Widget _buildBookingCard(BuildContext context, ReservationModel res) {
    final isHourly = res.stayType.toLowerCase() == 'hourly';
    final isCurrent = res.status.toLowerCase() == 'checked-in' || res.status.toLowerCase() == 'checked_in';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCurrent ? emerald.withAlpha(90) : cardBorder,
          width: isCurrent ? 1.5 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: isCurrent ? emerald.withAlpha(15) : navy.withAlpha(6),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            final user = context.read<AuthProvider>().user;
            if (user == null) {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              );
            } else {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => GuestBookingDetailScreen(booking: res),
                ),
              );
            }
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Room Badge, Booking Reference & Status Badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                          decoration: BoxDecoration(
                            color: isHourly ? const Color(0xFFF3E8FF) : const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isHourly
                                  ? purple.withAlpha(50)
                                  : const Color(0xFF2563EB).withAlpha(50),
                            ),
                          ),
                          child: Text(
                            res.roomNumber.isNotEmpty ? 'Room ${res.roomNumber}' : 'Room —',
                            style: TextStyle(
                              color: isHourly ? purple : const Color(0xFF1E40AF),
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '#${res.reservationNumber.isNotEmpty ? res.reservationNumber : res.bookingId}',
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: muted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    StatusBadge(status: res.status),
                  ],
                ),
                const SizedBox(height: 12),

                // Hotel Name, Room Category & Duration Pill
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            res.propertyName.isNotEmpty ? res.propertyName : 'Hour Stay Luxury Hotel',
                            style: const TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: navy,
                              letterSpacing: -0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            res.roomType.isNotEmpty ? res.roomType : 'Standard Room',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF64748B),
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isHourly ? purple.withAlpha(15) : navy.withAlpha(10),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isHourly
                            ? 'Hourly (${res.hours ?? 3}h)'
                            : '${res.nights > 0 ? res.nights : 1}N Stay (24h)',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: isHourly ? purple : navy,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Schedule & Tariff Footer Container
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.login_rounded, size: 13, color: Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Text(
                            Formatters.checkInDateTime(res.checkIn),
                            style: const TextStyle(
                              fontSize: 11,
                              color: navy,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        Formatters.currency(res.totalAmount),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: emerald,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
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
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(6),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: slateBg,
              shape: BoxShape.circle,
              border: Border.all(color: gold.withAlpha(120), width: 1.2),
            ),
            child: const Icon(Icons.sync_problem_rounded, color: navy, size: 22),
          ),
          const SizedBox(height: 10),
          const Text(
            'Unable to sync latest bookings',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navy),
          ),
          const SizedBox(height: 4),
          const Text(
            'Tap below to refresh your stay history.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11.5, color: muted),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            onPressed: onRetry,
            style: ElevatedButton.styleFrom(
              backgroundColor: navy,
              foregroundColor: white,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: const BorderSide(color: gold, width: 1),
              ),
              elevation: 0,
            ),
            icon: const Icon(Icons.refresh_rounded, size: 15, color: gold),
            label: const Text('Refresh', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5)),
          ),
        ],
      ),
    );
  }
  // ==========================================
  // GUEST MODE: FEATURES & SERVICES SHOWCASE
  // ==========================================

  Widget _buildFeaturesAndServicesSection(BuildContext context) {
    const services = [
      _GuestServiceItem(
        title: 'Flexible Hourly Stays',
        description: 'Book 3h, 6h, 12h or 24h stays tailored to transit, business, or leisure.',
        icon: Icons.access_time_filled_rounded,
        color: Color(0xFF4F46E5),
        bgColor: Color(0xFFEEF2FF),
      ),
      _GuestServiceItem(
        title: '24/7 Front Desk & Concierge',
        description: 'Seamless check-in, travel assistance, luggage hold, and 24/7 support.',
        icon: Icons.support_agent_rounded,
        color: Color(0xFF0D9488),
        bgColor: Color(0xFFCCFBF1),
      ),
      _GuestServiceItem(
        title: 'Gourmet In-Room Dining',
        description: 'Multi-cuisine delicacies, hot morning breakfast, and round-the-clock service.',
        icon: Icons.restaurant_rounded,
        color: Color(0xFFD97706),
        bgColor: Color(0xFFFEF3C7),
      ),
      _GuestServiceItem(
        title: 'High-Speed Fiber Wi-Fi',
        description: 'Fast, secure enterprise Wi-Fi in all luxury rooms, suites, and public lounges.',
        icon: Icons.wifi_rounded,
        color: Color(0xFF2563EB),
        bgColor: Color(0xFFDBEAFE),
      ),
      _GuestServiceItem(
        title: 'Swimming Pool & Spa',
        description: 'Rooftop infinity pool, steam sauna facilities, and revitalizing spa therapies.',
        icon: Icons.pool_rounded,
        color: Color(0xFF059669),
        bgColor: Color(0xFFD1FAE5),
      ),
      _GuestServiceItem(
        title: 'Valet Parking & Transit',
        description: 'Complimentary secure valet parking with airport pick-up & drop-off options.',
        icon: Icons.local_parking_rounded,
        color: Color(0xFF7C3AED),
        bgColor: Color(0xFFEDE9FE),
      ),
      _GuestServiceItem(
        title: '100% Sanitized Guarantee',
        description: 'Hospital-grade deep cleaning, sealed sanitized rooms, and fresh linens.',
        icon: Icons.verified_user_rounded,
        color: Color(0xFF0284C7),
        bgColor: Color(0xFFE0F2FE),
      ),
      _GuestServiceItem(
        title: 'Digital Invoicing & Folio',
        description: 'Transparent GST billing, instant digital receipts, and one-tap checkout.',
        icon: Icons.receipt_long_rounded,
        color: Color(0xFFC026D3),
        bgColor: Color(0xFFFAE8FF),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Welcome Hero Banner
        _buildGuestModeHeroBanner(context),
        const SizedBox(height: 18),

        // 2. Section Header: Features & Services
        _buildSectionHeader(
          title: 'Features & Guest Services',
          subtitle: 'World-class hospitality, amenities & luxury comforts',
        ),
        const SizedBox(height: 10),

        // 3. 2-Column Grid of Service Cards
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 0.98,
          ),
          itemCount: services.length,
          itemBuilder: (context, index) {
            final item = services[index];
            return _buildServiceCard(item);
          },
        ),
        const SizedBox(height: 18),

        // 4. "Why Choose Hour Stay" Highlights Banner
        _buildWhyChooseHourStayBanner(context),
      ],
    );
  }

  Widget _buildGuestModeHeroBanner(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0D1B2A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: gold.withAlpha(120), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(40),
            blurRadius: 14,
            offset: const Offset(0, 4),
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
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4.5),
                decoration: BoxDecoration(
                  color: gold.withAlpha(30),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: gold.withAlpha(140)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.stars_rounded, size: 14, color: gold),
                    SizedBox(width: 5),
                    Text(
                      'PREMIUM HOSPITALITY',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: gold,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ),
              InkWell(
                onTap: () => _onBookStayTapped(context),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: gold,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Explore',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: navy,
                        ),
                      ),
                      SizedBox(width: 3),
                      Icon(Icons.arrow_forward_rounded, size: 12, color: navy),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Text(
            'Luxury Stays by the Hour',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: white,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 5),
          const Text(
            'Experience seamless check-in, flexible hourly tariffs, and 5-star hotel comforts across India.',
            style: TextStyle(
              fontSize: 12,
              color: Color(0xFFCBD5E1),
              fontWeight: FontWeight.w500,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          // Stats Row
          Row(
            children: [
              _buildHeroStatPill('500+ Rooms', Icons.hotel_rounded),
              const SizedBox(width: 8),
              _buildHeroStatPill('4.9 ★ Rating', Icons.star_rounded),
              const SizedBox(width: 8),
              _buildHeroStatPill('24/7 Support', Icons.headset_mic_rounded),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeroStatPill(String label, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withAlpha(18),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white.withAlpha(30)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: gold),
          const SizedBox(width: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: cream,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildServiceCard(_GuestServiceItem item) {
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: item.bgColor,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(item.icon, size: 18, color: item.color),
          ),
          const SizedBox(height: 8),
          Text(
            item.title,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: navy,
              letterSpacing: -0.2,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 3),
          Expanded(
            child: Text(
              item.description,
              style: const TextStyle(
                fontSize: 10.5,
                color: muted,
                fontWeight: FontWeight.w500,
                height: 1.35,
              ),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWhyChooseHourStayBanner(BuildContext context) {
    final reasons = [
      {'title': 'Hourly Flexibility', 'desc': 'Pay solely for the hours you stay with micro-stay pricing.'},
      {'title': '100% Verified Quality', 'desc': 'All partner properties pass strict hygiene inspections.'},
      {'title': 'Zero Hidden Fees', 'desc': 'Transparent GST billing and instant digital receipts.'},
      {'title': 'Express Digital Booking', 'desc': 'Book in under 60 seconds with instant confirmation.'},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.shield_rounded, size: 16, color: purple),
              SizedBox(width: 6),
              Text(
                'Why Choose Hour Stay?',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: navy,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...reasons.map((r) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 2),
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: Color(0xFFD1FAE5),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check_rounded, size: 12, color: Color(0xFF059669)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            r['title']!,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: navy,
                            ),
                          ),
                          const SizedBox(height: 1),
                          Text(
                            r['desc']!,
                            style: const TextStyle(
                              fontSize: 11,
                              color: muted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

}

class _GuestServiceItem {
  final String title;
  final String description;
  final IconData icon;
  final Color color;
  final Color bgColor;

  const _GuestServiceItem({
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
    required this.bgColor,
  });
}

class _GuestQuickActionItem {
  final String label;
  final String subtitle;
  final IconData icon;
  final List<Color> gradientColors;
  final Color accentColor;
  final String? badgeText;
  final Color? badgeBgColor;
  final Color? badgeTextColor;
  final VoidCallback onTap;

  _GuestQuickActionItem({
    required this.label,
    required this.subtitle,
    required this.icon,
    required this.gradientColors,
    required this.accentColor,
    this.badgeText,
    this.badgeBgColor,
    this.badgeTextColor,
    required this.onTap,
  });
}

// ============================================================================
// Guest Stays Carousel Widget: Current stay first, followed by upcoming stays
// ============================================================================
class GuestStaysCarousel extends StatefulWidget {
  final List<ReservationModel> stays;
  final String? userPropertyName;

  const GuestStaysCarousel({
    super.key,
    required this.stays,
    this.userPropertyName,
  });

  @override
  State<GuestStaysCarousel> createState() => _GuestStaysCarouselState();
}

class _GuestStaysCarouselState extends State<GuestStaysCarousel> {
  late final PageController _pageController;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final stays = widget.stays;
    if (stays.isEmpty) return const SizedBox.shrink();

    final bool hasMultiple = stays.length > 1;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (hasMultiple) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 8, left: 2, right: 2),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: gold,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'ACTIVE RESERVATIONS (${stays.length})',
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: navy,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                // Dot indicators for multiple stays
                Row(
                  children: List.generate(
                    stays.length,
                    (index) => AnimatedContainer(
                      duration: const Duration(milliseconds: 250),
                      margin: const EdgeInsets.symmetric(horizontal: 2.5),
                      width: _currentPage == index ? 16 : 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: _currentPage == index ? purple : cardBorder,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        // Carousel Container
        SizedBox(
          height: 192,
          child: PageView.builder(
            controller: _pageController,
            itemCount: stays.length,
            onPageChanged: (index) {
              setState(() => _currentPage = index);
            },
            itemBuilder: (context, index) {
              final stay = stays[index];
              return _buildStayCard(context, stay, index, stays.length);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildStayCard(BuildContext context, ReservationModel stay, int index, int total) {
    final stUpper = stay.status.toUpperCase();
    final bool isInHouse = ['CHECKED-IN', 'CHECKED_IN', 'ACTIVE', 'STAYING', 'IN-HOUSE'].contains(stUpper);
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

    final roomStr = stay.roomNumber.isNotEmpty
        ? stay.roomNumber
        : (stay.room.isNotEmpty ? stay.room : '101');

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 1),
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
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            final user = context.read<AuthProvider>().user;
            if (user == null) {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              );
            } else {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => GuestBookingDetailScreen(booking: stay),
                ),
              );
            }
          },
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top Row: Status badge + Room badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Flexible(
                      child: Container(
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
                            Flexible(
                              child: Text(
                                badgeText,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: badgeTone,
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
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
                        'Room $roomStr',
                        style: const TextStyle(
                          color: navy,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),

                // Hotel Name and Room Type
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            stay.propertyName.isNotEmpty
                                ? stay.propertyName
                                : (widget.userPropertyName?.isNotEmpty == true
                                    ? widget.userPropertyName!
                                    : 'Hour Stay Luxury Hotel'),
                            style: const TextStyle(
                              color: white,
                              fontSize: 15.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.3,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${stay.roomType} • #${stay.reservationNumber.isNotEmpty ? stay.reservationNumber : stay.bookingId}',
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
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: white.withAlpha(20),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: white.withAlpha(35)),
                      ),
                      child: Text(
                        stay.hours != null && stay.hours! > 0
                            ? '${stay.hours}H Stay'
                            : '${stay.nights > 0 ? stay.nights : 1}N Stay (24h)',
                        style: const TextStyle(
                          color: gold,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),

                // Stay details pill container
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6.5),
                  decoration: BoxDecoration(
                    color: white.withAlpha(15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: white.withAlpha(30)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.login_rounded, color: cream, size: 12),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                Formatters.date(stay.checkIn),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: white,
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(width: 1, height: 12, color: white.withAlpha(35)),
                      Flexible(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.payments_outlined, color: gold, size: 12),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                Formatters.currency(stay.totalAmount),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: gold,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Footer row with Swipe helper or View details
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      total > 1
                          ? 'Stay ${index + 1} of $total • Swipe for next'
                          : 'Tap to view stay details & digital folio',
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
        ),
      ),
    );
  }
}
