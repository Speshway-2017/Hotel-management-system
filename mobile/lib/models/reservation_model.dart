class ReservationModel {
  final String id;
  final String bookingId;
  final String guest;
  final String email;
  final String phone;
  final String room;
  final String roomNumber;
  final String roomType;
  final String checkIn;
  final String checkOut;
  final int nights;
  final String stayType;
  final int? hours;
  final double amount;
  final double balance;
  final String status;
  final String paymentStatus;
  final String paymentMethod;
  final String source;
  final String propertyId;
  final String idDocType;
  final String idDocNumber;
  final String idVerification;
  final double? originalAmount;
  final double? discountAmount;
  final String? couponCode;
  final String specialRequests;
  final String createdAt;

  // Compatibility getters
  String get guestName => guest;
  String get guestEmail => email;
  String get guestPhone => phone;
  String get reservationNumber => bookingId;
  double get totalAmount => (originalAmount != null && originalAmount! > 0) ? originalAmount! : amount;

  ReservationModel({
    required this.id,
    required this.bookingId,
    required this.guest,
    this.email = '',
    this.phone = '',
    this.room = '',
    this.roomNumber = '',
    this.roomType = 'Standard Room',
    required this.checkIn,
    required this.checkOut,
    this.nights = 1,
    this.stayType = 'hourly',
    this.hours,
    this.amount = 0.0,
    this.originalAmount,
    this.discountAmount,
    this.couponCode,
    this.balance = 0.0,
    this.status = 'Confirmed',
    this.paymentStatus = 'Pending',
    this.paymentMethod = 'UPI',
    this.source = 'Direct Booking',
    this.propertyId = 'HS-JAI',
    this.idDocType = 'Aadhaar Card',
    this.idDocNumber = '',
    this.idVerification = 'Pending',
    this.specialRequests = '',
    this.createdAt = '',
  });

  ReservationModel copyWith({
    String? id,
    String? bookingId,
    String? guest,
    String? email,
    String? phone,
    String? room,
    String? roomNumber,
    String? roomType,
    String? checkIn,
    String? checkOut,
    int? nights,
    String? stayType,
    int? hours,
    double? amount,
    double? balance,
    String? status,
    String? paymentStatus,
    String? paymentMethod,
    String? source,
    String? propertyId,
    String? idDocType,
    String? idDocNumber,
    String? idVerification,
    String? specialRequests,
    String? createdAt,
  }) {
    return ReservationModel(
      id: id ?? this.id,
      bookingId: bookingId ?? this.bookingId,
      guest: guest ?? this.guest,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      room: room ?? this.room,
      roomNumber: roomNumber ?? this.roomNumber,
      roomType: roomType ?? this.roomType,
      checkIn: checkIn ?? this.checkIn,
      checkOut: checkOut ?? this.checkOut,
      nights: nights ?? this.nights,
      stayType: stayType ?? this.stayType,
      hours: hours ?? this.hours,
      amount: amount ?? this.amount,
      balance: balance ?? this.balance,
      status: status ?? this.status,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      source: source ?? this.source,
      propertyId: propertyId ?? this.propertyId,
      idDocType: idDocType ?? this.idDocType,
      idDocNumber: idDocNumber ?? this.idDocNumber,
      idVerification: idVerification ?? this.idVerification,
      specialRequests: specialRequests ?? this.specialRequests,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  factory ReservationModel.fromJson(Map<String, dynamic> json) {
    String rNum = json['roomNumber']?.toString() ?? '';
    String rStr = json['room']?.toString() ?? '';
    if (rNum.isEmpty && rStr.isNotEmpty) {
      final match = RegExp(r'\b\d{3,4}\b').firstMatch(rStr);
      if (match != null) rNum = match.group(0)!;
    }

    final sType = json['stayType']?.toString() ??
        (json['hours'] != null ? 'hourly' : 'overnight');
    final hrs = json['hours'] != null ? int.tryParse(json['hours'].toString()) : null;

    return ReservationModel(
      id: json['id'] ?? json['_id'] ?? '',
      bookingId: json['bookingId'] ?? json['reservationNumber'] ?? json['id'] ?? json['_id'] ?? '',
      guest: json['guest'] ?? json['guestName'] ?? json['customerName'] ?? 'Guest',
      email: json['email'] ?? json['guestEmail'] ?? '',
      phone: json['phone'] ?? json['guestPhone'] ?? json['mobile'] ?? '',
      room: rStr,
      roomNumber: rNum,
      roomType: json['roomType'] ?? json['type'] ?? 'Standard Room',
      checkIn: json['checkIn'] ?? json['checkInDate'] ?? '',
      checkOut: json['checkOut'] ?? json['checkOutDate'] ?? '',
      nights: int.tryParse(json['nights']?.toString() ?? '1') ?? 1,
      stayType: sType,
      hours: hrs,
      amount: double.tryParse(json['originalAmount']?.toString() ?? json['amount']?.toString() ?? json['totalAmount']?.toString() ?? '0') ?? 0.0,
      originalAmount: double.tryParse(json['originalAmount']?.toString() ?? ''),
      discountAmount: double.tryParse(json['discountAmount']?.toString() ?? ''),
      couponCode: json['couponCode']?.toString(),
      balance: double.tryParse(json['balance']?.toString() ?? '0') ?? 0.0,
      status: json['status'] ?? 'Confirmed',
      paymentStatus: json['paymentStatus'] ?? 'Pending',
      paymentMethod: json['paymentMethod'] ?? 'UPI',
      source: json['source'] ?? 'Direct Booking',
      propertyId: json['propertyId']?.toString() ?? 'HS-JAI',
      idDocType: json['idDocType'] ?? 'Aadhaar Card',
      idDocNumber: json['idDocNumber'] ?? '',
      idVerification: json['idVerification'] ?? 'Pending',
      specialRequests: json['specialRequests'] ?? '',
      createdAt: json['createdAt'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'bookingId': bookingId,
      'guest': guest,
      'guestName': guest,
      'email': email,
      'guestEmail': email,
      'phone': phone,
      'guestPhone': phone,
      'room': room,
      'roomNumber': roomNumber,
      'roomType': roomType,
      'checkIn': checkIn,
      'checkOut': checkOut,
      'nights': nights,
      'stayType': stayType,
      'hours': hours,
      'amount': amount,
      'totalAmount': amount,
      'balance': balance,
      'status': status,
      'paymentStatus': paymentStatus,
      'paymentMethod': paymentMethod,
      'source': source,
      'propertyId': propertyId,
      'idDocType': idDocType,
      'idDocNumber': idDocNumber,
      'idVerification': idVerification,
      'specialRequests': specialRequests,
    };
  }
}
