import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/approval_model.dart';
import 'package:hour_stay_mobile/providers/manager/approval_provider.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'package:hour_stay_mobile/colours.dart';

class ManagerApprovalsScreen extends StatefulWidget {
  final bool isEmbedded;
  const ManagerApprovalsScreen({super.key, this.isEmbedded = false});

  @override
  State<ManagerApprovalsScreen> createState() => _ManagerApprovalsScreenState();
}

class _ManagerApprovalsScreenState extends State<ManagerApprovalsScreen> {

  String _selectedFilter = 'all';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<ApprovalProvider>();
      provider.fetchAll();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  PreferredSizeWidget _buildAppBar(ApprovalProvider provider) {
    return AppBar(
      backgroundColor: navy,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
        onPressed: () => Navigator.of(context).maybePop(),
      ),
      title: const Text(
        'Manager Approvals',
        style: TextStyle(
          color: white,
          fontSize: 16,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.2,
        ),
      ),
      actions: [
        if (provider.pendingCount > 0)
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: gold.withAlpha(35),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: gold, width: 1.2),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.pending_actions_rounded, color: gold, size: 14),
                const SizedBox(width: 4),
                Text(
                  '${provider.pendingCount} Pending',
                  style: const TextStyle(
                    color: gold,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ApprovalProvider>();
    final allApprovals = provider.approvals;

    // Filter by status
    var filteredList = allApprovals;
    if (_selectedFilter != 'all') {
      filteredList = filteredList
          .where((a) => a.status.toLowerCase() == _selectedFilter.toLowerCase())
          .toList();
    }

    // Filter by search query
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      filteredList = filteredList.where((a) {
        return a.category.toLowerCase().contains(q) ||
            a.guest.toLowerCase().contains(q) ||
            a.bookingId.toLowerCase().contains(q) ||
            a.room.toLowerCase().contains(q) ||
            a.requestedBy.toLowerCase().contains(q) ||
            a.reason.toLowerCase().contains(q);
      }).toList();
    }

    final isInitialLoading = provider.isLoading && allApprovals.isEmpty;

    return Scaffold(
      backgroundColor: background,
      appBar: widget.isEmbedded ? null : _buildAppBar(provider),
      body: Column(
        children: [
          // 1. Search & Filter Header
          _buildSearchAndFilterHeader(allApprovals, provider),

          // 2. Approvals Feed List
          Expanded(
            child: RefreshIndicator(
              color: purple,
              backgroundColor: white,
              onRefresh: () => provider.fetchAll(),
              child: isInitialLoading
                  ? _buildLoadingSkeleton()
                  : provider.errorMessage != null && allApprovals.isEmpty
                      ? _buildErrorState(provider)
                      : filteredList.isEmpty
                          ? _buildEmptyState(provider)
                          : ListView.separated(
                              physics: const AlwaysScrollableScrollPhysics(
                                parent: BouncingScrollPhysics(),
                              ),
                              padding: EdgeInsets.fromLTRB(16, 12, 16, widget.isEmbedded ? 100 : 24),
                              itemCount: filteredList.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final approval = filteredList[index];
                                return _buildApprovalCard(context, approval, provider);
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // SEARCH & FILTER HEADER
  // ==========================================
  Widget _buildSearchAndFilterHeader(
    List<ApprovalModel> allApprovals,
    ApprovalProvider provider,
  ) {
    final pendingCount = provider.pendingCount;
    final approvedCount = provider.approvedCount;
    final processingCount = provider.processingCount;
    final refundedCount = provider.refundedCount;
    final rejectedCount = provider.rejectedCount;

    final filterOptions = [
      {'key': 'all', 'label': 'All Requests', 'count': allApprovals.length},
      {'key': 'pending', 'label': 'Pending', 'count': pendingCount},
      {'key': 'approved', 'label': 'Approved', 'count': approvedCount},
      {'key': 'processing', 'label': 'Processing', 'count': processingCount},
      {'key': 'refunded', 'label': 'Refunded', 'count': refundedCount},
      {'key': 'rejected', 'label': 'Rejected', 'count': rejectedCount},
    ];

    return Container(
      decoration: BoxDecoration(
        color: white,
        border: const Border(bottom: BorderSide(color: cardBorder, width: 1)),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(6),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Search Input
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Container(
              height: 42,
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cardBorder),
              ),
              child: TextField(
                controller: _searchController,
                style: const TextStyle(
                  fontSize: 13.5,
                  color: navy,
                  fontWeight: FontWeight.w500,
                ),
                decoration: InputDecoration(
                  hintText: 'Search by guest, room, category, or booking ID...',
                  hintStyle: const TextStyle(fontSize: 12.5, color: muted),
                  prefixIcon: const Icon(Icons.search_rounded, color: muted, size: 20),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 16, color: muted),
                          onPressed: () {
                            setState(() {
                              _searchController.clear();
                              _searchQuery = '';
                            });
                          },
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val;
                  });
                },
              ),
            ),
          ),

          // Filter Chips Horizontal Scroll
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                clipBehavior: Clip.hardEdge,
                padding: EdgeInsets.zero,
                itemCount: filterOptions.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final opt = filterOptions[index];
                  final key = opt['key'] as String;
                  final label = opt['label'] as String;
                  final count = opt['count'] as int;
                  final isSelected = _selectedFilter == key;

                  return InkWell(
                    onTap: () {
                      setState(() {
                        _selectedFilter = key;
                      });
                    },
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
                          if (key == 'pending' && count > 0) ...[
                            Container(
                              width: 7,
                              height: 7,
                              decoration: const BoxDecoration(
                                color: gold,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          Text(
                            label,
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
          const SizedBox(height: 10),
        ],
      ),
    );
  }

  // ==========================================
  // APPROVAL CARD
  // ==========================================
  Widget _buildApprovalCard(
    BuildContext context,
    ApprovalModel approval,
    ApprovalProvider provider,
  ) {
    final isPending = approval.isPending;
    final isApproved = approval.isApproved;
    final isProcessing = approval.isProcessing;
    final isRefunded = approval.isRefunded;

    final leftStripeColor = isPending
        ? gold
        : isApproved
            ? emerald
            : isProcessing
                ? const Color(0xFF2563EB)
                : isRefunded
                    ? const Color(0xFF7C3AED)
                    : ruby;

    final catIcon = _getCategoryIcon(approval.category);
    final catColor = _getCategoryColor(approval.category);
    final catBg = _getCategoryBg(approval.category);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _showApprovalDetailSheet(context, approval, provider),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isPending ? gold.withAlpha(90) : cardBorder,
              width: isPending ? 1.5 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: isPending ? navy.withAlpha(12) : Colors.black.withAlpha(4),
                blurRadius: isPending ? 10 : 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(15),
            child: Container(
              decoration: BoxDecoration(
                border: Border(
                  left: BorderSide(
                    color: leftStripeColor,
                    width: 4.5,
                  ),
                ),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Header Row: Category Avatar + Category Name + Status Badge
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: catBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: catColor.withAlpha(40)),
                        ),
                        child: Icon(catIcon, color: catColor, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              approval.category,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: navy,
                                letterSpacing: -0.2,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              Formatters.dateTime(approval.createdAt),
                              style: const TextStyle(
                                fontSize: 11.5,
                                color: muted,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      StatusBadge(status: approval.status),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // 2. Details Grid / Key Information Box
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Column(
                      children: [
                        // Row 1: Guest & Booking ID
                        Row(
                          children: [
                            Expanded(
                              child: _buildInfoItem(
                                icon: Icons.person_outline_rounded,
                                label: 'Guest',
                                value: approval.guest.isNotEmpty ? approval.guest : 'Guest',
                              ),
                            ),
                            if (approval.room.isNotEmpty) ...[
                              const SizedBox(width: 8),
                              Expanded(
                                child: _buildInfoItem(
                                  icon: Icons.meeting_room_outlined,
                                  label: 'Room',
                                  value: 'Room ${approval.room}',
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 10),

                        // Row 2: Requested By & Amount / Value
                        Row(
                          children: [
                            Expanded(
                              child: _buildInfoItem(
                                icon: Icons.badge_outlined,
                                label: 'Requested By',
                                value: approval.requestedBy.isNotEmpty
                                    ? approval.requestedBy
                                    : 'Front Desk',
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _buildInfoItem(
                                icon: Icons.payments_outlined,
                                label: 'Amount / Value',
                                value: approval.amount > 0
                                    ? Formatters.formatCurrency(approval.amount)
                                    : approval.value.isNotEmpty
                                        ? approval.value
                                        : 'Standard Override',
                                valueColor: approval.amount > 0 ? purple : navy,
                                isBold: true,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // 3. Reason Box
                  if (approval.reason.isNotEmpty) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: cream.withAlpha(120),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: gold.withAlpha(70)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.info_outline_rounded,
                            size: 16,
                            color: Color(0xFFB45309),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              approval.reason,
                              style: const TextStyle(
                                fontSize: 12.5,
                                color: Color(0xFF78350F),
                                height: 1.35,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // 4. Decision Log (if Approved or Rejected)
                  if (!isPending && approval.decisionReason?.isNotEmpty == true) ...[
                    Row(
                      children: [
                        Icon(
                          isApproved ? Icons.check_circle_outline : Icons.cancel_outlined,
                          size: 15,
                          color: isApproved ? emerald : ruby,
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Decision: ${approval.decisionReason}',
                            style: TextStyle(
                              fontSize: 11.5,
                              color: isApproved ? const Color(0xFF065F46) : const Color(0xFF991B1B),
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                  ],

                  // 5. Action Buttons (For Pending, Approved, Processing requests)
                  if (isPending) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        // Reject Button
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: ruby,
                              side: const BorderSide(color: Color(0xFFFECACA), width: 1.2),
                              backgroundColor: rubyBg.withAlpha(100),
                              padding: const EdgeInsets.symmetric(vertical: 11),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            icon: const Icon(Icons.close_rounded, size: 17, color: ruby),
                            label: const Text(
                              'Reject',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                                color: ruby,
                              ),
                            ),
                            onPressed: () => _showDecisionDialog(context, approval, 'Rejected', provider),
                          ),
                        ),
                        const SizedBox(width: 10),

                        // Approve Button
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: emerald,
                              foregroundColor: white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 11),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            icon: const Icon(Icons.check_rounded, size: 17, color: white),
                            label: const Text(
                              'Approve',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                                color: white,
                              ),
                            ),
                            onPressed: () => _showDecisionDialog(context, approval, 'Approved', provider),
                          ),
                        ),
                      ],
                    ),
                  ] else if (approval.isApproved) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: ruby,
                              side: const BorderSide(color: Color(0xFFFECACA), width: 1.2),
                              backgroundColor: rubyBg.withAlpha(100),
                              padding: const EdgeInsets.symmetric(vertical: 11),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            icon: const Icon(Icons.close_rounded, size: 17, color: ruby),
                            label: const Text(
                              'Reject',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                                color: ruby,
                              ),
                            ),
                            onPressed: () => _showDecisionDialog(context, approval, 'Rejected', provider),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 11),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            icon: const Icon(Icons.sync_rounded, size: 17, color: white),
                            label: const Text(
                              'Process',
                              style: TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                                color: white,
                              ),
                            ),
                            onPressed: () => _showDecisionDialog(context, approval, 'Processing', provider),
                          ),
                        ),
                      ],
                    ),
                  ] else if (approval.isProcessing) ...[
                    const SizedBox(height: 4),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF7C3AED),
                          foregroundColor: white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 11),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        icon: const Icon(Icons.task_alt_rounded, size: 17, color: white),
                        label: const Text(
                          'Mark as Refunded',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                            color: white,
                          ),
                        ),
                        onPressed: () => _showDecisionDialog(context, approval, 'Refunded', provider),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoItem({
    required IconData icon,
    required String label,
    required String value,
    Color valueColor = navy,
    bool isBold = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 15, color: muted),
        const SizedBox(width: 6),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 10.5,
                  color: muted,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                value,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
                  color: valueColor,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ==========================================
  // CONFIRMATION / DECISION DIALOG
  // ==========================================
  void _showDecisionDialog(
    BuildContext context,
    ApprovalModel approval,
    String action, // 'Approved', 'Rejected', 'Processing', 'Refunded'
    ApprovalProvider provider,
  ) {
    final actLower = action.toLowerCase();
    final isApprove = actLower == 'approved';
    final isProcessing = actLower == 'processing';
    final isRefunded = actLower == 'refunded';

    Color dialogColor;
    Color dialogBg;
    IconData dialogIcon;
    String dialogTitle;
    String dialogPrompt;
    String hintText;
    String defaultNotes;

    if (isApprove) {
      dialogColor = emerald;
      dialogBg = emeraldBg;
      dialogIcon = Icons.check_rounded;
      dialogTitle = 'Approve Request';
      dialogPrompt = 'Are you sure you want to approve the ${approval.category} for ${approval.guest.isNotEmpty ? approval.guest : "this guest"}?';
      hintText = 'e.g. Approved as per manager policy';
      defaultNotes = 'Approved via Manager Mobile';
    } else if (isProcessing) {
      dialogColor = const Color(0xFF2563EB);
      dialogBg = const Color(0xFFDBEAFE);
      dialogIcon = Icons.sync_rounded;
      dialogTitle = 'Process Refund';
      dialogPrompt = 'Are you sure you want to initiate payout / move to Processing for ${approval.guest.isNotEmpty ? approval.guest : "this guest"}?';
      hintText = 'e.g. Payment gateway payout initiated / UTR details';
      defaultNotes = 'Refund processing initiated via Manager Mobile';
    } else if (isRefunded) {
      dialogColor = const Color(0xFF7C3AED);
      dialogBg = const Color(0xFFEDE9FE);
      dialogIcon = Icons.task_alt_rounded;
      dialogTitle = 'Complete Refund';
      dialogPrompt = 'Are you sure you want to mark this refund as fully Refunded to the guest?';
      hintText = 'e.g. Bank UTR / Transaction ID #12345678';
      defaultNotes = 'Refund marked as completed via Manager Mobile';
    } else {
      dialogColor = ruby;
      dialogBg = rubyBg;
      dialogIcon = Icons.close_rounded;
      dialogTitle = 'Reject Request';
      dialogPrompt = 'Are you sure you want to reject the ${approval.category} for ${approval.guest.isNotEmpty ? approval.guest : "this guest"}?';
      hintText = 'e.g. Policy strictly non-refundable or invalid details';
      defaultNotes = 'Rejected via Manager Mobile';
    }

    final remarksController = TextEditingController();
    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: dialogBg,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      dialogIcon,
                      color: dialogColor,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      dialogTitle,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: navy,
                      ),
                    ),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      dialogPrompt,
                      style: const TextStyle(fontSize: 13.5, color: Color(0xFF475569), height: 1.4),
                    ),
                    const SizedBox(height: 14),

                    // Decision Remarks Field
                    const Text(
                      'Decision Notes / Transaction Info (Optional)',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: remarksController,
                      style: const TextStyle(fontSize: 13, color: navy),
                      decoration: InputDecoration(
                        hintText: hintText,
                        hintStyle: const TextStyle(fontSize: 12, color: muted),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: cardBorder),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.of(dialogCtx).pop(),
                  child: const Text('Cancel', style: TextStyle(color: muted, fontWeight: FontWeight.w600)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: dialogColor,
                    foregroundColor: white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                  ),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          setDialogState(() => isSubmitting = true);
                          final messenger = ScaffoldMessenger.of(context);
                          final remarks = remarksController.text.trim();

                          final success = await provider.decideApproval(
                            approval.id,
                            action,
                            remarks.isNotEmpty ? remarks : defaultNotes,
                          );

                          if (dialogCtx.mounted) {
                            Navigator.of(dialogCtx).pop();
                          }

                          messenger.showSnackBar(
                            SnackBar(
                              content: Text(
                                success
                                    ? 'Request updated to $action successfully'
                                    : (provider.errorMessage ?? 'Failed to process request'),
                              ),
                              backgroundColor: success ? dialogColor : ruby,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: white),
                        )
                      : Text(
                          isRefunded
                              ? 'Mark Refunded'
                              : isProcessing
                                  ? 'Start Processing'
                                  : 'Confirm $action',
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ==========================================
  // DETAIL BOTTOM SHEET
  // ==========================================
  void _showApprovalDetailSheet(
    BuildContext context,
    ApprovalModel approval,
    ApprovalProvider provider,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Consumer<ApprovalProvider>(
          builder: (context, prov, _) {
            final updatedApproval = prov.approvals.firstWhere(
              (a) => a.id == approval.id,
              orElse: () => approval,
            );
            final isPending = updatedApproval.isPending;
            final isApproved = updatedApproval.isApproved;
            final isProcessing = updatedApproval.isProcessing;
            final catIcon = _getCategoryIcon(updatedApproval.category);
            final catColor = _getCategoryColor(updatedApproval.category);
            final catBg = _getCategoryBg(updatedApproval.category);

            return Container(
              decoration: const BoxDecoration(
                color: white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 32),
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
                        color: cardBorder,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Header: Icon + Category + Status
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: catBg,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: catColor.withAlpha(50)),
                        ),
                        child: Icon(catIcon, color: catColor, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              updatedApproval.category,
                              style: const TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                                color: navy,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              Formatters.dateTime(updatedApproval.createdAt),
                              style: const TextStyle(fontSize: 12, color: muted),
                            ),
                          ],
                        ),
                      ),
                      StatusBadge(status: updatedApproval.status),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Detail rows in container
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: background,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Column(
                      children: [
                        _buildDetailModalRow('Guest Name', updatedApproval.guest),
                        const Divider(height: 16, color: cardBorder),
                        if (updatedApproval.bookingId.isNotEmpty) ...[
                          _buildDetailModalRow('Booking ID', updatedApproval.bookingId),
                          const Divider(height: 16, color: cardBorder),
                        ],
                        if (updatedApproval.room.isNotEmpty) ...[
                          _buildDetailModalRow('Room Number', updatedApproval.room),
                          const Divider(height: 16, color: cardBorder),
                        ],
                        _buildDetailModalRow('Requested By', updatedApproval.requestedBy),
                        const Divider(height: 16, color: cardBorder),
                        _buildDetailModalRow(
                          'Amount / Value',
                          updatedApproval.amount > 0
                              ? Formatters.formatCurrency(updatedApproval.amount)
                              : updatedApproval.value.isNotEmpty
                                  ? updatedApproval.value
                                  : 'Standard',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Reason Section
                  if (updatedApproval.reason.isNotEmpty) ...[
                    const Text(
                      'Request Reason & Justification',
                      style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: navy),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: cream.withAlpha(120),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: gold.withAlpha(80)),
                      ),
                      child: Text(
                        updatedApproval.reason,
                        style: const TextStyle(fontSize: 13, color: Color(0xFF78350F), height: 1.4),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Action buttons depending on lifecycle status
                  if (isPending) ...[
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: ruby,
                              side: const BorderSide(color: Color(0xFFFECACA), width: 1.2),
                              backgroundColor: rubyBg.withAlpha(100),
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            icon: const Icon(Icons.close_rounded, size: 18, color: ruby),
                            label: const Text('Reject', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              _showDecisionDialog(context, updatedApproval, 'Rejected', provider);
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: emerald,
                              foregroundColor: white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            icon: const Icon(Icons.check_rounded, size: 18, color: white),
                            label: const Text('Approve', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              _showDecisionDialog(context, updatedApproval, 'Approved', provider);
                            },
                          ),
                        ),
                      ],
                    ),
                  ] else if (isApproved) ...[
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: ruby,
                              side: const BorderSide(color: Color(0xFFFECACA), width: 1.2),
                              backgroundColor: rubyBg.withAlpha(100),
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            icon: const Icon(Icons.close_rounded, size: 18, color: ruby),
                            label: const Text('Reject', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              _showDecisionDialog(context, updatedApproval, 'Rejected', provider);
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF2563EB),
                              foregroundColor: white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            icon: const Icon(Icons.sync_rounded, size: 18, color: white),
                            label: const Text('Process', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              _showDecisionDialog(context, updatedApproval, 'Processing', provider);
                            },
                          ),
                        ),
                      ],
                    ),
                  ] else if (isProcessing) ...[
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7C3AED),
                        foregroundColor: white,
                        elevation: 0,
                        minimumSize: const Size(double.infinity, 46),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.task_alt_rounded, size: 18, color: white),
                      label: const Text('Mark as Refunded', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        _showDecisionDialog(context, updatedApproval, 'Refunded', provider);
                      },
                    ),
                  ] else ...[
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: navy,
                        foregroundColor: white,
                        elevation: 0,
                        minimumSize: const Size(double.infinity, 46),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => Navigator.of(ctx).pop(),
                      child: const Text('Close', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                  ],
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildDetailModalRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 12.5, color: muted, fontWeight: FontWeight.w500)),
        Text(
          value.isNotEmpty ? value : '--',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navy),
        ),
      ],
    );
  }

  // ==========================================
  // LOADING SKELETON
  // ==========================================
  Widget _buildLoadingSkeleton() {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      itemCount: 5,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: cardBorder.withAlpha(100),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 140,
                          height: 16,
                          decoration: BoxDecoration(
                            color: cardBorder.withAlpha(100),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          width: 80,
                          height: 12,
                          decoration: BoxDecoration(
                            color: cardBorder.withAlpha(60),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                height: 60,
                decoration: BoxDecoration(
                  color: cardBorder.withAlpha(60),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ==========================================
  // EMPTY STATE
  // ==========================================
  Widget _buildEmptyState(ApprovalProvider provider) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: cream,
                shape: BoxShape.circle,
                border: Border.all(color: gold.withAlpha(80), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: gold.withAlpha(30),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(
                Icons.approval_rounded,
                color: purple,
                size: 38,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              _selectedFilter == 'pending'
                  ? 'No Pending Approvals'
                  : _searchQuery.isNotEmpty
                      ? 'No Matching Requests'
                      : 'No Requests Found',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              _selectedFilter == 'pending'
                  ? 'All hourly stays, discount overrides, and rate waivers have been resolved.'
                  : _searchQuery.isNotEmpty
                      ? 'No requests found matching "$_searchQuery". Try clearing your search.'
                      : 'There are no active approval requests logged for your property.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13.5,
                color: muted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: gold, width: 1.2),
                ),
              ),
              icon: const Icon(Icons.refresh_rounded, size: 18, color: gold),
              label: const Text(
                'Refresh Feed',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              ),
              onPressed: () => provider.fetchAll(),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // ERROR STATE
  // ==========================================
  Widget _buildErrorState(ApprovalProvider provider) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: ruby.withAlpha(20),
                shape: BoxShape.circle,
                border: Border.all(color: ruby.withAlpha(50)),
              ),
              child: const Icon(
                Icons.wifi_off_rounded,
                color: ruby,
                size: 32,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Unable to Load Approvals',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              provider.errorMessage ?? 'Please check your connection and try again.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: muted),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: white,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: const Icon(Icons.refresh_rounded, size: 16, color: gold),
              label: const Text('Try Again', style: TextStyle(fontWeight: FontWeight.w700)),
              onPressed: () => provider.fetchAll(),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // CATEGORY HELPERS
  // ==========================================
  IconData _getCategoryIcon(String category) {
    final cat = category.toLowerCase();
    if (cat.contains('discount') || cat.contains('rate') || cat.contains('override')) {
      return Icons.percent_rounded;
    } else if (cat.contains('room') || cat.contains('upgrade')) {
      return Icons.upgrade_rounded;
    } else if (cat.contains('refund') || cat.contains('waiver') || cat.contains('pay')) {
      return Icons.currency_rupee_rounded;
    } else if (cat.contains('check') || cat.contains('extend') || cat.contains('early') || cat.contains('late') || cat.contains('hour')) {
      return Icons.schedule_rounded;
    }
    return Icons.verified_user_rounded;
  }

  Color _getCategoryColor(String category) {
    final cat = category.toLowerCase();
    if (cat.contains('discount') || cat.contains('rate')) {
      return const Color(0xFFD97706);
    } else if (cat.contains('upgrade') || cat.contains('room')) {
      return purple;
    } else if (cat.contains('refund') || cat.contains('waiver')) {
      return emerald;
    } else if (cat.contains('check') || cat.contains('hour') || cat.contains('extend')) {
      return const Color(0xFF2563EB);
    }
    return navy;
  }

  Color _getCategoryBg(String category) {
    final cat = category.toLowerCase();
    if (cat.contains('discount') || cat.contains('rate')) {
      return const Color(0xFFFEF3C7);
    } else if (cat.contains('upgrade') || cat.contains('room')) {
      return purpleBg;
    } else if (cat.contains('refund') || cat.contains('waiver')) {
      return emeraldBg;
    } else if (cat.contains('check') || cat.contains('hour') || cat.contains('extend')) {
      return const Color(0xFFDBEAFE);
    }
    return const Color(0xFFF1F5F9);
  }
}
