import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/utils/input_validators.dart';

enum AuthMode { login, register, forgot, otp, reset }

typedef AuthSubmitCallback = Future<void> Function({
  String name,
  String email,
  String mobile,
  String password,
  String confirmPassword,
  String otp,
});

class AuthCard extends StatefulWidget {
  final AuthMode mode;
  final String? title;
  final String? subtitle;
  final String? initialEmail;
  final String? initialOtp;
  final Widget? footer;
  final Widget? extraContent;
  final AuthSubmitCallback onSubmit;
  final VoidCallback? onResendOtp;
  final VoidCallback? onNavigateToRegister;
  final VoidCallback? onNavigateToLogin;
  final VoidCallback? onNavigateToForgot;

  const AuthCard({
    super.key,
    required this.mode,
    this.title,
    this.subtitle,
    this.initialEmail,
    this.initialOtp,
    this.footer,
    this.extraContent,
    required this.onSubmit,
    this.onResendOtp,
    this.onNavigateToRegister,
    this.onNavigateToLogin,
    this.onNavigateToForgot,
  });

  @override
  State<AuthCard> createState() => _AuthCardState();
}

class _AuthCardState extends State<AuthCard> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _mobileController;
  late TextEditingController _passwordController;
  late TextEditingController _confirmPasswordController;
  late TextEditingController _otpController;

  bool _showPassword = false;
  bool _showConfirmPassword = false;
  bool _isLoading = false;
  String? _errorMessage;
  String? _successMessage;

  String? _nameError;
  String? _emailError;
  String? _mobileError;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController();
    _emailController = TextEditingController(text: widget.initialEmail ?? '');
    _mobileController = TextEditingController();
    _passwordController = TextEditingController();
    _confirmPasswordController = TextEditingController();
    _otpController = TextEditingController(text: widget.initialOtp ?? '');
  }

  @override
  void didUpdateWidget(covariant AuthCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.mode != widget.mode) {
      _errorMessage = null;
      _successMessage = null;
      _isLoading = false;
      if (widget.initialEmail != null && widget.initialEmail!.isNotEmpty) {
        _emailController.text = widget.initialEmail!;
      }
      if (widget.initialOtp != null && widget.initialOtp!.isNotEmpty) {
        _otpController.text = widget.initialOtp!;
      }
      _passwordController.clear();
      _confirmPasswordController.clear();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _mobileController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void setError(String? error) {
    if (mounted) {
      setState(() {
        _errorMessage = error;
        _successMessage = null;
      });
    }
  }

  void setSuccess(String? success) {
    if (mounted) {
      setState(() {
        _successMessage = success;
        _errorMessage = null;
      });
    }
  }

  String get _defaultTitle {
    switch (widget.mode) {
      case AuthMode.login:
        return 'Sign In';
      case AuthMode.register:
        return 'Create Account';
      case AuthMode.forgot:
        return 'Reset Password';
      case AuthMode.otp:
        return 'Verify OTP';
      case AuthMode.reset:
        return 'New Password';
    }
  }

  String get _defaultSubtitle {
    switch (widget.mode) {
      case AuthMode.login:
        return 'Sign in to your property workspace.';
      case AuthMode.register:
        return 'Book faster, unlock member rates and manage stays.';
      case AuthMode.forgot:
        return "We'll send a one-time link to your registered email.";
      case AuthMode.otp:
        return 'Enter the 6-digit verification code sent to you.';
      case AuthMode.reset:
        return 'Create a new password for your account.';
    }
  }

  String get _buttonText {
    switch (widget.mode) {
      case AuthMode.login:
        return 'Sign In';
      case AuthMode.register:
        return 'Create Account';
      case AuthMode.forgot:
        return 'Send Reset Link';
      case AuthMode.otp:
        return 'Verify Code';
      case AuthMode.reset:
        return 'Reset Password';
    }
  }

  bool _validateInputs() {
    setError(null);

    if (widget.mode == AuthMode.otp) {
      if (_otpController.text.trim().length < 6) {
        setError('Enter a valid 6-digit verification code');
        return false;
      }
      return true;
    }

    if (widget.mode == AuthMode.reset) {
      if (_passwordController.text.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (_passwordController.text != _confirmPasswordController.text) {
        setError('Passwords do not match');
        return false;
      }
      return true;
    }

    // Name validation
    if (widget.mode == AuthMode.register) {
      final nameErr = InputValidators.validateName(_nameController.text, fieldName: 'Full Name');
      if (nameErr != null) {
        setError(nameErr);
        setState(() => _nameError = nameErr);
        return false;
      }
    }

    // Email validation
    final email = _emailController.text.trim();
    if (widget.mode == AuthMode.login || widget.mode == AuthMode.register || widget.mode == AuthMode.forgot) {
      final emailErr = InputValidators.validateEmail(email);
      if (emailErr != null) {
        setError(emailErr);
        setState(() => _emailError = emailErr);
        return false;
      }
    }

    // Mobile validation
    if (widget.mode == AuthMode.register) {
      final phoneErr = InputValidators.validatePhone(_mobileController.text);
      if (phoneErr != null) {
        setError(phoneErr);
        setState(() => _mobileError = phoneErr);
        return false;
      }
    }

    if (widget.mode != AuthMode.forgot && _passwordController.text.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    return true;
  }

  Future<void> _handleSubmit() async {
    if (!_validateInputs()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await widget.onSubmit(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        mobile: _mobileController.text.trim(),
        password: _passwordController.text,
        confirmPassword: _confirmPasswordController.text,
        otp: _otpController.text.trim(),
      );
    } catch (e) {
      setError(e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Widget _buildWebStyledInputField({
    required TextEditingController controller,
    required String placeholder,
    TextInputType keyboardType = TextInputType.text,
    bool obscureText = false,
    bool hasToggle = false,
    bool isToggled = false,
    VoidCallback? onTogglePressed,
    int? maxLength,
    TextAlign textAlign = TextAlign.start,
    TextStyle? customTextStyle,
    TextInputAction textInputAction = TextInputAction.next,
    void Function(String)? onSubmitted,
    void Function(String)? onChanged,
    String? errorText,
  }) {
    return Focus(
      child: Builder(
        builder: (context) {
          final isFocused = Focus.of(context).hasFocus;
          final hasError = errorText != null && errorText.isNotEmpty;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0xFFE7E9EE),
                      blurRadius: 10,
                      offset: Offset(0, 8),
                      spreadRadius: -3,
                    ),
                  ],
                  border: Border.all(
                    color: hasError
                        ? const Color(0xFFDC2626)
                        : (isFocused ? const Color(0xFF0D1B2A) : Colors.transparent),
                    width: 2.0,
                  ),
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    TextField(
                      controller: controller,
                      keyboardType: keyboardType,
                      obscureText: obscureText,
                      maxLength: maxLength,
                      textAlign: textAlign,
                      textInputAction: textInputAction,
                      onSubmitted: onSubmitted,
                      onChanged: onChanged,
                      style: customTextStyle ??
                          GoogleFonts.inter(
                            fontSize: 12,
                            color: const Color(0xFF0D1B2A),
                            fontWeight: FontWeight.w500,
                          ),
                      decoration: InputDecoration(
                        hintText: placeholder,
                        hintStyle: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF98A2B3),
                          fontWeight: FontWeight.w400,
                        ),
                        isDense: true,
                        filled: false,
                        fillColor: Colors.transparent,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        disabledBorder: InputBorder.none,
                        errorBorder: InputBorder.none,
                        focusedErrorBorder: InputBorder.none,
                        contentPadding: EdgeInsets.only(
                          left: 20,
                          right: hasToggle ? 46 : 20,
                          top: 14,
                          bottom: 14,
                        ),
                        counterText: '',
                      ),
                    ),
                    if (hasToggle)
                      Positioned(
                        right: 14,
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: onTogglePressed,
                          child: Padding(
                            padding: const EdgeInsets.all(4.0),
                            child: Icon(
                              isToggled ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              size: 16,
                              color: const Color(0x660D1B2A),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              if (hasError) ...[
                const SizedBox(height: 5),
                Padding(
                  padding: const EdgeInsets.only(left: 14),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 13),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          errorText,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFFDC2626),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _buildDefaultFooter() {
    switch (widget.mode) {
      case AuthMode.login:
        return Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              'New to Hour Stay? ',
              style: GoogleFonts.inter(
                fontSize: 12.5,
                color: const Color(0xFF667085),
              ),
            ),
            GestureDetector(
              onTap: widget.onNavigateToRegister ??
                  () => Navigator.of(context).pushNamed('/register'),
              child: Text(
                'Create an account',
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF5B21B6),
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        );
      case AuthMode.register:
        return Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              'Already registered? ',
              style: GoogleFonts.inter(
                fontSize: 12.5,
                color: const Color(0xFF667085),
              ),
            ),
            GestureDetector(
              onTap: widget.onNavigateToLogin ??
                  () => Navigator.of(context).pop(),
              child: Text(
                'Sign in',
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF5B21B6),
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        );
      case AuthMode.forgot:
        return Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              'Remembered it? ',
              style: GoogleFonts.inter(
                fontSize: 12.5,
                color: const Color(0xFF667085),
              ),
            ),
            GestureDetector(
              onTap: widget.onNavigateToLogin ??
                  () => Navigator.of(context).pop(),
              child: Text(
                'Back to sign in',
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF5B21B6),
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        );
      case AuthMode.otp:
        return Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              "Didn't receive code? ",
              style: GoogleFonts.inter(
                fontSize: 12.5,
                color: const Color(0xFF667085),
              ),
            ),
            GestureDetector(
              onTap: widget.onNavigateToLogin ??
                  () => Navigator.of(context).pop(),
              child: Text(
                'Back to sign in',
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF5B21B6),
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        );
      case AuthMode.reset:
        return Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              'Remembered your old password? ',
              style: GoogleFonts.inter(
                fontSize: 12.5,
                color: const Color(0xFF667085),
              ),
            ),
            GestureDetector(
              onTap: widget.onNavigateToLogin ??
                  () => Navigator.of(context).pop(),
              child: Text(
                'Back to sign in',
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF5B21B6),
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF7E6),
            borderRadius: BorderRadius.circular(40),
            border: Border.all(
              color: const Color(0xF2FFFFFF),
              width: 5,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x590D1B2A),
                blurRadius: 50,
                offset: Offset(0, 20),
              ),
            ],
          ),
          padding: const EdgeInsets.fromLTRB(30, 35, 30, 25),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Centered Logo (Icon Only, 44x44 matching web <Logo compact={true} removeBg={true} />)
              Center(
                child: Padding(
                  padding: const EdgeInsets.only(top: 2, bottom: 6),
                  child: Image.asset(
                    'assets/logo.png',
                    width: 44,
                    height: 44,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => const Icon(
                      Icons.hotel_rounded,
                      size: 38,
                      color: Color(0xFF0D1B2A),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 10),

              // Title
              Text(
                widget.title ?? _defaultTitle,
                textAlign: TextAlign.center,
                style: GoogleFonts.playfairDisplay(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF0D1B2A),
                  height: 1.15,
                ),
              ),

              const SizedBox(height: 6),

              // Subtitle
              Text(
                widget.subtitle ?? _defaultSubtitle,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: const Color(0xFF667085),
                  height: 1.4,
                ),
              ),

              // Success Notice
              if (_successMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF86EFAC)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle_rounded, color: Color(0xFF2E7D32), size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _successMessage!,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF2E7D32),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // Error Notice
              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: Color(0xFFC62828), size: 18),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFFC62828),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 20),

              // Form Elements
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Name Field (Register Mode)
                    if (widget.mode == AuthMode.register) ...[
                      _buildWebStyledInputField(
                        controller: _nameController,
                        placeholder: 'Full Name',
                        keyboardType: TextInputType.name,
                        errorText: _nameError,
                        onChanged: (val) {
                          setState(() {
                            if (RegExp(r'\d').hasMatch(val)) {
                              _nameError = 'Name must contain letters only; numbers are not allowed';
                            } else {
                              _nameError = null;
                            }
                            if (_errorMessage != null) _errorMessage = null;
                          });
                        },
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Email Field (Login, Register, Forgot)
                    if (widget.mode == AuthMode.login ||
                        widget.mode == AuthMode.register ||
                        widget.mode == AuthMode.forgot) ...[
                      _buildWebStyledInputField(
                        controller: _emailController,
                        placeholder: 'E-mail',
                        keyboardType: TextInputType.emailAddress,
                        errorText: _emailError,
                        onChanged: (val) {
                          setState(() {
                            if (val.contains(' ')) {
                              _emailError = 'Email cannot contain spaces';
                            } else if (val.contains('@') && val.contains('.')) {
                              _emailError = InputValidators.validateEmail(val, required: false);
                            } else {
                              _emailError = null;
                            }
                            if (_errorMessage != null) _errorMessage = null;
                          });
                        },
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Mobile Field (Register Mode)
                    if (widget.mode == AuthMode.register) ...[
                      _buildWebStyledInputField(
                        controller: _mobileController,
                        placeholder: 'Mobile Number',
                        keyboardType: TextInputType.phone,
                        errorText: _mobileError,
                        onChanged: (val) {
                          setState(() {
                            if (RegExp(r'[a-zA-Z]').hasMatch(val)) {
                              _mobileError = 'Phone number must contain numbers only; letters are not allowed';
                            } else if (val.replaceAll(RegExp(r'\D'), '').length > 15) {
                              _mobileError = 'Phone number must be at most 15 digits';
                            } else {
                              _mobileError = null;
                            }
                            if (_errorMessage != null) _errorMessage = null;
                          });
                        },
                      ),
                      const SizedBox(height: 16),
                    ],

                    // OTP Field (OTP Mode)
                    if (widget.mode == AuthMode.otp) ...[
                      _buildWebStyledInputField(
                        controller: _otpController,
                        placeholder: '• • • • • •',
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        textAlign: TextAlign.center,
                        customTextStyle: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 8,
                          color: const Color(0xFF0D1B2A),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Center(
                        child: TextButton(
                          onPressed: widget.onResendOtp,
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: Text(
                            'Resend OTP Code',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF0099FF),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],

                    // Password Field (Login, Register)
                    if (widget.mode == AuthMode.login || widget.mode == AuthMode.register) ...[
                      _buildWebStyledInputField(
                        controller: _passwordController,
                        placeholder: 'Password',
                        obscureText: !_showPassword,
                        hasToggle: true,
                        isToggled: _showPassword,
                        onTogglePressed: () => setState(() => _showPassword = !_showPassword),
                      ),
                      if (widget.mode == AuthMode.login) ...[
                        const SizedBox(height: 8),
                        Padding(
                          padding: const EdgeInsets.only(left: 8),
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: GestureDetector(
                              onTap: widget.onNavigateToForgot ??
                                  () {
                                    Navigator.of(context).pushNamed('/forgot-password');
                                  },
                              child: Text(
                                'Forgot Password ?',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF0099FF),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                    ],

                    // Reset Password Fields (Reset Mode)
                    if (widget.mode == AuthMode.reset) ...[
                      _buildWebStyledInputField(
                        controller: _passwordController,
                        placeholder: 'New Password',
                        obscureText: !_showPassword,
                        hasToggle: true,
                        isToggled: _showPassword,
                        onTogglePressed: () => setState(() => _showPassword = !_showPassword),
                      ),
                      const SizedBox(height: 16),
                      _buildWebStyledInputField(
                        controller: _confirmPasswordController,
                        placeholder: 'Confirm New Password',
                        obscureText: !_showConfirmPassword,
                        hasToggle: true,
                        isToggled: _showConfirmPassword,
                        onTogglePressed: () => setState(() => _showConfirmPassword = !_showConfirmPassword),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Mobile Field (Register Mode)
                    if (widget.mode == AuthMode.register) ...[
                      _buildWebStyledInputField(
                        controller: _mobileController,
                        placeholder: 'Mobile Number',
                        keyboardType: TextInputType.phone,
                      ),
                      const SizedBox(height: 16),
                    ],

                    const SizedBox(height: 4),

                    // Submit Button
                    SizedBox(
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _handleSubmit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D1B2A),
                          disabledBackgroundColor: const Color(0xB20D1B2A),
                          foregroundColor: const Color(0xFFFFF7E6),
                          elevation: 6,
                          shadowColor: const Color(0x400D1B2A),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(999),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Color(0xFFFFF7E6),
                                ),
                              )
                            : Text(
                                _buttonText,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.8,
                                  color: const Color(0xFFFFF7E6),
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),

              if (widget.extraContent != null) ...[
                const SizedBox(height: 14),
                widget.extraContent!,
              ],

              // Footer
              const SizedBox(height: 20),
              DefaultTextStyle(
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: const Color(0xFF667085),
                ),
                textAlign: TextAlign.center,
                child: widget.footer ?? _buildDefaultFooter(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
