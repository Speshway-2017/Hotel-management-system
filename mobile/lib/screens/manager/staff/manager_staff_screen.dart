import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/models/staff_model.dart';
import 'package:hour_stay_mobile/providers/manager/staff_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'manager_add_staff_screen.dart';

class ManagerStaffScreen extends StatefulWidget {
  final int initialIndex;
  const ManagerStaffScreen({super.key, this.initialIndex = 0});

  @override
  State<ManagerStaffScreen> createState() => _ManagerStaffScreenState();
}

class _ManagerStaffScreenState extends State<ManagerStaffScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _departmentFilter = 'all';
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: 3,
      vsync: this,
      initialIndex: widget.initialIndex.clamp(0, 2),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<StaffProvider>().fetchAll();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final staffProvider = context.watch<StaffProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff & Workforce'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textSecondary,
          tabs: const [
            Tab(icon: Icon(Icons.people_alt_outlined, size: 20), text: 'Roster'),
            Tab(icon: Icon(Icons.schedule_outlined, size: 20), text: 'Shifts'),
            Tab(icon: Icon(Icons.co_present_outlined, size: 20), text: 'Attendance'),
          ],
        ),
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
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRosterTab(staffProvider),
          _buildShiftsTab(staffProvider),
          _buildAttendanceTab(staffProvider),
        ],
      ),
    );
  }

  // ==========================================
  // TAB 1: STAFF ROSTER
  // ==========================================
  Widget _buildRosterTab(StaffProvider staffProvider) {
    var list = staffProvider.staffList;

    if (_departmentFilter != 'all') {
      list = list.where((s) => s.department.toLowerCase() == _departmentFilter.toLowerCase()).toList();
    }
    if (_searchQuery.isNotEmpty) {
      list = list.where((s) => s.name.toLowerCase().contains(_searchQuery.toLowerCase()) || s.email.toLowerCase().contains(_searchQuery.toLowerCase())).toList();
    }

    return Column(
      children: [
        // Search & Filter
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: AppColors.surface,
          child: Column(
            children: [
              TextField(
                decoration: InputDecoration(
                  hintText: 'Search staff by name or email...',
                  prefixIcon: const Icon(Icons.search, size: 20),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                ),
                onChanged: (v) => setState(() => _searchQuery = v),
              ),
              const SizedBox(height: 8),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildFilterChip('All Staff', 'all'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Front Desk', 'front desk'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Housekeeping', 'housekeeping'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Maintenance', 'maintenance'),
                  ],
                ),
              ),
            ],
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
    );
  }

  Widget _buildStaffCard(StaffModel staff) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppColors.primary.withAlpha(30),
                  radius: 22,
                  child: Text(
                    staff.name.isNotEmpty ? staff.name[0].toUpperCase() : 'S',
                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 16),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        staff.name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${staff.department} • Shift: ${staff.shift}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        staff.email,
                        style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
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
            const Divider(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  icon: const Icon(Icons.schedule, size: 16),
                  label: const Text('Assign Shift'),
                  onPressed: () => _showAssignShiftDialog(staff.id, staff.name),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                  tooltip: 'Delete Staff Profile',
                  onPressed: () => _confirmDeleteStaff(staff),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // TAB 2: SHIFT SCHEDULE
  // ==========================================
  Widget _buildShiftsTab(StaffProvider staffProvider) {
    final shifts = staffProvider.shifts;

    if (shifts.isEmpty) {
      return EmptyState(
        icon: Icons.schedule_outlined,
        title: 'No Shifts Assigned',
        message: 'Assign shifts to receptionist staff members.',
        actionText: 'Refresh',
        onAction: () => staffProvider.fetchAll(),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildShiftGroupCard('Morning Shift (06:00 - 14:00)', shifts.where((s) => s.shiftType.toLowerCase().contains('morning')).toList(), AppColors.secondary),
        const SizedBox(height: 14),
        _buildShiftGroupCard('Evening Shift (14:00 - 22:00)', shifts.where((s) => s.shiftType.toLowerCase().contains('evening')).toList(), AppColors.primary),
        const SizedBox(height: 14),
        _buildShiftGroupCard('Night Shift (22:00 - 06:00)', shifts.where((s) => s.shiftType.toLowerCase().contains('night')).toList(), Colors.indigo),
      ],
    );
  }

  Widget _buildShiftGroupCard(String title, List<ShiftModel> shiftList, Color color) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const Spacer(),
                Text(
                  '${shiftList.length} Assigned',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color),
                ),
              ],
            ),
            const Divider(height: 16),
            if (shiftList.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text('No staff allocated to this shift slot', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              )
            else
              ...shiftList.map((s) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(s.username, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      TextButton(
                        child: const Text('Reassign', style: TextStyle(fontSize: 11)),
                        onPressed: () => _showAssignShiftDialog(s.userId, s.username),
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // TAB 3: DAILY ATTENDANCE LOG
  // ==========================================
  Widget _buildAttendanceTab(StaffProvider staffProvider) {
    final attendance = staffProvider.attendance;

    if (attendance.isEmpty) {
      return EmptyState(
        icon: Icons.co_present_outlined,
        title: 'No Attendance Records',
        message: 'Daily attendance logs will appear here.',
        actionText: 'Refresh',
        onAction: () => staffProvider.fetchAll(),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: attendance.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final att = attendance[index];
        final isPresent = att.status.toLowerCase() == 'present';

        return Card(
          elevation: 1,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: isPresent ? AppColors.success.withAlpha(20) : AppColors.error.withAlpha(20),
                  child: Icon(
                    isPresent ? Icons.check : Icons.close,
                    color: isPresent ? AppColors.success : AppColors.error,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        att.username,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Date: ${att.date} • ${att.workingHours} hrs',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'In: ${att.checkIn} | Out: ${att.checkOut}',
                        style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isPresent ? AppColors.success.withAlpha(20) : AppColors.error.withAlpha(20),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    att.status,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isPresent ? AppColors.success : AppColors.error,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showAssignShiftDialog(String userId, String username) {
    String selectedShift = 'Morning';

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text('Assign Shift to $username'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: selectedShift,
                    decoration: const InputDecoration(labelText: 'Shift Slot', border: OutlineInputBorder()),
                    items: const [
                      DropdownMenuItem(value: 'Morning', child: Text('Morning Shift (06:00 - 14:00)')),
                      DropdownMenuItem(value: 'Evening', child: Text('Evening Shift (14:00 - 22:00)')),
                      DropdownMenuItem(value: 'Night', child: Text('Night Shift (22:00 - 06:00)')),
                    ],
                    onChanged: (v) => setDialogState(() => selectedShift = v ?? 'Morning'),
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    final messenger = ScaffoldMessenger.of(context);
                    final ok = await context.read<StaffProvider>().assignShift(userId, username, selectedShift);
                    if (ok && mounted) {
                      messenger.showSnackBar(
                        SnackBar(content: Text('Shift reassigned to $selectedShift for $username'), backgroundColor: AppColors.success),
                      );
                    }
                  },
                  child: const Text('Assign'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _confirmDeleteStaff(StaffModel staff) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Staff Profile'),
        content: Text('Are you sure you want to delete profile for ${staff.name}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error, foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final ok = await context.read<StaffProvider>().deleteStaff(staff.id);
      if (ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Staff member profile deleted')),
        );
      }
    }
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _departmentFilter == value;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _departmentFilter = value),
      selectedColor: AppColors.primary.withAlpha(40),
      labelStyle: TextStyle(
        color: isSelected ? AppColors.primary : AppColors.textSecondary,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
    );
  }
}
