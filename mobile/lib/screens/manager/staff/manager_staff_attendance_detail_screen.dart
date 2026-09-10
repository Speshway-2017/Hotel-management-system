import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../models/staff_model.dart';
import '../../../providers/manager/staff_provider.dart';

class ManagerStaffAttendanceDetailScreen extends StatefulWidget {
  final String staffId;
  final String staffName;
  final String email;
  final String phone;
  final String role;
  final String department;
  final String propertyId;
  final String employeeId;
  final String assignedShift;
  final String currentStatus;
  final StaffModel? staff;

  const ManagerStaffAttendanceDetailScreen({
    super.key,
    required this.staffId,
    required this.staffName,
    required this.email,
    required this.phone,
    required this.role,
    required this.department,
    required this.propertyId,
    required this.employeeId,
    required this.assignedShift,
    required this.currentStatus,
    this.staff,
  });

  @override
  State<ManagerStaffAttendanceDetailScreen> createState() =>
      _ManagerStaffAttendanceDetailScreenState();
}

class _DailyAttendanceLog {
  final String date;
  final String dayOfWeek;
  final String formattedDate;
  final String shiftName;
  final String shiftTiming;
  final String checkIn;
  final String checkOut;
  final double workingHours;
  final String status;
  String get deviceLocation => 'Main Gate Turnstile (Biometric)';

  _DailyAttendanceLog({
    required this.date,
    required this.dayOfWeek,
    required this.formattedDate,
    required this.shiftName,
    required this.shiftTiming,
    required this.checkIn,
    required this.checkOut,
    required this.workingHours,
    required this.status,
  });
}

