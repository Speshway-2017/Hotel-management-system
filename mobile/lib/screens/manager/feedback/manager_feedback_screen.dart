import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/feedback_model.dart';
import 'package:hour_stay_mobile/providers/manager/manager_feedback_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';

class ManagerFeedbackScreen extends StatefulWidget {
  const ManagerFeedbackScreen({super.key});

  @override
  State<ManagerFeedbackScreen> createState() => _ManagerFeedbackScreenState();
}

class _ManagerFeedbackScreenState extends State<ManagerFeedbackScreen> {
  String _selectedFilter = 'All';

  final List<String> _filters = ['All', '5 Stars', '4 Stars', '3 Stars', 'Needs Attention', 'Responded', 'Unanswered'];

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

    final filtered = feedbacks.where((f) {
      if (_selectedFilter == 'All') return true;
      if (_selectedFilter == '5 Stars') return f.rating >= 4.5;
      if (_selectedFilter == '4 Stars') return f.rating >= 3.5 && f.rating < 4.5;
      if (_selectedFilter == '3 Stars') return f.rating >= 2.5 && f.rating < 3.5;
      if (_selectedFilter == 'Needs Attention') return f.rating < 3.0;
      if (_selectedFilter == 'Responded') return f.response.isNotEmpty;
      if (_selectedFilter == 'Unanswered') return f.response.isEmpty;
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Guest Reviews & Reputation'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () => feedbackProvider.fetchAll(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => feedbackProvider.fetchAll(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Rating summary card
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
                        'Based on ${feedbacks.length} verified reviews',
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
            const SizedBox(height: 16),

            // Filter chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _filters.map((filter) {
                  final isSelected = _selectedFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(filter),
                      selected: isSelected,
                      onSelected: (_) => setState(() => _selectedFilter = filter),
                      selectedColor: AppColors.primary.withAlpha(40),
                      labelStyle: TextStyle(
                        color: isSelected ? AppColors.primary : AppColors.textSecondary,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            const Text(
              'Guest Feedback Stream',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 12),

            if (feedbackProvider.isLoading && feedbacks.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
            else if (filtered.isEmpty)
              EmptyState(
                icon: Icons.reviews_outlined,
                title: 'No Reviews Found',
                message: 'No guest reviews match the selected filter.',
                actionText: 'Refresh',
                onAction: () => feedbackProvider.fetchAll(),
              )
            else
              ...filtered.map((f) => _buildReviewCard(f)),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewCard(FeedbackModel f) {
    final hasResponse = f.response.isNotEmpty;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 1,
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
                    Text(
                      f.guestName,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    Text(
                      'Room ${f.room} • ${Formatters.date(f.createdAt)}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                    ),
                  ],
                ),
                Row(
                  children: [
                    ...List.generate(5, (index) {
                      return Icon(
                        index < f.rating.round() ? Icons.star : Icons.star_border,
                        color: AppColors.secondary,
                        size: 16,
                      );
                    }),
                    const SizedBox(width: 4),
                    Text(
                      f.rating.toStringAsFixed(1),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              f.comment.isNotEmpty ? f.comment : 'No written comment provided.',
              style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
            ),

            // Manager response section
            if (hasResponse) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.primary.withAlpha(30)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.reply, size: 14, color: AppColors.primary),
                        const SizedBox(width: 4),
                        Text(
                          'Response from ${f.respondedBy.isNotEmpty ? f.respondedBy : "Management"}:',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      f.response,
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],

            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: (f.status.toLowerCase() == 'resolved' ? AppColors.success : AppColors.secondary).withAlpha(20),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    f.status.toUpperCase(),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: f.status.toLowerCase() == 'resolved' ? AppColors.success : AppColors.secondary,
                    ),
                  ),
                ),
                Row(
                  children: [
                    TextButton.icon(
                      icon: Icon(hasResponse ? Icons.edit_outlined : Icons.reply_outlined, size: 16),
                      label: Text(hasResponse ? 'Edit Reply' : 'Reply to Guest'),
                      onPressed: () => _showReplyDialog(f),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                      tooltip: 'Delete Feedback',
                      onPressed: () => _confirmDeleteFeedback(f),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showReplyDialog(FeedbackModel f) {
    final responseCtrl = TextEditingController(text: f.response);

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text('Reply to ${f.guestName}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Guest Review: "${f.comment}"', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppColors.textSecondary)),
              const SizedBox(height: 12),
              TextField(
                controller: responseCtrl,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Manager Response',
                  hintText: 'Thank the guest and address their feedback...',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () async {
                final txt = responseCtrl.text.trim();
                if (txt.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please write a response message')));
                  return;
                }
                Navigator.pop(ctx);
                final ok = await context.read<ManagerFeedbackProvider>().respondFeedback(f.id, txt);
                if (ok && mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Response published successfully!'), backgroundColor: AppColors.success),
                  );
                }
              },
              child: const Text('Publish Reply'),
            ),
          ],
        );
      },
    );
  }

  void _confirmDeleteFeedback(FeedbackModel f) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Feedback'),
        content: const Text('Are you sure you want to delete this guest review record?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final ok = await context.read<ManagerFeedbackProvider>().deleteFeedback(f.id);
      if (ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Guest review removed')),
        );
      }
    }
  }
}
