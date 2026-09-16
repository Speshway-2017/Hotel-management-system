import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/manager/reservation_provider.dart';
import 'package:hour_stay_mobile/screens/manager/reservations/manager_reservation_detail_screen.dart';
import 'package:hour_stay_mobile/screens/manager/reservations/manager_create_reservation_screen.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'package:hour_stay_mobile/widgets/server_config_dialog.dart';

class ManagerTodayOperationsScreen extends StatefulWidget {
  final String? initialTab;

  const ManagerTodayOperationsScreen({super.key, this.initialTab});

  @override
  State<ManagerTodayOperationsScreen> createState() =>
      _ManagerTodayOperationsScreenState();
}

class _ManagerTodayOperationsScreenState
    extends State<ManagerTodayOperationsScreen> {
  // Hour Stay Theme Tokens
  static const Color navy = Color(0xFF0D1B2A);
  static const Color purple = Color(0xFF5B21B6);
  static const Color gold = Color(0xFFF5C06A);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color white = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF8A8F98);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color emerald = Color(0xFF10B981);
  static const Color ruby = Color(0xFFEF4444);
  static const Color rubyBg = Color(0xFFFEE2E2);
  static const Color amber = Color(0xFFD97706);
  static const Color blue = Color(0xFF2563EB);
  static const Color blueBg = Color(0xFFDBEAFE);

  String _selectedTab = 'Arrivals';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.initialTab != null && widget.initialTab!.isNotEmpty) {
      _selectedTab = widget.initialTab!;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshAllData();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _refreshAllData() async {
    await context.read<ReservationProvider>().fetchAll();
  }

  // Robust check if a date string represents today
  bool _isDateToday(String? dateStr) => Formatters.isToday(dateStr);

  @override
  Widget build(BuildContext context) {
    final resProvider = context.watch<ReservationProvider>();

    final allReservations = resProvider.reservations;

    // 1. Today's Arrivals (Total check-ins scheduled for today)
    final arrivals = allReservations.where((r) {
      final st = r.status.toLowerCase();
      if (st == 'cancelled' || st == 'rejected' || st == 'no-show' || st == 'no_show') {
        return false;
      }
      return _isDateToday(r.checkIn);
    }).toList();

    // 2. Today's Departures (Total check-outs scheduled for today)
    final departures = allReservations.where((r) {
      final st = r.status.toLowerCase();
      if (st == 'cancelled' || st == 'rejected' || st == 'no-show' || st == 'no_show') {
        return false;
      }
      return _isDateToday(r.checkOut);
    }).toList();

    // 3. In-House Active Stays
    final inHouse = allReservations.where((r) {
      final st = r.status.toLowerCase();
      return st == 'checked-in' ||
          st == 'checked_in' ||
          st == 'active' ||
          st == 'staying';
    }).toList();

    // 4. Pending-In (Arrivals for today not checked-in yet)
    final pendingIn = arrivals.where((r) {
      final st = r.status.toLowerCase();
      return st != 'checked-in' && st != 'checked_in' && st != 'cancelled';
    }).toList();

    // 5. Pending-Out (Departures for today not checked-out yet, still in-house)
    final pendingOut = departures.where((r) {
      final st = r.status.toLowerCase();
      return st == 'checked-in' || st == 'checked_in' || st == 'active' || st == 'staying';
    }).toList();

    final isLoading = resProvider.isLoading && allReservations.isEmpty;
    final hasError = resProvider.errorMessage != null && allReservations.isEmpty;

    return Scaffold(
      backgroundColor: background,
      appBar: _buildAppBar(context),
      floatingActionButton: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: navy.withAlpha(80),
              blurRadius: 12,
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
              MaterialPageRoute(
                builder: (_) => const ManagerCreateReservationScreen(),
              ),
            );
          },
        ),
      ),
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: _refreshAllData,
        child: isLoading
            ? const Center(
                child: CircularProgressIndicator(color: purple),
              )
            : hasError
                ? _buildErrorView(resProvider.errorMessage!)
                : CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: [

                      // 2. Search Bar & Below Navigation Tabs
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSearchBar(),
                              const SizedBox(height: 10),
                              _buildNavigationTabs(
                                arrivalsCount: arrivals.length,
                                departuresCount: departures.length,
                                inHouseCount: inHouse.length,
                                pendingInCount: pendingIn.length,
                                pendingOutCount: pendingOut.length,
                              ),
                            ],
                          ),
                        ),
                      ),

                      // 3. Tab Content List
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(14, 4, 14, 80),
                        sliver: _buildCurrentTabList(
                          arrivals: arrivals,
                          departures: departures,
                          inHouse: inHouse,
                          pendingIn: pendingIn,
                          pendingOut: pendingOut,
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
        "Today's Operations",
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
          hintText: "Search guest, booking ID, room...",
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

  // --- 3. Navigation Tabs (Arrivals, Departures, In-House, Pending-In, Pending-Out) ---
  Widget _buildNavigationTabs({
    required int arrivalsCount,
    required int departuresCount,
    required int inHouseCount,
    required int pendingInCount,
    required int pendingOutCount,
  }) {
    final tabs = [
      {'key': 'Arrivals', 'label': 'Arrivals', 'count': arrivalsCount, 'dot': emerald},
      {'key': 'Departures', 'label': 'Departures', 'count': departuresCount, 'dot': ruby},
      {'key': 'In-House', 'label': 'In-House', 'count': inHouseCount, 'dot': purple},
      {'key': 'Pending-In', 'label': 'Pending-In', 'count': pendingInCount, 'dot': amber},
      {'key': 'Pending-Out', 'label': 'Pending-Out', 'count': pendingOutCount, 'dot': const Color(0xFFEA580C)},
    ];

    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        clipBehavior: Clip.hardEdge,
        padding: EdgeInsets.zero,
        itemCount: tabs.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final tab = tabs[index];
          final isSelected = _selectedTab == tab['key'];
          final count = tab['count'] as int;
          final dotColor = tab['dot'] as Color?;

          return InkWell(
            onTap: () => setState(() => _selectedTab = tab['key'] as String),
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
                    tab['label'] as String,
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

  // --- 4. Current Tab Content List ---
  Widget _buildCurrentTabList({
    required List<ReservationModel> arrivals,
    required List<ReservationModel> departures,
    required List<ReservationModel> inHouse,
    required List<ReservationModel> pendingIn,
    required List<ReservationModel> pendingOut,
  }) {
    final query = _searchQuery.trim().toLowerCase();

    bool matchesReservation(ReservationModel r) {
      if (query.isEmpty) return true;
      return r.guestName.toLowerCase().contains(query) ||
          r.bookingId.toLowerCase().contains(query) ||
          r.roomNumber.toLowerCase().contains(query) ||
          r.roomType.toLowerCase().contains(query);
    }

    if (_selectedTab == 'Arrivals') {
      final list = arrivals.where(matchesReservation).toList();
      return _buildReservationList(
        items: list,
        emptyTitle: "No Arrivals Today",
        emptySubtitle: "No guest arrivals recorded for today's date.",
        icon: Icons.login_rounded,
        tabType: 'Arrivals',
      );
    }

    if (_selectedTab == 'Departures') {
      final list = departures.where(matchesReservation).toList();
      return _buildReservationList(
        items: list,
        emptyTitle: "No Departures Today",
        emptySubtitle: "No guest check-outs scheduled for today's date.",
        icon: Icons.logout_rounded,
        tabType: 'Departures',
      );
    }

    if (_selectedTab == 'In-House') {
      final list = inHouse.where(matchesReservation).toList();
      return _buildReservationList(
        items: list,
        emptyTitle: "No In-House Stays",
        emptySubtitle: "No active resident guests currently staying in the property.",
        icon: Icons.hotel_rounded,
        tabType: 'In-House',
      );
    }

    if (_selectedTab == 'Pending-In') {
      final list = pendingIn.where(matchesReservation).toList();
      return _buildReservationList(
        items: list,
        emptyTitle: "No Pending Check-Ins",
        emptySubtitle: "All scheduled arrivals for today have successfully checked in.",
        icon: Icons.pending_actions_rounded,
        tabType: 'Pending-In',
      );
    }

    if (_selectedTab == 'Pending-Out') {
      final list = pendingOut.where(matchesReservation).toList();
      return _buildReservationList(
        items: list,
        emptyTitle: "No Pending Check-Outs",
        emptySubtitle: "All departures for today have successfully checked out.",
        icon: Icons.alarm_on_rounded,
        tabType: 'Pending-Out',
      );
    }

    return const SliverToBoxAdapter(child: SizedBox.shrink());
  }

  Widget _buildReservationList({
    required List<ReservationModel> items,
    required String emptyTitle,
    required String emptySubtitle,
    required IconData icon,
    required String tabType,
  }) {
    if (items.isEmpty) {
      return SliverToBoxAdapter(
        child: _buildEmptyCard(
          title: emptyTitle,
          subtitle: emptySubtitle,
          icon: icon,
        ),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) => _buildStayCard(items[index], tabType),
        childCount: items.length,
      ),
    );
  }

  Widget _buildStayCard(ReservationModel res, String contextType) {
    final isDeparture = contextType == 'Departures' || contextType == 'Pending-Out';
    final isPendingIn = contextType == 'Pending-In';
    final isPendingOut = contextType == 'Pending-Out';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
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
                builder: (_) => ManagerReservationDetailScreen(
                  reservation: res,
                ),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Row 1: Guest name, Room pill & Status
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          Flexible(
                            child: Text(
                              res.guestName.isNotEmpty ? res.guestName : 'Guest',
                              style: const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: navy,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          if (res.roomNumber.isNotEmpty)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: cream,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: gold.withAlpha(120)),
                              ),
                              child: Text(
                                'Rm ${res.roomNumber}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: navy,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    StatusBadge(status: res.status),
                  ],
                ),
                const SizedBox(height: 6),

                // Row 2: Room Type, Stay Type, Booking ID
                Row(
                  children: [
                    Text(
                      res.roomType,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF475569),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '• #${res.bookingId.length > 8 ? res.bookingId.substring(res.bookingId.length - 6).toUpperCase() : res.bookingId}',
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontFamily: 'monospace',
                        color: muted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (isPendingIn) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: blueBg,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'Awaiting In',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: blue),
                        ),
                      ),
                    ],
                    if (isPendingOut) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: rubyBg,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'Due Out',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: ruby),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 8),

                // Row 3: Timings, Amounts, & Action Hint
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: cardBorder.withAlpha(100)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            isDeparture ? Icons.logout_rounded : Icons.login_rounded,
                            size: 13,
                            color: isDeparture ? amber : purple,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isDeparture
                                ? 'Out: ${Formatters.checkOutDateTime(res.checkOut)}'
                                : 'In: ${Formatters.checkInDateTime(res.checkIn)}',
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF334155),
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          Text(
                            Formatters.currency(res.totalAmount),
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: navy,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.chevron_right_rounded, size: 14, color: muted),
                        ],
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

  // --- Empty & Error Views ---
  Widget _buildEmptyCard({
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
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
              child: Icon(icon, size: 32, color: navy),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: navy),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
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
              'Unable to Load Operations',
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
                  onPressed: _refreshAllData,
                  style: ElevatedButton.styleFrom(backgroundColor: purple, foregroundColor: white),
                  icon: const Icon(Icons.refresh_rounded, size: 14),
                  label: const Text('Retry', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
