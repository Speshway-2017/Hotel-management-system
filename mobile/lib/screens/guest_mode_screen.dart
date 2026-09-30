import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../colours.dart';
import '../providers/manager/room_provider.dart';
import '../widgets/guest_floating_nav_bar.dart';
import 'auth/login_screen.dart';
import 'guest/home/guest_home_screen.dart';
import 'guest/search/guest_search_screen.dart';

class GuestModeScreen extends StatefulWidget {
  const GuestModeScreen({super.key});

  @override
  State<GuestModeScreen> createState() => _GuestModeScreenState();
}

class _GuestModeScreenState extends State<GuestModeScreen> {
  int _currentIndex = 2; // Default to Home screen (index 2)

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RoomProvider>().fetchAll(silent: true);
    });
  }

  void _navigateToLogin() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      const SizedBox.shrink(), // Index 0: Bookings (Auth-gated)
      GuestSearchScreen(
        onNavigateTab: (index) {
          if (index == 0 || index == 3 || index == 4) {
            _navigateToLogin();
          } else {
            setState(() => _currentIndex = index);
          }
        },
      ), // Index 1: Search & Explore (Public)
      GuestHomeScreen(
        isGuestMode: true,
        onNavigateTab: (index) {
          if (index == 0 || index == 3 || index == 4) {
            _navigateToLogin();
          } else {
            setState(() => _currentIndex = index);
          }
        },
      ), // Index 2: Home (Public)
      const SizedBox.shrink(), // Index 3: Payments (Auth-gated)
      const SizedBox.shrink(), // Index 4: Profile (Auth-gated)
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
            // Hour Stay Brand Logo
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
                  const Text(
                    'Guest Mode',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
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
          // Sign In Pill Action Button
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: TextButton.icon(
              onPressed: _navigateToLogin,
              icon: const Icon(Icons.login_rounded, size: 14, color: gold),
              label: Text(
                'Sign In',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: cream,
                ),
              ),
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                backgroundColor: Colors.white.withAlpha(20),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: gold.withAlpha(120), width: 1.0),
                ),
              ),
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
              activeBookingsCount: 0,
              onTap: (index) {
                // In Guest Mode (before login), Bookings (0), Payments (3), and Profile (4) prompt to Login
                if (index == 0 || index == 3 || index == 4) {
                  _navigateToLogin();
                  return;
                }

                setState(() => _currentIndex = index);
                if (index == 1 || index == 2) {
                  context.read<RoomProvider>().fetchAll(silent: true);
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
