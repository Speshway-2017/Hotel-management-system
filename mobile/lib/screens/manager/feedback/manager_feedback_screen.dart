import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/providers/manager/manager_feedback_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';

class ManagerFeedbackScreen extends StatefulWidget {
  const ManagerFeedbackScreen({super.key});

  @override
  State<ManagerFeedbackScreen> createState() => _ManagerFeedbackScreenState();
}

class _ManagerFeedbackScreenState extends State<ManagerFeedbackScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ManagerFeedbackProvider>().fetchAll();
    });
  }

  @override
  Widget build(BuildContext context) {
    final feedbackProvider = context.watch<ManagerFeedbackProvider>();
    final feedbacks = feedbackProvider.feedbacks;
    final avgRating = feedbackProvider.averageRating;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Guest Reviews & Feedback'),
      ),
      body: RefreshIndicator(
        onRefresh: () => feedbackProvider.fetchAll(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Rating summary
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        avgRating.toStringAsFixed(1),
                        style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: AppColors.secondary),
                      ),
                      Row(
                        children: List.generate(5, (index) {
                          return Icon(
                            index < avgRating.round() ? Icons.star : Icons.star_border,
                            color: AppColors.secondary,
                            size: 18,
                          );
                        }),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Based on ${feedbacks.length} reviews',
                        style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.secondary.withAlpha(20),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.rate_review_outlined, color: AppColors.secondary, size: 32),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            const Text(
              'All Guest Reviews',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 12),

            if (feedbackProvider.isLoading && feedbacks.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
            else if (feedbacks.isEmpty)
              EmptyState(
                icon: Icons.reviews_outlined,
                title: 'No Reviews Yet',
                message: 'Guest feedback after check-out will appear here.',
                actionText: 'Refresh',
                onAction: () => feedbackProvider.fetchAll(),
              )
            else
              ...feedbacks.map((f) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              f.guestName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                            Row(
                              children: [
                                const Icon(Icons.star, color: AppColors.secondary, size: 16),
                                const SizedBox(width: 4),
                                Text(
                                  f.rating.toStringAsFixed(1),
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          Formatters.date(f.createdAt),
                          style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          f.comment.isNotEmpty ? f.comment : 'No written comment provided.',
                          style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
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
