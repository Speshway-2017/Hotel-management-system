import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/payment_model.dart';
import 'package:hour_stay_mobile/providers/manager/payment_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_button.dart';
import 'package:hour_stay_mobile/colours.dart';

class ManagerPaymentDetailScreen extends StatefulWidget {
  final PaymentModel payment;

  const ManagerPaymentDetailScreen({super.key, required this.payment});

  @override
  State<ManagerPaymentDetailScreen> createState() => _ManagerPaymentDetailScreenState();
}

class _ManagerPaymentDetailScreenState extends State<ManagerPaymentDetailScreen> {

  late PaymentModel _payment;
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _payment = widget.payment;
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _isUpdating = true);
    final messenger = ScaffoldMessenger.of(context);
    final ok = await context.read<PaymentProvider>().updatePaymentStatus(_payment.id, newStatus);
    setState(() => _isUpdating = false);

    if (mounted) {
      if (ok) {
        setState(() {
          _payment = _payment.copyWith(status: newStatus);
        });
        messenger.showSnackBar(
          SnackBar(
            content: Text('Payment status updated to $newStatus'),
            backgroundColor: emerald,
          ),
        );
      } else {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Failed to update payment status'),
            backgroundColor: ruby,
          ),
        );
      }
    }
  }

  Future<void> _confirmDelete() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Payment Record', style: TextStyle(fontWeight: FontWeight.w700, color: navy)),
        content: Text('Are you sure you want to delete the payment record of ${Formatters.currency(_payment.amount)} for ${_payment.guestName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: muted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: ruby, foregroundColor: white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final ok = await context.read<PaymentProvider>().deletePayment(_payment.id);
      if (ok && mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment record deleted'), backgroundColor: emerald),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusStr = _payment.status.toLowerCase();
    final isSettled = _payment.isCompleted || statusStr == 'settled' || statusStr == 'paid';
    final isRefunded = statusStr == 'refunded' || statusStr == 'refund';

    final statusLabel = isRefunded ? 'Refunded' : (isSettled ? 'Settled' : 'Pending');
    final statusColor = isRefunded ? ruby : (isSettled ? emerald : amber);
    final statusBgColor = isRefunded ? rubyBg : (isSettled ? emeraldBg : amberBg);
    final statusIcon = isRefunded
        ? Icons.replay_rounded
        : (isSettled ? Icons.check_circle_rounded : Icons.schedule_rounded);

    final methodStr = (_payment.method.isNotEmpty ? _payment.method : _payment.paymentMethod).toUpperCase();
    IconData methodIcon = Icons.payment_rounded;
    Color methodColor = purple;
    Color methodBg = purpleBg;

    if (methodStr.contains('UPI') || methodStr.contains('QR')) {
      methodIcon = Icons.qr_code_2_rounded;
      methodColor = purple;
      methodBg = purpleBg;
    } else if (methodStr.contains('CASH')) {
      methodIcon = Icons.payments_rounded;
      methodColor = emerald;
      methodBg = emeraldBg;
    } else if (methodStr.contains('CARD')) {
      methodIcon = Icons.credit_card_rounded;
      methodColor = blue;
      methodBg = blueBg;
    } else if (methodStr.contains('NET') || methodStr.contains('BANK')) {
      methodIcon = Icons.account_balance_rounded;
      methodColor = amber;
      methodBg = amberBg;
    }

    final displayRef = _payment.bookingId.isNotEmpty
        ? (_payment.bookingId.startsWith('#') ? _payment.bookingId : '#${_payment.bookingId}')
        : (_payment.id.isNotEmpty ? '#${_payment.id.length > 8 ? _payment.id.substring(_payment.id.length - 6).toUpperCase() : _payment.id.toUpperCase()}' : 'Direct Folio');

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: navy,
        foregroundColor: white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
          tooltip: 'Back',
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Text(
          'Payment $displayRef',
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: white,
            letterSpacing: -0.2,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: ruby),
            tooltip: 'Delete Payment',
            onPressed: _confirmDelete,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Hero Amount & Status Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [navy, Color(0xFF1E1B4B), Color(0xFF2E1065)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: gold.withAlpha(70), width: 1.2),
                boxShadow: [
                  BoxShadow(
                    color: navy.withAlpha(80),
                    blurRadius: 14,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'TRANSACTION AMOUNT',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                          color: white.withAlpha(170),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusBgColor,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: statusColor.withAlpha(80), width: 1),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(statusIcon, size: 12, color: statusColor),
                            const SizedBox(width: 4),
                            Text(
                              statusLabel,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: statusColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    Formatters.currency(_payment.amount),
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      color: gold,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1, color: Color(0x33FFFFFF)),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.access_time_rounded, size: 14, color: cream),
                          const SizedBox(width: 5),
                          Text(
                            Formatters.dateTime(_payment.createdAt),
                            style: const TextStyle(
                              fontSize: 12,
                              color: cream,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: white.withAlpha(20),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _payment.propertyId.isNotEmpty ? _payment.propertyId : 'Property Folio',
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w700,
                            color: gold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // 2. Guest & Reservation Information
            const Text(
              'Guest & Stay Information',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: navy),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(5),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  _buildDetailRow(
                    icon: Icons.person_rounded,
                    label: 'Guest Name',
                    value: _payment.guestName.isNotEmpty ? _payment.guestName : 'Guest',
                  ),
                  const Divider(height: 20, color: cardBorder),
                  _buildDetailRow(
                    icon: Icons.hotel_rounded,
                    label: 'Assigned Room',
                    value: _payment.roomNumber.isNotEmpty ? 'Room ${_payment.roomNumber}' : 'Unassigned',
                    trailing: _payment.roomNumber.isNotEmpty
                        ? Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: cream,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: gold.withAlpha(120)),
                            ),
                            child: const Text(
                              'Standard Stay',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: navy),
                            ),
                          )
                        : null,
                  ),
                  const Divider(height: 20, color: cardBorder),
                  _buildDetailRow(
                    icon: Icons.bookmark_rounded,
                    label: 'Booking Reference',
                    value: _payment.bookingId.isNotEmpty ? '#${_payment.bookingId}' : 'Direct Folio Settlement',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // 3. Payment Method & Transaction Technical Details
            const Text(
              'Payment Method & Audit Details',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: navy),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: cardBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(5),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  _buildDetailRow(
                    icon: methodIcon,
                    iconColor: methodColor,
                    label: 'Payment Method',
                    value: methodStr.isNotEmpty ? methodStr : 'UPI / ONLINE',
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: methodBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        methodStr.isNotEmpty ? methodStr : 'UPI',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: methodColor,
                        ),
                      ),
                    ),
                  ),
                  const Divider(height: 20, color: cardBorder),
                  _buildDetailRow(
                    icon: Icons.receipt_long_rounded,
                    label: 'Transaction ID / Folio ID',
                    value: _payment.id.isNotEmpty ? _payment.id : 'N/A',
                  ),
                  const Divider(height: 20, color: cardBorder),
                  _buildDetailRow(
                    icon: Icons.verified_rounded,
                    label: 'Payment Gateway / Settlement State',
                    value: isRefunded ? 'Refund Processed' : (isSettled ? 'Verified & Settled' : 'Payment Due / Awaiting Settlement'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 4. Financial Lifecycle Action Operations
            const Text(
              'Payment Operations',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: navy),
            ),
            const SizedBox(height: 12),
            if (isRefunded) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: ruby.withAlpha(15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ruby.withAlpha(50)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.replay_rounded, color: ruby, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'This payment has been fully refunded. No further settlement action is required.',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: ruby,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ] else if (isSettled) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: emerald.withAlpha(15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: emerald.withAlpha(50)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle_rounded, color: emerald, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'This transaction is settled and verified in the ledger.',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF065F46),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              CustomButton(
                text: 'Mark Settled',
                backgroundColor: emerald,
                textColor: white,
                icon: Icons.check_circle_rounded,
                isLoading: _isUpdating,
                onPressed: () => _updateStatus('Settled'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    Color? iconColor,
    required String label,
    required String value,
    Widget? trailing,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: (iconColor ?? muted).withAlpha(20),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: iconColor ?? navy),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 11.5, color: muted, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: navy),
              ),
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }
}
