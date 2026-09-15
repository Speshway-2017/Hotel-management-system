import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/api_endpoints.dart';
import '../../models/user_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/guest/guest_booking_provider.dart';
import '../../providers/guest/guest_feedback_provider.dart';
import '../../providers/guest/guest_folio_provider.dart';
import '../../providers/guest/guest_notification_provider.dart';
import '../../providers/guest/guest_payment_provider.dart';
import '../../providers/manager/room_provider.dart';
import '../../widgets/guest_floating_nav_bar.dart';
import 'bookings/guest_bookings_screen.dart';
import 'home/guest_home_screen.dart';
import 'notifications/guest_notifications_screen.dart';
import 'payments/guest_payments_screen.dart';
import 'profile/guest_profile_screen.dart';
import 'search/guest_search_screen.dart';
import 'settings/guest_settings_screen.dart';

class GuestLayout extends StatefulWidget {
  const GuestLayout({super.key});

  @override
  State<GuestLayout> createState() => _GuestLayoutState();
}

class _GuestLayoutState extends State<GuestLayout> {
  int _currentIndex = 0;

  // Hour Stay Design Palette
  static const Color navy = Color(0xFF0D1B2A);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color gold = Color(0xFFF5C06A);
  static const Color muted = Color(0xFF8A8F98);
  static const Color badgeRed = Color(0xFFE53935);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    context.read<AuthProvider>().refreshProfile();
    context.read<GuestBookingProvider>().fetchDashboardData(silent: true);
    context.read<RoomProvider>().fetchAll(silent: true);
    context.read<GuestFolioProvider>().fetchMyFolios();
    context.read<GuestPaymentProvider>().fetchPayments(silent: true);
    context.read<GuestFeedbackProvider>().fetchMyFeedbacks();
    context.read<GuestNotificationProvider>().fetchNotifications();
  }

  Widget _buildAvatarImageWidget({
    required UserModel? user,
    required double size,
    required double fontSize,
  }) {
    final avatarUrl = ApiEndpoints.resolveImageUrl(user?.avatar);
    final initial = user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'G';

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
          color: navy,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final notifProvider = context.watch<GuestNotificationProvider>();
    final bookingProvider = context.watch<GuestBookingProvider>();
    final unreadNotifs = notifProvider.unreadCount;

    final activeBookingsCount = bookingProvider.bookings
        .where((b) => b.status.toLowerCase() != 'checked_out' && b.status.toLowerCase() != 'cancelled')
        .length;

    final firstName = user?.name.isNotEmpty == true ? user!.name.split(" ").first : "Valued Guest";

    final screens = [
      GuestHomeScreen(
        onNavigateTab: (index) => setState(() => _currentIndex = index),
      ),
      const GuestSearchScreen(),
      GuestBookingsScreen(
        onNavigateTab: (index) => setState(() => _currentIndex = index),
      ),
      GuestPaymentsScreen(
        onNavigateTab: (index) => setState(() => _currentIndex = index),
      ),
      const GuestProfileScreen(),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: navy,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: Row(
          children: [
            // White rounded container with logo
            Container(
              width: 36,
              height: 36,
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
                  size: 20,
                  color: navy,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  RichText(
                    text: const TextSpan(
                      children: [
                        TextSpan(
                          text: 'Hour',
                          style: TextStyle(
                            fontSize: 16.5,
                            fontWeight: FontWeight.w800,
                            color: cream,
                            letterSpacing: -0.3,
                          ),
                        ),
                        TextSpan(
                          text: ' ',
                        ),
                        TextSpan(
                          text: 'Stay',
                          style: TextStyle(
                            fontSize: 16.5,
                            fontWeight: FontWeight.w800,
                            color: gold,
                            letterSpacing: -0.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    'Welcome, $firstName',
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
          // Notifications
          IconButton(
            icon: Badge(
              isLabelVisible: unreadNotifs > 0,
              backgroundColor: badgeRed,
              textColor: Colors.white,
              label: Text(
                unreadNotifs > 99 ? '99+' : '$unreadNotifs',
                style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold),
              ),
              child: const Icon(
                Icons.notifications_outlined,
                color: cream,
                size: 24,
              ),
            ),
            tooltip: 'Notifications',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const GuestNotificationsScreen()),
              );
            },
          ),
          // User Avatar Popup Menu
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
                  color: cream,
                  border: Border.all(
                    color: gold,
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
                  setState(() => _currentIndex = 4);
                  context.read<AuthProvider>().refreshProfile();
                } else if (value == 'settings') {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const GuestSettingsScreen()),
                  );
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
                            color: cream,
                            border: Border.all(
                              color: gold,
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
                                user?.name.isNotEmpty == true ? user!.name : 'Valued Guest',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: navy,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                user?.email.isNotEmpty == true ? user!.email : 'guest@hourstay.com',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: muted,
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
                      Icon(Icons.person_outline_rounded, size: 19, color: navy),
                      SizedBox(width: 10),
                      Text(
                        'Profile',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: navy,
                        ),
                      ),
                    ],
                  ),
                ),
                // 3. Settings Action
                const PopupMenuItem<String>(
                  value: 'settings',
                  child: Row(
                    children: [
                      Icon(Icons.settings_outlined, size: 19, color: navy),
                      SizedBox(width: 10),
                      Text(
                        'Settings & Preferences',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: navy,
                        ),
                      ),
                    ],
                  ),
                ),
                const PopupMenuDivider(height: 1),
                // 4. Sign Out Action
                const PopupMenuItem<String>(
                  value: 'signout',
                  child: Row(
                    children: [
                      Icon(Icons.logout_rounded, size: 19, color: badgeRed),
                      SizedBox(width: 10),
                      Text(
                        'Sign Out',
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: badgeRed,
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
              children: screens,
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: GuestBottomNav(
              currentIndex: _currentIndex,
              activeBookingsCount: activeBookingsCount,
              onTap: (index) {
                setState(() => _currentIndex = index);
                if (index == 0) {
                  context.read<RoomProvider>().fetchAll(silent: true);
                  context.read<GuestBookingProvider>().fetchDashboardData(silent: true);
                } else if (index == 1) {
                  context.read<RoomProvider>().fetchAll(silent: true);
                } else if (index == 2) {
                  context.read<GuestBookingProvider>().fetchMyBookings(silent: true);
                } else if (index == 3) {
                  context.read<GuestPaymentProvider>().fetchPayments();
                  context.read<GuestFolioProvider>().fetchMyFolios(silent: true);
                } else if (index == 4) {
                  context.read<AuthProvider>().refreshProfile();
                  context.read<GuestBookingProvider>().fetchMyBookings(silent: true);
                }
              },
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
            Icon(Icons.logout_rounded, color: badgeRed, size: 22),
            SizedBox(width: 8),
            Text(
              'Sign Out',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to sign out from your Hour Stay account?',
          style: TextStyle(fontSize: 13.5, color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text(
              'Cancel',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: muted,
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: badgeRed,
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
