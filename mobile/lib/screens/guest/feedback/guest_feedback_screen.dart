import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/providers/guest/guest_feedback_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';

class GuestFeedbackScreen extends StatefulWidget {
  const GuestFeedbackScreen({super.key});

  @override
  State<GuestFeedbackScreen> createState() => _GuestFeedbackScreenState();
}

class _GuestFeedbackScreenState extends State<GuestFeedbackScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GuestFeedbackProvider>().fetchMyFeedbacks();
    });
  }

  @override
  Widget build(BuildContext context) {
    final feedbackProvider = context.watch<GuestFeedbackProvider>();
    final feedbacks = feedbackProvider.feedbacks;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Reviews'),
      ),
      body: RefreshIndicator(
        onRefresh: () => feedbackProvider.fetchMyFeedbacks(),
        child: feedbackProvider.isLoading && feedbacks.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : feedbacks.isEmpty
                ? EmptyState(
                    icon: Icons.rate_review_outlined,
                    title: 'No Reviews Submitted',
                    message: 'You have not submitted reviews for any completed stays yet.',
                    actionText: 'Refresh',
                    onAction: () => feedbackProvider.fetchMyFeedbacks(),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: feedbacks.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final f = feedbacks[index];
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
                                    children: List.generate(5, (sIndex) {
                                      return Icon(
                                        sIndex < f.rating ? Icons.star : Icons.star_border,
                                        color: AppColors.secondary,
                                        size: 18,
                                      );
                                    }),
                                  ),
                                  Text(
                                    Formatters.date(f.createdAt),
                                    style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                f.comment.isNotEmpty ? f.comment : 'No written review text.',
                                style: const TextStyle(fontSize: 14, color: AppColors.textPrimary),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
