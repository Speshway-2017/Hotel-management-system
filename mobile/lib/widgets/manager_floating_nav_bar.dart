import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hour_stay_mobile/colours.dart';

class ManagerBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final int pendingApprovals;

  const ManagerBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.pendingApprovals = 0,
  });


  static const List<ManagerNavItem> items = [
    ManagerNavItem(
      label: 'Dashboard',
      icon: Icons.dashboard_outlined,
      activeIcon: Icons.dashboard,
    ),
    ManagerNavItem(
      label: 'Reservations',
      icon: Icons.calendar_month_outlined,
      activeIcon: Icons.calendar_month,
    ),
    ManagerNavItem(
      label: 'Rooms',
      icon: Icons.hotel_outlined,
      activeIcon: Icons.hotel,
    ),
    ManagerNavItem(
      label: 'Approvals',
      icon: Icons.verified_outlined,
      activeIcon: Icons.verified,
    ),
    ManagerNavItem(
      label: 'Payments',
      icon: Icons.account_balance_wallet_outlined,
      activeIcon: Icons.account_balance_wallet,
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
          // 1. Full-Width Navigation Bar Container (Deep Navy with rounded top corners)
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

          // 2. Raised Circular Active-Tab Indicator in Cream #FFF7E6
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
                      color: pink.withAlpha(102),
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
    ManagerNavItem item,
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
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(
                    item.icon,
                    size: 23,
                    color: muted,
                  ),

                  // Notification badge on inactive approvals tab
                  if (index == 3 && pendingApprovals > 0)
                    Positioned(
                      right: -9,
                      top: -7,
                      child: Container(
                        constraints: const BoxConstraints(
                          minWidth: 17,
                          minHeight: 17,
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 4,
                        ),
                        decoration: BoxDecoration(
                          color: badgeRed,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: navy,
                            width: 1.5,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            pendingApprovals > 99
                                ? '99+'
                                : '$pendingApprovals',
                            style: const TextStyle(
                              color: white,
                              fontSize: 9,
                              fontWeight: FontWeight.w700,
                              height: 1.1,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
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
              // Active tab space for the raised circular indicator
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

class ManagerNavItem {
  final String label;
  final IconData icon;
  final IconData activeIcon;

  const ManagerNavItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
  });
}

/// Type alias to maintain backwards compatibility with existing references
typedef ManagerFloatingNavBar = ManagerBottomNav;
