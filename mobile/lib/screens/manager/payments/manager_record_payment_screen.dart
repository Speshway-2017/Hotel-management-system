import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../providers/manager/payment_provider.dart';
import 'package:hour_stay_mobile/colours.dart';

class ManagerRecordPaymentScreen extends StatefulWidget {
  const ManagerRecordPaymentScreen({super.key});

  @override
  State<ManagerRecordPaymentScreen> createState() =>
      _ManagerRecordPaymentScreenState();
}

class _ManagerRecordPaymentScreenState
    extends State<ManagerRecordPaymentScreen> {

  final _formKey = GlobalKey<FormState>();
  final _guestNameController = TextEditingController();
  final _bookingIdController = TextEditingController();
  final _roomNumberController = TextEditingController(text: '101');
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();

  String _selectedMethod = 'UPI';
  String _selectedStatus = 'Settled';
  bool _isSubmitting = false;

  final List<String> _methods = [
    'UPI',
    'Card',
    'Cash',
    'Net Banking',
    'Bank Transfer',
  ];

  final List<String> _statuses = [
    'Settled',
    'Pending',
    'Refunded',
  ];

  final List<int> _presetAmounts = [1000, 2500, 5000, 10000, 25000];

  @override
  void dispose() {
    _guestNameController.dispose();
    _bookingIdController.dispose();
    _roomNumberController.dispose();
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  IconData _getMethodIcon(String method) {
    switch (method) {
      case 'UPI':
        return Icons.qr_code_rounded;
      case 'Card':
        return Icons.credit_card_rounded;
      case 'Cash':
        return Icons.payments_rounded;
      case 'Net Banking':
        return Icons.account_balance_rounded;
      case 'Bank Transfer':
        return Icons.swap_horiz_rounded;
      default:
        return Icons.payment_rounded;
    }
  }

  Future<void> _submitPayment() async {
    if (!_formKey.currentState!.validate()) return;

    final parsedAmount = double.tryParse(_amountController.text.trim()) ?? 0;
    if (parsedAmount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid amount greater than ₹0'),
          backgroundColor: ruby,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final payload = {
      'guestName': _guestNameController.text.trim(),
      'bookingId': _bookingIdController.text.trim().isNotEmpty
          ? _bookingIdController.text.trim()
          : 'BK-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      'roomNumber': _roomNumberController.text.trim().isNotEmpty
          ? _roomNumberController.text.trim()
          : '101',
      'amount': parsedAmount,
      'paymentMethod': _selectedMethod,
      'method': _selectedMethod,
      'status': _selectedStatus,
      'notes': _notesController.text.trim(),
      'date': DateTime.now().toIso8601String(),
    };

    final ok = await context.read<PaymentProvider>().recordPayment(payload);

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: white, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Payment of ${Formatters.currency(parsedAmount)} recorded successfully!',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          backgroundColor: emerald,
        ),
      );
      Navigator.of(context).pop(true);
    } else {
      final err = context.read<PaymentProvider>().errorMessage ??
          'Failed to record payment';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err),
          backgroundColor: ruby,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final parsedAmount = double.tryParse(_amountController.text.trim()) ?? 0;

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: navy,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: gold, size: 20),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: const Text(
          'Record New Payment',
          style: TextStyle(
            color: white,
            fontWeight: FontWeight.w800,
            fontSize: 16,
            letterSpacing: -0.2,
          ),
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        decoration: BoxDecoration(
          color: white,
          border: const Border(top: BorderSide(color: cardBorder)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(8),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: _isSubmitting ? null : _submitPayment,
          style: ElevatedButton.styleFrom(
            backgroundColor: navy,
            foregroundColor: white,
            disabledBackgroundColor: navy.withAlpha(150),
            padding: const EdgeInsets.symmetric(vertical: 14),
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Color(0xFFF5C06A), width: 1.5),
            ),
          ),
          child: _isSubmitting
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(white),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.add_circle_rounded, size: 18, color: gold),
                    const SizedBox(width: 8),
                    Text(
                      parsedAmount > 0
                          ? 'Save & Record ${Formatters.currency(parsedAmount)}'
                          : 'Save & Record Payment',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                        color: white,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.arrow_forward_ios_rounded, size: 11, color: gold),
                  ],
                ),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Amount Input Card with Presets
              _buildAmountSection(),
              const SizedBox(height: 16),

              // 2. Guest & Reservation Information
              _buildGuestInfoSection(),
              const SizedBox(height: 16),

              // 3. Payment Method Selector
              _buildMethodSection(),
              const SizedBox(height: 16),

              // 4. Payment Status Selector
              _buildStatusSection(),
              const SizedBox(height: 16),

              // 5. Notes & Transaction Reference
              _buildNotesSection(),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  // --- 1. Amount Section ---
  Widget _buildAmountSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(4),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.currency_rupee_rounded, size: 16, color: purple),
              SizedBox(width: 6),
              Text(
                'PAYMENT AMOUNT',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF64748B),
                  letterSpacing: 0.5,
                ),
              ),
              Spacer(),
              Text(
                '* Required',
                style: TextStyle(fontSize: 10, color: ruby, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Amount TextField
          TextFormField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w900,
              color: navy,
              letterSpacing: -0.5,
            ),
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              prefixIcon: const Padding(
                padding: EdgeInsets.fromLTRB(14, 12, 8, 12),
                child: Text(
                  '₹',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: purple,
                  ),
                ),
              ),
              hintText: '0.00',
              hintStyle: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: muted.withAlpha(120),
              ),
              filled: true,
              fillColor: background,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: cardBorder),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: cardBorder),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: purple, width: 1.5),
              ),
            ),
            validator: (v) {
              if (v == null || v.trim().isEmpty) {
                return 'Please enter payment amount';
              }
              final n = double.tryParse(v.trim());
              if (n == null || n <= 0) {
                return 'Amount must be greater than 0';
              }
              return null;
            },
          ),
          const SizedBox(height: 12),

          // Preset Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _presetAmounts.map((amt) {
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: InkWell(
                    onTap: () {
                      setState(() {
                        _amountController.text = amt.toString();
                      });
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: background,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Text(
                        '+ ₹$amt',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: navy,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  // --- 2. Guest Information Section ---
  Widget _buildGuestInfoSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(4),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.person_outline_rounded, size: 16, color: purple),
              SizedBox(width: 6),
              Text(
                'GUEST & BOOKING DETAILS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF64748B),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Guest Name
          _buildInputLabel('Guest Name *'),
          TextFormField(
            controller: _guestNameController,
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: navy),
            decoration: _buildInputDecoration(
              hint: 'e.g. Rahul Sharma',
              icon: Icons.person_rounded,
            ),
            validator: (v) =>
                (v == null || v.trim().isEmpty) ? 'Please enter guest name' : null,
          ),
          const SizedBox(height: 12),

          // Booking ID & Room Number Row
          Row(
            children: [
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildInputLabel('Booking ID'),
                    TextFormField(
                      controller: _bookingIdController,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navy),
                      decoration: _buildInputDecoration(
                        hint: 'e.g. BK-98214',
                        icon: Icons.bookmark_border_rounded,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildInputLabel('Room No.'),
                    TextFormField(
                      controller: _roomNumberController,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navy),
                      decoration: _buildInputDecoration(
                        hint: 'e.g. 101',
                        icon: Icons.meeting_room_rounded,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- 3. Payment Method Section ---
  Widget _buildMethodSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(4),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.account_balance_wallet_outlined, size: 16, color: purple),
              SizedBox(width: 6),
              Text(
                'PAYMENT METHOD',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF64748B),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _methods.map((m) {
              final isSelected = _selectedMethod == m;
              return InkWell(
                onTap: () => setState(() => _selectedMethod = m),
                borderRadius: BorderRadius.circular(10),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? navy : background,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected ? navy : cardBorder,
                      width: 1.2,
                    ),
                    boxShadow: isSelected
                        ? [
                            BoxShadow(
                              color: navy.withAlpha(30),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ]
                        : null,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _getMethodIcon(m),
                        size: 14,
                        color: isSelected ? gold : const Color(0xFF64748B),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        m,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                          color: isSelected ? white : navy,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  // --- 4. Payment Status Section ---
  Widget _buildStatusSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(4),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.flag_outlined, size: 16, color: purple),
              SizedBox(width: 6),
              Text(
                'PAYMENT STATUS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF64748B),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          Row(
            children: _statuses.map((st) {
              final isSelected = _selectedStatus == st;
              Color stColor = emerald;
              Color stBg = emeraldBg;

              if (st == 'Pending') {
                stColor = amber;
                stBg = amberBg;
              } else if (st == 'Refunded') {
                stColor = ruby;
                stBg = rubyBg;
              }

              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: InkWell(
                    onTap: () => setState(() => _selectedStatus = st),
                    borderRadius: BorderRadius.circular(10),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: isSelected ? stColor : stBg.withAlpha(120),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? stColor : stColor.withAlpha(60),
                          width: 1.2,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          st,
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w700,
                            color: isSelected ? white : stColor,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  // --- 5. Notes Section ---
  Widget _buildNotesSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(4),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.notes_rounded, size: 16, color: purple),
              SizedBox(width: 6),
              Text(
                'TRANSACTION NOTES / REMARKS (OPTIONAL)',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF64748B),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _notesController,
            maxLines: 2,
            style: const TextStyle(fontSize: 12.5, color: navy, fontWeight: FontWeight.w600),
            decoration: _buildInputDecoration(
              hint: 'e.g. Advance room tariff settlement or restaurant invoice #442',
              icon: Icons.edit_note_rounded,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w700,
          color: navy,
        ),
      ),
    );
  }

  InputDecoration _buildInputDecoration({
    required String hint,
    required IconData icon,
  }) {
    return InputDecoration(
      prefixIcon: Icon(icon, size: 16, color: muted),
      hintText: hint,
      hintStyle: TextStyle(fontSize: 12, color: muted.withAlpha(160)),
      filled: true,
      fillColor: background,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
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
        borderSide: const BorderSide(color: purple, width: 1.5),
      ),
    );
  }
}
