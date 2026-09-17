import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/staff_model.dart';
import 'package:hour_stay_mobile/providers/manager/staff_provider.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'package:hour_stay_mobile/colours.dart';

class ManagerStaffDetailScreen extends StatefulWidget {
  final StaffModel staff;

  const ManagerStaffDetailScreen({super.key, required this.staff});

  @override
  State<ManagerStaffDetailScreen> createState() => _ManagerStaffDetailScreenState();
}

class _ManagerStaffDetailScreenState extends State<ManagerStaffDetailScreen> {

  late StaffModel _staff;

  static const List<Map<String, String>> shiftOptions = [
    {'value': 'General Shift', 'label': 'General Shift (09:00 AM – 06:00 PM)', 'timing': '09:00 AM – 06:00 PM'},
    {'value': 'Morning Shift', 'label': 'Morning Shift (06:00 AM – 02:00 PM)', 'timing': '06:00 AM – 02:00 PM'},
    {'value': 'Evening Shift', 'label': 'Evening Shift (02:00 PM – 10:00 PM)', 'timing': '02:00 PM – 10:00 PM'},
    {'value': 'Night Shift', 'label': 'Night Shift (10:00 PM – 06:00 AM)', 'timing': '10:00 PM – 06:00 AM'},
    {'value': 'Rotational Shift', 'label': 'Rotational Shift (Flexible Hours)', 'timing': 'Flexible / Rotating Hours'},
  ];

