import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/api_endpoints.dart';
import 'package:hour_stay_mobile/models/room_model.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/auth_provider.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import 'package:hour_stay_mobile/providers/manager/room_provider.dart';
import 'package:hour_stay_mobile/screens/guest/bookings/guest_booking_detail_screen.dart';
import 'package:hour_stay_mobile/services/api_service.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';

class GuestSearchScreen extends StatefulWidget {
  const GuestSearchScreen({super.key});

  @override
  State<GuestSearchScreen> createState() => _GuestSearchScreenState();
}

class _GuestSearchScreenState extends State<GuestSearchScreen> {
  // Hour Stay Brand Design System Tokens
  static const Color navy = Color(0xFF0D1B2A);
  static const Color navyLight = Color(0xFF1B2A4A);
  static const Color purple = Color(0xFF5B21B6);
  static const Color gold = Color(0xFFF5C06A);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color white = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF8A8F98);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color emerald = Color(0xFF10B981);
  static const Color ruby = Color(0xFFE53935);

  // Search & Filter Controllers & States
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedCategory = 'all';
  String _selectedPropertyId = 'all';
  String _sortBy = 'recommended'; // 'recommended', 'price_asc', 'price_desc', 'rating'

  // Booking Dates & Occupancy
  DateTime _checkInDate = DateTime.now();
  DateTime _checkOutDate = DateTime.now().add(const Duration(days: 1));
  int _adultsCount = 2;
  int _childrenCount = 0;
  int _roomsCount = 1;

  // Advanced Filters
  double _maxPrice = 25000;
  bool _onlyAvailable = false;
  bool _onlyBreakfast = false;
  final Set<String> _selectedAmenities = {};

  // Properties & Dynamic Rooms from MongoDB
  List<Map<String, dynamic>> _properties = [];
  List<RoomModel> _rooms = [];
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadPropertiesAndRooms();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadPropertiesAndRooms({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      // 1. Fetch live properties from MongoDB
      final propRes = await ApiService.get(ApiEndpoints.publicProperties);
      List<Map<String, dynamic>> fetchedProps = [];
      if (propRes.success && propRes.data is List) {
        fetchedProps = (propRes.data as List).map((e) => e as Map<String, dynamic>).toList();
      }

      // 2. Format query params for date availability
      final inStr = DateFormat('yyyy-MM-dd').format(_checkInDate);
      final outStr = DateFormat('yyyy-MM-dd').format(_checkOutDate);

      // 3. Fetch rooms from public endpoint or manager room service
      final targetProp = _selectedPropertyId != 'all' ? _selectedPropertyId : (fetchedProps.isNotEmpty ? (fetchedProps[0]['_id'] ?? fetchedProps[0]['id'] ?? 'HS-9HQ8P') : 'HS-9HQ8P');
      final roomRes = await ApiService.get('${ApiEndpoints.publicProperties}/$targetProp/rooms?checkIn=$inStr&checkOut=$outStr');

      List<RoomModel> loadedRooms = [];
      if (roomRes.success && roomRes.data is List) {
        loadedRooms = (roomRes.data as List).map((e) {
          final map = e as Map<String, dynamic>;
          // Attach property info if available
          final pId = map['propertyId']?.toString() ?? targetProp;
          final propMatch = fetchedProps.firstWhere(
            (p) => (p['_id'] ?? p['id'] ?? '').toString() == pId,
            orElse: () => fetchedProps.isNotEmpty ? fetchedProps[0] : {},
          );
          final pSettings = propMatch['settings'] as Map<String, dynamic>? ?? {};
          final pName = pSettings['hotelName'] ?? pSettings['name'] ?? propMatch['name'] ?? 'Hour Stay Luxury Hotel';
          final pCity = pSettings['city'] ?? propMatch['city'] ?? 'India';
          final pPolicy = pSettings['cancellationPolicy'] ?? 'Free cancellation up to 24 hours prior to check-in';

          map['propertyName'] = pName;
          map['city'] = pCity;
          map['cancellationPolicy'] = pPolicy;
          return RoomModel.fromJson(map);
        }).toList();
      }

      // Fallback: If public endpoint returned empty, read from RoomProvider
      if (loadedRooms.isEmpty && mounted) {
        final roomProv = context.read<RoomProvider>();
        await roomProv.fetchAll(silent: true);
        loadedRooms = roomProv.rooms;
      }

      if (mounted) {
        setState(() {
          _properties = fetchedProps;
          _rooms = loadedRooms;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  // Calculate nights
  int get _nightsCount {
    final diff = _checkOutDate.difference(_checkInDate).inDays;
    return diff > 0 ? diff : 1;
  }

  // Calculate pricing for a room
  double _calculateRoomPrice(RoomModel room) {
    return (room.currentRate > 0 ? room.currentRate : room.baseRate) * _nightsCount;
  }

  // Filtered rooms
  List<RoomModel> get _filteredRooms {
    var list = _rooms.where((room) {
      // 1. Availability filter
      if (_onlyAvailable && !room.isAvailable) {
        return false;
      }

      // 2. Property filter
      if (_selectedPropertyId != 'all') {
        if (room.propertyId != _selectedPropertyId) return false;
      }

      // 3. Category filter
      if (_selectedCategory != 'all') {
        final cat = room.category.toLowerCase();
        final sel = _selectedCategory.toLowerCase();
        final isMatch = (sel == 'penthouse' && cat.contains('pent')) ||
            (sel == 'villa' && (cat.contains('villa') || cat.contains('luxury'))) ||
            cat.contains(sel) ||
            sel.contains(cat);
        if (!isMatch) return false;
      }

      // 4. Max Price filter
      final price = _calculateRoomPrice(room);
      if (price > _maxPrice) return false;

      // 5. Breakfast filter
      if (_onlyBreakfast) {
        final hasBreakfast = room.amenities.any((a) => a.toLowerCase().contains('breakfast') || a.toLowerCase().contains('dining'));
        if (!hasBreakfast) return false;
      }

      // 6. Selected Amenities filter
      if (_selectedAmenities.isNotEmpty) {
        for (final amenity in _selectedAmenities) {
          final has = room.amenities.any((a) => a.toLowerCase().contains(amenity.toLowerCase()));
          if (!has) return false;
        }
      }

      // 7. Search query filter (matches Category, Room Number, City, Property Name, Floor, Amenities)
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.toLowerCase().trim();
        final matchesCat = room.category.toLowerCase().contains(q);
        final matchesNum = room.roomNumber.toLowerCase().contains(q);
        final matchesProp = (room.propertyName ?? '').toLowerCase().contains(q);
        final matchesCity = (room.city ?? '').toLowerCase().contains(q);
        final matchesAmenity = room.amenities.any((a) => a.toLowerCase().contains(q));
        final matchesFloor = room.floor.toLowerCase().contains(q);
        if (!matchesCat && !matchesNum && !matchesProp && !matchesCity && !matchesAmenity && !matchesFloor) {
          return false;
        }
      }

      return true;
    }).toList();

    // Sorting
    if (_sortBy == 'price_asc') {
      list.sort((a, b) => _calculateRoomPrice(a).compareTo(_calculateRoomPrice(b)));
    } else if (_sortBy == 'price_desc') {
      list.sort((a, b) => _calculateRoomPrice(b).compareTo(_calculateRoomPrice(a)));
    } else if (_sortBy == 'rating') {
      list.sort((a, b) => b.rating.compareTo(a.rating));
    }

    return list;
  }

  void _resetAllFilters() {
    setState(() {
      _searchController.clear();
      _searchQuery = '';
      _selectedCategory = 'all';
      _selectedPropertyId = 'all';
      _sortBy = 'recommended';
      _maxPrice = 25000;
      _onlyAvailable = false;
      _onlyBreakfast = false;
      _selectedAmenities.clear();
      _checkInDate = DateTime.now();
      _checkOutDate = DateTime.now().add(const Duration(days: 1));
      _adultsCount = 2;
      _childrenCount = 0;
      _roomsCount = 1;
    });
    _loadPropertiesAndRooms();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredRooms;

    return Scaffold(
      backgroundColor: background,
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: () => _loadPropertiesAndRooms(silent: true),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          slivers: [
            // 1. Interactive Search Header
            SliverToBoxAdapter(
              child: _buildSearchHeader(),
            ),

            // 2. Results Header & Sorting Bar
            SliverToBoxAdapter(
              child: _buildResultsSummaryBar(filtered.length),
            ),

            // 3. Room & Property Cards
            if (_isLoading && _rooms.isEmpty)
              const SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(color: purple),
                      SizedBox(height: 12),
                      Text(
                        'Searching luxury rooms & live availability...',
                        style: TextStyle(color: muted, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              )
            else if (_errorMessage != null && _rooms.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: EmptyState(
                    icon: Icons.error_outline_rounded,
                    title: 'Unable to Load Rooms',
                    message: _errorMessage ?? 'An error occurred while connecting to the hotel backend.',
                    actionText: 'Retry Search',
                    onAction: () => _loadPropertiesAndRooms(),
                  ),
                ),
              )
            else if (filtered.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: EmptyState(
                    icon: Icons.search_off_rounded,
                    title: 'No Matching Rooms Found',
                    message: 'We could not find any rooms matching your search dates and filter criteria. Try adjusting filters or resetting your parameters.',
                    actionText: 'Reset Filters',
                    onAction: _resetAllFilters,
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final room = filtered[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: _buildRoomCard(room),
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // 1. SEARCH & FILTER HEADER
  // ==========================================
  Widget _buildSearchHeader() {
    return Container(
      decoration: const BoxDecoration(
        color: white,
        border: Border(bottom: BorderSide(color: cardBorder)),
      ),
      padding: const EdgeInsets.fromLTRB(0, 14, 0, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // A. Full-Width Search Input
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cardBorder),
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (val) => setState(() => _searchQuery = val),
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: navy,
                ),
                decoration: InputDecoration(
                  hintText: 'Search city, hotel, room type, WiFi...',
                  hintStyle: const TextStyle(
                    color: muted,
                    fontSize: 12.5,
                    fontWeight: FontWeight.normal,
                  ),
                  prefixIcon: const Icon(Icons.search_rounded, color: purple, size: 20),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: muted, size: 16),
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
            ),
          ),
          const SizedBox(height: 10),

          // B. Dates & Occupancy Selector Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: cream.withAlpha(120),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: gold.withAlpha(90)),
              ),
              child: Row(
                children: [
                  // Dates Pill
                  Expanded(
                    child: InkWell(
                      onTap: _showDateRangePicker,
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_month_rounded, size: 18, color: purple),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'DATES & DURATION',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w800,
                                    color: muted,
                                    letterSpacing: 0.4,
                                  ),
                                ),
                                Text(
                                  '${DateFormat('dd MMM').format(_checkInDate)} - ${DateFormat('dd MMM').format(_checkOutDate)} ($_nightsCount ${_nightsCount == 1 ? 'Night' : 'Nights'})',
                                  style: const TextStyle(
                                    fontSize: 12,
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
                    ),
                  ),
                  Container(width: 1, height: 28, color: gold.withAlpha(90)),
                  const SizedBox(width: 10),

                  // Occupancy Pill
                  InkWell(
                    onTap: _showOccupancySelector,
                    child: Row(
                      children: [
                        const Icon(Icons.people_alt_rounded, size: 18, color: navy),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'GUESTS & ROOMS',
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: muted,
                                letterSpacing: 0.4,
                              ),
                            ),
                            Text(
                              '$_adultsCount Adults${_childrenCount > 0 ? ', $_childrenCount Ch' : ''} • $_roomsCount Rm',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: navy,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // C. Horizontal Category Navigation Tabs
          _buildCategoryNavChips(),
        ],
      ),
    );
  }

  int _getCategoryRoomCount(String categoryKey) {
    if (categoryKey == 'all') return _rooms.length;
    final sel = categoryKey.toLowerCase();
    return _rooms.where((r) {
      final cat = r.category.toLowerCase();
      return (sel == 'penthouse' && cat.contains('pent')) ||
          (sel == 'villa' && (cat.contains('villa') || cat.contains('luxury'))) ||
          cat.contains(sel) ||
          sel.contains(cat);
    }).length;
  }

  Widget _buildCategoryNavChips() {
    final categories = [
      {'key': 'all', 'label': 'All Rooms'},
      {'key': 'standard', 'label': 'Standard Room'},
      {'key': 'deluxe', 'label': 'Deluxe Room'},
      {'key': 'executive', 'label': 'Executive Suite'},
      {'key': 'penthouse', 'label': 'Penthouse'},
      {'key': 'villa', 'label': 'Luxury Villa'},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SizedBox(
        height: 42,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          physics: const BouncingScrollPhysics(),
          clipBehavior: Clip.hardEdge,
          padding: EdgeInsets.zero,
          itemCount: categories.length,
          separatorBuilder: (context, index) => const SizedBox(width: 8),
          itemBuilder: (context, index) {
            final cat = categories[index];
            final key = cat['key']!;
            final label = cat['label']!;
            final count = _getCategoryRoomCount(key);
            final isSelected = _selectedCategory == key;

            return InkWell(
              onTap: () {
                setState(() {
                  _selectedCategory = key;
                });
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
      ),
    );
  }

  // ==========================================
  // 2. RESULTS SUMMARY BAR
  // ==========================================
  Widget _buildResultsSummaryBar(int count) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Text(
        '$count Available Rooms',
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w800,
          color: navy,
        ),
      ),
    );
  }

  // ==========================================
  // 3. ROOM & PROPERTY CARD
  // ==========================================
  Widget _buildRoomCard(RoomModel room) {
    final price = _calculateRoomPrice(room);
    final gstTax = (price * 0.18).roundToDouble();
    final totalPayable = price + gstTax;

    final hotelName = room.propertyName?.isNotEmpty == true ? room.propertyName! : 'Hour Stay Luxury Hotel';
    final city = room.city?.isNotEmpty == true ? room.city! : 'India';

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // A. Hero Room Image Banner with Property & Availability Overlays
          Stack(
            children: [
              _buildRoomHeroImage(room),
              // Gradient Shade
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withAlpha(120),
                        Colors.transparent,
                        Colors.black.withAlpha(160),
                      ],
                    ),
                  ),
                ),
              ),
              // Top Badges
              Positioned(
                top: 12,
                left: 12,
                right: 12,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Property Name Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: navy.withAlpha(220),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: gold.withAlpha(120)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.location_on_rounded, size: 12, color: gold),
                          const SizedBox(width: 4),
                          Text(
                            hotelName,
                            style: const TextStyle(
                              color: cream,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    // Rating Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withAlpha(180),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.star_rounded, size: 13, color: gold),
                          const SizedBox(width: 3),
                          Text(
                            room.rating.toStringAsFixed(1),
                            style: const TextStyle(
                              color: white,
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              // Bottom Badges (Room Number & Category)
              Positioned(
                bottom: 12,
                left: 12,
                right: 12,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            room.category,
                            style: const TextStyle(
                              color: white,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              shadows: [Shadow(color: Colors.black54, blurRadius: 4)],
                            ),
                          ),
                          Text(
                            'Room ${room.roomNumber} • ${room.floor} • $city',
                            style: TextStyle(
                              color: cream.withAlpha(220),
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Availability Status Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: room.isAvailable ? emerald : ruby,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        room.isAvailable ? 'AVAILABLE' : 'RESERVED',
                        style: const TextStyle(
                          color: white,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // B. Card Body (Specs, Amenities, Pricing, Policies, and Booking Button)
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Bed & Capacity Specs Row
                Row(
                  children: [
                    _buildSpecItem(Icons.bed_rounded, room.bedType),
                    const SizedBox(width: 14),
                    _buildSpecItem(Icons.people_alt_outlined, room.capacity),
                    const SizedBox(width: 14),
                    _buildSpecItem(Icons.layers_outlined, room.floor),
                  ],
                ),
                const SizedBox(height: 10),

                // 2. Amenities Preview Chips
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: room.amenities.take(4).map((a) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Text(
                        a,
                        style: const TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: navy,
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),

                // 3. Cancellation Policy Highlight
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: emerald.withAlpha(15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: emerald.withAlpha(40)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.shield_outlined, size: 14, color: emerald),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          room.cancellationPolicy ?? 'Free cancellation up to 24 hours prior to check-in',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF065F46),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 20, color: cardBorder),

                // 4. Price Breakdown & Action Button
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '₹${price.toStringAsFixed(0)} / $_nightsCount ${_nightsCount == 1 ? 'Night' : 'Nights'}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: navy,
                          ),
                        ),
                        Text(
                          '+ ₹${gstTax.toStringAsFixed(0)} GST (18%) • Total ₹${totalPayable.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 10.5,
                            color: muted,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: room.isAvailable ? () => _openRoomBookingFlow(room) : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: room.isAvailable ? navy : muted,
                        foregroundColor: cream,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: BorderSide(color: room.isAvailable ? gold : Colors.transparent),
                        ),
                      ),
                      child: Text(
                        room.isAvailable ? 'Book Stay' : 'Reserved',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecItem(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: purple),
        const SizedBox(width: 4),
        Text(
          text,
          style: const TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: navy,
          ),
        ),
      ],
    );
  }

  Widget _buildRoomHeroImage(RoomModel room) {
    if (room.images.isNotEmpty && room.images.first.isNotEmpty) {
      final imgUrl = ApiEndpoints.resolveImageUrl(room.images.first);
      if (imgUrl.startsWith('data:image')) {
        try {
          return Image.memory(
            base64Decode(imgUrl.split(',').last),
            height: 170,
            width: double.infinity,
            fit: BoxFit.cover,
          );
        } catch (_) {}
      } else if (imgUrl.startsWith('http')) {
        return Image.network(
          imgUrl,
          height: 170,
          width: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _buildFallbackImageGradient(room),
        );
      }
    }
    return _buildFallbackImageGradient(room);
  }

  Widget _buildFallbackImageGradient(RoomModel room) {
    return Container(
      height: 170,
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: room.category.toLowerCase().contains('suite')
              ? [navy, purple]
              : room.category.toLowerCase().contains('deluxe')
                  ? [navyLight, const Color(0xFF2563EB)]
                  : [navy, navyLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              room.category.toLowerCase().contains('suite')
                  ? Icons.king_bed_rounded
                  : Icons.hotel_rounded,
              size: 40,
              color: gold.withAlpha(180),
            ),
            const SizedBox(height: 6),
            Text(
              room.category,
              style: TextStyle(
                color: cream.withAlpha(200),
                fontSize: 13,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // 4. DATE RANGE PICKER MODAL
  // ==========================================
  Future<void> _showDateRangePicker() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 180)),
      initialDateRange: DateTimeRange(
        start: _checkInDate,
        end: _checkOutDate,
      ),
      builder: (context, child) {
        return Theme(
          data: ThemeData.light().copyWith(
            primaryColor: purple,
            colorScheme: const ColorScheme.light(
              primary: purple,
              onPrimary: white,
              surface: white,
              onSurface: navy,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _checkInDate = picked.start;
        _checkOutDate = picked.end;
      });
      _loadPropertiesAndRooms(silent: true);
    }
  }

  // ==========================================
  // 5. OCCUPANCY SELECTOR SHEET
  // ==========================================
  void _showOccupancySelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
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
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Select Guests & Rooms',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: navy),
                  ),
                  const SizedBox(height: 16),

                  _buildCounterRow('Adults', 'Ages 13 or above', _adultsCount, 1, 10, (val) {
                    setSheetState(() => _adultsCount = val);
                    setState(() => _adultsCount = val);
                  }),
                  const Divider(height: 24, color: cardBorder),

                  _buildCounterRow('Children', 'Ages 0 to 12', _childrenCount, 0, 6, (val) {
                    setSheetState(() => _childrenCount = val);
                    setState(() => _childrenCount = val);
                  }),
                  const Divider(height: 24, color: cardBorder),

                  _buildCounterRow('Rooms', 'Number of rooms required', _roomsCount, 1, 5, (val) {
                    setSheetState(() => _roomsCount = val);
                    setState(() => _roomsCount = val);
                  }),
                  const SizedBox(height: 20),

                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: navy,
                        foregroundColor: cream,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: const BorderSide(color: gold),
                        ),
                      ),
                      child: const Text('Apply Selection', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildCounterRow(String title, String subtitle, int count, int min, int max, ValueChanged<int> onChanged) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: navy)),
            Text(subtitle, style: const TextStyle(fontSize: 11, color: muted)),
          ],
        ),
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.remove_circle_outline, color: muted),
              onPressed: count > min ? () => onChanged(count - 1) : null,
            ),
            SizedBox(
              width: 24,
              child: Text(
                '$count',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: navy),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.add_circle_outline, color: purple),
              onPressed: count < max ? () => onChanged(count + 1) : null,
            ),
          ],
        ),
      ],
    );
  }



  // ==========================================
  // 7. ROOM DETAILS & INSTANT BOOKING FLOW
  // ==========================================
  void _openRoomBookingFlow(RoomModel room) {
    final authProvider = context.read<AuthProvider>();
    final user = authProvider.user;

    final price = _calculateRoomPrice(room);
    final gstTax = (price * 0.18).roundToDouble();
    final totalPayable = price + gstTax;

    final hotelName = room.propertyName?.isNotEmpty == true ? room.propertyName! : 'Hour Stay Luxury Hotel';
    final city = room.city?.isNotEmpty == true ? room.city! : 'India';

    final specialRequestsController = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (modalCtx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return DraggableScrollableSheet(
              initialChildSize: 0.9,
              maxChildSize: 0.95,
              minChildSize: 0.5,
              expand: false,
              builder: (_, scrollController) {
                return ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 30),
                  children: [
                    // Sheet Handle
                    Center(
                      child: Container(
                        width: 44,
                        height: 4,
                        decoration: BoxDecoration(
                          color: cardBorder,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                room.category,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: navy,
                                ),
                              ),
                              Text(
                                '$hotelName • Room ${room.roomNumber} ($city)',
                                style: const TextStyle(fontSize: 12, color: muted, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: emerald.withAlpha(20),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: emerald.withAlpha(60)),
                          ),
                          child: const Text(
                            'INSTANT CONFIRM',
                            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: emerald),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Hero Banner / Room Specs Card
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildDetailSpec(Icons.bed_rounded, 'Bed Type', room.bedType),
                          _buildDetailSpec(Icons.people_rounded, 'Capacity', room.capacity),
                          _buildDetailSpec(Icons.layers_rounded, 'Floor', room.floor),
                          _buildDetailSpec(Icons.star_rounded, 'Rating', '${room.rating} ⭐'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Stay Dates & Guest Info Summary
                    const Text('STAY RESERVATION SUMMARY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: muted)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: cream.withAlpha(120),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: gold.withAlpha(80)),
                      ),
                      child: Column(
                        children: [
                          _buildSummaryLine('Check-In Date', DateFormat('EEE, dd MMM yyyy').format(_checkInDate)),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine('Check-Out Date', DateFormat('EEE, dd MMM yyyy').format(_checkOutDate)),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine(
                            'Duration of Stay',
                            '$_nightsCount ${_nightsCount == 1 ? 'Night' : 'Nights'}',
                          ),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine('Occupancy', '$_adultsCount Adults, $_childrenCount Children ($_roomsCount Room)'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Logged-in Guest Details
                    const Text('LOGGED-IN GUEST INFORMATION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: muted)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Column(
                        children: [
                          _buildSummaryLine('Guest Name', user?.name.isNotEmpty == true ? user!.name : 'Valued Guest'),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine('Email Address', user?.email.isNotEmpty == true ? user!.email : 'guest@hourstay.com'),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine('Mobile / Phone', user?.mobile.isNotEmpty == true ? user!.mobile : 'Verified on File'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Special Requests Input
                    const Text('SPECIAL REQUESTS (OPTIONAL)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: muted)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: specialRequestsController,
                      style: const TextStyle(fontSize: 13, color: navy),
                      decoration: InputDecoration(
                        hintText: 'Early check-in, extra pillows, high floor...',
                        hintStyle: const TextStyle(fontSize: 12, color: muted),
                        filled: true,
                        fillColor: const Color(0xFFF1F5F9),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: cardBorder),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Tariff & Price Breakdown
                    const Text('TARIFF & TAX BREAKDOWN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: muted)),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Column(
                        children: [
                          _buildSummaryLine(
                            'Room Tariff ($_nightsCount ${_nightsCount == 1 ? 'Night' : 'Nights'})',
                            '₹${price.toStringAsFixed(0)}',
                          ),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine('GST Taxes (18%)', '₹${gstTax.toStringAsFixed(0)}'),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine(
                            'Total Amount Payable',
                            '₹${totalPayable.toStringAsFixed(0)}',
                            isBold: true,
                            valueColor: purple,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Confirm Booking CTA Button
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                final bookingProv = context.read<GuestBookingProvider>();
                                final navigator = Navigator.of(context);
                                final messenger = ScaffoldMessenger.of(context);

                                setModalState(() => isSubmitting = true);
                                try {
                                  final bookingPayload = {
                                    'propertyId': room.propertyId,
                                    'roomId': room.id,
                                    'roomNumber': room.roomNumber,
                                    'room': room.category,
                                    'roomType': room.category,
                                    'guest': user?.name ?? 'Valued Guest',
                                    'guestName': user?.name ?? 'Valued Guest',
                                    'email': user?.email ?? 'guest@hourstay.com',
                                    'phone': user?.mobile ?? '9999999999',
                                    'checkIn': DateFormat('yyyy-MM-dd').format(_checkInDate),
                                    'checkInDate': DateFormat('yyyy-MM-dd').format(_checkInDate),
                                    'checkOut': DateFormat('yyyy-MM-dd').format(_checkOutDate),
                                    'checkOutDate': DateFormat('yyyy-MM-dd').format(_checkOutDate),
                                    'stayType': 'overnight',
                                    'nights': _nightsCount,
                                    'adults': _adultsCount,
                                    'children': _childrenCount,
                                    'roomsCount': _roomsCount,
                                    'amount': totalPayable,
                                    'totalAmount': totalPayable,
                                    'specialRequests': specialRequestsController.text.trim(),
                                  };

                                  // Post booking to backend API
                                  final res = await ApiService.post('/v1/public/bookings', bookingPayload);
                                  ReservationModel? createdRes;
                                  if (res.success && res.data != null) {
                                    final dataMap = res.data is Map<String, dynamic>
                                        ? (res.data['booking'] is Map<String, dynamic>
                                            ? res.data['booking']
                                            : (res.data['data'] is Map<String, dynamic> ? res.data['data'] : res.data))
                                        : null;
                                    if (dataMap != null) {
                                      try {
                                        createdRes = ReservationModel.fromJson(dataMap as Map<String, dynamic>);
                                      } catch (_) {}
                                    }
                                  }

                                  if (!res.success) {
                                    // Fallback to guestBookings
                                    await bookingProv.bookRoom(
                                      roomId: room.id,
                                      checkIn: DateFormat('yyyy-MM-dd').format(_checkInDate),
                                      checkOut: DateFormat('yyyy-MM-dd').format(_checkOutDate),
                                      stayType: 'overnight',
                                      totalAmount: totalPayable,
                                    );
                                  }

                                  if (createdRes == null) {
                                    final autoBookingId = 'BK-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
                                    createdRes = ReservationModel(
                                      id: autoBookingId,
                                      bookingId: autoBookingId,
                                      guest: user?.name ?? 'Guest',
                                      email: user?.email ?? '',
                                      phone: user?.mobile ?? '',
                                      room: 'Room ${room.roomNumber} · ${room.category}',
                                      roomNumber: room.roomNumber,
                                      roomType: room.category,
                                      checkIn: DateFormat('yyyy-MM-dd').format(_checkInDate),
                                      checkOut: DateFormat('yyyy-MM-dd').format(_checkOutDate),
                                      nights: _nightsCount,
                                      stayType: 'overnight',
                                      amount: totalPayable,
                                      status: 'Confirmed',
                                      paymentStatus: 'Paid',
                                      propertyId: room.propertyId,
                                      hotel: _findPropertyName(room.propertyId),
                                    );
                                  }

                                  if (!mounted) return;
                                  navigator.pop();
                                  _showBookingSuccessDialog(room, totalPayable, createdRes);
                                  bookingProv.fetchDashboardData(silent: true);
                                  _loadPropertiesAndRooms(silent: true);
                                } catch (e) {
                                  if (!mounted) return;
                                  setModalState(() => isSubmitting = false);
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text('Failed to confirm booking: $e'),
                                      backgroundColor: ruby,
                                    ),
                                  );
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: navy,
                          foregroundColor: cream,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: gold, width: 1.2),
                          ),
                        ),
                        child: isSubmitting
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(color: white, strokeWidth: 2),
                              )
                            : Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.check_circle_outline_rounded, size: 20),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Confirm & Book Stay • ₹${totalPayable.toStringAsFixed(0)}',
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  String _findPropertyName(String propertyId) {
    try {
      final match = _properties.firstWhere(
        (p) => (p['_id'] ?? p['id'] ?? p['propertyId']) == propertyId,
        orElse: () => <String, dynamic>{},
      );
      if (match.isNotEmpty) {
        return match['name'] ?? match['propertyName'] ?? match['hotelName'] ?? 'Hour Stay Luxury Hotel';
      }
    } catch (_) {}
    return 'Hour Stay Luxury Hotel';
  }

  Widget _buildDetailSpec(IconData icon, String label, String value) {
    return Column(
      children: [
        Icon(icon, size: 18, color: purple),
        const SizedBox(height: 3),
        Text(label, style: const TextStyle(fontSize: 10, color: muted, fontWeight: FontWeight.w600)),
        Text(value, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: navy)),
      ],
    );
  }

  Widget _buildSummaryLine(String label, String value, {bool isBold = false, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isBold ? navy : muted,
            fontWeight: isBold ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 12.5,
            color: valueColor ?? navy,
            fontWeight: isBold ? FontWeight.w900 : FontWeight.w700,
          ),
        ),
      ],
    );
  }

  // ==========================================
  // 8. BOOKING CONFIRMATION CELEBRATION DIALOG
  // ==========================================
  void _showBookingSuccessDialog(RoomModel room, double amount, ReservationModel booking) {
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: emerald.withAlpha(25),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_circle_rounded, color: emerald, size: 36),
              ),
              const SizedBox(height: 14),
              const Text(
                'Stay Booked Successfully!',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: navy),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                'Your reservation for ${room.category} (Room ${room.roomNumber}) is confirmed. [Ref: #${booking.reservationNumber}]',
                style: const TextStyle(fontSize: 12, color: muted),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Paid / Charged', style: TextStyle(fontSize: 12, color: muted)),
                    Text(
                      '₹${amount.toStringAsFixed(0)}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: purple),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => GuestBookingDetailScreen(booking: booking),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navy,
                    foregroundColor: cream,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Done & View Booking', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
