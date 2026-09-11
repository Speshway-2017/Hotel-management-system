import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_button.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import '../feedback/guest_add_feedback_screen.dart';

class GuestBookingDetailScreen extends StatefulWidget {
  final ReservationModel booking;

  const GuestBookingDetailScreen({super.key, required this.booking});

  @override
  State<GuestBookingDetailScreen> createState() => _GuestBookingDetailScreenState();
}

class _GuestBookingDetailScreenState extends State<GuestBookingDetailScreen> {
  late ReservationModel _booking;
  int _extendNights = 1;
  int _extendHours = 2;
  bool _isExtending = false;
  String _paymentOption = 'UPI / Online';

  @override
  void initState() {
    super.initState();
    _booking = widget.booking;
  }

  double get _dailyRate {
    final nights = _booking.nights > 0 ? _booking.nights : 1;
    if (_booking.totalAmount > 0 && nights > 0) {
      return (_booking.totalAmount / nights).roundToDouble();
    }
    return 3000.0;
  }

  double get _hourlyRate {
    return (_dailyRate / 24).roundToDouble().clamp(150.0, 1000.0);
  }

  bool get _isHourly => _booking.stayType.toLowerCase() == 'hourly';

  double get _additionalAmount {
    if (_isHourly) {
      return _hourlyRate * _extendHours;
    } else {
      return _dailyRate * _extendNights;
    }
  }

