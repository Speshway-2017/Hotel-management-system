import 'package:flutter/material.dart';
import '../../widgets/auth_card.dart';
import 'login_screen.dart';

class ForgotPasswordScreen extends StatelessWidget {
  const ForgotPasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const LoginScreen(initialMode: AuthMode.forgot);
  }
}
