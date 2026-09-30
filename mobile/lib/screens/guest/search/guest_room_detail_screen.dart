import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:hour_stay_mobile/colours.dart';
import 'package:hour_stay_mobile/core/constants/api_endpoints.dart';
import 'package:hour_stay_mobile/models/room_model.dart';

typedef RoomBookingCallback = void Function(
  RoomModel room, {
  DateTime? checkInDate,
  DateTime? checkOutDate,
  int? adultsCount,
  int? childrenCount,
  int? roomsCount,
  String? acVariant,
  double? customPrice,
});

class GuestRoomDetailScreen extends StatefulWidget {
  final RoomModel room;
  final DateTime? checkInDate;
  final DateTime? checkOutDate;
  final int adultsCount;
  final int childrenCount;
  final int roomsCount;
  final RoomBookingCallback onBookStay;

  const GuestRoomDetailScreen({
    super.key,
    required this.room,
    this.checkInDate,
    this.checkOutDate,
    this.adultsCount = 2,
    this.childrenCount = 0,
    this.roomsCount = 1,
    required this.onBookStay,
  });

  @override
  State<GuestRoomDetailScreen> createState() => _GuestRoomDetailScreenState();
}

class _GuestRoomDetailScreenState extends State<GuestRoomDetailScreen> {
  int _activeImageIndex = 0;
  final PageController _pageController = PageController();

  // Dynamic Stay & Configuration State (Not prefilled by default)
  DateTime? _checkInDate;
  DateTime? _checkOutDate;
  late TimeOfDay _checkInTime;
  late TimeOfDay _checkOutTime;
  late int _adultsCount;
  late int _childrenCount;
  late int _roomsCount;
  late String _selectedAcVariant; // 'AC' or 'Non-AC'

