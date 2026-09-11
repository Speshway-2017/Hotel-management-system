import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/api_endpoints.dart';
import '../../models/user_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/manager/approval_provider.dart';
import '../../providers/manager/guest_provider.dart';
import '../../providers/manager/manager_feedback_provider.dart';
import '../../providers/manager/manager_notification_provider.dart';
import '../../providers/manager/payment_provider.dart';
import '../../providers/manager/reservation_provider.dart';
import '../../providers/manager/room_provider.dart';
import '../../providers/manager/staff_provider.dart';
import '../../widgets/manager_floating_nav_bar.dart';
import 'approvals/manager_approvals_screen.dart';
import 'dashboard/manager_dashboard_screen.dart';
import 'notifications/manager_notifications_screen.dart';
import 'payments/manager_payments_screen.dart';
import 'profile/manager_profile_screen.dart';
import 'reservations/manager_reservations_screen.dart';
import 'rooms/manager_rooms_screen.dart';

class ManagerLayout extends StatefulWidget {
  const ManagerLayout({super.key});

  @override
  State<ManagerLayout> createState() => _ManagerLayoutState();
}

class _ManagerLayoutState extends State<ManagerLayout> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    context.read<AuthProvider>().refreshProfile();
    context.read<ReservationProvider>().fetchAll();
    context.read<RoomProvider>().fetchAll();
    context.read<ApprovalProvider>().fetchAll();
    context.read<PaymentProvider>().fetchAll();
    context.read<ManagerNotificationProvider>().fetchNotifications();
    context.read<GuestProvider>().fetchGuests();
    context.read<ManagerFeedbackProvider>().fetchAll();
    context.read<StaffProvider>().fetchAll();
  }

  Widget _buildAvatarImageWidget({
    required UserModel? user,
    required double size,
    required double fontSize,
  }) {
    final avatarUrl = ApiEndpoints.resolveImageUrl(user?.avatar);
    final initial = user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'M';

    if (avatarUrl.isNotEmpty) {
      if (avatarUrl.startsWith('data:image')) {
        try {
          final base64Str = avatarUrl.split(',').last;
          return Image.memory(
            base64Decode(base64Str),
            key: ValueKey('${user?.id}_${avatarUrl.hashCode}'),
            width: size,
            height: size,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => _buildInitialsFallback(initial, fontSize),
          );
        } catch (_) {
          return _buildInitialsFallback(initial, fontSize);
        }
      }

      if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
        return Image.network(
          avatarUrl,
          key: ValueKey('${user?.id}_${avatarUrl.hashCode}'),
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _buildInitialsFallback(initial, fontSize),
        );
      }
    }

    return _buildInitialsFallback(initial, fontSize);
  }

  Widget _buildInitialsFallback(String initial, double fontSize) {
    return Center(
      child: Text(
        initial,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w800,
          color: const Color(0xFF0D1B2A),
        ),
      ),
    );
  }

  final List<Widget> _bottomNavScreens = const [
    ManagerDashboardScreen(),
    ManagerReservationsScreen(),
    ManagerRoomsScreen(),
    ManagerApprovalsScreen(),
    ManagerPaymentsScreen(isEmbedded: true),
  ];

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final approvalProvider = context.watch<ApprovalProvider>();
    final notificationProvider = context.watch<ManagerNotificationProvider>();
    final pendingApprovals = approvalProvider.pendingCount;
    final unreadNotifs = notificationProvider.unreadCount;

    final propertyTitle = (user?.propertyName != null && user!.propertyName!.isNotEmpty)
        ? user.propertyName!
        : 'Speshway Luxury Hotel';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0D1B2A),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: Row(
          children: [
            // White rounded container with logo
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(50),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(5),
              child: Image.asset(
                'assets/logo.png',
                fit: BoxFit.contain,
                errorBuilder: (_, _, _) => const Icon(
                  Icons.hotel_rounded,
                  size: 22,
                  color: Color(0xFF0D1B2A),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Hour(Cream) Stay(Gold)
                  RichText(
                    text: const TextSpan(
                      children: [
                        TextSpan(
                          text: 'Hour',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFFFF7E6),
                            letterSpacing: -0.3,
                          ),
                        ),
                        TextSpan(
                          text: ' ',
                        ),
                        TextSpan(
                          text: 'Stay',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFF5C06A),
                            letterSpacing: -0.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    propertyTitle,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: Color(0xB3FFF7E6),
                      letterSpacing: -0.1,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Notification Icon with Badge
          IconButton(
            icon: Badge(
              isLabelVisible: unreadNotifs > 0,
              backgroundColor: const Color(0xFFE53935),
              textColor: Colors.white,
              label: Text(
                unreadNotifs > 99 ? '99+' : '$unreadNotifs',
                style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
              ),
              child: const Icon(
                Icons.notifications_outlined,
                color: Color(0xFFFFF7E6),
                size: 24,
              ),
            ),
            tooltip: 'Notifications',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ManagerNotificationsScreen()),
              );
            },
          ),
          // Profile Avatar Icon with Dropdown Menu
          Padding(
            padding: const EdgeInsets.only(right: 14, left: 4),
            child: PopupMenuButton<String>(
              offset: const Offset(0, 48),
              elevation: 8,
              shadowColor: Colors.black.withAlpha(80),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
              ),
              color: Colors.white,
              icon: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFFFF7E6),
                  border: Border.all(
                    color: const Color(0xFFF5C06A),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(50),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: ClipOval(
                  child: _buildAvatarImageWidget(
                    user: user,
                    size: 36,
                    fontSize: 15,
                  ),
                ),
              ),
              onSelected: (value) {
                if (value == 'profile') {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const ManagerProfileScreen(),
                    ),
                  ).then((_) {
                    if (context.mounted) {
                      context.read<AuthProvider>().refreshProfile();
                    }
                  });
                } else if (value == 'signout') {
                  _showSignOutConfirmation(context);
                }
              },
              itemBuilder: (context) => [
                // 1. User Header
                PopupMenuItem<String>(
                  enabled: false,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFFFFF7E6),
                            border: Border.all(
                              color: const Color(0xFFF5C06A),
                              width: 1.5,
                            ),
                          ),
                          child: ClipOval(
                            child: _buildAvatarImageWidget(
                              user: user,
                              size: 40,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.name.isNotEmpty == true
                                    ? user!.name
                                    : 'Hotel Manager',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF0D1B2A),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                user?.email.isNotEmpty == true
                                    ? user!.email
                                    : 'manager@hourstay.com',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: Color(0xFF8A8F98),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const PopupMenuDivider(height: 1),
                // 2. Profile Action
                const PopupMenuItem<String>(
                  value: 'profile',
                  child: Row(
                    children: [
                      Icon(Icons.person_outline_rounded,
                          size: 19, color: Color(0xFF0D1B2A)),
                      SizedBox(width: 10),
                      Text(
                        'Profile',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF0D1B2A),
                        ),
                      ),
                    ],
                  ),
                ),
                const PopupMenuDivider(height: 1),
                // 3. Sign Out Action
                const PopupMenuItem<String>(
                  value: 'signout',
                  child: Row(
                    children: [
                      Icon(Icons.logout_rounded,
                          size: 19, color: Color(0xFFE53935)),
                      SizedBox(width: 10),
                      Text(
                        'Sign Out',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFE53935),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          Positioned.fill(
            child: IndexedStack(
              index: _currentIndex,
              children: _bottomNavScreens,
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: ManagerFloatingNavBar(
              currentIndex: _currentIndex,
              onTap: (index) {
                setState(() => _currentIndex = index);
                if (index == 0) {
                  context.read<ReservationProvider>().fetchAll(silent: true);
                  context.read<PaymentProvider>().fetchAll(silent: true);
                  context.read<RoomProvider>().fetchAll(silent: true);
                } else if (index == 1) {
                  context.read<ReservationProvider>().fetchAll(silent: true);
                } else if (index == 2) {
                  context.read<RoomProvider>().fetchAll(silent: true);
                } else if (index == 3) {
                  context.read<ApprovalProvider>().fetchAll(silent: true);
                } else if (index == 4) {
                  context.read<PaymentProvider>().fetchAll(silent: true);
                }
              },
              pendingApprovals: pendingApprovals,
            ),
          ),
        ],
      ),
    );
  }

  void _showSignOutConfirmation(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: Color(0xFFE53935), size: 22),
            SizedBox(width: 8),
            Text(
              'Sign Out',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0D1B2A),
              ),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to sign out from your Manager account?',
          style: TextStyle(fontSize: 13.5, color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text(
              'Cancel',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: Color(0xFF8A8F98),
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFE53935),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              context.read<AuthProvider>().logout();
            },
            child: const Text(
              'Sign Out',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }
}
