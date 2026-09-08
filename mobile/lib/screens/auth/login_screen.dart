import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/auth_card.dart';
import '../../widgets/auth_scaffold.dart';

class LoginScreen extends StatefulWidget {
  final AuthMode initialMode;
  final String? initialEmail;
  final String? initialOtp;

  const LoginScreen({
    super.key,
    this.initialMode = AuthMode.login,
    this.initialEmail,
    this.initialOtp,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late AuthMode _currentMode;
  String _email = '';
  String _otp = '';

  @override
  void initState() {
    super.initState();
    _currentMode = widget.initialMode;
    _email = widget.initialEmail ?? '';
    _otp = widget.initialOtp ?? '';
  }

  Future<void> _handleSubmit({
    String name = '',
    String email = '',
    String mobile = '',
    String password = '',
    String confirmPassword = '',
    String otp = '',
  }) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    if (_currentMode == AuthMode.login) {
      final success = await authProvider.login(email, password);
      if (!success) {
        throw Exception(authProvider.errorMessage ?? 'Invalid email or password');
      }
      if (mounted && Navigator.of(context).canPop()) {
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } else if (_currentMode == AuthMode.register) {
      final success = await authProvider.register(
        name: name,
        email: email,
        mobile: mobile,
        password: password,
      );
      if (!success) {
        throw Exception(authProvider.errorMessage ?? 'Registration failed. Please try again.');
      }
      if (mounted && Navigator.of(context).canPop()) {
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } else if (_currentMode == AuthMode.forgot) {
      final success = await authProvider.forgotPassword(email);
      if (success) {
        setState(() {
          _email = email;
          _currentMode = AuthMode.otp;
        });
      } else {
        throw Exception(authProvider.errorMessage ?? 'No account found with this email');
      }
    } else if (_currentMode == AuthMode.otp) {
      final targetEmail = _email.isNotEmpty ? _email : email;
      final success = await authProvider.verifyOtp(targetEmail, otp);
      if (success) {
        setState(() {
          _email = targetEmail;
          _otp = otp;
          _currentMode = AuthMode.reset;
        });
      } else {
        throw Exception(authProvider.errorMessage ?? 'Invalid or expired OTP code');
      }
    } else if (_currentMode == AuthMode.reset) {
      final targetEmail = _email.isNotEmpty ? _email : email;
      final targetOtp = _otp.isNotEmpty ? _otp : otp;
      final success = await authProvider.resetPassword(
        email: targetEmail,
        otp: targetOtp,
        newPassword: password,
      );
      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Password reset successfully! Please sign in with your new password.'),
              backgroundColor: AppColors.success,
              duration: Duration(seconds: 3),
            ),
          );
          setState(() {
            _currentMode = AuthMode.login;
          });
        }
      } else {
        throw Exception(authProvider.errorMessage ?? 'Failed to reset password. Please try again.');
      }
    }
  }

  Future<void> _handleResendOtp() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final messenger = ScaffoldMessenger.of(context);

    if (_email.isEmpty) return;
    final success = await authProvider.forgotPassword(_email);
    if (mounted) {
      if (success) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('A new 6-digit verification code has been generated.'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text(authProvider.errorMessage ?? 'Failed to resend code'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _navigateTo(AuthMode mode) {
    setState(() {
      _currentMode = mode;
    });
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: _currentMode == AuthMode.login,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _currentMode != AuthMode.login) {
          setState(() {
            _currentMode = AuthMode.login;
          });
        }
      },
      child: AuthScaffold(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 220),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          transitionBuilder: (Widget child, Animation<double> animation) {
            return FadeTransition(
              opacity: animation,
              child: child,
            );
          },
          child: AuthCard(
            key: ValueKey(_currentMode),
            mode: _currentMode,
            initialEmail: _email,
            initialOtp: _otp,
            showHomeButton: _currentMode != AuthMode.login,
            onHomePressed: () => _navigateTo(AuthMode.login),
            onNavigateToRegister: () => _navigateTo(AuthMode.register),
            onNavigateToLogin: () => _navigateTo(AuthMode.login),
            onNavigateToForgot: () => _navigateTo(AuthMode.forgot),
            onResendOtp: _handleResendOtp,
            onSubmit: _handleSubmit,
          ),
        ),
      ),
    );
  }
}
