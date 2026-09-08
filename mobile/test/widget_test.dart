import 'package:flutter_test/flutter_test.dart';
import 'package:hour_stay_mobile/main.dart';

void main() {
  testWidgets('Hour Stay mobile app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const HourStayApp());

    // Verify app renders
    expect(find.byType(HourStayApp), findsOneWidget);
  });
}
