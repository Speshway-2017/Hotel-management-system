import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/manager/reservation_provider.dart';
import 'package:hour_stay_mobile/widgets/server_config_dialog.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'manager_create_reservation_screen.dart';
import 'manager_reservation_detail_screen.dart';

class ManagerReservationsScreen extends StatefulWidget {
  const ManagerReservationsScreen({super.key});

  @override
  State<ManagerReservationsScreen> createState() => _ManagerReservationsScreenState();
}

class _ManagerReservationsScreenState extends State<ManagerReservationsScreen> {
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
  static const Color ruby = Color(0xFFE53935);

  String _selectedFilter = 'all';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<ReservationProvider>();
      if (provider.reservations.isEmpty && !provider.isLoading) {
        provider.fetchAll();
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ReservationProvider>();
    final allReservations = provider.reservations;

    // Filter by status
    var filteredList = allReservations;
    if (_selectedFilter != 'all') {
      filteredList = filteredList.where((r) {
        final st = r.status.toLowerCase();
        if (_selectedFilter == 'checked_in') {
          return st == 'checked-in' || st == 'checked_in' || st == 'active' || st == 'staying';
        }
        if (_selectedFilter == 'checked_out') {
          return st == 'checked-out' || st == 'checked_out' || st == 'completed';
        }
        return st == _selectedFilter.toLowerCase();
      }).toList();
    }

    // Filter by search query
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      filteredList = filteredList.where((r) {
        return r.guestName.toLowerCase().contains(q) ||
            r.roomNumber.toLowerCase().contains(q) ||
            r.reservationNumber.toLowerCase().contains(q) ||
            r.phone.toLowerCase().contains(q) ||
            r.roomType.toLowerCase().contains(q);
      }).toList();
    }

    // Status counter helper for filter chips
    int getCount(String filterKey) {
      if (filterKey == 'all') return allReservations.length;
      if (filterKey == 'checked_in') {
        return allReservations.where((r) {
          final st = r.status.toLowerCase();
          return st == 'checked-in' || st == 'checked_in' || st == 'active' || st == 'staying';
        }).length;
      }
      if (filterKey == 'checked_out') {
        return allReservations.where((r) {
          final st = r.status.toLowerCase();
          return st == 'checked-out' || st == 'checked_out' || st == 'completed';
        }).length;
      }
      return allReservations.where((r) => r.status.toLowerCase() == filterKey.toLowerCase()).length;
    }

