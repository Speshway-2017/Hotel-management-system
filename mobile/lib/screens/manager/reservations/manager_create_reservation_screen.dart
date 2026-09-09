import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/models/room_model.dart';
import 'package:hour_stay_mobile/providers/manager/reservation_provider.dart';
import 'package:hour_stay_mobile/providers/manager/room_provider.dart';

class ManagerCreateReservationScreen extends StatefulWidget {
  final String? preselectedRoomNumber;
  final String? preselectedCategory;

  const ManagerCreateReservationScreen({
    super.key,
    this.preselectedRoomNumber,
    this.preselectedCategory,
  });

  @override
  State<ManagerCreateReservationScreen> createState() => _ManagerCreateReservationScreenState();
}

class _ManagerCreateReservationScreenState extends State<ManagerCreateReservationScreen> {
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
  static const Color ruby = Color(0xFFEF4444);

  final _formKey = GlobalKey<FormState>();

  // Guest Controllers (Clean with placeholders only, no hardcoded prefilled text)
  final _guestNameController = TextEditingController();
  final _guestPhoneController = TextEditingController();
  final _guestEmailController = TextEditingController();
  final _idDocNumberController = TextEditingController();
  final _corporateNameController = TextEditingController();
  final _notesController = TextEditingController();
  final _amountController = TextEditingController();
  final _balanceController = TextEditingController();

  // Form State
  String? _selectedSource = 'Walk-in';
  String? _selectedIdType = 'Aadhaar Card';
  String? _selectedPax = '2 Adults';
  String? _selectedCategory = 'Standard Room';
  String? _selectedRoomNumber;
  String? _selectedStatus = 'Checked-in'; // Auto checked-in for Walk-in today
  bool _isCorporate = false;
  bool _isGroupBooking = false;
  bool _isSaving = false;

  // Fixed Standard 24h Stay Timing (12:00 PM Check-In to 11:00 AM Check-Out)
  DateTime _checkInDate = DateTime.now();
  final TimeOfDay _checkInTime = const TimeOfDay(hour: 12, minute: 0); // 12:00 PM
  DateTime _checkOutDate = DateTime.now().add(const Duration(days: 1));
  final TimeOfDay _checkOutTime = const TimeOfDay(hour: 11, minute: 0); // 11:00 AM
  int _nights = 1;

  final List<String> _idProofTypes = [
    'Aadhaar Card',
    'Passport',
    'Driving License',
    'Voter ID',
    'PAN Card',
  ];

  final List<String> _paxOptions = [
    '1 Adult',
    '2 Adults',
    '2 Adults, 1 Child',
    '3 Adults',
    'Family (4 Guests)',
    'Group (6+ Guests)',
  ];

  final List<String> _sources = [
    'Walk-in',
    'Direct',
    'Corporate',
    'Group',
    'Booking.com',
    'MakeMyTrip',
    'Agoda',
    'Expedia',
  ];

  final List<Map<String, dynamic>> _roomCategories = [
    {'name': 'Standard Room', 'defaultRate': 3000},
    {'name': 'Deluxe Room', 'defaultRate': 4500},
    {'name': 'Executive Suite', 'defaultRate': 6500},
    {'name': 'Penthouse Suite', 'defaultRate': 5500},
  ];

