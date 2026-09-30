import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/storage_service.dart';
import '../guest_mode_screen.dart';
import '../auth/login_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  // Brand Palette Constants
  static const Color cDeepNavy = Color(0xFF0D1B2A);
  static const Color cPurple = Color(0xFF5B21B6);
  static const Color cBlushPink = Color(0xFFFF6B8B);
  static const Color cWarmGold = Color(0xFFF5C06A);
  static const Color cCream = Color(0xFFFFF7E6);
  static const Color cWhite = Color(0xFFFFFFFF);

  final PageController _pageController = PageController();
  int _currentPage = 0;
  Timer? _autoTimer;

  final List<_OnboardingSlideData> _slides = const [
    _OnboardingSlideData(
      badge: 'FLEXIBLE LUXURY',
      badgeIcon: Icons.king_bed_rounded,
      title: 'Discover Luxury Rooms\nBy The Hour',
      description:
          'Experience 5-star hotel comfort with bespoke hourly flexibility. Book premium stays tailored precisely to your schedule.',
      imageUrl:
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1000&auto=format&fit=crop&q=80',
    ),
    _OnboardingSlideData(
      badge: 'EASY ALLOCATION',
      badgeIcon: Icons.bolt_rounded,
      title: 'Instant Booking &\nFast Confirmation',
      description:
          'Select your preferred check-in slot, customize your duration, and unlock instant room confirmation with transparent pricing.',
      imageUrl:
          'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1000&auto=format&fit=crop&q=80',
    ),
    _OnboardingSlideData(
      badge: 'SMART SERVICES',
      badgeIcon: Icons.room_service_rounded,
      title: 'Seamless Stay &\nDigital Invoices',
      description:
          'Track live room folios, order guest room services, download instant GST invoices, and enjoy 24/7 dedicated concierge care.',
      imageUrl:
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1000&auto=format&fit=crop&q=80',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _startAutoCarousel();
  }

  void _startAutoCarousel() {
    _autoTimer?.cancel();
    _autoTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (!_pageController.hasClients) return;
      final int nextPage = (_currentPage + 1) % _slides.length;
      _pageController.animateToPage(
        nextPage,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOutCubic,
      );
    });
  }

  void _pauseAndRestartTimer() {
    _autoTimer?.cancel();
    _startAutoCarousel();
  }

  @override
  void dispose() {
    _autoTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _skipToGuestMode() async {
    HapticFeedback.mediumImpact();
    _autoTimer?.cancel();
    await StorageService.saveOnboardingCompleted(true);
    if (!mounted) return;

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => const GuestModeScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: CurvedAnimation(
              parent: animation,
              curve: Curves.easeInOut,
            ),
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 500),
      ),
    );
  }

  Future<void> _getStartedToLogin() async {
    HapticFeedback.mediumImpact();
    _autoTimer?.cancel();
    await StorageService.saveOnboardingCompleted(true);
    if (!mounted) return;

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => const LoginScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: CurvedAnimation(
              parent: animation,
              curve: Curves.easeInOut,
            ),
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 500),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: cDeepNavy,
      body: SafeArea(
        child: Column(
          children: [
            // 1. Top Bar: Logo & Skip Action
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Top-Left Hour Stay Logo Pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: cPurple.withAlpha(45),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: cWarmGold.withAlpha(90), width: 1),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            color: cWhite,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          padding: const EdgeInsets.all(2.5),
                          child: Image.asset(
                            'assets/logo.png',
                            fit: BoxFit.contain,
                            errorBuilder: (_, _, _) => const Icon(
                              Icons.hotel_rounded,
                              size: 14,
                              color: cDeepNavy,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        RichText(
                          text: TextSpan(
                            children: [
                              TextSpan(
                                text: 'Hour',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: cCream,
                                ),
                              ),
                              const TextSpan(text: ' '),
                              TextSpan(
                                text: 'Stay',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: cWarmGold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Top-Right Skip Action Button
                  TextButton(
                    onPressed: _skipToGuestMode,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      backgroundColor: cWhite.withAlpha(15),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: BorderSide(color: cWhite.withAlpha(40)),
                      ),
                    ),
                    child: Text(
                      'Skip',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: cCream,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // 2. Auto-Carousel PageView (2s interval + manual swipe)
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _slides.length,
                onPageChanged: (index) {
                  setState(() => _currentPage = index);
                  _pauseAndRestartTimer();
                },
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  return _buildSlideContent(slide, size);
                },
              ),
            ),

            // 3. Bottom Controls: Carousel Indicators & Get Started Button
            Container(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: Column(
                children: [
                  // Carousel Indicators (Dots/Pills)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      _slides.length,
                      (index) => GestureDetector(
                        onTap: () {
                          _pageController.animateToPage(
                            index,
                            duration: const Duration(milliseconds: 400),
                            curve: Curves.easeInOutCubic,
                          );
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOutCubic,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: _currentPage == index ? 26 : 8,
                          height: 7,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(6),
                            gradient: _currentPage == index
                                ? const LinearGradient(
                                    colors: [cWarmGold, cBlushPink],
                                  )
                                : null,
                            color: _currentPage == index ? null : cWhite.withAlpha(40),
                            boxShadow: _currentPage == index
                                ? [
                                    BoxShadow(
                                      color: cWarmGold.withAlpha(110),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Get Started Action Button
                  SizedBox(
                    width: double.infinity,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [
                            cPurple,
                            Color(0xFF3B1D70),
                            cDeepNavy,
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: cWarmGold, width: 1.4),
                        boxShadow: [
                          BoxShadow(
                            color: cWarmGold.withAlpha(90),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                          BoxShadow(
                            color: cPurple.withAlpha(100),
                            blurRadius: 14,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: ElevatedButton(
                        onPressed: _getStartedToLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          foregroundColor: cCream,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              'Get Started',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: cCream,
                                letterSpacing: 0.4,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Icon(
                              Icons.arrow_forward_rounded,
                              size: 19,
                              color: cWarmGold,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSlideContent(_OnboardingSlideData slide, Size size) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 6),
      child: Column(
        children: [
          // 1. Large Hotel/Lifestyle Image Card
          Container(
            height: 260,
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: cWarmGold.withAlpha(90),
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: cPurple.withAlpha(90),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(22.5),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Hotel/Lifestyle Image with error and placeholder builder
                  Image.network(
                    slide.imageUrl,
                    fit: BoxFit.cover,
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) return child;
                      return Container(
                        color: const Color(0xFF132035),
                        child: Center(
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              cWarmGold.withAlpha(200),
                            ),
                          ),
                        ),
                      );
                    },
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        color: const Color(0xFF132035),
                        child: Center(
                          child: Icon(
                            slide.badgeIcon,
                            size: 64,
                            color: cWarmGold.withAlpha(180),
                          ),
                        ),
                      );
                    },
                  ),

                  // Dark gradient overlay
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.transparent,
                          cDeepNavy.withAlpha(160),
                          cDeepNavy.withAlpha(220),
                        ],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        stops: const [0.5, 0.8, 1.0],
                      ),
                    ),
                  ),

                  // Floating Category Badge on Image
                  Positioned(
                    top: 14,
                    left: 14,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: cDeepNavy.withAlpha(220),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: cWarmGold, width: 1.0),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(100),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(slide.badgeIcon, size: 13, color: cWarmGold),
                          const SizedBox(width: 6),
                          Text(
                            slide.badge,
                            style: GoogleFonts.inter(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: cWarmGold,
                              letterSpacing: 1.0,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // 2. Bold Heading
          Text(
            slide.title,
            textAlign: TextAlign.center,
            style: GoogleFonts.playfairDisplay(
              fontSize: 25,
              fontWeight: FontWeight.w900,
              color: cCream,
              height: 1.25,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 12),

          // 3. Short Description
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              slide.description,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 13.5,
                fontWeight: FontWeight.w400,
                color: const Color(0xFF94A3B8),
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OnboardingSlideData {
  final String badge;
  final IconData badgeIcon;
  final String title;
  final String description;
  final String imageUrl;

  const _OnboardingSlideData({
    required this.badge,
    required this.badgeIcon,
    required this.title,
    required this.description,
    required this.imageUrl,
  });
}
