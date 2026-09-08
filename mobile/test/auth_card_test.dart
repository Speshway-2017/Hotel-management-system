import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hour_stay_mobile/widgets/auth_card.dart';

void main() {
  testWidgets('AuthCard renders login mode elements correctly', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AuthCard(
            mode: AuthMode.login,
            onSubmit: ({
              String name = '',
              String email = '',
              String mobile = '',
              String password = '',
              String confirmPassword = '',
              String otp = '',
            }) async {},
          ),
        ),
      ),
    );

    expect(find.text('Sign In'), findsNWidgets(2)); // Title & Button
    expect(find.text('Sign in to your property workspace.'), findsOneWidget);
    expect(find.text('E-mail'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Forgot Password ?'), findsOneWidget);
  });

  testWidgets('AuthCard renders register mode elements correctly', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AuthCard(
            mode: AuthMode.register,
            onSubmit: ({
              String name = '',
              String email = '',
              String mobile = '',
              String password = '',
              String confirmPassword = '',
              String otp = '',
            }) async {},
          ),
        ),
      ),
    );

    expect(find.text('Create Account'), findsNWidgets(2)); // Title & Button
    expect(find.text('Full Name'), findsOneWidget);
    expect(find.text('E-mail'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Mobile Number'), findsOneWidget);
  });
}
