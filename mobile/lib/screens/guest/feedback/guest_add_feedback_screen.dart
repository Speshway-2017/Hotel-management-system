import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/providers/guest/guest_feedback_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_button.dart';
import 'package:hour_stay_mobile/widgets/custom_text_field.dart';

class GuestAddFeedbackScreen extends StatefulWidget {
  final String reservationId;

  const GuestAddFeedbackScreen({super.key, required this.reservationId});

  @override
  State<GuestAddFeedbackScreen> createState() => _GuestAddFeedbackScreenState();
}

class _GuestAddFeedbackScreenState extends State<GuestAddFeedbackScreen> {
  final _commentController = TextEditingController();
  double _overallRating = 5.0;
  int _cleanlinessRating = 5;
  int _comfortRating = 5;
  int _staffRating = 5;
  int _amenitiesRating = 5;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final provider = context.read<GuestFeedbackProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    final success = await provider.submitFeedback(
      reservationId: widget.reservationId,
      rating: _overallRating,
      comment: _commentController.text.trim(),
      categoryRatings: {
        'cleanliness': _cleanlinessRating,
        'comfort': _comfortRating,
        'staff': _staffRating,
        'amenities': _amenitiesRating,
      },
    );

    if (success && mounted) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Thank you! Your review was submitted.'), backgroundColor: AppColors.success),
      );
      navigator.pop();
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(content: Text(provider.error ?? 'Failed to submit review'), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final feedbackProvider = context.watch<GuestFeedbackProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rate Your Experience'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Column(
                children: [
                  const Text(
                    'Overall Stay Rating',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      final star = index + 1;
                      return IconButton(
                        iconSize: 36,
                        icon: Icon(
                          star <= _overallRating ? Icons.star : Icons.star_border,
                          color: AppColors.secondary,
                        ),
                        onPressed: () => setState(() => _overallRating = star.toDouble()),
                      );
                    }),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Category Ratings
            const Text(
              'Detailed Ratings',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 12),
            _buildCategoryRatingSlider('Cleanliness', _cleanlinessRating, (v) => setState(() => _cleanlinessRating = v)),
            _buildCategoryRatingSlider('Comfort', _comfortRating, (v) => setState(() => _comfortRating = v)),
            _buildCategoryRatingSlider('Staff Hospitality', _staffRating, (v) => setState(() => _staffRating = v)),
            _buildCategoryRatingSlider('Amenities', _amenitiesRating, (v) => setState(() => _amenitiesRating = v)),
            const SizedBox(height: 16),

            // Comments
            CustomTextField(
              controller: _commentController,
              label: 'Your Review & Comments',
              hint: 'What did you like the most about your stay?',
              maxLines: 4,
            ),
            const SizedBox(height: 24),

            CustomButton(
              text: 'Submit Review',
              isLoading: feedbackProvider.isLoading,
              onPressed: _handleSubmit,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryRatingSlider(String label, int value, ValueChanged<int> onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          Row(
            children: List.generate(5, (index) {
              final star = index + 1;
              return GestureDetector(
                onTap: () => onChanged(star),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Icon(
                    star <= value ? Icons.star : Icons.star_border,
                    size: 22,
                    color: AppColors.secondary,
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
