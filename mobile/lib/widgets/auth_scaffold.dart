import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/constants/app_colors.dart';
import '../colours.dart';
import '../screens/guest_mode_screen.dart';

class AuthScaffold extends StatelessWidget {
  final Widget child;
  final bool showGuestSkip;
  final VoidCallback? onSkip;

  const AuthScaffold({
    super.key,
    required this.child,
    this.showGuestSkip = true,
    this.onSkip,
  });

  void _handleSkip(BuildContext context) {
    if (onSkip != null) {
      onSkip!();
    } else if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const GuestModeScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.navy,
      resizeToAvoidBottomInset: true,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Full-screen Background Image (matching web retreat_kerala.png)
          Image.asset(
            'assets/retreat_kerala.png',
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
            alignment: Alignment.center,
            errorBuilder: (context, error, stackTrace) => Container(
              color: AppColors.navy,
            ),
          ),

          // 2. Subtle Dark Gradient Overlay
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xD90D1B2A), // 85% opacity Navy
                  Color(0x8C0D1B2A), // 55% opacity Navy
                  Color(0xB30D1B2A), // 70% opacity Navy
                ],
              ),
            ),
          ),

          // 3. Scrollable Main Content
          SafeArea(
            child: Column(
              children: [
                // Top Header Bar: Skip only
                if (showGuestSkip)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Align(
                      alignment: Alignment.topRight,
                      child: TextButton(
                        onPressed: () => _handleSkip(context),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          backgroundColor: Colors.black.withAlpha(90),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                            side: BorderSide(color: gold.withAlpha(90), width: 1),
                          ),
                        ),
                        child: Text(
                          'Skip',
                          style: GoogleFonts.inter(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: cream,
                          ),
                        ),
                      ),
                    ),
                  ),

                // Form Content
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      return SingleChildScrollView(
                        physics: const ClampingScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                        child: ConstrainedBox(
                          constraints: BoxConstraints(
                            minHeight: constraints.maxHeight,
                          ),
                          child: Center(
                            child: child,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
