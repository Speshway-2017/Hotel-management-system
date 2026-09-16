import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/models/room_model.dart';
import 'package:hour_stay_mobile/providers/manager/reservation_provider.dart';
import 'package:hour_stay_mobile/providers/manager/room_provider.dart';
import 'package:hour_stay_mobile/screens/manager/reservations/manager_create_reservation_screen.dart';
import 'package:hour_stay_mobile/screens/manager/reservations/manager_reservation_detail_screen.dart';
import 'package:hour_stay_mobile/widgets/server_config_dialog.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'manager_room_detail_dialog.dart';

class ManagerRoomsScreen extends StatefulWidget {
  const ManagerRoomsScreen({super.key});

  @override
  State<ManagerRoomsScreen> createState() => _ManagerRoomsScreenState();
}

class _ManagerRoomsScreenState extends State<ManagerRoomsScreen> {
  // Hour Stay Design Tokens
  static const Color navy = Color(0xFF0D1B2A);
  static const Color gold = Color(0xFFF5C06A);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color white = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF8A8F98);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color emerald = Color(0xFF10B981);
  static const Color blue = Color(0xFF2563EB);
  static const Color purple = Color(0xFF5B21B6);
  static const Color ruby = Color(0xFFEF4444);

  String _statusFilter = 'all';
  String _floorFilter = 'all';
  String _typeFilter = 'all';
  String _searchQuery = '';
  bool _isGridView = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final roomProvider = context.read<RoomProvider>();
      final resProvider = context.read<ReservationProvider>();
      if (roomProvider.rooms.isEmpty && !roomProvider.isLoading) {
        roomProvider.fetchAll();
      }
      if (resProvider.reservations.isEmpty && !resProvider.isLoading) {
        resProvider.fetchAll(silent: true);
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  ReservationModel? _findActiveBooking(String roomNum, List<ReservationModel> allBookings) {
    if (roomNum.trim().isEmpty) return null;
    final cleanNum = roomNum.trim();

    return allBookings.where((b) {
      final bRoom = (b.roomNumber.isNotEmpty ? b.roomNumber : b.room).trim();
      final match = bRoom == cleanNum || bRoom.contains(cleanNum);
      final st = b.status.toLowerCase();
      final isInactive = st == 'cancelled' || st == 'checked-out' || st == 'completed' || st == 'no-show';
      return match && !isInactive;
    }).firstOrNull;
  }

  @override
  Widget build(BuildContext context) {
    final roomProvider = context.watch<RoomProvider>();
    final resProvider = context.watch<ReservationProvider>();
    final allRooms = roomProvider.rooms;
    final allBookings = resProvider.reservations;

    // Distinct floors & types for dropdown filters
    final availableFloors = {'all', ...allRooms.map((r) => r.floor.isNotEmpty ? r.floor : 'Floor 1')}.toList();
    final availableTypes = {'all', ...allRooms.map((r) => r.category.isNotEmpty ? r.category : 'Standard Room')}.toList();

    // Compile active bookings and filter list (Excludes cleaning & maintenance)
    var filteredRooms = allRooms.where((room) {
      final activeBooking = _findActiveBooking(room.roomNumber, allBookings);

      // Search query filter
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.trim().toLowerCase();
        final matchesNum = room.roomNumber.toLowerCase().contains(q);
        final matchesType = room.category.toLowerCase().contains(q);
        final matchesGuest = activeBooking != null && activeBooking.guestName.toLowerCase().contains(q);
        if (!matchesNum && !matchesType && !matchesGuest) return false;
      }

      // Status filter (Available, Occupied, Reserved)
      if (_statusFilter != 'all') {
        final st = room.status.toLowerCase();
        if (_statusFilter == 'available' && st != 'available') return false;
        if (_statusFilter == 'occupied' && st != 'occupied') return false;
        if (_statusFilter == 'reserved' && st != 'reserved') return false;
      }

      // Floor filter
      if (_floorFilter != 'all') {
        final fl = room.floor.isNotEmpty ? room.floor : 'Floor 1';
        if (fl.toLowerCase() != _floorFilter.toLowerCase()) return false;
      }

      // Type filter
      if (_typeFilter != 'all') {
        final tp = room.category.isNotEmpty ? room.category : 'Standard Room';
        if (tp.toLowerCase() != _typeFilter.toLowerCase()) return false;
      }

      return true;
    }).toList();

    // Stats calculations
    final totalCount = allRooms.length;
    final availableCount = allRooms.where((r) => r.status.toLowerCase() == 'available').length;
    final occupiedCount = allRooms.where((r) => r.status.toLowerCase() == 'occupied').length;
    final reservedCount = allRooms.where((r) => r.status.toLowerCase() == 'reserved').length;

    final isInitialLoading = roomProvider.isLoading && allRooms.isEmpty;

    return Scaffold(
      backgroundColor: background,
      body: Column(
        children: [
          // 1. Search, Filters & KPI Header
          _buildSearchAndFiltersHeader(
            totalCount: totalCount,
            availableCount: availableCount,
            occupiedCount: occupiedCount,
            reservedCount: reservedCount,
            availableFloors: availableFloors,
            availableTypes: availableTypes,
          ),

          // 2. Main Content Area (Rooms Grid / List)
          Expanded(
            child: RefreshIndicator(
              color: navy,
              backgroundColor: white,
              onRefresh: () async {
                await Future.wait([
                  roomProvider.fetchAll(),
                  resProvider.fetchAll(silent: true),
                ]);
              },
              child: isInitialLoading
                  ? _buildLoadingState()
                  : roomProvider.errorMessage != null && allRooms.isEmpty
                      ? _buildErrorState(roomProvider)
                      : filteredRooms.isEmpty
                          ? _buildEmptyState(roomProvider)
                          : _isGridView
                              ? GridView.builder(
                                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 100),
                                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 2,
                                    crossAxisSpacing: 10,
                                    mainAxisSpacing: 10,
                                    childAspectRatio: 0.78,
                                  ),
                                  itemCount: filteredRooms.length,
                                  itemBuilder: (context, index) {
                                    final room = filteredRooms[index];
                                    final activeBooking = _findActiveBooking(room.roomNumber, allBookings);
                                    return _buildRoomGridCard(room, activeBooking);
                                  },
                                )
                              : ListView.builder(
                                  padding: const EdgeInsets.fromLTRB(14, 12, 14, 100),
                                  itemCount: filteredRooms.length,
                                  itemBuilder: (context, index) {
                                    final room = filteredRooms[index];
                                    final activeBooking = _findActiveBooking(room.roomNumber, allBookings);
                                    return _buildRoomListCard(room, activeBooking);
                                  },
                                ),
            ),
          ),
        ],
      ),
    );
  }

  // --- 1. Search, Filters & KPI Header ---
  Widget _buildSearchAndFiltersHeader({
    required int totalCount,
    required int availableCount,
    required int occupiedCount,
    required int reservedCount,
    required List<String> availableFloors,
    required List<String> availableTypes,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: white,
        border: const Border(bottom: BorderSide(color: cardBorder, width: 1)),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(6),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
      child: Column(
        children: [
          // Search & View Toggle Row
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 40,
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
                      hintText: 'Search room #, category, guest...',
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
              ),
              const SizedBox(width: 8),

              // View toggle button (Grid / List)
              Container(
                height: 40,
                width: 40,
                decoration: BoxDecoration(
                  color: background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: cardBorder),
                ),
                child: IconButton(
                  padding: EdgeInsets.zero,
                  icon: Icon(
                    _isGridView ? Icons.view_agenda_rounded : Icons.grid_view_rounded,
                    size: 18,
                    color: navy,
                  ),
                  tooltip: _isGridView ? 'Switch to List View' : 'Switch to Grid View',
                  onPressed: () => setState(() => _isGridView = !_isGridView),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Horizontal Quick Filter Pills (Available, Occupied, Reserved)
          SizedBox(
            height: 42,
            child: ListView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              clipBehavior: Clip.hardEdge,
              padding: EdgeInsets.zero,
              children: [
                _buildKPIFilterChip('All Rooms', 'all', totalCount),
                const SizedBox(width: 8),
                _buildKPIFilterChip('Available', 'available', availableCount, dotColor: emerald),
                const SizedBox(width: 8),
                _buildKPIFilterChip('Occupied', 'occupied', occupiedCount, dotColor: purple),
                const SizedBox(width: 8),
                _buildKPIFilterChip('Reserved', 'reserved', reservedCount, dotColor: blue),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Floor & Room Type Quick Dropdown Filters
          Row(
            children: [
              // Floor Filter Dropdown
              Expanded(
                child: Container(
                  height: 32,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    color: background,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: cardBorder),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _floorFilter,
                      isDense: true,
                      isExpanded: true,
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: muted),
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: navy),
                      items: availableFloors
                          .map((fl) => DropdownMenuItem(
                                value: fl,
                                child: Text(
                                  fl == 'all' ? 'All Floors' : fl,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ))
                          .toList(),
                      onChanged: (v) => setState(() => _floorFilter = v ?? 'all'),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Room Category Type Filter Dropdown
              Expanded(
                child: Container(
                  height: 32,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    color: background,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: cardBorder),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _typeFilter,
                      isDense: true,
                      isExpanded: true,
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: muted),
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: navy),
                      items: availableTypes
                          .map((tp) => DropdownMenuItem(
                                value: tp,
                                child: Text(
                                  tp == 'all' ? 'All Categories' : tp,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ))
                          .toList(),
                      onChanged: (v) => setState(() => _typeFilter = v ?? 'all'),
                    ),
                  ),
                ),
              ),

              if (_floorFilter != 'all' || _typeFilter != 'all' || _statusFilter != 'all' || _searchQuery.isNotEmpty) ...[
                const SizedBox(width: 6),
                InkWell(
                  onTap: () {
                    _searchController.clear();
                    setState(() {
                      _searchQuery = '';
                      _floorFilter = 'all';
                      _typeFilter = 'all';
                      _statusFilter = 'all';
                    });
                  },
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    height: 32,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    decoration: BoxDecoration(
                      color: cream,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: gold),
                    ),
                    child: const Center(
                      child: Text(
                        'Reset',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: navy),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKPIFilterChip(
    String label,
    String value,
    int count, {
    Color? dotColor,
  }) {
    final isSelected = _statusFilter == value;

    return InkWell(
      onTap: () => setState(() => _statusFilter = value),
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
                decoration: BoxDecoration(
                  color: dotColor,
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
  }

  // --- 2. Room List Card (Horizontal Layout) ---
  Widget _buildRoomListCard(RoomModel room, ReservationModel? activeBooking) {
    final isOccupied = room.status.toLowerCase() == 'occupied' || (activeBooking != null && (activeBooking.status.toLowerCase() == 'checked-in' || activeBooking.status.toLowerCase() == 'active'));
    final isAvailable = room.status.toLowerCase() == 'available' && activeBooking == null;
    final isReserved = room.status.toLowerCase() == 'reserved' || (activeBooking != null && activeBooking.status.toLowerCase() == 'confirmed');

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isOccupied ? navy.withAlpha(50) : (isAvailable ? emerald.withAlpha(50) : cardBorder),
          width: isOccupied || isAvailable ? 1.2 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(5),
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
          onTap: () => ManagerRoomDetailDialog.show(context, room, activeReservation: activeBooking),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Room badge, Floor, Status badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8.5, vertical: 3.5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: const Color(0xFF2563EB).withAlpha(50),
                              width: 1.0,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.door_front_door_outlined,
                                size: 13,
                                color: Color(0xFF1E40AF),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Room ${room.roomNumber}',
                                style: const TextStyle(
                                  color: Color(0xFF1E40AF),
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          room.floor.isNotEmpty ? room.floor : 'Floor 1',
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: muted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    StatusBadge(status: isOccupied ? 'Occupied' : (isReserved ? 'Reserved' : 'Available')),
                  ],
                ),
                const SizedBox(height: 8),

                // Middle Row: Room Category & Specs
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            room.category,
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
                          Row(
                            children: [
                              const Icon(Icons.king_bed_outlined, size: 13, color: muted),
                              const SizedBox(width: 3),
                              Text(room.bedType, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                              const SizedBox(width: 8),
                              const Icon(Icons.people_outline_rounded, size: 13, color: muted),
                              const SizedBox(width: 3),
                              Text(room.capacity, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '₹${room.basePrice.toInt()}',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: navy,
                          ),
                        ),
                        const Text(
                          '/night (24h)',
                          style: TextStyle(fontSize: 9.5, color: muted, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Bottom Strip: If Available show "Assign Guest", if Occupied/Reserved show "View Guest Details"
                if (isAvailable)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: emerald.withAlpha(60)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.check_circle_rounded, size: 14, color: emerald),
                            SizedBox(width: 6),
                            Text(
                              'Vacant & Ready for Check-in',
                              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF047857)),
                            ),
                          ],
                        ),
                        InkWell(
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => ManagerCreateReservationScreen(
                                  preselectedRoomNumber: room.roomNumber,
                                  preselectedCategory: room.category,
                                ),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                            decoration: BoxDecoration(
                              color: emerald,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.person_add_alt_1_rounded, size: 12, color: white),
                                SizedBox(width: 4),
                                Text(
                                  'Assign Guest',
                                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: white),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isOccupied ? cream : const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: isOccupied ? gold.withAlpha(120) : blue.withAlpha(50)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Icon(
                                isOccupied ? Icons.person_rounded : Icons.bookmark_added_rounded,
                                size: 14,
                                color: isOccupied ? navy : blue,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  activeBooking != null
                                      ? 'Guest: ${activeBooking.guestName} (#${activeBooking.reservationNumber})'
                                      : (isOccupied ? 'Occupied (In-House)' : 'Reserved'),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: isOccupied ? navy : blue,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        InkWell(
                          onTap: () {
                            if (activeBooking != null) {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => ManagerReservationDetailScreen(reservation: activeBooking),
                                ),
                              );
                            } else {
                              ManagerRoomDetailDialog.show(context, room, activeReservation: activeBooking);
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: isOccupied ? navy : blue,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Row(
                              children: [
                                Text(
                                  'View Guest',
                                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: white),
                                ),
                                SizedBox(width: 3),
                                Icon(Icons.arrow_forward_rounded, size: 11, color: white),
                              ],
                            ),
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

  // --- 3. Room Grid Card (Compact 2-Column Layout) ---
  Widget _buildRoomGridCard(RoomModel room, ReservationModel? activeBooking) {
    final isOccupied = room.status.toLowerCase() == 'occupied' || (activeBooking != null && (activeBooking.status.toLowerCase() == 'checked-in' || activeBooking.status.toLowerCase() == 'active'));
    final isAvailable = room.status.toLowerCase() == 'available' && activeBooking == null;
    final isReserved = room.status.toLowerCase() == 'reserved' || (activeBooking != null && activeBooking.status.toLowerCase() == 'confirmed');

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isOccupied ? navy.withAlpha(50) : (isAvailable ? emerald.withAlpha(50) : cardBorder),
          width: isOccupied || isAvailable ? 1.2 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(5),
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
          onTap: () => ManagerRoomDetailDialog.show(context, room, activeReservation: activeBooking),
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top: Room number badge & Status Badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: const Color(0xFF2563EB).withAlpha(50),
                          width: 1.0,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.door_front_door_outlined,
                            size: 11.5,
                            color: Color(0xFF1E40AF),
                          ),
                          const SizedBox(width: 3),
                          Text(
                            room.roomNumber,
                            style: const TextStyle(
                              color: Color(0xFF1E40AF),
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                    StatusBadge(
                      status: isOccupied ? 'Occupied' : (isReserved ? 'Reserved' : 'Available'),
                      fontSize: 9,
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                    ),
                  ],
                ),

                // Middle: Category & Specs
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      room.category,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: navy,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      room.floor.isNotEmpty ? room.floor : 'Floor 1',
                      style: const TextStyle(fontSize: 10, color: muted, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 4),

                    // In-house guest or vacant tag
                    if (isOccupied && activeBooking != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: cream,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: gold.withAlpha(120)),
                        ),
                        child: Text(
                          activeBooking.guestName,
                          style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: navy),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      )
                    else if (isAvailable)
                      const Text(
                        'Vacant & Ready',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: emerald),
                      )
                    else
                      Text(
                        'Capacity: ${room.capacity}',
                        style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                      ),
                  ],
                ),

                // Bottom: Price & Quick Action (Assign Guest or View Guest)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '₹${room.basePrice.toInt()}/n',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: navy,
                      ),
                    ),
                    if (isAvailable)
                      InkWell(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => ManagerCreateReservationScreen(
                                preselectedRoomNumber: room.roomNumber,
                                preselectedCategory: room.category,
                              ),
                            ),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: emerald,
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.person_add_alt_1_rounded, size: 10, color: white),
                              SizedBox(width: 2),
                              Text('Assign', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: white)),
                            ],
                          ),
                        ),
                      )
                    else
                      const Icon(Icons.arrow_forward_ios_rounded, size: 11, color: muted),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- Loading Skeleton ---
  Widget _buildLoadingState() {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 100),
      itemCount: 6,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          height: 110,
          decoration: BoxDecoration(
            color: white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: cardBorder),
          ),
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(height: 18, width: 70, decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(6))),
                  Container(height: 18, width: 60, decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(10))),
                ],
              ),
              const SizedBox(height: 10),
              Container(height: 14, width: 140, decoration: BoxDecoration(color: const Color(0xFFE2E8F0), borderRadius: BorderRadius.circular(4))),
              const Spacer(),
              Container(height: 22, width: double.infinity, decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6))),
            ],
          ),
        );
      },
    );
  }

  // --- Empty State ---
  Widget _buildEmptyState(RoomProvider provider) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: navy.withAlpha(10),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.meeting_room_outlined, size: 40, color: navy),
            ),
            const SizedBox(height: 14),
            const Text(
              'No Matching Rooms Found',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: navy),
            ),
            const SizedBox(height: 6),
            const Text(
              'Try changing your status, floor, or category filters.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: muted),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                _searchController.clear();
                setState(() {
                  _searchQuery = '';
                  _statusFilter = 'all';
                  _floorFilter = 'all';
                  _typeFilter = 'all';
                });
                provider.fetchAll();
              },
              icon: const Icon(Icons.refresh_rounded, size: 16, color: gold),
              label: const Text(
                'Reset All Filters',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w800,
                  color: white,
                  letterSpacing: 0.3,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: const BorderSide(color: Color(0xFFF5C06A), width: 1.5),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Error State ---
  Widget _buildErrorState(RoomProvider provider) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: ruby.withAlpha(15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.cloud_off_rounded, size: 40, color: ruby),
            ),
            const SizedBox(height: 14),
            const Text(
              'Unable to Connect to HMS Server',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: navy),
            ),
            const SizedBox(height: 6),
            Text(
              provider.errorMessage ?? 'Please check your connection and host IP.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: muted),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton.icon(
                  onPressed: () => ServerConfigDialog.show(context),
                  icon: const Icon(Icons.settings_ethernet_rounded, size: 16, color: navy),
                  label: const Text('Server Settings', style: TextStyle(fontSize: 12, color: navy, fontWeight: FontWeight.w700)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: cardBorder),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(width: 10),
                ElevatedButton.icon(
                  onPressed: () => provider.fetchAll(),
                  icon: const Icon(Icons.refresh_rounded, size: 16),
                  label: const Text('Retry', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navy,
                    foregroundColor: white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
