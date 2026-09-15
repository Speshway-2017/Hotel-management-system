import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class GuestBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final int activeBookingsCount;

  const GuestBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.activeBookingsCount = 0,
  });

  // Hour Stay Design Tokens
  static const Color navy = Color(0xFF0D1B2A);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color purple = Color(0xFF5B21B6);
  static const Color gold = Color(0xFFF5C06A);
  static const Color white = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF8A8F98);
  static const Color badgeRed = Color(0xFFE53935);

  static const List<GuestNavItem> items = [
    GuestNavItem(
      label: 'Home',
      icon: Icons.home_outlined,
      activeIcon: Icons.home_rounded,
    ),
    GuestNavItem(
      label: 'Search',
      icon: Icons.search_rounded,
      activeIcon: Icons.search_rounded,
    ),
    GuestNavItem(
      label: 'Bookings',
      icon: Icons.calendar_month_outlined,
      activeIcon: Icons.calendar_month_rounded,
    ),
    GuestNavItem(
      label: 'Payments',
      icon: Icons.account_balance_wallet_outlined,
      activeIcon: Icons.account_balance_wallet_rounded,
    ),
    GuestNavItem(
      label: 'Profile',
      icon: Icons.person_outline_rounded,
      activeIcon: Icons.person_rounded,
    ),
  ];

  static const double barHeight = 68.0;
  static const double raisedDiameter = 56.0;

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    final totalHeight = barHeight + bottomInset + 14.0;

    return SizedBox(
      height: totalHeight,
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.bottomCenter,
        children: [
          // 1. Full-Width Navigation Bar Container (Deep Navy with soft elevation shadow)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              height: barHeight + bottomInset,
              padding: EdgeInsets.only(bottom: bottomInset > 0 ? bottomInset : 4),
              decoration: BoxDecoration(
                color: navy,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(64),
                    blurRadius: 18,
                    spreadRadius: 2,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: Row(
                children: List.generate(
                  items.length,
                  (index) => Expanded(
                    child: _buildNavItem(
                      context,
                      index,
                      items[index],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // 2. Raised Circular Active-Tab Indicator in Cream #FFF7E6 with Deep Navy icon
          AnimatedPositioned(
            duration: const Duration(milliseconds: 280),
            curve: Curves.easeOutCubic,
            left: _indicatorLeft(context),
            bottom: barHeight + bottomInset - (raisedDiameter / 2) - 4,
            child: GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                onTap(currentIndex);
              },
              child: Container(
                width: raisedDiameter,
                height: raisedDiameter,
                decoration: BoxDecoration(
                  color: cream,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: gold,
                    width: 2.0,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: purple.withAlpha(90),
                      blurRadius: 16,
                      spreadRadius: 2,
                      offset: const Offset(0, 4),
                    ),
                    BoxShadow(
                      color: gold.withAlpha(128),
                      blurRadius: 12,
                      spreadRadius: 1,
                      offset: const Offset(0, 2),
                    ),
                    BoxShadow(
                      color: Colors.black.withAlpha(64),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    transitionBuilder: (child, anim) =>
                        ScaleTransition(scale: anim, child: child),
                    child: Icon(
                      items[currentIndex].activeIcon,
                      key: ValueKey<int>(currentIndex),
                      color: navy,
                      size: 26,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  double _indicatorLeft(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final itemWidth = screenWidth / items.length;

    return (itemWidth * currentIndex) +
        (itemWidth / 2) -
        (raisedDiameter / 2);
  }

  Widget _buildNavItem(
    BuildContext context,
    int index,
    GuestNavItem item,
  ) {
    final bool selected = currentIndex == index;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onTap(index);
      },
      child: SizedBox(
        height: barHeight,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (!selected) ...[
              Icon(
                item.icon,
                size: 23,
                color: muted,
              ),
              const SizedBox(height: 4),
              Text(
                item.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: muted,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w500,
                  letterSpacing: -0.1,
                ),
              ),
            ] else ...[
              // Active tab space reserved for the raised circular indicator
              const SizedBox(height: 24),
              Text(
                item.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: cream,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.1,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class GuestNavItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;

  const GuestNavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
  });
}

/// Type alias for backward compatibility or alternate naming
typedef GuestFloatingNavBar = GuestBottomNav;
