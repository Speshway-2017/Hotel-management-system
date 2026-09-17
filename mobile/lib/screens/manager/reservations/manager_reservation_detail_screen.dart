import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../models/payment_model.dart';
import '../../../models/reservation_model.dart';
import '../../../providers/manager/payment_provider.dart';
import '../../../providers/manager/reservation_provider.dart';
import '../../../providers/manager/room_provider.dart';
import '../../../widgets/custom_button.dart';
import '../../../widgets/status_badge.dart';
import '../payments/manager_payment_detail_screen.dart';

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

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.fromLTRB(20, 14, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle Bar
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.border,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Header: Icon + Title + Close Button
                    Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withAlpha(20),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.primary.withAlpha(50)),
                          ),
                          child: const Icon(Icons.badge_rounded, color: AppColors.primary, size: 24),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Verify Guest ID Proof',
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${_reservation.guestName} • Room ${_reservation.roomNumber.isNotEmpty ? _reservation.roomNumber : "Unassigned"}',
                                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, size: 20, color: AppColors.textSecondary),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Document Type Dropdown
                    const Text(
                      'Document Type',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: docType,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: AppColors.background,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                        ),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Aadhaar Card', child: Text('Aadhaar Card')),
                        DropdownMenuItem(value: 'Passport', child: Text('Passport')),
                        DropdownMenuItem(value: 'Driving License', child: Text('Driving License')),
                        DropdownMenuItem(value: 'Voter ID', child: Text('Voter ID')),
                        DropdownMenuItem(value: 'National ID', child: Text('National ID Card')),
                      ],
                      onChanged: (v) => setDialogState(() => docType = v ?? 'Aadhaar Card'),
                    ),
                    const SizedBox(height: 14),

                    // Document Number Input
                    const Text(
                      'ID Document Number',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: docNumberCtrl,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'e.g. 5432-8765-1234',
                        filled: true,
                        fillColor: AppColors.background,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 22),

                    // Actions
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(ctx),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.textSecondary,
                              side: const BorderSide(color: AppColors.border),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
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
                                  const SnackBar(
                                    content: Text('ID Proof verified successfully!'),
                                    backgroundColor: AppColors.success,
                                  ),
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
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                            ),
                            child: const Text('Confirm Verification', style: TextStyle(fontWeight: FontWeight.w700)),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
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

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            DateTime currentDt;
            try {
              currentDt = Formatters.parseDateSafe(_reservation.checkOut) ?? DateTime.now();
            } catch (_) {
              currentDt = DateTime.now();
            }
            if (currentDt.hour == 0 && currentDt.minute == 0) {
              currentDt = DateTime(currentDt.year, currentDt.month, currentDt.day, 11, 0);
            }
            final newCheckOutDt = DateTime(currentDt.year, currentDt.month, currentDt.day + extraNights, 11, 0);
            final newTotalAmount = _reservation.amount + extraAmount;

            return Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.fromLTRB(20, 14, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle Bar
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: AppColors.border,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Header: Icon + Title + Close Button
                    Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF5C06A).withAlpha(35),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFF5C06A).withAlpha(90)),
                          ),
                          child: const Icon(Icons.more_time_rounded, color: Color(0xFFB47D16), size: 24),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Extend Guest Stay',
                                style: TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${_reservation.guestName} • ${_reservation.bookingId.isNotEmpty ? _reservation.bookingId : (_reservation.roomNumber.isNotEmpty ? "Room ${_reservation.roomNumber}" : _reservation.id)}',
                                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, size: 20, color: AppColors.textSecondary),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Stay Extension Date Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.textSecondary),
                                  SizedBox(width: 6),
                                  Text('Current Check-Out', style: TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                                ],
                              ),
                              Text(
                                Formatters.checkOutDateTime(_reservation.checkOut),
                                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                              ),
                            ],
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: Divider(height: 1, color: AppColors.border),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.event_available_rounded, size: 15, color: AppColors.success),
                                  SizedBox(width: 6),
                                  Text('New Check-Out', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                                ],
                              ),
                              Text(
                                Formatters.checkOutDateTime(newCheckOutDt.toIso8601String()),
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.primary),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Additional Nights Stepper Card
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Additional Nights',
                                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.textPrimary),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Adjust duration',
                                style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove, size: 18),
                                  visualDensity: VisualDensity.compact,
                                  onPressed: extraNights > 1
                                      ? () {
                                          setDialogState(() {
                                            extraNights--;
                                            extraAmount = dailyRate * extraNights;
                                          });
                                        }
                                      : null,
                                ),
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  child: Text(
                                    '$extraNights Night${extraNights > 1 ? "s" : ""}',
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, color: AppColors.textPrimary),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.add, size: 18),
                                  visualDensity: VisualDensity.compact,
                                  onPressed: () {
                                    setDialogState(() {
                                      extraNights++;
                                      extraAmount = dailyRate * extraNights;
                                    });
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Financial Breakdown Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Daily Rate:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              Text('${Formatters.currency(dailyRate)} / night', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Additional Tariff:', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, color: AppColors.textPrimary)),
                              Text(
                                '+${Formatters.currency(extraAmount)}',
                                style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary, fontSize: 16),
                              ),
                            ],
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8),
                            child: Divider(height: 1, color: AppColors.border),
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('New Total Amount:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              Text(
                                Formatters.currency(newTotalAmount),
                                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 22),

                    // Action Buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(ctx),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.textSecondary,
                              side: const BorderSide(color: AppColors.border),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed: () async {
                              Navigator.pop(ctx);
                              final newCheckOut = newCheckOutDt.toIso8601String();
                              final resProvider = context.read<ReservationProvider>();
                              final messenger = ScaffoldMessenger.of(context);
                              final ok = await resProvider.extendReservation(_reservation.id, newCheckOut, extraNights, extraAmount);
                              if (ok && mounted) {
                                messenger.showSnackBar(
                                  SnackBar(
                                    content: Text('Stay extended to ${Formatters.checkOutDateTime(newCheckOut)}! Added ${Formatters.currency(extraAmount)}.'),
                                    backgroundColor: AppColors.success,
                                    duration: const Duration(seconds: 4),
                                  ),
                                );
                                setState(() {
                                  _reservation = _reservation.copyWith(
                                    checkOut: newCheckOut,
                                    nights: _reservation.nights + extraNights,
                                    amount: newTotalAmount,
                                  );
                                });
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                            ),
                            child: Text(
                              'Confirm (+${Formatters.currency(extraAmount)})',
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
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

  void _openPaymentDetail() {
    final payProvider = context.read<PaymentProvider>();
    PaymentModel? payment;
    for (final p in payProvider.payments) {
      if (p.bookingId == _reservation.id ||
          p.bookingId == _reservation.bookingId ||
          p.id == _reservation.id ||
          (_reservation.bookingId.isNotEmpty && p.bookingId.toLowerCase() == _reservation.bookingId.toLowerCase())) {
        payment = p;
        break;
      }
    }

    payment ??= PaymentModel(
      id: _reservation.id,
      bookingId: _reservation.bookingId.isNotEmpty ? _reservation.bookingId : _reservation.id,
      guestName: _reservation.guestName,
      roomNumber: _reservation.roomNumber.isNotEmpty ? _reservation.roomNumber : '101',
      amount: _reservation.totalAmount > 0 ? _reservation.totalAmount : _reservation.amount,
      paymentMethod: _reservation.paymentMethod.isNotEmpty ? _reservation.paymentMethod : 'UPI',
      status: _reservation.paymentStatus.isNotEmpty ? _reservation.paymentStatus : 'Settled',
      propertyId: _reservation.propertyId.isNotEmpty ? _reservation.propertyId : 'HS-9HQ8P',
      createdAt: _reservation.createdAt.isNotEmpty ? _reservation.createdAt : DateTime.now().toIso8601String(),
    );

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ManagerPaymentDetailScreen(payment: payment!),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isVerified = _reservation.idVerification == 'Verified';
    final stLower = _reservation.status.toLowerCase();
    final isCancelled = stLower == 'cancelled' || stLower == 'canceled';
    final isCheckedOut = stLower == 'checked-out' || stLower == 'checked_out' || stLower == 'completed';
    final isCheckedIn = stLower == 'checked-in' || stLower == 'checked_in' || stLower == 'active' || stLower == 'staying';
    final isConfirmed = stLower == 'confirmed';
    final payLower = _reservation.paymentStatus.toLowerCase();
    final isPaid = payLower == 'paid' || payLower == 'settled' || payLower == 'completed' || _reservation.balance <= 0;

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
                          if (!isCancelled && !isCheckedOut)
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
                  const SizedBox(height: 12),
                  InkWell(
                    onTap: _openPaymentDetail,
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 12),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withAlpha(12),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.primary.withAlpha(40)),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_long_rounded, size: 16, color: AppColors.primary),
                          SizedBox(width: 8),
                          Text(
                            'View Folio & Payment Details',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                          SizedBox(width: 4),
                          Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.primary),
                        ],
                      ),
                    ),
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
                  if (!isCancelled && !isCheckedOut)
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
                if (!isCancelled && !isCheckedOut)
                  ElevatedButton.icon(
                    icon: const Icon(Icons.more_time_rounded, size: 14, color: Color(0xFFF5C06A)),
                    label: const Text(
                      'Extend Stay',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.1,
                        color: Colors.white,
                      ),
                    ),
                    onPressed: _showExtendStayDialog,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0D1B2A),
                      foregroundColor: Colors.white,
                      elevation: 2,
                      shadowColor: const Color(0x400D1B2A),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: const BorderSide(color: Color(0xFFF5C06A), width: 1.0),
                      ),
                    ),
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
                  _buildDetailRow(Icons.login, 'Check-In', Formatters.checkInDateTime(_reservation.checkIn)),
                  const Divider(height: 16),
                  _buildDetailRow(Icons.logout, 'Check-Out', Formatters.checkOutDateTime(_reservation.checkOut)),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Manager Operations
            if (isCheckedOut) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.success.withAlpha(15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.success.withAlpha(50)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle_outline, color: AppColors.success, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'This guest has checked out. Stay is completed.',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.success,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (isCancelled) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.error.withAlpha(15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.error.withAlpha(50)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.cancel_outlined, color: AppColors.error, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'This reservation is cancelled. Stay operations, ID verification, and payment settlement are disabled.',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.error,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (isCheckedIn) ...[
              const Text(
                'Front Desk & Stay Operations',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 12),
              if (!isPaid)
                Row(
                  children: [
                    Expanded(
                      child: CustomButton(
                        text: 'Check-Out',
                        backgroundColor: const Color(0xFF0D1B2A),
                        textColor: Colors.white,
                        icon: Icons.key_off_rounded,
                        onPressed: () => _updateStatus('Checked-out'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: CustomButton(
                        text: 'Settle Folio',
                        backgroundColor: const Color(0xFF10B981),
                        textColor: Colors.white,
                        icon: Icons.payments_rounded,
                        onPressed: _showSettleFolioDialog,
                      ),
                    ),
                  ],
                )
              else
                CustomButton(
                  text: 'Check-Out',
                  backgroundColor: const Color(0xFF0D1B2A),
                  textColor: Colors.white,
                  icon: Icons.key_off_rounded,
                  onPressed: () => _updateStatus('Checked-out'),
                ),
            ] else if (isConfirmed) ...[
              const Text(
                'Front Desk & Stay Operations',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 12),
              if (!isPaid)
                Row(
                  children: [
                    Expanded(
                      child: CustomButton(
                        text: 'Check-In Guest',
                        backgroundColor: const Color(0xFF10B981),
                        textColor: Colors.white,
                        icon: Icons.meeting_room_rounded,
                        onPressed: () => _updateStatus('Checked-in'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: CustomButton(
                        text: 'Settle Folio',
                        backgroundColor: const Color(0xFF0D1B2A),
                        textColor: Colors.white,
                        icon: Icons.payments_rounded,
                        onPressed: _showSettleFolioDialog,
                      ),
                    ),
                  ],
                )
              else
                CustomButton(
                  text: 'Check-In Guest',
                  backgroundColor: const Color(0xFF10B981),
                  textColor: Colors.white,
                  icon: Icons.meeting_room_rounded,
                  onPressed: () => _updateStatus('Checked-in'),
                ),
              const SizedBox(height: 10),
              CustomButton(
                text: 'Cancel Reservation',
                backgroundColor: const Color(0xFFEF4444),
                isOutlined: true,
                textColor: const Color(0xFFEF4444),
                icon: Icons.cancel_outlined,
                onPressed: () => _updateStatus('Cancelled'),
              ),
            ] else ...[
              const Text(
                'Front Desk & Stay Operations',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 12),
              if (!isPaid)
                Row(
                  children: [
                    Expanded(
                      child: CustomButton(
                        text: 'Confirm Booking',
                        backgroundColor: const Color(0xFF5B21B6),
                        textColor: Colors.white,
                        icon: Icons.check_circle_outline,
                        onPressed: () => _updateStatus('Confirmed'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: CustomButton(
                        text: 'Settle Folio',
                        backgroundColor: const Color(0xFF0D1B2A),
                        textColor: Colors.white,
                        icon: Icons.payments_rounded,
                        onPressed: _showSettleFolioDialog,
                      ),
                    ),
                  ],
                )
              else
                CustomButton(
                  text: 'Confirm Booking',
                  backgroundColor: const Color(0xFF5B21B6),
                  textColor: Colors.white,
                  icon: Icons.check_circle_outline,
                  onPressed: () => _updateStatus('Confirmed'),
                ),
              const SizedBox(height: 10),
              CustomButton(
                text: 'Cancel Reservation',
                backgroundColor: const Color(0xFFEF4444),
                isOutlined: true,
                textColor: const Color(0xFFEF4444),
                icon: Icons.cancel_outlined,
                onPressed: () => _updateStatus('Cancelled'),
              ),
            ],
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
