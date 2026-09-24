import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../models/guest_payment_model.dart';
import '../../../providers/guest/guest_payment_provider.dart';
import '../folio/guest_folio_screen.dart';
import '../../../services/pdf_invoice_service.dart';
import 'package:hour_stay_mobile/colours.dart';

class GuestPaymentsScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigateTab;

  const GuestPaymentsScreen({super.key, this.onNavigateTab});

  @override
  State<GuestPaymentsScreen> createState() => _GuestPaymentsScreenState();
}

class _GuestPaymentsScreenState extends State<GuestPaymentsScreen> {

  String _searchQuery = '';
  String _selectedFilter = 'All';
  final TextEditingController _searchController = TextEditingController();

  final List<String> _filters = [
    'All',
    'Successful',
    'Pending',
    'Refunded',
    'Partially Refunded',
    'UPI',
    'Card',
    'Net Banking',
    'Cash',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GuestPaymentProvider>().fetchPayments();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final paymentProvider = context.watch<GuestPaymentProvider>();
    final allPayments = paymentProvider.payments;
    final summary = paymentProvider.summary;

    final totalPaid = paymentProvider.totalPaid;
    final pendingAmount = paymentProvider.pendingAmount;
    final refundedAmount = paymentProvider.refundedAmount;

    // Filter payments
    final filtered = allPayments.where((p) {
      final method = p.paymentMethod.toLowerCase();

      // Status/Method filter
      bool matchesFilter = true;
      if (_selectedFilter == 'Successful') {
        matchesFilter = p.isSuccessful;
      } else if (_selectedFilter == 'Pending') {
        matchesFilter = p.isPending || p.hasPendingBalance;
      } else if (_selectedFilter == 'Refunded') {
        matchesFilter = p.isRefunded;
      } else if (_selectedFilter == 'Partially Refunded') {
        matchesFilter = p.isPartiallyRefunded;
      } else if (_selectedFilter == 'UPI') {
        matchesFilter = method.contains('upi') || method.contains('gpay') || method.contains('phonepe');
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
        matchesSearch = p.paymentId.toLowerCase().contains(q) ||
            p.bookingId.toLowerCase().contains(q) ||
            p.hotel.toLowerCase().contains(q) ||
            p.room.toLowerCase().contains(q) ||
            p.roomNumber.toLowerCase().contains(q) ||
            p.paymentMethod.toLowerCase().contains(q) ||
            p.status.toLowerCase().contains(q) ||
            p.amount.toString().contains(q);
      }

      return matchesFilter && matchesSearch;
    }).toList();

    return Scaffold(
      backgroundColor: background,
      body: RefreshIndicator(
        color: gold,
        backgroundColor: navy,
        onRefresh: () => context.read<GuestPaymentProvider>().fetchPayments(),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // 1. Top Summary Banner
            SliverToBoxAdapter(
              child: _buildHeaderSummary(
                totalPaid: totalPaid,
                pendingAmount: pendingAmount,
                refundedAmount: refundedAmount,
                totalTransactions: summary.totalTransactions > 0 ? summary.totalTransactions : allPayments.length,
              ),
            ),

            // 2. Search and Filter Bar
            SliverToBoxAdapter(
              child: _buildSearchAndFilterSection(allPayments),
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
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
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

  // ==========================================
  // TOP SUMMARY CARDS
  // ==========================================
  Widget _buildHeaderSummary({
    required double totalPaid,
    required double pendingAmount,
    required double refundedAmount,
    required int totalTransactions,
  }) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 12),
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
              Expanded(
                child: Row(
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
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Payment Summary',
                            style: TextStyle(
                              fontSize: 16.5,
                              fontWeight: FontWeight.w800,
                              color: cream,
                              letterSpacing: -0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            'Live verified billing ledger',
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xB3FFF7E6),
                              fontWeight: FontWeight.w500,
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
              const SizedBox(width: 8),
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
              // 1. Total Paid
              Expanded(
                child: _buildKpiCard(
                  title: 'Total Paid',
                  amount: totalPaid,
                  icon: Icons.check_circle_rounded,
                  iconColor: emerald,
                  bgColor: emerald.withAlpha(25),
                  borderColor: emerald.withAlpha(80),
                ),
              ),
              const SizedBox(width: 8),

              // 2. Pending Amount
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

              // 3. Refunded Amount
              Expanded(
                child: _buildKpiCard(
                  title: 'Refunded',
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
                    fontSize: 10.5,
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
  Widget _buildSearchAndFilterSection(List<GuestPaymentModel> allPayments) {
    return Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 4),
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
                  hintText: 'Search by Payment ID, Booking ID, Hotel...',
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
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  int _getFilterCount(String filter, List<GuestPaymentModel> allPayments) {
    if (filter == 'All') return allPayments.length;
    if (filter == 'Successful') return allPayments.where((p) => p.isSuccessful).length;
    if (filter == 'Pending') return allPayments.where((p) => p.isPending || p.hasPendingBalance).length;
    if (filter == 'Refunded') return allPayments.where((p) => p.isRefunded || p.isPartiallyRefunded).length;
    if (filter == 'Partially Refunded') return allPayments.where((p) => p.isPartiallyRefunded).length;
    final f = filter.toLowerCase();
    if (f == 'upi') {
      return allPayments.where((p) {
        final m = p.paymentMethod.toLowerCase();
        return m.contains('upi') || m.contains('gpay') || m.contains('phonepe');
      }).length;
    }
    if (f == 'card') {
      return allPayments.where((p) {
        final m = p.paymentMethod.toLowerCase();
        return m.contains('card') || m.contains('credit') || m.contains('debit');
      }).length;
    }
    if (f == 'net banking') {
      return allPayments.where((p) {
        final m = p.paymentMethod.toLowerCase();
        return m.contains('net') || m.contains('bank');
      }).length;
    }
    if (f == 'cash') {
      return allPayments.where((p) => p.paymentMethod.toLowerCase().contains('cash')).length;
    }
    return 0;
  }

  // ==========================================
  // PAYMENT TRANSACTION CARD
  // ==========================================
  Widget _buildPaymentCard(GuestPaymentModel payment) {
    final statusConfig = _getStatusConfig(payment.status);
    final methodConfig = _getMethodConfig(payment.paymentMethod);
    final isRefund = payment.isRefunded || payment.isPartiallyRefunded || payment.refundInfo != null;

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: payment.hasPendingBalance ? amber.withAlpha(120) : cardBorder,
          width: payment.hasPendingBalance ? 1.3 : 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(12),
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
          onTap: () => _navigateToFolio(context, payment),
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
                    Expanded(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Flexible(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFCBD5E1)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.receipt_rounded, size: 12, color: navy),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      payment.paymentId.isNotEmpty ? payment.paymentId : 'PAY-${payment.bookingId}',
                                      style: const TextStyle(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w700,
                                        color: navy,
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
                          const SizedBox(width: 4),
                          IconButton(
                            icon: const Icon(Icons.copy_rounded, size: 14, color: muted),
                            tooltip: 'Copy Payment ID',
                            constraints: const BoxConstraints(),
                            padding: const EdgeInsets.all(4),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: payment.paymentId));
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Payment ID "${payment.paymentId}" copied to clipboard!'),
                                  duration: const Duration(seconds: 2),
                                  behavior: SnackBarBehavior.floating,
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),

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
                            payment.status,
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

                // 2. Hotel & Room Info
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: cream,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: gold.withAlpha(120), width: 1),
                      ),
                      child: const Icon(Icons.hotel_rounded, color: navy, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            payment.hotel,
                            style: const TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: navy,
                              letterSpacing: -0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: purpleBg,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  payment.roomNumber.isNotEmpty ? 'Room ${payment.roomNumber}' : payment.room,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: purple,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Booking: #${payment.bookingId}',
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
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 12),

                // 3. Amount & Date Details
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Amount Paid
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isRefund ? 'Refunded / Processed' : 'Amount Paid',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: muted,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          Formatters.currency(payment.amount),
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: isRefund ? purpleLight : (payment.isSuccessful ? navy : amberDark),
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
                                payment.paymentMethod,
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
                              payment.createdAt.isNotEmpty
                                  ? Formatters.date(payment.createdAt)
                                  : (payment.dates.isNotEmpty ? payment.dates : 'Recently processed'),
                              style: const TextStyle(
                                fontSize: 11,
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

                // 4. Refund Banner (if applicable)
                if (isRefund && payment.refundInfo != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: purpleBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: purpleLight.withAlpha(80)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline_rounded, size: 16, color: purple),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Refund Status: ${payment.refundInfo!.status} (${Formatters.currency(payment.refundInfo!.approvedAmount > 0 ? payment.refundInfo!.approvedAmount : payment.refundInfo!.requestedAmount)})',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: purple,
                                ),
                              ),
                              if (payment.refundInfo!.utrNumber.isNotEmpty)
                                Text(
                                  'UTR / Ref: ${payment.refundInfo!.utrNumber}',
                                  style: const TextStyle(
                                    fontSize: 10.5,
                                    color: Color(0xFF4C1D95),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // 5. Pending Balance Alert & Pay Action (if remaining balance > 0)
                if (payment.hasPendingBalance) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: amberBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: amber.withAlpha(80)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.warning_amber_rounded, size: 16, color: amberDark),
                            const SizedBox(width: 6),
                            Text(
                              'Pending: ${Formatters.currency(payment.balance)}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: amberDark,
                              ),
                            ),
                          ],
                        ),
                        GestureDetector(
                          onTap: () => _showPayBalanceModal(context, payment),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: navy,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: gold, width: 1),
                            ),
                            child: const Row(
                              children: [
                                Text(
                                  'Pay Now',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: gold,
                                  ),
                                ),
                                SizedBox(width: 3),
                                Icon(Icons.arrow_forward_rounded, size: 11, color: gold),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 12),

                // 6. Action Bar: Full-Width Row across the card (Share, Download PDF, View Folio)
                Row(
                  children: [
                    // 1. Share
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => PdfInvoiceService.shareInvoice(context, payment: payment),
                        icon: const Icon(Icons.share_outlined, size: 14, color: navy),
                        label: const FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            'Share',
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
                    const SizedBox(width: 6),
                    // 2. Download PDF
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => PdfInvoiceService.downloadOrPrintInvoice(context, payment: payment),
                        icon: const Icon(Icons.download_rounded, size: 15, color: navy),
                        label: const FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            'PDF',
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
                    const SizedBox(width: 6),
                    // 3. Digital Folio
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _navigateToFolio(context, payment),
                        icon: const Icon(Icons.receipt_long_rounded, size: 15, color: white),
                        label: const FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            'Digital Folio',
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

  void _navigateToFolio(BuildContext context, GuestPaymentModel payment) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => GuestFolioScreen(
          bookingId: payment.bookingId,
          payment: payment,
        ),
      ),
    );
  }