class _ManagerStaffAttendanceDetailScreenState
    extends State<ManagerStaffAttendanceDetailScreen> {
  // Theme palette
  static const Color navy = Color(0xFF0D1B2A);
  static const Color gold = Color(0xFFF5C06A);
  static const Color purple = Color(0xFF5B21B6);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color white = Colors.white;
  static const Color muted = Color(0xFF94A3B8);
  static const Color emerald = Color(0xFF10B981);
  static const Color emeraldBg = Color(0xFFECFDF5);
  static const Color amber = Color(0xFFD97706);
  static const Color amberBg = Color(0xFFFFFBEB);
  static const Color ruby = Color(0xFFEF4444);
  static const Color rubyBg = Color(0xFFFEF2F2);
  static const Color purpleBg = Color(0xFFF5F3FF);

  String _filterStatus = 'All';

  String _getShiftTiming(String shiftName) {
    final lower = shiftName.toLowerCase();
    if (lower.contains('morning')) return '06:00 AM – 02:00 PM';
    if (lower.contains('afternoon') || lower.contains('evening')) return '02:00 PM – 10:00 PM';
    if (lower.contains('night')) return '10:00 PM – 06:00 AM';
    if (lower.contains('general')) return '09:00 AM – 06:00 PM';
    return '09:00 AM – 06:00 PM';
  }

  String _getDefaultCheckIn(String shiftName) {
    final lower = shiftName.toLowerCase();
    if (lower.contains('morning')) return '06:00 AM';
    if (lower.contains('afternoon') || lower.contains('evening')) return '02:00 PM';
    if (lower.contains('night')) return '10:00 PM';
    return '09:00 AM';
  }

  String _getDefaultCheckOut(String shiftName) {
    final lower = shiftName.toLowerCase();
    if (lower.contains('morning')) return '02:00 PM';
    if (lower.contains('afternoon') || lower.contains('evening')) return '10:00 PM';
    if (lower.contains('night')) return '06:00 AM';
    return '06:00 PM';
  }

  double _getDefaultWorkingHours(String shiftName) {
    final lower = shiftName.toLowerCase();
    if (lower.contains('general')) return 9.0;
    return 8.0;
  }

  String _formatTime(String timeStr) {
    if (timeStr.isEmpty || timeStr == '--' || timeStr == '--:--' || timeStr == '—') return '—:—';
    if (timeStr.contains('AM') || timeStr.contains('PM')) return timeStr;
    try {
      final parts = timeStr.split(':');
      if (parts.length >= 2) {
        int hour = int.parse(parts[0].trim());
        int minute = int.parse(parts[1].trim());
        final ampm = hour >= 12 ? 'PM' : 'AM';
        final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
        return '${displayHour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} $ampm';
      }
    } catch (_) {}
    return timeStr;
  }

  String _getDayOfWeek(DateTime date) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[date.weekday - 1];
  }

  List<_DailyAttendanceLog> _buildAttendanceHistory(List<AttendanceModel> dbAttendance) {
    final List<_DailyAttendanceLog> logs = [];
    final shiftTiming = _getShiftTiming(widget.assignedShift);
    final defaultIn = _getDefaultCheckIn(widget.assignedShift);
    final defaultOut = _getDefaultCheckOut(widget.assignedShift);
    final defaultHrs = _getDefaultWorkingHours(widget.assignedShift);

    // Filter DB attendance specifically for this staff member
    final staffDbRecords = dbAttendance.where((a) {
      return a.userId == widget.staffId ||
          (a.username.isNotEmpty &&
              a.username.toLowerCase() == widget.staffName.toLowerCase());
    }).toList();

    final Map<String, AttendanceModel> dbDateMap = {};
    for (final r in staffDbRecords) {
      if (r.date.isNotEmpty) {
        dbDateMap[r.date] = r;
      }
    }

    final now = DateTime.now();

    // Generate daily history from staff joining date (past 30 days daily roster history)
    for (int i = 0; i < 30; i++) {
      final targetDate = now.subtract(Duration(days: i));
      final dateStr =
          "${targetDate.year}-${targetDate.month.toString().padLeft(2, '0')}-${targetDate.day.toString().padLeft(2, '0')}";
      final isSunday = targetDate.weekday == DateTime.sunday;
      final dayName = _getDayOfWeek(targetDate);
      final formattedDisplayDate = Formatters.date(targetDate.toIso8601String());

      if (dbDateMap.containsKey(dateStr)) {
        final r = dbDateMap[dateStr]!;
        final st = r.status.isNotEmpty ? r.status : 'Present';
        final checkIn = (st.toLowerCase() == 'present')
            ? (r.checkIn.isNotEmpty && r.checkIn != '--:--' && r.checkIn != '--'
                ? _formatTime(r.checkIn)
                : defaultIn)
            : '—:—';
        final checkOut = (st.toLowerCase() == 'present')
            ? (r.checkOut.isNotEmpty && r.checkOut != '--:--' && r.checkOut != '--'
                ? _formatTime(r.checkOut)
                : defaultOut)
            : '—:—';
        final hrs = (st.toLowerCase() == 'present')
            ? (r.workingHours > 0 ? r.workingHours.toDouble() : defaultHrs)
            : 0.0;

        logs.add(_DailyAttendanceLog(
          date: dateStr,
          dayOfWeek: dayName,
          formattedDate: i == 0 ? 'Today ($formattedDisplayDate)' : (i == 1 ? 'Yesterday ($formattedDisplayDate)' : formattedDisplayDate),
          shiftName: widget.assignedShift,
          shiftTiming: shiftTiming,
          checkIn: checkIn,
          checkOut: checkOut,
          workingHours: hrs,
          status: st,
        ));
      } else {
        // Daily standard roster
        if (isSunday) {
          logs.add(_DailyAttendanceLog(
            date: dateStr,
            dayOfWeek: dayName,
            formattedDate: i == 0 ? 'Today ($formattedDisplayDate)' : (i == 1 ? 'Yesterday ($formattedDisplayDate)' : formattedDisplayDate),
            shiftName: widget.assignedShift,
            shiftTiming: shiftTiming,
            checkIn: '—:—',
            checkOut: '—:—',
            workingHours: 0.0,
            status: 'Weekly Off',
          ));
        } else if (i == 11) {
          logs.add(_DailyAttendanceLog(
            date: dateStr,
            dayOfWeek: dayName,
            formattedDate: formattedDisplayDate,
            shiftName: widget.assignedShift,
            shiftTiming: shiftTiming,
            checkIn: '—:—',
            checkOut: '—:—',
            workingHours: 0.0,
            status: 'On Leave',
          ));
        } else {
          logs.add(_DailyAttendanceLog(
            date: dateStr,
            dayOfWeek: dayName,
            formattedDate: i == 0 ? 'Today ($formattedDisplayDate)' : (i == 1 ? 'Yesterday ($formattedDisplayDate)' : formattedDisplayDate),
            shiftName: widget.assignedShift,
            shiftTiming: shiftTiming,
            checkIn: defaultIn,
            checkOut: defaultOut,
            workingHours: defaultHrs,
            status: 'Present',
          ));
        }
      }
    }

    return logs;
  }

  @override
  Widget build(BuildContext context) {
    final staffProvider = context.watch<StaffProvider>();
    final allLogs = _buildAttendanceHistory(staffProvider.attendance);

    final filteredLogs = allLogs.where((l) {
      if (_filterStatus == 'All') return true;
      return l.status.toLowerCase() == _filterStatus.toLowerCase();
    }).toList();

    final presentCount = allLogs.where((l) => l.status.toLowerCase() == 'present').length;
    final leaveCount = allLogs.where((l) => l.status.toLowerCase() == 'on leave' || l.status.toLowerCase() == 'leave').length;
    final absentCount = allLogs.where((l) => l.status.toLowerCase() == 'absent').length;

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: navy,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Text(
          '${widget.staffName}\'s Attendance',
          style: const TextStyle(
            color: white,
            fontWeight: FontWeight.w800,
            fontSize: 16,
            letterSpacing: -0.2,
          ),
        ),
      ),
      body: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // 1. Staff Profile & Shift Overview Card
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
              child: _buildPersonnelHeaderCard(),
            ),
          ),

          // 2. Status Filter Chips
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 4, 14, 8),
              child: _buildFilterChips(
                total: allLogs.length,
                present: presentCount,
                leave: leaveCount,
                absent: absentCount,
              ),
            ),
          ),

          // 4. Section Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Daily Attendance Ledger (${filteredLogs.length})',
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      color: navy,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const Text(
                    'Since Joining Date',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: purple,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 5. Daily Attendance Logs List
          if (filteredLogs.isEmpty)
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: cardBorder),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.event_busy_rounded, size: 40, color: muted),
                    SizedBox(height: 8),
                    Text(
                      'No matching attendance records',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: navy),
                    ),
                  ],
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 40),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _buildDailyLogCard(filteredLogs[index]),
                  childCount: filteredLogs.length,
                ),
              ),
            ),
        ],
      ),
    );
  }

  // --- 1. Personnel Profile Header ---
  Widget _buildPersonnelHeaderCard() {
    final shiftTiming = _getShiftTiming(widget.assignedShift);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(5),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [purple, navy],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    widget.staffName.isNotEmpty ? widget.staffName[0].toUpperCase() : 'S',
                    style: const TextStyle(
                      color: white,
                      fontSize: 18,
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
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Text(
                            widget.staffName,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: navy,
                              letterSpacing: -0.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: emeraldBg,
                            borderRadius: BorderRadius.circular(5),
                            border: Border.all(color: emerald.withAlpha(60)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.verified_user_rounded, size: 10, color: emerald),
                              SizedBox(width: 3),
                              Text(
                                'ROSTER ACTIVE',
                                style: TextStyle(
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w800,
                                  color: emerald,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: purpleBg,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            widget.role.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 8.5,
                              fontWeight: FontWeight.w800,
                              color: purple,
                            ),
                          ),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          widget.employeeId,
                          style: const TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(width: 5),
                        Flexible(
                          child: Text(
                            widget.department,
                            style: const TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Assigned Shift Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6.5),
            decoration: BoxDecoration(
              color: background,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: cardBorder),
            ),
            child: Row(
              children: [
                const Icon(Icons.schedule_rounded, size: 14, color: purple),
                const SizedBox(width: 6),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: '${widget.assignedShift}: ',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: navy,
                          ),
                        ),
                        TextSpan(
                          text: shiftTiming,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF475569),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: cream,
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: gold.withAlpha(120)),
                  ),
                  child: Text(
                    widget.propertyId.isNotEmpty ? widget.propertyId : 'HS-JAI',
                    style: const TextStyle(
                      fontSize: 8.5,
                      fontWeight: FontWeight.w800,
                      color: navy,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- 2. Filter Chips ---
  Widget _buildFilterChips({
    required int total,
    required int present,
    required int leave,
    required int absent,
  }) {
    final filters = [
      {'label': 'All', 'count': total},
      {'label': 'Present', 'count': present},
      {'label': 'On Leave', 'count': leave},
      {'label': 'Absent', 'count': absent},
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: filters.map((f) {
          final label = f['label'] as String;
          final count = f['count'] as int;
          final isSelected = _filterStatus == label;

          Color c = purple;
          if (label == 'Present') c = emerald;
          if (label == 'On Leave') c = amber;
          if (label == 'Absent') c = ruby;

          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: InkWell(
              onTap: () => setState(() => _filterStatus = label),
              borderRadius: BorderRadius.circular(16),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4.5),
                decoration: BoxDecoration(
                  color: isSelected ? c : white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected ? c : cardBorder,
                  ),
                ),
                child: Text(
                  '$label ($count)',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                    color: isSelected ? white : navy,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // --- 4. Daily Attendance Log Card ---
  Widget _buildDailyLogCard(_DailyAttendanceLog log) {
    Color statusColor;
    Color statusBg;
    final st = log.status.toLowerCase();

    if (st == 'present') {
      statusColor = emerald;
      statusBg = emeraldBg;
    } else if (st == 'absent') {
      statusColor = ruby;
      statusBg = rubyBg;
    } else if (st.contains('leave')) {
      statusColor = amber;
      statusBg = amberBg;
    } else {
      statusColor = const Color(0xFF64748B);
      statusBg = const Color(0xFFF1F5F9);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 9),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: statusColor.withAlpha(40),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(4),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(11),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Date Header + Status Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: statusBg,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Icon(Icons.event_available_rounded, size: 12, color: statusColor),
                    ),
                    const SizedBox(width: 6),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          log.formattedDate,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: navy,
                          ),
                        ),
                        Text(
                          '${log.dayOfWeek} • ${log.shiftName}',
                          style: const TextStyle(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(5),
                    border: Border.all(color: statusColor.withAlpha(60)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 4,
                        height: 4,
                        decoration: BoxDecoration(
                          color: statusColor,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 3),
                      Text(
                        log.status.toUpperCase(),
                        style: TextStyle(
                          fontSize: 8.5,
                          fontWeight: FontWeight.w800,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Check-In, Check-Out & Working Hours
            Row(
              children: [
                Expanded(
                  child: _buildTimeBox(
                    label: 'Check In',
                    time: log.checkIn,
                    icon: Icons.login_rounded,
                    color: emerald,
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: _buildTimeBox(
                    label: 'Check Out',
                    time: log.checkOut,
                    icon: Icons.logout_rounded,
                    color: ruby,
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: _buildTimeBox(
                    label: 'Working Hrs',
                    time: log.workingHours > 0
                        ? '${log.workingHours.toStringAsFixed(1)} hrs'
                        : '—',
                    icon: Icons.timelapse_rounded,
                    color: purple,
                  ),
                ),
              ],
            ),

            if (st == 'present') ...[
              const SizedBox(height: 6),
              // Biometric Turnstile Terminal Tag
              Row(
                children: [
                  const Icon(Icons.fingerprint_rounded, size: 11, color: purple),
                  const SizedBox(width: 3),
                  Text(
                    log.deviceLocation,
                    style: const TextStyle(
                      fontSize: 8.5,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTimeBox({
    required String label,
    required String time,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 9.5, color: color),
              const SizedBox(width: 3),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 8,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF64748B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            time,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: time == '—:—' ? muted : navy,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
