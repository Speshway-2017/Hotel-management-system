import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/api_endpoints.dart';
import 'package:hour_stay_mobile/models/room_model.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/auth_provider.dart';
import 'package:hour_stay_mobile/providers/manager/room_provider.dart';
import 'package:hour_stay_mobile/screens/guest/bookings/guest_booking_detail_screen.dart';
import 'package:hour_stay_mobile/screens/auth/login_screen.dart';
import 'guest_room_detail_screen.dart';
import 'package:hour_stay_mobile/services/api_service.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/colours.dart';

class GuestSearchScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigateTab;

  const GuestSearchScreen({super.key, this.onNavigateTab});

  @override
  State<GuestSearchScreen> createState() => _GuestSearchScreenState();
}

class _GuestSearchScreenState extends State<GuestSearchScreen> {
  // Search & Filter Controllers & States
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedCategory = 'all';
  String _selectedPropertyId = 'all';
  String _sortBy = 'recommended'; // 'recommended', 'price_asc', 'price_desc', 'rating'
  bool _isFilterMenuOpen = false;

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

  // Dynamic Rooms from MongoDB
  List<RoomModel> _rooms = [];
  bool _isLoading = false;
  String? _errorMessage;

  // Predefined Categories
  static const List<Map<String, dynamic>> _categoriesList = [
    {'key': 'all', 'label': 'All Categories', 'icon': Icons.grid_view_rounded},
    {'key': 'standard', 'label': 'Standard Room', 'icon': Icons.single_bed_rounded},
    {'key': 'deluxe', 'label': 'Deluxe Room', 'icon': Icons.hotel_rounded},
    {'key': 'executive', 'label': 'Executive Suite', 'icon': Icons.king_bed_rounded},
    {'key': 'penthouse', 'label': 'Penthouse', 'icon': Icons.apartment_rounded},
    {'key': 'villa', 'label': 'Luxury Villa', 'icon': Icons.villa_rounded},
  ];

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
        fetchedProps = (propRes.data as List)
            .map((e) => e as Map<String, dynamic>)
            .where((p) {
              final name = (p['name'] ?? p['settings']?['hotelName'] ?? '').toString().toLowerCase();
              final status = (p['status'] ?? '').toString().toLowerCase();
              return !name.contains('test') && !name.contains('rambagh') && status != 'suspended';
            })
            .toList();
      }

      // 2. Format query params for date availability
      final inStr = DateFormat('yyyy-MM-dd').format(_checkInDate);
      final outStr = DateFormat('yyyy-MM-dd').format(_checkOutDate);

      // 3. Fetch rooms from public endpoint or manager room service
      final targetProp = _selectedPropertyId != 'all'
          ? _selectedPropertyId
          : (fetchedProps.isNotEmpty
              ? (fetchedProps.firstWhere(
                    (p) => (p['_id'] ?? p['id'] ?? '') == 'HS-9HQ8P',
                    orElse: () => fetchedProps[0],
                  )['_id'] ?? fetchedProps[0]['_id'] ?? fetchedProps[0]['id'] ?? 'HS-9HQ8P')
              : 'HS-9HQ8P');
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
          final pCity = pSettings['city'] ?? propMatch['city'] ?? 'Hyderabad';
          final pPolicy = pSettings['cancellationPolicy'] ?? 'Free cancellation up to 24 hours prior to check-in';

          map['propertyName'] = pName;
          map['city'] = pCity;
          map['cancellationPolicy'] = pPolicy;
          return RoomModel.fromJson(map);
        }).where((rm) {
          final num = rm.roomNumber.toLowerCase();
          final cat = rm.category.toLowerCase();
          final prop = (rm.propertyName ?? '').toLowerCase();
          return !num.contains('test') && !cat.contains('test') && !prop.contains('rambagh') && !prop.contains('test');
        }).toList();
      }

      // Fallback: If public endpoint returned empty, read from RoomProvider
      if (loadedRooms.isEmpty && mounted) {
        final roomProv = context.read<RoomProvider>();
        await roomProv.fetchAll(silent: true);
        loadedRooms = roomProv.rooms.where((rm) {
          final num = rm.roomNumber.toLowerCase();
          final cat = rm.category.toLowerCase();
          final prop = (rm.propertyName ?? '').toLowerCase();
          return !num.contains('test') && !cat.contains('test') && !prop.contains('rambagh') && !prop.contains('test');
        }).toList();
      }

      if (mounted) {
        setState(() {
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
      // Exclude test rooms and dummy test properties permanently
      final roomNumLower = room.roomNumber.toLowerCase();
      final roomCatLower = room.category.toLowerCase();
      final roomPropLower = (room.propertyName ?? '').toLowerCase();
      if (roomNumLower.contains('test') ||
          roomCatLower.contains('test') ||
          roomPropLower.contains('rambagh') ||
          roomPropLower.contains('test')) {
        return false;
      }

      // 1. Availability toggle filter
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

  String _getCategoryDisplayName(String key) {
    if (key == 'all') return 'All Categories';
    for (final c in _categoriesList) {
      if (c['key'] == key) {
        return c['label'] as String;
      }
    }
    return key;
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

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredRooms;

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
          'Search & Explore',
          style: TextStyle(
            color: cream,
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
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

            // 2. Results Header & Summary Bar
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
                    message: 'We could not find any rooms matching your search criteria. Try adjusting your status or category filters.',
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
  int get _activeFiltersCount {
    int count = 0;
    if (_selectedCategory != 'all') count++;
    if (_maxPrice < 25000) count++;
    if (_selectedAmenities.isNotEmpty) count++;
    if (_onlyAvailable) count++;
    return count;
  }

  Widget _buildSearchHeader() {
    final activeCount = _activeFiltersCount;
    final availableAmenities = [
      'WiFi',
      'Air Conditioning',
      'Bathtub',
      'Swimming Pool',
      'Breakfast Included',
      'Smart TV',
      'Free Parking',
      'Fitness Center / Gym',
      'Balcony / Terrace',
      'Mini Bar',
      'Room Service',
      'Jacuzzi',
    ];

    final presets = [
      {'label': '< ₹3,000', 'value': 3000.0},
      {'label': '< ₹6,000', 'value': 6000.0},
      {'label': '< ₹10,000', 'value': 10000.0},
      {'label': '< ₹15,000', 'value': 15000.0},
      {'label': '< ₹25,000', 'value': 25000.0},
    ];

    return Container(
      decoration: const BoxDecoration(
        color: white,
        border: Border(bottom: BorderSide(color: cardBorder)),
      ),
      padding: const EdgeInsets.fromLTRB(0, 14, 0, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // A. Search Input Field & Filter Button in Single Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                // 1. Search Bar
                Expanded(
                  child: Container(
                    height: 42,
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
                        hintText: 'Search city, hotel, room, WiFi...',
                        hintStyle: const TextStyle(
                          color: muted,
                          fontSize: 12.5,
                          fontWeight: FontWeight.normal,
                        ),
                        prefixIcon: const Icon(Icons.search_rounded, color: purple, size: 19),
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
                const SizedBox(width: 8),

                // 2. Filter Button beside Search Bar
                _buildSearchFilterButton(),
              ],
            ),
          ),

          // B. Inline Expandable Filter Panel directly below search bar
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
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Panel Header: Title + Reset Button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.tune_rounded, size: 16, color: purple),
                            const SizedBox(width: 6),
                            const Text(
                              'Filter Options',
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: navy,
                              ),
                            ),
                            if (activeCount > 0) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: gold,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '$activeCount active',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    color: navy,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        InkWell(
                          onTap: _resetAllFilters,
                          borderRadius: BorderRadius.circular(6),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            child: Text(
                              'Reset All',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: purple,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 18, color: cardBorder),

                    // 1. Room Category
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Room Category',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy),
                        ),
                        Text(
                          _getCategoryDisplayName(_selectedCategory),
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: purple),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: _categoriesList.map((cat) {
                        final key = cat['key'] as String;
                        final label = cat['label'] as String;
                        final icon = cat['icon'] as IconData;
                        final count = _getCategoryRoomCount(key);
                        final isSel = _selectedCategory == key;

                        return InkWell(
                          onTap: () {
                            setState(() => _selectedCategory = key);
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                            decoration: BoxDecoration(
                              color: isSel ? navy : white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isSel ? gold : cardBorder,
                                width: isSel ? 1.2 : 1.0,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(icon, size: 13, color: isSel ? gold : purple),
                                const SizedBox(width: 5),
                                Text(
                                  label,
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                    color: isSel ? cream : navy,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: isSel ? gold : const Color(0xFFE2E8F0),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    '$count',
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      color: isSel ? navy : const Color(0xFF64748B),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 14),

                    // 2. Maximum Price
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Maximum Price',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy),
                        ),
                        Text(
                          _maxPrice >= 25000 ? 'Any Price (Up to ₹25k+)' : 'Up to ₹${_maxPrice.toInt()}',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFFB45309)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        activeTrackColor: navy,
                        inactiveTrackColor: const Color(0xFFE2E8F0),
                        thumbColor: gold,
                        overlayColor: gold.withAlpha(40),
                        trackHeight: 4,
                      ),
                      child: Slider(
                        value: _maxPrice.clamp(1000.0, 25000.0),
                        min: 1000.0,
                        max: 25000.0,
                        divisions: 24,
                        onChanged: (val) => setState(() => _maxPrice = val),
                      ),
                    ),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: presets.map((p) {
                        final val = p['value'] as double;
                        final label = p['label'] as String;
                        final isSel = (_maxPrice - val).abs() < 100;

                        return InkWell(
                          onTap: () => setState(() => _maxPrice = val),
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isSel ? navy : white,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: isSel ? gold : cardBorder),
                            ),
                            child: Text(
                              label,
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                color: isSel ? cream : navy,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 14),

                    // 3. Availability Filter
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Available Rooms Only',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy),
                              ),
                              Text(
                                'Hide currently occupied rooms',
                                style: TextStyle(fontSize: 10.5, color: muted),
                              ),
                            ],
                          ),
                          Switch(
                            value: _onlyAvailable,
                            activeTrackColor: navy,
                            thumbColor: const WidgetStatePropertyAll(gold),
                            onChanged: (val) => setState(() => _onlyAvailable = val),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // 4. Room Amenities
                    const Text(
                      'Amenities',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: availableAmenities.map((amenity) {
                        final isSel = _selectedAmenities.contains(amenity);

                        return InkWell(
                          onTap: () {
                            setState(() {
                              if (isSel) {
                                _selectedAmenities.remove(amenity);
                              } else {
                                _selectedAmenities.add(amenity);
                              }
                            });
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                            decoration: BoxDecoration(
                              color: isSel ? navy : white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isSel ? gold : cardBorder,
                                width: isSel ? 1.2 : 1.0,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  isSel ? Icons.check_circle_rounded : Icons.add_circle_outline_rounded,
                                  size: 13,
                                  color: isSel ? gold : purple,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  amenity,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                    color: isSel ? cream : navy,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 14),

                    // 5. Close / Done Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: navy,
                          foregroundColor: white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () {
                          setState(() => _isFilterMenuOpen = false);
                        },
                        child: const Text(
                          'Done',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 0.3),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSearchFilterButton() {
    final activeCount = _activeFiltersCount;
    final isFiltered = activeCount > 0;

    return InkWell(
      onTap: () {
        setState(() => _isFilterMenuOpen = !_isFilterMenuOpen);
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
            Icon(
              Icons.tune_rounded,
              size: 15,
              color: (_isFilterMenuOpen || isFiltered) ? gold : purple,
            ),
            const SizedBox(width: 5),
            Text(
              isFiltered ? 'Filters ($activeCount)' : 'Filters',
              style: TextStyle(
                fontSize: 12,
                fontWeight: (_isFilterMenuOpen || isFiltered) ? FontWeight.w800 : FontWeight.w600,
                color: (_isFilterMenuOpen || isFiltered) ? cream : navy,
              ),
            ),
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

  // ==========================================
  // 2. RESULTS SUMMARY BAR
  // ==========================================
  Widget _buildResultsSummaryBar(int count) {
    final hasActiveFilters = _selectedCategory != 'all' ||
        _maxPrice < 25000 ||
        _selectedAmenities.isNotEmpty ||
        _onlyAvailable ||
        _searchQuery.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Text(
                '$count ${_onlyAvailable ? "Available " : ""}Rooms',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: navy,
                ),
              ),
              if (_selectedCategory != 'all') ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: purpleBg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _getCategoryDisplayName(_selectedCategory),
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: purple),
                  ),
                ),
              ],
            ],
          ),
          if (hasActiveFilters)
            InkWell(
              onTap: _resetAllFilters,
              borderRadius: BorderRadius.circular(12),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                child: Row(
                  children: [
                    Icon(Icons.refresh_rounded, size: 14, color: purple),
                    SizedBox(width: 4),
                    Text(
                      'Clear',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: purple,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
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

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _openRoomDetails(room),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Room Image with rating overlay
              Stack(
                children: [
                  _buildRoomHeroImage(room),
                  // Rating Badge
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withAlpha(160),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
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
                  ),
                ],
              ),

              // 2. Room Name/Type, Final Amount incl. GST & Book Stay Button
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Room Name and Final Amount
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            room.category,
                            style: const TextStyle(
                              fontSize: 15.5,
                              fontWeight: FontWeight.w800,
                              color: navy,
                              letterSpacing: -0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '₹${totalPayable.toStringAsFixed(0)}',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                              color: navy,
                              letterSpacing: -0.3,
                            ),
                          ),
                          const Text(
                            'Final amount (incl. GST)',
                            style: TextStyle(
                              fontSize: 10.5,
                              color: muted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),

                    // Book Stay Button (always active to view details and select dates)
                    ElevatedButton(
                      onPressed: () => _openRoomDetails(room),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: navy,
                        foregroundColor: white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: const BorderSide(
                            color: gold,
                            width: 1.1,
                          ),
                        ),
                      ),
                      child: const Text(
                        'Book Stay',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: white,
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
    );
  }

  void _openRoomDetails(RoomModel room) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => GuestRoomDetailScreen(
          room: room,
          checkInDate: null,
          checkOutDate: null,
          adultsCount: _adultsCount,
          childrenCount: _childrenCount,
          roomsCount: _roomsCount,
          onBookStay: (
            r, {
            DateTime? checkInDate,
            DateTime? checkOutDate,
            int? adultsCount,
            int? childrenCount,
            int? roomsCount,
            String? acVariant,
            double? customPrice,
          }) {
            Navigator.of(context).pop();
            _openRoomBookingFlow(
              r,
              checkInDate: checkInDate,
              checkOutDate: checkOutDate,
              adultsCount: adultsCount,
              childrenCount: childrenCount,
              roomsCount: roomsCount,
              acVariant: acVariant,
              customPrice: customPrice,
            );
          },
        ),
      ),
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
  // 4. ROOM DETAILS & INSTANT BOOKING FLOW
  // ==========================================
  void _openRoomBookingFlow(
    RoomModel room, {
    DateTime? checkInDate,
    DateTime? checkOutDate,
    int? adultsCount,
    int? childrenCount,
    int? roomsCount,
    String? acVariant,
    double? customPrice,
  }) {
    final authProvider = context.read<AuthProvider>();
    final user = authProvider.user;

    if (user == null) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
      return;
    }

    final effectiveCheckIn = checkInDate ?? _checkInDate;
    final effectiveCheckOut = checkOutDate ?? _checkOutDate;
    final effectiveAdults = adultsCount ?? _adultsCount;
    final effectiveChildren = childrenCount ?? _childrenCount;
    final effectiveRooms = roomsCount ?? _roomsCount;
    final diffDays = effectiveCheckOut.difference(effectiveCheckIn).inDays;
    final effectiveNights = diffDays > 0 ? diffDays : 1;

    final price = customPrice ?? (_calculateRoomPrice(room) * effectiveNights);
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
                          _buildDetailSpec(Icons.people_rounded, 'Capacity', '$effectiveAdults Adults'),
                          _buildDetailSpec(Icons.ac_unit_rounded, 'Variant', acVariant ?? 'AC Room'),
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
                          _buildSummaryLine('Check-In Date', DateFormat('EEE, dd MMM yyyy').format(effectiveCheckIn)),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine('Check-Out Date', DateFormat('EEE, dd MMM yyyy').format(effectiveCheckOut)),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine(
                            'Duration of Stay',
                            '$effectiveNights ${effectiveNights == 1 ? 'Night' : 'Nights'}',
                          ),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine('Occupancy', '$effectiveAdults Adults${effectiveChildren > 0 ? ", $effectiveChildren Children" : ""} ($effectiveRooms Room)'),
                          if (acVariant != null) ...[
                            const Divider(height: 14, color: cardBorder),
                            _buildSummaryLine('Selected Variant', acVariant),
                          ],
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
                          _buildSummaryLine('Guest Name', user.name.isNotEmpty ? user.name : 'Valued Guest'),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine('Email Address', user.email.isNotEmpty ? user.email : 'guest@hourstay.com'),
                          const Divider(height: 14, color: cardBorder),
                          _buildSummaryLine('Mobile / Phone', user.mobile.isNotEmpty ? user.mobile : 'Verified on File'),
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
                            'Room Tariff ($effectiveNights ${effectiveNights == 1 ? 'Night' : 'Nights'})',
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
                                    'guest': user.name,
                                    'guestName': user.name,
                                    'email': user.email,
                                    'phone': user.mobile,
                                    'checkIn': DateFormat('yyyy-MM-dd').format(effectiveCheckIn),
                                    'checkInDate': DateFormat('yyyy-MM-dd').format(effectiveCheckIn),
                                    'checkOut': DateFormat('yyyy-MM-dd').format(effectiveCheckOut),
                                    'checkOutDate': DateFormat('yyyy-MM-dd').format(effectiveCheckOut),
                                    'stayType': 'overnight',
                                    'nights': effectiveNights,
                                    'adults': effectiveAdults,
                                    'children': effectiveChildren,
                                    'roomsCount': effectiveRooms,
                                    'amount': totalPayable,
                                    'totalAmount': totalPayable,
                                    'specialRequests': specialRequestsController.text.trim(),
                                  };

                                  // Post booking to backend API
                                  final res = await ApiService.post('/v1/public/bookings', bookingPayload);
                                  if (!res.success) {
                                    final String errMsg = (res.message != null && res.message!.isNotEmpty)
                                        ? res.message!
                                        : (res.data is Map && (res.data['message'] ?? res.data['error']) != null
                                            ? (res.data['message'] ?? res.data['error']).toString()
                                            : 'Selected room is unavailable for the chosen dates. Please select other dates.');
                                    messenger.showSnackBar(
                                      SnackBar(
                                        content: Text(errMsg),
                                        backgroundColor: ruby,
                                      ),
                                    );
                                    return;
                                  }

                                  ReservationModel? createdRes;
                                  if (res.data != null) {
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

                                  if (createdRes == null) {
                                    final autoBookingId = 'BK-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
                                    createdRes = ReservationModel(
                                      id: autoBookingId,
                                      bookingId: autoBookingId,
                                      hotel: hotelName,
                                      room: room.category,
                                      roomNumber: room.roomNumber,
                                      checkIn: DateFormat('yyyy-MM-dd').format(effectiveCheckIn),
                                      checkOut: DateFormat('yyyy-MM-dd').format(effectiveCheckOut),
                                      guest: user.name,
                                      amount: totalPayable,
                                      balance: 0,
                                      status: 'Confirmed',
                                      paymentStatus: 'Paid',
                                      propertyId: room.propertyId,
                                    );
                                  }

                                  // Refresh room inventory to reflect current booking status
                                  _loadPropertiesAndRooms(silent: true);

                                  navigator.pop();
                                  _showBookingSuccessDialog(room, totalPayable, createdRes);
                                } catch (e) {
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text('Booking failed: $e'),
                                      backgroundColor: ruby,
                                    ),
                                  );
                                } finally {
                                  if (mounted) {
                                    setModalState(() => isSubmitting = false);
                                  }
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: navy,
                          foregroundColor: white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: isSubmitting
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2, color: white),
                              )
                            : Text(
                                'Confirm & Book Stay • ₹${totalPayable.toStringAsFixed(0)}',
                                style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800, color: white),
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
