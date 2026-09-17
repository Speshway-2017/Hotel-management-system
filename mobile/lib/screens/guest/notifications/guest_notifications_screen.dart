import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/notification_model.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/guest/guest_notification_provider.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import '../bookings/guest_bookings_screen.dart';
import '../bookings/guest_booking_detail_screen.dart';
import '../feedback/guest_feedback_screen.dart';
import '../folio/guest_folio_screen.dart';
import 'package:hour_stay_mobile/colours.dart';

class GuestNotificationsScreen extends StatefulWidget {
  const GuestNotificationsScreen({super.key});

  @override
  State<GuestNotificationsScreen> createState() => _GuestNotificationsScreenState();
}

class _GuestNotificationsScreenState extends State<GuestNotificationsScreen> {

  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GuestNotificationProvider>().fetchNotifications();
      context.read<GuestBookingProvider>().fetchDashboardData(silent: true);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GuestNotificationProvider>();
    final allNotifications = provider.notifications;
    final selectedFilter = provider.selectedCategory;

    // Apply category filter
    List<NotificationModel> filtered = provider.filteredNotifications;

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

          // Main Notifications List / States
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
  PreferredSizeWidget _buildAppBar(BuildContext context, GuestNotificationProvider provider) {
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
        const SizedBox(width: 8),
      ],
    );
  }

  // ==========================================
  // FILTER & SEARCH SECTION
  // ==========================================
  Widget _buildFilterAndSearchSection(
    GuestNotificationProvider provider,
    List<NotificationModel> allNotifications,
  ) {
    final unreadCount = provider.unreadCount;
    final readCount = allNotifications.length - unreadCount;

    final categories = ['All', 'Unread', 'Bookings', 'Payments', 'Announcements', 'Read'];

    int getCategoryCount(String cat) {
      if (cat == 'All') return allNotifications.length;
      if (cat == 'Unread') return unreadCount;
      if (cat == 'Read') return readCount;
      final target = cat.trim().toLowerCase();
      return allNotifications.where((n) {
        final c = n.category.trim().toLowerCase();
        final t = n.type.trim().toLowerCase();
        final msg = n.message.trim().toLowerCase();
        final title = n.title.trim().toLowerCase();

        if (target == 'bookings' && (c.contains('book') || c.contains('reserv') || c.contains('stay') || c.contains('check') || c.contains('room') || t.contains('book') || t.contains('check') || t.contains('stay') || title.contains('booking') || title.contains('reservation') || title.contains('check-in') || title.contains('checked in') || title.contains('check-out') || title.contains('checked out') || title.contains('room assigned') || msg.contains('booking') || msg.contains('reservation') || msg.contains('check-in') || msg.contains('checked in') || msg.contains('check-out') || msg.contains('checked out') || msg.contains('room assigned'))) {
          return true;
        }
        if (target == 'payments' &&
            (c.contains('pay') ||
                c.contains('bill') ||
                c.contains('folio') ||
                c.contains('refund') ||
                t.contains('pay') ||
                t.contains('refund') ||
                msg.contains('paid') ||
                msg.contains('payment') ||
                msg.contains('refund') ||
                title.contains('payment') ||
                title.contains('refund'))) {
          return true;
        }
        if (target == 'announcements' && (c.contains('announc') || c.contains('alert') || c.contains('promo') || t.contains('announc') || c.contains('general'))) {
          return true;
        }
        return c == target || t == target;
      }).length;
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
                  hintText: 'Search updates, bookings, folios...',
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
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                clipBehavior: Clip.hardEdge,
                padding: EdgeInsets.zero,
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
                          if (cat == 'Unread' && count > 0) ...[
                            Container(
                              width: 7,
                              height: 7,
                              decoration: const BoxDecoration(
                                color: gold,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                          ],
                          Text(
                            cat,
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
            ),
          ),
          const SizedBox(height: 10),
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
    GuestNotificationProvider provider,
  ) {
    final isUnread = !notif.isRead;
    final catColor = _getCategoryAccentColor(notif.category, title: notif.title, message: notif.message);
    final catBg = _getCategoryBgColor(notif.category, title: notif.title, message: notif.message);
    final catIcon = _getCategoryIcon(notif.category, title: notif.title, message: notif.message);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          if (isUnread) {
            provider.markAsRead(notif.id, title: notif.title, message: notif.message);
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
                    icon: const Icon(
                      Icons.more_vert_rounded,
                      color: muted,
                      size: 18,
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    onSelected: (action) {
                      if (action == 'toggle') {
                        provider.toggleReadStatus(notif.id, title: notif.title, message: notif.message);
                      } else if (action == 'view') {
                        if (isUnread) {
                          provider.markAsRead(notif.id, title: notif.title, message: notif.message);
                        }
                        _showNotificationDetailSheet(context, notif, provider);
                      }
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'view',
                        child: Row(
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
    GuestNotificationProvider provider,
  ) {
    // Automatically mark as read as soon as it is opened
    if (!notif.isRead) {
      provider.markAsRead(notif.id, title: notif.title, message: notif.message);
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Consumer<GuestNotificationProvider>(
          builder: (context, prov, _) {
            final updatedNotif = prov.notifications.firstWhere(
              (n) => (n.id.isNotEmpty && n.id == notif.id) ||
                     (n.title.trim() == notif.title.trim() && n.message.trim() == notif.message.trim()),
              orElse: () => notif.isRead ? notif : NotificationModel(
                id: notif.id,
                title: notif.title,
                message: notif.message,
                category: notif.category,
                isRead: true,
                propertyId: notif.propertyId,
                createdAt: notif.createdAt,
              ),
            );
            final isUnread = !updatedNotif.isRead;
            final catColor = _getCategoryAccentColor(
              updatedNotif.category,
              title: updatedNotif.title,
              message: updatedNotif.message,
            );
            final catBg = _getCategoryBgColor(
              updatedNotif.category,
              title: updatedNotif.title,
              message: updatedNotif.message,
            );
            final catIcon = _getCategoryIcon(
              updatedNotif.category,
              title: updatedNotif.title,
              message: updatedNotif.message,
            );

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

                  // Contextual Deep Link Action
                  _buildContextualActionButton(context, ctx, updatedNotif),

                  const SizedBox(height: 12),

                  // Actions: Toggle Read State & Close
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: navy,
                            side: BorderSide(
                              color: isUnread ? emerald.withAlpha(120) : cardBorder,
                              width: 1.5,
                            ),
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
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: isUnread ? emerald : navy,
                            ),
                          ),
                          onPressed: () {
                            prov.toggleReadStatus(
                              updatedNotif.id,
                              title: updatedNotif.title,
                              message: updatedNotif.message,
                            );
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

    if (cat.contains('reserv') || cat.contains('book') || cat.contains('stay') || msg.contains('booking') || title.contains('booking') || msg.contains('reservation')) {
      label = 'View Booking';
      icon = Icons.calendar_month_rounded;
      onNavigate = () {
        Navigator.of(sheetContext).pop();

        final combinedText = '${notif.title} ${notif.message}';
        final refMatch = RegExp(r'(?:#|Ref:\s*#?|\b)(BK-[A-Za-z0-9-]+)', caseSensitive: false).firstMatch(combinedText);
        final bookingCode = refMatch?.group(1);

        final bookingProv = rootContext.read<GuestBookingProvider>();
        ReservationModel? targetBooking;

        if (bookingCode != null) {
          try {
            targetBooking = bookingProv.bookings.cast<ReservationModel?>().firstWhere(
              (b) => b?.bookingId.toLowerCase() == bookingCode.toLowerCase() ||
                     b?.id.toLowerCase() == bookingCode.toLowerCase(),
              orElse: () => null,
            );
          } catch (_) {}
        }

        if (targetBooking == null) {
          for (final b in bookingProv.bookings) {
            if (b.bookingId.isNotEmpty && combinedText.toLowerCase().contains(b.bookingId.toLowerCase())) {
              targetBooking = b;
              break;
            }
            if (b.id.isNotEmpty && combinedText.toLowerCase().contains(b.id.toLowerCase())) {
              targetBooking = b;
              break;
            }
          }
        }

        if (targetBooking == null) {
          if (bookingProv.upcomingStay != null && (bookingCode == null || bookingProv.upcomingStay!.bookingId.toLowerCase() == bookingCode.toLowerCase())) {
            targetBooking = bookingProv.upcomingStay;
          } else if (bookingProv.currentStay != null && (bookingCode == null || bookingProv.currentStay!.bookingId.toLowerCase() == bookingCode.toLowerCase())) {
            targetBooking = bookingProv.currentStay;
          }
        }

        if (targetBooking != null) {
          Navigator.of(rootContext).push(
            MaterialPageRoute(builder: (_) => GuestBookingDetailScreen(booking: targetBooking!)),
          );
        } else if (bookingCode != null) {
          final fallbackBooking = ReservationModel(
            id: bookingCode,
            bookingId: bookingCode,
            guest: 'Guest',
            room: 'Room',
            roomType: 'Standard Room',
            status: combinedText.toLowerCase().contains('check-in') || combinedText.toLowerCase().contains('checked-in')
                ? 'Checked-in'
                : (combinedText.toLowerCase().contains('check-out') || combinedText.toLowerCase().contains('checked-out')
                    ? 'Checked-out'
                    : 'Confirmed'),
            stayType: 'Standard',
            checkIn: DateTime.now().toIso8601String(),
            checkOut: DateTime.now().add(const Duration(days: 1)).toIso8601String(),
            amount: 0.0,
          );
          Navigator.of(rootContext).push(
            MaterialPageRoute(builder: (_) => GuestBookingDetailScreen(booking: fallbackBooking)),
          );
        } else {
          Navigator.of(rootContext).push(
            MaterialPageRoute(builder: (_) => const GuestBookingsScreen()),
          );
        }
      };
    } else if (cat.contains('pay') ||
        cat.contains('bill') ||
        cat.contains('folio') ||
        cat.contains('refund') ||
        msg.contains('payment') ||
        msg.contains('folio') ||
        msg.contains('receipt') ||
        msg.contains('refund') ||
        title.contains('refund') ||
        title.contains('payment')) {
      label = 'View Digital Folio & Bills';
      icon = Icons.account_balance_wallet_rounded;
      onNavigate = () {
        Navigator.of(sheetContext).pop();
        Navigator.of(rootContext).push(MaterialPageRoute(builder: (_) => const GuestFolioScreen()));
      };
    } else if (cat.contains('feedback') || cat.contains('review') || msg.contains('review') || msg.contains('rating')) {
      label = 'My Reviews & Feedback';
      icon = Icons.star_rounded;
      onNavigate = () {
        Navigator.of(sheetContext).pop();
        Navigator.of(rootContext).push(MaterialPageRoute(builder: (_) => const GuestFeedbackScreen()));
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
                    Container(
                      width: 80,
                      height: 12,
                      decoration: BoxDecoration(
                        color: cardBorder.withAlpha(100),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: 180,
                      height: 14,
                      decoration: BoxDecoration(
                        color: cardBorder.withAlpha(120),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      height: 12,
                      decoration: BoxDecoration(
                        color: cardBorder.withAlpha(80),
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
  Widget _buildEmptyState(GuestNotificationProvider provider, String filter) {
    final bool isFilterActive = filter != 'All';

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: navy.withAlpha(10),
                shape: BoxShape.circle,
                border: Border.all(color: gold.withAlpha(60), width: 2),
              ),
              child: const Icon(Icons.notifications_none_rounded, size: 34, color: navy),
            ),
            const SizedBox(height: 16),
            Text(
              isFilterActive ? 'No $filter Notifications' : 'No Notifications Yet',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              isFilterActive
                  ? 'There are currently no alerts matching "$filter".'
                  : 'Booking updates, stay extensions, and digital receipts will appear here.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12.5,
                color: muted,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 18),
            if (isFilterActive)
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: navy,
                  foregroundColor: cream,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.filter_alt_off_rounded, size: 16, color: gold),
                label: const Text('Clear Filter', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                onPressed: () => provider.setCategory('All'),
              )
            else
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: navy,
                  side: const BorderSide(color: cardBorder, width: 1.5),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: const Icon(Icons.refresh_rounded, size: 16, color: purple),
                label: const Text('Refresh', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
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
  Widget _buildErrorState(GuestNotificationProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFF87171)),
              ),
              child: const Icon(Icons.error_outline_rounded, size: 32, color: Color(0xFFE53935)),
            ),
            const SizedBox(height: 16),
            const Text(
              'Failed to Load Notifications',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: navy),
            ),
            const SizedBox(height: 6),
            Text(
              provider.errorMessage ?? 'Please check your internet connection and try again.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12.5, color: muted),
            ),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: cream,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.refresh_rounded, size: 16, color: gold),
              label: const Text('Try Again', style: TextStyle(fontWeight: FontWeight.w700)),
              onPressed: () => provider.fetchNotifications(),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // HELPERS
  // ==========================================
  Color _getCategoryAccentColor(String category, {String title = '', String message = ''}) {
    final cat = category.toLowerCase();
    final t = title.toLowerCase();
    final m = message.toLowerCase();

    if (t.contains('check-in') || t.contains('checked in') || m.contains('checked in') || cat.contains('check-in')) {
      return emerald;
    }
    if (t.contains('room assigned') || m.contains('room assigned')) {
      return gold;
    }
    if (t.contains('check-out') || t.contains('checked out') || m.contains('checked out')) {
      return purple;
    }
    if (cat.contains('book') || cat.contains('reserv') || cat.contains('stay')) {
      return purple;
    }
    if (cat.contains('service') || cat.contains('room') || cat.contains('concierge') || cat.contains('clean')) {
      return const Color(0xFF0284C7);
    }
    if (cat.contains('pay') || cat.contains('bill') || cat.contains('folio') || cat.contains('refund')) {
      return emerald;
    }
    if (cat.contains('feedback') || cat.contains('review') || cat.contains('rating')) {
      return const Color(0xFFD97706);
    }
    if (cat.contains('alert') || cat.contains('urgent') || cat.contains('cancel') || t.contains('cancel')) {
      return const Color(0xFFE53935);
    }
    return navy;
  }

  Color _getCategoryBgColor(String category, {String title = '', String message = ''}) {
    final cat = category.toLowerCase();
    final t = title.toLowerCase();
    final m = message.toLowerCase();

    if (t.contains('check-in') || t.contains('checked in') || m.contains('checked in') || cat.contains('check-in')) {
      return const Color(0xFFDCFCE7);
    }
    if (t.contains('room assigned') || m.contains('room assigned')) {
      return const Color(0xFFFFF7E6);
    }
    if (t.contains('check-out') || t.contains('checked out') || m.contains('checked out')) {
      return const Color(0xFFEDE9FE);
    }
    if (cat.contains('book') || cat.contains('reserv') || cat.contains('stay')) {
      return const Color(0xFFF3E8FF);
    }
    if (cat.contains('service') || cat.contains('room') || cat.contains('concierge') || cat.contains('clean')) {
      return const Color(0xFFE0F2FE);
    }
    if (cat.contains('pay') || cat.contains('bill') || cat.contains('folio') || cat.contains('refund')) {
      return const Color(0xFFECFDF5);
    }
    if (cat.contains('feedback') || cat.contains('review') || cat.contains('rating')) {
      return const Color(0xFFFEF3C7);
    }
    if (cat.contains('alert') || cat.contains('urgent') || cat.contains('cancel') || t.contains('cancel')) {
      return const Color(0xFFFEE2E2);
    }
    return const Color(0xFFF1F5F9);
  }

  IconData _getCategoryIcon(String category, {String title = '', String message = ''}) {
    final cat = category.toLowerCase();
    final t = title.toLowerCase();
    final m = message.toLowerCase();

    if (t.contains('check-in') || t.contains('checked in') || m.contains('checked in') || cat.contains('check-in')) {
      return Icons.how_to_reg_rounded;
    }
    if (t.contains('room assigned') || m.contains('room assigned')) {
      return Icons.meeting_room_rounded;
    }
    if (t.contains('check-out') || t.contains('checked out') || m.contains('checked out')) {
      return Icons.luggage_rounded;
    }
    if (cat.contains('book') || cat.contains('reserv') || cat.contains('stay')) {
      return Icons.calendar_month_rounded;
    }
    if (cat.contains('service') || cat.contains('room') || cat.contains('concierge') || cat.contains('clean')) {
      return Icons.room_service_rounded;
    }
    if (cat.contains('pay') || cat.contains('bill') || cat.contains('folio') || cat.contains('refund')) {
      return Icons.account_balance_wallet_rounded;
    }
    if (cat.contains('feedback') || cat.contains('review') || cat.contains('rating')) {
      return Icons.star_rounded;
    }
    if (cat.contains('alert') || cat.contains('urgent') || cat.contains('cancel') || t.contains('cancel')) {
      return Icons.warning_amber_rounded;
    }
    return Icons.notifications_active_rounded;
  }

  String _formatRelativeTime(String isoDate) {
    if (isoDate.isEmpty) return 'Just now';
    try {
      final date = DateTime.parse(isoDate).toLocal();
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inSeconds < 60) return 'Just now';
      if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
      if (diff.inHours < 24) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return 'Recent';
    }
  }
}
