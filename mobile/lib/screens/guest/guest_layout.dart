import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/guest/guest_booking_provider.dart';
import '../../providers/guest/guest_feedback_provider.dart';
import '../../providers/guest/guest_folio_provider.dart';
import '../../providers/guest/guest_notification_provider.dart';
import '../../providers/guest/guest_payment_provider.dart';
import '../../providers/manager/room_provider.dart';
import '../../widgets/guest_floating_nav_bar.dart';
import '../auth/login_screen.dart';
import 'bookings/guest_bookings_screen.dart';
import 'home/guest_home_screen.dart';
import 'notifications/guest_notifications_screen.dart';
import 'payments/guest_payments_screen.dart';
import 'profile/guest_profile_screen.dart';
import 'search/guest_search_screen.dart';
import 'package:hour_stay_mobile/colours.dart';

class GuestLayout extends StatefulWidget {
  const GuestLayout({super.key});

  @override
  State<GuestLayout> createState() => _GuestLayoutState();
}

class _GuestLayoutState extends State<GuestLayout> {
  int _currentIndex = 2; // Default to Home screen

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    final user = context.read<AuthProvider>().user;
    if (user != null) {
      context.read<AuthProvider>().refreshProfile();
      context.read<GuestBookingProvider>().fetchDashboardData(silent: true);
      context.read<GuestFolioProvider>().fetchMyFolios();
      context.read<GuestPaymentProvider>().fetchPayments(silent: true);
      context.read<GuestFeedbackProvider>().fetchMyFeedbacks();
      context.read<GuestNotificationProvider>().fetchNotifications();
    }
    context.read<RoomProvider>().fetchAll(silent: true);
  }

  void _navigateToLogin() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final notifProvider = context.watch<GuestNotificationProvider>();
    final bookingProvider = context.watch<GuestBookingProvider>();
    final unreadNotifs = user != null ? notifProvider.unreadCount : 0;

    final activeBookingsCount = user != null
        ? bookingProvider.bookings
            .where((b) => b.status.toLowerCase() != 'checked_out' && b.status.toLowerCase() != 'cancelled')
            .length
        : 0;

    final subtitleText = user != null
        ? 'Welcome, ${user.name.isNotEmpty ? user.name.split(" ").first : "Guest"}'
        : 'Guest Mode';

    final screens = [
      GuestBookingsScreen(
        onNavigateTab: (index) => setState(() => _currentIndex = index),
      ),
      GuestSearchScreen(
        onNavigateTab: (index) => setState(() => _currentIndex = index),
      ),
      GuestHomeScreen(
        onNavigateTab: (index) => setState(() => _currentIndex = index),
      ),
      GuestPaymentsScreen(
        onNavigateTab: (index) => setState(() => _currentIndex = index),
      ),
      GuestProfileScreen(
        onNavigateTab: (index) => setState(() => _currentIndex = index),
      ),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: _currentIndex == 2
          ? AppBar(
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
                    subtitleText,
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
          // Notifications Action Button
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: IconButton(
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
                if (user == null) {
                  _navigateToLogin();
                } else {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const GuestNotificationsScreen()),
                  );
                }
              },
            ),
          ),
        ],
      )
    : null,
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
                // If user is in Guest Mode (not logged in), prompt login for protected tabs:
                // Bookings (0), Payments (3), Profile (4)
                if (user == null && (index == 0 || index == 3 || index == 4)) {
                  _navigateToLogin();
                  return;
                }

                setState(() => _currentIndex = index);
                if (index == 0) {
                  context.read<GuestBookingProvider>().fetchMyBookings(silent: true);
                } else if (index == 1) {
                  context.read<RoomProvider>().fetchAll(silent: true);
                } else if (index == 2) {
                  context.read<RoomProvider>().fetchAll(silent: true);
                  if (user != null) {
                    context.read<GuestBookingProvider>().fetchDashboardData(silent: true);
                  }
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
}
