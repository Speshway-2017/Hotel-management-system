import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import '../feedback/guest_add_feedback_screen.dart';
import '../folio/guest_folio_screen.dart';
import '../search/guest_search_screen.dart';
import 'guest_booking_detail_screen.dart';

class GuestBookingsScreen extends StatefulWidget {
  final int initialTabIndex;
  final ValueChanged<int>? onNavigateTab;

  const GuestBookingsScreen({
    super.key,
    this.initialTabIndex = 0,
    this.onNavigateTab,
  });

  @override
  State<GuestBookingsScreen> createState() => _GuestBookingsScreenState();
}

class _GuestBookingsScreenState extends State<GuestBookingsScreen>
    with SingleTickerProviderStateMixin {
  // Hour Stay Brand Palette Tokens
  static const Color navy = Color(0xFF0D1B2A);
  static const Color purple = Color(0xFF5B21B6);
  static const Color purpleBg = Color(0xFFEDE9FE);
  static const Color gold = Color(0xFFF5C06A);
  static const Color goldBg = Color(0xFFFEF3C7);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color white = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF8A8F98);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color emerald = Color(0xFF10B981);
  static const Color emeraldBg = Color(0xFFDCFCE7);
  static const Color ruby = Color(0xFFE53935);
  static const Color rubyBg = Color(0xFFFEE2E2);
  static const Color amber = Color(0xFFD97706);
  static const Color amberBg = Color(0xFFFEF3C7);
  static const Color blue = Color(0xFF2563EB);
  static const Color blueBg = Color(0xFFDBEAFE);

  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 4,
      vsync: this,
      initialIndex: widget.initialTabIndex.clamp(0, 3),
    );
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GuestBookingProvider>().fetchMyBookings();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _navigateToSearch(BuildContext context) {
    if (widget.onNavigateTab != null) {
      widget.onNavigateTab!(1);
    } else {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const GuestSearchScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = context.watch<GuestBookingProvider>();
    final allBookings = bookingProvider.bookings;

    // Filter into 4 exact business categories from real MongoDB data
    final upcomingBookings = allBookings.where((b) {
      final s = b.status.toLowerCase();
      final isCurrent = s == 'checked_in' || s == 'checked-in';
      final isCompleted = s == 'checked_out' || s == 'checked-out' || s == 'completed';
      final isCancelled = s == 'cancelled';
      return !isCurrent && !isCompleted && !isCancelled;
    }).toList();

    final currentStayBookings = allBookings.where((b) {
      final s = b.status.toLowerCase();
      return s == 'checked_in' || s == 'checked-in';
    }).toList();

    final completedBookings = allBookings.where((b) {
      final s = b.status.toLowerCase();
      return s == 'checked_out' || s == 'checked-out' || s == 'completed';
    }).toList();

    final cancelledBookings = allBookings.where((b) {
      return b.status.toLowerCase() == 'cancelled';
    }).toList();

    // Apply search filter if query is present
    List<ReservationModel> applySearch(List<ReservationModel> list) {
      if (_searchQuery.trim().isEmpty) return list;
      final q = _searchQuery.trim().toLowerCase();
      return list.where((b) {
        final idMatch = b.reservationNumber.toLowerCase().contains(q) || b.id.toLowerCase().contains(q);
        final hotelMatch = b.propertyName.toLowerCase().contains(q);
        final roomTypeMatch = b.roomType.toLowerCase().contains(q);
        final roomNumMatch = b.roomNumber.toLowerCase().contains(q);
        final cityMatch = (b.city ?? '').toLowerCase().contains(q);
        final guestMatch = b.guestName.toLowerCase().contains(q);
        return idMatch || hotelMatch || roomTypeMatch || roomNumMatch || cityMatch || guestMatch;
      }).toList();
    }

    final filteredUpcoming = applySearch(upcomingBookings);
    final filteredCurrent = applySearch(currentStayBookings);
    final filteredCompleted = applySearch(completedBookings);
    final filteredCancelled = applySearch(cancelledBookings);

    final isInitialLoading = bookingProvider.isLoading && allBookings.isEmpty;

    return Scaffold(
      backgroundColor: background,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 76),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: navy.withAlpha(90),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: FloatingActionButton.extended(
            backgroundColor: navy,
            foregroundColor: white,
            elevation: 0,
            highlightElevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Color(0xFFF5C06A), width: 1.5),
            ),
            icon: const Icon(Icons.add_circle_rounded, size: 20, color: gold),
            label: const Row(
              children: [
                Text(
                  'Book Now',
                  style: TextStyle(
                    color: white,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.3,
                  ),
                ),
                SizedBox(width: 4),
                Icon(Icons.arrow_forward_ios_rounded, size: 11, color: gold),
              ],
            ),
            onPressed: () => _navigateToSearch(context),
          ),
        ),
      ),
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverToBoxAdapter(
              child: _buildHeaderSection(
                upcomingCount: upcomingBookings.length,
                currentCount: currentStayBookings.length,
                completedCount: completedBookings.length,
                cancelledCount: cancelledBookings.length,
              ),
            ),
          ];
        },
        body: RefreshIndicator(
          color: purple,
          backgroundColor: white,
          onRefresh: () => bookingProvider.fetchMyBookings(),
          child: isInitialLoading
              ? _buildLoadingSkeleton()
              : bookingProvider.errorMessage != null && allBookings.isEmpty
                  ? _buildErrorState(bookingProvider)
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        // Tab 1: Current Stay
                        _buildBookingListView(
                          context,
                          bookings: filteredCurrent,
                          tabType: _BookingTabType.currentStay,
                          emptyTitle: 'No Current Stay Active',
                          emptyMessage: 'You are not currently checked into any room. Check-in details will appear here.',
                          onRefresh: () => bookingProvider.fetchMyBookings(),
                        ),

                        // Tab 2: Upcoming
                        _buildBookingListView(
                          context,
                          bookings: filteredUpcoming,
                          tabType: _BookingTabType.upcoming,
                          emptyTitle: 'No Upcoming Stays',
                          emptyMessage: 'When you book a room or hourly stay, your active reservation will appear here.',
                          onRefresh: () => bookingProvider.fetchMyBookings(),
                        ),

                        // Tab 3: Completed
                        _buildBookingListView(
                          context,
                          bookings: filteredCompleted,
                          tabType: _BookingTabType.completed,
                          emptyTitle: 'No Past Stays',
                          emptyMessage: 'Your completed stays, digital folios, and invoices will be archived here.',
                          onRefresh: () => bookingProvider.fetchMyBookings(),
                        ),

                        // Tab 4: Cancelled
                        _buildBookingListView(
                          context,
                          bookings: filteredCancelled,
                          tabType: _BookingTabType.cancelled,
                          emptyTitle: 'No Cancelled Bookings',
                          emptyMessage: 'Cancelled reservations and refund tracking requests will be listed here.',
                          onRefresh: () => bookingProvider.fetchMyBookings(),
                        ),
                      ],
                    ),
        ),
      ),
    );
  }

  // =========================================================================
  // HEADER SECTION (Title, Search Bar, and Navigation Chips)
  // =========================================================================
  Widget _buildHeaderSection({
    required int upcomingCount,
    required int currentCount,
    required int completedCount,
    required int cancelledCount,
  }) {
    return Container(
      decoration: const BoxDecoration(
        color: white,
        border: Border(bottom: BorderSide(color: cardBorder, width: 1)),
      ),
      padding: const EdgeInsets.fromLTRB(0, 14, 0, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: purpleBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: purple.withAlpha(40)),
                  ),
                  child: const Icon(Icons.bookmark_added_rounded, color: purple, size: 20),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'My Bookings',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: navy,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Text(
                        'Manage upcoming trips, current stays & past invoices',
                        style: TextStyle(fontSize: 11.5, color: muted),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Search Field
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: Container(
              height: 42,
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cardBorder),
              ),
              child: TextField(
                controller: _searchController,
                style: const TextStyle(fontSize: 13, color: navy, fontWeight: FontWeight.w500),
                decoration: InputDecoration(
                  hintText: 'Search by Booking ID, hotel, room, city...',
                  hintStyle: const TextStyle(fontSize: 12.5, color: muted),
                  prefixIcon: const Icon(Icons.search_rounded, color: muted, size: 20),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 16, color: muted),
                          onPressed: () {
                            setState(() {
                              _searchController.clear();
                              _searchQuery = '';
                            });
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                onChanged: (val) {
                  setState(() => _searchQuery = val);
                },
              ),
            ),
          ),

          // Horizontal Navigation Tabs (Current Stay, Upcoming, Completed, Cancelled)
          _buildBookingsNavChips(
            currentCount: currentCount,
            upcomingCount: upcomingCount,
            completedCount: completedCount,
            cancelledCount: cancelledCount,
          ),
        ],
      ),
    );
  }

  Widget _buildBookingsNavChips({
    required int currentCount,
    required int upcomingCount,
    required int completedCount,
    required int cancelledCount,
  }) {
    final tabs = [
      {'index': 0, 'label': 'Current Stay', 'count': currentCount, 'isLive': currentCount > 0},
      {'index': 1, 'label': 'Upcoming', 'count': upcomingCount, 'isLive': false},
      {'index': 2, 'label': 'Completed', 'count': completedCount, 'isLive': false},
      {'index': 3, 'label': 'Cancelled', 'count': cancelledCount, 'isLive': false},
    ];

    return SizedBox(
      height: 38,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: tabs.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final tab = tabs[index];
          final tabIndex = tab['index'] as int;
          final label = tab['label'] as String;
          final count = tab['count'] as int;
          final isLive = tab['isLive'] as bool;
          final isSelected = _tabController.index == tabIndex;

          return InkWell(
            onTap: () {
              _tabController.animateTo(tabIndex);
              setState(() {});
            },
            borderRadius: BorderRadius.circular(20),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
              decoration: BoxDecoration(
                color: isSelected ? navy : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? navy : cardBorder,
                  width: 1.2,
                ),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: navy.withAlpha(35),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isLive) ...[
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: emerald,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                      color: isSelected ? cream : navy,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6.5, vertical: 2),
                    decoration: BoxDecoration(
                      color: isSelected ? gold : const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$count',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: isSelected ? navy : const Color(0xFF64748B),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // =========================================================================
  // BOOKINGS LIST VIEW PER TAB
  // =========================================================================
  Widget _buildBookingListView(
    BuildContext context, {
    required List<ReservationModel> bookings,
    required _BookingTabType tabType,
    required String emptyTitle,
    required String emptyMessage,
    required Future<void> Function() onRefresh,
  }) {
    if (bookings.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 32, 16, 120),
        children: [
          EmptyState(
            icon: tabType == _BookingTabType.upcoming
                ? Icons.calendar_today_outlined
                : tabType == _BookingTabType.currentStay
                    ? Icons.hotel_outlined
                    : tabType == _BookingTabType.completed
                        ? Icons.history_rounded
                        : Icons.cancel_outlined,
            title: emptyTitle,
            message: emptyMessage,
            actionText: tabType == _BookingTabType.upcoming || tabType == _BookingTabType.currentStay
                ? 'Explore Rooms'
                : 'Refresh Stays',
            onAction: () {
              if (tabType == _BookingTabType.upcoming || tabType == _BookingTabType.currentStay) {
                _navigateToSearch(context);
              } else {
                onRefresh();
              }
            },
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 120),
      itemCount: bookings.length,
      separatorBuilder: (_, _) => const SizedBox(height: 14),
      itemBuilder: (context, index) {
        final booking = bookings[index];
        return _buildBookingCard(context, booking, tabType);
      },
    );
  }

  // =========================================================================
  // MAIN BOOKING CARD WIDGET
  // =========================================================================
  Widget _buildBookingCard(
    BuildContext context,
    ReservationModel b,
    _BookingTabType tabType,
  ) {
    final isCancelled = tabType == _BookingTabType.cancelled || b.isCancelled;
    final isHourly = b.stayType.toLowerCase() == 'hourly';
    final durationText = isHourly
        ? '${b.hours ?? 3} Hours Stay'
        : '${b.nights > 0 ? b.nights : 1} Night${b.nights > 1 ? "s" : ""} Stay';

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: tabType == _BookingTabType.currentStay
              ? emerald.withAlpha(90)
              : cardBorder,
          width: tabType == _BookingTabType.currentStay ? 1.5 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: tabType == _BookingTabType.currentStay
                ? emerald.withAlpha(20)
                : navy.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(17),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Top Bar: Booking ID & Status Badges
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: tabType == _BookingTabType.currentStay
                    ? emeraldBg
                    : isCancelled
                        ? rubyBg
                        : const Color(0xFFF8FAFC),
                border: const Border(bottom: BorderSide(color: cardBorder, width: 1)),
              ),
              child: Row(
                children: [
                  // Booking ID with copy icon
                  InkWell(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: b.reservationNumber));
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Booking ID #${b.reservationNumber} copied!'),
                          duration: const Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                    borderRadius: BorderRadius.circular(6),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '#${b.reservationNumber}',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: tabType == _BookingTabType.currentStay
                                ? const Color(0xFF065F46)
                                : isCancelled
                                    ? const Color(0xFF991B1B)
                                    : navy,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Icon(
                          Icons.copy_rounded,
                          size: 13,
                          color: tabType == _BookingTabType.currentStay
                              ? const Color(0xFF065F46)
                              : isCancelled
                                  ? const Color(0xFF991B1B)
                                  : muted,
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  // Payment Status Pill
                  _buildPaymentPill(b.paymentStatus),
                  const SizedBox(width: 6),
                  // Booking Status Badge
                  StatusBadge(status: b.status, fontSize: 11),
                ],
              ),
            ),

            // 2. Core Body: Hotel, Room & Timings
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Hotel Name & Room Type
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              b.propertyName,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: navy,
                                height: 1.2,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                  decoration: BoxDecoration(
                                    color: purpleBg,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    'Room ${b.roomNumber.isNotEmpty ? b.roomNumber : "Assigned on Check-in"}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: purple,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    b.roomType,
                                    style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF475569),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Schedule Timings Box
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            // Check-in
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Row(
                                    children: [
                                      Icon(Icons.login_rounded, size: 14, color: emerald),
                                      SizedBox(width: 4),
                                      Text(
                                        'CHECK-IN',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF64748B),
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    Formatters.checkInDateTime(b.checkIn),
                                    style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w700,
                                      color: navy,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(width: 1, height: 32, color: cardBorder),
                            const SizedBox(width: 12),
                            // Check-out
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Row(
                                    children: [
                                      Icon(Icons.logout_rounded, size: 14, color: amber),
                                      SizedBox(width: 4),
                                      Text(
                                        'CHECK-OUT',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: Color(0xFF64748B),
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    Formatters.checkOutDateTime(b.checkOut),
                                    style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w700,
                                      color: navy,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 14, color: cardBorder),
                        // Occupancy & Stay type tags
                        Row(
                          children: [
                            const Icon(Icons.people_outline_rounded, size: 14, color: muted),
                            const SizedBox(width: 4),
                            Text(
                              '${b.adults} Adults${b.children > 0 ? ", ${b.children} Kids" : ""} (${b.roomsCount} Room)',
                              style: const TextStyle(fontSize: 11.5, color: Color(0xFF475569), fontWeight: FontWeight.w500),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: goldBg,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                durationText,
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFFB45309)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // 3. Cancelled & Refund Details Notice (if applicable)
                  if (isCancelled) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: rubyBg.withAlpha(80),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: ruby.withAlpha(50)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.info_outline_rounded, color: ruby, size: 15),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  b.cancellationReason.isNotEmpty
                                      ? 'Cancelled: ${b.cancellationReason}'
                                      : 'Stay reservation was cancelled.',
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF991B1B),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          if (b.hasRefundRequest) ...[
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Refund Processing:',
                                  style: TextStyle(fontSize: 11, color: Color(0xFF7F1D1D)),
                                ),
                                _buildRefundStatusBadge(b.refundStatus),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 12),

                  // 4. Tariff Amount & Actions Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Total Amount', style: TextStyle(fontSize: 11, color: muted)),
                          Text(
                            Formatters.currency(b.totalAmount),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: navy,
                            ),
                          ),
                        ],
                      ),
                      // Details Quick Link
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          foregroundColor: purple,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        ),
                        icon: const Icon(Icons.arrow_forward_rounded, size: 15),
                        label: const Text(
                          'View Details',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                        ),
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => GuestBookingDetailScreen(booking: b),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  const Divider(height: 16, color: cardBorder),

                  // 5. Contextual Tab Action Buttons
                  _buildContextualActionButtons(context, b, tabType),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // CONTEXTUAL ACTION BUTTONS (Tab Specific)
  // =========================================================================
  Widget _buildContextualActionButtons(
    BuildContext context,
    ReservationModel b,
    _BookingTabType tabType,
  ) {
    switch (tabType) {
      case _BookingTabType.upcoming:
        return _buildUpcomingActions(context, b);
      case _BookingTabType.currentStay:
        return _buildCurrentStayActions(context, b);
      case _BookingTabType.completed:
        return _buildCompletedActions(context, b);
      case _BookingTabType.cancelled:
        return _buildCancelledActions(context, b);
    }
  }

  // --- UPCOMING ACTIONS ---
  Widget _buildUpcomingActions(BuildContext context, ReservationModel b) {
    return Column(
      children: [
        Row(
          children: [
            // Pre-Check-in Button
            Expanded(
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: navy,
                  foregroundColor: white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.qr_code_scanner_rounded, size: 16, color: gold),
                label: const Text(
                  'Pre-Check-in',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                ),
                onPressed: () => _showPreCheckInBottomSheet(context, b),
              ),
            ),
            const SizedBox(width: 8),
            // Cancel / Modify Button
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: ruby,
                  side: const BorderSide(color: Color(0xFFFECACA), width: 1.2),
                  backgroundColor: rubyBg.withAlpha(40),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.cancel_outlined, size: 16, color: ruby),
                label: const Text(
                  'Cancel Stay',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                ),
                onPressed: () => _showCancelBookingDialog(context, b),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // --- CURRENT STAY ACTIONS ---
  Widget _buildCurrentStayActions(BuildContext context, ReservationModel b) {
    return Row(
      children: [
        // 1. View Stay / Extend
        Expanded(
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: navy,
              foregroundColor: white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 10),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: const BorderSide(color: gold),
              ),
            ),
            icon: const Icon(Icons.more_time_rounded, size: 16, color: gold),
            label: const Text(
              'Extend Stay',
              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
            ),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => GuestBookingDetailScreen(booking: b),
                ),
              );
            },
          ),
        ),
        const SizedBox(width: 8),
        // 2. Digital Folio
        Expanded(
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: navy,
              side: const BorderSide(color: cardBorder),
              padding: const EdgeInsets.symmetric(vertical: 9),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.receipt_long_outlined, size: 15, color: navy),
            label: const Text(
              'Digital Folio',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => GuestFolioScreen(
                    booking: b,
                    bookingId: b.id,
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // --- COMPLETED ACTIONS ---
  Widget _buildCompletedActions(BuildContext context, ReservationModel b) {
    return Column(
      children: [
        Row(
          children: [
            // 1. Write Feedback / Review
            Expanded(
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: navy,
                  foregroundColor: white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.star_rate_rounded, size: 16, color: gold),
                label: const Text(
                  'Feedback',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                ),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => GuestAddFeedbackScreen(reservationId: b.id),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(width: 8),
            // 2. Rebook
            Expanded(
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: navy,
                  foregroundColor: white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: const BorderSide(color: gold),
                  ),
                ),
                icon: const Icon(Icons.replay_rounded, size: 16, color: gold),
                label: const Text(
                  'Rebook',
                  style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                ),
                onPressed: () => _navigateToSearch(context),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        // 3. Invoice Button
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: navy,
              side: const BorderSide(color: cardBorder),
              padding: const EdgeInsets.symmetric(vertical: 9),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.download_rounded, size: 15, color: navy),
            label: const Text(
              'View & Download Stay Invoice',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
            onPressed: () => _showInvoiceDialog(context, b),
          ),
        ),
      ],
    );
  }

  // --- CANCELLED ACTIONS ---
  Widget _buildCancelledActions(BuildContext context, ReservationModel b) {
    if (b.hasRefundRequest) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: navy,
            foregroundColor: white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(vertical: 11),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
              side: const BorderSide(color: gold),
            ),
          ),
          icon: const Icon(Icons.track_changes_rounded, size: 16, color: gold),
          label: const Text(
            'Track Refund Status',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
          ),
          onPressed: () => _showRefundTrackerBottomSheet(context, b),
        ),
      );
    } else {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: navy,
            foregroundColor: white,
            elevation: 0,
            padding: const EdgeInsets.symmetric(vertical: 11),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
              side: const BorderSide(color: gold),
            ),
          ),
          icon: const Icon(Icons.currency_rupee_rounded, size: 16, color: gold),
          label: const Text(
            'Submit Refund Request',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
          ),
          onPressed: () => _showRefundRequestBottomSheet(context, b),
        ),
      );
    }
  }

  // =========================================================================
  // PRE-CHECK-IN MODAL BOTTOM SHEET
  // =========================================================================
  void _showPreCheckInBottomSheet(BuildContext context, ReservationModel booking) {
    String arrivalTime = '14:00 (Standard)';
    bool idConfirmed = true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              decoration: const BoxDecoration(
                color: white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 14,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: cardBorder,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Header
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: navy,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.qr_code_2_rounded, color: gold, size: 24),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Express Pre-Check-in',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: navy,
                                ),
                              ),
                              Text(
                                'Skip front desk queue upon hotel arrival',
                                style: TextStyle(fontSize: 12, color: muted),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Stay Info Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: background,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Column(
                        children: [
                          _buildModalInfoRow('Hotel:', booking.propertyName),
                          const Divider(height: 14, color: cardBorder),
                          _buildModalInfoRow('Room:', 'Room ${booking.roomNumber.isNotEmpty ? booking.roomNumber : "Assigned on arrival"} (${booking.roomType})'),
                          const Divider(height: 14, color: cardBorder),
                          _buildModalInfoRow('Scheduled Check-in:', Formatters.checkInDateTime(booking.checkIn)),
                          const Divider(height: 14, color: cardBorder),
                          _buildModalInfoRow('Primary Guest:', booking.guestName),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Arrival Time Selector
                    const Text(
                      'Estimated Time of Arrival',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navy),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        '12:00 PM (Early)',
                        '02:00 PM (Standard)',
                        '05:00 PM (Evening)',
                        '09:00 PM (Late Night)',
                      ].map((t) {
                        final isSel = arrivalTime == t;
                        return ChoiceChip(
                          label: Text(t),
                          selected: isSel,
                          selectedColor: navy,
                          labelStyle: TextStyle(
                            color: isSel ? white : const Color(0xFF334155),
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                          onSelected: (val) {
                            if (val) setSheetState(() => arrivalTime = t);
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),

                    // ID Verification Status Check
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: emeraldBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: emerald.withAlpha(60)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.verified_user_rounded, color: emerald, size: 22),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Guest ID Document Ready',
                                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF065F46)),
                                ),
                                Text(
                                  'Aadhaar / Government ID linked with phone: ${booking.guestPhone.isNotEmpty ? booking.guestPhone : "Verified on profile"}',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFF047857)),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: idConfirmed,
                            activeThumbColor: emerald,
                            onChanged: (val) => setSheetState(() => idConfirmed = val),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Confirm Pre-Check-in Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: navy,
                          foregroundColor: white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: gold, width: 1.2),
                          ),
                        ),
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Pre-Check-in confirmed! Your digital key is ready for priority check-in upon arrival.'),
                              backgroundColor: emerald,
                              duration: Duration(seconds: 4),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        child: const Text(
                          'Confirm Pre-Check-in & Fast Pass',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  // =========================================================================
  // DIGITAL TAX INVOICE MODAL DIALOG
  // =========================================================================
  void _showInvoiceDialog(BuildContext context, ReservationModel booking) {
    final subtotal = (booking.totalAmount / 1.12).roundToDouble();
    final gstTax = (booking.totalAmount - subtotal).roundToDouble();

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: white,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          contentPadding: const EdgeInsets.all(20),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Logo & Invoice Ref
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        RichText(
                          text: const TextSpan(
                            children: [
                              TextSpan(text: 'Hour ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: navy)),
                              TextSpan(text: 'Stay', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: gold)),
                            ],
                          ),
                        ),
                        const Text('TAX INVOICE & RECEIPT', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: muted, letterSpacing: 0.8)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: emeraldBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'PAID IN FULL',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: emerald),
                      ),
                    ),
                  ],
                ),
                const Divider(height: 20, color: cardBorder),

                // Invoice Meta
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Invoice To:', style: TextStyle(fontSize: 11, color: muted)),
                        Text(booking.guestName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navy)),
                        if (booking.guestEmail.isNotEmpty)
                          Text(booking.guestEmail, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text('Invoice #:', style: TextStyle(fontSize: 11, color: muted)),
                        Text('INV-${booking.reservationNumber}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy)),
                        Text(Formatters.checkInDateTime(booking.checkIn), style: const TextStyle(fontSize: 11, color: muted)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Property & Room
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: background,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(booking.propertyName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: navy)),
                      Text('Room ${booking.roomNumber} • ${booking.roomType}', style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B))),
                      Text('GSTIN: 08AABCH1234F1Z8 • HS-HQ Hotel Group', style: const TextStyle(fontSize: 10, color: muted)),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Itemized Breakdown Table
                const Text('Tariff Itemization', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy)),
                const SizedBox(height: 6),
                _buildInvoiceItemRow('Room Tariff (${booking.stayType == "hourly" ? "${booking.hours ?? 3}h" : "${booking.nights}n"})', Formatters.currency(subtotal)),
                const SizedBox(height: 4),
                _buildInvoiceItemRow('CGST (6.0%)', Formatters.currency(gstTax / 2)),
                const SizedBox(height: 4),
                _buildInvoiceItemRow('SGST (6.0%)', Formatters.currency(gstTax / 2)),
                const Divider(height: 16, color: cardBorder),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Net Paid', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: navy)),
                    Text(
                      Formatters.currency(booking.totalAmount),
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: purple),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Payment Method:', style: TextStyle(fontSize: 11, color: muted)),
                    Text(booking.paymentMethod.isNotEmpty ? booking.paymentMethod : 'UPI / Online', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: navy)),
                  ],
                ),
                const SizedBox(height: 20),

                // Actions: Share / Print / Close
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: navy,
                          foregroundColor: white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.download_rounded, size: 16),
                        label: const Text('Download PDF', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
                        onPressed: () {
                          Navigator.of(ctx).pop();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Invoice INV-${booking.reservationNumber}.pdf downloaded!'),
                              backgroundColor: emerald,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      child: const Text('Close', style: TextStyle(color: muted, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildInvoiceItemRow(String title, String amount) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
        Text(amount, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: navy)),
      ],
    );
  }

  // =========================================================================
  // CANCELLATION MODAL DIALOG
  // =========================================================================
  Future<void> _showCancelBookingDialog(BuildContext context, ReservationModel currentBooking) async {
    final reasonController = TextEditingController();
    final remarksController = TextEditingController();
    bool isSubmitting = false;

    await showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: white,
              surfaceTintColor: Colors.transparent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              title: const Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: ruby, size: 24),
                  SizedBox(width: 8),
                  Text('Cancel Booking', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17, color: navy)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Are you sure you want to cancel booking #${currentBooking.reservationNumber}? Once cancelled, you can submit a refund request for hotel review.',
                      style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.4),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Reason for Cancellation *',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: reasonController,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'e.g. Change in travel plans, Personal emergency',
                        hintStyle: const TextStyle(fontSize: 12, color: muted),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Additional Remarks (Optional)',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: remarksController,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Any message for the hotel front desk',
                        hintStyle: const TextStyle(fontSize: 12, color: muted),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.of(dialogCtx).pop(),
                  child: const Text('Keep Booking', style: TextStyle(color: muted, fontWeight: FontWeight.w600)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ruby,
                    foregroundColor: white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (reasonController.text.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Please enter a cancellation reason'),
                                backgroundColor: ruby,
                              ),
                            );
                            return;
                          }
                          setDialogState(() => isSubmitting = true);
                          final prov = context.read<GuestBookingProvider>();
                          final messenger = ScaffoldMessenger.of(context);

                          final success = await prov.cancelBooking(
                            bookingId: currentBooking.id,
                            reason: reasonController.text.trim(),
                            remarks: remarksController.text.trim(),
                          );

                          if (dialogCtx.mounted) Navigator.of(dialogCtx).pop();

                          if (success) {
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text('Booking cancelled successfully. You can now submit a refund request.'),
                                backgroundColor: emerald,
                              ),
                            );
                          } else {
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(prov.errorMessage ?? 'Failed to cancel booking'),
                                backgroundColor: ruby,
                              ),
                            );
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: white))
                      : const Text('Confirm Cancellation', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // =========================================================================
  // REFUND REQUEST FORM BOTTOM SHEET
  // =========================================================================
  void _showRefundRequestBottomSheet(BuildContext context, ReservationModel currentBooking) {
    final upiController = TextEditingController();
    final holderController = TextEditingController(text: currentBooking.guestName);
    final accountNumController = TextEditingController();
    final ifscController = TextEditingController();
    final bankNameController = TextEditingController();
    final remarksController = TextEditingController();

    String refundMethod = 'UPI';
    bool isSubmitting = false;

    final refundableAmount = currentBooking.refundableAmount > 0
        ? currentBooking.refundableAmount
        : currentBooking.totalAmount;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              decoration: const BoxDecoration(
                color: white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: cardBorder,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: purpleBg,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.currency_rupee_rounded, color: purple, size: 22),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Request Stay Refund',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: navy),
                              ),
                              Text(
                                'Submitted to hotel staff for verification & payout',
                                style: TextStyle(fontSize: 12, color: muted),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Refund Summary Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: background,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Booking ID:', style: TextStyle(fontSize: 12.5, color: muted)),
                              Text('#${currentBooking.reservationNumber}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: navy)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Original Tariff:', style: TextStyle(fontSize: 12.5, color: muted)),
                              Text(Formatters.currency(currentBooking.totalAmount), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: navy)),
                            ],
                          ),
                          if (currentBooking.cancellationFee > 0) ...[
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Cancellation Penalty:', style: TextStyle(fontSize: 12.5, color: ruby)),
                                Text('- ${Formatters.currency(currentBooking.cancellationFee)}', style: const TextStyle(fontWeight: FontWeight.w600, color: ruby, fontSize: 13)),
                              ],
                            ),
                          ],
                          const Divider(height: 16, color: cardBorder),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Refundable Amount:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: navy)),
                              Text(
                                Formatters.currency(refundableAmount),
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: emerald),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Payment Method Toggle
                    const Text('Refund Payout Method *', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: navy)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => setSheetState(() => refundMethod = 'UPI'),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: refundMethod == 'UPI' ? navy : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: refundMethod == 'UPI' ? gold : cardBorder,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  'UPI ID (Instant)',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.bold,
                                    color: refundMethod == 'UPI' ? white : const Color(0xFF334155),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: InkWell(
                            onTap: () => setSheetState(() => refundMethod = 'Bank Transfer'),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: refundMethod == 'Bank Transfer' ? navy : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: refundMethod == 'Bank Transfer' ? gold : cardBorder,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  'Bank Account',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.bold,
                                    color: refundMethod == 'Bank Transfer' ? white : const Color(0xFF334155),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    if (refundMethod == 'UPI') ...[
                      const Text('UPI ID (VPA) *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: upiController,
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'e.g. mobile@okaxis or user@upi',
                          hintStyle: const TextStyle(fontSize: 12, color: muted),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                    ] else ...[
                      const Text('Account Holder Name *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: holderController,
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Name as per bank records',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text('Bank Account Number *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: accountNumController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'e.g. 01234567890123',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('IFSC Code *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy)),
                                const SizedBox(height: 4),
                                TextField(
                                  controller: ifscController,
                                  textCapitalization: TextCapitalization.characters,
                                  style: const TextStyle(fontSize: 13),
                                  decoration: InputDecoration(
                                    hintText: 'e.g. HDFC0001234',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Bank Name', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy)),
                                const SizedBox(height: 4),
                                TextField(
                                  controller: bankNameController,
                                  style: const TextStyle(fontSize: 13),
                                  decoration: InputDecoration(
                                    hintText: 'e.g. HDFC Bank',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],

                    const SizedBox(height: 12),
                    const Text('Remarks / Note', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: remarksController,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Optional instructions for hotel finance desk',
                        hintStyle: const TextStyle(fontSize: 12, color: muted),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: blue,
                          foregroundColor: white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.send_rounded, size: 18, color: white),
                        label: isSubmitting
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: white))
                            : const Text('Submit Refund Request', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: white)),
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                if (refundMethod == 'UPI' && upiController.text.trim().isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Please enter a valid UPI ID'), backgroundColor: ruby),
                                  );
                                  return;
                                }
                                if (refundMethod == 'Bank Transfer' &&
                                    (accountNumController.text.trim().isEmpty || ifscController.text.trim().isEmpty)) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Please enter Account Number and IFSC Code'), backgroundColor: ruby),
                                  );
                                  return;
                                }

                                setSheetState(() => isSubmitting = true);
                                final prov = context.read<GuestBookingProvider>();
                                final messenger = ScaffoldMessenger.of(context);

                                final success = await prov.submitRefundRequest(
                                  bookingId: currentBooking.id,
                                  amount: refundableAmount,
                                  reason: currentBooking.cancellationReason.isNotEmpty
                                      ? currentBooking.cancellationReason
                                      : 'Booking cancellation refund',
                                  details: remarksController.text.trim(),
                                  refundMethod: refundMethod,
                                  upiId: upiController.text.trim(),
                                  accountHolder: holderController.text.trim(),
                                  accountNumber: accountNumController.text.trim(),
                                  ifscCode: ifscController.text.trim(),
                                  bankName: bankNameController.text.trim(),
                                );

                                if (sheetCtx.mounted) Navigator.of(sheetCtx).pop();

                                if (success) {
                                  messenger.showSnackBar(
                                    const SnackBar(
                                      content: Text('Refund request submitted successfully! Staff will review and process payout.'),
                                      backgroundColor: emerald,
                                    ),
                                  );
                                } else {
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text(prov.errorMessage ?? 'Failed to submit refund request'),
                                      backgroundColor: ruby,
                                    ),
                                  );
                                }
                              },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  // =========================================================================
  // REFUND TRACKER BOTTOM SHEET
  // =========================================================================
  void _showRefundTrackerBottomSheet(BuildContext context, ReservationModel b) {
    final status = b.refundStatus.isNotEmpty && b.refundStatus != 'None'
        ? b.refundStatus
        : (b.refundRequest?['status']?.toString() ?? 'Pending');

    final stLower = status.toLowerCase();
    final isApproved = stLower == 'approved';
    final isProcessing = stLower == 'processing';
    final isRefunded = stLower == 'refunded';
    final isRejected = stLower == 'rejected';

    Color statusColor;
    Color statusBg;
    String statusTitle;
    String statusSubtitle;

    if (isApproved) {
      statusColor = emerald;
      statusBg = emeraldBg;
      statusTitle = 'Approved by Staff';
      statusSubtitle = 'Hotel management has approved your refund. Awaiting payout processing.';
    } else if (isProcessing) {
      statusColor = blue;
      statusBg = blueBg;
      statusTitle = 'Processing Payout';
      statusSubtitle = 'Payout has been initiated by hotel staff. Funds will credit to your account shortly.';
    } else if (isRefunded) {
      statusColor = purple;
      statusBg = purpleBg;
      statusTitle = 'Refund Completed';
      statusSubtitle = 'The refund payout has been completed successfully.';
    } else if (isRejected) {
      statusColor = ruby;
      statusBg = rubyBg;
      statusTitle = 'Request Declined';
      statusSubtitle = 'Hotel management declined this refund request.';
    } else {
      statusColor = amber;
      statusBg = amberBg;
      statusTitle = 'Under Staff Review';
      statusSubtitle = 'Your request has been queued for Manager / Admin review.';
    }

    final reqAmount = b.refundableAmount > 0
        ? b.refundableAmount
        : (double.tryParse(b.refundRequest?['requestedAmount']?.toString() ?? '') ?? b.totalAmount);

    final reqMethod = b.refundRequest?['refundMethod']?.toString() ?? 'UPI';
    final upiId = b.refundRequest?['upiId']?.toString() ?? '';
    final decisionReason = b.refundRequest?['decisionReason']?.toString() ?? '';
    final txnId = b.refundRequest?['transactionId']?.toString() ?? '';

    int currentStep = 0;
    if (isApproved) currentStep = 1;
    if (isProcessing) currentStep = 2;
    if (isRefunded) currentStep = 3;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          decoration: const BoxDecoration(
            color: white,
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
                  decoration: BoxDecoration(color: cardBorder, borderRadius: BorderRadius.circular(4)),
                ),
              ),
              const SizedBox(height: 16),
              // Header
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: statusColor.withAlpha(50)),
                ),
                child: Row(
                  children: [
                    Icon(
                      isRefunded
                          ? Icons.check_circle_rounded
                          : isProcessing
                              ? Icons.sync_rounded
                              : isApproved
                                  ? Icons.thumb_up_rounded
                                  : isRejected
                                      ? Icons.cancel_rounded
                                      : Icons.schedule_rounded,
                      color: statusColor,
                      size: 22,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(statusTitle, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: statusColor)),
                          Text(statusSubtitle, style: TextStyle(fontSize: 11, color: statusColor.withAlpha(220))),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Stepper (if not rejected)
              if (!isRejected) ...[
                Row(
                  children: [
                    _buildStepCircle('Submitted', 0, currentStep, statusColor),
                    _buildStepLine(0 < currentStep, statusColor),
                    _buildStepCircle('Approved', 1, currentStep, statusColor),
                    _buildStepLine(1 < currentStep, statusColor),
                    _buildStepCircle('Processing', 2, currentStep, statusColor),
                    _buildStepLine(2 < currentStep, statusColor),
                    _buildStepCircle('Refunded', 3, currentStep, statusColor),
                  ],
                ),
                const SizedBox(height: 18),
              ],

              // Details
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: cardBorder),
                ),
                child: Column(
                  children: [
                    _buildModalInfoRow('Refund Amount:', Formatters.currency(reqAmount), valueColor: emerald),
                    const Divider(height: 14, color: cardBorder),
                    _buildModalInfoRow('Payout Method:', reqMethod),
                    if (upiId.isNotEmpty) ...[
                      const Divider(height: 14, color: cardBorder),
                      _buildModalInfoRow('UPI ID:', upiId),
                    ],
                    if (txnId.isNotEmpty) ...[
                      const Divider(height: 14, color: cardBorder),
                      _buildModalInfoRow('Transaction UTR:', txnId, valueColor: purple),
                    ],
                    if (decisionReason.isNotEmpty) ...[
                      const Divider(height: 14, color: cardBorder),
                      _buildModalInfoRow('Staff Notes:', decisionReason),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // =========================================================================
  // HELPER WIDGETS
  // =========================================================================
  Widget _buildStepCircle(String title, int stepIndex, int currentStep, Color activeColor) {
    final isDone = stepIndex <= currentStep;
    final isCurrent = stepIndex == currentStep;

    return Expanded(
      child: Column(
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDone ? activeColor : const Color(0xFFE2E8F0),
              border: isCurrent ? Border.all(color: navy, width: 2) : null,
            ),
            child: Icon(
              isDone ? Icons.check : Icons.circle,
              size: isDone ? 13 : 6,
              color: isDone ? white : const Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 9.5,
              fontWeight: isDone ? FontWeight.bold : FontWeight.w500,
              color: isDone ? navy : muted,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildStepLine(bool isDone, Color activeColor) {
    return Container(
      width: 14,
      height: 2,
      margin: const EdgeInsets.only(bottom: 14),
      color: isDone ? activeColor : const Color(0xFFE2E8F0),
    );
  }

  Widget _buildModalInfoRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12.5, color: muted)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: valueColor ?? navy,
            ),
            textAlign: TextAlign.right,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentPill(String paymentStatus) {
    final s = paymentStatus.toLowerCase();
    Color bg;
    Color fg;
    if (s == 'paid') {
      bg = emeraldBg;
      fg = emerald;
    } else if (s == 'partial') {
      bg = amberBg;
      fg = amber;
    } else {
      bg = rubyBg;
      fg = ruby;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: fg.withAlpha(50)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.payment_rounded, size: 10, color: fg),
          const SizedBox(width: 3),
          Text(
            Formatters.capitalize(paymentStatus),
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: fg),
          ),
        ],
      ),
    );
  }

  Widget _buildRefundStatusBadge(String status) {
    final s = status.toLowerCase();
    Color bg;
    Color fg;
    if (s == 'refunded') {
      bg = purpleBg;
      fg = purple;
    } else if (s == 'approved') {
      bg = emeraldBg;
      fg = emerald;
    } else if (s == 'processing') {
      bg = blueBg;
      fg = blue;
    } else if (s == 'rejected') {
      bg = rubyBg;
      fg = ruby;
    } else {
      bg = amberBg;
      fg = amber;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: fg),
      ),
    );
  }

  // =========================================================================
  // LOADING & ERROR SKELETONS
  // =========================================================================
  Widget _buildLoadingSkeleton() {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
      itemCount: 3,
      separatorBuilder: (_, _) => const SizedBox(height: 14),
      itemBuilder: (context, index) => Container(
        height: 220,
        decoration: BoxDecoration(
          color: white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: cardBorder),
        ),
        child: const Center(
          child: CircularProgressIndicator(color: purple, strokeWidth: 2.5),
        ),
      ),
    );
  }

  Widget _buildErrorState(GuestBookingProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, color: ruby, size: 48),
            const SizedBox(height: 14),
            const Text(
              'Unable to Load Bookings',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: navy),
            ),
            const SizedBox(height: 6),
            Text(
              provider.errorMessage ?? 'Please check your internet connection and try again.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: muted),
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Try Again', style: TextStyle(fontWeight: FontWeight.bold)),
              onPressed: () => provider.fetchMyBookings(),
            ),
          ],
        ),
      ),
    );
  }
}

enum _BookingTabType {
  upcoming,
  currentStay,
  completed,
  cancelled,
}
