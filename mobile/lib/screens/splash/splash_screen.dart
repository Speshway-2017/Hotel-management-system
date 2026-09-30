import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/storage_service.dart';
import '../onboarding/onboarding_screen.dart';
import '../role_gate.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  // Brand Palette Constants
  static const Color cDeepNavy = Color(0xFF0D1B2A);
  static const Color cPurple = Color(0xFF5B21B6);
  static const Color cBlushPink = Color(0xFFFF6B8B);
  static const Color cWarmGold = Color(0xFFF5C06A);
  static const Color cCream = Color(0xFFFFF7E6);
  static const Color cWhite = Color(0xFFFFFFFF);

  late final AnimationController _logoController;
  late final AnimationController _progressController;
  late final Animation<double> _scaleAnimation;
  late final Animation<double> _fadeAnimation;
  late final Animation<double> _slideAnimation;
  late final Animation<double> _progressAnimation;

  @override
  void initState() {
    super.initState();

    // 1. Logo scale & fade animation
    _logoController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _scaleAnimation = Tween<double>(begin: 0.82, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: const Interval(0.0, 0.75, curve: Curves.easeOutBack),
      ),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: const Interval(0.0, 0.7, curve: Curves.easeIn),
      ),
    );

    _slideAnimation = Tween<double>(begin: 18.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: const Interval(0.2, 0.9, curve: Curves.easeOutCubic),
      ),
    );

    // 2. Animated progress bar controller
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );

    _progressAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _progressController,
        curve: Curves.easeInOutCubic,
      ),
    );

    _logoController.forward();
    _progressController.forward();
    _checkNextScreen();
  }

  Future<void> _checkNextScreen() async {
    // Allow smooth animation completion
    await Future.delayed(const Duration(milliseconds: 2300));

    if (!mounted) return;

    final token = await StorageService.getToken();
    final user = await StorageService.getUser();

    if (!mounted) return;

    Widget nextScreen;
    if (token != null && token.isNotEmpty && user != null) {
      // Already signed in: navigate straight to Guest Home (or Manager Home) via RoleGate
      nextScreen = const RoleGate();
    } else {
      // Not signed in: always show the Onboarding auto-carousel
      nextScreen = const OnboardingScreen();
    }

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => nextScreen,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: CurvedAnimation(
              parent: animation,
              curve: Curves.easeInOut,
            ),
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 550),
      ),
    );
  }

  @override
  void dispose() {
    _logoController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: cDeepNavy,
      body: Stack(
        children: [
          // 1. Ambient Luxury Radial Glows
          Positioned(
            top: -size.width * 0.25,
            right: -size.width * 0.2,
            child: Container(
              width: size.width * 0.8,
              height: size.width * 0.8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    cWarmGold.withAlpha(30),
                    cPurple.withAlpha(20),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.45, 1.0],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -size.width * 0.25,
            left: -size.width * 0.2,
            child: Container(
              width: size.width * 0.85,
              height: size.width * 0.85,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    cBlushPink.withAlpha(22),
                    cPurple.withAlpha(25),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.5, 1.0],
                ),
              ),
            ),
          ),

          // 2. Centered Logo, Typography, and Taglines
          Center(
            child: AnimatedBuilder(
              animation: _logoController,
              builder: (context, child) {
                return FadeTransition(
                  opacity: _fadeAnimation,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Logo Icon Box
                      Transform.scale(
                        scale: _scaleAnimation.value,
                        child: Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            color: cWhite,
                            borderRadius: BorderRadius.circular(26),
                            border: Border.all(
                              color: cWarmGold,
                              width: 2.2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: cWarmGold.withAlpha(70),
                                blurRadius: 26,
                                spreadRadius: 1,
                                offset: const Offset(0, 6),
                              ),
                              BoxShadow(
                                color: cPurple.withAlpha(60),
                                blurRadius: 20,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          padding: const EdgeInsets.all(15),
                          child: Image.asset(
                            'assets/logo.png',
                            fit: BoxFit.contain,
                            errorBuilder: (_, _, _) => const Icon(
                              Icons.hotel_rounded,
                              size: 46,
                              color: cDeepNavy,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Brand Name Typography & Taglines
                      Transform.translate(
                        offset: Offset(0, _slideAnimation.value),
                        child: Column(
                          children: [
                            // Hour Stay Brand Name
                            RichText(
                              text: TextSpan(
                                children: [
                                  TextSpan(
                                    text: 'Hour',
                                    style: GoogleFonts.playfairDisplay(
                                      fontSize: 32,
                                      fontWeight: FontWeight.w900,
                                      color: cCream,
                                      letterSpacing: -0.3,
                                    ),
                                  ),
                                  const TextSpan(text: ' '),
                                  TextSpan(
                                    text: 'Stay',
                                    style: GoogleFonts.playfairDisplay(
                                      fontSize: 32,
                                      fontWeight: FontWeight.w900,
                                      color: cWarmGold,
                                      letterSpacing: -0.3,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Tagline: “STAY FOR HOURS, PAY FOR TIME”
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: cWarmGold.withAlpha(25),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: cWarmGold.withAlpha(120),
                                  width: 1.0,
                                ),
                              ),
                              child: Text(
                                'STAY FOR HOURS, PAY FOR TIME',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: cWarmGold,
                                  letterSpacing: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),

          // 3. Bottom Clean Animated Loading / Progress Bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 48,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: Column(
                children: [
                  // Animated Progress Bar
                  AnimatedBuilder(
                    animation: _progressAnimation,
                    builder: (context, child) {
                      const double barWidth = 190.0;
                      const double barHeight = 4.5;
                      final double currentWidth = barWidth * _progressAnimation.value;

                      return Container(
                        width: barWidth,
                        height: barHeight,
                        decoration: BoxDecoration(
                          color: cWhite.withAlpha(20),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: cWarmGold.withAlpha(40),
                            width: 0.6,
                          ),
                        ),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Container(
                            width: currentWidth,
                            height: barHeight,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              gradient: const LinearGradient(
                                colors: [
                                  cPurple,
                                  cBlushPink,
                                  cWarmGold,
                                ],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: cWarmGold.withAlpha(120),
                                  blurRadius: 8,
                                  offset: const Offset(0, 1),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
