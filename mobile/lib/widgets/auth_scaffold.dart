import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class AuthScaffold extends StatelessWidget {
  final Widget child;

  const AuthScaffold({
    super.key,
    required this.child,
  });

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

          // 2. Subtle Dark Gradient Overlay (matching web from-navy/85 via-navy/55 to-navy/70)
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
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  physics: const ClampingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      minHeight: constraints.maxHeight - 32,
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
    );
  }
}
