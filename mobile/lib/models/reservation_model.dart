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
  final String refundStatus;
  final double cancellationFee;
  final double refundableAmount;
  final String cancellationReason;
  final String cancellationRemarks;
  final Map<String, dynamic>? refundRequest;
  final String? hotel;
  final String? city;
  final int adults;
  final int children;
  final int roomsCount;

  // Compatibility getters
  String get guestName => guest;
  String get guestEmail => email;
  String get guestPhone => phone;
  String get reservationNumber => bookingId;
  String get propertyName => hotel ?? 'Hour Stay Luxury Hotel';
  int get totalGuests => adults + children;
  double get totalAmount => amount;

  // Refund helpers
  bool get hasRefundRequest => refundRequest != null || (refundStatus != 'None' && refundStatus.isNotEmpty);
  bool get isCancelled => status.toLowerCase() == 'cancelled';

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
    this.stayType = 'overnight',
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
    this.propertyId = 'HS-9HQ8P',
    this.idDocType = 'Aadhaar Card',
    this.idDocNumber = '',
    this.idVerification = 'Pending',
    this.specialRequests = '',
    this.createdAt = '',
    this.refundStatus = 'None',
    this.cancellationFee = 0.0,
    this.refundableAmount = 0.0,
    this.cancellationReason = '',
    this.cancellationRemarks = '',
    this.refundRequest,
    this.hotel,
    this.city,
    this.adults = 2,
    this.children = 0,
    this.roomsCount = 1,
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
    String? refundStatus,
    double? cancellationFee,
    double? refundableAmount,
    String? cancellationReason,
    String? cancellationRemarks,
    Map<String, dynamic>? refundRequest,
    String? hotel,
    String? city,
    int? adults,
    int? children,
    int? roomsCount,
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
      refundStatus: refundStatus ?? this.refundStatus,
      cancellationFee: cancellationFee ?? this.cancellationFee,
      refundableAmount: refundableAmount ?? this.refundableAmount,
      cancellationReason: cancellationReason ?? this.cancellationReason,
      cancellationRemarks: cancellationRemarks ?? this.cancellationRemarks,
      refundRequest: refundRequest ?? this.refundRequest,
      hotel: hotel ?? this.hotel,
      city: city ?? this.city,
      adults: adults ?? this.adults,
      children: children ?? this.children,
      roomsCount: roomsCount ?? this.roomsCount,
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

    Map<String, dynamic>? refReq;
    if (json['refundRequest'] is Map) {
      refReq = Map<String, dynamic>.from(json['refundRequest'] as Map);
    }

    final rawRefundStatus = json['refundStatus']?.toString() ??
        (refReq != null ? refReq['status']?.toString() : null) ??
        'None';

    final hName = json['hotel']?.toString() ?? json['hotelName']?.toString() ?? json['propertyName']?.toString();
    final cName = json['city']?.toString();
    final adCount = int.tryParse(json['adults']?.toString() ?? '2') ?? 2;
    final chCount = int.tryParse(json['children']?.toString() ?? '0') ?? 0;
    final rmCount = int.tryParse(json['roomsCount']?.toString() ?? json['rooms']?.toString() ?? '1') ?? 1;

    final origAmt = double.tryParse(json['originalAmount']?.toString() ?? '');
    final discAmt = double.tryParse(json['discountAmount']?.toString() ?? '');
    double parsedAmount = double.tryParse(json['amount']?.toString() ?? json['totalAmount']?.toString() ?? json['netAmount']?.toString() ?? json['paidAmount']?.toString() ?? '0') ?? 0.0;
    if (parsedAmount == 0.0 && origAmt != null && origAmt > 0) {
      if (discAmt != null && discAmt > 0) {
        parsedAmount = (origAmt - discAmt).clamp(0.0, double.infinity);
      } else {
        parsedAmount = origAmt;
      }
    }

    final cInStr = json['checkIn'] ?? json['checkInDate'] ?? '';
    final cOutStr = json['checkOut'] ?? json['checkOutDate'] ?? '';
    int parsedNights = int.tryParse(json['nights']?.toString() ?? '') ?? 0;
    if (cInStr.toString().isNotEmpty && cOutStr.toString().isNotEmpty) {
      try {
        final cInDt = DateTime.tryParse(cInStr.toString().trim());
        final cOutDt = DateTime.tryParse(cOutStr.toString().trim());
        if (cInDt != null && cOutDt != null) {
          final diff = cOutDt.difference(cInDt).inDays;
          if (diff > 0) {
            parsedNights = diff;
          }
        }
      } catch (_) {}
    }
    if (parsedNights <= 0) parsedNights = 1;

    return ReservationModel(
      id: json['id'] ?? json['_id'] ?? '',
      bookingId: json['bookingId'] ?? json['reservationNumber'] ?? json['id'] ?? json['_id'] ?? '',
      guest: json['guest'] ?? json['guestName'] ?? json['customerName'] ?? 'Guest',
      email: json['email'] ?? json['guestEmail'] ?? '',
      phone: json['phone'] ?? json['guestPhone'] ?? json['mobile'] ?? '',
      room: rStr,
      roomNumber: rNum,
      roomType: json['roomType'] ?? json['type'] ?? 'Standard Room',
      checkIn: cInStr.toString(),
      checkOut: cOutStr.toString(),
      nights: parsedNights,
      stayType: sType,
      hours: hrs,
      amount: parsedAmount,
      originalAmount: origAmt,
      discountAmount: discAmt,
      couponCode: json['couponCode']?.toString(),
      balance: double.tryParse(json['balance']?.toString() ?? '0') ?? 0.0,
      status: json['status'] ?? 'Confirmed',
      paymentStatus: json['paymentStatus'] ?? 'Pending',
      paymentMethod: json['paymentMethod'] ?? 'UPI',
      source: json['source'] ?? 'Direct Booking',
      propertyId: json['propertyId']?.toString() ?? 'HS-9HQ8P',
      idDocType: json['idDocType'] ?? 'Aadhaar Card',
      idDocNumber: json['idDocNumber'] ?? '',
      idVerification: json['idVerification'] ?? 'Pending',
      specialRequests: json['specialRequests'] ?? '',
      createdAt: json['createdAt'] ?? '',
      refundStatus: rawRefundStatus,
      cancellationFee: double.tryParse(json['cancellationFee']?.toString() ?? '0') ?? 0.0,
      refundableAmount: double.tryParse(json['refundableAmount']?.toString() ?? '0') ?? 0.0,
      cancellationReason: json['cancellationReason']?.toString() ?? '',
      cancellationRemarks: json['cancellationRemarks']?.toString() ?? '',
      refundRequest: refReq,
      hotel: hName,
      city: cName,
      adults: adCount,
      children: chCount,
      roomsCount: rmCount,
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
      'refundStatus': refundStatus,
      'cancellationFee': cancellationFee,
      'refundableAmount': refundableAmount,
      'cancellationReason': cancellationReason,
      'cancellationRemarks': cancellationRemarks,
      'refundRequest': refundRequest,
      'hotel': hotel,
      'city': city,
      'adults': adults,
      'children': children,
      'roomsCount': roomsCount,
    };
  }
}
