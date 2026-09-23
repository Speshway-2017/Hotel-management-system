class StaffModel {
  final String id;
  final String name;
  final String email;
  final String mobile;
  final String role;
  final String dept;
  final String shift;
  final String status;
  final String propertyId;

  StaffModel({
    required this.id,
    required this.name,
    required this.email,
    this.mobile = '',
    this.role = 'receptionist',
    this.dept = 'Front Desk',
    this.shift = 'Morning Shift',
    this.status = 'Active',
    this.propertyId = 'HS-9HQ8P',
  });

  String get department => dept;
  String get phone => mobile;

  factory StaffModel.fromJson(Map<String, dynamic> json) {
    return StaffModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      mobile: json['mobile'] ?? json['phone'] ?? '',
      role: json['role'] ?? 'receptionist',
      dept: json['dept'] ?? json['department'] ?? 'Front Desk',
      shift: json['shift'] ?? 'Morning Shift',
      status: json['status'] ?? 'Active',
      propertyId: json['propertyId']?.toString() ?? 'HS-9HQ8P',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'email': email,
      'mobile': mobile,
      'role': role,
      'dept': dept,
      'shift': shift,
      'status': status,
      'propertyId': propertyId,
    };
  }
}

class ShiftModel {
  final String id;
  final String userId;
  final String username;
  final String shiftType;
  final String propertyId;

  ShiftModel({
    required this.id,
    required this.userId,
    required this.username,
    required this.shiftType,
    required this.propertyId,
  });

  factory ShiftModel.fromJson(Map<String, dynamic> json) {
    return ShiftModel(
      id: json['id'] ?? json['_id'] ?? '',
      userId: json['userId'] ?? '',
      username: json['username'] ?? '',
      shiftType: json['shiftType'] ?? 'Morning',
      propertyId: json['propertyId']?.toString() ?? 'HS-9HQ8P',
    );
  }
}

class AttendanceModel {
  final String id;
  final String userId;
  final String username;
  final String date;
  final String checkIn;
  final String checkOut;
  final int workingHours;
  final String status;
  final String propertyId;

  AttendanceModel({
    required this.id,
    required this.userId,
    required this.username,
    required this.date,
    this.checkIn = '--',
    this.checkOut = '--',
    this.workingHours = 8,
    this.status = 'Present',
    this.propertyId = 'HS-9HQ8P',
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['id'] ?? json['_id'] ?? '',
      userId: json['userId'] ?? '',
      username: json['username'] ?? '',
      date: json['date'] ?? '',
      checkIn: json['checkIn'] ?? '--',
      checkOut: json['checkOut'] ?? '--',
      workingHours: int.tryParse(json['workingHours']?.toString() ?? '8') ?? 8,
      status: json['status'] ?? 'Present',
      propertyId: json['propertyId']?.toString() ?? 'HS-9HQ8P',
    );
  }
}
