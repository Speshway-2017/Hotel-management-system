import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/providers/manager/staff_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_button.dart';
import 'package:hour_stay_mobile/widgets/custom_text_field.dart';

class ManagerAddStaffScreen extends StatefulWidget {
  const ManagerAddStaffScreen({super.key});

  @override
  State<ManagerAddStaffScreen> createState() => _ManagerAddStaffScreenState();
}

class _ManagerAddStaffScreenState extends State<ManagerAddStaffScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  String _selectedRole = 'housekeeping';
  String _selectedDepartment = 'Housekeeping';
  String _selectedShift = 'morning';

  final List<String> _roles = ['manager', 'receptionist', 'housekeeping', 'maintenance', 'security', 'kitchen'];
  final List<String> _departments = ['Management', 'Front Desk', 'Housekeeping', 'Maintenance', 'Security', 'Food & Beverage'];
  final List<String> _shifts = ['morning', 'evening', 'night', 'rotational'];

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    final provider = context.read<StaffProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    final success = await provider.addStaff({
      'name': _nameController.text.trim(),
      'email': _emailController.text.trim(),
      'mobile': _phoneController.text.trim(),
      'password': _passwordController.text,
      'role': _selectedRole,
      'dept': _selectedDepartment,
      'shift': _selectedShift,
    });

    if (success && mounted) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Staff member created successfully!'), backgroundColor: AppColors.success),
      );
      navigator.pop();
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(content: Text(provider.errorMessage ?? 'Failed to add staff member'), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final staffProvider = context.watch<StaffProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Staff Member'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CustomTextField(
                controller: _nameController,
                label: 'Staff Full Name',
                hint: 'e.g. Alex Morgan',
                prefixIcon: Icons.person_outline,
                validator: (v) => v == null || v.trim().isEmpty ? 'Name required' : null,
              ),
              const SizedBox(height: 14),
              CustomTextField(
                controller: _emailController,
                label: 'Email Address',
                hint: 'alex@hotel.com',
                prefixIcon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
                validator: (v) => v == null || v.trim().isEmpty ? 'Email required' : null,
              ),
              const SizedBox(height: 14),
              CustomTextField(
                controller: _phoneController,
                label: 'Phone Number',
                hint: '+123456789',
                prefixIcon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 14),
              CustomTextField(
                controller: _passwordController,
                label: 'Initial Password',
                hint: 'Min. 6 chars',
                prefixIcon: Icons.lock_outline,
                obscureText: true,
                validator: (v) => v == null || v.length < 6 ? 'Password min 6 chars' : null,
              ),
              const SizedBox(height: 16),

              // Role selector
              const Text('System Role', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedRole,
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                items: _roles.map((r) => DropdownMenuItem(value: r, child: Text(r.toUpperCase()))).toList(),
                onChanged: (val) => setState(() => _selectedRole = val!),
              ),
              const SizedBox(height: 16),

              // Department selector
              const Text('Department', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedDepartment,
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                items: _departments.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                onChanged: (val) => setState(() => _selectedDepartment = val!),
              ),
              const SizedBox(height: 16),

              // Shift selector
              const Text('Assigned Shift', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _selectedShift,
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                items: _shifts.map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase()))).toList(),
                onChanged: (val) => setState(() => _selectedShift = val!),
              ),
              const SizedBox(height: 28),

              CustomButton(
                text: 'Create Staff Profile',
                isLoading: staffProvider.isLoading,
                onPressed: _handleSave,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
