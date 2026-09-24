import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/constants/app_colors.dart';
import '../core/utils/input_validators.dart';

enum FieldValidationType {
  none,
  textOnly,
  name,
  number,
  amount,
  phone,
  email,
}

class CustomTextField extends StatefulWidget {
  final TextEditingController? controller;
  final String label;
  final String? hint;
  final IconData? prefixIcon;
  final Widget? suffixIcon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  final int maxLines;
  final bool readOnly;
  final VoidCallback? onTap;
  final void Function(String)? onChanged;
  final FieldValidationType validationType;
  final bool required;
  final List<TextInputFormatter>? inputFormatters;

  const CustomTextField({
    super.key,
    this.controller,
    required this.label,
    this.hint,
    this.prefixIcon,
    this.suffixIcon,
    this.obscureText = false,
    this.keyboardType,
    this.validator,
    this.maxLines = 1,
    this.readOnly = false,
    this.onTap,
    this.onChanged,
    this.validationType = FieldValidationType.none,
    this.required = false,
    this.inputFormatters,
  });

  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}

class _CustomTextFieldState extends State<CustomTextField> {
  String? _liveError;

  TextInputType get _effectiveKeyboardType {
    if (widget.keyboardType != null) return widget.keyboardType!;
    switch (widget.validationType) {
      case FieldValidationType.number:
        return TextInputType.number;
      case FieldValidationType.amount:
        return const TextInputType.numberWithOptions(decimal: true);
      case FieldValidationType.phone:
        return TextInputType.phone;
      case FieldValidationType.email:
        return TextInputType.emailAddress;
      case FieldValidationType.name:
      case FieldValidationType.textOnly:
      case FieldValidationType.none:
        return TextInputType.text;
    }
  }

  String? _validate(String? val) {
    String? typeError;
    switch (widget.validationType) {
      case FieldValidationType.textOnly:
        typeError = InputValidators.validateTextOnly(
          val,
          fieldName: widget.label,
          required: widget.required,
        );
        break;
      case FieldValidationType.name:
        typeError = InputValidators.validateName(
          val,
          fieldName: widget.label,
          required: widget.required,
        );
        break;
      case FieldValidationType.number:
        typeError = InputValidators.validateNumber(
          val,
          fieldName: widget.label,
          required: widget.required,
        );
        break;
      case FieldValidationType.amount:
        typeError = InputValidators.validateAmount(
          val,
          fieldName: widget.label,
          required: widget.required,
        );
        break;
      case FieldValidationType.phone:
        typeError = InputValidators.validatePhone(
          val,
          required: widget.required,
        );
        break;
      case FieldValidationType.email:
        typeError = InputValidators.validateEmail(
          val,
          required: widget.required,
        );
        break;
      case FieldValidationType.none:
        break;
    }

    if (typeError != null) return typeError;
    if (widget.validator != null) return widget.validator!(val);
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              widget.label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            if (widget.required) ...[
              const SizedBox(width: 4),
              const Text(
                '*',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: InputValidators.errorRed,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: widget.controller,
          obscureText: widget.obscureText,
          keyboardType: _effectiveKeyboardType,
          autovalidateMode: AutovalidateMode.onUserInteraction,
          validator: _validate,
          inputFormatters: widget.inputFormatters,
          maxLines: widget.maxLines,
          readOnly: widget.readOnly,
          onTap: widget.onTap,
          onChanged: (val) {
            final err = _validate(val);
            if (err != _liveError) {
              setState(() => _liveError = err);
            }
            if (widget.onChanged != null) widget.onChanged!(val);
          },
          style: const TextStyle(
            color: AppColors.textPrimary,
            fontSize: 14,
          ),
          decoration: InputDecoration(
            hintText: widget.hint,
            errorText: _liveError,
            errorStyle: InputValidators.errorTextStyle,
            prefixIcon: widget.prefixIcon != null
                ? Icon(widget.prefixIcon, color: AppColors.textTertiary, size: 20)
                : null,
            suffixIcon: widget.suffixIcon,
            filled: true,
            fillColor: AppColors.surface,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: InputValidators.errorRed, width: 1.5),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: InputValidators.errorRed, width: 2.0),
            ),
          ),
        ),
      ],
    );
  }
}