  @override
  void initState() {
    super.initState();
    _staff = widget.staff;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshData();
    });
  }

  Future<void> _refreshData() async {
    if (!mounted) return;
    try {
      await context.read<StaffProvider>().fetchAll(silent: true);
      if (mounted) {
        final updatedStaff = context.read<StaffProvider>().staffList.where(
          (s) => s.id == _staff.id || (s.email.isNotEmpty && s.email == _staff.email),
        ).firstOrNull;
        if (updatedStaff != null) {
          setState(() => _staff = updatedStaff);
        }
      }
    } catch (_) {
      // Handled silently
    }
  }

  String _getShiftTiming(String shift) {
    final s = shift.toLowerCase();
    if (s.contains('morning')) return '06:00 AM – 02:00 PM';
    if (s.contains('evening')) return '02:00 PM – 10:00 PM';
    if (s.contains('night')) return '10:00 PM – 06:00 AM';
    if (s.contains('general')) return '09:00 AM – 06:00 PM';
    if (s.contains('rotational') || s.contains('rotating')) return 'Flexible / Rotating Hours';
    return '09:00 AM – 06:00 PM';
  }

  String _formatDateString(String dateStr) {
    if (dateStr.isEmpty) return 'Today';
    try {
      final now = DateTime.now();
      final todayStr =
          "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
      if (dateStr.startsWith(todayStr)) return 'Today';

      final yesterday = now.subtract(const Duration(days: 1));
      final yestStr =
          "${yesterday.year}-${yesterday.month.toString().padLeft(2, '0')}-${yesterday.day.toString().padLeft(2, '0')}";
      if (dateStr.startsWith(yestStr)) return 'Yesterday';

      final dt = DateTime.parse(dateStr);
      return Formatters.date(dt.toIso8601String());
    } catch (_) {
      return dateStr;
    }
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label copied to clipboard'),
        duration: const Duration(seconds: 2),
        backgroundColor: navy,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final staffProvider = context.watch<StaffProvider>();
    final attendanceList = staffProvider.attendance.where((a) {
      final matchUser = a.userId.isNotEmpty && a.userId == _staff.id;
      final matchName = a.username.trim().isNotEmpty &&
          a.username.trim().toLowerCase() == _staff.name.trim().toLowerCase();
      return matchUser || matchName;
    }).toList();

    // Check if staff has current live record
    final liveStaff = staffProvider.staffList.firstWhere(
      (s) => s.id == _staff.id,
      orElse: () => _staff,
    );

    final isMorning = liveStaff.shift.toLowerCase().contains('morning');
    final isEvening = liveStaff.shift.toLowerCase().contains('evening');
    final isNight = liveStaff.shift.toLowerCase().contains('night');
    final isGeneral = liveStaff.shift.toLowerCase().contains('general');
    final shiftColor = isMorning ? emerald : (isEvening ? amber : (isNight ? purple : (isGeneral ? blue : navy)));
    final shiftBg = isMorning ? emeraldBg : (isEvening ? amberBg : (isNight ? purpleBg : (isGeneral ? blueBg : cream)));

    final totalHours = attendanceList.fold<int>(0, (sum, a) => sum + a.workingHours);

    return Scaffold(
      backgroundColor: background,
      appBar: _buildAppBar(context),
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: _refreshData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Profile Header Card
              _buildProfileHeaderCard(liveStaff, attendanceList.length, totalHours),
              const SizedBox(height: 14),

              // 2. Shift Slot & Assignment Card with Timings
              _buildShiftAssignmentCard(liveStaff, shiftColor, shiftBg),
              const SizedBox(height: 14),

              // 3. Contact & Credentials Card
              _buildContactCard(liveStaff),
              const SizedBox(height: 14),

              // 4. Attendance History Card
              _buildAttendanceHistorySection(attendanceList),
              const SizedBox(height: 20),

              // 5. Operations Actions (Edit & Delete)
              _buildActionButtons(liveStaff),
            ],
          ),
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: navy,
      elevation: 0,
      scrolledUnderElevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
        onPressed: () => Navigator.of(context).maybePop(),
      ),
      title: Text(
        _staff.name.isNotEmpty ? _staff.name : 'Staff Profile',
        style: const TextStyle(
          color: white,
          fontWeight: FontWeight.w800,
          fontSize: 16,
          letterSpacing: -0.2,
        ),
      ),
    );
  }

  // --- 1. Profile Header Card ---
  Widget _buildProfileHeaderCard(StaffModel staff, int attendanceCount, int totalHours) {
    final initials = staff.name.isNotEmpty
        ? staff.name.trim().split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase()
        : 'S';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Avatar
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [navyLight, navy],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(color: gold, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: navy.withAlpha(25),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: gold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),

              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      staff.name,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: navy,
                        letterSpacing: -0.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: cream,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: gold.withAlpha(120)),
                          ),
                          child: Text(
                            staff.role.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: navy,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        StatusBadge(status: staff.status, fontSize: 10),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(height: 1, color: cardBorder),
          const SizedBox(height: 14),

          // 3 Summary Metric Tiles
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  label: 'Department',
                  value: staff.department,
                  subtitle: 'Division',
                  icon: Icons.domain_rounded,
                  color: navy,
                  bgColor: cream,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'Property',
                  value: staff.propertyId,
                  subtitle: 'Facility',
                  icon: Icons.hotel_rounded,
                  color: purple,
                  bgColor: purpleBg,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  label: 'Work Hours',
                  value: '$totalHours hrs',
                  subtitle: '$attendanceCount Logs',
                  icon: Icons.timer_outlined,
                  color: emerald,
                  bgColor: emeraldBg,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile({
    required String label,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 8),
      decoration: BoxDecoration(
        color: bgColor.withAlpha(120),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withAlpha(60),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(4),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(3.5),
                decoration: BoxDecoration(
                  color: white,
                  borderRadius: BorderRadius.circular(6),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(10),
                      blurRadius: 2,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Icon(icon, size: 11, color: color),
              ),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 8.5,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: color == navy ? navy : color,
                letterSpacing: -0.3,
                height: 1.0,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              color: Color(0xFF334155),
            ),
          ),
        ],
      ),
    );
  }

  // --- 2. Shift Assignment Card with Clear Timings ---
  Widget _buildShiftAssignmentCard(StaffModel staff, Color shiftColor, Color shiftBg) {
    final shiftName = staff.shift.isNotEmpty ? staff.shift : 'General Shift';
    final timing = _getShiftTiming(staff.shift);

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(5),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.schedule_rounded, size: 16, color: navy),
                    SizedBox(width: 6),
                    Text(
                      'Shift Allocation & Timings',
                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: navy),
                    ),
                  ],
                ),
                InkWell(
                  onTap: () => _showAssignShiftDialog(staff),
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                    decoration: BoxDecoration(
                      color: purpleBg,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: purple.withAlpha(80)),
                    ),
                    child: const Text(
                      'Change Shift',
                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: purple),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: shiftBg.withAlpha(120),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: shiftColor.withAlpha(80)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.access_time_filled_rounded, color: shiftColor, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          shiftName,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: shiftColor),
                        ),
                        Text(
                          'Timing: $timing',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- 3. Contact & Credentials Card ---
  Widget _buildContactCard(StaffModel staff) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Contact & System Credentials',
            style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: navy),
          ),
          const SizedBox(height: 10),

          // Email
          if (staff.email.isNotEmpty)
            _buildContactRow(
              icon: Icons.email_outlined,
              label: 'Work Email Address',
              value: staff.email,
              actionIcon: Icons.copy_rounded,
              onAction: () => _copyToClipboard(staff.email, 'Email address'),
            ),

          if (staff.phone.isNotEmpty && staff.phone != '--') ...[
            const SizedBox(height: 8),
            _buildContactRow(
              icon: Icons.phone_outlined,
              label: 'Phone / Mobile',
              value: staff.phone,
              actionIcon: Icons.copy_rounded,
              onAction: () => _copyToClipboard(staff.phone, 'Phone number'),
            ),
          ],

          const SizedBox(height: 8),
          _buildContactRow(
            icon: Icons.badge_outlined,
            label: 'System Identifier (ID)',
            value: staff.id,
            actionIcon: Icons.copy_rounded,
            onAction: () => _copyToClipboard(staff.id, 'Staff ID'),
          ),
        ],
      ),
    );
  }

  Widget _buildContactRow({
    required IconData icon,
    required String label,
    required String value,
    required IconData actionIcon,
    required VoidCallback onAction,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: cardBorder),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: white,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: cardBorder),
            ),
            child: Icon(icon, size: 14, color: navy),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
                Text(
                  value,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: navy),
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(actionIcon, size: 16, color: purple),
            tooltip: 'Copy',
            onPressed: onAction,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }

  // --- 4. Attendance History ---
  Widget _buildAttendanceHistorySection(List<AttendanceModel> attendanceList) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.how_to_reg_rounded, size: 16, color: navy),
                const SizedBox(width: 6),
                const Text(
                  'Recent Attendance Logs',
                  style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: navy),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: navy.withAlpha(15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${attendanceList.length}',
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: navy),
                  ),
                ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 10),

        if (attendanceList.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: cardBorder),
            ),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: cream,
                    shape: BoxShape.circle,
                    border: Border.all(color: gold.withAlpha(100)),
                  ),
                  child: const Icon(Icons.co_present_rounded, color: gold, size: 24),
                ),
                const SizedBox(height: 8),
                const Text(
                  'No Attendance Logs Recorded',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: navy),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Daily attendance records will log here automatically as the staff member operates.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 11, color: muted),
                ),
              ],
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: attendanceList.length,
            itemBuilder: (context, index) {
              final att = attendanceList[index];
              final isPresent = att.status.toLowerCase() == 'present';

              return Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                decoration: BoxDecoration(
                  color: white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: cardBorder),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          isPresent ? Icons.check_circle_rounded : Icons.cancel_rounded,
                          size: 16,
                          color: isPresent ? emerald : ruby,
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _formatDateString(att.date),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy),
                            ),
                            Text(
                              'In: ${att.checkIn}  |  Out: ${att.checkOut}',
                              style: const TextStyle(fontSize: 10.5, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Text(
                      '${att.workingHours} hrs',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: purple),
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  // --- 5. Action Buttons (Edit & Delete) ---
  Widget _buildActionButtons(StaffModel staff) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.edit_outlined, size: 16),
            label: const Text(
              'Edit Staff Profile & Shift',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: navy,
              foregroundColor: white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => _showEditStaffDialog(staff),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            icon: const Icon(Icons.delete_outline_rounded, size: 16, color: ruby),
            label: const Text(
              'Delete Staff Member',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: ruby),
            ),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: ruby.withAlpha(120)),
              padding: const EdgeInsets.symmetric(vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: () => _confirmDeleteStaff(staff),
          ),
        ),
      ],
    );
  }

  // --- Edit Staff Dialog with Full Shift Timings ---
  void _showEditStaffDialog(StaffModel staff) {
    final nameCtrl = TextEditingController(text: staff.name);
    final emailCtrl = TextEditingController(text: staff.email);
    final phoneCtrl = TextEditingController(text: staff.phone);
    String selectedRole = staff.role;
    String selectedDept = staff.department;
    String selectedShift = staff.shift.isNotEmpty ? staff.shift : 'General Shift';
    String selectedStatus = staff.status;

    final roles = ['manager', 'receptionist', 'housekeeping', 'maintenance', 'security', 'kitchen'];
    final depts = ['Front Desk', 'Housekeeping', 'Management', 'Maintenance', 'Security', 'Food & Beverage'];
    final statuses = ['Active', 'Inactive', 'On Leave'];

    // Find closest shift option match
    final matchedShift = shiftOptions.firstWhere(
      (opt) => opt['value']!.toLowerCase() == selectedShift.toLowerCase() ||
               opt['value']!.toLowerCase().contains(selectedShift.toLowerCase()) ||
               selectedShift.toLowerCase().contains(opt['value']!.toLowerCase()),
      orElse: () => shiftOptions.first,
    )['value']!;

    selectedShift = matchedShift;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              title: const Text('Edit Staff Member & Shift', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: navy)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(labelText: 'Staff Full Name', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: emailCtrl,
                      decoration: const InputDecoration(labelText: 'Email Address', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: phoneCtrl,
                      decoration: const InputDecoration(labelText: 'Phone Number', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),

                    // Shift with explicit timings
                    DropdownButtonFormField<String>(
                      initialValue: selectedShift,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Assigned Shift (with Timing)',
                        border: OutlineInputBorder(),
                      ),
                      items: shiftOptions.map((s) => DropdownMenuItem(
                        value: s['value']!,
                        child: Text(
                          s['label']!,
                          style: const TextStyle(fontSize: 12),
                          overflow: TextOverflow.ellipsis,
                        ),
                      )).toList(),
                      onChanged: (v) => setDialogState(() => selectedShift = v ?? selectedShift),
                    ),
                    const SizedBox(height: 10),

                    DropdownButtonFormField<String>(
                      initialValue: roles.contains(selectedRole.toLowerCase()) ? selectedRole.toLowerCase() : roles.first,
                      decoration: const InputDecoration(labelText: 'System Role', border: OutlineInputBorder()),
                      items: roles.map((r) => DropdownMenuItem(value: r, child: Text(r.toUpperCase()))).toList(),
                      onChanged: (v) => setDialogState(() => selectedRole = v ?? selectedRole),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: depts.contains(selectedDept) ? selectedDept : depts.first,
                      decoration: const InputDecoration(labelText: 'Department', border: OutlineInputBorder()),
                      items: depts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                      onChanged: (v) => setDialogState(() => selectedDept = v ?? selectedDept),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: statuses.contains(selectedStatus) ? selectedStatus : 'Active',
                      decoration: const InputDecoration(labelText: 'Status', border: OutlineInputBorder()),
                      items: statuses.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                      onChanged: (v) => setDialogState(() => selectedStatus = v ?? selectedStatus),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel', style: TextStyle(color: muted, fontWeight: FontWeight.w600)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: purple,
                    foregroundColor: white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () async {
                    Navigator.pop(ctx);
                    final messenger = ScaffoldMessenger.of(context);
                    final ok = await context.read<StaffProvider>().updateStaff(staff.id, {
                      'name': nameCtrl.text.trim(),
                      'email': emailCtrl.text.trim(),
                      'mobile': phoneCtrl.text.trim(),
                      'role': selectedRole,
                      'dept': selectedDept,
                      'shift': selectedShift,
                      'status': selectedStatus,
                    });
                    if (ok && mounted) {
                      messenger.showSnackBar(
                        const SnackBar(content: Text('Staff profile updated successfully!'), backgroundColor: emerald),
                      );
                      setState(() {
                        _staff = StaffModel(
                          id: staff.id,
                          name: nameCtrl.text.trim(),
                          email: emailCtrl.text.trim(),
                          mobile: phoneCtrl.text.trim(),
                          role: selectedRole,
                          dept: selectedDept,
                          shift: selectedShift,
                          status: selectedStatus,
                          propertyId: staff.propertyId,
                        );
                      });
                    }
                  },
                  child: const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // --- Assign Shift Dialog with Full Shift Timings ---
  void _showAssignShiftDialog(StaffModel staff) {
    String currentShift = staff.shift.isNotEmpty ? staff.shift : 'General Shift';

    final matched = shiftOptions.firstWhere(
      (opt) => opt['value']!.toLowerCase() == currentShift.toLowerCase() ||
               opt['value']!.toLowerCase().contains(currentShift.toLowerCase()) ||
               currentShift.toLowerCase().contains(opt['value']!.toLowerCase()),
      orElse: () => shiftOptions.first,
    )['value']!;

    String selectedShift = matched;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(color: navy, borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.schedule_rounded, color: gold, size: 18),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Reassign Shift Slot', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: navy)),
                        Text(staff.name, style: const TextStyle(fontSize: 12, color: muted)),
                      ],
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: selectedShift,
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: 'Select Shift Slot & Timings',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: shiftOptions.map((s) => DropdownMenuItem(
                      value: s['value']!,
                      child: Text(
                        s['label']!,
                        style: const TextStyle(fontSize: 12),
                        overflow: TextOverflow.ellipsis,
                      ),
                    )).toList(),
                    onChanged: (v) => setDialogState(() => selectedShift = v ?? selectedShift),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel', style: TextStyle(color: muted, fontWeight: FontWeight.w600)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navy,
                    foregroundColor: white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () async {
                    Navigator.pop(ctx);
                    final messenger = ScaffoldMessenger.of(context);
                    final ok = await context.read<StaffProvider>().assignShift(staff.id, staff.name, selectedShift);
                    if (ok && mounted) {
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text('Shift slot reassigned to $selectedShift for ${staff.name}'),
                          backgroundColor: emerald,
                        ),
                      );
                      setState(() {
                        _staff = StaffModel(
                          id: staff.id,
                          name: staff.name,
                          email: staff.email,
                          mobile: staff.mobile,
                          role: staff.role,
                          dept: staff.dept,
                          shift: selectedShift,
                          status: staff.status,
                          propertyId: staff.propertyId,
                        );
                      });
                    }
                  },
                  child: const Text('Confirm Shift', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // --- Confirm Delete Dialog ---
  void _confirmDeleteStaff(StaffModel staff) async {
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Delete Staff Profile', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: navy)),
        content: Text('Are you sure you want to delete profile for ${staff.name}? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: muted, fontWeight: FontWeight.w600)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: ruby,
              foregroundColor: white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete Profile', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      final ok = await context.read<StaffProvider>().deleteStaff(staff.id);
      if (ok && mounted) {
        navigator.pop();
        messenger.showSnackBar(
          SnackBar(
            content: Text('Profile for ${staff.name} deleted successfully.'),
            backgroundColor: emerald,
          ),
        );
      }
    }
  }
}
