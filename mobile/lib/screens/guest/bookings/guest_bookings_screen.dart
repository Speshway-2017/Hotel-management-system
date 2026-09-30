import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import 'package:hour_stay_mobile/providers/auth_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import '../../auth/login_screen.dart';
import '../feedback/guest_add_feedback_screen.dart';
import '../folio/guest_folio_screen.dart';
import '../search/guest_search_screen.dart';
import 'guest_booking_detail_screen.dart';
import 'package:hour_stay_mobile/colours.dart';
import 'package:hour_stay_mobile/core/utils/input_validators.dart';


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

class _GuestBookingsScreenState extends State<GuestBookingsScreen> {
  String _selectedFilter = 'all';
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isFilterMenuOpen = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialTabIndex == 1) {
      _selectedFilter = 'upcoming';
    } else if (widget.initialTabIndex == 2) {
      _selectedFilter = 'current';
    } else if (widget.initialTabIndex == 3) {
      _selectedFilter = 'completed';
    } else {
      _selectedFilter = 'all';
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GuestBookingProvider>().fetchMyBookings();
    });
  }

  @override
  void dispose() {
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

  _BookingTabType _getBookingTabType(ReservationModel b) {
    final s = b.status.toLowerCase();
    if (s == 'cancelled') return _BookingTabType.cancelled;
    if (s == 'checked_in' || s == 'checked-in') return _BookingTabType.currentStay;
    if (s == 'checked_out' || s == 'checked-out' || s == 'completed') return _BookingTabType.completed;
    return _BookingTabType.upcoming;
  }

  String get _emptyTitle {
    switch (_selectedFilter) {
      case 'upcoming':
        return 'No Upcoming Stays';
      case 'current':
        return 'No Current Stay Active';
      case 'completed':
        return 'No Past Stays';
      case 'cancelled':
        return 'No Cancelled Bookings';
      default:
        return 'No Bookings Found';
    }
  }

  String get _emptyMessage {
    switch (_selectedFilter) {
      case 'upcoming':
        return 'When you book a room or hourly stay, your active reservation will appear here.';
      case 'current':
        return 'You are not currently checked into any room. Check-in details will appear here.';
      case 'completed':
        return 'Your completed stays, digital folios, and invoices will be archived here.';
      case 'cancelled':
        return 'Cancelled reservations and refund tracking requests will be listed here.';
      default:
        return 'We could not find any bookings matching your criteria. Try adjusting your search query or filters.';
    }
  }

  IconData get _emptyIcon {
    switch (_selectedFilter) {
      case 'upcoming':
        return Icons.calendar_today_outlined;
      case 'current':
        return Icons.hotel_outlined;
      case 'completed':
        return Icons.history_rounded;
      case 'cancelled':
        return Icons.cancel_outlined;
      default:
        return Icons.search_off_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final isAuthenticated = authProvider.isAuthenticated;
    final bookingProvider = context.watch<GuestBookingProvider>();
    final allBookings = bookingProvider.bookings;

    // Filter into exact business categories from real MongoDB data
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

    final List<ReservationModel> activeList = _selectedFilter == 'all'
        ? allBookings
        : _selectedFilter == 'upcoming'
            ? upcomingBookings
            : _selectedFilter == 'current'
                ? currentStayBookings
                : _selectedFilter == 'completed'
                    ? completedBookings
                    : cancelledBookings;

    final filteredBookings = applySearch(activeList);
    final isInitialLoading = bookingProvider.isLoading && allBookings.isEmpty;

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: navy,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
          onPressed: () {
            if (widget.onNavigateTab != null) {
              widget.onNavigateTab!(2);
            } else if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
          },
        ),
        title: const Text(
          'My Bookings',
          style: TextStyle(
            color: cream,
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
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
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: () => bookingProvider.fetchMyBookings(),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          slivers: [
            SliverToBoxAdapter(
              child: _buildHeaderSection(
                allCount: allBookings.length,
                upcomingCount: upcomingBookings.length,
                currentCount: currentStayBookings.length,
                completedCount: completedBookings.length,
                cancelledCount: cancelledBookings.length,
              ),
            ),
            if (!isAuthenticated)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _buildGuestModeState(context),
              )
            else if (isInitialLoading)
              SliverToBoxAdapter(child: _buildLoadingSkeleton())
            else if (bookingProvider.errorMessage != null && allBookings.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _buildErrorState(bookingProvider),
              )
            else if (filteredBookings.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 32, 16, 120),
                  child: EmptyState(
                    icon: _emptyIcon,
                    title: _emptyTitle,
                    message: _emptyMessage,
                    actionText: _selectedFilter == 'upcoming' || _selectedFilter == 'current' || _selectedFilter == 'all'
                        ? 'Explore Rooms'
                        : 'Refresh Stays',
                    onAction: () {
                      if (_selectedFilter == 'upcoming' || _selectedFilter == 'current' || _selectedFilter == 'all') {
                        _navigateToSearch(context);
                      } else {
                        bookingProvider.fetchMyBookings();
                      }
                    },
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 120),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final booking = filteredBookings[index];
                      final tabType = _getBookingTabType(booking);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _buildBookingCard(context, booking, tabType),
                      );
                    },
                    childCount: filteredBookings.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // =========================================================================
  // HEADER SECTION (Search Bar & Inline Filter Dropdown)
  // =========================================================================
  Widget _buildHeaderSection({
    required int allCount,
    required int upcomingCount,
    required int currentCount,
    required int completedCount,
    required int cancelledCount,
  }) {
    final List<Map<String, dynamic>> filters = <Map<String, dynamic>>[
      <String, dynamic>{'key': 'all', 'label': 'All Bookings', 'shortLabel': 'All', 'count': allCount, 'icon': Icons.all_inbox_rounded},
      <String, dynamic>{'key': 'upcoming', 'label': 'Upcoming Stays', 'shortLabel': 'Upcoming', 'count': upcomingCount, 'icon': Icons.calendar_today_rounded},
      <String, dynamic>{'key': 'current', 'label': 'Current Stay (In-House)', 'shortLabel': 'Current', 'count': currentCount, 'icon': Icons.hotel_rounded, 'isLive': currentCount > 0},
      <String, dynamic>{'key': 'completed', 'label': 'Completed Stays', 'shortLabel': 'Completed', 'count': completedCount, 'icon': Icons.task_alt_rounded},
      <String, dynamic>{'key': 'cancelled', 'label': 'Cancelled Stays', 'shortLabel': 'Cancelled', 'count': cancelledCount, 'icon': Icons.cancel_outlined},
    ];

    return Container(
      decoration: const BoxDecoration(
        color: white,
        border: Border(bottom: BorderSide(color: cardBorder, width: 1)),
      ),
      padding: const EdgeInsets.fromLTRB(0, 14, 0, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search Field & Filter Button in Single Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                // 1. Search Bar
                Expanded(
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
                        hintText: 'Search by ID, hotel, room...',
                        hintStyle: const TextStyle(fontSize: 12.5, color: muted),
                        prefixIcon: const Icon(Icons.search_rounded, color: muted, size: 18),
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
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                      ),
                      onChanged: (val) {
                        setState(() => _searchQuery = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // 2. Filter Dropdown Button beside Search Bar
                _buildBookingsFilterButton(filters),
              ],
            ),
          ),

          // 3. Inline Expandable Filter Options directly below the search area
          if (_isFilterMenuOpen) ...[
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: cardBorder),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(10),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: filters.map((f) {
                    final key = f['key'] as String;
                    final label = f['label'] as String;
                    final count = f['count'] as int;
                    final icon = f['icon'] as IconData;
                    final isLive = (f['isLive'] as bool?) ?? false;
                    final isSel = _selectedFilter == key;

                    return InkWell(
                      onTap: () {
                        setState(() {
                          _selectedFilter = key;
                          _isFilterMenuOpen = false;
                        });
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 2),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                        decoration: BoxDecoration(
                          color: isSel ? navy : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              icon,
                              size: 16,
                              color: isSel ? gold : purple,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Row(
                                children: [
                                  if (isLive) ...[
                                    Container(
                                      width: 6,
                                      height: 6,
                                      margin: const EdgeInsets.only(right: 6),
                                      decoration: const BoxDecoration(
                                        color: gold,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ],
                                  Text(
                                    label,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                      color: isSel ? cream : navy,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: isSel ? gold : const Color(0xFFE2E8F0),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '$count',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                  color: isSel ? navy : const Color(0xFF475569),
                                ),
                              ),
                            ),
                            if (isSel) ...[
                              const SizedBox(width: 8),
                              const Icon(Icons.check_rounded, color: gold, size: 16),
                            ],
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildBookingsFilterButton(List<Map<String, dynamic>> filters) {
    Map<String, dynamic> currentMatch = filters.first;
    for (final f in filters) {
      if (f['key'] == _selectedFilter) {
        currentMatch = f;
        break;
      }
    }

    final selectedLabel = currentMatch['shortLabel'] as String;
    final selectedCount = currentMatch['count'] as int;
    final isFiltered = _selectedFilter != 'all';

    return InkWell(
      onTap: () {
        setState(() {
          _isFilterMenuOpen = !_isFilterMenuOpen;
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 42,
        padding: const EdgeInsets.symmetric(horizontal: 11),
        decoration: BoxDecoration(
          color: (_isFilterMenuOpen || isFiltered) ? navy : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: (_isFilterMenuOpen || isFiltered) ? gold : cardBorder,
            width: 1.2,
          ),
          boxShadow: (_isFilterMenuOpen || isFiltered)
              ? [
                  BoxShadow(
                    color: navy.withAlpha(30),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.tune_rounded,
              size: 16,
              color: (_isFilterMenuOpen || isFiltered) ? gold : purple,
            ),
            const SizedBox(width: 5),
            Text(
              isFiltered ? selectedLabel : 'Filter',
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: (_isFilterMenuOpen || isFiltered) ? FontWeight.w800 : FontWeight.w600,
                color: (_isFilterMenuOpen || isFiltered) ? cream : navy,
              ),
            ),
            if (isFiltered) ...[
              const SizedBox(width: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                decoration: BoxDecoration(
                  color: gold,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$selectedCount',
                  style: const TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.w900,
                    color: navy,
                  ),
                ),
              ),
            ],
            const SizedBox(width: 3),
            Icon(
              _isFilterMenuOpen ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
              size: 16,
              color: (_isFilterMenuOpen || isFiltered) ? gold : muted,
            ),
          ],
        ),
      ),
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
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => GuestBookingDetailScreen(booking: b),
              ),
            );
          },
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
                  Flexible(
                    child: InkWell(
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
                          Flexible(
                            child: Text(
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
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
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
                  ),
                  const SizedBox(width: 6),
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
                                    b.roomNumber.isNotEmpty ? 'Room ${b.roomNumber}' : 'Room Assigned',
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
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
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
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
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
                            Expanded(
                              child: Text(
                                '${b.adults} Adults${b.children > 0 ? ", ${b.children} Kids" : ""} (${b.roomsCount} Room)',
                                style: const TextStyle(fontSize: 11.5, color: Color(0xFF475569), fontWeight: FontWeight.w500),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(
                                color: goldBg,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                durationText,
                                style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: Color(0xFFB45309)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

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
    return Row(
      children: [
        // View Details Button
        Expanded(
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: navy,
              foregroundColor: white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.remove_red_eye_outlined, size: 16, color: gold),
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
        ),
        const SizedBox(width: 8),
        // Cancel Stay Button
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
    );
  }

  // --- CURRENT STAY ACTIONS ---
  Widget _buildCurrentStayActions(BuildContext context, ReservationModel b) {
    return Row(
      children: [
        // 1. View Stay
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
            icon: const Icon(Icons.remove_red_eye_outlined, size: 16, color: gold),
            label: const Text(
              'View Stay',
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
    return Row(
      children: [
        // 1. Write Feedback / Review
        Expanded(
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: navy,
              foregroundColor: white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.star_rate_rounded, size: 16, color: gold),
            label: const Text(
              'Feedback',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
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
        // 2. Digital Folio
        Expanded(
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: navy,
              side: const BorderSide(color: cardBorder),
              padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.receipt_long_outlined, size: 15, color: navy),
            label: const Text(
              'Digital Folio',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
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
  // CANCELLATION MODAL DIALOG
  // =========================================================================
  Future<void> _showCancelBookingDialog(BuildContext context, ReservationModel currentBooking) async {
    final reasonController = TextEditingController();
    final remarksController = TextEditingController();
    String? reasonError;
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
                      onChanged: (val) {
                        setDialogState(() {
                          reasonError = val.trim().isEmpty ? 'Cancellation reason is required' : null;
                        });
                      },
                      decoration: InputDecoration(
                        hintText: 'e.g. Change in travel plans, Personal emergency',
                        hintStyle: const TextStyle(fontSize: 12, color: muted),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: reasonError != null ? InputValidators.errorRed : cardBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: reasonError != null ? InputValidators.errorRed : cardBorder)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: reasonError != null ? InputValidators.errorRed : purple, width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                    if (reasonError != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: InputValidators.errorRed, size: 13),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(reasonError!, style: InputValidators.errorTextStyle),
                          ),
                        ],
                      ),
                    ],
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
                          final rErr = reasonController.text.trim().isEmpty ? 'Cancellation reason is required' : null;
                          if (rErr != null) {
                            setDialogState(() => reasonError = rErr);
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
    String? upiError;
    String? holderError;
    String? accountNumError;
    String? ifscError;

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
                        onChanged: (val) {
                          setSheetState(() {
                            upiError = InputValidators.validateUpi(val, required: true);
                          });
                        },
                        decoration: InputDecoration(
                          hintText: 'e.g. mobile@okaxis or user@upi',
                          hintStyle: const TextStyle(fontSize: 12, color: muted),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: upiError != null ? InputValidators.errorRed : cardBorder)),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: upiError != null ? InputValidators.errorRed : cardBorder)),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: upiError != null ? InputValidators.errorRed : purple, width: 1.5)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      if (upiError != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, color: InputValidators.errorRed, size: 13),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(upiError!, style: InputValidators.errorTextStyle),
                            ),
                          ],
                        ),
                      ],
                    ] else ...[
                      const Text('Account Holder Name *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: holderController,
                        style: const TextStyle(fontSize: 13),
                        onChanged: (val) {
                          setSheetState(() {
                            holderError = InputValidators.validateName(val, fieldName: 'Account holder name', required: true);
                          });
                        },
                        decoration: InputDecoration(
                          hintText: 'Name as per bank records',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: holderError != null ? InputValidators.errorRed : cardBorder)),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: holderError != null ? InputValidators.errorRed : cardBorder)),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: holderError != null ? InputValidators.errorRed : purple, width: 1.5)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      if (holderError != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, color: InputValidators.errorRed, size: 13),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(holderError!, style: InputValidators.errorTextStyle),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 10),
                      const Text('Bank Account Number *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: accountNumController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(fontSize: 13),
                        onChanged: (val) {
                          setSheetState(() {
                            accountNumError = InputValidators.validateAccountNumber(val, required: true);
                          });
                        },
                        decoration: InputDecoration(
                          hintText: 'e.g. 01234567890123',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: accountNumError != null ? InputValidators.errorRed : cardBorder)),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: accountNumError != null ? InputValidators.errorRed : cardBorder)),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: accountNumError != null ? InputValidators.errorRed : purple, width: 1.5)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      if (accountNumError != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, color: InputValidators.errorRed, size: 13),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(accountNumError!, style: InputValidators.errorTextStyle),
                            ),
                          ],
                        ),
                      ],
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
                                  onChanged: (val) {
                                    setSheetState(() {
                                      final trimmed = val.trim();
                                      if (trimmed.isEmpty) {
                                        ifscError = 'IFSC code is required';
                                      } else if (trimmed.length < 8 || trimmed.length > 11) {
                                        ifscError = 'IFSC must be 8-11 characters';
                                      } else {
                                        ifscError = null;
                                      }
                                    });
                                  },
                                  decoration: InputDecoration(
                                    hintText: 'e.g. HDFC0001234',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: ifscError != null ? InputValidators.errorRed : cardBorder)),
                                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: ifscError != null ? InputValidators.errorRed : cardBorder)),
                                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: ifscError != null ? InputValidators.errorRed : purple, width: 1.5)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  ),
                                ),
                                if (ifscError != null) ...[
                                  const SizedBox(height: 4),
                                  Text(ifscError!, style: InputValidators.errorTextStyle),
                                ],
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
                                if (refundMethod == 'UPI') {
                                  final uErr = InputValidators.validateUpi(upiController.text, required: true);
                                  if (uErr != null) {
                                    setSheetState(() => upiError = uErr);
                                    return;
                                  }
                                } else {
                                  final hErr = InputValidators.validateName(holderController.text, fieldName: 'Account holder name', required: true);
                                  final aErr = InputValidators.validateAccountNumber(accountNumController.text, required: true);
                                  final ifscTrim = ifscController.text.trim();
                                  final iErr = ifscTrim.isEmpty
                                      ? 'IFSC code is required'
                                      : (ifscTrim.length < 8 || ifscTrim.length > 11 ? 'IFSC must be 8-11 characters' : null);

                                  if (hErr != null || aErr != null || iErr != null) {
                                    setSheetState(() {
                                      holderError = hErr;
                                      accountNumError = aErr;
                                      ifscError = iErr;
                                    });
                                    return;
                                  }
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
      crossAxisAlignment: CrossAxisAlignment.start,
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

  Widget _buildGuestModeState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: gold.withAlpha(80), width: 1.2),
            boxShadow: [
              BoxShadow(
                color: navy.withAlpha(8),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: navy,
                  shape: BoxShape.circle,
                  border: Border.all(color: gold, width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: navy.withAlpha(30),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(Icons.hotel_rounded, size: 30, color: gold),
              ),
              const SizedBox(height: 18),
              const Text(
                'Welcome to Hour Stay',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: navy,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Sign in or create an account to view your upcoming stays, active reservations, and digital check-in keys.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: muted,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
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
                  icon: const Icon(Icons.login_rounded, size: 18, color: gold),
                  label: const Text(
                    'Sign In / Register',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.2,
                    ),
                  ),
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState(GuestBookingProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: cardBorder, width: 1.2),
            boxShadow: [
              BoxShadow(
                color: navy.withAlpha(8),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: slateBg,
                  shape: BoxShape.circle,
                  border: Border.all(color: gold.withAlpha(120), width: 1.5),
                ),
                child: const Icon(Icons.sync_problem_rounded, size: 28, color: navy),
              ),
              const SizedBox(height: 16),
              const Text(
                'Unable to Load Reservations',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: navy,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'We could not refresh your stay details right now. Please verify your connection and tap retry.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: muted, height: 1.4),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: navy,
                  foregroundColor: white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: gold, width: 1),
                  ),
                ),
                icon: const Icon(Icons.refresh_rounded, size: 18, color: gold),
                label: const Text('Refresh Stays', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
                onPressed: () => provider.fetchMyBookings(),
              ),
            ],
          ),
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
