import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/folio_model.dart';
import 'package:hour_stay_mobile/providers/guest/guest_folio_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';

class GuestFolioScreen extends StatefulWidget {
  const GuestFolioScreen({super.key});

  @override
  State<GuestFolioScreen> createState() => _GuestFolioScreenState();
}

class _GuestFolioScreenState extends State<GuestFolioScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GuestFolioProvider>().fetchMyFolios();
    });
  }

  @override
  Widget build(BuildContext context) {
    final folioProvider = context.watch<GuestFolioProvider>();
    final folios = folioProvider.folios;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => folioProvider.fetchMyFolios(),
        child: folioProvider.isLoading && folios.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : folios.isEmpty
                ? EmptyState(
                    icon: Icons.receipt_long_outlined,
                    title: 'No Digital Folios',
                    message: 'Your stay bills, room charges, and itemized receipts will appear here.',
                    actionText: 'Refresh',
                    onAction: () => folioProvider.fetchMyFolios(),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: folios.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 16),
                    itemBuilder: (context, index) {
                      final folio = folios[index];
                      return _FolioCard(folio: folio);
                    },
                  ),
      ),
    );
  }
}

class _FolioCard extends StatelessWidget {
  final FolioModel folio;

  const _FolioCard({required this.folio});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('DIGITAL FOLIO', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                    const SizedBox(height: 2),
                    Text('Folio #${folio.id.length > 8 ? folio.id.substring(0, 8).toUpperCase() : folio.id.toUpperCase()}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ],
                ),
                StatusBadge(status: folio.status),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Date: ${Formatters.date(folio.createdAt)}',
              style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
            ),
            const Divider(height: 20),

            // Itemized list
            const Text(
              'Itemized Charges',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            if (folio.items.isEmpty)
              const Text('Room stay charge', style: TextStyle(fontSize: 13, color: AppColors.textSecondary))
            else
              ...folio.items.map((item) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(item.description, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                      Text(Formatters.currency(item.amount), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    ],
                  ),
                );
              }),
            const Divider(height: 16),

            // Subtotal, Tax, and Total
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Subtotal', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                Text(Formatters.currency(folio.subtotal), style: const TextStyle(fontSize: 13)),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Tax & Service', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                Text(Formatters.currency(folio.tax), style: const TextStyle(fontSize: 13)),
              ],
            ),
            const Divider(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total Paid', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
                Text(
                  Formatters.currency(folio.total),
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.primary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
