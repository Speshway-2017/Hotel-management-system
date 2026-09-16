import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../models/staff_model.dart';
import '../../../providers/manager/staff_provider.dart';
import 'manager_add_staff_screen.dart';
import 'manager_staff_detail_screen.dart';
import 'manager_staff_attendance_detail_screen.dart';


class ManagerStaffScreen extends StatefulWidget {
  final int initialTab;
  const ManagerStaffScreen({super.key, int initialTab = 0, int? initialIndex})
      : initialTab = initialIndex ?? initialTab;

  @override
  State<ManagerStaffScreen> createState() => _ManagerStaffScreenState();
}

class _AttendanceRosterItem {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String role;
  final String department;
  final String propertyId;
  final String employeeId;
  final String assignedShift;
  final String checkIn;
  final String checkOut;
  final double workingHours;
  final String attendanceStatus;
  final String date;
  final StaffModel? staff;

  _AttendanceRosterItem({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    required this.department,
    required this.propertyId,
    required this.employeeId,
    required this.assignedShift,
    required this.checkIn,
    required this.checkOut,
    required this.workingHours,
    required this.attendanceStatus,
    required this.date,
    this.staff,
  });
}

class _ManagerStaffScreenState extends State<ManagerStaffScreen> {
  late int _currentTabIndex;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _staffStatusFilter = 'All';

  // Hour Stay Theme Palette
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

  @override
  void initState() {
    super.initState();
    _currentTabIndex = widget.initialTab;
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    await context.read<StaffProvider>().fetchAll();
  }

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