  // ==========================================
  // PAY PENDING BALANCE MODAL
  // ==========================================
  void _showPayBalanceModal(BuildContext context, GuestPaymentModel payment) {
    String selectedMethod = 'UPI';
    bool isProcessing = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              decoration: const BoxDecoration(
                color: background,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Settle Pending Balance',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: navy,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, color: navy),
                        onPressed: () => Navigator.of(ctx).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Booking: #${payment.bookingId} · ${payment.hotel}',
                    style: const TextStyle(fontSize: 12.5, color: muted),
                  ),
                  const SizedBox(height: 16),

                  // Amount Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cream,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: gold, width: 1.2),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Outstanding Balance',
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: navy,
                          ),
                        ),
                        Text(
                          Formatters.currency(payment.balance),
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: navy,
                            letterSpacing: -0.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  const Text(
                    'Select Payment Method',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: navy,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Payment Options
                  ...['UPI', 'Credit/Debit Card', 'Net Banking', 'Razorpay'].map((method) {
                    final isSelected = selectedMethod == method;
                    final mConfig = _getMethodConfig(method);
                    return GestureDetector(
                      onTap: () => setModalState(() => selectedMethod = method),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? purpleBg : white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? purple : cardBorder,
                            width: isSelected ? 1.5 : 1.0,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(mConfig.icon, color: isSelected ? purple : navy, size: 20),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                method == 'UPI' ? 'UPI (Google Pay, PhonePe, Paytm)' : method,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                  color: isSelected ? purple : navy,
                                ),
                              ),
                            ),
                            Container(
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isSelected ? purple : cardBorder,
                                  width: 2,
                                ),
                                color: isSelected ? purple : Colors.transparent,
                              ),
                              child: isSelected
                                  ? const Center(
                                      child: Icon(Icons.check, size: 13, color: Colors.white),
                                    )
                                  : null,
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 16),

                  // Pay Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isProcessing
                          ? null
                          : () async {
                              setModalState(() => isProcessing = true);
                              final effectiveBookingId = payment.bookingId.trim().isNotEmpty
                                  ? payment.bookingId.trim()
                                  : (payment.paymentId.trim().isNotEmpty
                                      ? payment.paymentId.trim()
                                      : payment.id.trim());
                              final success = await context.read<GuestPaymentProvider>().payBalance(
                                    bookingId: effectiveBookingId,
                                    amount: payment.balance,
                                    paymentMethod: selectedMethod,
                                  );
                              setModalState(() => isProcessing = false);

                              if (context.mounted) {
                                Navigator.of(ctx).pop();
                                final errorMsg = context.read<GuestPaymentProvider>().errorMessage;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      success
                                          ? 'Payment of ${Formatters.currency(payment.balance)} processed successfully!'
                                          : (errorMsg != null && errorMsg.isNotEmpty
                                              ? errorMsg
                                              : 'Payment failed. Please try again.'),
                                    ),
                                    backgroundColor: success ? emeraldDark : rubyDark,
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: navy,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: const BorderSide(color: gold, width: 1.2),
                        ),
                      ),
                      child: isProcessing
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: gold, strokeWidth: 2),
                            )
                          : Text(
                              'Pay ${Formatters.currency(payment.balance)} Now',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: white,
                              ),
                            ),
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

  // ==========================================
  // EMPTY & ERROR STATES
  // ==========================================
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
                border: Border.all(color: gold, width: 1.5),
              ),
              child: const Icon(
                Icons.account_balance_wallet_outlined,
                size: 34,
                color: navy,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'No Payment Records Found',
              style: TextStyle(
                fontSize: 16.5,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Your stay payments, UPI transactions, itemized folios, and approved refunds will appear here.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12.5,
                color: muted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                OutlinedButton.icon(
                  onPressed: () => context.read<GuestPaymentProvider>().fetchPayments(),
                  icon: const Icon(Icons.refresh_rounded, size: 16, color: navy),
                  label: const Text(
                    'Refresh Ledger',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navy),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: cardBorder),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                ),
                if (widget.onNavigateTab != null) ...[
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: () => widget.onNavigateTab!(1),
                    icon: const Icon(Icons.search_rounded, size: 16, color: white),
                    label: const Text(
                      'Book a Stay',
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
              onPressed: () => context.read<GuestPaymentProvider>().fetchPayments(),
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
    } else if (s == 'pending' || s == 'unpaid') {
      return _StatusConfig(
        color: amberDark,
        bgColor: amberBg,
        borderColor: amber.withAlpha(100),
        icon: Icons.hourglass_top_rounded,
      );
    } else if (s == 'processing') {
      return _StatusConfig(
        color: blue,
        bgColor: blueBg,
        borderColor: blue.withAlpha(100),
        icon: Icons.sync_rounded,
      );
    } else if (s == 'failed') {
      return _StatusConfig(
        color: rubyDark,
        bgColor: rubyBg,
        borderColor: ruby.withAlpha(100),
        icon: Icons.cancel_rounded,
      );
    } else if (s == 'partially refunded') {
      return _StatusConfig(
        color: purple,
        bgColor: purpleBg,
        borderColor: purpleLight.withAlpha(100),
        icon: Icons.reply_all_rounded,
      );
    } else if (s == 'refunded' || s == 'refund') {
      return _StatusConfig(
        color: purple,
        bgColor: purpleBg,
        borderColor: purpleLight.withAlpha(100),
        icon: Icons.currency_exchange_rounded,
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
    if (m.contains('upi') || m.contains('gpay') || m.contains('phonepe') || m.contains('paytm')) {
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
        borderColor: purpleLight.withAlpha(100),
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
