import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../models/reservation_model.dart';
import '../../../providers/manager/payment_provider.dart';
import '../../../providers/manager/reservation_provider.dart';
import '../../../providers/manager/room_provider.dart';
import '../../../widgets/custom_button.dart';
import '../../../widgets/status_badge.dart';

class ManagerReservationDetailScreen extends StatefulWidget {
  final ReservationModel reservation;

  const ManagerReservationDetailScreen({super.key, required this.reservation});

  @override
  State<ManagerReservationDetailScreen> createState() => _ManagerReservationDetailScreenState();
}

class _ManagerReservationDetailScreenState extends State<ManagerReservationDetailScreen> {
  late ReservationModel _reservation;

  @override
  void initState() {
    super.initState();
    _reservation = widget.reservation;
  }

  Future<void> _updateStatus(String newStatus) async {
    final provider = context.read<ReservationProvider>();
    final messenger = ScaffoldMessenger.of(context);

    // If website booking check-in and ID proof not verified, prompt verification
    if (newStatus == 'Checked-in' || newStatus == 'checked_in') {
      final isWebsiteBooking = _reservation.source.isNotEmpty &&
          !_reservation.source.toLowerCase().contains('walk-in');
      if (isWebsiteBooking && _reservation.idVerification != 'Verified') {
        final proceed = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.shield_outlined, color: AppColors.warning),
                SizedBox(width: 8),
                Text('ID Proof Required'),
              ],
            ),
            content: const Text(
              'Online booking guest has not verified their ID proof yet. Would you like to verify ID proof now before completing check-in?',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Bypass'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx, true);
                },
                child: const Text('Verify ID Now'),
              ),
            ],
          ),
        );

        if (proceed == true) {
          _showVerifyIdDialog();
          return;
        }
      }
    }

    final success = await provider.updateStatus(_reservation.id, newStatus);
    if (success && mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Reservation status updated to ${Formatters.capitalize(newStatus)}'),
          backgroundColor: AppColors.success,
        ),
      );
      setState(() {
        _reservation = _reservation.copyWith(status: newStatus);
      });
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(provider.errorMessage ?? 'Failed to update status'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _showVerifyIdDialog() {
    String docType = _reservation.idDocType.isNotEmpty ? _reservation.idDocType : 'Aadhaar Card';
    final docNumberCtrl = TextEditingController(text: _reservation.idDocNumber);

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Verify Guest ID Proof'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: docType,
                    decoration: const InputDecoration(labelText: 'Document Type', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'Aadhaar Card', child: Text('Aadhaar Card')),
                      DropdownMenuItem(value: 'Passport', child: Text('Passport')),
                      DropdownMenuItem(value: 'Driving License', child: Text('Driving License')),
                      DropdownMenuItem(value: 'Voter ID', child: Text('Voter ID')),
                    ],
                    onChanged: (v) => setDialogState(() => docType = v ?? 'Aadhaar Card'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: docNumberCtrl,
                    decoration: const InputDecoration(
                      labelText: 'ID Document Number',
                      hintText: 'e.g. 5432-8765-1234',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(
                  onPressed: () async {
                    final num = docNumberCtrl.text.trim();
                    final messenger = ScaffoldMessenger.of(context);
                    if (num.isEmpty) {
                      messenger.showSnackBar(
                        const SnackBar(content: Text('Please enter ID document number')),
                      );
                      return;
                    }
                    Navigator.pop(ctx);
                    final resProvider = context.read<ReservationProvider>();
                    final ok = await resProvider.verifyIdProof(_reservation.id, docType, num);
                    if (ok && mounted) {
                      messenger.showSnackBar(
                        const SnackBar(content: Text('ID Proof verified successfully!'), backgroundColor: AppColors.success),
                      );
                      setState(() {
                        _reservation = _reservation.copyWith(
                          idDocType: docType,
                          idDocNumber: num,
                          idVerification: 'Verified',
                        );
                      });
                    }
                  },
                  child: const Text('Confirm Verification'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showAssignRoomDialog() {
    final roomProvider = context.read<RoomProvider>();
    final availableRooms = roomProvider.rooms;
    String selectedRoom = _reservation.roomNumber.isNotEmpty ? _reservation.roomNumber : (availableRooms.isNotEmpty ? availableRooms.first.roomNumber : '101');
    String selectedType = _reservation.roomType;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Assign / Change Room'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: availableRooms.any((r) => r.roomNumber == selectedRoom) ? selectedRoom : (availableRooms.isNotEmpty ? availableRooms.first.roomNumber : selectedRoom),
                    decoration: const InputDecoration(labelText: 'Select Room Number', border: OutlineInputBorder()),
                    items: availableRooms.map((r) {
                      return DropdownMenuItem(
                        value: r.roomNumber,
                        child: Text('Room ${r.roomNumber} (${r.category} - ${r.status})'),
                      );
                    }).toList(),
                    onChanged: (v) {
                      if (v != null) {
                        setDialogState(() {
                          selectedRoom = v;
                          final match = availableRooms.firstWhere((r) => r.roomNumber == v, orElse: () => availableRooms.first);
                          selectedType = match.category;
                        });
                      }
                    },
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    final resProvider = context.read<ReservationProvider>();
                    final messenger = ScaffoldMessenger.of(context);
                    final ok = await resProvider.assignRoom(_reservation.id, selectedRoom, selectedType);
                    if (ok && mounted) {
                      messenger.showSnackBar(
                        SnackBar(content: Text('Room $selectedRoom assigned successfully!'), backgroundColor: AppColors.success),
                      );
                      setState(() {
                        _reservation = _reservation.copyWith(roomNumber: selectedRoom, roomType: selectedType, room: '$selectedRoom · $selectedType');
                      });
                    }
                  },
                  child: const Text('Assign Room'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showExtendStayDialog() {
    int extraNights = 1;
    double dailyRate = _reservation.amount > 0 ? (_reservation.amount / (_reservation.nights > 0 ? _reservation.nights : 1)) : 3000.0;
    double extraAmount = dailyRate * extraNights;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Extend Guest Stay'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Current Check-Out: ${Formatters.dateTime(_reservation.checkOut)}', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Additional Nights:'),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.remove_circle_outline),
                            onPressed: extraNights > 1 ? () {
                              setDialogState(() {
                                extraNights--;
                                extraAmount = dailyRate * extraNights;
                              });
                            } : null,
                          ),
                          Text('$extraNights', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          IconButton(
                            icon: const Icon(Icons.add_circle_outline),
                            onPressed: () {
                              setDialogState(() {
                                extraNights++;
                                extraAmount = dailyRate * extraNights;
                              });
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Divider(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Additional Tariff:'),
                      Text(Formatters.currency(extraAmount), style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 16)),
                    ],
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    DateTime currentDt;
                    try {
                      currentDt = DateTime.parse(_reservation.checkOut);
                    } catch (_) {
                      currentDt = DateTime.now();
                    }
                    final newCheckOut = currentDt.add(Duration(days: extraNights)).toIso8601String();
                    final resProvider = context.read<ReservationProvider>();
                    final messenger = ScaffoldMessenger.of(context);
                    final ok = await resProvider.extendReservation(_reservation.id, newCheckOut, extraNights, extraAmount);
                    if (ok && mounted) {
                      messenger.showSnackBar(
                        const SnackBar(content: Text('Stay extended successfully!'), backgroundColor: AppColors.success),
                      );
                      setState(() {
                        _reservation = _reservation.copyWith(
                          checkOut: newCheckOut,
                          nights: _reservation.nights + extraNights,
                          amount: _reservation.amount + extraAmount,
                        );
                      });
                    }
                  },
                  child: const Text('Confirm Extension'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showSettleFolioDialog() {
    final amountCtrl = TextEditingController(text: _reservation.balance > 0 ? _reservation.balance.toStringAsFixed(0) : _reservation.amount.toStringAsFixed(0));

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Settle Folio Bill / Record Payment'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Outstanding Folio Balance: ${Formatters.currency(_reservation.balance)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.warning)),
              const SizedBox(height: 12),
              TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Amount Received (₹)', border: OutlineInputBorder()),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                final amt = double.tryParse(amountCtrl.text.trim()) ?? 0.0;
                final messenger = ScaffoldMessenger.of(context);
                final resProvider = context.read<ReservationProvider>();
                if (amt <= 0) {
                  messenger.showSnackBar(const SnackBar(content: Text('Please enter valid amount')));
                  return;
                }
                Navigator.pop(ctx);
                final payProvider = context.read<PaymentProvider>();
                final ok = await payProvider.settleFolio(_reservation.id, amt);
                if (ok && mounted) {
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Payment recorded & Folio settled!'), backgroundColor: AppColors.success),
                  );
                  resProvider.fetchReservations();
                  setState(() {
                    final newBal = (_reservation.balance - amt).clamp(0.0, double.infinity);
                    _reservation = _reservation.copyWith(
                      balance: newBal,
                      paymentStatus: newBal == 0 ? 'Paid' : 'Partial',
                    );
                  });
                }
              },
              child: const Text('Record Payment'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isVerified = _reservation.idVerification == 'Verified';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D1B2A),
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFFF5C06A), size: 20),
          tooltip: 'Back',
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Text(
          'Booking #${_reservation.reservationNumber}',
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: Colors.white,
            letterSpacing: -0.2,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline, color: AppColors.error),
            tooltip: 'Delete Reservation',
            onPressed: () async {
              final navigator = Navigator.of(context);
              final messenger = ScaffoldMessenger.of(context);
              final resProvider = context.read<ReservationProvider>();

              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Delete Reservation'),
                  content: Text('Are you sure you want to delete reservation #${_reservation.reservationNumber}?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.error, foregroundColor: Colors.white),
                      onPressed: () => Navigator.pop(ctx, true),
                      child: const Text('Delete'),
                    ),
                  ],
                ),
              );
              if (confirm == true && mounted) {
                final ok = await resProvider.deleteReservation(_reservation.id);
                if (ok && mounted) {
                  navigator.pop();
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Reservation deleted successfully')),
                  );
                }
              }
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Room ${_reservation.roomNumber.isNotEmpty ? _reservation.roomNumber : "Unassigned"}',
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.primary),
                            tooltip: 'Assign / Change Room',
                            onPressed: _showAssignRoomDialog,
                          ),
                        ],
                      ),
                      StatusBadge(status: _reservation.status, fontSize: 13),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${_reservation.roomType} • Stay: ${Formatters.capitalize(_reservation.stayType)}${_reservation.stayType == "hourly" ? " (${_reservation.hours} Hours)" : ""}',
                    style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Tariff', style: TextStyle(color: AppColors.textSecondary)),
                      Text(
                        Formatters.currency(_reservation.totalAmount),
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Balance Due', style: TextStyle(color: AppColors.textSecondary)),
                      Text(
                        Formatters.currency(_reservation.balance),
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: _reservation.balance > 0 ? AppColors.warning : AppColors.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Payment Status', style: TextStyle(color: AppColors.textSecondary)),
                      StatusBadge(status: _reservation.paymentStatus),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ID Verification Status Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isVerified ? AppColors.success.withAlpha(15) : AppColors.warning.withAlpha(15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isVerified ? AppColors.success.withAlpha(50) : AppColors.warning.withAlpha(50)),
              ),
              child: Row(
                children: [
                  Icon(
                    isVerified ? Icons.verified_user : Icons.gpp_maybe_outlined,
                    color: isVerified ? AppColors.success : AppColors.warning,
                    size: 28,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isVerified ? 'ID Proof Verified' : 'ID Proof Pending Verification',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: isVerified ? AppColors.success : AppColors.warning,
                          ),
                        ),
                        Text(
                          isVerified ? '${_reservation.idDocType}: ${_reservation.idDocNumber}' : 'Front desk requires verification before key release',
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: _showVerifyIdDialog,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isVerified ? AppColors.surface : AppColors.primary,
                      foregroundColor: isVerified ? AppColors.textPrimary : Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      textStyle: const TextStyle(fontSize: 12),
                    ),
                    child: Text(isVerified ? 'Edit ID' : 'Verify ID'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Guest Information
            const Text(
              'Guest Details',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _buildDetailRow(Icons.person_outline, 'Guest Name', _reservation.guestName),
                  const Divider(height: 16),
                  _buildDetailRow(Icons.email_outlined, 'Email', _reservation.guestEmail),
                  const Divider(height: 16),
                  _buildDetailRow(Icons.phone_outlined, 'Phone', _reservation.guestPhone),
                  const Divider(height: 16),
                  _buildDetailRow(Icons.source_outlined, 'Booking Source', _reservation.source),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Timings
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Stay Schedule',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                TextButton.icon(
                  icon: const Icon(Icons.more_time, size: 16),
                  label: const Text('Extend Stay'),
                  onPressed: _showExtendStayDialog,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _buildDetailRow(Icons.login, 'Check-In', Formatters.dateTime(_reservation.checkIn)),
                  const Divider(height: 16),
                  _buildDetailRow(Icons.logout, 'Check-Out', Formatters.dateTime(_reservation.checkOut)),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Manager Operations
            const Text(
              'Front Desk & Stay Operations',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (_reservation.status.toLowerCase() != 'confirmed' &&
                    _reservation.status.toLowerCase() != 'checked-in' &&
                    _reservation.status.toLowerCase() != 'checked_in')
                  CustomButton(
                    text: 'Confirm Booking',
                    backgroundColor: AppColors.primary,
                    icon: Icons.check_circle_outline,
                    onPressed: () => _updateStatus('Confirmed'),
                  ),
                if (_reservation.status.toLowerCase() == 'confirmed')
                  CustomButton(
                    text: 'Check-In Guest',
                    backgroundColor: AppColors.success,
                    icon: Icons.meeting_room,
                    onPressed: () => _updateStatus('Checked-in'),
                  ),
                if (_reservation.status.toLowerCase() == 'checked-in' ||
                    _reservation.status.toLowerCase() == 'checked_in')
                  CustomButton(
                    text: 'Check-Out Guest',
                    backgroundColor: AppColors.secondary,
                    icon: Icons.key_off,
                    onPressed: () => _updateStatus('Checked-out'),
                  ),
                CustomButton(
                  text: 'Settle Folio Payment',
                  backgroundColor: AppColors.primary,
                  isOutlined: true,
                  textColor: AppColors.primary,
                  icon: Icons.payment,
                  onPressed: _showSettleFolioDialog,
                ),
                if (_reservation.status.toLowerCase() != 'cancelled' &&
                    _reservation.status.toLowerCase() != 'checked-out' &&
                    _reservation.status.toLowerCase() != 'checked_out')
                  CustomButton(
                    text: 'Cancel Reservation',
                    backgroundColor: AppColors.error,
                    isOutlined: true,
                    textColor: AppColors.error,
                    icon: Icons.cancel_outlined,
                    onPressed: () => _updateStatus('Cancelled'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.textTertiary),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textTertiary)),
            const SizedBox(height: 2),
            Text(
              value.isNotEmpty ? value : 'N/A',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
          ],
        ),
      ],
    );
  }
}
