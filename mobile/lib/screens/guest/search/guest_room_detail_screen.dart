import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:hour_stay_mobile/colours.dart';
import 'package:hour_stay_mobile/core/constants/api_endpoints.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
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

    if (widget.room.bookedRanges.isNotEmpty) {
      for (final range in widget.room.bookedRanges) {
        final rIn = Formatters.parseDateSafe(range.checkIn);
        final rOut = Formatters.parseDateSafe(range.checkOut);
        if (rIn != null && rOut != null) {
          final rInDate = DateTime(rIn.year, rIn.month, rIn.day);
          final rOutDate = DateTime(rOut.year, rOut.month, rOut.day);
          final overlaps = selIn.isBefore(rOutDate) && selOut.isAfter(rInDate);
          if (overlaps) {
            final st = range.status.toLowerCase();
            if (st.contains('occup') || st.contains('stay') || st.contains('checked-in') || st.contains('checked in') || st.contains('in-house') || st.contains('active')) {
              return true;
            }
          }
        }
      }
    }

    if (widget.room.checkIn != null && widget.room.checkOut != null && widget.room.checkIn!.isNotEmpty && widget.room.checkOut!.isNotEmpty) {
      final rIn = Formatters.parseDateSafe(widget.room.checkIn);
      final rOut = Formatters.parseDateSafe(widget.room.checkOut);
      if (rIn != null && rOut != null) {
        final rInDate = DateTime(rIn.year, rIn.month, rIn.day);
        final rOutDate = DateTime(rOut.year, rOut.month, rOut.day);
        // Overlap exists only if: selIn < rOutDate AND selOut > rInDate
        // On check-out day, selIn == rOutDate is NOT an overlap!
        final overlaps = selIn.isBefore(rOutDate) && selOut.isAfter(rInDate);
        if (overlaps) {
          return widget.room.isOccupied;
        }
        return false;
      }
    }

    return false;
  }

  bool get _isStayReserved {
    if (!_hasSelectedDates) return false;
    if (_isStayOccupied) return false;
    final selIn = DateTime(_checkInDate!.year, _checkInDate!.month, _checkInDate!.day);
    final selOut = DateTime(_checkOutDate!.year, _checkOutDate!.month, _checkOutDate!.day);

    if (widget.room.bookedRanges.isNotEmpty) {
      for (final range in widget.room.bookedRanges) {
        final rIn = Formatters.parseDateSafe(range.checkIn);
        final rOut = Formatters.parseDateSafe(range.checkOut);
        if (rIn != null && rOut != null) {
          final rInDate = DateTime(rIn.year, rIn.month, rIn.day);
          final rOutDate = DateTime(rOut.year, rOut.month, rOut.day);
          final overlaps = selIn.isBefore(rOutDate) && selOut.isAfter(rInDate);
          if (overlaps) {
            final st = range.status.toLowerCase();
            if (!st.contains('cancel') && !st.contains('checked-out') && !st.contains('checked out')) {
              return true;
            }
          }
        }
      }
    }

    if (widget.room.checkIn != null && widget.room.checkOut != null && widget.room.checkIn!.isNotEmpty && widget.room.checkOut!.isNotEmpty) {
      final rIn = Formatters.parseDateSafe(widget.room.checkIn);
      final rOut = Formatters.parseDateSafe(widget.room.checkOut);
      if (rIn != null && rOut != null) {
        final rInDate = DateTime(rIn.year, rIn.month, rIn.day);
        final rOutDate = DateTime(rOut.year, rOut.month, rOut.day);
        final overlaps = selIn.isBefore(rOutDate) && selOut.isAfter(rInDate);
        if (overlaps) {
          return true;
        }
      }
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
          dialogTheme: DialogThemeData(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            elevation: 8,
          ),
        ),
        child: Center(
          child: Transform.scale(
            scale: 0.85,
            child: child!,
          ),
        ),
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
          dialogTheme: DialogThemeData(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            elevation: 8,
          ),
        ),
        child: Center(
          child: Transform.scale(
            scale: 0.85,
            child: child!,
          ),
        ),
      ),
    );
    if (picked != null) {
      setState(() {
        _checkOutDate = picked;
      });
    }
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
                  // 2. AMENITIES & FEATURES
                  // ==========================================
                  _buildSectionTitle('AMENITIES & IN-ROOM COMFORTS', Icons.spa_rounded),
                  const SizedBox(height: 10),
                  _buildAmenitiesSection(room),
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
                  // 5. DYNAMIC PRICE & TAX BREAKDOWN
                  // ==========================================
                  _buildSectionTitle('DYNAMIC PRICE & TAX BREAKDOWN', Icons.receipt_long_rounded),
                  const SizedBox(height: 10),
                  _buildPriceBreakdownCard(),
                  const SizedBox(height: 18),

                  // ==========================================
                  // 6. HOTEL POLICY & GUARANTEE
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
              final buttonLabel = (_isStayOccupied && _hasSelectedDates)
                  ? 'Dates Occupied'
                  : ((_isStayReserved && _hasSelectedDates)
                      ? 'Dates Reserved'
                      : 'Book Now');

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
                    : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: navy,
                  disabledBackgroundColor: const Color(0xFFCBD5E1),
                  foregroundColor: white,
                  disabledForegroundColor: const Color(0xFF64748B),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: isAvailable ? gold : Colors.transparent, width: 1.2),
                  ),
                ),
                icon: Icon(
                  isAvailable ? Icons.bolt_rounded : Icons.calendar_today_rounded,
                  color: isAvailable ? gold : const Color(0xFF94A3B8),
                  size: 18,
                ),
                label: Text(
                  buttonLabel,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: isAvailable ? white : const Color(0xFF64748B),
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
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  // 2. Side-by-Side Date & Time Input Fields Card (Check-in / Check-out)
  Widget _buildDateTimeAdjustmentCard() {
    return Container(
      padding: const EdgeInsets.all(14),
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
              const Expanded(
                child: Row(
                  children: [
                    Icon(Icons.date_range_rounded, size: 16, color: purple),
                    SizedBox(width: 6),
                    Flexible(
                      child: Text(
                        'Select Stay Dates',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: navy,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
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
                      _hasSelectedDates
                          ? '$_nightsCount ${_nightsCount == 1 ? "Night" : "Nights"}'
                          : 'Select Dates',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: purple,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Side-by-Side Check-in & Check-out Cards
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. CHECK-IN CARD
              Expanded(
                child: _buildCompactDateCard(
                  title: 'Check-In',
                  standardTiming: 'Check-in 12:00 PM',
                  date: _checkInDate,
                  icon: Icons.login_rounded,
                  showSteppers: _hasSelectedDates,
                  canDecrease: _canDecreaseCheckIn,
                  onDateTap: _pickCheckInDate,
                  onDecrease: _decreaseCheckInDate,
                  onIncrease: _increaseCheckInDate,
                ),
              ),
              const SizedBox(width: 10),

              // 2. CHECK-OUT CARD
              Expanded(
                child: _buildCompactDateCard(
                  title: 'Check-Out',
                  standardTiming: 'Check-out 11:00 AM',
                  date: _checkOutDate,
                  icon: Icons.logout_rounded,
                  showSteppers: _hasSelectedDates,
                  canDecrease: _canDecreaseCheckOut,
                  onDateTap: _pickCheckOutDate,
                  onDecrease: _decreaseCheckOutDate,
                  onIncrease: _increaseCheckOutDate,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // 3. LIVE DATE-BASED AVAILABILITY STATUS BANNER
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            decoration: BoxDecoration(
              color: _stayStatusColor.withAlpha(22),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _stayStatusColor.withAlpha(90), width: 1.2),
            ),
            child: Row(
              children: [
                Container(
                  width: 9,
                  height: 9,
                  decoration: BoxDecoration(
                    color: _stayStatusColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Status: ',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: navy.withAlpha(180),
                            ),
                          ),
                          Text(
                            _stayStatusText,
                            style: TextStyle(
                              fontSize: 11.5,
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
                          fontSize: 10,
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

  Widget _buildCompactDateCard({
    required String title,
    required String standardTiming,
    required DateTime? date,
    required IconData icon,
    required bool showSteppers,
    required bool canDecrease,
    required VoidCallback onDateTap,
    required VoidCallback onDecrease,
    required VoidCallback onIncrease,
  }) {
    final bool isSelected = date != null;

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isSelected ? purple.withAlpha(140) : cardBorder,
          width: isSelected ? 1.3 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isSelected ? purple.withAlpha(12) : Colors.black.withAlpha(4),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header: Icon + Title + Calendar Icon Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: isSelected ? purpleBg : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Icon(icon, size: 12, color: isSelected ? purple : muted),
                    ),
                    const SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        title,
                        style: const TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w900,
                          color: navy,
                          letterSpacing: 0.2,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              InkWell(
                onTap: onDateTap,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: isSelected ? purpleBg : goldBg,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.calendar_month_rounded,
                    size: 13,
                    color: isSelected ? purple : const Color(0xFFB45309),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 7),

          // 2. Date Display Box (Tappable for Date Picker)
          InkWell(
            onTap: onDateTap,
            borderRadius: BorderRadius.circular(9),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5.5),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFFF8FAFC) : goldBg.withAlpha(70),
                borderRadius: BorderRadius.circular(9),
                border: Border.all(
                  color: isSelected ? const Color(0xFFE2E8F0) : gold.withAlpha(120),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  isSelected
                      ? Text(
                          DateFormat('dd-MM-yyyy').format(date),
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: navy,
                            letterSpacing: -0.2,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        )
                      : const Row(
                          children: [
                            Text(
                              'dd-mm-yyyy',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                            SizedBox(width: 4),
                            Icon(Icons.touch_app_rounded, size: 11, color: Color(0xFFD97706)),
                          ],
                        ),
                  const SizedBox(height: 1.5),
                  Text(
                    isSelected ? DateFormat('EEEE').format(date) : 'Tap to select',
                    style: TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? purple : const Color(0xFFB45309),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 6),

          // 3. Standard Timing Row (Static, no time picker dropdown)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(7),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const Icon(Icons.schedule_rounded, size: 11, color: purple),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    standardTiming,
                    style: const TextStyle(
                      fontSize: 9.5,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF475569),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),

          // 4. Quick Stepper Controls (- / +) - Only visible when both dates are selected
          if (showSteppers) ...[
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildMiniStepperButton(
                  label: '−',
                  enabled: canDecrease,
                  onTap: onDecrease,
                ),
                const Expanded(
                  child: Center(
                    child: Text(
                      'Day',
                      style: TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                        color: muted,
                      ),
                    ),
                  ),
                ),
                _buildMiniStepperButton(
                  label: '+',
                  enabled: true,
                  onTap: onIncrease,
                ),
              ],
            ),
          ],
        ],
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

  // 3. Room Core Specs Grid
  Widget _buildRoomSpecsGrid(RoomModel room) {
    // Determine dynamic room status
    String statusDisplay;
    Color statusColor;
    Color statusBgColor;

    if (_hasSelectedDates) {
      if (_isStayOccupied) {
        statusDisplay = 'Occupied';
        statusColor = const Color(0xFFDC2626);
        statusBgColor = const Color(0xFFFEE2E2);
      } else if (_isStayReserved) {
        statusDisplay = 'Reserved';
        statusColor = const Color(0xFFD97706);
        statusBgColor = const Color(0xFFFEF3C7);
      } else {
        statusDisplay = 'Available';
        statusColor = const Color(0xFF059669);
        statusBgColor = const Color(0xFFD1FAE5);
      }
    } else {
      if (room.status.toLowerCase() == 'maintenance' || room.status.toLowerCase() == 'blocked') {
        statusDisplay = 'Maintenance';
        statusColor = const Color(0xFFDC2626);
        statusBgColor = const Color(0xFFFEE2E2);
      } else {
        statusDisplay = 'Available';
        statusColor = const Color(0xFF059669);
        statusBgColor = const Color(0xFFD1FAE5);
      }
    }

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
              Expanded(child: _buildSpecBox(Icons.bed_rounded, 'Bed Type', room.bedType.isNotEmpty ? room.bedType : 'King Bed')),
              Container(width: 1, height: 40, color: cardBorder),
              Expanded(child: _buildSpecBox(Icons.meeting_room_rounded, 'Room Number', 'Room ${room.roomNumber}')),
            ],
          ),
          const Divider(height: 20, color: cardBorder),
          Row(
            children: [
              Expanded(child: _buildSpecBox(Icons.layers_rounded, 'Floor Level', room.floor.isNotEmpty ? room.floor : '1st Floor')),
              Container(width: 1, height: 40, color: cardBorder),
              Expanded(
                child: _buildSpecBox(
                  Icons.verified_rounded,
                  'Room Status',
                  statusDisplay,
                  valueColor: statusColor,
                  iconColor: statusColor,
                  iconBgColor: statusBgColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 4. Amenities Section
  Widget _buildAmenitiesSection(RoomModel room) {
    final isAc = _selectedAcVariant == 'AC';

    // Base default amenities if room list is empty
    final baseAmenities = room.amenities.isNotEmpty
        ? room.amenities
        : [
            'Free High-Speed WiFi',
            'Smart HD TV',
            'Attached Private Bathroom',
            '24/7 Geyser & Hot Water',
            'Daily Housekeeping',
            'Complimentary Bottled Water',
          ];

    // Filter out generic AC / fan items from base to avoid duplicate insertion
    final commonAmenities = baseAmenities.where((a) {
      final l = a.toLowerCase();
      return !l.contains('ac') &&
          !l.contains('air condition') &&
          !l.contains('fan') &&
          !l.contains('ventilat') &&
          !l.contains('climate');
    }).toList();

    // Climate-specific amenities based on AC / Non-AC selection
    final List<String> climateAmenities = isAc
        ? [
            'Air Conditioning (Split AC)',
            'Remote Climate Control',
          ]
        : [
            'High-Speed Ceiling Fan',
            'Natural Airflow & Ventilation',
          ];

    final displayedAmenities = [...climateAmenities, ...commonAmenities];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Variant Difference Highlights Card
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isAc ? purpleBg : const Color(0xFFFFFBEB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isAc ? purple.withAlpha(80) : const Color(0xFFFDE68A),
                width: 1.2,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: isAc ? purple : const Color(0xFFD97706),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isAc ? Icons.ac_unit_rounded : Icons.air_rounded,
                    size: 16,
                    color: white,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isAc ? 'AC Climate Comfort Package' : 'Naturally Ventilated Room (Non-AC)',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: isAc ? navy : const Color(0xFF92400E),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isAc
                            ? 'Equipped with active air conditioning & digital temperature regulator for full cooling.'
                            : 'Naturally cooled with high-speed ceiling fan. Economy tariff (-15% tariff reduction). AC unit is disabled/excluded.',
                        style: TextStyle(
                          fontSize: 11,
                          color: isAc ? const Color(0xFF475569) : const Color(0xFFB45309),
                          fontWeight: FontWeight.w500,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Included Amenities Badges
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: displayedAmenities.map((amenity) {
              final isClimateFeature = climateAmenities.contains(amenity);
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                decoration: BoxDecoration(
                  color: isClimateFeature
                      ? (isAc ? purpleBg : const Color(0xFFFEF3C7))
                      : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isClimateFeature
                        ? (isAc ? purple.withAlpha(120) : const Color(0xFFF59E0B).withAlpha(120))
                        : cardBorder,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _getAmenityIcon(amenity),
                      size: 15,
                      color: isClimateFeature
                          ? (isAc ? purple : const Color(0xFFD97706))
                          : purple,
                    ),
                    const SizedBox(width: 7),
                    Text(
                      amenity,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isClimateFeature ? FontWeight.w800 : FontWeight.w600,
                        color: isClimateFeature
                            ? (isAc ? navy : const Color(0xFF78350F))
                            : navy,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),

          // Excluded feature note when in Non-AC mode
          if (!isAc) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.remove_circle_outline_rounded, size: 14, color: Color(0xFF94A3B8)),
                  SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Air Conditioning (AC) is excluded in this economy variant',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // 5. Pricing & Taxes Breakdown
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

  // 6. Policy & Cancellation Card
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

  Widget _buildSpecBox(
    IconData icon,
    String title,
    String value, {
    Color? valueColor,
    Color? iconColor,
    Color? iconBgColor,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconBgColor ?? purpleBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor ?? purple),
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
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    color: valueColor ?? navy,
                  ),
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
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 13, color: Color(0xFF475569), fontWeight: FontWeight.w500),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          value,
          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: navy),
        ),
      ],
    );
  }

  IconData _getAmenityIcon(String name) {
    final n = name.toLowerCase();
    if (n.contains('fan')) return Icons.air_rounded;
    if (n.contains('ventilat') || n.contains('window')) return Icons.window_rounded;
    if (n.contains('thermostat') || n.contains('climate') || n.contains('temperature')) return Icons.thermostat_rounded;
    if (n.contains('wifi') || n.contains('internet')) return Icons.wifi_rounded;
    if (n.contains('ac') || n.contains('air condition') || n.contains('air-condition')) return Icons.ac_unit_rounded;
    if (n.contains('tv') || n.contains('television')) return Icons.tv_rounded;
    if (n.contains('geyser') || n.contains('hot water')) return Icons.water_drop_rounded;
    if (n.contains('bath') || n.contains('tub')) return Icons.bathtub_rounded;
    if (n.contains('housekeeping') || n.contains('clean')) return Icons.cleaning_services_rounded;
    if (n.contains('desk') || n.contains('work')) return Icons.desk_rounded;
    if (n.contains('kettle') || n.contains('coffee') || n.contains('tea')) return Icons.coffee_rounded;
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
