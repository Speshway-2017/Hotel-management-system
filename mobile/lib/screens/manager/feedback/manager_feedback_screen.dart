import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/feedback_model.dart';
import 'package:hour_stay_mobile/providers/manager/manager_feedback_provider.dart';
import 'package:hour_stay_mobile/colours.dart';

class ManagerFeedbackScreen extends StatefulWidget {
  const ManagerFeedbackScreen({super.key});

  @override
  State<ManagerFeedbackScreen> createState() => _ManagerFeedbackScreenState();
}

class _ManagerFeedbackScreenState extends State<ManagerFeedbackScreen> {

  String _searchQuery = '';
  String _selectedRatingFilter = 'All';
  final TextEditingController _searchController = TextEditingController();

  final List<String> _ratingFilters = [
    'All',
    '5★ Top',
    '4★ Good',
    '3★ Average',
    '≤2★ Critical',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ManagerFeedbackProvider>().markAsViewed();
      _loadData();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    context.read<ManagerFeedbackProvider>().markAsClosed();
    super.dispose();
  }

  Future<void> _loadData() async {
    await context.read<ManagerFeedbackProvider>().fetchAll();
  }

  @override
  Widget build(BuildContext context) {
    final feedbackProvider = context.watch<ManagerFeedbackProvider>();
    final feedbacks = feedbackProvider.feedbacks;
    final isLoading = feedbackProvider.isLoading && feedbacks.isEmpty;
    final hasError = feedbackProvider.errorMessage != null && feedbacks.isEmpty;

    // Filter logic
    final filtered = feedbacks.where((f) {
      final q = _searchQuery.trim().toLowerCase();
      final matchesSearch = q.isEmpty ||
          f.guestName.toLowerCase().contains(q) ||
          f.comment.toLowerCase().contains(q) ||
          f.bookingId.toLowerCase().contains(q) ||
          f.room.toLowerCase().contains(q) ||
          f.category.toLowerCase().contains(q) ||
          f.sentiment.toLowerCase().contains(q);

      // Rating filter
      bool matchesRating = true;
      if (_selectedRatingFilter == '5★ Top') {
        matchesRating = f.rating >= 4.5;
      } else if (_selectedRatingFilter == '4★ Good') {
        matchesRating = f.rating >= 3.5 && f.rating < 4.5;
      } else if (_selectedRatingFilter == '3★ Average') {
        matchesRating = f.rating >= 2.5 && f.rating < 3.5;
      } else if (_selectedRatingFilter == '≤2★ Critical') {
        matchesRating = f.rating < 2.5;
      }

      return matchesSearch && matchesRating;
    }).toList();

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: navy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: const Text(
          'Guest Feedback & Reviews',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: white,
            letterSpacing: -0.2,
          ),
        ),
      ),
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: _loadData,
        child: isLoading
            ? const Center(
                child: CircularProgressIndicator(color: purple),
              )
            : hasError
                ? _buildErrorView(feedbackProvider.errorMessage!)
                : CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: [

                      // 2. Search Bar & Rating Filter Chips (Status navigation tabs removed)
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(14, 8, 14, 4),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSearchBar(),
                              const SizedBox(height: 10),
                              _buildRatingFilterChips(feedbacks),
                            ],
                          ),
                        ),
                      ),

                      // 3. Header showing filtered count & reset
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Reviews Stream (${filtered.length})',
                                style: const TextStyle(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w800,
                                  color: navy,
                                  letterSpacing: -0.2,
                                ),
                              ),
                              if (_searchQuery.isNotEmpty ||
                                  _selectedRatingFilter != 'All')
                                InkWell(
                                  onTap: () {
                                    setState(() {
                                      _searchQuery = '';
                                      _selectedRatingFilter = 'All';
                                      _searchController.clear();
                                    });
                                  },
                                  child: const Text(
                                    'Reset Filters',
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w700,
                                      color: purple,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),

                      // 4. Feedback List or Empty State
                      if (filtered.isEmpty)
                        SliverToBoxAdapter(
                          child: _buildEmptyState(),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(14, 0, 14, 80),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final f = filtered[index];
                                return _buildFeedbackCard(f);
                              },
                              childCount: filtered.length,
                            ),
                          ),
                        ),
                    ],
                  ),
      ),
    );
  }

  // --- 2. Search Bar ---
  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (v) => setState(() => _searchQuery = v),
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: navy,
        ),
        decoration: InputDecoration(
          hintText: 'Search guest, comment, room, booking ID...',
          hintStyle: TextStyle(
            fontSize: 12,
            color: muted.withAlpha(180),
            fontWeight: FontWeight.w500,
          ),
          prefixIcon: const Icon(Icons.search_rounded, color: purple, size: 20),
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

  // --- Rating Filter Chips ---
  int _getRatingCount(String filter, List<FeedbackModel> feedbacks) {
    if (filter == 'All') return feedbacks.length;
    return feedbacks.where((f) {
      if (filter == '5★ Top') return f.rating >= 4.5;
      if (filter == '4★ Good') return f.rating >= 3.5 && f.rating < 4.5;
      if (filter == '3★ Average') return f.rating >= 2.5 && f.rating < 3.5;
      if (filter == '≤2★ Critical') return f.rating < 2.5;
      return true;
    }).length;
  }

  Widget _buildRatingFilterChips(List<FeedbackModel> feedbacks) {
    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        clipBehavior: Clip.hardEdge,
        padding: EdgeInsets.zero,
        itemCount: _ratingFilters.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final filter = _ratingFilters[index];
          final isSelected = _selectedRatingFilter == filter;
          final count = _getRatingCount(filter, feedbacks);

          return InkWell(
            onTap: () => setState(() => _selectedRatingFilter = filter),
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
                  if (filter.contains('★')) ...[
                    Icon(
                      Icons.star_rounded,
                      size: 14,
                      color: isSelected ? gold : amber,
                    ),
                    const SizedBox(width: 4),
                  ],
                  Text(
                    filter,
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
    );
  }

  // --- 3. Feedback Review Card (No Reply Button, Clean & Luxury) ---
  Widget _buildFeedbackCard(FeedbackModel f) {
    final isPositive = f.rating >= 4.0;
    final isCritical = f.rating <= 2.0;

    final cardAccentColor = isCritical
        ? ruby
        : (isPositive ? emerald : amber);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => _showFeedbackDetailSheet(f),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Avatar, Name, Room, Rating Badge
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Avatar
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          cardAccentColor.withAlpha(40),
                          cardAccentColor.withAlpha(15),
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: cardAccentColor.withAlpha(70)),
                    ),
                    child: Center(
                      child: Text(
                        f.guestName.isNotEmpty
                            ? f.guestName[0].toUpperCase()
                            : 'G',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: cardAccentColor,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Guest Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          f.guestName,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: navy,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'Room ${f.room}',
                                style: const TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF475569),
                                ),
                              ),
                            ),
                            if (f.bookingId.isNotEmpty) ...[
                              const SizedBox(width: 6),
                              Text(
                                f.bookingId,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: muted.withAlpha(220),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Rating Box & Stars
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: cardAccentColor.withAlpha(20),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: cardAccentColor.withAlpha(60)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.star_rounded, size: 14, color: cardAccentColor),
                        const SizedBox(width: 3),
                        Text(
                          f.rating.toStringAsFixed(1),
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w900,
                            color: cardAccentColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              // Category & Sentiment Tags
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  if (f.category.isNotEmpty && f.category != 'General')
                    _buildPillTag(
                      label: f.category,
                      icon: Icons.category_rounded,
                      color: purple,
                      bgColor: purpleBg,
                    ),
                  if (f.sentiment.isNotEmpty)
                    _buildPillTag(
                      label: f.sentiment,
                      icon: isPositive
                          ? Icons.sentiment_satisfied_alt_rounded
                          : (isCritical
                              ? Icons.sentiment_very_dissatisfied_rounded
                              : Icons.sentiment_neutral_rounded),
                      color: cardAccentColor,
                      bgColor: cardAccentColor.withAlpha(25),
                    ),
                  _buildPillTag(
                    label: f.status,
                    icon: f.isResolved ? Icons.check_circle_rounded : Icons.info_rounded,
                    color: f.isResolved ? emerald : const Color(0xFF64748B),
                    bgColor: f.isResolved ? emeraldBg : const Color(0xFFF1F5F9),
                  ),
                ],
              ),

              const SizedBox(height: 8),

              // Guest Review Comment
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFEEF2F6)),
                ),
                child: Text(
                  f.comment.isNotEmpty
                      ? f.comment
                      : 'No written review notes provided.',
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: Color(0xFF1E293B),
                    height: 1.4,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),

              // Category Rating Mini Breakdown (Cleanliness, Service, Room Comfort only - No Food)
              if (f.ratings.isNotEmpty) ...[
                const SizedBox(height: 8),
                _buildMiniCategoryRatings(f),
              ],

              // Management Response (if exists)
              if (f.hasResponse) ...[
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: emerald.withAlpha(60)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.reply_rounded, size: 13, color: emerald),
                          const SizedBox(width: 4),
                          Text(
                            'Management Response (${f.respondedBy.isNotEmpty ? f.respondedBy : "Manager"}):',
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: emerald,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        f.response,
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: Color(0xFF166534),
                          height: 1.3,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 10),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),
              const SizedBox(height: 8),

              // Footer: Date and Details Action Indicator (Reply button removed as requested)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    f.createdAt.isNotEmpty ? Formatters.date(f.createdAt) : 'Recent',
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                  Row(
                    children: [
                      Text(
                        'View Details',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: purple,
                        ),
                      ),
                      const SizedBox(width: 2),
                      Icon(Icons.chevron_right_rounded, size: 16, color: purple),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- Category Ratings Mini Chips (No Food data) ---
  Widget _buildMiniCategoryRatings(FeedbackModel f) {
    final items = [
      if (f.ratings.containsKey('cleanliness'))
        {'name': 'Cleanliness', 'val': f.cleanlinessRating},
      if (f.ratings.containsKey('service'))
        {'name': 'Service', 'val': f.serviceRating},
      if (f.ratings.containsKey('room'))
        {'name': 'Room', 'val': f.roomRating},
    ];

    if (items.isEmpty) return const SizedBox.shrink();

    return Row(
      children: items.map((it) {
        final val = (it['val'] as num).toDouble();
        return Expanded(
          child: Container(
            margin: const EdgeInsets.only(right: 4),
            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: cardBorder),
            ),
            child: Column(
              children: [
                Text(
                  it['name'].toString(),
                  style: const TextStyle(
                    fontSize: 8.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 1),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.star_rounded, size: 9, color: amber),
                    const SizedBox(width: 1),
                    Text(
                      val.toStringAsFixed(1),
                      style: const TextStyle(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: navy,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  // --- Pill Tag Builder ---
  Widget _buildPillTag({
    required String label,
    required IconData icon,
    required Color color,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10.5, color: color),
          const SizedBox(width: 3.5),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  // --- 4. Feedback Detail Sheet (No Food data) ---
  void _showFeedbackDetailSheet(FeedbackModel f) {
    final isPositive = f.rating >= 4.0;
    final isCritical = f.rating <= 2.0;
    final cardAccentColor = isCritical ? ruby : (isPositive ? emerald : amber);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 12,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top Handle
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: cardBorder,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Title & Close
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Guest Feedback Details',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: navy,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20, color: muted),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Guest Card
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: navy,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            f.guestName.isNotEmpty ? f.guestName[0].toUpperCase() : 'G',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: gold,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              f.guestName,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: navy,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Room ${f.room} • ${f.roomType}',
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            if (f.bookingId.isNotEmpty) ...[
                              const SizedBox(height: 1),
                              Text(
                                'Booking Ref: ${f.bookingId}',
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      // Rating badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: cardAccentColor.withAlpha(25),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: cardAccentColor.withAlpha(70)),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.star_rounded, size: 16, color: cardAccentColor),
                                const SizedBox(width: 2),
                                Text(
                                  f.rating.toStringAsFixed(1),
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w900,
                                    color: cardAccentColor,
                                  ),
                                ),
                              ],
                            ),
                            Text(
                              f.sentiment,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w700,
                                color: cardAccentColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // Category Rating Bars (Cleanliness, Service, Room Comfort only - No Food)
                const Text(
                  'Category Breakdown',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: navy,
                  ),
                ),
                const SizedBox(height: 8),
                _buildCategoryScoreBar('Cleanliness', f.cleanlinessRating),
                const SizedBox(height: 6),
                _buildCategoryScoreBar('Staff & Service', f.serviceRating),
                const SizedBox(height: 6),
                _buildCategoryScoreBar('Room Comfort', f.roomRating),

                const SizedBox(height: 14),

                // Full Guest Comment
                const Text(
                  'Guest Review Statement',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: navy,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    f.comment.isNotEmpty ? f.comment : 'No written comments provided.',
                    style: const TextStyle(
                      fontSize: 13,
                      color: navy,
                      height: 1.4,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),

                // Response Section (if exists)
                if (f.hasResponse) ...[
                  const SizedBox(height: 14),
                  const Text(
                    'Published Hotel Response',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: emerald,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: emerald.withAlpha(60)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          f.response,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: Color(0xFF166534),
                            height: 1.4,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Responded by ${f.respondedBy.isNotEmpty ? f.respondedBy : "Management"}',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: emerald,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 18),

                // Actions inside Detail Sheet: Status & Delete
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: navy,
                          side: const BorderSide(color: cardBorder),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        icon: const Icon(Icons.tune_rounded, size: 16),
                        label: const Text(
                          'Update Status',
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                        ),
                        onPressed: () {
                          Navigator.pop(ctx);
                          _showStatusPickerSheet(f);
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      style: IconButton.styleFrom(
                        backgroundColor: rubyBg,
                        foregroundColor: ruby,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: const Icon(Icons.delete_outline_rounded, size: 20),
                      tooltip: 'Delete Feedback',
                      onPressed: () {
                        Navigator.pop(ctx);
                        _confirmDeleteFeedback(f);
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCategoryScoreBar(String title, double score) {
    final fraction = (score / 5.0).clamp(0.0, 1.0);
    return Row(
      children: [
        SizedBox(
          width: 100,
          child: Text(
            title,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: Color(0xFF475569),
            ),
          ),
        ),
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: fraction,
              backgroundColor: const Color(0xFFE2E8F0),
              color: score >= 4.0 ? emerald : (score >= 3.0 ? amber : ruby),
              minHeight: 6,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          '${score.toStringAsFixed(1)}★',
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: navy,
          ),
        ),
      ],
    );
  }

  // --- 5. Status Picker Sheet ---
  void _showStatusPickerSheet(FeedbackModel f) {
    showModalBottomSheet(
      context: context,
      backgroundColor: white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Update Status for ${f.guestName}',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: navy),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const Icon(Icons.check_circle_rounded, color: emerald),
                title: const Text('Mark as Resolved', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                subtitle: const Text('Issues addressed and closed', style: TextStyle(fontSize: 11)),
                onTap: () async {
                  Navigator.pop(ctx);
                  await context.read<ManagerFeedbackProvider>().updateFeedbackStatus(f.id, 'Resolved');
                },
              ),
              ListTile(
                leading: const Icon(Icons.public_rounded, color: blue),
                title: const Text('Mark as Published', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                subtitle: const Text('Visible on guest testimonial board', style: TextStyle(fontSize: 11)),
                onTap: () async {
                  Navigator.pop(ctx);
                  await context.read<ManagerFeedbackProvider>().updateFeedbackStatus(f.id, 'Published');
                },
              ),
              ListTile(
                leading: const Icon(Icons.pending_actions_rounded, color: amber),
                title: const Text('Mark as Pending / Under Review', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                subtitle: const Text('Flag for front desk follow-up', style: TextStyle(fontSize: 11)),
                onTap: () async {
                  Navigator.pop(ctx);
                  await context.read<ManagerFeedbackProvider>().updateFeedbackStatus(f.id, 'Pending');
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // --- 6. Confirm Delete ---
  void _confirmDeleteFeedback(FeedbackModel f) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Feedback', style: TextStyle(fontWeight: FontWeight.w800, color: navy)),
        content: Text(
          'Are you sure you want to permanently delete the review record from ${f.guestName}?',
          style: const TextStyle(fontSize: 13, color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: muted, fontWeight: FontWeight.w700)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: ruby,
              foregroundColor: white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final ok = await context.read<ManagerFeedbackProvider>().deleteFeedback(f.id);
      if (ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Guest review removed successfully')),
        );
      }
    }
  }

  // --- 7. Error State ---
  Widget _buildErrorView(String msg) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: rubyBg, shape: BoxShape.circle),
              child: const Icon(Icons.error_outline_rounded, color: ruby, size: 36),
            ),
            const SizedBox(height: 16),
            const Text(
              'Unable to Load Reviews',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: navy),
            ),
            const SizedBox(height: 6),
            Text(
              msg,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: muted),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: const BorderSide(color: Color(0xFFF5C06A), width: 1.5),
                ),
              ),
              icon: const Icon(Icons.refresh_rounded, size: 18, color: gold),
              label: const Text(
                'Retry Connection',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  letterSpacing: 0.3,
                  color: white,
                ),
              ),
              onPressed: _loadData,
            ),
          ],
        ),
      ),
    );
  }

  // --- 8. Empty State ---
  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(32),
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: amberBg, shape: BoxShape.circle),
            child: const Icon(Icons.reviews_outlined, color: amber, size: 36),
          ),
          const SizedBox(height: 14),
          const Text(
            'No Guest Reviews Found',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: navy),
          ),
          const SizedBox(height: 6),
          Text(
            _searchQuery.isNotEmpty || _selectedRatingFilter != 'All'
                ? 'No feedback matches your current search or rating filter.'
                : 'No reviews recorded in MongoDB yet.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, color: muted, height: 1.4),
          ),
          const SizedBox(height: 18),
          if (_searchQuery.isNotEmpty || _selectedRatingFilter != 'All')
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: const BorderSide(color: Color(0xFFF5C06A), width: 1.5),
                ),
              ),
              icon: const Icon(Icons.filter_alt_off_rounded, size: 16, color: gold),
              label: const Text(
                'Clear Filters',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 12.5,
                  letterSpacing: 0.3,
                  color: white,
                ),
              ),
              onPressed: () {
                setState(() {
                  _searchQuery = '';
                  _selectedRatingFilter = 'All';
                  _searchController.clear();
                });
              },
            )
          else
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: const BorderSide(color: Color(0xFFF5C06A), width: 1.5),
                ),
              ),
              icon: const Icon(Icons.refresh_rounded, size: 16, color: gold),
              label: const Text(
                'Refresh Feed',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 12.5,
                  letterSpacing: 0.3,
                  color: white,
                ),
              ),
              onPressed: _loadData,
            ),
        ],
      ),
    );
  }
}
