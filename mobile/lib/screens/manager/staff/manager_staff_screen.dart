import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/staff_model.dart';
import 'package:hour_stay_mobile/providers/manager/staff_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'manager_add_staff_screen.dart';

class ManagerStaffScreen extends StatefulWidget {
  const ManagerStaffScreen({super.key});

  @override
  State<ManagerStaffScreen> createState() => _ManagerStaffScreenState();
}

class _ManagerStaffScreenState extends State<ManagerStaffScreen> {
  String _departmentFilter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<StaffProvider>().fetchAll();
    });
  }

  @override
  Widget build(BuildContext context) {
    final staffProvider = context.watch<StaffProvider>();
    var list = staffProvider.staffList;

    if (_departmentFilter != 'all') {
      list = list.where((s) => s.department.toLowerCase() == _departmentFilter.toLowerCase()).toList();
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff & Shifts'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.person_add, color: Colors.white),
        label: const Text('Add Staff', style: TextStyle(color: Colors.white)),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ManagerAddStaffScreen()),
          );
        },
      ),
      body: Column(
        children: [
          // Filter Chips
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppColors.surface,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('All Staff', 'all'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Housekeeping', 'housekeeping'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Front Desk', 'front desk'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Maintenance', 'maintenance'),
                  const SizedBox(width: 8),
                  _buildFilterChip('Security', 'security'),
                ],
              ),
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: RefreshIndicator(
              onRefresh: () => staffProvider.fetchAll(),
              child: staffProvider.isLoading && staffProvider.staffList.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : list.isEmpty
                      ? EmptyState(
                          icon: Icons.people_outline,
                          title: 'No Staff Found',
                          message: 'No staff profiles match the current filter.',
                          actionText: 'Refresh',
                          onAction: () => staffProvider.fetchAll(),
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: list.length,
                          separatorBuilder: (_, _) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final staff = list[index];
                            return _buildStaffCard(staff);
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStaffCard(StaffModel staff) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: AppColors.primary.withAlpha(30),
              radius: 24,
              child: Text(
                staff.name.isNotEmpty ? staff.name[0].toUpperCase() : 'S',
                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 18),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    staff.name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${staff.department} • Shift: ${Formatters.capitalize(staff.shift)}',
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    staff.email,
                    style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                  ),
                ],
              ),
            ),
            StatusBadge(
              status: staff.status,
              fontSize: 10,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _departmentFilter == value;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : AppColors.textPrimary)),
      selected: isSelected,
      selectedColor: AppColors.primary,
      onSelected: (val) {
        if (val) setState(() => _departmentFilter = value);
      },
    );
  }
}
