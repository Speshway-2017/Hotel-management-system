import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hour_stay_mobile/widgets/manager_floating_nav_bar.dart';

void main() {
  testWidgets('ManagerFloatingNavBar renders all 5 tabs and handles tap', (WidgetTester tester) async {
    int selectedIndex = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ManagerFloatingNavBar(
            currentIndex: selectedIndex,
            onTap: (index) {
              selectedIndex = index;
            },
            pendingApprovals: 3,
          ),
        ),
      ),
    );

    // Verify all 5 tab labels exist
    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.text('Reservations'), findsOneWidget);
    expect(find.text('Rooms'), findsOneWidget);
    expect(find.text('Approvals'), findsOneWidget);
    expect(find.text('Payments'), findsOneWidget);

    // Verify approvals badge is visible
    expect(find.text('3'), findsOneWidget);

    // Tap on Reservations tab (index 1)
    await tester.tap(find.text('Reservations'));
    await tester.pumpAndSettle();

    expect(selectedIndex, 1);
  });
}