    final isInitialLoading = provider.isLoading && allReservations.isEmpty;

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
                  'New Booking',
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
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ManagerCreateReservationScreen()),
              );
            },
          ),
        ),
      ),
      body: Column(
        children: [
          // 1. Search & Filter Bar Section
          _buildSearchAndFilterHeader(allReservations, getCount),

          // 2. Main Reservation Content Area
          Expanded(
            child: RefreshIndicator(
              color: purple,
              backgroundColor: white,
              onRefresh: () => provider.fetchAll(),
              child: isInitialLoading
                  ? _buildLoadingState()
                  : provider.errorMessage != null && allReservations.isEmpty
                      ? _buildErrorState(provider)
                      : filteredList.isEmpty
                          ? _buildEmptyState(provider)
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(14, 12, 14, 100),
                              itemCount: filteredList.length,
                              itemBuilder: (context, index) {
                                final res = filteredList[index];
                                return _buildReservationCard(context, res);
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }

  // --- Search & Filter Header ---
  Widget _buildSearchAndFilterHeader(
    List<ReservationModel> allReservations,
    int Function(String) getCount,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: white,
        border: const Border(bottom: BorderSide(color: cardBorder, width: 1)),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(5),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      child: Column(
        children: [
          // Search Input Field
          Container(
            height: 42,
            decoration: BoxDecoration(
              color: background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: cardBorder),
            ),
            child: TextField(
              controller: _searchController,
              textAlignVertical: TextAlignVertical.center,
              style: const TextStyle(fontSize: 13, color: navy, fontWeight: FontWeight.w600),
              decoration: InputDecoration(
                isDense: true,
                hintText: 'Search guest, room, or booking ID...',
                hintStyle: const TextStyle(fontSize: 12, color: muted, fontWeight: FontWeight.w500),
                prefixIcon: const Icon(Icons.search_rounded, size: 18, color: muted),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded, size: 16, color: muted),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),
          const SizedBox(height: 10),

          // Scrollable Status Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildModernFilterChip('All', 'all', getCount('all')),
                const SizedBox(width: 6),
                _buildModernFilterChip('Confirmed', 'confirmed', getCount('confirmed')),
                const SizedBox(width: 6),
                _buildModernFilterChip('Checked In', 'checked_in', getCount('checked_in'), activeColor: emerald),
                const SizedBox(width: 6),
                _buildModernFilterChip('Pending', 'pending', getCount('pending'), activeColor: const Color(0xFFD97706)),
                const SizedBox(width: 6),
                _buildModernFilterChip('Checked Out', 'checked_out', getCount('checked_out'), activeColor: const Color(0xFF2563EB)),
                const SizedBox(width: 6),
                _buildModernFilterChip('Cancelled', 'cancelled', getCount('cancelled'), activeColor: ruby),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModernFilterChip(
    String label,
    String value,
    int count, {
    Color activeColor = purple,
  }) {
    final isSelected = _selectedFilter == value;

    return InkWell(
      onTap: () => setState(() => _selectedFilter = value),
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : background,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? activeColor : cardBorder,
            width: 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: activeColor.withAlpha(50),
                    blurRadius: 4,
                    offset: const Offset(0, 1.5),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? white : const Color(0xFF475569),
              ),
            ),
            const SizedBox(width: 5),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
              decoration: BoxDecoration(
                color: isSelected ? white.withAlpha(40) : white,
                borderRadius: BorderRadius.circular(10),
                border: isSelected ? null : Border.all(color: cardBorder),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? white : const Color(0xFF64748B),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Modern Reservation Card ---
  Widget _buildReservationCard(BuildContext context, ReservationModel res) {
    final isCheckedIn = res.status.toLowerCase() == 'checked-in' || res.status.toLowerCase() == 'checked_in';
    final isVerified = res.idVerification == 'Verified';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isCheckedIn ? emerald.withAlpha(80) : cardBorder,
          width: isCheckedIn ? 1.2 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(6),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => ManagerReservationDetailScreen(reservation: res),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(13),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Room badge, Booking ID, Source, and Status Badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: const Color(0xFF2563EB).withAlpha(50),
                            ),
                          ),
                          child: Text(
                            'Room ${res.roomNumber.isNotEmpty ? res.roomNumber : '?' }',
                            style: const TextStyle(
                              color: Color(0xFF1E40AF),
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '#${res.reservationNumber}',
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
                const SizedBox(height: 10),

                // Guest Name & Stay Mode Pill
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            res.guestName,
                            style: const TextStyle(
                              fontSize: 15,
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
                              fontSize: 11.5,
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
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                      decoration: BoxDecoration(
                        color: navy.withAlpha(12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '${res.nights > 0 ? res.nights : 1}N Stay (24h)',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: navy,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Timing & ID verification strip
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                  decoration: BoxDecoration(
                    color: background,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 12, color: muted),
                          const SizedBox(width: 4),
                          Text(
                            Formatters.date(res.checkIn),
                            style: const TextStyle(fontSize: 11, color: navy, fontWeight: FontWeight.w600),
                          ),
                          if (res.checkOut.isNotEmpty && res.checkOut != res.checkIn) ...[
                            const Text(' → ', style: TextStyle(fontSize: 10, color: muted)),
                            Text(
                              Formatters.date(res.checkOut),
                              style: const TextStyle(fontSize: 11, color: navy, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ],
                      ),
                      if (isVerified)
                        const Row(
                          children: [
                            Icon(Icons.verified_rounded, size: 12, color: emerald),
                            SizedBox(width: 3),
                            Text(
                              'ID Verified',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: emerald,
                              ),
                            ),
                          ],
                        )
                      else if (res.phone.isNotEmpty)
                        Row(
                          children: [
                            const Icon(Icons.phone_outlined, size: 11, color: muted),
                            const SizedBox(width: 3),
                            Text(
                              res.phone,
                              style: const TextStyle(fontSize: 10.5, color: muted),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // Bottom Row: Price, Payment Badge, & Details Action
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(
                          Formatters.currency(res.totalAmount),
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: navy,
                          ),
                        ),
                        const SizedBox(width: 6),
                        StatusBadge(
                          status: res.paymentStatus,
                          fontSize: 9.5,
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        ),
                      ],
                    ),
                    const Row(
                      children: [
                        Text(
                          'View Folio',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: purple,
                          ),
                        ),
                        SizedBox(width: 2),
                        Icon(Icons.chevron_right_rounded, size: 16, color: purple),
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

  // --- Loading State ---
  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 28,
            height: 28,
            child: CircularProgressIndicator(strokeWidth: 2.5, color: purple),
          ),
          SizedBox(height: 12),
          Text(
            'Fetching live reservations from MongoDB...',
            style: TextStyle(
              color: muted,
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  // --- Error State ---
  Widget _buildErrorState(ReservationProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: const Icon(Icons.cloud_off_rounded, color: ruby, size: 26),
            ),
            const SizedBox(height: 12),
            const Text(
              'Unable to load reservations',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              provider.errorMessage ?? 'Please verify your network connection to the HMS server.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton.icon(
                  onPressed: () => ServerConfigDialog.show(context),
                  icon: const Icon(Icons.tune_rounded, size: 14, color: navy),
                  label: const Text('Server Settings', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: navy)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    side: BorderSide(color: navy.withAlpha(60)),
                  ),
                ),
                const SizedBox(width: 10),
                ElevatedButton.icon(
                  onPressed: () => provider.fetchAll(),
                  icon: const Icon(Icons.refresh_rounded, size: 14, color: white),
                  label: const Text('Retry', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: purple,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- Empty State ---
  Widget _buildEmptyState(ReservationProvider provider) {
    final isFiltered = _searchQuery.isNotEmpty || _selectedFilter != 'all';

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: cream,
                shape: BoxShape.circle,
                border: Border.all(color: gold.withAlpha(100)),
              ),
              child: const Icon(Icons.calendar_month_outlined, color: navy, size: 28),
            ),
            const SizedBox(height: 12),
            Text(
              isFiltered ? 'No Matching Reservations' : 'No Reservations Recorded Yet',
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              isFiltered
                  ? 'Try clearing your search query or switching the status filter.'
                  : 'New bookings will automatically appear here in real-time.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 14),
            if (isFiltered)
              OutlinedButton.icon(
                onPressed: () {
                  _searchController.clear();
                  setState(() {
                    _searchQuery = '';
                    _selectedFilter = 'all';
                  });
                },
                icon: const Icon(Icons.clear_all_rounded, size: 14, color: purple),
                label: const Text('Reset Filters', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: purple)),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  side: const BorderSide(color: purple),
                ),
              )
            else
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ManagerCreateReservationScreen()),
                  );
                },
                icon: const Icon(Icons.add, size: 14, color: white),
                label: const Text('Create First Booking', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: white)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: purple,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
