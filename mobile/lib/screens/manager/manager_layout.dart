import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/manager/approval_provider.dart';
import '../../providers/manager/manager_notification_provider.dart';
import '../../providers/manager/payment_provider.dart';
import '../../providers/manager/reservation_provider.dart';
import '../../providers/manager/room_provider.dart';
import '../../widgets/server_config_dialog.dart';
import 'approvals/manager_approvals_screen.dart';
import 'dashboard/manager_dashboard_screen.dart';
import 'feedback/manager_feedback_screen.dart';
import 'notifications/manager_notifications_screen.dart';
import 'payments/manager_payments_screen.dart';
import 'profile/manager_profile_screen.dart';
import 'reservations/manager_reservations_screen.dart';
import 'rooms/manager_rooms_screen.dart';
import 'staff/manager_staff_screen.dart';

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
    context.read<ReservationProvider>().fetchAll();
    context.read<RoomProvider>().fetchAll();
    context.read<ApprovalProvider>().fetchAll();
    context.read<PaymentProvider>().fetchAll();
    context.read<ManagerNotificationProvider>().fetchNotifications();
  }

  final List<Widget> _bottomNavScreens = const [
    ManagerDashboardScreen(),
    ManagerReservationsScreen(),
    ManagerRoomsScreen(),
    ManagerApprovalsScreen(),
    ManagerProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final approvalProvider = context.watch<ApprovalProvider>();
    final notificationProvider = context.watch<ManagerNotificationProvider>();
    final pendingApprovals = approvalProvider.pendingCount;
    final unreadNotifs = notificationProvider.unreadCount;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.secondary.withAlpha(40),
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.all(4),
              child: Image.asset(
                'assets/logo.png',
                errorBuilder: (_, _, _) => const Icon(Icons.hotel, size: 20, color: AppColors.secondary),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Hour Stay',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Manager Portal • ${user?.name ?? ""}',
                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Badge(
              isLabelVisible: unreadNotifs > 0,
              label: Text('$unreadNotifs'),
              child: const Icon(Icons.notifications_outlined),
            ),
            tooltip: 'Notifications',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ManagerNotificationsScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.dns_outlined),
            tooltip: 'Server Config',
            onPressed: () => ServerConfigDialog.show(context),
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            UserAccountsDrawerHeader(
              decoration: const BoxDecoration(
                color: AppColors.primary,
                gradient: LinearGradient(
                  colors: [AppColors.primary, AppColors.secondary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              currentAccountPicture: CircleAvatar(
                backgroundColor: Colors.white,
                child: Text(
                  user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'M',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary),
                ),
              ),
              accountName: Text(
                user?.name ?? 'Hotel Manager',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              accountEmail: Text(user?.email ?? 'manager@hotel.com'),
            ),
            ListTile(
              leading: const Icon(Icons.dashboard_outlined),
              title: const Text('Dashboard'),
              selected: _currentIndex == 0,
              onTap: () {
                Navigator.pop(context);
                setState(() => _currentIndex = 0);
              },
            ),
            ListTile(
              leading: const Icon(Icons.book_online_outlined),
              title: const Text('Reservations'),
              selected: _currentIndex == 1,
              onTap: () {
                Navigator.pop(context);
                setState(() => _currentIndex = 1);
              },
            ),
            ListTile(
              leading: const Icon(Icons.meeting_room_outlined),
              title: const Text('Rooms & Rates'),
              selected: _currentIndex == 2,
              onTap: () {
                Navigator.pop(context);
                setState(() => _currentIndex = 2);
              },
            ),
            ListTile(
              leading: Badge(
                isLabelVisible: pendingApprovals > 0,
                label: Text('$pendingApprovals'),
                child: const Icon(Icons.verified_outlined),
              ),
              title: const Text('Hourly Approvals'),
              selected: _currentIndex == 3,
              onTap: () {
                Navigator.pop(context);
                setState(() => _currentIndex = 3);
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.badge_outlined),
              title: const Text('Staff & Shifts'),
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ManagerStaffScreen()),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.payments_outlined),
              title: const Text('Payments & Revenue'),
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ManagerPaymentsScreen()),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.reviews_outlined),
              title: const Text('Guest Reviews'),
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ManagerFeedbackScreen()),
                );
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: const Text('My Profile'),
              selected: _currentIndex == 4,
              onTap: () {
                Navigator.pop(context);
                setState(() => _currentIndex = 4);
              },
            ),
            ListTile(
              leading: const Icon(Icons.logout, color: AppColors.error),
              title: const Text('Sign Out', style: TextStyle(color: AppColors.error)),
              onTap: () {
                Navigator.pop(context);
                context.read<AuthProvider>().logout();
              },
            ),
          ],
        ),
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: _bottomNavScreens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textTertiary,
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.book_online_outlined),
            activeIcon: Icon(Icons.book_online),
            label: 'Bookings',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.meeting_room_outlined),
            activeIcon: Icon(Icons.meeting_room),
            label: 'Rooms',
          ),
          BottomNavigationBarItem(
            icon: Badge(
              isLabelVisible: pendingApprovals > 0,
              label: Text('$pendingApprovals'),
              child: const Icon(Icons.verified_outlined),
            ),
            activeIcon: Badge(
              isLabelVisible: pendingApprovals > 0,
              label: Text('$pendingApprovals'),
              child: const Icon(Icons.verified),
            ),
            label: 'Approvals',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
