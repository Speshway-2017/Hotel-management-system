import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/providers/manager/staff_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_text_field.dart';

class ManagerAddStaffScreen extends StatefulWidget {
  const ManagerAddStaffScreen({super.key});

  @override
  State<ManagerAddStaffScreen> createState() => _ManagerAddStaffScreenState();
}

class _ManagerAddStaffScreenState extends State<ManagerAddStaffScreen> {
  // Hour Stay Theme Tokens
  static const Color navy = Color(0xFF0D1B2A);
  static const Color gold = Color(0xFFF5C06A);
  static const Color white = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color emerald = Color(0xFF10B981);
  static const Color ruby = Color(0xFFEF4444);

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();

  String _selectedRole = 'receptionist';
  String _selectedDepartment = 'Front Desk';
  String _selectedShift = 'General Shift';

  final List<String> _roles = ['manager', 'receptionist', 'housekeeping', 'maintenance', 'security', 'kitchen'];
  final List<String> _departments = ['Front Desk', 'Housekeeping', 'Management', 'Maintenance', 'Security', 'Food & Beverage'];
  final List<Map<String, String>> _shifts = [
    {'value': 'General Shift', 'label': 'General Shift (09:00 AM – 06:00 PM)'},
    {'value': 'Morning Shift', 'label': 'Morning Shift (06:00 AM – 02:00 PM)'},
    {'value': 'Evening Shift', 'label': 'Evening Shift (02:00 PM – 10:00 PM)'},
    {'value': 'Night Shift', 'label': 'Night Shift (10:00 PM – 06:00 AM)'},
    {'value': 'Rotational Shift', 'label': 'Rotational Shift (Flexible Hours)'},
  ];

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
        const SnackBar(
          content: Text('Staff profile registered successfully!'),
          backgroundColor: emerald,
        ),
      );
      navigator.pop();
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(provider.errorMessage ?? 'Failed to add staff member'),
          backgroundColor: ruby,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final staffProvider = context.watch<StaffProvider>();

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: navy,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
          tooltip: 'Back',
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: const Text(
          'Add Staff Member',
          style: TextStyle(
            color: white,
            fontWeight: FontWeight.w800,
            fontSize: 16,
            letterSpacing: -0.2,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Personal Information Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: cardBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Personal Information',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: navy),
                    ),
                    const SizedBox(height: 14),
                    CustomTextField(
                      controller: _nameController,
                      label: 'Staff Full Name',
                      hint: 'e.g. Rahul Sharma',
                      prefixIcon: Icons.person_outline_rounded,
                      validator: (v) => v == null || v.trim().isEmpty ? 'Full name is required' : null,
                    ),
                    const SizedBox(height: 14),
                    CustomTextField(
                      controller: _emailController,
                      label: 'Work / Login Email',
                      hint: 'rahul@hourstay.com',
                      prefixIcon: Icons.email_outlined,
                      keyboardType: TextInputType.emailAddress,
                      validator: (v) => v == null || v.trim().isEmpty ? 'Email is required' : null,
                    ),
                    const SizedBox(height: 14),
                    CustomTextField(
                      controller: _phoneController,
                      label: 'Mobile Phone Number',
                      hint: '+91 98765 43210',
                      prefixIcon: Icons.phone_outlined,
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 14),
                    CustomTextField(
                      controller: _passwordController,
                      label: 'Initial Account Password',
                      hint: 'Min. 6 characters',
                      prefixIcon: Icons.lock_outline_rounded,
                      obscureText: true,
                      validator: (v) => v == null || v.length < 6 ? 'Password must be at least 6 characters' : null,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Role & Shift Allocation Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: cardBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Role & Shift Assignment',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: navy),
                    ),
                    const SizedBox(height: 14),

                    // Role selector
                    const Text('System Role', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: navy)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedRole,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      items: _roles.map((r) => DropdownMenuItem(value: r, child: Text(r.toUpperCase()))).toList(),
                      onChanged: (val) => setState(() => _selectedRole = val!),
                    ),
                    const SizedBox(height: 14),

                    // Department selector
                    const Text('Department', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: navy)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedDepartment,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      items: _departments.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                      onChanged: (val) => setState(() => _selectedDepartment = val!),
                    ),
                    const SizedBox(height: 14),

                    // Shift selector
                    const Text('Assigned Shift Slot', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: navy)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: _selectedShift,
                      isExpanded: true,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                      items: _shifts.map((s) => DropdownMenuItem(
                        value: s['value']!,
                        child: Text(s['label']!, style: const TextStyle(fontSize: 12.5), overflow: TextOverflow.ellipsis),
                      )).toList(),
                      onChanged: (val) => setState(() => _selectedShift = val!),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: staffProvider.isLoading ? null : _handleSave,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navy,
                    foregroundColor: white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: const BorderSide(color: Color(0xFFF5C06A), width: 1.5),
                    ),
                  ),
                  child: staffProvider.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: white),
                        )
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.add_circle_rounded, size: 18, color: gold),
                            SizedBox(width: 8),
                            Text(
                              'Register Staff Profile',
                              style: TextStyle(
                                color: white,
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.3,
                              ),
                            ),
                            SizedBox(width: 6),
                            Icon(Icons.arrow_forward_ios_rounded, size: 11, color: gold),
                          ],
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
