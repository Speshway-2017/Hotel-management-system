class GuestModel {
  final String id;
  final String name;
  final String phone;
  final String email;
  final String room;
  final String checkIn;
  final String checkOut;
  final String status;
  final String paymentStatus;
  final String bookingId;

  GuestModel({
    required this.id,
    required this.name,
    this.phone = '--',
    this.email = '',
    this.room = '--',
    this.checkIn = '',
    this.checkOut = '',
    this.status = 'Confirmed',
    this.paymentStatus = 'Pending',
    required this.bookingId,
  });

  factory GuestModel.fromJson(Map<String, dynamic> json) {
    return GuestModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      name: json['name'] ?? json['guest'] ?? 'Guest',
      phone: json['phone'] ?? json['mobile'] ?? '--',
      email: json['email'] ?? '',
      room: json['room'] ?? '--',
      checkIn: json['checkIn'] ?? '',
      checkOut: json['checkOut'] ?? '',
      status: json['status'] ?? 'Confirmed',
      paymentStatus: json['paymentStatus'] ?? 'Pending',
      bookingId: json['bookingId']?.toString() ?? json['id']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'room': room,
      'checkIn': checkIn,
      'checkOut': checkOut,
      'status': status,
      'paymentStatus': paymentStatus,
      'bookingId': bookingId,
    };
  }
}
