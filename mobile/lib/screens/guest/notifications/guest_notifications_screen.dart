import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/providers/guest/guest_notification_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';

class GuestNotificationsScreen extends StatelessWidget {
  const GuestNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final notifProvider = context.watch<GuestNotificationProvider>();
    final notifs = notifProvider.notifications;
    final unreadCount = notifProvider.unreadCount;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (unreadCount > 0)
            TextButton.icon(
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
              ),
              icon: const Icon(Icons.done_all_rounded, size: 18),
              label: const Text(
                'Read All',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              onPressed: () {
                notifProvider.markAllAsRead();
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
      ),
      body: RefreshIndicator(
        onRefresh: () => notifProvider.fetchNotifications(),
        child: notifProvider.isLoading && notifs.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : notifs.isEmpty
                ? EmptyState(
                    icon: Icons.notifications_none_outlined,
                    title: 'No Notifications',
                    message: 'Booking confirmations, extension updates, and hotel announcements will appear here.',
                    actionText: 'Refresh',
                    onAction: () => notifProvider.fetchNotifications(),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: notifs.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final n = notifs[index];
                      return Card(
                        elevation: n.isRead ? 0 : 1,
                        color: n.isRead ? AppColors.surface : AppColors.primary.withAlpha(10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(
                            color: n.isRead ? AppColors.border : AppColors.primary.withAlpha(60),
                          ),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          leading: CircleAvatar(
                            backgroundColor: (n.isRead ? AppColors.textTertiary : AppColors.primary).withAlpha(25),
                            child: Icon(
                              _getNotifIcon(n.type),
                              color: n.isRead ? AppColors.textTertiary : AppColors.primary,
                              size: 20,
                            ),
                          ),
                          title: Text(
                            n.title,
                            style: TextStyle(
                              fontWeight: n.isRead ? FontWeight.w500 : FontWeight.bold,
                              fontSize: 14.5,
                              color: n.isRead ? AppColors.textSecondary : AppColors.textPrimary,
                            ),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(
                                n.message,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: n.isRead ? AppColors.textTertiary : AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                Formatters.dateTime(n.createdAt),
                                style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                              ),
                            ],
                          ),
                          trailing: IconButton(
                            icon: Icon(
                              n.isRead ? Icons.mark_email_unread_outlined : Icons.check_circle_outline,
                              size: 20,
                              color: n.isRead ? AppColors.textTertiary : AppColors.primary,
                            ),
                            tooltip: n.isRead ? 'Mark as unread' : 'Mark as read',
                            onPressed: () {
                              notifProvider.toggleReadStatus(n.id);
                            },
                          ),
                          onTap: () {
                            if (!n.isRead) {
                              notifProvider.markAsRead(n.id);
                            }
                          },
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  IconData _getNotifIcon(String type) {
    switch (type.toLowerCase()) {
      case 'booking':
      case 'new reservation':
        return Icons.calendar_month;
      case 'approval':
        return Icons.verified;
      case 'service':
      case 'operations':
        return Icons.room_service;
      case 'payment':
      case 'finance':
        return Icons.account_balance_wallet_outlined;
      case 'feedback':
      case 'guest experience':
        return Icons.rate_review_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }
}