  @override
  void initState() {
    super.initState();
    if (widget.preselectedRoomNumber != null && widget.preselectedRoomNumber!.isNotEmpty) {
      _selectedRoomNumber = widget.preselectedRoomNumber;
    }
    if (widget.preselectedCategory != null && widget.preselectedCategory!.isNotEmpty) {
      _selectedCategory = widget.preselectedCategory;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RoomProvider>().fetchAll();
    });
  }

  @override
  void dispose() {
    _guestNameController.dispose();
    _guestPhoneController.dispose();
    _guestEmailController.dispose();
    _idDocNumberController.dispose();
    _corporateNameController.dispose();
    _notesController.dispose();
    _amountController.dispose();
    _balanceController.dispose();
    super.dispose();
  }

  bool _isDateToday(DateTime dt) {
    final now = DateTime.now();
    return dt.year == now.year && dt.month == now.month && dt.day == now.day;
  }

  double get _calculatedTariff {
    final manual = double.tryParse(_amountController.text.trim());
    if (manual != null && manual > 0) return manual;

    double baseRate = 3000.0;
    final cat = _roomCategories.firstWhere(
      (c) => c['name'] == _selectedCategory,
      orElse: () => _roomCategories.first,
    );

    // Try finding dynamic rate from loaded rooms
    final roomProvider = context.read<RoomProvider>();
    final matchedRoom = roomProvider.rooms.where((r) => r.category == _selectedCategory).firstOrNull;
    if (matchedRoom != null && matchedRoom.basePrice > 0) {
      baseRate = matchedRoom.basePrice;
    } else {
      baseRate = (cat['defaultRate'] as num).toDouble();
    }

    return (_nights > 0 ? _nights : 1) * baseRate;
  }

  Future<void> _selectCheckInDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _checkInDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: navy,
              onPrimary: white,
              onSurface: navy,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _checkInDate = picked;
        if (_checkOutDate.isBefore(_checkInDate) || _checkOutDate.isAtSameMomentAs(_checkInDate)) {
          _checkOutDate = _checkInDate.add(Duration(days: _nights > 0 ? _nights : 1));
        } else {
          final diff = _checkOutDate.difference(_checkInDate).inDays;
          _nights = diff > 0 ? diff : 1;
        }
        if (_selectedSource == 'Walk-in') {
          _selectedStatus = _isDateToday(_checkInDate) ? 'Checked-in' : 'Confirmed';
        }
      });
    }
  }

  Future<void> _selectCheckOutDate() async {
    final initial = _checkOutDate.isAfter(_checkInDate) ? _checkOutDate : _checkInDate.add(const Duration(days: 1));
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: _checkInDate.add(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: navy,
              onPrimary: white,
              onSurface: navy,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _checkOutDate = picked;
        final diff = _checkOutDate.difference(_checkInDate).inDays;
        _nights = diff > 0 ? diff : 1;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill all mandatory fields (Guest Name, Phone, ID Proof).'),
          backgroundColor: ruby,
        ),
      );
      return;
    }

    final totalAmt = _amountController.text.trim().isNotEmpty
        ? (double.tryParse(_amountController.text.trim()) ?? _calculatedTariff)
        : _calculatedTariff;

    final balAmt = _balanceController.text.trim().isNotEmpty
        ? (double.tryParse(_balanceController.text.trim()) ?? 0.0)
        : 0.0;

    final isPaid = balAmt == 0;

    // Fixed Standard 24h Timing (12:00 PM Check-In to 11:00 AM Check-Out)
    final checkInDt = DateTime(
      _checkInDate.year,
      _checkInDate.month,
      _checkInDate.day,
      _checkInTime.hour,
      _checkInTime.minute,
    );

    final checkOutDt = DateTime(
      _checkOutDate.year,
      _checkOutDate.month,
      _checkOutDate.day,
      _checkOutTime.hour,
      _checkOutTime.minute,
    );

    final guestName = _guestNameController.text.trim();
    final phone = _guestPhoneController.text.trim();
    final email = _guestEmailController.text.trim().isNotEmpty
        ? _guestEmailController.text.trim()
        : '${guestName.toLowerCase().replaceAll(RegExp(r'\s+'), '.')}@gmail.com';

    final roomNum = _selectedRoomNumber ?? '';
    final roomCat = _selectedCategory ?? 'Standard Room';

    final payload = {
      'guest': guestName,
      'guestName': guestName,
      'phone': phone,
      'email': email,
      'idProofType': _selectedIdType ?? 'Aadhaar Card',
      'idProofNumber': _idDocNumberController.text.trim(),
      'idDocType': _selectedIdType ?? 'Aadhaar Card',
      'idDocNumber': _idDocNumberController.text.trim(),
      'idVerification': 'Verified',
      'stayType': 'overnight',
      'hours': 24 * _nights,
      'nights': _nights,
      'checkIn': checkInDt.toIso8601String(),
      'checkOut': checkOutDt.toIso8601String(),
      'pax': _selectedPax ?? '2 Adults',
      'source': _selectedSource ?? 'Walk-in',
      'roomType': roomCat,
      'roomNumber': roomNum,
      'room': roomNum.isNotEmpty ? '$roomNum · $roomCat' : roomCat,
      'amount': totalAmt,
      'totalAmount': totalAmt,
      'balance': balAmt,
      'status': _selectedStatus ?? 'Confirmed',
      'paymentStatus': isPaid ? 'Paid' : 'Pending',
      'isCorporate': _isCorporate,
      'corporateName': _isCorporate ? _corporateNameController.text.trim() : '',
      'isGroupBooking': _isGroupBooking,
      'notes': _notesController.text.trim(),
    };

    setState(() => _isSaving = true);

    try {
      final provider = context.read<ReservationProvider>();
      final success = await provider.createReservation(payload);

      if (!mounted) return;

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: white, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    _selectedStatus == 'Checked-in'
                        ? 'Walk-in guest checked in successfully to Room ${roomNum.isNotEmpty ? roomNum : "assigned"}!'
                        : 'Reservation created & confirmed successfully!',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            backgroundColor: emerald,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(provider.errorMessage ?? 'Failed to create reservation.'),
            backgroundColor: ruby,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.toString()}'),
            backgroundColor: ruby,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final roomProvider = context.watch<RoomProvider>();
    final availableRooms = roomProvider.rooms.where((r) => r.isAvailable).toList();

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: navy,
        foregroundColor: white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: white, size: 20),
          tooltip: 'Back to Reservations',
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'New Reservation',
              style: TextStyle(
                color: white,
                fontSize: 16,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.2,
              ),
            ),
            Text(
              _selectedSource == 'Walk-in' ? 'Walk-In Desk Registration' : 'Direct Booking Management',
              style: TextStyle(
                color: gold.withAlpha(220),
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: white, size: 20),
            tooltip: 'Reset Form',
            onPressed: () {
              setState(() {
                _guestNameController.clear();
                _guestPhoneController.clear();
                _guestEmailController.clear();
                _idDocNumberController.clear();
                _notesController.clear();
                _corporateNameController.clear();
                _amountController.clear();
                _balanceController.clear();
                _selectedRoomNumber = null;
                _isCorporate = false;
                _isGroupBooking = false;
              });
            },
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 120),
                children: [
                  // 1. Standard Stay Policy & Booking Source Banner
                  _buildStandardStayAndSourceBanner(),
                  const SizedBox(height: 14),

                  // 2. Guest Profile & Mandatory ID Proof
                  _buildGuestProfileSection(),
                  const SizedBox(height: 14),

                  // 3. Stay Itinerary & Room Allocation
                  _buildItineraryAndRoomSection(availableRooms),
                  const SizedBox(height: 14),

                  // 4. Tariff, Payment & Notes Section
                  _buildTariffAndBillingSection(),
                ],
              ),
            ),

            // Sticky Bottom Action Dock
            _buildBottomActionDock(),
          ],
        ),
      ),
    );
  }

  // --- 1. Standard 24h Stay Policy & Booking Source Banner ---
  Widget _buildStandardStayAndSourceBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(color: navy.withAlpha(5), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Standard 24-Hour Schedule Highlight (Responsive, Zero Overflow)
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [navy, Color(0xFF1E293B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: gold.withAlpha(120), width: 1.2),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: gold.withAlpha(35),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.access_time_filled_rounded, color: gold, size: 20),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              'STANDARD 24-HOUR STAY',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: gold,
                                letterSpacing: 0.4,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          SizedBox(width: 4),
                          Icon(Icons.verified_rounded, color: gold, size: 13),
                        ],
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Check-In: 12:00 PM • Check-Out: 11:00 AM',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: white,
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
          const SizedBox(height: 12),

          const Text(
            'BOOKING SOURCE / CHANNEL',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: muted, letterSpacing: 0.8),
          ),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            initialValue: _selectedSource,
            decoration: _inputDecoration(
              hint: 'Select Booking Source',
              prefixIcon: Icons.travel_explore_rounded,
            ),
            items: _sources.map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: navy)))).toList(),
            onChanged: (val) {
              if (val != null) {
                setState(() {
                  _selectedSource = val;
                  if (val == 'Walk-in') {
                    _selectedStatus = _isDateToday(_checkInDate) ? 'Checked-in' : 'Confirmed';
                  }
                });
              }
            },
          ),
        ],
      ),
    );
  }

  // --- 2. Guest Profile & ID Proof Section ---
  Widget _buildGuestProfileSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(color: navy.withAlpha(5), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: navy.withAlpha(15), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.badge_rounded, color: navy, size: 16),
              ),
              const SizedBox(width: 8),
              const Text(
                'GUEST & MANDATORY ID PROOF',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: navy, letterSpacing: 0.5),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Guest Full Name
          TextFormField(
            controller: _guestNameController,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: navy),
            decoration: _inputDecoration(
              label: 'Guest Full Name *',
              hint: 'e.g. Rahul Sharma',
              prefixIcon: Icons.person_rounded,
            ),
            validator: (v) => v == null || v.trim().isEmpty ? 'Guest full name is required' : null,
          ),
          const SizedBox(height: 10),

          // Contact Phone Number
          TextFormField(
            controller: _guestPhoneController,
            keyboardType: TextInputType.phone,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: navy),
            decoration: _inputDecoration(
              label: 'Contact Phone Number *',
              hint: 'e.g. +91 98765 43210',
              prefixIcon: Icons.phone_rounded,
            ),
            validator: (v) => v == null || v.trim().isEmpty ? 'Contact phone number is required' : null,
          ),
          const SizedBox(height: 10),

          // Email Address
          TextFormField(
            controller: _guestEmailController,
            keyboardType: TextInputType.emailAddress,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: navy),
            decoration: _inputDecoration(
              label: 'Email Address (Optional)',
              hint: 'e.g. guest@example.com',
              prefixIcon: Icons.email_rounded,
            ),
          ),
          const SizedBox(height: 10),

          // ID Proof Type & Number
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 5,
                child: DropdownButtonFormField<String>(
                  initialValue: _selectedIdType,
                  isExpanded: true,
                  decoration: _inputDecoration(
                    label: 'ID Type *',
                    hint: 'Select ID',
                    prefixIcon: Icons.verified_user_rounded,
                  ),
                  items: _idProofTypes
                      .map((t) => DropdownMenuItem(
                            value: t,
                            child: Text(
                              t,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: navy),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _selectedIdType = v ?? _selectedIdType),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 6,
                child: TextFormField(
                  controller: _idDocNumberController,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: navy),
                  decoration: _inputDecoration(
                    label: 'Document ID Number *',
                    hint: 'e.g. 1234 5678 9012',
                    prefixIcon: Icons.credit_card_rounded,
                  ),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Document number is required' : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Guest Capacity (Pax)
          DropdownButtonFormField<String>(
            initialValue: _selectedPax,
            isExpanded: true,
            decoration: _inputDecoration(
              label: 'Guest Capacity (Pax)',
              hint: 'Select Capacity',
              prefixIcon: Icons.group_rounded,
            ),
            items: _paxOptions
                .map((p) => DropdownMenuItem(
                      value: p,
                      child: Text(p, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: navy)),
                    ))
                .toList(),
            onChanged: (v) => setState(() => _selectedPax = v ?? _selectedPax),
          ),
        ],
      ),
    );
  }

  // --- 3. Stay Itinerary & Room Allocation ---
  Widget _buildItineraryAndRoomSection(List<RoomModel> availableRooms) {
    final dateFormat = DateFormat('EEE, dd MMM yyyy');

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(color: navy.withAlpha(5), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: purple.withAlpha(20), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.hotel_rounded, color: purple, size: 16),
              ),
              const SizedBox(width: 8),
              const Text(
                'STAY ITINERARY & ROOM ALLOCATION',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: navy, letterSpacing: 0.5),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Check-In Pickers (12:00 PM Fixed Standard Time)
          InkWell(
            onTap: _selectCheckInDate,
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: cardBorder),
              ),
              child: Row(
                children: [
                  const Icon(Icons.login_rounded, size: 18, color: emerald),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('CHECK-IN DATE', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: muted)),
                        Text(
                          dateFormat.format(_checkInDate),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: navy),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: navy,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      '12:00 PM',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: gold),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Check-Out Pickers (11:00 AM Fixed Standard Time)
          InkWell(
            onTap: _selectCheckOutDate,
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: cardBorder),
              ),
              child: Row(
                children: [
                  const Icon(Icons.logout_rounded, size: 18, color: ruby),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('CHECK-OUT DATE', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: muted)),
                        Text(
                          dateFormat.format(_checkOutDate),
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: navy),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: navy,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      '11:00 AM',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: gold),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Duration (Nights) summary strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: cream,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: gold.withAlpha(120)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Stay Duration:', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: navy)),
                Flexible(
                  child: Text(
                    '$_nights Night${_nights > 1 ? "s" : ""} (${24 * _nights}h)',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: navy),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Room Category Selection
          DropdownButtonFormField<String>(
            initialValue: _selectedCategory,
            isExpanded: true,
            decoration: _inputDecoration(
              label: 'Room Category Tier *',
              hint: 'Select Room Category',
              prefixIcon: Icons.meeting_room_rounded,
            ),
            items: _roomCategories
                .map((cat) => DropdownMenuItem(
                      value: cat['name'] as String,
                      child: Text(
                        '${cat['name']} (₹${cat['defaultRate']}/night)',
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: navy),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ))
                .toList(),
            onChanged: (val) {
              if (val != null) {
                setState(() => _selectedCategory = val);
              }
            },
          ),
          const SizedBox(height: 10),

          // Room Assignment Dropdown
          DropdownButtonFormField<String>(
            initialValue: _selectedRoomNumber,
            isExpanded: true,
            decoration: _inputDecoration(
              label: 'Assign Room Number (Optional)',
              hint: 'Select or Auto-allocate',
              prefixIcon: Icons.door_front_door_rounded,
            ),
            items: [
              const DropdownMenuItem(
                value: '',
                child: Text('Auto-allocate upon Check-in', style: TextStyle(fontSize: 12.5, color: muted)),
              ),
              ...availableRooms.map((rm) => DropdownMenuItem(
                    value: rm.roomNumber,
                    child: Text(
                      'Room ${rm.roomNumber} (${rm.category}) - ${rm.status}',
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: navy),
                      overflow: TextOverflow.ellipsis,
                    ),
                  )),
              if (availableRooms.isEmpty) ...[
                const DropdownMenuItem(value: '101', child: Text('Room 101 (Standard Room)')),
                const DropdownMenuItem(value: '102', child: Text('Room 102 (Standard Room)')),
                const DropdownMenuItem(value: '201', child: Text('Room 201 (Deluxe Room)')),
                const DropdownMenuItem(value: '301', child: Text('Room 301 (Executive Suite)')),
              ]
            ],
            onChanged: (val) => setState(() => _selectedRoomNumber = (val == null || val.isEmpty) ? null : val),
          ),
        ],
      ),
    );
  }

  // --- 4. Tariff, Billing & Notes Section ---
  Widget _buildTariffAndBillingSection() {
    final defaultTariff = _calculatedTariff.toInt();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(color: navy.withAlpha(5), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: emerald.withAlpha(20), borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.currency_rupee_rounded, color: emerald, size: 16),
              ),
              const SizedBox(width: 8),
              const Text(
                'TARIFF, PAYMENT & FRONT DESK NOTES',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: navy, letterSpacing: 0.5),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Total Tariff & Balance
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextFormField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: navy),
                  decoration: _inputDecoration(
                    label: 'Tariff (₹)',
                    hint: 'Auto: ₹$defaultTariff',
                    prefixIcon: Icons.payments_rounded,
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextFormField(
                  controller: _balanceController,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: ruby),
                  decoration: _inputDecoration(
                    label: 'Balance (₹)',
                    hint: '0 (Paid in Full)',
                    prefixIcon: Icons.account_balance_wallet_rounded,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Initial Status Dropdown
          DropdownButtonFormField<String>(
            initialValue: _selectedStatus,
            isExpanded: true,
            decoration: _inputDecoration(
              label: 'Initial Reservation Status',
              hint: 'Select Status',
              prefixIcon: Icons.flag_rounded,
            ),
            items: const [
              DropdownMenuItem(value: 'Confirmed', child: Text('Confirmed (Reserved)')),
              DropdownMenuItem(value: 'Checked-in', child: Text('Checked-in (Instant In-House)')),
              DropdownMenuItem(value: 'Pending', child: Text('Pending Verification')),
            ],
            onChanged: (val) => setState(() => _selectedStatus = val ?? _selectedStatus),
          ),
          const SizedBox(height: 10),

          // Corporate & Group Toggles
          Row(
            children: [
              Expanded(
                child: CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  title: const Text('Corporate Booking', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: navy)),
                  value: _isCorporate,
                  activeColor: purple,
                  onChanged: (v) => setState(() => _isCorporate = v ?? false),
                ),
              ),
              Expanded(
                child: CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  dense: true,
                  title: const Text('Group Booking', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: navy)),
                  value: _isGroupBooking,
                  activeColor: purple,
                  onChanged: (v) => setState(() => _isGroupBooking = v ?? false),
                ),
              ),
            ],
          ),

          if (_isCorporate) ...[
            TextFormField(
              controller: _corporateNameController,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: navy),
              decoration: _inputDecoration(
                label: 'Corporate Account Name',
                hint: 'e.g. Infosys Technologies',
                prefixIcon: Icons.business_rounded,
              ),
            ),
            const SizedBox(height: 10),
          ],

          // Notes / Special Requests
          TextFormField(
            controller: _notesController,
            maxLines: 2,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: navy),
            decoration: _inputDecoration(
              label: 'Special Requests / Notes',
              hint: 'e.g. Late arrival, airport transfer, quiet room requested...',
              prefixIcon: Icons.note_alt_rounded,
            ),
          ),
        ],
      ),
    );
  }

  // --- Sticky Bottom Action Dock (Zero Overflow) ---
  Widget _buildBottomActionDock() {
    final isWalkIn = _selectedSource == 'Walk-in';
    final tariffToDisplay = _amountController.text.trim().isNotEmpty
        ? (double.tryParse(_amountController.text.trim())?.toInt() ?? _calculatedTariff.toInt())
        : _calculatedTariff.toInt();

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
      decoration: BoxDecoration(
        color: white,
        border: const Border(top: BorderSide(color: cardBorder, width: 1)),
        boxShadow: [
          BoxShadow(color: navy.withAlpha(12), blurRadius: 10, offset: const Offset(0, -3)),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            // Left Price Summary
            Expanded(
              flex: 4,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'TOTAL ESTIMATE',
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: muted, letterSpacing: 0.5),
                  ),
                  Text(
                    '₹$tariffToDisplay',
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                      color: navy,
                      letterSpacing: -0.3,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    '$_nights Night${_nights > 1 ? "s" : ""} • 24h',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: purple),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Right Big Navy Action Button
            Expanded(
              flex: 6,
              child: SizedBox(
                height: 46,
                child: ElevatedButton(
                  onPressed: _isSaving ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navy,
                    foregroundColor: white,
                    elevation: 2,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: gold, width: 1.2),
                    ),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2.2, color: white),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              isWalkIn ? Icons.how_to_reg_rounded : Icons.check_circle_outline_rounded,
                              size: 16,
                              color: gold,
                            ),
                            const SizedBox(width: 5),
                            Flexible(
                              child: Text(
                                isWalkIn ? 'Complete Walk-In' : 'Confirm Booking',
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({
    String? label,
    String? hint,
    IconData? prefixIcon,
  }) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
      hintText: hint,
      hintStyle: const TextStyle(fontSize: 11.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.w400),
      prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 17, color: navy.withAlpha(190)) : null,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      filled: true,
      fillColor: background,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: cardBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: cardBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: navy, width: 1.4),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: ruby),
      ),
    );
  }
}
