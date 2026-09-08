import 'package:flutter/material.dart';
import '../../widgets/auth_card.dart';
import 'login_screen.dart';

class ResetPasswordScreen extends StatelessWidget {
  final String email;
  final String otp;

  const ResetPasswordScreen({
    super.key,
    required this.email,
    required this.otp,
  });

  @override
  Widget build(BuildContext context) {
    return LoginScreen(
      initialMode: AuthMode.reset,
      initialEmail: email,
      initialOtp: otp,
    );
  }
}