  bool _isTimeConsistentWithShift(String timeStr, String shiftName) {
    final lower = shiftName.toLowerCase();
    final timeLower = timeStr.toLowerCase();
    if (lower.contains('general')) {
      return timeLower.contains('09:') || timeLower.contains('9:') || timeLower.contains('06:') || timeLower.contains('6:');
    }
    if (lower.contains('morning')) {
      return timeLower.contains('06:') || timeLower.contains('6:') || timeLower.contains('02:') || timeLower.contains('2:');
    }
    if (lower.contains('afternoon') || lower.contains('evening')) {
      return timeLower.contains('02:') || timeLower.contains('2:') || timeLower.contains('10:');
    }
    if (lower.contains('night')) {
      return timeLower.contains('10:') || timeLower.contains('06:') || timeLower.contains('6:');
    }
    return true;
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

  @override
  Widget build(BuildContext context) {
    final staffProvider = context.watch<StaffProvider>();
    final staffList = staffProvider.staffList;
    final attendance = staffProvider.attendance;
    final shifts = staffProvider.shifts;

    final shiftMap = {for (var sh in shifts) sh.userId: sh};

    // --- Build Web-Synchronized Attendance Roster ---
    final List<_AttendanceRosterItem> attendanceSheet = [];
    final Set<String> processedUserIds = {};

    // 1. Map all staff members to attendance records (matching web implementation 1:1)
    for (int idx = 0; idx < staffList.length; idx++) {
      final s = staffList[idx];
      processedUserIds.add(s.id);
      if (s.name.isNotEmpty) {
        processedUserIds.add(s.name.toLowerCase());
      }

      final prop = s.propertyId.isNotEmpty ? s.propertyId.replaceAll('HS-', '') : 'JAI';
      final employeeId = 'EMP-$prop-10${idx + 1}';
      final dept = s.dept.isNotEmpty
          ? s.dept
          : (s.department.isNotEmpty ? s.department : 'Front Office');
      final matchedShift = s.shift.isNotEmpty
          ? s.shift
          : (shiftMap[s.id]?.shiftType ?? 'General Shift');

      // Find matching attendance record in DB
      AttendanceModel? attRecord;
      for (final a in attendance) {
        if (a.userId == s.id ||
            (a.username.isNotEmpty && a.username.toLowerCase() == s.name.toLowerCase())) {
          attRecord = a;
          break;
        }
      }

      final isStaffActive = s.status.toLowerCase() == 'active';
      final isStaffLeave = s.status.toLowerCase().contains('leave');

      String attStatus;
      if (attRecord != null && attRecord.status.isNotEmpty) {
        attStatus = attRecord.status;
      } else if (isStaffActive) {
        attStatus = 'Present';
      } else if (isStaffLeave) {
        attStatus = 'On Leave';
      } else {
        attStatus = 'Absent';
      }

      String checkInTime;
      String checkOutTime;
      double workingHours;

      if (attStatus == 'Present') {
        final shiftStart = _getDefaultCheckIn(matchedShift);
        final shiftEnd = _getDefaultCheckOut(matchedShift);

        // Verify if attRecord punch time matches the shift type; otherwise use shift standard
        if (attRecord != null && attRecord.checkIn.isNotEmpty && attRecord.checkIn != '--:--' && attRecord.checkIn != '--') {
          final formattedIn = _formatTime(attRecord.checkIn);
          checkInTime = _isTimeConsistentWithShift(formattedIn, matchedShift) ? formattedIn : shiftStart;
        } else {
          checkInTime = shiftStart;
        }

        if (attRecord != null && attRecord.checkOut.isNotEmpty && attRecord.checkOut != '--:--' && attRecord.checkOut != '--') {
          final formattedOut = _formatTime(attRecord.checkOut);
          checkOutTime = _isTimeConsistentWithShift(formattedOut, matchedShift) ? formattedOut : shiftEnd;
        } else {
          checkOutTime = shiftEnd;
        }

        workingHours = (attRecord != null && attRecord.workingHours > 0)
            ? attRecord.workingHours.toDouble()
            : _getDefaultWorkingHours(matchedShift);
      } else {
        checkInTime = '—:—';
        checkOutTime = '—:—';
        workingHours = 0.0;
      }

      final dateStr = attRecord != null && attRecord.date.isNotEmpty ? attRecord.date : 'Today';

      attendanceSheet.add(_AttendanceRosterItem(
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        role: s.role.isNotEmpty ? s.role : 'Staff Member',
        department: dept,
        propertyId: s.propertyId,
        employeeId: employeeId,
        assignedShift: matchedShift,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        workingHours: workingHours,
        attendanceStatus: attStatus,
        date: dateStr,
        staff: s,
      ));
    }

    // 2. Include any standalone attendance records in DB not in staffList
    for (final a in attendance) {
      if (!processedUserIds.contains(a.userId) &&
          !processedUserIds.contains(a.username.toLowerCase())) {
        final assignedShift = 'General Shift';
        attendanceSheet.add(_AttendanceRosterItem(
          id: a.userId,
          name: a.username.isNotEmpty ? a.username : 'Staff Member',
          email: '',
          phone: '',
          role: 'Staff Member',
          department: 'Front Office',
          propertyId: a.propertyId,
          employeeId: 'EMP-${a.propertyId.replaceAll('HS-', '')}-100',
          assignedShift: assignedShift,
          checkIn: a.checkIn.isNotEmpty ? _formatTime(a.checkIn) : '09:00 AM',
          checkOut: a.checkOut.isNotEmpty ? _formatTime(a.checkOut) : '06:00 PM',
          workingHours: a.workingHours > 0 ? a.workingHours.toDouble() : 9.0,
          attendanceStatus: a.status.isNotEmpty ? a.status : 'Present',
          date: a.date.isNotEmpty ? a.date : 'Today',
        ));
      }
    }

    // --- Unified Top KPI Metrics ---
    final totalCount = staffList.isNotEmpty ? staffList.length : attendanceSheet.length;
    final activeCount = staffList.where((s) => s.status.toLowerCase() == 'active').length;
    final leaveCount = staffList.where((s) {
      final st = s.status.toLowerCase();
      return st.contains('leave') || st == 'inactive';
    }).length;
    final attendanceCount = attendanceSheet
        .where((a) => a.attendanceStatus.toLowerCase() == 'present')
        .length;

    // --- Filter Staff Directory (Tab 0) ---
    final filteredStaff = staffList.where((s) {
      final q = _searchQuery.trim().toLowerCase();
      final matchesSearch = q.isEmpty ||
          s.name.toLowerCase().contains(q) ||
          s.email.toLowerCase().contains(q) ||
          s.role.toLowerCase().contains(q) ||
          s.phone.contains(q) ||
          s.department.toLowerCase().contains(q) ||
          s.shift.toLowerCase().contains(q) ||
          s.propertyId.toLowerCase().contains(q);

      final statusStr = s.status.toLowerCase();
      bool matchesStatus = true;
      if (_staffStatusFilter == 'Active') {
        matchesStatus = statusStr == 'active';
      } else if (_staffStatusFilter == 'Leave') {
        matchesStatus = statusStr.contains('leave') || statusStr == 'inactive';
      } else if (_staffStatusFilter == 'Attendance') {
        final hasAtt = attendanceSheet.any((a) =>
            a.attendanceStatus.toLowerCase() == 'present' &&
            (a.id == s.id || a.name.toLowerCase() == s.name.toLowerCase()));
        matchesStatus = hasAtt;
      }

      return matchesSearch && matchesStatus;
    }).toList();

    // --- Filter Attendance Roster from DB (Tab 1) ---
    final filteredAttendance = attendanceSheet.where((item) {
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.trim().toLowerCase();
        final matches = item.name.toLowerCase().contains(q) ||
            item.employeeId.toLowerCase().contains(q) ||
            item.email.toLowerCase().contains(q) ||
            item.role.toLowerCase().contains(q) ||
            item.department.toLowerCase().contains(q) ||
            item.assignedShift.toLowerCase().contains(q) ||
            item.attendanceStatus.toLowerCase().contains(q) ||
            item.date.toLowerCase().contains(q);

        if (!matches) return false;
      }

      return true;
    }).toList();

    final isLoading = staffProvider.isLoading && staffList.isEmpty && attendance.isEmpty;
    final hasError = staffProvider.errorMessage != null && staffList.isEmpty && attendance.isEmpty;

    return Scaffold(
      backgroundColor: background,
      appBar: _buildAppBar(context),
      floatingActionButton: _currentTabIndex == 0
          ? Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: navy.withAlpha(80),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: FloatingActionButton.extended(
                backgroundColor: navy,
                foregroundColor: white,
                elevation: 0,
                highlightElevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: const BorderSide(color: Color(0xFFF5C06A), width: 1.5),
                ),
                icon: const Icon(Icons.add_circle_rounded, size: 20, color: gold),
                label: const Row(
                  children: [
                    Text(
                      'Add Staff',
                      style: TextStyle(
                        color: white,
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                      ),
                    ),
                    SizedBox(width: 4),
                    Icon(Icons.arrow_forward_ios_rounded, size: 11, color: gold),
                  ],
                ),
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ManagerAddStaffScreen()),
                  );
                },
              ),
            )
          : null, // View-only on attendance tab (no log attendance button)
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: _loadData,
        child: isLoading
            ? const Center(child: CircularProgressIndicator(color: purple))
            : hasError
                ? _buildErrorView(staffProvider.errorMessage!)
                : CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: [

                      // 2. Exact same Search Bar design as all screens
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(14, 10, 14, 6),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSearchBar(),
                              const SizedBox(height: 10),
                              _buildSegmentedTabBar(
                                staffCount: staffList.length,
                                attendanceCount: attendanceSheet.length,
                              ),
                            ],
                          ),
                        ),
                      ),

                      // --- TAB 0: Staff & Shifts ---
                      if (_currentTabIndex == 0) ...[
                        // Status Filter Chips
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(14, 2, 14, 8),
                            child: _buildStaffStatusFilterChips(
                              totalCount: totalCount,
                              activeCount: activeCount,
                              leaveCount: leaveCount,
                              attendanceCount: attendanceCount,
                            ),
                          ),
                        ),

                        // Directory Count Header
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(16, 2, 16, 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Staff Directory (${filteredStaff.length})',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: navy,
                                    letterSpacing: -0.2,
                                  ),
                                ),
                                if (_searchQuery.isNotEmpty || _staffStatusFilter != 'All')
                                  InkWell(
                                    onTap: () {
                                      setState(() {
                                        _searchQuery = '';
                                        _staffStatusFilter = 'All';
                                        _searchController.clear();
                                      });
                                    },
                                    child: const Text(
                                      'Reset Filters',
                                      style: TextStyle(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w700,
                                        color: purple,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),

                        // Staff Directory Cards List
                        if (filteredStaff.isEmpty)
                          SliverToBoxAdapter(
                            child: _buildEmptyStaffState(),
                          )
                        else
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(14, 0, 14, 80),
                            sliver: SliverList(
                              delegate: SliverChildBuilderDelegate(
                                (context, index) => _buildStaffCard(filteredStaff[index]),
                                childCount: filteredStaff.length,
                              ),
                            ),
                          ),
                      ]

                      // --- TAB 1: Attendance ---
                      else ...[
                        // Attendance Header Count (No filter chips)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Attendance Records (${filteredAttendance.length})',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: navy,
                                    letterSpacing: -0.2,
                                  ),
                                ),
                                if (_searchQuery.isNotEmpty)
                                  InkWell(
                                    onTap: () {
                                      setState(() {
                                        _searchQuery = '';
                                        _searchController.clear();
                                      });
                                    },
                                    child: const Text(
                                      'Reset Search',
                                      style: TextStyle(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w700,
                                        color: purple,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),

                        // Attendance Items List from DB
                        if (filteredAttendance.isEmpty)
                          SliverToBoxAdapter(
                            child: _buildEmptyAttendanceState(),
                          )
                        else
                          SliverPadding(
                            padding: const EdgeInsets.fromLTRB(14, 0, 14, 80),
                            sliver: SliverList(
                              delegate: SliverChildBuilderDelegate(
                                (context, index) => _buildAttendanceRosterCard(filteredAttendance[index]),
                                childCount: filteredAttendance.length,
                              ),
                            ),
                          ),
                      ],
                    ],
                  ),
      ),
    );
  }

  // --- AppBar ---
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
        'Staff & Workforce',
        style: TextStyle(
          color: white,
          fontWeight: FontWeight.w800,
          fontSize: 16,
          letterSpacing: -0.2,
        ),
      ),
    );
  }

  // --- Segmented Navigation Tabs (Below Search Bar) ---
  Widget _buildSegmentedTabBar({required int staffCount, required int attendanceCount}) {
    return Container(
      height: 38,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: cardBorder),
      ),
      child: Row(
        children: [
          // Tab 0: Staff & Shifts
          Expanded(
            child: InkWell(
              onTap: () {
                if (_currentTabIndex != 0) {
                  setState(() {
                    _currentTabIndex = 0;
                    _searchQuery = '';
                    _searchController.clear();
                  });
                }
              },
              borderRadius: BorderRadius.circular(8),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                decoration: BoxDecoration(
                  color: _currentTabIndex == 0 ? white : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _currentTabIndex == 0
                      ? [
                          BoxShadow(
                            color: Colors.black.withAlpha(12),
                            blurRadius: 3,
                            offset: const Offset(0, 1),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.people_alt_rounded,
                        size: 14,
                        color: _currentTabIndex == 0 ? purple : const Color(0xFF64748B),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        'Staff & Shifts ($staffCount)',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: _currentTabIndex == 0
                              ? FontWeight.w800
                              : FontWeight.w600,
                          color: _currentTabIndex == 0
                              ? navy
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Tab 1: Attendance
          Expanded(
            child: InkWell(
              onTap: () {
                if (_currentTabIndex != 1) {
                  setState(() {
                    _currentTabIndex = 1;
                    _searchQuery = '';
                    _searchController.clear();
                  });
                }
              },
              borderRadius: BorderRadius.circular(8),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                decoration: BoxDecoration(
                  color: _currentTabIndex == 1 ? white : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _currentTabIndex == 1
                      ? [
                          BoxShadow(
                            color: Colors.black.withAlpha(12),
                            blurRadius: 3,
                            offset: const Offset(0, 1),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.how_to_reg_rounded,
                        size: 14,
                        color: _currentTabIndex == 1 ? emerald : const Color(0xFF64748B),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        'Attendance ($attendanceCount)',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: _currentTabIndex == 1
                              ? FontWeight.w800
                              : FontWeight.w600,
                          color: _currentTabIndex == 1
                              ? navy
                              : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- Exact same Search Bar design as all screens ---
  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(4),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (val) => setState(() => _searchQuery = val),
        style: const TextStyle(fontSize: 13, color: navy),
        decoration: InputDecoration(
          hintText: _currentTabIndex == 0
              ? "Search staff by name, role, dept, shift, phone..."
              : "Search attendance by staff name, employee ID, role, shift...",
          hintStyle: TextStyle(fontSize: 12, color: muted.withAlpha(180)),
          prefixIcon: const Icon(Icons.search_rounded, color: muted, size: 18),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear_rounded, size: 16, color: muted),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          border: InputBorder.none,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
      ),
    );
  }

  // --- Staff Status Filter Chips ---
  Widget _buildStaffStatusFilterChips({
    required int totalCount,
    required int activeCount,
    required int leaveCount,
    required int attendanceCount,
  }) {
    final filters = [
      {'key': 'All', 'label': 'All Staff', 'count': totalCount, 'dot': null},
      {'key': 'Active', 'label': 'Active', 'count': activeCount, 'dot': emerald},
      {'key': 'Leave', 'label': 'On Leave', 'count': leaveCount, 'dot': amber},
      {'key': 'Attendance', 'label': 'Present Today', 'count': attendanceCount, 'dot': purple},
    ];

    return SizedBox(
      height: 42,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        clipBehavior: Clip.hardEdge,
        padding: EdgeInsets.zero,
        itemCount: filters.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final item = filters[index];
          final key = item['key'] as String;
          final label = item['label'] as String;
          final count = item['count'] as int;
          final dotColor = item['dot'] as Color?;
          final isSelected = _staffStatusFilter == key;

          return InkWell(
            onTap: () => setState(() => _staffStatusFilter = key),
            borderRadius: BorderRadius.circular(20),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
              decoration: BoxDecoration(
                color: isSelected ? navy : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isSelected ? navy : cardBorder,
                  width: 1.2,
                ),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: navy.withAlpha(35),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ]
                    : null,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (dotColor != null) ...[
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
                    ),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                      color: isSelected ? cream : navy,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6.5, vertical: 2),
                    decoration: BoxDecoration(
                      color: isSelected ? gold : const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$count',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: isSelected ? navy : const Color(0xFF64748B),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // --- Staff Directory Card (Tab 0) ---
  Widget _buildStaffCard(StaffModel staff) {
    Color statusColor;
    Color statusBg;
    final st = staff.status.toLowerCase();
    if (st == 'active') {
      statusColor = emerald;
      statusBg = emeraldBg;
    } else if (st.contains('leave')) {
      statusColor = amber;
      statusBg = amberBg;
    } else {
      statusColor = ruby;
      statusBg = rubyBg;
    }

    final shiftTiming = _getShiftTiming(staff.shift);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(4),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ManagerStaffDetailScreen(staff: staff),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(11),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: Avatar + Name + Status
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [purple, navy],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Text(
                        staff.name.isNotEmpty ? staff.name[0].toUpperCase() : 'S',
                        style: const TextStyle(
                          color: white,
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Text(
                                staff.name,
                                style: const TextStyle(
                                  fontSize: 13.5,
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
                                color: statusBg,
                                borderRadius: BorderRadius.circular(5),
                                border: Border.all(color: statusColor.withAlpha(60)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 4.5,
                                    height: 4.5,
                                    decoration: BoxDecoration(
                                      color: statusColor,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 3.5),
                                  Text(
                                    staff.status.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      color: statusColor,
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
                                staff.role.isNotEmpty ? staff.role.toUpperCase() : 'STAFF',
                                style: const TextStyle(
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w800,
                                  color: purple,
                                ),
                              ),
                            ),
                            if (staff.dept.isNotEmpty) ...[
                              const SizedBox(width: 5),
                              Flexible(
                                child: Text(
                                  staff.dept,
                                  style: const TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF475569),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Shift and Timing Banner
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                decoration: BoxDecoration(
                  color: background,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: cardBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.schedule_rounded, size: 13, color: purple),
                    const SizedBox(width: 5),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: '${staff.shift.isNotEmpty ? staff.shift : 'General Shift'}: ',
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                                color: navy,
                              ),
                            ),
                            TextSpan(
                              text: shiftTiming,
                              style: const TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF475569),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (staff.propertyId.isNotEmpty && staff.propertyId != 'all')
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: cream,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: gold.withAlpha(100)),
                        ),
                        child: Text(
                          staff.propertyId,
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
              const SizedBox(height: 6),

              // Footer: Contact Details & Tap Hint
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      if (staff.phone.isNotEmpty) ...[
                        const Icon(Icons.phone_outlined, size: 11, color: muted),
                        const SizedBox(width: 3),
                        Text(
                          staff.phone,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                      if (staff.email.isNotEmpty) ...[
                        const Icon(Icons.mail_outline_rounded, size: 11, color: muted),
                        const SizedBox(width: 3),
                        Text(
                          staff.email,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const Row(
                    children: [
                      Text(
                        'Details',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: purple,
                        ),
                      ),
                      Icon(Icons.chevron_right_rounded, size: 13, color: purple),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --- Attendance Roster Card (Web-Synchronized) ---
  Widget _buildAttendanceRosterCard(_AttendanceRosterItem item) {
    final shiftTiming = _getShiftTiming(item.assignedShift);
    final dateDisplay = _formatDateString(item.date);

    Color statusColor;
    Color statusBg;
    final st = item.attendanceStatus.toLowerCase();
    if (st == 'present') {
      statusColor = emerald;
      statusBg = emeraldBg;
    } else if (st == 'absent') {
      statusColor = ruby;
      statusBg = rubyBg;
    } else {
      statusColor = amber;
      statusBg = amberBg;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: statusColor.withAlpha(40),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(4),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ManagerStaffAttendanceDetailScreen(
                staffId: item.id,
                staffName: item.name,
                email: item.email,
                phone: item.phone,
                role: item.role,
                department: item.department,
                propertyId: item.propertyId,
                employeeId: item.employeeId,
                assignedShift: item.assignedShift,
                currentStatus: item.attendanceStatus,
                staff: item.staff,
              ),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(11),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: Avatar + Name + Employee ID + Status Badge
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [statusColor, navy],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Text(
                        item.name.isNotEmpty ? item.name[0].toUpperCase() : 'A',
                        style: const TextStyle(
                          color: white,
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Text(
                                item.name,
                                style: const TextStyle(
                                  fontSize: 13.5,
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
                                color: statusBg,
                                borderRadius: BorderRadius.circular(5),
                                border: Border.all(color: statusColor.withAlpha(60)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 4.5,
                                    height: 4.5,
                                    decoration: BoxDecoration(
                                      color: statusColor,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 3.5),
                                  Text(
                                    item.attendanceStatus.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 9,
                                      fontWeight: FontWeight.w800,
                                      color: statusColor,
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
                                item.role.toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w800,
                                  color: purple,
                                ),
                              ),
                            ),
                            const SizedBox(width: 5),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: background,
                                borderRadius: BorderRadius.circular(3),
                                border: Border.all(color: cardBorder),
                              ),
                              child: Text(
                                item.employeeId,
                                style: const TextStyle(
                                  fontSize: 8.5,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ),
                            const SizedBox(width: 5),
                            Flexible(
                              child: Text(
                                item.department,
                                style: const TextStyle(
                                  fontSize: 9,
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
              const SizedBox(height: 8),

              // Date & Assigned Shift Row
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5.5),
                decoration: BoxDecoration(
                  color: background,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: cardBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.event_note_rounded, size: 12, color: navy),
                    const SizedBox(width: 4),
                    Text(
                      dateDisplay,
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: navy,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.schedule_rounded, size: 12, color: purple),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        '${item.assignedShift} ($shiftTiming)',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF475569),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 7),

              // Check-in, Check-out & Hours Details
              Row(
                children: [
                  Expanded(
                    child: _buildTimeDetailBox(
                      label: 'Check In',
                      time: item.checkIn,
                      icon: Icons.login_rounded,
                      color: emerald,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: _buildTimeDetailBox(
                      label: 'Check Out',
                      time: item.checkOut,
                      icon: Icons.logout_rounded,
                      color: ruby,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: _buildTimeDetailBox(
                      label: 'Working Hrs',
                      time: item.workingHours > 0
                          ? '${item.workingHours.toStringAsFixed(1)} hrs'
                          : '—',
                      icon: Icons.timelapse_rounded,
                      color: purple,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTimeDetailBox({
    required String label,
    required String time,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 5),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withAlpha(40)),
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
                style: const TextStyle(
                  fontSize: 8.5,
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
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              color: color == ruby && (time == '—:—' || time == '—') ? muted : navy,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  // --- Empty States ---
  Widget _buildEmptyStaffState() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        children: [
          const Icon(Icons.people_outline_rounded, size: 44, color: muted),
          const SizedBox(height: 10),
          const Text(
            'No Staff Found',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: navy,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Try adjusting your search criteria or add new staff personnel.',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyAttendanceState() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        children: [
          const Icon(Icons.how_to_reg_outlined, size: 44, color: muted),
          const SizedBox(height: 10),
          const Text(
            'No Attendance Records',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: navy,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'No attendance records found for this property.',
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView(String msg) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline_rounded, size: 44, color: ruby),
            const SizedBox(height: 10),
            Text(
              msg,
              style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 14),
            ElevatedButton.icon(
              onPressed: _loadData,
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
