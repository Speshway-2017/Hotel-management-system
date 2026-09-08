import 'package:flutter/material.dart';
import '../../widgets/auth_card.dart';
import 'login_screen.dart';

class VerifyOtpScreen extends StatelessWidget {
  final String email;

  const VerifyOtpScreen({
    super.key,
    required this.email,
  });

  @override
  Widget build(BuildContext context) {
    return LoginScreen(
      initialMode: AuthMode.otp,
      initialEmail: email,
    );
  }
}
