class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String mobile;
  final String status;
  final String? propertyId;
  final String? propertyName;
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
    this.propertyName,
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

  UserModel copyWith({
    String? id,
    String? name,
    String? email,
    String? role,
    String? mobile,
    String? status,
    String? propertyId,
    String? propertyName,
    String? avatar,
    String? dept,
    String? shift,
    String? city,
    String? address,
    String? language,
    String? currency,
  }) {
    return UserModel(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      mobile: mobile ?? this.mobile,
      status: status ?? this.status,
      propertyId: propertyId ?? this.propertyId,
      propertyName: propertyName ?? this.propertyName,
      avatar: avatar ?? this.avatar,
      dept: dept ?? this.dept,
      shift: shift ?? this.shift,
      city: city ?? this.city,
      address: address ?? this.address,
      language: language ?? this.language,
      currency: currency ?? this.currency,
    );
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? 'User',
      email: json['email'] ?? '',
      role: (json['role'] ?? 'guest').toString().toLowerCase(),
      mobile: json['mobile'] ?? json['phone'] ?? '',
      status: json['status'] ?? 'Active',
      propertyId: json['propertyId']?.toString(),
      propertyName: json['propertyName']?.toString() ??
          (json['property'] is Map ? json['property']['name']?.toString() : null) ??
          json['property_name']?.toString(),
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
      'propertyName': propertyName,
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
