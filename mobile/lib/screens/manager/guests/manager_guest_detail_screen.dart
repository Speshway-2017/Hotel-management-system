import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/guest_model.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/manager/guest_provider.dart';
import 'package:hour_stay_mobile/providers/manager/reservation_provider.dart';
import 'package:hour_stay_mobile/screens/manager/reservations/manager_reservation_detail_screen.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';

class ManagerGuestDetailScreen extends StatefulWidget {
  final GuestModel guest;

  const ManagerGuestDetailScreen({super.key, required this.guest});

  @override
  State<ManagerGuestDetailScreen> createState() => _ManagerGuestDetailScreenState();
}

class _ManagerGuestDetailScreenState extends State<ManagerGuestDetailScreen> {
  // Hour Stay Theme Tokens
  static const Color navy = Color(0xFF0D1B2A);
  static const Color navyLight = Color(0xFF1B2A4A);
  static const Color purple = Color(0xFF5B21B6);
  static const Color purpleBg = Color(0xFFF3E8FF);
  static const Color gold = Color(0xFFF5C06A);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color white = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF8A8F98);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color emerald = Color(0xFF10B981);
  static const Color emeraldBg = Color(0xFFDCFCE7);
  static const Color ruby = Color(0xFFEF4444);
  static const Color amber = Color(0xFFD97706);
  static const Color amberBg = Color(0xFFFEF3C7);
  static const Color blue = Color(0xFF2563EB);
  static const Color blueBg = Color(0xFFDBEAFE);

  late GuestModel _guest;

  @override
  void initState() {
    super.initState();
    _guest = widget.guest;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshData();
    });
  }

  Future<void> _refreshData() async {
    if (!mounted) return;
    try {
      await Future.wait([
        context.read<GuestProvider>().fetchGuests(silent: true),
        context.read<ReservationProvider>().fetchReservations(silent: true),
      ]);
      if (mounted) {
        final updatedGuest = context.read<GuestProvider>().guests.where(
          (g) => g.id == _guest.id || (g.bookingId.isNotEmpty && g.bookingId == _guest.bookingId),
        ).firstOrNull;
        if (updatedGuest != null) {
          setState(() => _guest = updatedGuest);
        }
      }
    } catch (_) {
      // Handled silently
    }
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label copied to clipboard'),
        duration: const Duration(seconds: 2),
        backgroundColor: navy,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final resProvider = context.watch<ReservationProvider>();
    final allReservations = resProvider.reservations;

    // Match all reservations belonging to this guest
    final allGuestReservations = allReservations.where((r) {
      final matchesId = (r.id.isNotEmpty && (r.id == _guest.id || r.id == _guest.bookingId)) ||
          (r.bookingId.isNotEmpty && (r.bookingId == _guest.bookingId || r.bookingId == _guest.id));
      final matchesName = r.guest.trim().isNotEmpty &&
          r.guest.trim().toLowerCase() == _guest.name.trim().toLowerCase();
      final matchesPhone = _guest.phone.isNotEmpty &&
          _guest.phone != '--' &&
          r.phone.isNotEmpty &&
          r.phone == _guest.phone;
      final matchesEmail = _guest.email.isNotEmpty &&
          r.email.isNotEmpty &&
          r.email.trim().toLowerCase() == _guest.email.trim().toLowerCase();
      return matchesId || matchesName || matchesPhone || matchesEmail;
    }).toList();

    // Sort by check-in descending
    allGuestReservations.sort((a, b) {
      try {
        final dtA = DateTime.parse(a.checkIn);
        final dtB = DateTime.parse(b.checkIn);
        return dtB.compareTo(dtA);
      } catch (_) {
        return 0;
      }
    });

    // Determine current / primary reservation
    ReservationModel currentReservation;
    final matchedByBookingId = allGuestReservations.where(
      (r) => r.id == _guest.bookingId || r.bookingId == _guest.bookingId,
    ).firstOrNull;

    if (matchedByBookingId != null) {
      currentReservation = matchedByBookingId;
    } else if (allGuestReservations.isNotEmpty) {
      currentReservation = allGuestReservations.first;
    } else {
      currentReservation = ReservationModel(
        id: _guest.id,
        bookingId: _guest.bookingId,
        guest: _guest.name,
        phone: _guest.phone,
        email: _guest.email,
        room: _guest.room,
        roomNumber: _guest.room,
        checkIn: _guest.checkIn,
        checkOut: _guest.checkOut,
        status: _guest.status,
        paymentStatus: _guest.paymentStatus,
      );
    }

    // Previous / before bookings (all reservations excluding the current one)
    final pastBookings = allGuestReservations.where((r) {
      final isCurrent = (r.id.isNotEmpty && (r.id == currentReservation.id || r.id == currentReservation.bookingId)) ||
          (r.bookingId.isNotEmpty && (r.bookingId == currentReservation.bookingId || r.bookingId == currentReservation.id));
      return !isCurrent;
    }).toList();

    // Lifetime Stats
    final totalStays = allGuestReservations.isEmpty ? 1 : allGuestReservations.length;
    final totalSpend = allGuestReservations.isEmpty
        ? currentReservation.amount
        : allGuestReservations.fold<double>(0.0, (sum, r) => sum + r.amount);
    final totalBalance = allGuestReservations.isEmpty
        ? currentReservation.balance
        : allGuestReservations.fold<double>(0.0, (sum, r) => sum + r.balance);

    return Scaffold(
      backgroundColor: background,
      appBar: _buildAppBar(context),
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: _refreshData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Guest Profile Header
              _buildGuestProfileCard(
                totalStays: totalStays,
                totalSpend: totalSpend,
                totalBalance: totalBalance,
              ),
              const SizedBox(height: 14),

              // 2. Current / Active Stay Card
              _buildCurrentStayCard(currentReservation),
              const SizedBox(height: 16),

              // 3. Before / Previous Booking Details
              _buildPreviousBookingsSection(pastBookings),
              const SizedBox(height: 16),

              // 4. Guest Contact & Metadata Card
              _buildContactMetadataCard(currentReservation),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  // --- App Bar ---
  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: navy,
      elevation: 0,
      scrolledUnderElevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
        onPressed: () => Navigator.of(context).maybePop(),
      ),
      title: Text(
        _guest.name.isNotEmpty ? _guest.name : 'Guest Profile',
        style: const TextStyle(
          color: white,
          fontWeight: FontWeight.w800,
          fontSize: 16,
          letterSpacing: -0.2,
        ),
      ),
    );
  }

  // --- 1. Guest Profile Card ---
  Widget _buildGuestProfileCard({
    required int totalStays,
    required double totalSpend,
    required double totalBalance,
  }) {
    final initials = _guest.name.isNotEmpty
        ? _guest.name.trim().split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase()
        : 'G';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Avatar + Name + Status
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Avatar with gradient border
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [navyLight, navy],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(color: gold, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: navy.withAlpha(25),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: gold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),

              // Name + Subtitle + Badge
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _guest.name.isNotEmpty ? _guest.name : 'Guest',
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: navy,
                        letterSpacing: -0.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: purpleBg,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: purple.withAlpha(80)),
                          ),
                          child: Text(
                            totalStays > 1 ? 'Loyal Guest ($totalStays Stays)' : 'First-time Guest',
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: purple,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(status: _guest.status, fontSize: 10.5),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(height: 1, color: cardBorder),
          const SizedBox(height: 14),

          // Lifetime Stats Row (3 Mini Cards)
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  label: 'Total Stays',
                  value: '$totalStays',
                  subtitle: totalStays == 1 ? 'Stay' : 'Stays',
                  icon: Icons.hotel_rounded,
                  color: navy,
                  bgColor: cream,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'Total Spend',
                  value: Formatters.currency(totalSpend),
                  subtitle: 'Lifetime',
                  icon: Icons.account_balance_wallet_rounded,
                  color: emerald,
                  bgColor: emeraldBg,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'Outstanding',
                  value: Formatters.currency(totalBalance),
                  subtitle: totalBalance > 0 ? 'Due' : 'Cleared',
                  icon: Icons.receipt_long_rounded,
                  color: totalBalance > 0 ? amber : blue,
                  bgColor: totalBalance > 0 ? amberBg : blueBg,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile({
    required String label,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 8),
      decoration: BoxDecoration(
        color: bgColor.withAlpha(120),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withAlpha(60),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(4),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(3.5),
                decoration: BoxDecoration(
                  color: white,
                  borderRadius: BorderRadius.circular(6),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(10),
                      blurRadius: 2,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Icon(icon, size: 11, color: color),
              ),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 8.5,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: color == navy ? navy : color,
                letterSpacing: -0.3,
                height: 1.0,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              color: Color(0xFF334155),
            ),
          ),
        ],
      ),
    );
  }

  // --- 2. Current / Active Stay Card ---
  Widget _buildCurrentStayCard(ReservationModel reservation) {
    final isPaid = reservation.paymentStatus.toLowerCase() == 'paid' ||
        reservation.paymentStatus.toLowerCase() == 'settled';
    final hasRoom = (reservation.roomNumber.isNotEmpty && reservation.roomNumber != '--') ||
        (reservation.room.isNotEmpty && reservation.room != '--');
    final roomDisplay = reservation.roomNumber.isNotEmpty ? reservation.roomNumber : reservation.room;

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(6),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Card Header with Section Title & Booking ID
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
              border: Border(bottom: BorderSide(color: cardBorder)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: navy,
                        borderRadius: BorderRadius.circular(7),
                      ),
                      child: const Icon(Icons.key_rounded, size: 14, color: gold),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Current / Active Stay',
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: navy,
                      ),
                    ),
                  ],
                ),
                InkWell(
                  onTap: () => _copyToClipboard(
                    reservation.bookingId.isNotEmpty ? reservation.bookingId : reservation.id,
                    'Booking ID',
                  ),
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: purpleBg,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: purple.withAlpha(80)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '#${reservation.bookingId.isNotEmpty ? reservation.bookingId : reservation.id}',
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w700,
                            color: purple,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.copy_rounded, size: 11, color: purple),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Main Card Body
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Room & Stay Type Banner
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: cream,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: gold.withAlpha(140)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(9),
                        decoration: BoxDecoration(
                          color: navy,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.meeting_room_rounded, color: gold, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              hasRoom ? 'Room $roomDisplay' : 'Room Unassigned',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: navy,
                                letterSpacing: -0.2,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${reservation.roomType} • Stay: ${Formatters.capitalize(reservation.stayType)}${reservation.stayType == "hourly" && reservation.hours != null ? " (${reservation.hours} Hours)" : ""}',
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                      StatusBadge(status: reservation.status),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // Schedule Breakdown Grid
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Column(
                    children: [
                      _buildScheduleRow(
                        icon: Icons.login_rounded,
                        iconColor: emerald,
                        title: 'Check-In Schedule',
                        value: Formatters.dateTime(reservation.checkIn),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Divider(height: 1, color: cardBorder),
                      ),
                      _buildScheduleRow(
                        icon: Icons.logout_rounded,
                        iconColor: amber,
                        title: 'Check-Out Schedule',
                        value: Formatters.dateTime(reservation.checkOut),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // Financial Breakdown
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Column(
                    children: [
                      _buildInfoRow('Total Tariff', Formatters.currency(reservation.amount), isBold: true),
                      const SizedBox(height: 6),
                      _buildInfoRow(
                        'Outstanding Balance',
                        Formatters.currency(reservation.balance),
                        valueColor: reservation.balance > 0 ? ruby : emerald,
                        isBold: true,
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Payment Status',
                            style: TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: isPaid ? emeraldBg : (reservation.balance > 0 ? amberBg : blueBg),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: isPaid ? emerald : (reservation.balance > 0 ? amber : blue),
                                width: 0.8,
                              ),
                            ),
                            child: Text(
                              reservation.paymentStatus.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: isPaid ? emerald : (reservation.balance > 0 ? amber : blue),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (reservation.paymentMethod.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        _buildInfoRow('Payment Method', reservation.paymentMethod),
                      ],
                      if (reservation.source.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        _buildInfoRow('Booking Source', reservation.source),
                      ],
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // ID Verification Status Card
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: reservation.idVerification == 'Verified' ? emeraldBg.withAlpha(120) : amberBg.withAlpha(120),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: reservation.idVerification == 'Verified' ? emerald.withAlpha(80) : amber.withAlpha(80),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        reservation.idVerification == 'Verified' ? Icons.verified_user_rounded : Icons.shield_outlined,
                        size: 18,
                        color: reservation.idVerification == 'Verified' ? emerald : amber,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              reservation.idVerification == 'Verified'
                                  ? 'ID Proof Verified (${reservation.idDocType})'
                                  : 'ID Proof Pending Verification',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: reservation.idVerification == 'Verified' ? emerald : amber,
                              ),
                            ),
                            if (reservation.idDocNumber.isNotEmpty)
                              Text(
                                'Doc No: ${reservation.idDocNumber}',
                                style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // Action Button to Open Full Reservation Folio
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.receipt_long_rounded, size: 16),
                    label: const Text(
                      'Manage Stay & Billing Folio',
                      style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: navy,
                      foregroundColor: white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ManagerReservationDetailScreen(
                            reservation: reservation,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleRow({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String value,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: iconColor.withAlpha(25),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Icon(icon, size: 14, color: iconColor),
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 1),
            Text(
              value,
              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: navy),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value, {bool isBold = false, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
            color: valueColor ?? navy,
          ),
        ),
      ],
    );
  }

  // --- 3. Previous / Before Bookings History ---
  Widget _buildPreviousBookingsSection(List<ReservationModel> pastBookings) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.history_rounded, size: 18, color: navy),
                const SizedBox(width: 6),
                const Text(
                  'Past Bookings & Stay History',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: navy,
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: navy.withAlpha(15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${pastBookings.length}',
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: navy),
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 10),

        if (pastBookings.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: cardBorder),
            ),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: cream,
                    shape: BoxShape.circle,
                    border: Border.all(color: gold.withAlpha(100)),
                  ),
                  child: const Icon(Icons.star_rounded, color: gold, size: 24),
                ),
                const SizedBox(height: 8),
                const Text(
                  'No Prior Bookings Recorded',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: navy),
                ),
                const SizedBox(height: 2),
                const Text(
                  'This is the guest\'s first registered stay in the system. Future stays will archive here automatically.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: muted),
                ),
              ],
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: pastBookings.length,
            itemBuilder: (context, index) {
              final past = pastBookings[index];
              return _buildPastBookingCard(past);
            },
          ),
      ],
    );
  }

  Widget _buildPastBookingCard(ReservationModel past) {
    final roomDisplay = past.roomNumber.isNotEmpty ? past.roomNumber : past.room;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(3),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => ManagerReservationDetailScreen(reservation: past),
              ),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Booking ID + Room + Status
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(
                          '#${past.bookingId.length > 8 ? past.bookingId.substring(past.bookingId.length - 6).toUpperCase() : past.bookingId.toUpperCase()}',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w700,
                            color: purple,
                          ),
                        ),
                        if (roomDisplay.isNotEmpty && roomDisplay != '--') ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: cream,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: gold.withAlpha(100)),
                            ),
                            child: Text(
                              'Rm $roomDisplay',
                              style: const TextStyle(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: navy,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    StatusBadge(status: past.status, fontSize: 9.5),
                  ],
                ),

                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 6),
                  child: Divider(height: 1, color: cardBorder),
                ),

                // Stay Dates & Amount
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.date_range_rounded, size: 12, color: muted),
                        const SizedBox(width: 4),
                        Text(
                          '${Formatters.date(past.checkIn)} → ${Formatters.date(past.checkOut)}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      Formatters.currency(past.amount),
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: navy,
                      ),
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

  // --- 4. Guest Contact & Metadata Card ---
  Widget _buildContactMetadataCard(ReservationModel reservation) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Guest Contact & Communication',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: navy,
            ),
          ),
          const SizedBox(height: 10),

          // Phone
          if (_guest.phone.isNotEmpty && _guest.phone != '--')
            _buildContactRow(
              icon: Icons.phone_rounded,
              label: 'Phone Number',
              value: _guest.phone,
              actionIcon: Icons.copy_rounded,
              onAction: () => _copyToClipboard(_guest.phone, 'Phone number'),
            ),

          if (_guest.email.isNotEmpty) ...[
            const SizedBox(height: 8),
            _buildContactRow(
              icon: Icons.email_rounded,
              label: 'Email Address',
              value: _guest.email,
              actionIcon: Icons.copy_rounded,
              onAction: () => _copyToClipboard(_guest.email, 'Email address'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildContactRow({
    required IconData icon,
    required String label,
    required String value,
    required IconData actionIcon,
    required VoidCallback onAction,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: cardBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: white,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: cardBorder),
            ),
            child: Icon(icon, size: 14, color: navy),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
                Text(
                  value,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: navy),
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(actionIcon, size: 16, color: purple),
            tooltip: 'Copy',
            onPressed: onAction,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }
}
