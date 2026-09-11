import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/models/room_model.dart';
import 'package:hour_stay_mobile/providers/manager/room_provider.dart';
import 'package:hour_stay_mobile/screens/manager/reservations/manager_create_reservation_screen.dart';
import 'package:hour_stay_mobile/screens/manager/reservations/manager_reservation_detail_screen.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import '../../../core/utils/formatters.dart';

class ManagerRoomDetailDialog extends StatefulWidget {
  final RoomModel room;
  final ReservationModel? activeReservation;

  const ManagerRoomDetailDialog({
    super.key,
    required this.room,
    this.activeReservation,
  });

  static Future<void> show(
    BuildContext context,
    RoomModel room, {
    ReservationModel? activeReservation,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ManagerRoomDetailDialog(
        room: room,
        activeReservation: activeReservation,
      ),
    );
  }

  @override
  State<ManagerRoomDetailDialog> createState() => _ManagerRoomDetailDialogState();
}

class _ManagerRoomDetailDialogState extends State<ManagerRoomDetailDialog> {
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
  static const Color ruby = Color(0xFFEF4444);

  late String _currentStatus;
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.room.status;
  }

  Future<void> _updateStatus(String newStatus) async {
    if (_currentStatus.toLowerCase() == newStatus.toLowerCase()) return;

    setState(() => _isUpdating = true);
    final roomProvider = context.read<RoomProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    final success = await roomProvider.updateStatus(widget.room.roomNumber, newStatus);
    setState(() => _isUpdating = false);

    if (success && mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: white, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Room ${widget.room.roomNumber} status updated to $newStatus',
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
      navigator.pop();
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(roomProvider.errorMessage ?? 'Failed to update room status.'),
          backgroundColor: ruby,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final room = widget.room;
    final activeRes = widget.activeReservation;
    final inHouse = activeRes != null;
    final isAvailable = _currentStatus.toLowerCase() == 'available';

    return Container(
      decoration: const BoxDecoration(
        color: white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag handle
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: cardBorder,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),

            // Header banner
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [navy, Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: gold.withAlpha(100), width: 1.2),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: gold.withAlpha(40),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: gold.withAlpha(100)),
                        ),
                        child: const Icon(Icons.meeting_room_rounded, color: gold, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Room ${room.roomNumber}',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: white,
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${room.category} • ${room.floor}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFFE2E8F0),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  StatusBadge(status: _currentStatus, fontSize: 11),
                ],
              ),
            ),

            // If Room is Available: Show Assign Guest Action Card
            if (isAvailable && !inHouse) ...[
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: emerald.withAlpha(80)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: emerald.withAlpha(30),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.person_add_alt_1_rounded, color: emerald, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Room is Vacant & Ready',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF065F46),
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Assign a walk-in or advance booking to this room',
                            style: TextStyle(fontSize: 11, color: Color(0xFF047857)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(context).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => ManagerCreateReservationScreen(
                              preselectedRoomNumber: room.roomNumber,
                              preselectedCategory: room.category,
                            ),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: emerald,
                        foregroundColor: white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.add_rounded, size: 16),
                      label: const Text(
                        'Assign',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // If Room has Active Guest / In-House Stay: Show Guest Details Card with "View Guest Details" button
            if (inHouse) ...[
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: cream,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: gold.withAlpha(140)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.person_pin_rounded, size: 16, color: navy),
                            SizedBox(width: 6),
                            Text(
                              'CURRENT IN-HOUSE GUEST',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: navy,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: navy,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '#${activeRes.reservationNumber}',
                            style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: gold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      activeRes.guestName,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: navy),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Check-In: ${Formatters.checkInDateTime(activeRes.checkIn)} • Status: ${activeRes.status}',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF475569), fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pop();
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => ManagerReservationDetailScreen(reservation: activeRes),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: navy,
                          foregroundColor: white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: const BorderSide(color: gold, width: 1),
                          ),
                        ),
                        icon: const Icon(Icons.badge_rounded, size: 16, color: gold),
                        label: const Text(
                          'View Guest Details',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Room Specification Details
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'ROOM CONFIGURATION & SPECS',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: muted, letterSpacing: 0.6),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildSpecItem(Icons.bed_rounded, 'Bed Type', room.bedType),
                        _buildSpecItem(Icons.group_rounded, 'Capacity', room.capacity),
                        _buildSpecItem(Icons.payments_rounded, 'Standard Tariff', '₹${room.basePrice.toInt()}/n'),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Operational Status Options (Available, Occupied, Reserved)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'UPDATE OPERATIONAL STATUS',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: muted, letterSpacing: 0.6),
                      ),
                      Text(
                        'Instant Sync to MongoDB',
                        style: TextStyle(fontSize: 10, color: emerald, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (_isUpdating)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(20),
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: navy),
                      ),
                    )
                  else
                    Column(
                      children: [
                        _buildStatusOption('Available', 'Clean, inspected & vacant', emerald, Icons.check_circle_rounded),
                        const SizedBox(height: 6),
                        _buildStatusOption('Occupied', 'Guest currently in-house staying', navy, Icons.hotel_rounded),
                        const SizedBox(height: 6),
                        _buildStatusOption('Reserved', 'Pre-allocated for incoming reservation', blue, Icons.bookmark_added_rounded),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpecItem(IconData icon, String label, String value) {
    return Column(
      children: [
        Icon(icon, size: 18, color: navy),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 9.5, color: muted, fontWeight: FontWeight.w600)),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: navy),
        ),
      ],
    );
  }

  Widget _buildStatusOption(String status, String subtitle, Color color, IconData icon) {
    final isSelected = _currentStatus.toLowerCase() == status.toLowerCase();

    return InkWell(
      onTap: () => _updateStatus(status),
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: isSelected ? color.withAlpha(20) : background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? color : cardBorder,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: isSelected ? color : white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: isSelected ? color : cardBorder),
              ),
              child: Icon(
                icon,
                size: 16,
                color: isSelected ? white : color,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    status,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: isSelected ? color : navy,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 10,
                      color: isSelected ? navy : muted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(Icons.check_rounded, size: 18, color: color)
            else
              const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: muted),
          ],
        ),
      ),
    );
  }
}
