import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/payment_model.dart';
import 'package:hour_stay_mobile/providers/manager/payment_provider.dart';
import 'manager_payment_detail_screen.dart';
import 'manager_record_payment_screen.dart';

class ManagerPaymentsScreen extends StatefulWidget {
  final bool isEmbedded;
  const ManagerPaymentsScreen({super.key, this.isEmbedded = false});

  @override
  State<ManagerPaymentsScreen> createState() => _ManagerPaymentsScreenState();
}

class _ManagerPaymentsScreenState extends State<ManagerPaymentsScreen> {
  // Hour Stay Design Tokens
  static const Color navy = Color(0xFF0D1B2A);
  static const Color navyLight = Color(0xFF1B2A4A);
  static const Color purple = Color(0xFF5B21B6);
  static const Color purpleBg = Color(0xFFEDE9FE);
  static const Color purpleLight = Color(0xFF7C3AED);
  static const Color gold = Color(0xFFF5C06A);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color white = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF8A8F98);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color emerald = Color(0xFF10B981);
  static const Color emeraldBg = Color(0xFFDCFCE7);
  static const Color emeraldDark = Color(0xFF065F46);
  static const Color ruby = Color(0xFFE53935);
  static const Color rubyBg = Color(0xFFFEE2E2);
  static const Color rubyDark = Color(0xFF991B1B);
  static const Color amber = Color(0xFFD97706);
  static const Color amberBg = Color(0xFFFEF3C7);
  static const Color amberDark = Color(0xFF92400E);
  static const Color blue = Color(0xFF2563EB);
  static const Color blueBg = Color(0xFFDBEAFE);

  String _searchQuery = '';
  String _selectedFilter = 'All';
  final TextEditingController _searchController = TextEditingController();

  final List<String> _filters = [
    'All',
    'Settled',
    'Pending',
    'Refunded',
    'UPI',
    'Card',
    'Net Banking',
    'Cash',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PaymentProvider>().fetchPayments();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final paymentProvider = context.watch<PaymentProvider>();
    final allPayments = paymentProvider.payments;

    final totalPaid = paymentProvider.settledTotal;
    final pendingAmount = paymentProvider.pendingTotal;
    final refundedAmount = paymentProvider.refundedTotal;

    // Filter payments
    final filtered = allPayments.where((p) {
      final method = (p.method.isNotEmpty ? p.method : p.paymentMethod).toLowerCase();
      final status = p.status.toLowerCase();
      final isSettled = p.isCompleted || status == 'settled' || status == 'paid';
      final isPending = !isSettled && (status == 'pending' || status == 'unpaid' || status == 'due');
      final isRefunded = status == 'refunded' || status == 'refund';

      // Status/Method filter
      bool matchesFilter = true;
      if (_selectedFilter == 'Settled') {
        matchesFilter = isSettled;
      } else if (_selectedFilter == 'Pending') {
        matchesFilter = isPending;
      } else if (_selectedFilter == 'Refunded') {
        matchesFilter = isRefunded;
      } else if (_selectedFilter == 'UPI') {
        matchesFilter = method.contains('upi') || method.contains('qr') || method.contains('gpay') || method.contains('phonepe');
      } else if (_selectedFilter == 'Card') {
        matchesFilter = method.contains('card') || method.contains('credit') || method.contains('debit');
      } else if (_selectedFilter == 'Net Banking') {
        matchesFilter = method.contains('net') || method.contains('bank');
      } else if (_selectedFilter == 'Cash') {
        matchesFilter = method.contains('cash');
      }

      // Search query filter
      bool matchesSearch = true;
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.trim().toLowerCase();
        matchesSearch = p.guestName.toLowerCase().contains(q) ||
            p.bookingId.toLowerCase().contains(q) ||
            p.roomNumber.toLowerCase().contains(q) ||
            p.id.toLowerCase().contains(q) ||
            method.contains(q) ||
            p.amount.toString().contains(q);
      }

      return matchesFilter && matchesSearch;
    }).toList();

    return Scaffold(
      backgroundColor: background,
      appBar: widget.isEmbedded ? null : _buildAppBar(),
      floatingActionButton: Padding(
        padding: EdgeInsets.only(bottom: widget.isEmbedded ? 76 : 0),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: navy.withAlpha(90),
                blurRadius: 14,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: FloatingActionButton.extended(
            backgroundColor: navy,
            foregroundColor: white,
            elevation: 0,
            highlightElevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: gold, width: 1.5),
            ),
            icon: const Icon(Icons.add_circle_rounded, size: 20, color: gold),
            label: const Row(
              children: [
                Text(
                  'Record Payment',
                  style: TextStyle(
                    color: white,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.3,
                  ),
                ),
                SizedBox(width: 4),
                Icon(Icons.arrow_forward_ios_rounded, size: 11, color: gold),
              ],
            ),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ManagerRecordPaymentScreen()),
              );
            },
          ),
        ),
      ),
      body: RefreshIndicator(
        color: gold,
        backgroundColor: navy,
        onRefresh: () => paymentProvider.fetchPayments(),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // 1. Top Summary Banner (Styled identically to guest payments)
            SliverToBoxAdapter(
              child: _buildHeaderSummary(
                totalPaid: totalPaid,
                pendingAmount: pendingAmount,
                refundedAmount: refundedAmount,
                totalTransactions: allPayments.length,
              ),
            ),

            // 2. Search and Filter Bar
            SliverToBoxAdapter(
              child: _buildSearchAndFilterSection(allPayments, filtered.length),
            ),

            // 3. Transactions List / Empty / Error States
            if (paymentProvider.isLoading && allPayments.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(color: gold),
                  ),
                ),
              )
            else if (paymentProvider.errorMessage != null && allPayments.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _buildErrorState(paymentProvider.errorMessage!),
              )
            else if (filtered.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _buildEmptyState(),
              )
            else
              SliverPadding(
                padding: EdgeInsets.fromLTRB(16, 8, 16, widget.isEmbedded ? 120 : 96),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final payment = filtered[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _buildPaymentCard(payment),
                      );
                    },
                    childCount: filtered.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: navy,
      elevation: 0,
      scrolledUnderElevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
        onPressed: () => Navigator.of(context).maybePop(),
      ),
      title: const Text(
        'Payments Ledger',
        style: TextStyle(
          color: white,
          fontWeight: FontWeight.w800,
          fontSize: 16,
          letterSpacing: -0.2,
        ),
      ),
    );
  }

  // ==========================================
  // TOP SUMMARY HEADER (Match Guest UI)
  // ==========================================
  Widget _buildHeaderSummary({
    required double totalPaid,
    required double pendingAmount,
    required double refundedAmount,
    required int totalTransactions,
  }) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 10),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [navy, navyLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: gold.withAlpha(80), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(100),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header title & total count badge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: gold.withAlpha(40),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: gold, width: 1),
                    ),
                    child: const Icon(
                      Icons.account_balance_wallet_rounded,
                      color: gold,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Financial Overview',
                        style: TextStyle(
                          fontSize: 16.5,
                          fontWeight: FontWeight.w800,
                          color: cream,
                          letterSpacing: -0.2,
                        ),
                      ),
                      Text(
                        'Live verified MongoDB billing ledger',
                        style: TextStyle(
                          fontSize: 11,
                          color: Color(0xB3FFF7E6),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: white.withAlpha(25),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: white.withAlpha(40)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.receipt_long_rounded, color: gold, size: 13),
                    const SizedBox(width: 4),
                    Text(
                      '$totalTransactions Txns',
                      style: const TextStyle(
                        color: cream,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // 3 KPI Cards
          Row(
            children: [
              // 1. Total Paid / Settled
              Expanded(
                child: _buildKpiCard(
                  title: 'Settled Revenue',
                  amount: totalPaid,
                  icon: Icons.check_circle_rounded,
                  iconColor: emerald,
                  bgColor: emerald.withAlpha(25),
                  borderColor: emerald.withAlpha(80),
                ),
              ),
              const SizedBox(width: 8),

              // 2. Pending Due
              Expanded(
                child: _buildKpiCard(
                  title: 'Pending Due',
                  amount: pendingAmount,
                  icon: Icons.hourglass_top_rounded,
                  iconColor: amber,
                  bgColor: amber.withAlpha(25),
                  borderColor: amber.withAlpha(80),
                ),
              ),
              const SizedBox(width: 8),

              // 3. Refunded
              Expanded(
                child: _buildKpiCard(
                  title: 'Refunds Issued',
                  amount: refundedAmount,
                  icon: Icons.currency_exchange_rounded,
                  iconColor: gold,
                  bgColor: purple.withAlpha(50),
                  borderColor: purpleLight.withAlpha(100),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required double amount,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required Color borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: iconColor),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xCCFFF7E6),
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              Formatters.currency(amount),
              style: const TextStyle(
                color: white,
                fontSize: 15,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SEARCH & FILTER BAR
  // ==========================================
  Widget _buildSearchAndFilterSection(List<PaymentModel> allPayments, int filteredCount) {
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search Field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cardBorder),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(8),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: TextField(
                controller: _searchController,
                onChanged: (val) => setState(() => _searchQuery = val),
                style: const TextStyle(fontSize: 13.5, color: navy, fontWeight: FontWeight.w600),
                decoration: InputDecoration(
                  hintText: 'Search guest, booking ID, room number...',
                  hintStyle: const TextStyle(fontSize: 12.5, color: muted),
                  prefixIcon: const Icon(Icons.search_rounded, color: purple, size: 20),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 18, color: muted),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          // Horizontal Navigation Filter Chips
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                clipBehavior: Clip.hardEdge,
                padding: EdgeInsets.zero,
                itemCount: _filters.length,
                separatorBuilder: (context, index) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final filter = _filters[index];
                  final isSelected = _selectedFilter == filter;
                  final count = _getFilterCount(filter, allPayments);

                  return InkWell(
                    onTap: () => setState(() => _selectedFilter = filter),
                    borderRadius: BorderRadius.circular(20),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
                      decoration: BoxDecoration(
                        color: isSelected ? navy : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? navy : cardBorder,
                          width: 1.2,
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: navy.withAlpha(35),
                                  blurRadius: 6,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : null,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            filter,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              color: isSelected ? cream : navy,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6.5, vertical: 2),
                            decoration: BoxDecoration(
                              color: isSelected ? gold : const Color(0xFFE2E8F0),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$count',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: isSelected ? navy : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Count & Reset
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Transactions ($filteredCount)',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: navy,
                    letterSpacing: -0.2,
                  ),
                ),
                if (_selectedFilter != 'All' || _searchQuery.isNotEmpty)
                  InkWell(
                    onTap: () {
                      setState(() {
                        _selectedFilter = 'All';
                        _searchQuery = '';
                        _searchController.clear();
                      });
                    },
                    borderRadius: BorderRadius.circular(6),
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Text(
                        'Reset Filters',
                        style: TextStyle(
                          color: purple,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 4),
        ],
      ),
    );
  }

  int _getFilterCount(String filter, List<PaymentModel> allPayments) {
    if (filter == 'All') return allPayments.length;
    return allPayments.where((p) {
      final statusStr = p.status.toLowerCase();
      final isSettled = p.isCompleted || statusStr == 'settled' || statusStr == 'paid';
      final isPending = !isSettled && (statusStr == 'pending' || statusStr == 'unpaid' || statusStr == 'due');
      final isRefunded = statusStr == 'refunded' || statusStr == 'refund';
      final method = (p.method.isNotEmpty ? p.method : p.paymentMethod).toLowerCase();

      if (filter == 'Settled') return isSettled;
      if (filter == 'Pending') return isPending;
      if (filter == 'Refunded') return isRefunded;
      if (filter == 'UPI') return method.contains('upi') || method.contains('qr') || method.contains('gpay') || method.contains('phonepe');
      if (filter == 'Card') return method.contains('card') || method.contains('credit') || method.contains('debit');
      if (filter == 'Net Banking') return method.contains('net') || method.contains('bank');
      if (filter == 'Cash') return method.contains('cash');
      return true;
    }).length;
  }

  // ==========================================
  // PAYMENT TRANSACTION CARD (Guest Style)
  // ==========================================
  Widget _buildPaymentCard(PaymentModel p) {
    final statusConfig = _getStatusConfig(p.status);
    final methodConfig = _getMethodConfig(p.method.isNotEmpty ? p.method : p.paymentMethod);
    final statusStr = p.status.toLowerCase();
    final isSettled = p.isCompleted || statusStr == 'settled' || statusStr == 'paid';
    final isRefunded = statusStr == 'refunded' || statusStr == 'refund';

    final idDisplay = p.id.isNotEmpty
        ? (p.id.length > 8 ? p.id.substring(p.id.length - 8).toUpperCase() : p.id.toUpperCase())
        : (p.bookingId.isNotEmpty ? 'PAY-${p.bookingId}' : 'HS-TXN');

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: !isSettled && !isRefunded ? amber.withAlpha(120) : cardBorder,
          width: !isSettled && !isRefunded ? 1.3 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(10),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => _openPaymentDetail(p),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Top Row: Payment ID & Status Badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Payment ID & Copy
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.receipt_rounded, size: 12, color: navy),
                              const SizedBox(width: 4),
                              Text(
                                '#$idDisplay',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: navy,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 4),
                        IconButton(
                          icon: const Icon(Icons.copy_rounded, size: 14, color: muted),
                          tooltip: 'Copy ID',
                          constraints: const BoxConstraints(),
                          padding: const EdgeInsets.all(4),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: p.id.isNotEmpty ? p.id : idDisplay));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('ID "$idDisplay" copied to clipboard!'),
                                duration: const Duration(seconds: 2),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                        ),
                      ],
                    ),

                    // Status Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusConfig.bgColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: statusConfig.borderColor),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(statusConfig.icon, size: 12, color: statusConfig.color),
                          const SizedBox(width: 4),
                          Text(
                            isRefunded ? 'Refunded' : (isSettled ? 'Settled' : 'Pending'),
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: statusConfig.color,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 2. Guest, Room & Booking Info
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: cream,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: gold.withAlpha(120), width: 1),
                      ),
                      child: const Icon(Icons.person_rounded, color: navy, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            p.guestName.isNotEmpty ? p.guestName : 'Direct Guest Folio',
                            style: const TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: navy,
                              letterSpacing: -0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 3),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6.5, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFBFDBFE)),
                                ),
                                child: Text(
                                  p.roomNumber.isNotEmpty ? 'Room ${p.roomNumber}' : 'Room Unassigned',
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF1E40AF),
                                  ),
                                ),
                              ),
                              if (p.bookingId.isNotEmpty) ...[
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    'Booking: #${p.bookingId}',
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      color: muted,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 12),

                // 3. Amount & Payment Method / Date
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Amount Paid
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isRefunded ? 'Refunded Amount' : 'Amount Settled',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: muted,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          Formatters.currency(p.amount),
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: isRefunded ? ruby : (isSettled ? navy : amberDark),
                            letterSpacing: -0.4,
                          ),
                        ),
                      ],
                    ),

                    // Payment Method & Date
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        // Method Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: methodConfig.bgColor,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: methodConfig.borderColor),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(methodConfig.icon, size: 12, color: methodConfig.color),
                              const SizedBox(width: 4),
                              Text(
                                (p.method.isNotEmpty ? p.method : p.paymentMethod).toUpperCase(),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: methodConfig.color,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.access_time_rounded, size: 11, color: muted),
                            const SizedBox(width: 3),
                            Text(
                              p.createdAt.isNotEmpty
                                  ? Formatters.dateTime(p.createdAt)
                                  : 'Recently recorded',
                              style: const TextStyle(
                                fontSize: 10.5,
                                color: muted,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // 4. Action Bar: Full-Width Row across the card (Share, Settle/Refund, View Details)
                Row(
                  children: [
                    // 1. Copy Summary Button
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          final summary = 'Payment Receipt: ${Formatters.currency(p.amount)} for ${p.guestName} (Room ${p.roomNumber}) - Ref: $idDisplay';
                          Clipboard.setData(ClipboardData(text: summary));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Payment summary copied to clipboard!'),
                              duration: Duration(seconds: 2),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        icon: const Icon(Icons.share_outlined, size: 14, color: navy),
                        label: const FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            'Copy Info',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: navy,
                            ),
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          side: const BorderSide(color: cardBorder, width: 1.1),
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
                          backgroundColor: background,
                        ),
                      ),
                    ),
                    if (!isSettled && !isRefunded) ...[
                      const SizedBox(width: 6),
                      // 2. Mark Settled / Settle Quick Action (Only shown for pending payments)
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _updateStatus(p, 'Settled'),
                          icon: const Icon(Icons.check_circle_outline, size: 14, color: white),
                          label: const FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              'Settle',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: white,
                              ),
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: emerald,
                            foregroundColor: white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(width: 6),

                    // 3. View Full Details Page
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _openPaymentDetail(p),
                        icon: const Icon(Icons.arrow_forward_rounded, size: 14, color: white),
                        label: const FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            'Details',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: white,
                            ),
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: navy,
                          foregroundColor: white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
                        ),
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

  void _openPaymentDetail(PaymentModel p) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ManagerPaymentDetailScreen(payment: p),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: cream,
                shape: BoxShape.circle,
                border: Border.all(color: gold.withAlpha(120), width: 1.5),
              ),
              child: const Icon(Icons.receipt_long_rounded, size: 34, color: gold),
            ),
            const SizedBox(height: 18),
            const Text(
              'No Payment Records Found',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: navy,
                letterSpacing: -0.2,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'No transactions match your current search query or active filter criteria.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: muted, height: 1.4),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_selectedFilter != 'All' || _searchQuery.isNotEmpty) ...[
                  OutlinedButton.icon(
                    onPressed: () {
                      setState(() {
                        _selectedFilter = 'All';
                        _searchQuery = '';
                        _searchController.clear();
                      });
                    },
                    icon: const Icon(Icons.refresh_rounded, size: 16, color: navy),
                    label: const Text('Reset Filters', style: TextStyle(fontWeight: FontWeight.w700, color: navy)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: cardBorder),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ManagerRecordPaymentScreen()),
                    );
                  },
                  icon: const Icon(Icons.add_rounded, size: 16, color: white),
                  label: const Text(
                    'Record Payment',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navy,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: gold),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: rubyBg,
                shape: BoxShape.circle,
                border: Border.all(color: ruby.withAlpha(100)),
              ),
              child: const Icon(Icons.error_outline_rounded, size: 30, color: ruby),
            ),
            const SizedBox(height: 16),
            const Text(
              'Unable to Load Payments',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12.5, color: muted),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () => context.read<PaymentProvider>().fetchPayments(),
              icon: const Icon(Icons.refresh_rounded, size: 16, color: white),
              label: const Text(
                'Retry Connection',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: gold),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateStatus(PaymentModel p, String newStatus) async {
    final ok = await context.read<PaymentProvider>().updatePaymentStatus(p.id, newStatus);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ok ? 'Payment status updated to $newStatus' : 'Failed to update payment status'),
          backgroundColor: ok ? emerald : ruby,
        ),
      );
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================
  _StatusConfig _getStatusConfig(String status) {
    final s = status.toLowerCase();
    if (s == 'successful' || s == 'settled' || s == 'paid' || s == 'completed') {
      return _StatusConfig(
        color: emeraldDark,
        bgColor: emeraldBg,
        borderColor: emerald.withAlpha(100),
        icon: Icons.check_circle_rounded,
      );
    } else if (s == 'pending' || s == 'unpaid' || s == 'due') {
      return _StatusConfig(
        color: amberDark,
        bgColor: amberBg,
        borderColor: amber.withAlpha(100),
        icon: Icons.hourglass_top_rounded,
      );
    } else if (s == 'refunded' || s == 'refund') {
      return _StatusConfig(
        color: rubyDark,
        bgColor: rubyBg,
        borderColor: ruby.withAlpha(100),
        icon: Icons.currency_exchange_rounded,
      );
    } else if (s == 'failed' || s == 'cancelled') {
      return _StatusConfig(
        color: rubyDark,
        bgColor: rubyBg,
        borderColor: ruby.withAlpha(100),
        icon: Icons.cancel_rounded,
      );
    }
    return _StatusConfig(
      color: navy,
      bgColor: const Color(0xFFF1F5F9),
      borderColor: cardBorder,
      icon: Icons.info_outline_rounded,
    );
  }

  _MethodConfig _getMethodConfig(String method) {
    final m = method.toLowerCase();
    if (m.contains('upi') || m.contains('qr') || m.contains('gpay') || m.contains('phonepe')) {
      return _MethodConfig(
        color: const Color(0xFF0F766E),
        bgColor: const Color(0xFFCCFBF1),
        borderColor: const Color(0xFF5EEAD4),
        icon: Icons.qr_code_2_rounded,
      );
    } else if (m.contains('card') || m.contains('credit') || m.contains('debit')) {
      return _MethodConfig(
        color: blue,
        bgColor: blueBg,
        borderColor: const Color(0xFF93C5FD),
        icon: Icons.credit_card_rounded,
      );
    } else if (m.contains('net') || m.contains('bank')) {
      return _MethodConfig(
        color: purple,
        bgColor: purpleBg,
        borderColor: const Color(0xFFC4B5FD),
        icon: Icons.account_balance_rounded,
      );
    } else if (m.contains('cash')) {
      return _MethodConfig(
        color: amberDark,
        bgColor: amberBg,
        borderColor: amber.withAlpha(100),
        icon: Icons.payments_rounded,
      );
    }
    return _MethodConfig(
      color: navy,
      bgColor: const Color(0xFFF1F5F9),
      borderColor: cardBorder,
      icon: Icons.payment_rounded,
    );
  }
}

class _StatusConfig {
  final Color color;
  final Color bgColor;
  final Color borderColor;
  final IconData icon;

  const _StatusConfig({
    required this.color,
    required this.bgColor,
    required this.borderColor,
    required this.icon,
  });
}

class _MethodConfig {
  final Color color;
  final Color bgColor;
  final Color borderColor;
  final IconData icon;

  const _MethodConfig({
    required this.color,
    required this.bgColor,
    required this.borderColor,
    required this.icon,
  });
}