  @override
  void initState() {
    super.initState();
    // Do NOT prefill default dates if not provided
    _checkInDate = widget.checkInDate;
    _checkOutDate = widget.checkOutDate;

    _checkInTime = const TimeOfDay(hour: 12, minute: 0);
    _checkOutTime = const TimeOfDay(hour: 11, minute: 0);
    _adultsCount = widget.adultsCount > 0 ? widget.adultsCount : 2;
    _childrenCount = widget.childrenCount >= 0 ? widget.childrenCount : 0;
    _roomsCount = widget.roomsCount > 0 ? widget.roomsCount : 1;

    // Detect initial AC variant from room amenities / category
    final isAcByDefault = widget.room.amenities.any((a) =>
            a.toLowerCase().contains('ac') ||
            a.toLowerCase().contains('air') ||
            a.toLowerCase().contains('condition')) ||
        !widget.room.category.toLowerCase().contains('non-ac');
    _selectedAcVariant = isAcByDefault ? 'AC' : 'Non-AC';
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  // Calculation Getters
  bool get _hasSelectedDates => _checkInDate != null && _checkOutDate != null;

  int get _nightsCount {
    if (_checkInDate == null || _checkOutDate == null) return 1;
    final diff = _checkOutDate!.difference(_checkInDate!).inDays;
    return diff > 0 ? diff : 1;
  }

  double get _rawNightlyRate {
    return widget.room.currentRate > 0 ? widget.room.currentRate : widget.room.baseRate;
  }

  double get _effectiveNightlyRate {
    if (_selectedAcVariant == 'Non-AC') {
      // Non-AC economy tariff (15% reduction)
      return (_rawNightlyRate * 0.85).roundToDouble();
    }
    return _rawNightlyRate;
  }

  double get _extraGuestTariffPerNight {
    double extra = 0;
    if (_adultsCount > 2) {
      extra += (_adultsCount - 2) * 500.0;
    }
    if (_childrenCount > 0) {
      extra += _childrenCount * 250.0;
    }
    return extra;
  }

  double get _basePrice {
    return (_effectiveNightlyRate + _extraGuestTariffPerNight) * _nightsCount * _roomsCount;
  }

  double get _gstTax => (_basePrice * 0.18).roundToDouble();

  double get _totalPayable => _basePrice + _gstTax;

  // Live Date-Based Room Availability Status Checkers
  bool get _isStayOccupied {
    if (!_hasSelectedDates) return false;
    final selIn = DateTime(_checkInDate!.year, _checkInDate!.month, _checkInDate!.day);
    final selOut = DateTime(_checkOutDate!.year, _checkOutDate!.month, _checkOutDate!.day);

    if (widget.room.isOccupied) {
      if (widget.room.checkIn != null && widget.room.checkOut != null) {
        final rIn = DateTime.tryParse(widget.room.checkIn!);
        final rOut = DateTime.tryParse(widget.room.checkOut!);
        if (rIn != null && rOut != null) {
          final rInDate = DateTime(rIn.year, rIn.month, rIn.day);
          final rOutDate = DateTime(rOut.year, rOut.month, rOut.day);
          return selIn.isBefore(rOutDate) && selOut.isAfter(rInDate);
        }
      }
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      if (!selIn.isAfter(today) && selOut.isAfter(today)) return true;
    }
    return false;
  }

  bool get _isStayReserved {
    if (!_hasSelectedDates) return false;
    if (_isStayOccupied) return false;
    final selIn = DateTime(_checkInDate!.year, _checkInDate!.month, _checkInDate!.day);
    final selOut = DateTime(_checkOutDate!.year, _checkOutDate!.month, _checkOutDate!.day);

    if (widget.room.isReserved || widget.room.isReservedStatus || !widget.room.isAvailable) {
      if (widget.room.checkIn != null && widget.room.checkOut != null) {
        final rIn = DateTime.tryParse(widget.room.checkIn!);
        final rOut = DateTime.tryParse(widget.room.checkOut!);
        if (rIn != null && rOut != null) {
          final rInDate = DateTime(rIn.year, rIn.month, rIn.day);
          final rOutDate = DateTime(rOut.year, rOut.month, rOut.day);
          return selIn.isBefore(rOutDate) && selOut.isAfter(rInDate);
        }
      }
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      if (!selIn.isAfter(today) && selOut.isAfter(today)) return true;
    }
    return false;
  }

  bool get _isStayAvailable => _hasSelectedDates && !_isStayOccupied && !_isStayReserved;

  String get _stayStatusText {
    if (!_hasSelectedDates) return 'SELECT DATES';
    if (_isStayOccupied) return 'OCCUPIED';
    if (_isStayReserved) return 'RESERVED';
    return 'AVAILABLE';
  }

  Color get _stayStatusColor {
    if (!_hasSelectedDates) return purple;
    if (_isStayOccupied) return const Color(0xFFDC2626);
    if (_isStayReserved) return const Color(0xFFD97706);
    return const Color(0xFF059669);
  }

  String get _stayStatusDescription {
    if (!_hasSelectedDates) {
      return 'Please choose Check-In and Check-Out dates above to check live room availability & tariff.';
    }
    if (_isStayOccupied) {
      return 'Occupied for selected dates (${DateFormat('dd MMM').format(_checkInDate!)} - ${DateFormat('dd MMM').format(_checkOutDate!)}). Please select other dates.';
    }
    if (_isStayReserved) {
      return 'Reserved for selected dates (${DateFormat('dd MMM').format(_checkInDate!)} - ${DateFormat('dd MMM').format(_checkOutDate!)}). Please adjust your dates.';
    }
    return 'Room is available for selected dates (${DateFormat('dd MMM').format(_checkInDate!)} - ${DateFormat('dd MMM').format(_checkOutDate!)}).';
  }

  bool get _canDecreaseCheckIn {
    if (_checkInDate == null) return false;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return _checkInDate!.isAfter(today);
  }

  bool get _canDecreaseCheckOut {
    if (_checkOutDate == null || _checkInDate == null) return false;
    return _checkOutDate!.isAfter(_checkInDate!.add(const Duration(days: 1)));
  }

  // Date & Time Steppers
  void _decreaseCheckInDate() {
    if (_checkInDate == null || !_canDecreaseCheckIn) return;
    setState(() {
      _checkInDate = _checkInDate!.subtract(const Duration(days: 1));
    });
  }

  void _increaseCheckInDate() {
    setState(() {
      if (_checkInDate == null) {
        final now = DateTime.now();
        _checkInDate = DateTime(now.year, now.month, now.day);
      } else {
        _checkInDate = _checkInDate!.add(const Duration(days: 1));
      }
      if (_checkOutDate != null && !_checkOutDate!.isAfter(_checkInDate!)) {
        _checkOutDate = _checkInDate!.add(const Duration(days: 1));
      }
    });
  }

  void _decreaseCheckOutDate() {
    if (_checkOutDate == null || !_canDecreaseCheckOut) return;
    setState(() {
      _checkOutDate = _checkOutDate!.subtract(const Duration(days: 1));
    });
  }

  void _increaseCheckOutDate() {
    setState(() {
      if (_checkOutDate == null) {
        if (_checkInDate != null) {
          _checkOutDate = _checkInDate!.add(const Duration(days: 1));
        } else {
          final now = DateTime.now();
          _checkOutDate = DateTime(now.year, now.month, now.day).add(const Duration(days: 1));
        }
      } else {
        _checkOutDate = _checkOutDate!.add(const Duration(days: 1));
      }
    });
  }

  Future<void> _pickCheckInDate() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final initial = _checkInDate != null && !_checkInDate!.isBefore(today) ? _checkInDate! : today;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: navy,
            onPrimary: white,
            onSurface: navy,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        _checkInDate = picked;
        if (_checkOutDate == null || !_checkOutDate!.isAfter(_checkInDate!)) {
          _checkOutDate = _checkInDate!.add(const Duration(days: 1));
        }
      });
    }
  }

  Future<void> _pickCheckOutDate() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final firstPossible = _checkInDate != null
        ? _checkInDate!.add(const Duration(days: 1))
        : today.add(const Duration(days: 1));

    final initial = _checkOutDate != null && !_checkOutDate!.isBefore(firstPossible)
        ? _checkOutDate!
        : firstPossible;

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: firstPossible,
      lastDate: today.add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: navy,
            onPrimary: white,
            onSurface: navy,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() {
        _checkOutDate = picked;
      });
    }
  }



  Future<void> _pickCheckInTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _checkInTime,
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: navy,
            onPrimary: white,
            onSurface: navy,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() => _checkInTime = picked);
    }
  }

  Future<void> _pickCheckOutTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _checkOutTime,
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(
          colorScheme: const ColorScheme.light(
            primary: navy,
            onPrimary: white,
            onSurface: navy,
          ),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() => _checkOutTime = picked);
    }
  }

  String _formatTimeOfDay(TimeOfDay time) {
    final now = DateTime.now();
    final dt = DateTime(now.year, now.month, now.day, time.hour, time.minute);
    return DateFormat('hh:mm a').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final room = widget.room;
    final hotelName = room.propertyName?.isNotEmpty == true ? room.propertyName! : 'Hour Stay Luxury Hotel';
    final city = room.city?.isNotEmpty == true ? room.city! : 'India';

    return Scaffold(
      backgroundColor: background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // 1. App Bar with Hero Image Carousel
          SliverAppBar(
            expandedHeight: 280,
            pinned: true,
            backgroundColor: navy,
            leading: IconButton(
              icon: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: Colors.black.withAlpha(140),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.arrow_back_ios_new_rounded, color: white, size: 18),
              ),
              onPressed: () => Navigator.of(context).pop(),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  _buildImageCarousel(room),
                  // Dark bottom gradient overlay
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withAlpha(80),
                            Colors.transparent,
                            Colors.black.withAlpha(180),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Live Date-Based Availability / Status Badge
                  Positioned(
                    top: 50,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: _stayStatusColor,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(60),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: white,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _stayStatusText,
                            style: const TextStyle(
                              color: white,
                              fontSize: 10.5,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Image Indicators
                  if (room.images.length > 1)
                    Positioned(
                      bottom: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withAlpha(150),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${_activeImageIndex + 1} / ${room.images.length}',
                          style: const TextStyle(
                            color: white,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // 2. Room Content Body
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 130),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Hotel & Room Title Section
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              room.category,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: navy,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.location_on_rounded, size: 14, color: purple),
                                const SizedBox(width: 4),
                                Expanded(
                                  child: Text(
                                    '$hotelName • $city',
                                    style: const TextStyle(
                                      fontSize: 13,
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
                      // Rating Card
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: goldBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: gold.withAlpha(120)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star_rounded, size: 16, color: Color(0xFFB45309)),
                            const SizedBox(width: 4),
                            Text(
                              room.rating.toStringAsFixed(1),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFFB45309),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // ==========================================
                  // 1. SUB-CATEGORY & CLIMATE VARIANT (AC / Non-AC)
                  // ==========================================
                  _buildSectionTitle('ROOM SUB-CATEGORY & CLIMATE VARIANT', Icons.tune_rounded),
                  const SizedBox(height: 10),
                  _buildAcVariantSelector(),
                  const SizedBox(height: 18),

                  // ==========================================
                  // 2. CAPACITY & GUEST OCCUPANCY OPTIONS
                  // ==========================================
                  _buildSectionTitle('GUEST CAPACITY & OCCUPANCY OPTIONS', Icons.people_alt_rounded),
                  const SizedBox(height: 10),
                  _buildCapacitySelector(),
                  const SizedBox(height: 18),

                  // ==========================================
                  // 3. CHECK-IN / CHECK-OUT WITH (+ / −) CONTROLS
                  // ==========================================
                  _buildSectionTitle('CHECK-IN & CHECK-OUT ADJUSTMENTS', Icons.calendar_month_rounded),
                  const SizedBox(height: 10),
                  _buildDateTimeAdjustmentCard(),
                  const SizedBox(height: 18),

                  // ==========================================
                  // 4. ROOM CORE SPECS
                  // ==========================================
                  _buildSectionTitle('IN-ROOM SPECIFICATIONS', Icons.hotel_rounded),
                  const SizedBox(height: 10),
                  _buildRoomSpecsGrid(room),
                  const SizedBox(height: 18),

                  // ==========================================
                  // 5. AMENITIES & FEATURES
                  // ==========================================
                  _buildSectionTitle('AMENITIES & IN-ROOM COMFORTS', Icons.spa_rounded),
                  const SizedBox(height: 10),
                  _buildAmenitiesSection(room),
                  const SizedBox(height: 18),

                  // ==========================================
                  // 6. DYNAMIC PRICE & TAX BREAKDOWN
                  // ==========================================
                  _buildSectionTitle('DYNAMIC PRICE & TAX BREAKDOWN', Icons.receipt_long_rounded),
                  const SizedBox(height: 10),
                  _buildPriceBreakdownCard(),
                  const SizedBox(height: 18),

                  // ==========================================
                  // 7. HOTEL POLICY & GUARANTEE
                  // ==========================================
                  _buildPolicyCard(room),
                ],
              ),
            ),
          ),
        ],
      ),

      // 3. Sticky Bottom Booking Bar
      bottomNavigationBar: Container(
        padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(context).padding.bottom + 12),
        decoration: BoxDecoration(
          color: white,
          border: const Border(top: BorderSide(color: cardBorder, width: 1)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(12),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '₹${_totalPayable.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontSize: 21,
                      fontWeight: FontWeight.w900,
                      color: navy,
                      letterSpacing: -0.3,
                    ),
                  ),
                  Text(
                    _hasSelectedDates
                        ? 'Final (incl. GST) • $_nightsCount ${_nightsCount == 1 ? "Night" : "Nights"} • $_selectedAcVariant • $_adultsCount ${_adultsCount == 1 ? "Adult" : "Adults"}'
                        : 'Rate per night (incl. GST) • Select stay dates',
                    style: const TextStyle(fontSize: 10.5, color: muted, fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            () {
              final isAvailable = _isStayAvailable;
              final buttonLabel = !_hasSelectedDates
                  ? 'Select Dates'
                  : (_isStayOccupied
                      ? 'Dates Occupied'
                      : (_isStayReserved ? 'Dates Reserved' : 'Book Stay'));

              return ElevatedButton.icon(
                onPressed: isAvailable
                    ? () {
                        widget.onBookStay(
                          room,
                          checkInDate: _checkInDate,
                          checkOutDate: _checkOutDate,
                          adultsCount: _adultsCount,
                          childrenCount: _childrenCount,
                          roomsCount: _roomsCount,
                          acVariant: _selectedAcVariant,
                          customPrice: _basePrice,
                        );
                      }
                    : () {
                        if (!_hasSelectedDates) {
                          _pickCheckInDate();
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: isAvailable ? navy : const Color(0xFF94A3B8),
                  foregroundColor: white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: isAvailable ? gold : Colors.transparent, width: 1.2),
                  ),
                ),
                icon: Icon(
                  isAvailable ? Icons.bolt_rounded : Icons.calendar_today_rounded,
                  color: isAvailable ? gold : Colors.white70,
                  size: 18,
                ),
                label: Text(
                  buttonLabel,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: isAvailable ? white : Colors.white.withAlpha(230),
                  ),
                ),
              );
            }(),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // WIDGET HELPERS
  // ==========================================

  Widget _buildSectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: purple),
        const SizedBox(width: 6),
        Text(
          title,
          style: const TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w800,
            color: Color(0xFF64748B),
            letterSpacing: 0.5,
          ),
        ),
      ],
    );
  }

  // 1. AC / Non-AC Variant Selector
  Widget _buildAcVariantSelector() {
    final acRate = _rawNightlyRate;
    final nonAcRate = (_rawNightlyRate * 0.85).roundToDouble();

    return Row(
      children: [
        Expanded(
          child: _buildVariantCard(
            title: 'AC Room',
            subtitle: 'Climate Controlled',
            priceTag: '₹${acRate.toStringAsFixed(0)} / night',
            icon: Icons.ac_unit_rounded,
            isSelected: _selectedAcVariant == 'AC',
            onTap: () => setState(() => _selectedAcVariant = 'AC'),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildVariantCard(
            title: 'Non-AC Room',
            subtitle: 'Naturally Ventilated',
            priceTag: '₹${nonAcRate.toStringAsFixed(0)} / night (-15%)',
            icon: Icons.air_rounded,
            isSelected: _selectedAcVariant == 'Non-AC',
            onTap: () => setState(() => _selectedAcVariant = 'Non-AC'),
          ),
        ),
      ],
    );
  }

  Widget _buildVariantCard({
    required String title,
    required String subtitle,
    required String priceTag,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? purpleBg : white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? purple : cardBorder,
            width: isSelected ? 1.8 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: purple.withAlpha(25),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  )
                ]
              : [],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, size: 20, color: isSelected ? purple : muted),
                if (isSelected)
                  const Icon(Icons.check_circle_rounded, size: 18, color: purple)
                else
                  Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: cardBorder, width: 1.5),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w800,
                color: isSelected ? navy : const Color(0xFF334155),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 10.5, color: muted, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 6),
            Text(
              priceTag,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: isSelected ? purple : const Color(0xFF0F766E),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // 2. Capacity Selector
  Widget _buildCapacitySelector() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        children: [
          // Adults Count Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Adults (Age 12+)',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navy),
                  ),
                  Text(
                    _adultsCount > 2 ? 'Includes extra guest fee (+₹500/night)' : 'Standard double capacity',
                    style: const TextStyle(fontSize: 10.5, color: muted, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
              Row(
                children: [
                  _buildStepperButton(
                    icon: Icons.remove,
                    enabled: _adultsCount > 1,
                    onTap: () {
                      if (_adultsCount > 1) {
                        setState(() => _adultsCount--);
                      }
                    },
                  ),
                  Container(
                    width: 38,
                    alignment: Alignment.center,
                    child: Text(
                      '$_adultsCount',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: navy),
                    ),
                  ),
                  _buildStepperButton(
                    icon: Icons.add,
                    enabled: _adultsCount < 6,
                    onTap: () {
                      if (_adultsCount < 6) {
                        setState(() => _adultsCount++);
                      }
                    },
                  ),
                ],
              ),
            ],
          ),
          const Divider(height: 18, color: cardBorder),

          // Children Count Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Children (Age 0 - 11)',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navy),
                  ),
                  Text(
                    'Complimentary for kids under 5',
                    style: TextStyle(fontSize: 10.5, color: muted, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
              Row(
                children: [
                  _buildStepperButton(
                    icon: Icons.remove,
                    enabled: _childrenCount > 0,
                    onTap: () {
                      if (_childrenCount > 0) {
                        setState(() => _childrenCount--);
                      }
                    },
                  ),
                  Container(
                    width: 38,
                    alignment: Alignment.center,
                    child: Text(
                      '$_childrenCount',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: navy),
                    ),
                  ),
                  _buildStepperButton(
                    icon: Icons.add,
                    enabled: _childrenCount < 4,
                    onTap: () {
                      if (_childrenCount < 4) {
                        setState(() => _childrenCount++);
                      }
                    },
                  ),
                ],
              ),
            ],
          ),
          const Divider(height: 18, color: cardBorder),

          // Rooms Count Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Rooms Required',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navy),
                  ),
                  Text(
                    'Multiple rooms under single booking',
                    style: TextStyle(fontSize: 10.5, color: muted, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
              Row(
                children: [
                  _buildStepperButton(
                    icon: Icons.remove,
                    enabled: _roomsCount > 1,
                    onTap: () {
                      if (_roomsCount > 1) {
                        setState(() => _roomsCount--);
                      }
                    },
                  ),
                  Container(
                    width: 38,
                    alignment: Alignment.center,
                    child: Text(
                      '$_roomsCount',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: navy),
                    ),
                  ),
                  _buildStepperButton(
                    icon: Icons.add,
                    enabled: _roomsCount < 4,
                    onTap: () {
                      if (_roomsCount < 4) {
                        setState(() => _roomsCount++);
                      }
                    },
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStepperButton({
    required IconData icon,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: enabled ? const Color(0xFFF1F5F9) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: enabled ? cardBorder : const Color(0xFFE2E8F0)),
        ),
        child: Icon(
          icon,
          size: 16,
          color: enabled ? navy : muted.withAlpha(120),
        ),
      ),
    );
  }

  // 3. Date & Time Input Fields Card (From Date / To Date)
  Widget _buildDateTimeAdjustmentCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cream.withAlpha(120),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: gold.withAlpha(90)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Section label + Stay Duration Pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.date_range_rounded, size: 16, color: purple),
                  SizedBox(width: 6),
                  Text(
                    'Select Stay Dates',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: navy,
                    ),
                  ),
                ],
              ),
              // Stay Duration Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: purpleBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: purple.withAlpha(60)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.nights_stay_rounded, size: 13, color: purple),
                    const SizedBox(width: 4),
                    Text(
                      '$_nightsCount ${_nightsCount == 1 ? "Night" : "Nights"}',
                      style: const TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w900,
                        color: purple,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 1. FROM DATE INPUT FIELD
          _buildDateInputField(
            label: 'FROM DATE',
            subLabel: 'Check-In',
            date: _checkInDate,
            time: _checkInTime,
            icon: Icons.login_rounded,
            canDecrease: _canDecreaseCheckIn,
            onTap: _pickCheckInDate,
            onTimeTap: _pickCheckInTime,
            onDecrease: _decreaseCheckInDate,
            onIncrease: _increaseCheckInDate,
          ),

          const SizedBox(height: 12),

          // 2. TO DATE INPUT FIELD
          _buildDateInputField(
            label: 'TO DATE',
            subLabel: 'Check-Out',
            date: _checkOutDate,
            time: _checkOutTime,
            icon: Icons.logout_rounded,
            canDecrease: _canDecreaseCheckOut,
            onTap: _pickCheckOutDate,
            onTimeTap: _pickCheckOutTime,
            onDecrease: _decreaseCheckOutDate,
            onIncrease: _increaseCheckOutDate,
          ),

          const SizedBox(height: 14),

          // 3. LIVE DATE-BASED AVAILABILITY STATUS BANNER
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: _stayStatusColor.withAlpha(22),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _stayStatusColor.withAlpha(90), width: 1.2),
            ),
            child: Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: _stayStatusColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Status for Dates: ',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: navy.withAlpha(180),
                            ),
                          ),
                          Text(
                            _stayStatusText,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: _stayStatusColor,
                              letterSpacing: 0.4,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _stayStatusDescription,
                        style: TextStyle(
                          fontSize: 10.5,
                          color: _isStayAvailable ? const Color(0xFF065F46) : _stayStatusColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateInputField({
    required String label,
    required String subLabel,
    required DateTime? date,
    required TimeOfDay time,
    required IconData icon,
    required bool canDecrease,
    required VoidCallback onTap,
    required VoidCallback onTimeTap,
    required VoidCallback onDecrease,
    required VoidCallback onIncrease,
  }) {
    final bool isSelected = date != null;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? cardBorder : gold.withAlpha(150),
            width: isSelected ? 1.2 : 1.4,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(6),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top row: Label + Calendar Action Icon
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(icon, size: 14, color: purple),
                    const SizedBox(width: 5),
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF475569),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: isSelected ? purpleBg : goldBg,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        isSelected ? subLabel : 'Required',
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: FontWeight.w700,
                          color: isSelected ? purple : const Color(0xFFB45309),
                        ),
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(
                    color: isSelected ? purpleBg : goldBg,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.calendar_today_rounded,
                    size: 13,
                    color: isSelected ? purple : const Color(0xFFB45309),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Formatted Date Value or Placeholder
            date != null
                ? Text(
                    DateFormat('EEE, dd MMM yyyy').format(date),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: navy,
                      letterSpacing: -0.2,
                    ),
                  )
                : const Row(
                    children: [
                      Text(
                        'Tap to select date',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                      SizedBox(width: 6),
                      Icon(
                        Icons.touch_app_rounded,
                        size: 15,
                        color: Color(0xFFD97706),
                      ),
                    ],
                  ),
            const SizedBox(height: 8),

            // Bottom Sub-Row: Time selector button + day adjustment steppers
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                InkWell(
                  onTap: onTimeTap,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.access_time_rounded, size: 12, color: purple),
                        const SizedBox(width: 4),
                        Text(
                          'Time: ${_formatTimeOfDay(time)}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: navy,
                          ),
                        ),
                        const SizedBox(width: 2),
                        const Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: muted),
                      ],
                    ),
                  ),
                ),

                // Mini Stepper Buttons (- / +)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildMiniStepperButton(
                      label: '−',
                      enabled: canDecrease,
                      onTap: onDecrease,
                    ),
                    const SizedBox(width: 6),
                    _buildMiniStepperButton(
                      label: '+',
                      enabled: true,
                      onTap: onIncrease,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMiniStepperButton({
    required String label,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: enabled ? white : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: enabled ? gold : cardBorder),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: enabled ? navy : muted,
          ),
        ),
      ),
    );
  }

  // 4. Room Core Specs Grid
  Widget _buildRoomSpecsGrid(RoomModel room) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _buildSpecBox(Icons.bed_rounded, 'Bed Type', room.bedType)),
              Container(width: 1, height: 40, color: cardBorder),
              Expanded(child: _buildSpecBox(Icons.people_alt_rounded, 'Configured Capacity', '$_adultsCount Adults${_childrenCount > 0 ? ", $_childrenCount Kids" : ""}')),
            ],
          ),
          const Divider(height: 20, color: cardBorder),
          Row(
            children: [
              Expanded(child: _buildSpecBox(Icons.layers_rounded, 'Floor Level', room.floor)),
              Container(width: 1, height: 40, color: cardBorder),
              Expanded(child: _buildSpecBox(Icons.meeting_room_rounded, 'Room Number', 'Room ${room.roomNumber}')),
            ],
          ),
        ],
      ),
    );
  }

  // 5. Amenities Section
  Widget _buildAmenitiesSection(RoomModel room) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      child: room.amenities.isEmpty
          ? const Text('All standard luxury hotel amenities included.', style: TextStyle(color: muted, fontSize: 13))
          : Wrap(
              spacing: 10,
              runSpacing: 10,
              children: room.amenities.map((amenity) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(_getAmenityIcon(amenity), size: 16, color: purple),
                      const SizedBox(width: 8),
                      Text(
                        amenity,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: navy,
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
    );
  }

  // 6. Pricing & Taxes Breakdown
  Widget _buildPriceBreakdownCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        children: [
          _buildPriceRow(
            'Room Rate ($_nightsCount ${_nightsCount == 1 ? "Night" : "Nights"} × $_roomsCount Room • $_selectedAcVariant)',
            '₹${_basePrice.toStringAsFixed(0)}',
          ),
          if (_extraGuestTariffPerNight > 0) ...[
            const SizedBox(height: 8),
            _buildPriceRow(
              'Extra Guest / Child Tariff',
              '₹${(_extraGuestTariffPerNight * _nightsCount * _roomsCount).toStringAsFixed(0)}',
            ),
          ],
          const SizedBox(height: 8),
          _buildPriceRow(
            'GST & Service Tax (18%)',
            '₹${_gstTax.toStringAsFixed(0)}',
          ),
          const Divider(height: 20, color: cardBorder),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Final Total (incl. GST)',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: navy,
                ),
              ),
              Text(
                '₹${_totalPayable.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: purple,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 7. Policy & Cancellation Card
  Widget _buildPolicyCard(RoomModel room) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: emeraldBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: emerald.withAlpha(60)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.verified_user_rounded, color: emerald, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Cancellation & Stay Guarantee',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF065F46),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  room.cancellationPolicy ?? 'Free cancellation up to 24 hours prior to check-in. Instant digital confirmation upon booking.',
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: Color(0xFF065F46),
                    fontWeight: FontWeight.w500,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageCarousel(RoomModel room) {
    if (room.images.isEmpty) {
      return _buildFallbackImage(room);
    }

    return PageView.builder(
      controller: _pageController,
      itemCount: room.images.length,
      onPageChanged: (index) => setState(() => _activeImageIndex = index),
      itemBuilder: (context, index) {
        final imgUrl = ApiEndpoints.resolveImageUrl(room.images[index]);
        if (imgUrl.startsWith('data:image')) {
          try {
            return Image.memory(
              base64Decode(imgUrl.split(',').last),
              fit: BoxFit.cover,
            );
          } catch (_) {}
        } else if (imgUrl.startsWith('http')) {
          return Image.network(
            imgUrl,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => _buildFallbackImage(room),
          );
        }
        return _buildFallbackImage(room);
      },
    );
  }

  Widget _buildFallbackImage(RoomModel room) {
    return Container(
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
            Icon(Icons.hotel_rounded, size: 50, color: gold.withAlpha(180)),
            const SizedBox(height: 8),
            Text(
              room.category,
              style: const TextStyle(color: cream, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpecBox(IconData icon, String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: purpleBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: purple),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 10.5, color: muted, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: navy),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF475569), fontWeight: FontWeight.w500)),
        Text(value, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: navy)),
      ],
    );
  }

  IconData _getAmenityIcon(String name) {
    final n = name.toLowerCase();
    if (n.contains('wifi') || n.contains('internet')) return Icons.wifi_rounded;
    if (n.contains('ac') || n.contains('air') || n.contains('condition')) return Icons.ac_unit_rounded;
    if (n.contains('tv') || n.contains('television')) return Icons.tv_rounded;
    if (n.contains('bath') || n.contains('tub')) return Icons.bathtub_rounded;
    if (n.contains('pool') || n.contains('swim')) return Icons.pool_rounded;
    if (n.contains('break') || n.contains('food') || n.contains('dining')) return Icons.restaurant_rounded;
    if (n.contains('park')) return Icons.local_parking_rounded;
    if (n.contains('gym') || n.contains('fitness')) return Icons.fitness_center_rounded;
    if (n.contains('balcony') || n.contains('view')) return Icons.balcony_rounded;
    if (n.contains('bar') || n.contains('mini')) return Icons.local_bar_rounded;
    if (n.contains('room service')) return Icons.room_service_rounded;
    if (n.contains('spa') || n.contains('jacuzzi')) return Icons.hot_tub_rounded;
    return Icons.check_circle_outline_rounded;
  }
}
