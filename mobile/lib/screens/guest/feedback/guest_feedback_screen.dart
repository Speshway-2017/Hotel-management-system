import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../models/feedback_model.dart';
import '../../../providers/guest/guest_booking_provider.dart';
import '../../../providers/guest/guest_feedback_provider.dart';
import 'guest_add_feedback_screen.dart';
import 'package:hour_stay_mobile/colours.dart';

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
      context.read<GuestBookingProvider>().fetchMyBookings(silent: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final feedbackProvider = context.watch<GuestFeedbackProvider>();
    final bookingProvider = context.watch<GuestBookingProvider>();

    final feedbacks = feedbackProvider.feedbacks;
    final avgRating = feedbackProvider.averageRating;
    final totalReviews = feedbackProvider.totalReviews;

    // Completed bookings that might be eligible for review
    final reviewedBookingIds = feedbacks.map((f) => f.bookingId).toSet();
    final eligibleStays = bookingProvider.bookings.where((b) {
      final s = b.status.toLowerCase();
      final isCompleted = s == 'checked_out' || s == 'checked-out' || s == 'completed' || s == 'paid';
      return isCompleted && !reviewedBookingIds.contains(b.id) && !reviewedBookingIds.contains(b.bookingId);
    }).toList();

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: navy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'My Stay Reviews',
          style: TextStyle(
            color: cream,
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: navy,
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: gold, width: 1.2),
        ),
        icon: const Icon(Icons.rate_review_rounded, color: gold, size: 18),
        label: const Text(
          'Rate a Stay',
          style: TextStyle(
            color: white,
            fontSize: 13.5,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.2,
          ),
        ),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const GuestAddFeedbackScreen(),
            ),
          );
        },
      ),
      body: RefreshIndicator(
        color: gold,
        backgroundColor: navy,
        onRefresh: () async {
          await feedbackProvider.fetchMyFeedbacks();
          if (context.mounted) {
            await bookingProvider.fetchMyBookings(silent: true);
          }
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // 1. Summary Header Banner
            SliverToBoxAdapter(
              child: _buildHeaderSummary(
                avgRating: avgRating,
                totalReviews: totalReviews,
                pendingReviewsCount: eligibleStays.length,
              ),
            ),

            // 2. Eligible Completed Stays (if any awaiting review)
            if (eligibleStays.isNotEmpty)
              SliverToBoxAdapter(
                child: _buildEligibleStaysSection(eligibleStays),
              ),

            // 3. Submitted Reviews Section Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Submitted Feedback',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: navy,
                        letterSpacing: -0.2,
                      ),
                    ),
                    Text(
                      '$totalReviews Review${totalReviews == 1 ? "" : "s"}',
                      style: const TextStyle(fontSize: 12, color: muted, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),

            // 4. Feedback List / States
            if (feedbackProvider.isLoading && feedbacks.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(color: gold),
                  ),
                ),
              )
            else if (feedbackProvider.error != null && feedbacks.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _buildErrorState(feedbackProvider.error!),
              )
            else if (feedbacks.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _buildEmptyState(eligibleStays.isNotEmpty),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final feedback = feedbacks[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: _buildFeedbackCard(feedback),
                      );
                    },
                    childCount: feedbacks.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // HEADER SUMMARY CARD
  // ==========================================
  Widget _buildHeaderSummary({
    required double avgRating,
    required int totalReviews,
    required int pendingReviewsCount,
  }) {
    return Container(
      margin: const EdgeInsets.all(16),
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
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Rating Score & Stars
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Overall Guest Rating',
                style: TextStyle(
                  fontSize: 12.5,
                  color: Color(0xCCFFF7E6),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    avgRating > 0 ? avgRating.toStringAsFixed(1) : '5.0',
                    style: const TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: white,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const Text(
                    ' / 5.0',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: gold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: List.generate(5, (index) {
                  final star = index + 1;
                  final isFilled = star <= (avgRating > 0 ? avgRating.round() : 5);
                  return Icon(
                    isFilled ? Icons.star_rounded : Icons.star_outline_rounded,
                    color: gold,
                    size: 16,
                  );
                }),
              ),
            ],
          ),

          // Right: Summary Badges
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: white.withAlpha(20),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: gold.withAlpha(100)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.reviews_rounded, color: gold, size: 13),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          '$totalReviews Submitted',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: cream,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
                if (pendingReviewsCount > 0) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                    decoration: BoxDecoration(
                      color: amber.withAlpha(40),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: amber),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.pending_actions_rounded, color: gold, size: 12),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            '$pendingReviewsCount Eligible Stay${pendingReviewsCount == 1 ? "" : "s"}',
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: gold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // ELIGIBLE COMPLETED STAYS HORIZONTAL CARDS
  // ==========================================
  Widget _buildEligibleStaysSection(List<dynamic> stays) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cream,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: gold.withAlpha(120), width: 1.2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: navy,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.rate_review_rounded, color: gold, size: 14),
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Completed Stays Awaiting Feedback',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w800,
                    color: navy,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // List of pending review stays
          ...stays.map((b) {
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cardBorder),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          b.hotel,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: navy),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          'Booking #${b.id} · Room ${b.room}',
                          style: const TextStyle(fontSize: 11.5, color: muted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => GuestAddFeedbackScreen(booking: b),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: navy,
                      foregroundColor: white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: const BorderSide(color: gold),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    ),
                    child: const Text(
                      'Rate Stay',
                      style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: gold),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  // ==========================================
  // SUBMITTED FEEDBACK CARD
  // ==========================================
  Widget _buildFeedbackCard(FeedbackModel feedback) {
    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(10),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Top Row: Hotel Name & Overall Stars + Status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        feedback.propertyName,
                        style: const TextStyle(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w800,
                          color: navy,
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
                              'Room ${feedback.room}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: purple,
                              ),
                            ),
                          ),
                          if (feedback.bookingId.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Text(
                              '#${feedback.bookingId}',
                              style: const TextStyle(fontSize: 11.5, color: muted),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: feedback.isResolved ? emeraldBg : (feedback.isPublished ? purpleBg : amberBg),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    feedback.status.toUpperCase(),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: feedback.isResolved ? emeraldDark : (feedback.isPublished ? purple : amberDark),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 2. Overall Rating & Stars Row
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: navy,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: gold),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.star_rounded, size: 14, color: gold),
                      const SizedBox(width: 4),
                      Text(
                        feedback.rating.toStringAsFixed(1),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          color: white,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Row(
                  children: List.generate(5, (index) {
                    final isFilled = index + 1 <= feedback.rating.round();
                    return Icon(
                      isFilled ? Icons.star_rounded : Icons.star_outline_rounded,
                      color: gold,
                      size: 16,
                    );
                  }),
                ),
                const Spacer(),
                Text(
                  feedback.createdAt.isNotEmpty ? Formatters.date(feedback.createdAt) : 'Recently submitted',
                  style: const TextStyle(fontSize: 11, color: muted),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // 3. Category Breakdown Grid
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: cardBorder),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildCategoryScore('🧼 Cleanliness', feedback.cleanlinessRating),
                  _buildCategoryScore('🛏️ Room', feedback.roomRating),
                  _buildCategoryScore('👨‍💼 Staff', feedback.staffRating),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // 4. Comments Text
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.format_quote_rounded, size: 18, color: purple),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      feedback.comment.isNotEmpty ? feedback.comment : 'No written review text provided.',
                      style: const TextStyle(
                        fontSize: 13,
                        color: navy,
                        height: 1.35,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 5. Official Hotel Response (if responded)
            if (feedback.hasResponse) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: emeraldBg.withAlpha(120),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: emerald.withAlpha(80)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.reply_rounded, color: emeraldDark, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          'Hotel Response (${feedback.respondedBy.isNotEmpty ? feedback.respondedBy : "Management"})',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: emeraldDark,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      feedback.response,
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: Color(0xFF064E3B),
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 10),

            // 6. Action Row
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => GuestAddFeedbackScreen(existingFeedback: feedback),
                      ),
                    );
                  },
                  icon: const Icon(Icons.edit_outlined, size: 14, color: navy),
                  label: const Text(
                    'Edit Review',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy),
                  ),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    side: const BorderSide(color: cardBorder),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryScore(String label, double rating) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: muted),
        ),
        const SizedBox(height: 2),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.star_rounded, size: 12, color: gold),
            const SizedBox(width: 2),
            Text(
              rating.toStringAsFixed(1),
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: navy),
            ),
          ],
        ),
      ],
    );
  }

  // ==========================================
  // EMPTY & ERROR STATES
  // ==========================================
  Widget _buildEmptyState(bool hasEligibleStays) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                color: cream,
                shape: BoxShape.circle,
                border: Border.all(color: gold, width: 1.5),
              ),
              child: const Icon(Icons.rate_review_outlined, size: 32, color: navy),
            ),
            const SizedBox(height: 16),
            const Text(
              'No Reviews Submitted Yet',
              style: TextStyle(
                fontSize: 16.5,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Your submitted ratings, category feedback, and hotel management responses will appear here.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12.5, color: muted, height: 1.4),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => const GuestAddFeedbackScreen(),
                  ),
                );
              },
              icon: const Icon(Icons.star_rounded, size: 16, color: gold),
              label: const Text(
                'Submit Stay Review',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: gold),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              ),
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
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: rubyBg,
                shape: BoxShape.circle,
                border: Border.all(color: ruby.withAlpha(100)),
              ),
              child: const Icon(Icons.error_outline_rounded, size: 30, color: ruby),
            ),
            const SizedBox(height: 16),
            const Text(
              'Unable to Load Reviews',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: navy),
            ),
            const SizedBox(height: 6),
            Text(
              error,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12.5, color: muted),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () => context.read<GuestFeedbackProvider>().fetchMyFeedbacks(),
              icon: const Icon(Icons.refresh_rounded, size: 16, color: white),
              label: const Text(
                'Retry',
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
}
