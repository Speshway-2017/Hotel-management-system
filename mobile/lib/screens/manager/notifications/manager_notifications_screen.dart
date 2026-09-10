import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/notification_model.dart';
import 'package:hour_stay_mobile/providers/manager/manager_notification_provider.dart';
import 'package:hour_stay_mobile/widgets/server_config_dialog.dart';
import '../approvals/manager_approvals_screen.dart';
import '../feedback/manager_feedback_screen.dart';
import '../reservations/manager_reservations_screen.dart';
import '../payments/manager_payments_screen.dart';

class ManagerNotificationsScreen extends StatefulWidget {
  const ManagerNotificationsScreen({super.key});

  @override
  State<ManagerNotificationsScreen> createState() => _ManagerNotificationsScreenState();
}

class _ManagerNotificationsScreenState extends State<ManagerNotificationsScreen> {
  // Hour Stay Brand Design Tokens
  static const Color navy = Color(0xFF0D1B2A);
  static const Color purple = Color(0xFF5B21B6);
  static const Color gold = Color(0xFFF5C06A);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color white = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF8A8F98);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color emerald = Color(0xFF10B981);
  static const Color ruby = Color(0xFFE53935);

  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<ManagerNotificationProvider>();
      provider.fetchNotifications();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ManagerNotificationProvider>();
    final allNotifications = provider.notifications;
    final selectedFilter = provider.selectedCategory;

    // Apply category / status filter
    List<NotificationModel> filtered = allNotifications;
    if (selectedFilter == 'Unread') {
      filtered = filtered.where((n) => !n.isRead).toList();
    } else if (selectedFilter == 'Read') {
      filtered = filtered.where((n) => n.isRead).toList();
    } else if (selectedFilter != 'All') {
      filtered = filtered.where((n) =>
          n.category.trim().toLowerCase() == selectedFilter.trim().toLowerCase() ||
          n.type.trim().toLowerCase() == selectedFilter.trim().toLowerCase()).toList();
    }

    // Apply search query
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      filtered = filtered.where((n) {
        return n.title.toLowerCase().contains(q) ||
            n.message.toLowerCase().contains(q) ||
            n.category.toLowerCase().contains(q);
      }).toList();
    }

    final isInitialLoading = provider.isLoading && allNotifications.isEmpty;

    return Scaffold(
      backgroundColor: background,
      appBar: _buildAppBar(context, provider),
      body: Column(
        children: [
          // Filter & Search Header
          _buildFilterAndSearchSection(provider, allNotifications),

          // Main Notifications List / State
          Expanded(
            child: RefreshIndicator(
              color: purple,
              backgroundColor: white,
              onRefresh: () => provider.fetchNotifications(),
              child: isInitialLoading
                  ? _buildLoadingSkeleton()
                  : provider.errorMessage != null && allNotifications.isEmpty
                      ? _buildErrorState(provider)
                      : filtered.isEmpty
                          ? _buildEmptyState(provider, selectedFilter)
                          : ListView.separated(
                              physics: const AlwaysScrollableScrollPhysics(
                                parent: BouncingScrollPhysics(),
                              ),
                              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                              itemCount: filtered.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 10),
                              itemBuilder: (context, index) {
                                final notif = filtered[index];
                                return _buildNotificationCard(context, notif, provider);
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // APP BAR
  // ==========================================
  PreferredSizeWidget _buildAppBar(BuildContext context, ManagerNotificationProvider provider) {
    final unreadCount = provider.unreadCount;

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
        'Notifications',
        style: TextStyle(
          color: white,
          fontSize: 16,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.2,
        ),
      ),
      actions: [
        if (unreadCount > 0)
          TextButton.icon(
            style: TextButton.styleFrom(
              foregroundColor: gold,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            ),
            icon: const Icon(Icons.done_all_rounded, size: 16, color: gold),
            label: const Text(
              'Read All',
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: gold,
              ),
            ),
            onPressed: () {
              provider.markAllAsRead();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('All notifications marked as read'),
                  duration: Duration(seconds: 2),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
        const SizedBox(width: 4),
      ],
    );
  }

  // ==========================================
  // FILTER & SEARCH SECTION
  // ==========================================
  Widget _buildFilterAndSearchSection(
    ManagerNotificationProvider provider,
    List<NotificationModel> allNotifications,
  ) {
    final unreadCount = provider.unreadCount;
    final readCount = allNotifications.length - unreadCount;

    // Available categories from actual data or standard hotel operations
    final categories = ['All', 'Unread', 'Approvals', 'Guest Experience', 'Operations', 'Payments', 'Read'];

    int getCategoryCount(String cat) {
      if (cat == 'All') return allNotifications.length;
      if (cat == 'Unread') return unreadCount;
      if (cat == 'Read') return readCount;
      return allNotifications.where((n) =>
          n.category.trim().toLowerCase() == cat.trim().toLowerCase() ||
          n.type.trim().toLowerCase() == cat.trim().toLowerCase()).length;
    }

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
          // 1. Search Bar
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
                style: const TextStyle(fontSize: 13.5, color: navy, fontWeight: FontWeight.w500),
                decoration: InputDecoration(
                  hintText: 'Search alerts, guests, updates...',
                  hintStyle: const TextStyle(fontSize: 13, color: muted),
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

          // 2. Category Filter Chips (Horizontal Scroll)
          SizedBox(
            height: 46,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              itemCount: categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final cat = categories[index];
                final count = getCategoryCount(cat);
                final isSelected = provider.selectedCategory.toLowerCase() == cat.toLowerCase();

                return InkWell(
                  onTap: () => provider.setCategory(cat),
                  borderRadius: BorderRadius.circular(20),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? navy : background,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? gold : cardBorder,
                        width: isSelected ? 1.5 : 1,
                      ),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: navy.withAlpha(25),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              )
                            ]
                          : null,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (cat == 'Unread' && count > 0) ...[
                          Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              color: gold,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 5),
                        ],
                        Text(
                          cat,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                            color: isSelected ? white : const Color(0xFF475569),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: isSelected ? gold : cardBorder,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            '$count',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
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
          const SizedBox(height: 6),
        ],
      ),
    );
  }

  // ==========================================
  // NOTIFICATION CARD
  // ==========================================
  Widget _buildNotificationCard(
    BuildContext context,
    NotificationModel notif,
    ManagerNotificationProvider provider,
  ) {
    final isUnread = !notif.isRead;
    final catColor = _getCategoryAccentColor(notif.category);
    final catBg = _getCategoryBgColor(notif.category);
    final catIcon = _getCategoryIcon(notif.category);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          if (isUnread) {
            provider.markAsRead(notif.id);
          }
          _showNotificationDetailSheet(context, notif, provider);
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: isUnread ? white : const Color(0xFFFCFDFF),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isUnread ? purple.withAlpha(60) : cardBorder,
              width: isUnread ? 1.5 : 1,
            ),
            boxShadow: [
              BoxShadow(
                color: isUnread ? navy.withAlpha(12) : Colors.black.withAlpha(4),
                blurRadius: isUnread ? 10 : 4,
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
                    color: isUnread ? gold : Colors.transparent,
                    width: 4.5,
                  ),
                ),
              ),
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Category Icon Avatar
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: catBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: catColor.withAlpha(40)),
                    ),
                    child: Icon(catIcon, color: catColor, size: 22),
                  ),
                  const SizedBox(width: 12),

                  // 2. Notification Text Details
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header Row: Category Badge + Timestamp + Unread Dot
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                              decoration: BoxDecoration(
                                color: catBg,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                notif.category.toUpperCase(),
                                style: TextStyle(
                                  color: catColor,
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.4,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              _formatRelativeTime(notif.createdAt),
                              style: TextStyle(
                                fontSize: 11,
                                color: isUnread ? const Color(0xFF64748B) : muted,
                                fontWeight: isUnread ? FontWeight.w600 : FontWeight.w400,
                              ),
                            ),
                            if (isUnread) ...[
                              const SizedBox(width: 6),
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: gold,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 6),

                        // Title
                        Text(
                          notif.title,
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: isUnread ? FontWeight.w800 : FontWeight.w600,
                            color: isUnread ? navy : const Color(0xFF334155),
                            height: 1.25,
                          ),
                        ),
                        const SizedBox(height: 4),

                        // Message Preview
                        Text(
                          notif.message,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12.5,
                            color: isUnread ? const Color(0xFF475569) : muted,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // 3. Quick Action Menu / Toggle
                  PopupMenuButton<String>(
                    icon: Icon(
                      Icons.more_vert_rounded,
                      color: muted,
                      size: 18,
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    onSelected: (action) {
                      if (action == 'toggle') {
                        provider.toggleReadStatus(notif.id);
                      } else if (action == 'view') {
                        _showNotificationDetailSheet(context, notif, provider);
                      }
                    },
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'view',
                        child: const Row(
                          children: [
                            Icon(Icons.visibility_outlined, size: 16, color: navy),
                            SizedBox(width: 8),
                            Text('View Details', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'toggle',
                        child: Row(
                          children: [
                            Icon(
                              isUnread ? Icons.done_rounded : Icons.mark_email_unread_outlined,
                              size: 16,
                              color: isUnread ? emerald : purple,
                            ),
                            SizedBox(width: 8),
                            Text(
                              isUnread ? 'Mark as Read' : 'Mark as Unread',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ==========================================
  // NOTIFICATION DETAIL MODAL BOTTOM SHEET
  // ==========================================
  void _showNotificationDetailSheet(
    BuildContext context,
    NotificationModel notif,
    ManagerNotificationProvider provider,
  ) {
    final catColor = _getCategoryAccentColor(notif.category);
    final catBg = _getCategoryBgColor(notif.category);
    final catIcon = _getCategoryIcon(notif.category);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Consumer<ManagerNotificationProvider>(
          builder: (context, prov, _) {
            // Find updated notification state
            final updatedNotif = prov.notifications.firstWhere(
              (n) => n.id == notif.id,
              orElse: () => notif,
            );
            final isUnread = !updatedNotif.isRead;

            return Container(
              decoration: const BoxDecoration(
                color: white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Drag Handle
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

                  // Category Icon + Status Pill Header
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
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: catBg,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                updatedNotif.category.toUpperCase(),
                                style: TextStyle(
                                  color: catColor,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              Formatters.dateTime(updatedNotif.createdAt),
                              style: const TextStyle(fontSize: 11.5, color: muted),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isUnread ? gold.withAlpha(35) : emerald.withAlpha(25),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isUnread ? gold : emerald.withAlpha(60),
                          ),
                        ),
                        child: Text(
                          isUnread ? 'UNREAD' : 'READ',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: isUnread ? const Color(0xFFB45309) : emerald,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Title
                  Text(
                    updatedNotif.title,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: navy,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Message Box
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: background,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Text(
                      updatedNotif.message,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF334155),
                        height: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Contextual Deep Link Action (if matching operational domain)
                  _buildContextualActionButton(context, ctx, updatedNotif),

                  const SizedBox(height: 12),

                  // Actions: Toggle Read State & Close
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: navy,
                            side: const BorderSide(color: cardBorder, width: 1.5),
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          icon: Icon(
                            isUnread ? Icons.check_circle_outline : Icons.mark_email_unread_outlined,
                            size: 18,
                            color: isUnread ? emerald : purple,
                          ),
                          label: Text(
                            isUnread ? 'Mark Read' : 'Mark Unread',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                          onPressed: () {
                            prov.toggleReadStatus(updatedNotif.id);
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF64748B),
                            side: const BorderSide(color: cardBorder),
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          onPressed: () => Navigator.of(ctx).pop(),
                          child: const Text(
                            'Close',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildContextualActionButton(BuildContext rootContext, BuildContext sheetContext, NotificationModel notif) {
    final cat = notif.category.toLowerCase();
    final msg = notif.message.toLowerCase();
    final title = notif.title.toLowerCase();

    String label = '';
    IconData icon = Icons.arrow_forward_rounded;
    VoidCallback? onNavigate;

    if (cat.contains('approval') || msg.contains('approval') || title.contains('approval')) {
      label = 'View Approvals Desk';
      icon = Icons.verified_user_rounded;
      onNavigate = () {
        Navigator.of(sheetContext).pop();
        Navigator.of(rootContext).push(MaterialPageRoute(builder: (_) => const ManagerApprovalsScreen()));
      };
    } else if (cat.contains('guest') || cat.contains('feedback') || msg.contains('feedback') || msg.contains('review')) {
      label = 'View Guest Feedback';
      icon = Icons.hotel_class_rounded;
      onNavigate = () {
        Navigator.of(sheetContext).pop();
        Navigator.of(rootContext).push(MaterialPageRoute(builder: (_) => const ManagerFeedbackScreen()));
      };
    } else if (cat.contains('pay') || cat.contains('bill') || msg.contains('payment') || msg.contains('folio') || msg.contains('refund')) {
      label = 'View Payments & Folios';
      icon = Icons.account_balance_wallet_rounded;
      onNavigate = () {
        Navigator.of(sheetContext).pop();
        Navigator.of(rootContext).push(MaterialPageRoute(builder: (_) => const ManagerPaymentsScreen(isEmbedded: false)));
      };
    } else if (cat.contains('reserv') || msg.contains('booking') || msg.contains('check-in') || msg.contains('check-out') || title.contains('booking')) {
      label = 'View Reservations';
      icon = Icons.calendar_today_rounded;
      onNavigate = () {
        Navigator.of(sheetContext).pop();
        Navigator.of(rootContext).push(MaterialPageRoute(builder: (_) => const ManagerReservationsScreen()));
      };
    }

    if (label.isEmpty || onNavigate == null) {
      return const SizedBox.shrink();
    }

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: navy,
          foregroundColor: white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: gold, width: 1.5),
          ),
        ),
        onPressed: onNavigate,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: gold),
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13.5, letterSpacing: 0.3),
            ),
            const SizedBox(width: 6),
            const Icon(Icons.arrow_forward_ios_rounded, size: 11, color: gold),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // LOADING SKELETON STATE
  // ==========================================
  Widget _buildLoadingSkeleton() {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      itemCount: 6,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: cardBorder),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
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
                    Row(
                      children: [
                        Container(
                          width: 70,
                          height: 14,
                          decoration: BoxDecoration(
                            color: cardBorder.withAlpha(100),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const Spacer(),
                        Container(
                          width: 50,
                          height: 12,
                          decoration: BoxDecoration(
                            color: cardBorder.withAlpha(70),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      height: 16,
                      decoration: BoxDecoration(
                        color: cardBorder.withAlpha(100),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: 180,
                      height: 12,
                      decoration: BoxDecoration(
                        color: cardBorder.withAlpha(70),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
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
  Widget _buildEmptyState(ManagerNotificationProvider provider, String filter) {
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
                Icons.notifications_none_rounded,
                color: purple,
                size: 38,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              filter == 'Unread'
                  ? 'No Unread Notifications'
                  : _searchQuery.isNotEmpty
                      ? 'No Matching Alerts'
                      : 'All Caught Up!',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              filter == 'Unread'
                  ? 'You have reviewed all current hotel notifications and alerts.'
                  : _searchQuery.isNotEmpty
                      ? 'No notifications found matching "$_searchQuery". Try clearing your search.'
                      : 'There are no active alerts for your property right now.',
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
                  borderRadius: BorderRadius.circular(20),
                  side: const BorderSide(color: gold, width: 1.5),
                ),
              ),
              icon: const Icon(Icons.refresh_rounded, size: 18, color: gold),
              label: const Text(
                'Refresh Feed',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 0.3),
              ),
              onPressed: () => provider.fetchNotifications(),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // ERROR STATE
  // ==========================================
  Widget _buildErrorState(ManagerNotificationProvider provider) {
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
              'Unable to Load Alerts',
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
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navy,
                    foregroundColor: white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: const BorderSide(color: gold, width: 1.5),
                    ),
                  ),
                  icon: const Icon(Icons.refresh_rounded, size: 16, color: gold),
                  label: const Text('Try Again', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                  onPressed: () => provider.fetchNotifications(),
                ),
                const SizedBox(width: 10),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: navy,
                    side: const BorderSide(color: cardBorder),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.settings_ethernet_rounded, size: 16),
                  label: const Text('Server Settings', style: TextStyle(fontWeight: FontWeight.w600)),
                  onPressed: () => ServerConfigDialog.show(context),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // HELPER FORMATTERS & CATEGORY MAPPERS
  // ==========================================
  IconData _getCategoryIcon(String category) {
    final cat = category.toLowerCase();
    if (cat.contains('approval')) {
      return Icons.verified_user_rounded;
    } else if (cat.contains('pay') || cat.contains('bill') || cat.contains('finance')) {
      return Icons.account_balance_wallet_rounded;
    } else if (cat.contains('guest') || cat.contains('feedback') || cat.contains('review')) {
      return Icons.hotel_class_rounded;
    } else if (cat.contains('room') || cat.contains('inventory') || cat.contains('operat')) {
      return Icons.inventory_2_rounded;
    } else if (cat.contains('secur') || cat.contains('alert') || cat.contains('warn')) {
      return Icons.shield_rounded;
    } else if (cat.contains('shift') || cat.contains('staff') || cat.contains('attend')) {
      return Icons.people_alt_rounded;
    }
    return Icons.notifications_active_rounded;
  }

  Color _getCategoryAccentColor(String category) {
    final cat = category.toLowerCase();
    if (cat.contains('approval')) {
      return purple;
    } else if (cat.contains('pay') || cat.contains('bill')) {
      return emerald;
    } else if (cat.contains('guest') || cat.contains('feedback')) {
      return const Color(0xFFD97706);
    } else if (cat.contains('secur') || cat.contains('alert')) {
      return const Color(0xFFE11D48);
    } else if (cat.contains('shift') || cat.contains('staff')) {
      return const Color(0xFF2563EB);
    }
    return navy;
  }

  Color _getCategoryBgColor(String category) {
    final cat = category.toLowerCase();
    if (cat.contains('approval')) {
      return const Color(0xFFEDE9FE);
    } else if (cat.contains('pay') || cat.contains('bill')) {
      return const Color(0xFFDCFCE7);
    } else if (cat.contains('guest') || cat.contains('feedback')) {
      return const Color(0xFFFEF3C7);
    } else if (cat.contains('secur') || cat.contains('alert')) {
      return const Color(0xFFFFE4E6);
    } else if (cat.contains('shift') || cat.contains('staff')) {
      return const Color(0xFFDBEAFE);
    }
    return const Color(0xFFF1F5F9);
  }

  String _formatRelativeTime(String createdAt) {
    if (createdAt.isEmpty) return 'Recent';
    try {
      final date = DateTime.parse(createdAt).toLocal();
      final diff = DateTime.now().difference(date);

      if (diff.inSeconds < 60) {
        return 'Just now';
      } else if (diff.inMinutes < 60) {
        return '${diff.inMinutes}m ago';
      } else if (diff.inHours < 24) {
        return '${diff.inHours}h ago';
      } else if (diff.inDays == 1) {
        return 'Yesterday';
      } else if (diff.inDays < 7) {
        return '${diff.inDays}d ago';
      } else {
        return Formatters.date(date);
      }
    } catch (_) {
      return Formatters.dateTime(createdAt);
    }
  }
}
