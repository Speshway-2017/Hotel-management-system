import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/payment_model.dart';
import 'package:hour_stay_mobile/providers/manager/payment_provider.dart';

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
  static const Color gold = Color(0xFFF5C06A);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color white = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF8A8F98);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color emerald = Color(0xFF10B981);
  static const Color emeraldBg = Color(0xFFDCFCE7);
  static const Color ruby = Color(0xFFE53935);
  static const Color rubyBg = Color(0xFFFEE2E2);
  static const Color amber = Color(0xFFD97706);
  static const Color amberBg = Color(0xFFFEF3C7);
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
    'Cash',
    'Card',
    'Net Banking',
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

    // Filter payments
    final filtered = allPayments.where((p) {
      final method = (p.method.isNotEmpty ? p.method : p.paymentMethod).toLowerCase();
      final status = p.status.toLowerCase();
      final isSettled = p.isCompleted || status == 'settled' || status == 'paid';
      final isPending = status == 'pending';
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
        matchesFilter = method.contains('upi') || method.contains('qr');
      } else if (_selectedFilter == 'Cash') {
        matchesFilter = method.contains('cash');
      } else if (_selectedFilter == 'Card') {
        matchesFilter = method.contains('card') || method.contains('credit') || method.contains('debit');
      } else if (_selectedFilter == 'Net Banking') {
        matchesFilter = method.contains('net') || method.contains('bank');
      }

      // Search query filter
      bool matchesSearch = true;
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.trim().toLowerCase();
        matchesSearch = p.guestName.toLowerCase().contains(q) ||
            p.bookingId.toLowerCase().contains(q) ||
            p.roomNumber.toLowerCase().contains(q) ||
            method.contains(q) ||
            p.amount.toString().contains(q);
      }

      return matchesFilter && matchesSearch;
    }).toList();

    return Scaffold(
      backgroundColor: background,
      appBar: widget.isEmbedded ? null : _buildAppBar(paymentProvider),
      floatingActionButton: Padding(
        padding: EdgeInsets.only(bottom: widget.isEmbedded ? 76 : 0),
        child: FloatingActionButton.extended(
          backgroundColor: purple,
          foregroundColor: white,
          elevation: 4,
          icon: const Icon(Icons.add_rounded, size: 22),
          label: const Text(
            'Record Payment',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, letterSpacing: 0.2),
          ),
          onPressed: _showRecordPaymentDialog,
        ),
      ),
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: () => paymentProvider.fetchPayments(),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Top embedded title if embedded
            if (widget.isEmbedded)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Payments & Folios',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: navy,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Real-time financial transactions ledger',
                            style: TextStyle(fontSize: 13, color: muted.withAlpha(220)),
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () => paymentProvider.fetchPayments(),
                        icon: const Icon(Icons.refresh_rounded, color: navy),
                        style: IconButton.styleFrom(
                          backgroundColor: white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: cardBorder),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Summary Metrics Section (Horizontal Scrolling 4 Cards)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.only(top: 12, bottom: 8),
                child: _buildSummaryMetrics(paymentProvider),
              ),
            ),

            // Search Bar & Filter Chips
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),
                    _buildSearchBar(),
                    const SizedBox(height: 12),
                    _buildFilterChips(),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Transactions (${filtered.length})',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: navy,
                          ),
                        ),
                        if (_selectedFilter != 'All' || _searchQuery.isNotEmpty)
                          TextButton(
                            onPressed: () {
                              setState(() {
                                _selectedFilter = 'All';
                                _searchQuery = '';
                                _searchController.clear();
                              });
                            },
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: const Size(50, 30),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text(
                              'Reset Filters',
                              style: TextStyle(color: purple, fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),

            // Content List / Loading / Empty
            if (paymentProvider.isLoading && allPayments.isEmpty)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: purple),
                ),
              )
            else if (filtered.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _buildEmptyState(paymentProvider),
              )
            else
              SliverPadding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, widget.isEmbedded ? 96 : 32),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _buildPaymentCard(filtered[index]),
                    childCount: filtered.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(PaymentProvider provider) {
    return AppBar(
      backgroundColor: navy,
      elevation: 0,
      title: const Text(
        'Payments Ledger',
        style: TextStyle(color: white, fontWeight: FontWeight.w700, fontSize: 18),
      ),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: white, size: 20),
        onPressed: () => Navigator.of(context).maybePop(),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh_rounded, color: gold),
          tooltip: 'Refresh Payments',
          onPressed: () => provider.fetchPayments(),
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  // 4 Modern Summary Cards in a scrollable horizontal carousel
  Widget _buildSummaryMetrics(PaymentProvider provider) {
    final totalAmount = provider.totalPaymentsAmount;
    final totalCount = provider.payments.length;

    final settledAmount = provider.settledTotal;
    final settledCount = provider.settledCount;

    final pendingAmount = provider.pendingTotal;
    final pendingCount = provider.pendingCount;

    final refundedAmount = provider.refundedTotal;
    final refundedCount = provider.refundedCount;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          // 1. Total Payments Card (Deep Navy & Gold Accent)
          _buildMetricCard(
            title: 'Total Payments',
            amount: totalAmount,
            count: totalCount,
            countLabel: 'transactions',
            icon: Icons.account_balance_wallet_rounded,
            primaryColor: navy,
            secondaryColor: gold,
            isDark: true,
          ),
          const SizedBox(width: 12),

          // 2. Successful / Settled (Emerald Green)
          _buildMetricCard(
            title: 'Successful',
            amount: settledAmount,
            count: settledCount,
            countLabel: 'settled',
            icon: Icons.check_circle_rounded,
            primaryColor: emerald,
            secondaryColor: emeraldBg,
            isDark: false,
          ),
          const SizedBox(width: 12),

          // 3. Pending (Amber / Gold)
          _buildMetricCard(
            title: 'Pending',
            amount: pendingAmount,
            count: pendingCount,
            countLabel: 'awaiting',
            icon: Icons.schedule_rounded,
            primaryColor: amber,
            secondaryColor: amberBg,
            isDark: false,
          ),
          const SizedBox(width: 12),

          // 4. Refunded (Ruby Red)
          _buildMetricCard(
            title: 'Refunded',
            amount: refundedAmount,
            count: refundedCount,
            countLabel: 'refunds',
            icon: Icons.replay_rounded,
            primaryColor: ruby,
            secondaryColor: rubyBg,
            isDark: false,
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required double amount,
    required int count,
    required String countLabel,
    required IconData icon,
    required Color primaryColor,
    required Color secondaryColor,
    required bool isDark,
  }) {
    return Container(
      width: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? navy : white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? navyLight : cardBorder,
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(isDark ? 25 : 8),
            blurRadius: 10,
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
                title,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? white.withAlpha(210) : muted,
                ),
              ),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: isDark ? navyLight : secondaryColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  size: 16,
                  color: isDark ? gold : primaryColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            Formatters.currency(amount),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: isDark ? gold : navy,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: isDark ? gold : primaryColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                '$count $countLabel',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: isDark ? white.withAlpha(180) : muted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (val) => setState(() => _searchQuery = val),
        style: const TextStyle(fontSize: 14, color: navy),
        decoration: InputDecoration(
          hintText: 'Search guest, booking ID, room...',
          hintStyle: TextStyle(fontSize: 13, color: muted.withAlpha(180)),
          prefixIcon: const Icon(Icons.search_rounded, color: muted, size: 20),
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
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: _filters.map((filter) {
          final isSelected = _selectedFilter == filter;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: InkWell(
              onTap: () => setState(() => _selectedFilter = filter),
              borderRadius: BorderRadius.circular(20),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? navy : white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? navy : cardBorder,
                    width: 1,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: navy.withAlpha(50),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : [],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (filter == 'Settled')
                      Container(
                        width: 6,
                        height: 6,
                        margin: const EdgeInsets.only(right: 6),
                        decoration: const BoxDecoration(color: emerald, shape: BoxShape.circle),
                      )
                    else if (filter == 'Pending')
                      Container(
                        width: 6,
                        height: 6,
                        margin: const EdgeInsets.only(right: 6),
                        decoration: const BoxDecoration(color: amber, shape: BoxShape.circle),
                      )
                    else if (filter == 'Refunded')
                      Container(
                        width: 6,
                        height: 6,
                        margin: const EdgeInsets.only(right: 6),
                        decoration: const BoxDecoration(color: ruby, shape: BoxShape.circle),
                      ),
                    Text(
                      filter,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                        color: isSelected ? (filter == 'All' ? gold : white) : muted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildPaymentCard(PaymentModel p) {
    final methodStr = (p.method.isNotEmpty ? p.method : p.paymentMethod).toUpperCase();
    final statusStr = p.status.toLowerCase();
    final isSettled = p.isCompleted || statusStr == 'settled' || statusStr == 'paid';
    final isRefunded = statusStr == 'refunded' || statusStr == 'refund';

    // Status styling
    final statusLabel = isRefunded ? 'Refunded' : (isSettled ? 'Settled' : 'Pending');
    final statusColor = isRefunded ? ruby : (isSettled ? emerald : amber);
    final statusBgColor = isRefunded ? rubyBg : (isSettled ? emeraldBg : amberBg);
    final statusIcon = isRefunded
        ? Icons.replay_rounded
        : (isSettled ? Icons.check_circle_rounded : Icons.schedule_rounded);

    // Method icon & styling
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

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showPaymentDetailsSheet(p),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Row: Method Badge & Amount + Status
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Method icon
                    Container(
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                        color: methodBg,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(methodIcon, color: methodColor, size: 20),
                    ),
                    const SizedBox(width: 12),
                    // Method name & Booking reference
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                methodStr.isNotEmpty ? methodStr : 'PAYMENT',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: methodColor,
                                  letterSpacing: 0.3,
                                ),
                              ),
                              if (p.bookingId.isNotEmpty) ...[
                                const SizedBox(width: 6),
                                Text(
                                  '•  #${p.bookingId.length > 8 ? p.bookingId.substring(p.bookingId.length - 6).toUpperCase() : p.bookingId.toUpperCase()}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: muted.withAlpha(200),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            Formatters.dateTime(p.createdAt),
                            style: const TextStyle(
                              fontSize: 11,
                              color: muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Amount
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          Formatters.currency(p.amount),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: navy,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 3),
                        // Status pill badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: statusBgColor,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(statusIcon, size: 11, color: statusColor),
                              const SizedBox(width: 4),
                              Text(
                                statusLabel,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: statusColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(height: 1, color: cardBorder),
                ),

                // Guest Info and Quick Actions
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Guest & Room Info
                    Expanded(
                      child: Row(
                        children: [
                          const Icon(Icons.person_outline_rounded, size: 16, color: muted),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              p.guestName.isNotEmpty ? p.guestName : 'Guest',
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: navy,
                              ),
                            ),
                          ),
                          if (p.roomNumber.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: cream,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: gold.withAlpha(120)),
                              ),
                              child: Text(
                                'Room ${p.roomNumber}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: navy,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    // Actions Dropdown Menu
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert_rounded, size: 18, color: muted),
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      onSelected: (action) {
                        if (action == 'view') {
                          _showPaymentDetailsSheet(p);
                        } else if (action == 'settle') {
                          _updateStatus(p, 'Settled');
                        } else if (action == 'pending') {
                          _updateStatus(p, 'Pending');
                        } else if (action == 'refund') {
                          _updateStatus(p, 'Refunded');
                        } else if (action == 'delete') {
                          _confirmDeletePayment(p);
                        }
                      },
                      itemBuilder: (ctx) => [
                        const PopupMenuItem(
                          value: 'view',
                          child: Row(
                            children: [
                              Icon(Icons.visibility_outlined, size: 16, color: navy),
                              SizedBox(width: 10),
                              Text('View Details', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                        if (!isSettled)
                          const PopupMenuItem(
                            value: 'settle',
                            child: Row(
                              children: [
                                Icon(Icons.check_circle_outline, size: 16, color: emerald),
                                SizedBox(width: 10),
                                Text('Mark as Settled', style: TextStyle(fontSize: 13, color: emerald, fontWeight: FontWeight.w600)),
                              ],
                            ),
                          ),
                        if (isSettled && !isRefunded)
                          const PopupMenuItem(
                            value: 'refund',
                            child: Row(
                              children: [
                                Icon(Icons.replay_rounded, size: 16, color: ruby),
                                SizedBox(width: 10),
                                Text('Mark as Refunded', style: TextStyle(fontSize: 13, color: ruby, fontWeight: FontWeight.w600)),
                              ],
                            ),
                          ),
                        const PopupMenuDivider(),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete_outline_rounded, size: 16, color: ruby),
                              SizedBox(width: 10),
                              Text('Delete Record', style: TextStyle(fontSize: 13, color: ruby)),
                            ],
                          ),
                        ),
                      ],
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

  Widget _buildEmptyState(PaymentProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: cream,
                shape: BoxShape.circle,
                border: Border.all(color: gold.withAlpha(120), width: 1.5),
              ),
              child: const Icon(
                Icons.payments_outlined,
                size: 48,
                color: navy,
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'No Payments Found',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: navy,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _searchQuery.isNotEmpty || _selectedFilter != 'All'
                  ? 'No transactions matched your search or filters.'
                  : 'No payment records have been logged in the system yet.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: muted, height: 1.4),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: gold,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Record First Payment', style: TextStyle(fontWeight: FontWeight.w700)),
              onPressed: _showRecordPaymentDialog,
            ),
          ],
        ),
      ),
    );
  }

  // Payment Breakdown Detail Bottom Sheet
  void _showPaymentDetailsSheet(PaymentModel p) {
    final statusStr = p.status.toLowerCase();
    final isSettled = p.isCompleted || statusStr == 'settled' || statusStr == 'paid';
    final isRefunded = statusStr == 'refunded' || statusStr == 'refund';

    final statusLabel = isRefunded ? 'Refunded' : (isSettled ? 'Settled' : 'Pending');
    final statusColor = isRefunded ? ruby : (isSettled ? emerald : amber);
    final statusBgColor = isRefunded ? rubyBg : (isSettled ? emeraldBg : amberBg);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        decoration: const BoxDecoration(
          color: white,
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
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: cardBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Transaction Details',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: navy),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBgColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Amount Hero Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: navy,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'TRANSACTION AMOUNT',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                      color: white.withAlpha(160),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    Formatters.currency(p.amount),
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: gold,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Detail fields
            _buildDetailRow('Guest Name', p.guestName.isNotEmpty ? p.guestName : 'N/A', Icons.person_rounded),
            _buildDetailRow('Booking Reference', p.bookingId.isNotEmpty ? '#${p.bookingId}' : 'Direct Folio', Icons.bookmark_rounded),
            _buildDetailRow('Room Number', p.roomNumber.isNotEmpty ? 'Room ${p.roomNumber}' : 'Unassigned', Icons.hotel_rounded),
            _buildDetailRow('Payment Method', (p.method.isNotEmpty ? p.method : p.paymentMethod).toUpperCase(), Icons.payment_rounded),
            _buildDetailRow('Transaction Date', Formatters.dateTime(p.createdAt), Icons.calendar_today_rounded),
            if (p.id.isNotEmpty)
              _buildDetailRow('System ID', p.id, Icons.tag_rounded),

            const SizedBox(height: 24),

            // Action buttons
            Row(
              children: [
                if (!isSettled)
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: emerald,
                        foregroundColor: white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.check_circle_outline, size: 18),
                      label: const Text('Mark Settled', style: TextStyle(fontWeight: FontWeight.w700)),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _updateStatus(p, 'Settled');
                      },
                    ),
                  ),
                if (!isSettled) const SizedBox(width: 10),
                if (isSettled && !isRefunded)
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: ruby,
                        side: const BorderSide(color: ruby),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.replay_rounded, size: 18),
                      label: const Text('Refund', style: TextStyle(fontWeight: FontWeight.w700)),
                      onPressed: () {
                        Navigator.pop(ctx);
                        _updateStatus(p, 'Refunded');
                      },
                    ),
                  ),
                if (isSettled && !isRefunded) const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: navyLight,
                      foregroundColor: white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Close', style: TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: muted),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 11, color: muted, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: navy),
              ),
            ],
          ),
        ],
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

  void _showRecordPaymentDialog() {
    final guestCtrl = TextEditingController();
    final bookingCtrl = TextEditingController();
    final roomCtrl = TextEditingController(text: '101');
    final amountCtrl = TextEditingController();
    String selectedMethod = 'UPI';
    String selectedStatus = 'Settled';

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Row(
                children: [
                  Icon(Icons.add_card_rounded, color: purple),
                  SizedBox(width: 10),
                  Text(
                    'Record Payment',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: navy),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: guestCtrl,
                      decoration: InputDecoration(
                        labelText: 'Guest Name *',
                        labelStyle: const TextStyle(color: muted, fontSize: 13),
                        prefixIcon: const Icon(Icons.person_outline_rounded, color: purple, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: purple, width: 1.5)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: bookingCtrl,
                      decoration: InputDecoration(
                        labelText: 'Booking Reference (Optional)',
                        labelStyle: const TextStyle(color: muted, fontSize: 13),
                        prefixIcon: const Icon(Icons.bookmark_outline_rounded, color: purple, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: purple, width: 1.5)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: roomCtrl,
                            decoration: InputDecoration(
                              labelText: 'Room No.',
                              labelStyle: const TextStyle(color: muted, fontSize: 13),
                              prefixIcon: const Icon(Icons.hotel_rounded, color: purple, size: 20),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: purple, width: 1.5)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: amountCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            decoration: InputDecoration(
                              labelText: 'Amount (₹) *',
                              labelStyle: const TextStyle(color: muted, fontSize: 13),
                              prefixIcon: const Icon(Icons.currency_rupee_rounded, color: emerald, size: 20),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: purple, width: 1.5)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: selectedMethod,
                      decoration: InputDecoration(
                        labelText: 'Payment Method',
                        labelStyle: const TextStyle(color: muted, fontSize: 13),
                        prefixIcon: const Icon(Icons.payment_rounded, color: purple, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: purple, width: 1.5)),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'UPI', child: Text('UPI / QR')),
                        DropdownMenuItem(value: 'Cash', child: Text('Cash')),
                        DropdownMenuItem(value: 'Credit Card', child: Text('Credit Card')),
                        DropdownMenuItem(value: 'Debit Card', child: Text('Debit Card')),
                        DropdownMenuItem(value: 'Net Banking', child: Text('Net Banking')),
                      ],
                      onChanged: (v) => setDialogState(() => selectedMethod = v ?? 'UPI'),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: selectedStatus,
                      decoration: InputDecoration(
                        labelText: 'Status',
                        labelStyle: const TextStyle(color: muted, fontSize: 13),
                        prefixIcon: const Icon(Icons.flag_rounded, color: purple, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: cardBorder)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: purple, width: 1.5)),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'Settled', child: Text('Settled / Completed')),
                        DropdownMenuItem(value: 'Pending', child: Text('Pending')),
                      ],
                      onChanged: (v) => setDialogState(() => selectedStatus = v ?? 'Settled'),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel', style: TextStyle(color: muted, fontWeight: FontWeight.w600)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: purple,
                    foregroundColor: white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () async {
                    final guest = guestCtrl.text.trim();
                    final amount = double.tryParse(amountCtrl.text.trim()) ?? 0.0;
                    final messenger = ScaffoldMessenger.of(context);
                    if (guest.isEmpty || amount <= 0) {
                      messenger.showSnackBar(
                        const SnackBar(content: Text('Please enter a valid guest name and amount'), backgroundColor: ruby),
                      );
                      return;
                    }

                    Navigator.pop(ctx);
                    final payProvider = context.read<PaymentProvider>();
                    final ok = await payProvider.logPayment({
                      'guestName': guest,
                      'bookingId': bookingCtrl.text.trim(),
                      'roomNumber': roomCtrl.text.trim(),
                      'amount': amount,
                      'paymentMethod': selectedMethod,
                      'status': selectedStatus,
                    });

                    if (ok && mounted) {
                      messenger.showSnackBar(
                        const SnackBar(content: Text('Payment transaction recorded successfully!'), backgroundColor: emerald),
                      );
                    }
                  },
                  child: const Text('Record Payment', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _confirmDeletePayment(PaymentModel p) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Payment Record', style: TextStyle(fontWeight: FontWeight.w700, color: navy)),
        content: Text('Are you sure you want to delete the payment record of ${Formatters.currency(p.amount)} for ${p.guestName}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel', style: TextStyle(color: muted))),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: ruby, foregroundColor: white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final ok = await context.read<PaymentProvider>().deletePayment(p.id);
      if (ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment record deleted'), backgroundColor: emerald),
        );
      }
    }
  }
}
