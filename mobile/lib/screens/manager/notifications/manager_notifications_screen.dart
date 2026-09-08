import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/providers/manager/manager_notification_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';

class ManagerNotificationsScreen extends StatelessWidget {
  const ManagerNotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final notifProvider = context.watch<ManagerNotificationProvider>();
    final notifs = notifProvider.notifications;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
      ),
      body: RefreshIndicator(
        onRefresh: () => notifProvider.fetchNotifications(),
        child: notifProvider.isLoading && notifs.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : notifs.isEmpty
                ? EmptyState(
                    icon: Icons.notifications_none_outlined,
                    title: 'No Notifications',
                    message: 'You are all caught up with hotel activities and requests.',
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
                        color: n.isRead ? AppColors.surface : AppColors.primary.withAlpha(10),
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
                              fontWeight: n.isRead ? FontWeight.normal : FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(n.message, style: const TextStyle(fontSize: 13)),
                              const SizedBox(height: 4),
                              Text(
                                Formatters.dateTime(n.createdAt),
                                style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                              ),
                            ],
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
        return Icons.book_online;
      case 'approval':
        return Icons.verified;
      case 'payment':
        return Icons.payment;
      case 'alert':
        return Icons.warning_amber;
      default:
        return Icons.notifications;
    }
  }
}
