import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/staff_model.dart';
import 'package:hour_stay_mobile/providers/manager/staff_provider.dart';
import 'package:hour_stay_mobile/widgets/server_config_dialog.dart';
import 'package:hour_stay_mobile/colours.dart';

class ManagerAttendanceScreen extends StatefulWidget {
  const ManagerAttendanceScreen({super.key});

  @override
  State<ManagerAttendanceScreen> createState() => _ManagerAttendanceScreenState();
}

class _ManagerAttendanceScreenState extends State<ManagerAttendanceScreen> {

  String _searchQuery = '';
  String _selectedStatus = 'All';
  String _selectedDateFilter = 'All'; // 'All', 'Today', 'Yesterday', 'Custom'
  DateTime? _customDate;
  final TextEditingController _searchController = TextEditingController();

  final List<String> _statusFilters = [
    'All',
    'Present',
    'Absent',
    'Late',
    'Half Day',
    'On Leave',
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<StaffProvider>().fetchAll();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String _formatDateString(String dateStr) {
    if (dateStr.isEmpty) return '—';
    try {
      final now = DateTime.now();
      final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
      if (dateStr.startsWith(todayStr)) return 'Today';

      final yesterday = now.subtract(const Duration(days: 1));
      final yestStr = "${yesterday.year}-${yesterday.month.toString().padLeft(2, '0')}-${yesterday.day.toString().padLeft(2, '0')}";
      if (dateStr.startsWith(yestStr)) return 'Yesterday';

      final dt = DateTime.parse(dateStr);
      return Formatters.date(dt.toIso8601String());
    } catch (_) {
      return dateStr;
    }
  }

  String _getShiftTiming(String shiftName) {
    final s = shiftName.toLowerCase();
    if (s.contains('general')) return '09:00 AM – 06:00 PM';
    if (s.contains('morning')) return '06:00 AM – 02:00 PM';
    if (s.contains('evening') || s.contains('afternoon')) return '02:00 PM – 10:00 PM';
    if (s.contains('night')) return '10:00 PM – 06:00 AM';
    if (s.contains('rotational') || s.contains('rotating')) return 'Flexible / Rotating';
    return '09:00 AM – 06:00 PM';
  }

  @override
  Widget build(BuildContext context) {
    final staffProvider = context.watch<StaffProvider>();
    final attendanceLogs = staffProvider.attendance;
    final staffList = staffProvider.staffList;
    final shifts = staffProvider.shifts;

    // Helper map for staff info
    final staffMap = {for (var s in staffList) s.id: s};
    final staffNameMap = {for (var s in staffList) s.name.toLowerCase(): s};
    final shiftMap = {for (var sh in shifts) sh.userId: sh};

    // Calculate metrics
    final totalLogs = attendanceLogs.length;
    final presentCount = attendanceLogs.where((a) => a.status.toLowerCase() == 'present').length;
    final absentCount = attendanceLogs.where((a) => a.status.toLowerCase() == 'absent').length;
    final leaveOrLateCount = attendanceLogs.where((a) {
      final st = a.status.toLowerCase();
      return st == 'on leave' || st == 'leave' || st == 'late' || st == 'half day';
    }).length;

    // Filter logs
    final now = DateTime.now();
    final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final yesterday = now.subtract(const Duration(days: 1));
    final yestStr = "${yesterday.year}-${yesterday.month.toString().padLeft(2, '0')}-${yesterday.day.toString().padLeft(2, '0')}";

    final filteredLogs = attendanceLogs.where((log) {
      // 1. Status Filter
      if (_selectedStatus != 'All') {
        final logStatus = log.status.toLowerCase();
        final selStatus = _selectedStatus.toLowerCase();
        if (selStatus == 'on leave') {
          if (logStatus != 'on leave' && logStatus != 'leave') return false;
        } else if (logStatus != selStatus) {
          return false;
        }
      }

      // 2. Date Filter
      if (_selectedDateFilter == 'Today') {
        if (!log.date.startsWith(todayStr)) return false;
      } else if (_selectedDateFilter == 'Yesterday') {
        if (!log.date.startsWith(yestStr)) return false;
      } else if (_selectedDateFilter == 'Custom' && _customDate != null) {
        final customStr = "${_customDate!.year}-${_customDate!.month.toString().padLeft(2, '0')}-${_customDate!.day.toString().padLeft(2, '0')}";
        if (!log.date.startsWith(customStr)) return false;
      }

      // 3. Search Filter
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final staff = staffMap[log.userId] ?? staffNameMap[log.username.toLowerCase()];
        final staffName = log.username.toLowerCase();
        final staffRole = staff?.role.toLowerCase() ?? '';
        final staffDept = staff?.dept.toLowerCase() ?? '';
        final staffShift = staff?.shift.toLowerCase() ?? '';
        final date = log.date.toLowerCase();
        final status = log.status.toLowerCase();

        final matches = staffName.contains(q) ||
            staffRole.contains(q) ||
            staffDept.contains(q) ||
            staffShift.contains(q) ||
            date.contains(q) ||
            status.contains(q);
        if (!matches) return false;
      }

      return true;
    }).toList();

    return Scaffold(
      backgroundColor: background,
      appBar: _buildAppBar(context),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: purple,
        foregroundColor: white,
        elevation: 4,
        icon: const Icon(Icons.add_task_rounded, size: 20),
        label: const Text(
          'Mark Attendance',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5, letterSpacing: 0.2),
        ),
        onPressed: () => _showMarkAttendanceDialog(context, staffList),
      ),
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: () => staffProvider.fetchAll(),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // 1. KPI Summary Cards (4 Cards Per Row, Uniform Static)
            SliverToBoxAdapter(
              child: _buildKpiSection(
                totalCount: totalLogs,
                presentCount: presentCount,
                absentCount: absentCount,
                leaveOrLateCount: leaveOrLateCount,
              ),
            ),

