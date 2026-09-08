import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/approval_model.dart';
import 'package:hour_stay_mobile/providers/manager/approval_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_button.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';

class ManagerApprovalsScreen extends StatelessWidget {
  const ManagerApprovalsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final approvalProvider = context.watch<ApprovalProvider>();
    final pendingApprovals = approvalProvider.approvals.where((a) => a.isPending).toList();
    final historyApprovals = approvalProvider.approvals.where((a) => !a.isPending).toList();

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            color: AppColors.surface,
            child: TabBar(
              indicatorColor: AppColors.primary,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              tabs: [
                Tab(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text('Pending Requests'),
                      if (pendingApprovals.isNotEmpty) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.warning,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '${pendingApprovals.length}',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const Tab(text: 'Approval History'),
              ],
            ),
          ),
        ),
        body: RefreshIndicator(
          onRefresh: () => approvalProvider.fetchAll(),
          child: TabBarView(
            children: [
              // Pending Tab
              approvalProvider.isLoading && approvalProvider.approvals.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : pendingApprovals.isEmpty
                      ? EmptyState(
                          icon: Icons.check_circle_outline,
                          title: 'No Pending Approvals',
                          message: 'All hourly extension and override requests have been resolved.',
                          actionText: 'Check Updates',
                          onAction: () => approvalProvider.fetchAll(),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: pendingApprovals.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            return _ApprovalCard(approval: pendingApprovals[index]);
                          },
                        ),

              // History Tab
              historyApprovals.isEmpty
                  ? EmptyState(
                      icon: Icons.history,
                      title: 'No Past Approvals',
                      message: 'Past approved or rejected requests will appear here.',
                      actionText: 'Refresh',
                      onAction: () => approvalProvider.fetchAll(),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: historyApprovals.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        return _ApprovalCard(approval: historyApprovals[index]);
                      },
                    ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ApprovalCard extends StatefulWidget {
  final ApprovalModel approval;

  const _ApprovalCard({required this.approval});

  @override
  State<_ApprovalCard> createState() => _ApprovalCardState();
}

class _ApprovalCardState extends State<_ApprovalCard> {
  bool _isProcessing = false;

  Future<void> _handleDecision(String decision) async {
    setState(() => _isProcessing = true);
    final provider = context.read<ApprovalProvider>();
    final messenger = ScaffoldMessenger.of(context);

    final success = await provider.respond(
      widget.approval.id,
      decision,
      remarks: decision == 'approved' ? 'Approved via Mobile Manager App' : 'Rejected via Mobile Manager App',
    );
    setState(() => _isProcessing = false);

    if (success && mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Request ${decision.toUpperCase()} successfully'),
          backgroundColor: decision == 'approved' ? AppColors.success : AppColors.error,
        ),
      );
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(content: Text(provider.errorMessage ?? 'Action failed'), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.approval;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.secondary.withAlpha(20),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.timer_outlined, color: AppColors.secondary, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          Formatters.capitalize(a.type),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        Text(
                          Formatters.date(a.createdAt),
                          style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                        ),
                      ],
                    ),
                  ],
                ),
                StatusBadge(status: a.status),
              ],
            ),
            const Divider(height: 20),
            Text(
              'Requester: ${a.requesterName}',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 4),
            Text(
              a.reason.isNotEmpty ? a.reason : 'Hourly stay booking approval required.',
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
            if (a.isPending) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: CustomButton(
                      text: 'Approve',
                      backgroundColor: AppColors.success,
                      icon: Icons.check,
                      isLoading: _isProcessing,
                      onPressed: () => _handleDecision('approved'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: CustomButton(
                      text: 'Reject',
                      backgroundColor: AppColors.error,
                      isOutlined: true,
                      textColor: AppColors.error,
                      icon: Icons.close,
                      isLoading: _isProcessing,
                      onPressed: () => _handleDecision('rejected'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
