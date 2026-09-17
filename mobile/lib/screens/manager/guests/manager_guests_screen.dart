import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/guest_model.dart';
import 'package:hour_stay_mobile/providers/manager/guest_provider.dart';
import 'package:hour_stay_mobile/providers/manager/reservation_provider.dart';
import 'package:hour_stay_mobile/screens/manager/guests/manager_guest_detail_screen.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'package:hour_stay_mobile/widgets/server_config_dialog.dart';
import 'package:hour_stay_mobile/colours.dart';

class ManagerGuestsScreen extends StatefulWidget {
  const ManagerGuestsScreen({super.key});

  @override
  State<ManagerGuestsScreen> createState() => _ManagerGuestsScreenState();
}

class _ManagerGuestsScreenState extends State<ManagerGuestsScreen> {

  String _searchQuery = '';
  String _selectedStatus = 'All';
  String _selectedPayment = 'All';
  final TextEditingController _searchController = TextEditingController();

  final List<String> _statusFilters = [
    'All',
    'Checked-in',
    'Confirmed',
    'Checked-out',
    'Pending',
    'Cancelled',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    await Future.wait([
      context.read<GuestProvider>().fetchGuests(),
      context.read<ReservationProvider>().fetchAll(silent: true),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final guestProvider = context.watch<GuestProvider>();
    final guests = guestProvider.guests;

    // Filter guests
    final filteredGuests = guests.where((g) {
      final q = _searchQuery.trim().toLowerCase();
      final matchesSearch = q.isEmpty ||
          g.name.toLowerCase().contains(q) ||
          g.phone.toLowerCase().contains(q) ||
          g.email.toLowerCase().contains(q) ||
          g.room.toLowerCase().contains(q) ||
          g.bookingId.toLowerCase().contains(q);

      final statusStr = g.status.toLowerCase();
      final isCheckedIn = (statusStr.contains('in') && statusStr.contains('check')) || statusStr == 'staying';
      final isCheckedOut = statusStr.contains('out') && statusStr.contains('check');

      bool matchesStatus = true;
      if (_selectedStatus == 'Checked-in') {
        matchesStatus = isCheckedIn;
      } else if (_selectedStatus == 'Checked-out') {
        matchesStatus = isCheckedOut;
      } else if (_selectedStatus != 'All') {
        matchesStatus = statusStr == _selectedStatus.toLowerCase();
      }

      bool matchesPayment = true;
      if (_selectedPayment == 'Paid') {
        matchesPayment = g.paymentStatus.toLowerCase() == 'paid' ||
            g.paymentStatus.toLowerCase() == 'settled';
      } else if (_selectedPayment == 'Pending') {
        matchesPayment = g.paymentStatus.toLowerCase() == 'pending' ||
            g.paymentStatus.toLowerCase() == 'partial' ||
            g.paymentStatus.toLowerCase() == 'unpaid';
      }

      return matchesSearch && matchesStatus && matchesPayment;
    }).toList();

    // Metric Calculations
    final totalCount = guests.length;
    final inHouseCount = guests.where((g) {
      final st = g.status.toLowerCase();
      return st == 'checked-in' || st == 'checked_in' || st == 'staying' || (st.contains('in') && st.contains('check'));
    }).length;
    final confirmedCount = guests.where((g) => g.status.toLowerCase() == 'confirmed').length;
    final checkedOutCount = guests.where((g) => g.status.toLowerCase().contains('out')).length;
    final pendingCount = guests.where((g) => g.status.toLowerCase() == 'pending').length;
    final cancelledCount = guests.where((g) => g.status.toLowerCase() == 'cancelled' || g.status.toLowerCase() == 'canceled').length;

    final isLoading = guestProvider.isLoading && guests.isEmpty;
    final hasError = guestProvider.errorMessage != null && guests.isEmpty;

    return Scaffold(
      backgroundColor: background,
      appBar: _buildAppBar(context),
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: _loadData,
        child: isLoading
            ? const Center(
                child: CircularProgressIndicator(color: purple),
              )
            : hasError
                ? _buildErrorView(guestProvider.errorMessage!)
                : CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: [

                      // 2. Search Bar and Filters
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSearchBar(),
                              const SizedBox(height: 10),
                              _buildStatusFilters(
                                totalCount: totalCount,
                                inHouseCount: inHouseCount,
                                confirmedCount: confirmedCount,
                                checkedOutCount: checkedOutCount,
                                pendingCount: pendingCount,
                                cancelledCount: cancelledCount,
                              ),
                            ],
                          ),
                        ),
                      ),

                      // 3. Guest List Header / Count
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Guests Directory (${filteredGuests.length})',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: navy,
                                  letterSpacing: -0.2,
                                ),
                              ),
                              if (_searchQuery.isNotEmpty || _selectedStatus != 'All' || _selectedPayment != 'All')
                                InkWell(
                                  onTap: () {
                                    setState(() {
                                      _searchQuery = '';
                                      _selectedStatus = 'All';
                                      _selectedPayment = 'All';
                                      _searchController.clear();
                                    });
                                  },
                                  child: const Text(
                                    'Reset Filters',
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w700,
                                      color: purple,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),

                      // 4. Guest Directory Cards List / Empty State
                      if (filteredGuests.isEmpty)
                        SliverToBoxAdapter(
                          child: _buildEmptyState(),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(14, 0, 14, 80),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) => _buildGuestCard(filteredGuests[index]),
                              childCount: filteredGuests.length,
                            ),
                          ),
                        ),
                    ],
                  ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: navy,
      elevation: 0,
      scrolledUnderElevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
        onPressed: () => Navigator.of(context).maybePop(),
      ),
      title: const Text(
        'Guests & Profiles',
        style: TextStyle(
          color: white,
          fontWeight: FontWeight.w800,
          fontSize: 16,
          letterSpacing: -0.2,
        ),
      ),
    );
  }

  // --- 2. Search Bar ---
  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(4),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (val) => setState(() => _searchQuery = val),
        style: const TextStyle(fontSize: 13, color: navy),
        decoration: InputDecoration(
          hintText: "Search guests by name, phone, email, room, booking ID...",
          hintStyle: TextStyle(fontSize: 12, color: muted.withAlpha(180)),
          prefixIcon: const Icon(Icons.search_rounded, color: muted, size: 18),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear_rounded, size: 16, color: muted),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
      ),
    );
  }

  // --- 3. Filter Chips (Status & Payment) ---
  int _getStatusCount(String status, int totalCount, int inHouseCount, int confirmedCount, int checkedOutCount, int pendingCount, int cancelledCount) {
    if (status == 'All') return totalCount;
    if (status == 'Checked-in') return inHouseCount;
    if (status == 'Confirmed') return confirmedCount;
    if (status == 'Checked-out') return checkedOutCount;
    if (status == 'Pending') return pendingCount;
    if (status == 'Cancelled') return cancelledCount;
    return 0;
  }

  Widget _buildStatusFilters({
    required int totalCount,
    required int inHouseCount,
    required int confirmedCount,
    required int checkedOutCount,
    required int pendingCount,
    required int cancelledCount,
  }) {
    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        clipBehavior: Clip.hardEdge,
        padding: EdgeInsets.zero,
        itemCount: _statusFilters.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final status = _statusFilters[index];
          final isSelected = _selectedStatus == status;
          final count = _getStatusCount(status, totalCount, inHouseCount, confirmedCount, checkedOutCount, pendingCount, cancelledCount);

          Color? dotColor;
          if (status == 'Checked-in') dotColor = emerald;
          if (status == 'Confirmed') dotColor = purple;
          if (status == 'Pending') dotColor = amber;
          if (status == 'Checked-out') dotColor = blue;
          if (status == 'Cancelled') dotColor = ruby;

          return InkWell(
            onTap: () => setState(() => _selectedStatus = status),
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
                  if (dotColor != null) ...[
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    status,
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

  // --- 4. Guest Card ---
  Widget _buildGuestCard(GuestModel guest) {
    final isPaid = guest.paymentStatus.toLowerCase() == 'paid' ||
        guest.paymentStatus.toLowerCase() == 'settled';
    final isPending = guest.paymentStatus.toLowerCase() == 'pending' ||
        guest.paymentStatus.toLowerCase() == 'partial' ||
        guest.paymentStatus.toLowerCase() == 'unpaid';

    final hasRoom = guest.room.isNotEmpty && guest.room != '--';

    return Container(
      margin: const EdgeInsets.only(bottom: 9),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(4),
            blurRadius: 6,
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
                builder: (_) => ManagerGuestDetailScreen(guest: guest),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(13),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Avatar + Name + Room + Status Badge
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Avatar Initials
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [navyLight, navy],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        shape: BoxShape.circle,
                        border: Border.all(color: gold.withAlpha(140), width: 1.2),
                      ),
                      child: Center(
                        child: Text(
                          guest.name.isNotEmpty ? guest.name[0].toUpperCase() : 'G',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: gold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),

                    // Name, Booking ID & Room
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  guest.name.isNotEmpty ? guest.name : 'Guest',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: navy,
                                    letterSpacing: -0.2,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (hasRoom) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                  decoration: BoxDecoration(
                                    color: cream,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: gold.withAlpha(120)),
                                  ),
                                  child: Text(
                                    'Rm ${guest.room}',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: navy,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Text(
                                '#${guest.bookingId.length > 8 ? guest.bookingId.substring(guest.bookingId.length - 6).toUpperCase() : guest.bookingId.toUpperCase()}',
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontFamily: 'monospace',
                                  fontWeight: FontWeight.w600,
                                  color: purple,
                                ),
                              ),
                              if (guest.email.isNotEmpty) ...[
                                const SizedBox(width: 6),
                                Flexible(
                                  child: Text(
                                    '• ${guest.email}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: muted,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Status Badge
                    StatusBadge(status: guest.status),
                  ],
                ),

                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Divider(height: 1, color: cardBorder),
                ),

                // Bottom Row: Phone, Stay Dates, Payment Pill & Arrow
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Phone & Dates
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (guest.phone.isNotEmpty && guest.phone != '--')
                            Row(
                              children: [
                                const Icon(Icons.phone_outlined, size: 12, color: muted),
                                const SizedBox(width: 4),
                                Text(
                                  guest.phone,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF475569),
                                  ),
                                ),
                              ],
                            ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              const Icon(Icons.date_range_rounded, size: 12, color: muted),
                              const SizedBox(width: 4),
                              Text(
                                '${Formatters.date(guest.checkIn)} → ${Formatters.date(guest.checkOut)}',
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  color: Color(0xFF64748B),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Payment Badge & Action chevron
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                          decoration: BoxDecoration(
                            color: isPaid ? emeraldBg : (isPending ? amberBg : blueBg),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: isPaid
                                  ? emerald.withAlpha(80)
                                  : (isPending ? amber.withAlpha(80) : blue.withAlpha(80)),
                              width: 0.8,
                            ),
                          ),
                          child: Text(
                            guest.paymentStatus.toUpperCase(),
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: isPaid ? emerald : (isPending ? amber : blue),
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.chevron_right_rounded, size: 16, color: muted),
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

  // --- 6. Empty & Error States ---
  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cream,
                shape: BoxShape.circle,
                border: Border.all(color: gold.withAlpha(100)),
              ),
              child: const Icon(Icons.person_search_rounded, size: 34, color: navy),
            ),
            const SizedBox(height: 12),
            Text(
              _searchQuery.isNotEmpty ? 'No Matching Guests' : 'No Guests in CRM',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: navy),
            ),
            const SizedBox(height: 4),
            Text(
              _searchQuery.isNotEmpty
                  ? 'No guest profiles match "$_searchQuery". Try adjusting your search query or filter chips.'
                  : 'Your guest roster will populate in real-time as reservations and front-desk check-ins occur.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11.5, color: muted),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorView(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off_rounded, size: 48, color: ruby),
            const SizedBox(height: 12),
            const Text(
              'Unable to Load Guest CRM',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: navy),
            ),
            const SizedBox(height: 4),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: muted),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton.icon(
                  onPressed: () => ServerConfigDialog.show(context),
                  icon: const Icon(Icons.tune_rounded, size: 14, color: navy),
                  label: const Text('Server Settings', style: TextStyle(fontSize: 12, color: navy)),
                ),
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: _loadData,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navy,
                    foregroundColor: white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: const BorderSide(color: Color(0xFFF5C06A), width: 1.5),
                    ),
                  ),
                  icon: const Icon(Icons.refresh_rounded, size: 14, color: gold),
                  label: const Text(
                    'Retry',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: white,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