  DateTime get _currentCheckOutDt {
    final parsed = Formatters.parseDateSafe(_booking.checkOut);
    if (parsed != null) {
      if (parsed.hour == 0 && parsed.minute == 0) {
        return DateTime(parsed.year, parsed.month, parsed.day, 11, 0);
      }
      return parsed;
    }
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day, 11, 0);
  }

  DateTime get _newCheckOutDt {
    if (_isHourly) {
      return _currentCheckOutDt.add(Duration(hours: _extendHours));
    } else {
      final base = _currentCheckOutDt;
      return DateTime(base.year, base.month, base.day + _extendNights, 11, 0);
    }
  }

  Future<void> _handleConfirmExtension() async {
    setState(() => _isExtending = true);
    final provider = context.read<GuestBookingProvider>();
    final messenger = ScaffoldMessenger.of(context);

    final newCheckOutIso = _newCheckOutDt.toIso8601String();
    final amountToAdd = _additionalAmount;

    final success = await provider.extendBooking(
      bookingId: _booking.id,
      newCheckOut: newCheckOutIso,
      additionalNights: _isHourly ? null : _extendNights,
      extendHours: _isHourly ? _extendHours : null,
      additionalAmount: amountToAdd,
      paymentMethod: _paymentOption,
      paidNow: true,
    );

    setState(() => _isExtending = false);

    if (success && mounted) {
      setState(() {
        _booking = _booking.copyWith(
          checkOut: newCheckOutIso,
          nights: _isHourly ? _booking.nights : (_booking.nights + _extendNights),
          hours: _isHourly ? ((_booking.hours ?? 0) + _extendHours) : _booking.hours,
          amount: _booking.amount + amountToAdd,
          paymentStatus: 'Paid',
        );
      });
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            'Stay extended to ${Formatters.checkOutDateTime(newCheckOutIso)}! Payment of ${Formatters.currency(amountToAdd)} confirmed.',
          ),
          backgroundColor: AppColors.success,
          duration: const Duration(seconds: 4),
        ),
      );
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(provider.errorMessage ?? 'Failed to extend stay. Please check with reception.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  // Handle Booking Cancellation (Only allowed before check-in)
  Future<void> _showCancelBookingDialog(BuildContext context, ReservationModel currentBooking) async {
    final reasonController = TextEditingController();
    final remarksController = TextEditingController();
    bool isSubmitting = false;

    await showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 24),
                  SizedBox(width: 8),
                  Text('Cancel Booking', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Are you sure you want to cancel this booking? Once cancelled, you can submit a refund request for hotel management review.',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'Reason for Cancellation *',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: reasonController,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'e.g. Change of travel plans',
                        hintStyle: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Additional Remarks (Optional)',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: remarksController,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Any specific note for hotel staff',
                        hintStyle: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.of(dialogCtx).pop(),
                  child: const Text('Back', style: TextStyle(color: AppColors.textSecondary)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.error,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (reasonController.text.trim().isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Please enter a cancellation reason'),
                                backgroundColor: AppColors.error,
                              ),
                            );
                            return;
                          }
                          setDialogState(() => isSubmitting = true);
                          final prov = context.read<GuestBookingProvider>();
                          final messenger = ScaffoldMessenger.of(context);

                          final success = await prov.cancelBooking(
                            bookingId: currentBooking.id,
                            reason: reasonController.text.trim(),
                            remarks: remarksController.text.trim(),
                          );

                          if (dialogCtx.mounted) Navigator.of(dialogCtx).pop();

                          if (success) {
                            setState(() {
                              _booking = _booking.copyWith(
                                status: 'Cancelled',
                                cancellationReason: reasonController.text.trim(),
                                cancellationRemarks: remarksController.text.trim(),
                              );
                            });
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text('Booking cancelled successfully. You can now submit a refund request.'),
                                backgroundColor: AppColors.success,
                              ),
                            );
                          } else {
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(prov.errorMessage ?? 'Failed to cancel booking'),
                                backgroundColor: AppColors.error,
                              ),
                            );
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Confirm Cancellation'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // Show Refund Request Bottom Sheet (Only allowed when booking is cancelled)
  void _showRefundRequestBottomSheet(BuildContext context, ReservationModel currentBooking) {
    final upiController = TextEditingController();
    final holderController = TextEditingController(text: currentBooking.guestName);
    final accountNumController = TextEditingController();
    final ifscController = TextEditingController();
    final bankNameController = TextEditingController();
    final remarksController = TextEditingController();

    String refundMethod = 'UPI';
    bool isSubmitting = false;

    final refundableAmount = currentBooking.refundableAmount > 0
        ? currentBooking.refundableAmount
        : currentBooking.totalAmount;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 16,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
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
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF5B21B6).withAlpha(30),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.currency_rupee_rounded, color: Color(0xFF5B21B6), size: 22),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Request Stay Refund',
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0D1B2A)),
                              ),
                              Text(
                                'Submitted to hotel staff for verification & payout',
                                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Refund Summary Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Booking ID:', style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary)),
                              Text('#${currentBooking.reservationNumber}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Original Tariff:', style: TextStyle(fontSize: 12.5, color: AppColors.textSecondary)),
                              Text(Formatters.currency(currentBooking.totalAmount), style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            ],
                          ),
                          if (currentBooking.cancellationFee > 0) ...[
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Cancellation Fee:', style: TextStyle(fontSize: 12.5, color: AppColors.error)),
                                Text('- ${Formatters.currency(currentBooking.cancellationFee)}', style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.error, fontSize: 13)),
                              ],
                            ),
                          ],
                          const Divider(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Refundable Amount:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF0D1B2A))),
                              Text(
                                Formatters.currency(refundableAmount),
                                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF10B981)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Payment Method Toggle
                    const Text('Refund Payout Method *', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Color(0xFF0D1B2A))),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => setSheetState(() => refundMethod = 'UPI'),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: refundMethod == 'UPI' ? const Color(0xFF0D1B2A) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: refundMethod == 'UPI' ? const Color(0xFFF5C06A) : AppColors.border,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  'UPI ID (Instant)',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.bold,
                                    color: refundMethod == 'UPI' ? Colors.white : AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: InkWell(
                            onTap: () => setSheetState(() => refundMethod = 'Bank Transfer'),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: refundMethod == 'Bank Transfer' ? const Color(0xFF0D1B2A) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: refundMethod == 'Bank Transfer' ? const Color(0xFFF5C06A) : AppColors.border,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  'Bank Account',
                                  style: TextStyle(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.bold,
                                    color: refundMethod == 'Bank Transfer' ? Colors.white : AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    if (refundMethod == 'UPI') ...[
                      const Text('UPI ID (VPA) *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: upiController,
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'e.g. mobile@okaxis or user@upi',
                          hintStyle: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                    ] else ...[
                      const Text('Account Holder Name *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: holderController,
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Name as per bank records',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text('Bank Account Number *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: accountNumController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'e.g. 01234567890123',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('IFSC Code *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                TextField(
                                  controller: ifscController,
                                  textCapitalization: TextCapitalization.characters,
                                  style: const TextStyle(fontSize: 13),
                                  decoration: InputDecoration(
                                    hintText: 'e.g. HDFC0001234',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Bank Name', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                TextField(
                                  controller: bankNameController,
                                  style: const TextStyle(fontSize: 13),
                                  decoration: InputDecoration(
                                    hintText: 'e.g. HDFC Bank',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],

                    const SizedBox(height: 12),
                    const Text('Remarks / Note', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: remarksController,
                      style: const TextStyle(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Optional instructions for hotel finance desk',
                        hintStyle: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        icon: const Icon(Icons.send_rounded, size: 18, color: Colors.white),
                        label: isSubmitting
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Submit Request to Staff', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                if (refundMethod == 'UPI' && upiController.text.trim().isEmpty) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Please enter a valid UPI ID'), backgroundColor: AppColors.error),
                                  );
                                  return;
                                }
                                if (refundMethod == 'Bank Transfer' &&
                                    (accountNumController.text.trim().isEmpty || ifscController.text.trim().isEmpty)) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Please enter Account Number and IFSC Code'), backgroundColor: AppColors.error),
                                  );
                                  return;
                                }

                                setSheetState(() => isSubmitting = true);
                                final prov = context.read<GuestBookingProvider>();
                                final messenger = ScaffoldMessenger.of(context);

                                final success = await prov.submitRefundRequest(
                                  bookingId: currentBooking.id,
                                  amount: refundableAmount,
                                  reason: currentBooking.cancellationReason.isNotEmpty
                                      ? currentBooking.cancellationReason
                                      : 'Booking cancellation refund',
                                  details: remarksController.text.trim(),
                                  refundMethod: refundMethod,
                                  upiId: upiController.text.trim(),
                                  accountHolder: holderController.text.trim(),
                                  accountNumber: accountNumController.text.trim(),
                                  ifscCode: ifscController.text.trim(),
                                  bankName: bankNameController.text.trim(),
                                );

                                if (sheetCtx.mounted) Navigator.of(sheetCtx).pop();

                                if (success) {
                                  setState(() {
                                    _booking = _booking.copyWith(
                                      refundStatus: 'Pending',
                                      refundRequest: {
                                        'status': 'Pending',
                                        'requestedAmount': refundableAmount,
                                        'refundMethod': refundMethod,
                                        'upiId': upiController.text.trim(),
                                        'requestedAt': DateTime.now().toIso8601String(),
                                      },
                                    );
                                  });
                                  messenger.showSnackBar(
                                    const SnackBar(
                                      content: Text('Refund request submitted successfully! Staff will review and process your payout.'),
                                      backgroundColor: AppColors.success,
                                    ),
                                  );
                                } else {
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text(prov.errorMessage ?? 'Failed to submit refund request'),
                                      backgroundColor: AppColors.error,
                                    ),
                                  );
                                }
                              },
                      ),
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

  // Build Live Refund Lifecycle Tracker Card for Guest View
  Widget _buildRefundTrackerCard(ReservationModel b) {
    final status = b.refundStatus.isNotEmpty && b.refundStatus != 'None'
        ? b.refundStatus
        : (b.refundRequest?['status']?.toString() ?? 'Pending');

    final stLower = status.toLowerCase();
    final isApproved = stLower == 'approved';
    final isProcessing = stLower == 'processing';
    final isRefunded = stLower == 'refunded';
    final isRejected = stLower == 'rejected';

    Color statusColor;
    Color statusBg;
    String statusTitle;
    String statusSubtitle;

    if (isApproved) {
      statusColor = const Color(0xFF10B981);
      statusBg = const Color(0xFFDCFCE7);
      statusTitle = 'Approved by Staff';
      statusSubtitle = 'Hotel management has approved your refund. Awaiting payout processing.';
    } else if (isProcessing) {
      statusColor = const Color(0xFF2563EB);
      statusBg = const Color(0xFFDBEAFE);
      statusTitle = 'Processing Payout';
      statusSubtitle = 'Payout has been initiated by hotel staff. Funds will credit to your account shortly.';
    } else if (isRefunded) {
      statusColor = const Color(0xFF7C3AED);
      statusBg = const Color(0xFFEDE9FE);
      statusTitle = 'Refund Completed';
      statusSubtitle = 'The refund payout has been completed successfully.';
    } else if (isRejected) {
      statusColor = const Color(0xFFE53935);
      statusBg = const Color(0xFFFEE2E2);
      statusTitle = 'Request Declined';
      statusSubtitle = 'Hotel management declined this refund request.';
    } else {
      statusColor = const Color(0xFFD97706);
      statusBg = const Color(0xFFFEF3C7);
      statusTitle = 'Under Staff Review';
      statusSubtitle = 'Your request has been queued for Manager / Admin review.';
    }

    final reqAmount = b.refundableAmount > 0
        ? b.refundableAmount
        : (double.tryParse(b.refundRequest?['requestedAmount']?.toString() ?? '') ?? b.totalAmount);

    final reqMethod = b.refundRequest?['refundMethod']?.toString() ?? 'UPI';
    final upiId = b.refundRequest?['upiId']?.toString() ?? '';
    final decisionReason = b.refundRequest?['decisionReason']?.toString() ?? '';
    final decidedBy = b.refundRequest?['decidedBy']?.toString() ?? '';
    final txnId = b.refundRequest?['transactionId']?.toString() ?? '';

    // Step index for visual stepper: 0: Submitted, 1: Approved, 2: Processing, 3: Refunded
    int currentStep = 0;
    if (isApproved) currentStep = 1;
    if (isProcessing) currentStep = 2;
    if (isRefunded) currentStep = 3;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusColor.withAlpha(90), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0D1B2A).withAlpha(10),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: statusBg,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: statusColor.withAlpha(40),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isRefunded
                        ? Icons.check_circle_rounded
                        : isProcessing
                            ? Icons.sync_rounded
                            : isApproved
                                ? Icons.thumb_up_rounded
                                : isRejected
                                    ? Icons.cancel_rounded
                                    : Icons.schedule_rounded,
                    color: statusColor,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        statusTitle,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: statusColor,
                        ),
                      ),
                      Text(
                        statusSubtitle,
                        style: TextStyle(
                          fontSize: 11,
                          color: statusColor.withAlpha(220),
                          height: 1.25,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Visual Stepper (if not rejected)
                if (!isRejected) ...[
                  Row(
                    children: [
                      _buildStepCircle('Submitted', 0, currentStep, statusColor),
                      _buildStepLine(0 < currentStep, statusColor),
                      _buildStepCircle('Approved', 1, currentStep, statusColor),
                      _buildStepLine(1 < currentStep, statusColor),
                      _buildStepCircle('Processing', 2, currentStep, statusColor),
                      _buildStepLine(2 < currentStep, statusColor),
                      _buildStepCircle('Refunded', 3, currentStep, statusColor),
                    ],
                  ),
                  const SizedBox(height: 18),
                ],

                // Live Data Details
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    children: [
                      _buildDetailRow('Refund Amount', Formatters.currency(reqAmount), isBold: true, valueColor: const Color(0xFF10B981)),
                      const Divider(height: 14),
                      _buildDetailRow('Payout Method', reqMethod),
                      if (upiId.isNotEmpty) ...[
                        const Divider(height: 14),
                        _buildDetailRow('UPI Destination', upiId),
                      ],
                      if (decidedBy.isNotEmpty) ...[
                        const Divider(height: 14),
                        _buildDetailRow('Staff Authority', decidedBy),
                      ],
                      if (decisionReason.isNotEmpty) ...[
                        const Divider(height: 14),
                        _buildDetailRow('Decision Notes', decisionReason),
                      ],
                      if (txnId.isNotEmpty) ...[
                        const Divider(height: 14),
                        _buildDetailRow('Transaction UTR', txnId, isBold: true, valueColor: const Color(0xFF7C3AED)),
                      ],
                    ],
                  ),
                ),

                const SizedBox(height: 10),
                const Row(
                  children: [
                    Icon(Icons.lock_clock_rounded, size: 13, color: AppColors.textTertiary),
                    SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        'Refund workflow is actively controlled by Hotel Management. Real-time updates reflect automatically.',
                        style: TextStyle(fontSize: 10.5, color: AppColors.textTertiary, fontStyle: FontStyle.italic),
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

  Widget _buildStepCircle(String title, int stepIndex, int currentStep, Color activeColor) {
    final isDone = stepIndex <= currentStep;
    final isCurrent = stepIndex == currentStep;

    return Expanded(
      child: Column(
        children: [
          Container(
            width: 22,
            height: 22,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDone ? activeColor : const Color(0xFFE2E8F0),
              border: isCurrent ? Border.all(color: const Color(0xFF0D1B2A), width: 2) : null,
            ),
            child: Icon(
              isDone ? Icons.check : Icons.circle,
              size: isDone ? 13 : 6,
              color: isDone ? Colors.white : const Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 9.5,
              fontWeight: isDone ? FontWeight.bold : FontWeight.w500,
              color: isDone ? const Color(0xFF0D1B2A) : AppColors.textTertiary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildStepLine(bool isDone, Color activeColor) {
    return Container(
      width: 14,
      height: 2,
      margin: const EdgeInsets.only(bottom: 14),
      color: isDone ? activeColor : const Color(0xFFE2E8F0),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isBold = false, Color valueColor = const Color(0xFF0D1B2A)}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
        Text(
          value,
          style: TextStyle(fontSize: 12.5, fontWeight: isBold ? FontWeight.bold : FontWeight.w600, color: valueColor),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = context.watch<GuestBookingProvider>();
    final currentBooking = bookingProvider.bookings.firstWhere(
      (b) => b.id == _booking.id || b.bookingId == _booking.bookingId,
      orElse: () => _booking,
    );

    final isCancelled = currentBooking.isCancelled;
    final isStayActive = !isCancelled &&
        (currentBooking.status.toLowerCase() == 'checked_in' ||
            currentBooking.status.toLowerCase() == 'confirmed' ||
            currentBooking.status.toLowerCase() == 'paid');

    final canCancelBeforeCheckIn = !isCancelled &&
        currentBooking.status.toLowerCase() != 'checked_in' &&
        currentBooking.status.toLowerCase() != 'checked-in' &&
        currentBooking.status.toLowerCase() != 'checked_out' &&
        currentBooking.status.toLowerCase() != 'completed';

    return Scaffold(
      appBar: AppBar(
        title: Text('Stay #${currentBooking.reservationNumber}'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header
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
                      Text(
                        'Room ${currentBooking.roomNumber.isNotEmpty ? currentBooking.roomNumber : "Assigned on Arrival"}',
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      StatusBadge(status: currentBooking.status, fontSize: 13),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Stay: ${Formatters.capitalize(currentBooking.stayType)}${currentBooking.stayType == "hourly" ? " (${currentBooking.hours}h)" : ""}',
                    style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Amount', style: TextStyle(color: AppColors.textSecondary)),
                      Text(
                        Formatters.currency(currentBooking.totalAmount),
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Payment Status', style: TextStyle(color: AppColors.textSecondary)),
                      StatusBadge(status: currentBooking.paymentStatus),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ==============================================================
            // CANCELLATION & REFUND LIFECYCLE SECTION
            // ==============================================================
            if (isCancelled) ...[
              if (currentBooking.hasRefundRequest) ...[
                // 1. Live Refund Lifecycle Tracker
                _buildRefundTrackerCard(currentBooking),
              ] else ...[
                // 2. Cancellation Summary & Request Refund Banner
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.info_outline_rounded, color: AppColors.error, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Booking Cancelled',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF991B1B)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      if (currentBooking.cancellationReason.isNotEmpty) ...[
                        Text(
                          'Reason: ${currentBooking.cancellationReason}',
                          style: const TextStyle(fontSize: 12.5, color: Color(0xFF7F1D1D)),
                        ),
                        const SizedBox(height: 8),
                      ],
                      const Text(
                        'You can now submit a refund request for hotel management review. Staff will approve and initiate payout.',
                        style: TextStyle(fontSize: 12, color: Color(0xFF7F1D1D), height: 1.35),
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () => _showRefundRequestBottomSheet(context, currentBooking),
                          child: const Text(
                            'Request Refund Now',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
            ],

            // Schedule Info
            const Text(
              'Stay Timings',
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
                  Row(
                    children: [
                      const Icon(Icons.login, size: 20, color: AppColors.primary),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Check-In Time', style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                          const SizedBox(height: 2),
                          Text(Formatters.checkInDateTime(currentBooking.checkIn), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ),
                  const Divider(height: 16),
                  Row(
                    children: [
                      const Icon(Icons.logout, size: 20, color: AppColors.secondary),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Check-Out Time', style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                          const SizedBox(height: 2),
                          Text(Formatters.checkOutDateTime(currentBooking.checkOut), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Extend Stay Box with Dynamic Payment Breakdown
            if (isStayActive) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.secondary.withAlpha(15),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.secondary.withAlpha(80)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.secondary.withAlpha(30),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.more_time_rounded, color: AppColors.secondary, size: 22),
                        ),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Extend Your Stay',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.secondary),
                              ),
                              Text(
                                'Select extra duration & calculate payment instantly',
                                style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Duration Selector
                    if (_isHourly) ...[
                      const Text(
                        'Additional Hours:',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [1, 2, 3, 6].map((h) {
                          final isSel = _extendHours == h;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text('+$h Hours'),
                              selected: isSel,
                              selectedColor: AppColors.secondary,
                              labelStyle: TextStyle(
                                color: isSel ? Colors.white : AppColors.textPrimary,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                              onSelected: (val) {
                                if (val) setState(() => _extendHours = h);
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ] else ...[
                      const Text(
                        'Additional Nights:',
                        style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [1, 2, 3, 4, 5].map((n) {
                          final isSel = _extendNights == n;
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: ChoiceChip(
                              label: Text('+$n Night${n > 1 ? "s" : ""}'),
                              selected: isSel,
                              selectedColor: AppColors.secondary,
                              labelStyle: TextStyle(
                                color: isSel ? Colors.white : AppColors.textPrimary,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                              onSelected: (val) {
                                if (val) setState(() => _extendNights = n);
                              },
                            ),
                          );
                        }).toList(),
                      ),
                    ],

                    const SizedBox(height: 14),

                    // Real-Time Dynamic Payment & Schedule Card
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Current Check-Out:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              Text(
                                Formatters.checkOutDateTime(_currentCheckOutDt.toIso8601String()),
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(
                                children: [
                                  Icon(Icons.event_available_rounded, size: 14, color: AppColors.success),
                                  SizedBox(width: 4),
                                  Text('New Check-Out:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                                ],
                              ),
                              Text(
                                Formatters.checkOutDateTime(_newCheckOutDt.toIso8601String()),
                                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: AppColors.primary),
                              ),
                            ],
                          ),
                          const Divider(height: 14),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _isHourly ? 'Rate per Hour:' : 'Rate per Night:',
                                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                              Text(
                                _isHourly ? '${Formatters.currency(_hourlyRate)} / hr' : '${Formatters.currency(_dailyRate)} / night',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Additional Tariff:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                              Text(
                                Formatters.currency(_additionalAmount),
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppColors.primary),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('New Total Stay Cost:', style: TextStyle(fontSize: 11.5, color: AppColors.textTertiary)),
                              Text(
                                Formatters.currency(currentBooking.totalAmount + _additionalAmount),
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Payment Mode Selector
                    Row(
                      children: [
                        const Text('Payment:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _paymentOption,
                                isDense: true,
                                icon: const Icon(Icons.arrow_drop_down_rounded, size: 20),
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                                items: const [
                                  DropdownMenuItem(value: 'UPI / Online', child: Text('UPI / Online')),
                                  DropdownMenuItem(value: 'Card Payment', child: Text('Credit / Debit Card')),
                                  DropdownMenuItem(value: 'Pay at Front Desk', child: Text('Pay at Front Desk')),
                                ],
                                onChanged: (val) {
                                  if (val != null) setState(() => _paymentOption = val);
                                },
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // Extension Action Button
                    CustomButton(
                      text: 'Confirm Extension & Pay ${Formatters.currency(_additionalAmount)}',
                      backgroundColor: AppColors.secondary,
                      icon: Icons.check_circle_outline_rounded,
                      isLoading: _isExtending,
                      onPressed: _handleConfirmExtension,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Cancel Booking Button (for upcoming stays prior to check-in)
            if (canCancelBeforeCheckIn) ...[
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.error,
                  side: const BorderSide(color: Color(0xFFFECACA), width: 1.2),
                  backgroundColor: const Color(0xFFFEF2F2),
                  minimumSize: const Size(double.infinity, 46),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.cancel_outlined, size: 18),
                label: const Text(
                  'Cancel Upcoming Reservation',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                onPressed: () => _showCancelBookingDialog(context, currentBooking),
              ),
              const SizedBox(height: 16),
            ],

            // Write Review Button if checked_out
            if (currentBooking.status.toLowerCase() == 'checked_out') ...[
              CustomButton(
                text: 'Leave a Review for this Stay',
                backgroundColor: AppColors.primary,
                icon: Icons.star_rate,
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => GuestAddFeedbackScreen(reservationId: currentBooking.id),
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
            ],
          ],
        ),
      ),
    );
  }
}
