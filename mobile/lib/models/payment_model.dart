class PaymentModel {
  final String id;
  final String bookingId;
  final String guestName;
  final String roomNumber;
  final double amount;
  final String paymentMethod;
  final String status;
  final String propertyId;
  final String createdAt;

  // Compatibility getters
  String get method => paymentMethod;
  String get reservationId => bookingId;
  bool get isCompleted =>
      status.toLowerCase() == 'settled' ||
      status.toLowerCase() == 'paid' ||
      status.toLowerCase() == 'completed';

  PaymentModel({
    required this.id,
    required this.bookingId,
    required this.guestName,
    this.roomNumber = '101',
    required this.amount,
    this.paymentMethod = 'UPI',
    this.status = 'Settled',
    this.propertyId = 'HS-9HQ8P',
    this.createdAt = '',
  });

  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(
      id: json['id'] ?? json['_id'] ?? '',
      bookingId: json['bookingId'] ?? json['reservationId'] ?? '',
      guestName: json['guestName'] ?? json['guest'] ?? 'Guest',
      roomNumber: json['roomNumber']?.toString() ?? '101',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      paymentMethod: json['paymentMethod'] ?? json['method'] ?? 'UPI',
      status: json['status'] ?? 'Settled',
      propertyId: json['propertyId']?.toString() ?? 'HS-9HQ8P',
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }

  PaymentModel copyWith({
    String? id,
    String? bookingId,
    String? guestName,
    String? roomNumber,
    double? amount,
    String? paymentMethod,
    String? status,
    String? propertyId,
    String? createdAt,
  }) {
    return PaymentModel(
      id: id ?? this.id,
      bookingId: bookingId ?? this.bookingId,
      guestName: guestName ?? this.guestName,
      roomNumber: roomNumber ?? this.roomNumber,
      amount: amount ?? this.amount,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      status: status ?? this.status,
      propertyId: propertyId ?? this.propertyId,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'bookingId': bookingId,
      'guestName': guestName,
      'roomNumber': roomNumber,
      'amount': amount,
      'paymentMethod': paymentMethod,
      'status': status,
      'propertyId': propertyId,
    };
  }
}