            // 2. Search Bar & Date / Status Filter Chips
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSearchBar(),
                    const SizedBox(height: 10),
                    _buildDateFilters(),
                    const SizedBox(height: 8),
                    _buildStatusFilters(),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Attendance Records (${filteredLogs.length})',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: navy,
                            letterSpacing: -0.2,
                          ),
                        ),
                        if (_selectedStatus != 'All' || _selectedDateFilter != 'All' || _searchQuery.isNotEmpty)
                          TextButton(
                            onPressed: () {
                              setState(() {
                                _selectedStatus = 'All';
                                _selectedDateFilter = 'All';
                                _customDate = null;
                                _searchQuery = '';
                                _searchController.clear();
                              });
                            },
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text(
                              'Reset Filters',
                              style: TextStyle(color: purple, fontSize: 11.5, fontWeight: FontWeight.w700),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // 3. Attendance Logs List
            if (staffProvider.isLoading && attendanceLogs.isEmpty)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: purple),
                ),
              )
            else if (staffProvider.errorMessage != null && attendanceLogs.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _buildErrorCard(context, staffProvider.errorMessage!, () => staffProvider.fetchAll()),
              )
            else if (filteredLogs.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _buildEmptyCard(),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(14, 4, 14, 90),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final log = filteredLogs[index];
                      final staff = staffMap[log.userId] ?? staffNameMap[log.username.toLowerCase()];
                      final shift = shiftMap[log.userId];
                      return _buildAttendanceCard(
                        context: context,
                        log: log,
                        staff: staff,
                        shift: shift,
                      );
                    },
                    childCount: filteredLogs.length,
                  ),
                ),
              ),
          ],
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
      title: const Text(
        'Staff Attendance',
        style: TextStyle(
          color: white,
          fontWeight: FontWeight.w800,
          fontSize: 16,
          letterSpacing: -0.2,
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.tune_rounded, color: gold, size: 20),
          tooltip: 'Server Config',
          onPressed: () => ServerConfigDialog.show(context),
        ),
        const SizedBox(width: 4),
      ],
    );
  }

  // --- 1. KPI Summary Cards (4 Cards, Uniform Static) ---
  Widget _buildKpiSection({
    required int totalCount,
    required int presentCount,
    required int absentCount,
    required int leaveOrLateCount,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
      child: Row(
        children: [
          Expanded(
            child: _buildMiniMetric(
              label: 'Total Logs',
              value: '$totalCount',
              subtitle: 'Records',
              icon: Icons.assignment_turned_in_rounded,
              color: navy,
              bgColor: cream,
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: _buildMiniMetric(
              label: 'Present',
              value: '$presentCount',
              subtitle: 'On Duty',
              icon: Icons.check_circle_rounded,
              color: emerald,
              bgColor: emeraldBg,
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: _buildMiniMetric(
              label: 'Absent',
              value: '$absentCount',
              subtitle: 'Not In',
              icon: Icons.cancel_rounded,
              color: ruby,
              bgColor: rubyBg,
            ),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: _buildMiniMetric(
              label: 'Leave/Late',
              value: '$leaveOrLateCount',
              subtitle: 'Exceptions',
              icon: Icons.schedule_rounded,
              color: amber,
              bgColor: amberBg,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniMetric({
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
                child: Icon(icon, size: 12, color: color),
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
          const SizedBox(height: 6),
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
          const SizedBox(height: 3),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Color(0xFF334155),
            ),
          ),
        ],
      ),
    );
  }

  // --- 2. Search Bar ---
  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (val) => setState(() => _searchQuery = val.trim()),
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: navy,
        ),
        decoration: InputDecoration(
          hintText: 'Search staff name, role, date or shift...',
          hintStyle: TextStyle(
            fontSize: 12,
            color: muted.withAlpha(180),
            fontWeight: FontWeight.w500,
          ),
          prefixIcon: const Icon(Icons.search_rounded, color: purple, size: 20),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear_rounded, size: 18, color: muted),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        ),
      ),
    );
  }

  // --- Date Filters ---
  Widget _buildDateFilters() {
    final dateOptions = ['All', 'Today', 'Yesterday', 'Custom'];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: dateOptions.map((opt) {
          final isSelected = _selectedDateFilter == opt;
          String label = opt;
          if (opt == 'Custom' && _customDate != null) {
            label = "${_customDate!.day}/${_customDate!.month}/${_customDate!.year}";
          }

          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: InkWell(
              onTap: () async {
                if (opt == 'Custom') {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _customDate ?? DateTime.now(),
                    firstDate: DateTime(2020),
                    lastDate: DateTime(2030),
                  );
                  if (picked != null) {
                    setState(() {
                      _customDate = picked;
                      _selectedDateFilter = 'Custom';
                    });
                  }
                } else {
                  setState(() {
                    _selectedDateFilter = opt;
                    if (opt != 'Custom') _customDate = null;
                  });
                }
              },
              borderRadius: BorderRadius.circular(16),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: isSelected ? navy : white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected ? navy : cardBorder,
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      opt == 'Custom' ? Icons.calendar_today_rounded : Icons.access_time_rounded,
                      size: 11,
                      color: isSelected ? gold : muted,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                        color: isSelected ? white : const Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // --- Status Filter Chips ---
  Widget _buildStatusFilters() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: _statusFilters.map((st) {
          final isSelected = _selectedStatus == st;
          Color stColor = navy;
          if (st == 'Present') stColor = emerald;
          if (st == 'Absent') stColor = ruby;
          if (st == 'Late' || st == 'Half Day') stColor = amber;
          if (st == 'On Leave') stColor = blue;

          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: InkWell(
              onTap: () => setState(() => _selectedStatus = st),
              borderRadius: BorderRadius.circular(16),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: isSelected ? stColor : white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected ? stColor : cardBorder,
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (st != 'All') ...[
                      Container(
                        width: 5,
                        height: 5,
                        decoration: BoxDecoration(
                          color: isSelected ? white : stColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                    ],
                    Text(
                      st,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                        color: isSelected ? white : const Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // --- 3. Attendance Card ---
  Widget _buildAttendanceCard({
    required BuildContext context,
    required AttendanceModel log,
    StaffModel? staff,
    ShiftModel? shift,
  }) {
    final staffName = log.username.isNotEmpty ? log.username : (staff?.name ?? 'Staff Personnel');
    final role = staff?.role.isNotEmpty == true ? staff!.role : 'Receptionist';
    final dept = staff?.dept.isNotEmpty == true ? staff!.dept : 'Front Desk';
    final shiftName = shift?.shiftType.isNotEmpty == true
        ? shift!.shiftType
        : (staff?.shift.isNotEmpty == true ? staff!.shift : 'General Shift');
    final shiftTiming = _getShiftTiming(shiftName);

    final status = log.status;
    Color statusColor = emerald;
    Color statusBg = emeraldBg;
    IconData statusIcon = Icons.check_circle_rounded;

    final stLower = status.toLowerCase();
    if (stLower == 'absent') {
      statusColor = ruby;
      statusBg = rubyBg;
      statusIcon = Icons.cancel_rounded;
    } else if (stLower == 'late') {
      statusColor = amber;
      statusBg = amberBg;
      statusIcon = Icons.alarm_rounded;
    } else if (stLower == 'half day') {
      statusColor = purple;
      statusBg = purpleBg;
      statusIcon = Icons.hourglass_bottom_rounded;
    } else if (stLower == 'on leave' || stLower == 'leave') {
      statusColor = blue;
      statusBg = blueBg;
      statusIcon = Icons.event_busy_rounded;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 9),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(5),
            blurRadius: 7,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Avatar + Name/Role + Status Badge
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: cream,
                    shape: BoxShape.circle,
                    border: Border.all(color: gold.withAlpha(120), width: 1.2),
                  ),
                  child: Center(
                    child: Text(
                      staffName.isNotEmpty ? staffName[0].toUpperCase() : 'S',
                      style: const TextStyle(
                        color: navy,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        staffName,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: navy,
                          letterSpacing: -0.2,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 1),
                      Text(
                        '${role.toUpperCase()} • $dept',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: muted,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: statusColor.withAlpha(80), width: 1),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 11, color: statusColor),
                      const SizedBox(width: 4),
                      Text(
                        status,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Middle Section: Date & Shift pill
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: cardBorder.withAlpha(120)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.event_note_rounded, size: 13, color: purple),
                      const SizedBox(width: 5),
                      Text(
                        _formatDateString(log.date),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: navy,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      const Icon(Icons.schedule_rounded, size: 13, color: gold),
                      const SizedBox(width: 4),
                      Text(
                        '$shiftName ($shiftTiming)',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF475569),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Bottom Punch Details: Check-In, Check-Out, Working Hours
            Row(
              children: [
                Expanded(
                  child: _buildPunchBox(
                    label: 'Check-In',
                    time: log.checkIn.isNotEmpty ? log.checkIn : '--:--',
                    icon: Icons.login_rounded,
                    color: emerald,
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: _buildPunchBox(
                    label: 'Check-Out',
                    time: log.checkOut.isNotEmpty ? log.checkOut : '--:--',
                    icon: Icons.logout_rounded,
                    color: amber,
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: _buildPunchBox(
                    label: 'Hours',
                    time: '${log.workingHours} hrs',
                    icon: Icons.timelapse_rounded,
                    color: purple,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPunchBox({
    required String label,
    required String time,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      decoration: BoxDecoration(
        color: color.withAlpha(12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withAlpha(40), width: 0.8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 10, color: color),
              const SizedBox(width: 3),
              Text(
                label,
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            time,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: navy,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // --- Empty & Error States ---
  Widget _buildEmptyCard() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cream,
                shape: BoxShape.circle,
                border: Border.all(color: gold.withAlpha(100)),
              ),
              child: const Icon(Icons.event_busy_rounded, size: 36, color: navy),
            ),
            const SizedBox(height: 14),
            const Text(
              'No Attendance Records Found',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'No logs match the selected date or status filter.',
              style: TextStyle(fontSize: 11.5, color: muted),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _selectedStatus = 'All';
                  _selectedDateFilter = 'All';
                  _customDate = null;
                  _searchQuery = '';
                  _searchController.clear();
                });
              },
              icon: const Icon(Icons.refresh_rounded, size: 16, color: white),
              label: const Text('Reset All Filters', style: TextStyle(fontWeight: FontWeight.w700, color: white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: purple,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorCard(BuildContext context, String error, VoidCallback onRetry) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: rubyBg,
                shape: BoxShape.circle,
                border: Border.all(color: ruby.withAlpha(80)),
              ),
              child: const Icon(Icons.error_outline_rounded, size: 36, color: ruby),
            ),
            const SizedBox(height: 14),
            const Text(
              'Unable to Load Attendance',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              error,
              style: const TextStyle(fontSize: 11.5, color: muted),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded, size: 16, color: white),
              label: const Text('Retry Connection', style: TextStyle(fontWeight: FontWeight.w700, color: white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Dialog: Mark Attendance Log ---
  void _showMarkAttendanceDialog(BuildContext context, List<StaffModel> staffList) {
    if (staffList.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No staff members available to mark attendance.')),
      );
      return;
    }

    String selectedStaffId = staffList.first.id;
    String selectedStaffName = staffList.first.name;
    String selectedStatus = 'Present';
    String checkInTime = '09:00 AM';
    String checkOutTime = '06:00 PM';
    int workingHours = 8;
    DateTime selectedDate = DateTime.now();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (dialogContext, setDialogState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(18, 16, 18, MediaQuery.of(dialogContext).viewInsets.bottom + 24),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 36,
                        height: 4,
                        decoration: BoxDecoration(
                          color: muted.withAlpha(60),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Row(
                      children: [
                        Icon(Icons.how_to_reg_rounded, color: purple, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Mark Staff Attendance',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: navy,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Staff Dropdown
                    const Text('Select Staff Member', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: navy)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: cardBorder),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedStaffId,
                          isExpanded: true,
                          items: staffList.map((s) {
                            return DropdownMenuItem<String>(
                              value: s.id,
                              child: Text('${s.name} (${s.role.toUpperCase()})', style: const TextStyle(fontSize: 12.5, color: navy)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              final matched = staffList.firstWhere((s) => s.id == val);
                              setDialogState(() {
                                selectedStaffId = val;
                                selectedStaffName = matched.name;
                              });
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Date Picker Box
                    const Text('Attendance Date', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: navy)),
                    const SizedBox(height: 4),
                    InkWell(
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: dialogContext,
                          initialDate: selectedDate,
                          firstDate: DateTime(2020),
                          lastDate: DateTime(2030),
                        );
                        if (picked != null) {
                          setDialogState(() => selectedDate = picked);
                        }
                      },
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: cardBorder),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "${selectedDate.day}/${selectedDate.month}/${selectedDate.year}",
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: navy),
                            ),
                            const Icon(Icons.calendar_today_rounded, size: 16, color: purple),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Status Dropdown
                    const Text('Attendance Status', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: navy)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: cardBorder),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: selectedStatus,
                          isExpanded: true,
                          items: ['Present', 'Absent', 'Late', 'Half Day', 'On Leave'].map((st) {
                            return DropdownMenuItem<String>(
                              value: st,
                              child: Text(st, style: const TextStyle(fontSize: 12.5, color: navy)),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              setDialogState(() => selectedStatus = val);
                            }
                          },
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Check-in / Check-out timing row
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Check-In Time', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: navy)),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: cardBorder),
                                ),
                                child: TextFormField(
                                  initialValue: checkInTime,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy),
                                  decoration: const InputDecoration.collapsed(hintText: '09:00 AM'),
                                  onChanged: (v) => checkInTime = v,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Check-Out Time', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: navy)),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: cardBorder),
                                ),
                                child: TextFormField(
                                  initialValue: checkOutTime,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy),
                                  decoration: const InputDecoration.collapsed(hintText: '06:00 PM'),
                                  onChanged: (v) => checkOutTime = v,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Hours', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: navy)),
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: cardBorder),
                                ),
                                child: TextFormField(
                                  initialValue: '$workingHours',
                                  keyboardType: TextInputType.number,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy),
                                  decoration: const InputDecoration.collapsed(hintText: '8'),
                                  onChanged: (v) => workingHours = int.tryParse(v) ?? 8,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () async {
                          final dateFormatted = "${selectedDate.year}-${selectedDate.month.toString().padLeft(2, '0')}-${selectedDate.day.toString().padLeft(2, '0')}";
                          final payload = {
                            'userId': selectedStaffId,
                            'username': selectedStaffName,
                            'date': dateFormatted,
                            'checkIn': checkInTime,
                            'checkOut': checkOutTime,
                            'workingHours': workingHours,
                            'status': selectedStatus,
                          };

                          final success = await context.read<StaffProvider>().markAttendance(payload);
                          if (ctx.mounted) Navigator.of(ctx).pop();
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(success ? 'Attendance logged successfully for $selectedStaffName' : 'Failed to record attendance'),
                                backgroundColor: success ? emerald : ruby,
                              ),
                            );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: purple,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text(
                          'Save Attendance Record',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
