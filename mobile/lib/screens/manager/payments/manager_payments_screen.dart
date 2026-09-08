import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/providers/manager/payment_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/widgets/stat_card.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';

class ManagerPaymentsScreen extends StatefulWidget {
  const ManagerPaymentsScreen({super.key});

  @override
  State<ManagerPaymentsScreen> createState() => _ManagerPaymentsScreenState();
}

class _ManagerPaymentsScreenState extends State<ManagerPaymentsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PaymentProvider>().fetchAll();
    });
  }

  @override
  Widget build(BuildContext context) {
    final paymentProvider = context.watch<PaymentProvider>();
    final payments = paymentProvider.payments;
    final totalRev = paymentProvider.totalRevenue;
    final completedCount = payments.where((p) => p.isCompleted).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payments & Transactions'),
      ),
      body: RefreshIndicator(
        onRefresh: () => paymentProvider.fetchAll(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Revenue summary banner
            Row(
              children: [
                Expanded(
                  child: StatCard(
                    title: 'Total Revenue',
                    value: Formatters.currency(totalRev),
                    icon: Icons.account_balance_wallet_outlined,
                    color: AppColors.success,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: StatCard(
                    title: 'Paid Transactions',
                    value: '$completedCount / ${payments.length}',
                    icon: Icons.receipt_long_outlined,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            const Text(
              'Transaction Log',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 12),

            if (paymentProvider.isLoading && payments.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
            else if (payments.isEmpty)
              EmptyState(
                icon: Icons.payment_outlined,
                title: 'No Payments Yet',
                message: 'Payments collected for bookings will be logged here.',
                actionText: 'Refresh',
                onAction: () => paymentProvider.fetchAll(),
              )
            else
              ...payments.map((p) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: (p.isCompleted ? AppColors.success : AppColors.warning).withAlpha(25),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        p.isCompleted ? Icons.check_circle_outline : Icons.pending_outlined,
                        color: p.isCompleted ? AppColors.success : AppColors.warning,
                        size: 20,
                      ),
                    ),
                    title: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          Formatters.currency(p.amount),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        StatusBadge(status: p.status),
                      ],
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(
                          'Method: ${Formatters.capitalize(p.method)} • ${p.reservationId.isNotEmpty ? "Booking #${p.reservationId.length > 6 ? p.reservationId.substring(0, 6) : p.reservationId}" : ""}',
                          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          Formatters.dateTime(p.createdAt),
                          style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                        ),
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}
