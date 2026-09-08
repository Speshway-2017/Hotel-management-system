import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../providers/auth_provider.dart';
import 'auth/login_screen.dart';
import 'guest/guest_layout.dart';
import 'manager/manager_layout.dart';

class RoleGate extends StatelessWidget {
  const RoleGate({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    // Initial loading / checking stored token on app launch only
    if (authProvider.isInitializing && authProvider.user == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF1F4F9),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.cream,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x300D1B2A),
                      blurRadius: 30,
                      offset: Offset(0, 10),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(12),
                child: Image.asset(
                  'assets/logo.png',
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => const Icon(
                    Icons.hotel_rounded,
                    color: AppColors.navy,
                    size: 36,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: AppColors.navy,
                  strokeWidth: 2.5,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final user = authProvider.user;

    // Unauthenticated
    if (user == null) {
      return const LoginScreen();
    }

    // Role-based routing: Manager or Guest only
    if (user.isManagerRole) {
      return const ManagerLayout();
    }

    if (user.isGuestRole) {
      return const GuestLayout();
    }

    // Fallback for unsupported roles on mobile
    return Scaffold(
      backgroundColor: const Color(0xFFF1F4F9),
      body: SafeArea(
        child: Center(
          child: Container(
            margin: const EdgeInsets.all(24),
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: AppColors.cream,
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: Colors.white, width: 4),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x300D1B2A),
                  blurRadius: 40,
                  offset: Offset(0, 15),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_outline_rounded, color: AppColors.error, size: 48),
                const SizedBox(height: 16),
                Text(
                  'Role Not Supported',
                  style: GoogleFonts.playfairDisplay(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'The mobile app currently supports Manager and Guest roles only. Please sign in via the web workspace for other roles.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => context.read<AuthProvider>().logout(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.navy,
                    foregroundColor: AppColors.cream,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(999),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                  ),
                  child: Text(
                    'SIGN OUT',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
