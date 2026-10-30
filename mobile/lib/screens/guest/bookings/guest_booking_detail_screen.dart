import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import 'package:hour_stay_mobile/providers/guest/guest_feedback_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_button.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import '../feedback/guest_add_feedback_screen.dart';
import '../folio/guest_folio_screen.dart';
import 'package:hour_stay_mobile/services/pdf_invoice_service.dart';
import 'package:hour_stay_mobile/core/utils/input_validators.dart';

class GuestBookingDetailScreen extends StatefulWidget {
  final ReservationModel booking;

  const GuestBookingDetailScreen({super.key, required this.booking});

  @override
  State<GuestBookingDetailScreen> createState() => _GuestBookingDetailScreenState();
}

class _GuestBookingDetailScreenState extends State<GuestBookingDetailScreen> {
  late ReservationModel _booking;

  @override
  void initState() {
    super.initState();
    _booking = widget.booking;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GuestFeedbackProvider>().fetchMyFeedbacks(silent: true);
    });
  }

  // Handle Booking Cancellation (Only allowed before check-in)
  Future<void> _showCancelBookingDialog(BuildContext context, ReservationModel currentBooking) async {
    final reasonController = TextEditingController();
    final remarksController = TextEditingController();
    String? reasonError;
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
                      onChanged: (val) {
                        setDialogState(() {
                          reasonError = val.trim().isEmpty ? 'Cancellation reason is required' : null;
                        });
                      },
                      decoration: InputDecoration(
                        hintText: 'e.g. Change of travel plans',
                        hintStyle: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: reasonError != null ? InputValidators.errorRed : AppColors.border)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: reasonError != null ? InputValidators.errorRed : AppColors.border)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: reasonError != null ? InputValidators.errorRed : AppColors.primary, width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                    if (reasonError != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.error_outline_rounded, color: InputValidators.errorRed, size: 13),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(reasonError!, style: InputValidators.errorTextStyle),
                          ),
                        ],
                      ),
                    ],
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
                          final rErr = reasonController.text.trim().isEmpty ? 'Cancellation reason is required' : null;
                          if (rErr != null) {
                            setDialogState(() => reasonError = rErr);
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
    String? upiError;
    String? holderError;
    String? accountNumError;
    String? ifscError;

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
                physics: const BouncingScrollPhysics(),
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
                        onChanged: (val) {
                          setSheetState(() {
                            upiError = InputValidators.validateUpi(val, required: true);
                          });
                        },
                        decoration: InputDecoration(
                          hintText: 'e.g. mobile@okaxis or user@upi',
                          hintStyle: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: upiError != null ? InputValidators.errorRed : AppColors.border)),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: upiError != null ? InputValidators.errorRed : AppColors.border)),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: upiError != null ? InputValidators.errorRed : AppColors.primary, width: 1.5)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      if (upiError != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, color: InputValidators.errorRed, size: 13),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(upiError!, style: InputValidators.errorTextStyle),
                            ),
                          ],
                        ),
                      ],
                    ] else ...[
                      const Text('Account Holder Name *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: holderController,
                        style: const TextStyle(fontSize: 13),
                        onChanged: (val) {
                          setSheetState(() {
                            holderError = InputValidators.validateName(val, fieldName: 'Account holder name', required: true);
                          });
                        },
                        decoration: InputDecoration(
                          hintText: 'Name as per bank records',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: holderError != null ? InputValidators.errorRed : AppColors.border)),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: holderError != null ? InputValidators.errorRed : AppColors.border)),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: holderError != null ? InputValidators.errorRed : AppColors.primary, width: 1.5)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      if (holderError != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, color: InputValidators.errorRed, size: 13),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(holderError!, style: InputValidators.errorTextStyle),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 10),
                      const Text('Bank Account Number *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: accountNumController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(fontSize: 13),
                        onChanged: (val) {
                          setSheetState(() {
                            accountNumError = InputValidators.validateAccountNumber(val, required: true);
                          });
                        },
                        decoration: InputDecoration(
                          hintText: 'e.g. 01234567890123',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: accountNumError != null ? InputValidators.errorRed : AppColors.border)),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: accountNumError != null ? InputValidators.errorRed : AppColors.border)),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: accountNumError != null ? InputValidators.errorRed : AppColors.primary, width: 1.5)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                      ),
                      if (accountNumError != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.error_outline_rounded, color: InputValidators.errorRed, size: 13),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(accountNumError!, style: InputValidators.errorTextStyle),
                            ),
                          ],
                        ),
                      ],
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
                                  onChanged: (val) {
                                    setSheetState(() {
                                      final trimmed = val.trim();
                                      if (trimmed.isEmpty) {
                                        ifscError = 'IFSC code is required';
                                      } else if (trimmed.length < 8 || trimmed.length > 11) {
                                        ifscError = 'IFSC must be 8-11 characters';
                                      } else {
                                        ifscError = null;
                                      }
                                    });
                                  },
                                  decoration: InputDecoration(
                                    hintText: 'e.g. HDFC0001234',
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: ifscError != null ? InputValidators.errorRed : AppColors.border)),
                                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: ifscError != null ? InputValidators.errorRed : AppColors.border)),
                                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: ifscError != null ? InputValidators.errorRed : AppColors.primary, width: 1.5)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  ),
                                ),
                                if (ifscError != null) ...[
                                  const SizedBox(height: 4),
                                  Text(ifscError!, style: InputValidators.errorTextStyle),
                                ],
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
                                if (refundMethod == 'UPI') {
                                  final uErr = InputValidators.validateUpi(upiController.text, required: true);
                                  if (uErr != null) {
                                    setSheetState(() => upiError = uErr);
                                    return;
                                  }
                                } else {
                                  final hErr = InputValidators.validateName(holderController.text, fieldName: 'Account holder name', required: true);
                                  final aErr = InputValidators.validateAccountNumber(accountNumController.text, required: true);
                                  final ifscTrim = ifscController.text.trim();
                                  final iErr = ifscTrim.isEmpty
                                      ? 'IFSC code is required'
                                      : (ifscTrim.length < 8 || ifscTrim.length > 11 ? 'IFSC must be 8-11 characters' : null);

                                  if (hErr != null || aErr != null || iErr != null) {
                                    setSheetState(() {
                                      holderError = hErr;
                                      accountNumError = aErr;
                                      ifscError = iErr;
                                    });
                                    return;
                                  }
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

  int? _getRemainingMinutes(ReservationModel b) {
    if (b.checkOut.isEmpty) return null;
    DateTime? outDt = DateTime.tryParse(b.checkOut);
    if (outDt == null) {
      final dmy = RegExp(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})').firstMatch(b.checkOut);
      final ymd = RegExp(r'^(\d{4})[-/](\d{1,2})[-/](\d{1,2})').firstMatch(b.checkOut);
      if (dmy != null) {
        final d = int.parse(dmy.group(1)!);
        final m = int.parse(dmy.group(2)!);
        final y = int.parse(dmy.group(3)!);
        outDt = DateTime(y, m, d, 11, 0);
      } else if (ymd != null) {
        final y = int.parse(ymd.group(1)!);
        final m = int.parse(ymd.group(2)!);
        final d = int.parse(ymd.group(3)!);
        outDt = DateTime(y, m, d, 11, 0);
      }
    }
    if (outDt == null) return null;
    final now = DateTime.now();
    return (outDt.difference(now).inSeconds / 60).round();
  }

  int? _getRemainingCheckInMinutes(ReservationModel b) {
    if (b.checkIn.isEmpty) return null;
    DateTime? inDt = DateTime.tryParse(b.checkIn);
    if (inDt == null) {
      final dmy = RegExp(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})').firstMatch(b.checkIn);
      final ymd = RegExp(r'^(\d{4})[-/](\d{1,2})[-/](\d{1,2})').firstMatch(b.checkIn);
      if (dmy != null) {
        final d = int.parse(dmy.group(1)!);
        final m = int.parse(dmy.group(2)!);
        final y = int.parse(dmy.group(3)!);
        inDt = DateTime(y, m, d, 14, 0);
      } else if (ymd != null) {
        final y = int.parse(ymd.group(1)!);
        final m = int.parse(ymd.group(2)!);
        final d = int.parse(ymd.group(3)!);
        inDt = DateTime(y, m, d, 14, 0);
      }
    }
    if (inDt == null) return null;
    final now = DateTime.now();
    return (inDt.difference(now).inSeconds / 60).round();
  }

  void _showExtendStayBottomSheet(BuildContext context, ReservationModel b) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) {
        int selectedHours = 2;
        int selectedNights = 1;
        String mode = 'hours';
        bool isSubmitting = false;

        return StatefulBuilder(
          builder: (context, setSheetState) {
            final double baseAmount = b.totalAmount > 0 ? b.totalAmount : 3000.0;
            final int nights = b.nights > 0 ? b.nights : 1;
            final double hourlyRate = (baseAmount / (24 * nights)).clamp(200.0, 10000.0);
            final double nightlyRate = (baseAmount / nights).clamp(1000.0, 50000.0);

            final double estimatedTariff = mode == 'hours'
                ? (selectedHours * hourlyRate).roundToDouble()
                : (selectedNights * nightlyRate).roundToDouble();

            return Container(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
                top: 20,
                left: 20,
                right: 20,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.more_time_rounded, color: Color(0xFFB45309), size: 22),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Extend Stay Booking',
                              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0D1B2A)),
                            ),
                            Text(
                              'Stay longer without changing your room',
                              style: TextStyle(fontSize: 12, color: AppColors.textTertiary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  // Mode Toggle
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setSheetState(() => mode = 'hours'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: mode == 'hours' ? const Color(0xFF0D1B2A) : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'Hourly Extension',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.bold,
                                  color: mode == 'hours' ? Colors.white : AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setSheetState(() => mode = 'nights'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: mode == 'nights' ? const Color(0xFF0D1B2A) : Colors.transparent,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                'Nightly Extension',
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.bold,
                                  color: mode == 'nights' ? Colors.white : AppColors.textSecondary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  if (mode == 'hours') ...[
                    const Text('Additional Hours', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Row(
                      children: [1, 2, 3, 6].map((h) {
                        final isSelected = selectedHours == h;
                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: ChoiceChip(
                              label: Text('+$h hr${h > 1 ? "s" : ""}'),
                              selected: isSelected,
                              selectedColor: const Color(0xFF7C3AED),
                              labelStyle: TextStyle(
                                color: isSelected ? Colors.white : const Color(0xFF0D1B2A),
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                              onSelected: (_) => setSheetState(() => selectedHours = h),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ] else ...[
                    const Text('Additional Nights', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Row(
                      children: [1, 2, 3].map((n) {
                        final isSelected = selectedNights == n;
                        return Expanded(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            child: ChoiceChip(
                              label: Text('+$n Night${n > 1 ? "s" : ""}'),
                              selected: isSelected,
                              selectedColor: const Color(0xFF7C3AED),
                              labelStyle: TextStyle(
                                color: isSelected ? Colors.white : const Color(0xFF0D1B2A),
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                              onSelected: (_) => setSheetState(() => selectedNights = n),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],

                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Estimated Additional Tariff', style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                            Text('Added to your digital folio', style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                          ],
                        ),
                        Text(
                          Formatters.currency(estimatedTariff),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0D1B2A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: const BorderSide(color: Color(0xFFF5C06A), width: 1.2),
                        ),
                      ),
                      icon: isSubmitting
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.check_circle_rounded, size: 18, color: Color(0xFFF5C06A)),
                      label: Text(
                        isSubmitting ? 'Confirming...' : 'Confirm Stay Extension',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                      ),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              setSheetState(() => isSubmitting = true);
                              final prov = context.read<GuestBookingProvider>();
                              final messenger = ScaffoldMessenger.of(context);

                              final success = await prov.extendBooking(
                                bookingId: b.id.isNotEmpty ? b.id : b.bookingId,
                                newCheckOut: '',
                                extendHours: mode == 'hours' ? selectedHours : null,
                                additionalNights: mode == 'nights' ? selectedNights : null,
                                additionalAmount: estimatedTariff,
                                paymentMethod: 'UPI',
                                paidNow: false,
                              );

                              if (sheetCtx.mounted) Navigator.of(sheetCtx).pop();

                              if (success) {
                                messenger.showSnackBar(
                                  const SnackBar(
                                    content: Text('Stay extended successfully! Your checkout time has been updated.'),
                                    backgroundColor: AppColors.success,
                                  ),
                                );
                              } else {
                                messenger.showSnackBar(
                                  SnackBar(
                                    content: Text(prov.errorMessage ?? 'Failed to extend stay. Please contact front desk.'),
                                    backgroundColor: AppColors.error,
                                  ),
                                );
                              }
                            },
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
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
              color: valueColor,
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final bookingProvider = context.watch<GuestBookingProvider>();
    final feedbackProvider = context.watch<GuestFeedbackProvider>();
    final currentBooking = bookingProvider.bookings.firstWhere(
      (b) => b.id == _booking.id || b.bookingId == _booking.bookingId,
      orElse: () => _booking,
    );

    final hasFeedback = currentBooking.hasFeedback ||
        (currentBooking.feedbackRating != null && currentBooking.feedbackRating! > 0) ||
        feedbackProvider.hasFeedbackForBooking(currentBooking.id, currentBooking.bookingId) ||
        feedbackProvider.hasFeedbackForBooking(currentBooking.bookingId, currentBooking.reservationNumber);

    final statusLower = currentBooking.status.toLowerCase();
    final isCompleted = statusLower == 'checked_out' ||
        statusLower == 'checked-out' ||
        statusLower == 'completed' ||
        statusLower == 'settled' ||
        statusLower == 'departed' ||
        statusLower == 'finished';

    final isCurrent = statusLower == 'checked_in' || statusLower == 'checked-in' || statusLower == 'staying' || statusLower == 'in-house';
    final remainingMins = isCurrent ? _getRemainingMinutes(currentBooking) : null;
    final isCheckoutApproaching = remainingMins != null && remainingMins > 0 && remainingMins <= 15;
    final isCheckoutDue = remainingMins != null && remainingMins <= 0;

    final isCancelled = currentBooking.isCancelled || statusLower == 'cancelled';
    final isUpcoming = !isCancelled && !isCurrent && !isCompleted;
    final checkInRemainingMins = isUpcoming ? _getRemainingCheckInMinutes(currentBooking) : null;
    final isCheckinApproaching = checkInRemainingMins != null && checkInRemainingMins > 0 && checkInRemainingMins <= 15;
    final isCheckinDue = checkInRemainingMins != null && checkInRemainingMins <= 0;

    final canCancelBeforeCheckIn = isUpcoming;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D1B2A),
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFFF5C06A), size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Stay #${currentBooking.reservationNumber}',
          style: const TextStyle(
            color: Color(0xFFFFF7E6),
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Check-in Notice Banner (15 min approaching or arrived)
            if (isUpcoming && (isCheckinApproaching || isCheckinDue)) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFD1FAE5),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF10B981), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF10B981).withAlpha(25),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.how_to_reg_rounded, color: Color(0xFF047857), size: 20),
                        const SizedBox(width: 8),
                        Text(
                          isCheckinDue ? 'Check-in Time Has Arrived!' : 'Check-in in $checkInRemainingMins Minutes',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14.5,
                            color: Color(0xFF065F46),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      isCheckinDue
                          ? 'Your room at Hour Stay is ready for check-in! Please present your booking reference #${currentBooking.reservationNumber} at the reception counter to collect your keycard.'
                          : 'Your scheduled check-in time is arriving in $checkInRemainingMins minutes. Front desk is preparing your room key and welcome packet.',
                      style: const TextStyle(fontSize: 12.5, color: Color(0xFF064E3B), height: 1.35),
                    ),
                  ],
                ),
              ),
            ],

            // Check-out Notice Banner (10-15 min approaching or arrived)
            if (isCurrent && (isCheckoutApproaching || isCheckoutDue)) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.amber.withAlpha(25),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.timer_outlined, color: Color(0xFFB45309), size: 20),
                        const SizedBox(width: 8),
                        Text(
                          isCheckoutDue ? 'Check-out Time Has Arrived' : 'Check-out in $remainingMins Minutes',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14.5,
                            color: Color(0xFF92400E),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      isCheckoutDue
                          ? 'Your scheduled check-out time has arrived for Room ${currentBooking.roomNumber}. If you want to stay extra, please extend your booking now.'
                          : 'Your scheduled check-out time is approaching in $remainingMins minutes. If you want to stay extra, extend your booking below.',
                      style: const TextStyle(fontSize: 12.5, color: Color(0xFF78350F), height: 1.35),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFB45309),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.more_time_rounded, size: 16, color: Colors.white),
                        label: const Text(
                          'Extend Your Booking Now',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                        ),
                        onPressed: () => _showExtendStayBottomSheet(context, currentBooking),
                      ),
                    ),
                  ],
                ),
              ),
            ],

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
                      Expanded(
                        child: Text(
                          'Room ${currentBooking.roomNumber.isNotEmpty ? currentBooking.roomNumber : "Assigned on Arrival"}',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      StatusBadge(status: currentBooking.status, fontSize: 12),
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
                      StatusBadge(status: (currentBooking.balance > 0 && currentBooking.paymentStatus.toLowerCase() == 'paid') ? 'Partial' : currentBooking.paymentStatus),
                    ],
                  ),
                  if (currentBooking.balance > 0) ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Outstanding Balance', style: TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.w600)),
                        Text(
                          Formatters.currency(currentBooking.balance),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFFB45309)),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 14),

                  // Extend Stay Button for in-house stays
                  if (isCurrent) ...[
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D1B2A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: Color(0xFFF5C06A), width: 1.2),
                          ),
                        ),
                        icon: const Icon(Icons.more_time_rounded, size: 18, color: Color(0xFFF5C06A)),
                        label: const Text(
                          'Extend Booking / Stay Extra',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        onPressed: () => _showExtendStayBottomSheet(context, currentBooking),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],

                  // 1. Digital Folio & Invoice Button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF0D1B2A),
                        side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
                        backgroundColor: const Color(0xFFF8FAFC),
                        padding: const EdgeInsets.symmetric(vertical: 11),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.receipt_long_rounded, size: 18, color: Color(0xFF0D1B2A)),
                      label: const Text(
                        'Digital Folio',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                      ),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => GuestFolioScreen(
                              booking: currentBooking,
                              bookingId: currentBooking.id,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 8),

                  // 2. Direct Download PDF & Share Row
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0D1B2A),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            elevation: 1,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: const Icon(Icons.download_rounded, size: 15, color: Color(0xFFF5C06A)),
                          label: const Text(
                            'Download PDF',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          onPressed: () => PdfInvoiceService.downloadOrPrintInvoice(context, booking: currentBooking),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF0D1B2A),
                            side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.1),
                            backgroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: const Icon(Icons.share_outlined, size: 15, color: Color(0xFF0D1B2A)),
                          label: const Text(
                            'Share Receipt',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          onPressed: () => PdfInvoiceService.shareInvoice(context, booking: currentBooking),
                        ),
                      ),
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
              if (currentBooking.hasRefundRequest || currentBooking.isRefundCompleted) ...[
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

            // Write Review Button if completed / checked-out and no feedback yet
            if (isCompleted && !hasFeedback) ...[
              CustomButton(
                text: 'Leave a Review for this Stay',
                backgroundColor: AppColors.primary,
                icon: Icons.star_rate,
                onPressed: () async {
                  final result = await Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => GuestAddFeedbackScreen(
                        booking: currentBooking,
                        reservationId: currentBooking.id,
                      ),
                    ),
                  );
                  if (result == true && context.mounted) {
                    context.read<GuestBookingProvider>().markBookingFeedbackGiven(currentBooking.bookingId, currentBooking.id);
                    context.read<GuestFeedbackProvider>().fetchMyFeedbacks(silent: true);
                    context.read<GuestBookingProvider>().fetchDashboardData(silent: true);
                    setState(() {
                      _booking = _booking.copyWith(hasFeedback: true);
                    });
                  }
                },
              ),
              const SizedBox(height: 16),
            ] else if (isCompleted && hasFeedback) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF86EFAC)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Feedback submitted for this stay. Thank you!',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF15803D),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
