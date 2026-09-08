class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String mobile;
  final String status;
  final String? propertyId;
  final String? avatar;
  final String dept;
  final String shift;
  final String city;
  final String address;
  final String language;
  final String currency;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.mobile = '',
    this.status = 'Active',
    this.propertyId,
    this.avatar,
    this.dept = 'Management',
    this.shift = 'Morning (06:00 - 14:00)',
    this.city = 'Hyderabad',
    this.address = '',
    this.language = 'English (IN)',
    this.currency = 'INR (₹)',
  });

  bool get isManagerRole =>
      role == 'manager' || role == 'admin' || role == 'super-admin' || role == 'receptionist';

  bool get isGuestRole => role == 'guest';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? 'User',
      email: json['email'] ?? '',
      role: (json['role'] ?? 'guest').toString().toLowerCase(),
      mobile: json['mobile'] ?? json['phone'] ?? '',
      status: json['status'] ?? 'Active',
      propertyId: json['propertyId']?.toString(),
      avatar: json['avatar'],
      dept: json['dept'] ?? 'Management',
      shift: json['shift'] ?? 'Morning (06:00 - 14:00)',
      city: json['city'] ?? 'Hyderabad',
      address: json['address'] ?? '',
      language: json['language'] ?? 'English (IN)',
      currency: json['currency'] ?? 'INR (₹)',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'mobile': mobile,
      'status': status,
      'propertyId': propertyId,
      'avatar': avatar,
      'dept': dept,
      'shift': shift,
      'city': city,
      'address': address,
      'language': language,
      'currency': currency,
    };
  }
}
