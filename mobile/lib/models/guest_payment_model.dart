class GuestPaymentSummary {
  final double totalPaid;
  final double pendingAmount;
  final double refundedAmount;
  final int totalTransactions;

  const GuestPaymentSummary({
    this.totalPaid = 0.0,
    this.pendingAmount = 0.0,
    this.refundedAmount = 0.0,
    this.totalTransactions = 0,
  });

  factory GuestPaymentSummary.fromJson(Map<String, dynamic> json) {
    return GuestPaymentSummary(
      totalPaid: double.tryParse(json['totalPaid']?.toString() ?? '0') ?? 0.0,
      pendingAmount: double.tryParse(json['pendingAmount']?.toString() ?? '0') ?? 0.0,
      refundedAmount: double.tryParse(json['refundedAmount']?.toString() ?? '0') ?? 0.0,
      totalTransactions: int.tryParse(json['totalTransactions']?.toString() ?? '0') ?? 0,
    );
  }
}

class GuestRefundInfo {
  final String status;
  final double requestedAmount;
  final double approvedAmount;
  final double cancellationFee;
  final String reason;
  final String refundMethod;
  final String upiId;
  final String accountNumber;
  final String bankName;
  final String utrNumber;
  final String requestedAt;
  final String? processedAt;

  const GuestRefundInfo({
    this.status = 'Pending',
    this.requestedAmount = 0.0,
    this.approvedAmount = 0.0,
    this.cancellationFee = 0.0,
    this.reason = '',
    this.refundMethod = 'UPI',
    this.upiId = '',
    this.accountNumber = '',
    this.bankName = '',
    this.utrNumber = '',
    this.requestedAt = '',
    this.processedAt,
  });

  factory GuestRefundInfo.fromJson(Map<String, dynamic> json) {
    return GuestRefundInfo(
      status: json['status']?.toString() ?? 'Pending',
      requestedAmount: double.tryParse(json['requestedAmount']?.toString() ?? '0') ?? 0.0,
      approvedAmount: double.tryParse(json['approvedAmount']?.toString() ?? '0') ?? 0.0,
      cancellationFee: double.tryParse(json['cancellationFee']?.toString() ?? '0') ?? 0.0,
      reason: json['reason']?.toString() ?? '',
      refundMethod: json['refundMethod']?.toString() ?? 'UPI',
      upiId: json['upiId']?.toString() ?? '',
      accountNumber: json['accountNumber']?.toString() ?? '',
      bankName: json['bankName']?.toString() ?? '',
      utrNumber: json['utrNumber']?.toString() ?? json['transactionRef']?.toString() ?? '',
      requestedAt: json['requestedAt']?.toString() ?? '',
      processedAt: json['processedAt']?.toString(),
    );
  }
}

class GuestFolioDetails {
  final String folioId;
  final double roomCharges;
  final double gstTax;
  final List<Map<String, dynamic>> services;
  final double serviceTotal;
  final double discount;
  final double totalCharges;

  const GuestFolioDetails({
    required this.folioId,
    this.roomCharges = 0.0,
    this.gstTax = 0.0,
    this.services = const [],
    this.serviceTotal = 0.0,
    this.discount = 0.0,
    this.totalCharges = 0.0,
  });

  factory GuestFolioDetails.fromJson(Map<String, dynamic> json) {
    List<Map<String, dynamic>> parsedServices = [];
    if (json['services'] is List) {
      for (final s in json['services']) {
        if (s is Map<String, dynamic>) {
          parsedServices.add(s);
        }
      }
    }

    return GuestFolioDetails(
      folioId: json['folioId']?.toString() ?? '',
      roomCharges: double.tryParse(json['roomCharges']?.toString() ?? '0') ?? 0.0,
      gstTax: double.tryParse(json['gstTax']?.toString() ?? '0') ?? 0.0,
      services: parsedServices,
      serviceTotal: double.tryParse(json['serviceTotal']?.toString() ?? '0') ?? 0.0,
      discount: double.tryParse(json['discount']?.toString() ?? '0') ?? 0.0,
      totalCharges: double.tryParse(json['totalCharges']?.toString() ?? '0') ?? 0.0,
    );
  }
}

class GuestPaymentModel {
  final String id;
  final String paymentId;
  final String bookingId;
  final String guestName;
  final String hotel;
  final String city;
  final String address;
  final String gstNo;
  final String propertyId;
  final String room;
  final String roomNumber;
  final double amount;
  final double totalAmount;
  final double paidAmount;
  final double balance;
  final String paymentMethod;
  final String status;
  final String checkIn;
  final String checkOut;
  final String dates;
  final int nights;
  final String createdAt;
  final GuestFolioDetails? folio;
  final GuestRefundInfo? refundInfo;

  const GuestPaymentModel({
    required this.id,
    required this.paymentId,
    required this.bookingId,
    required this.guestName,
    required this.hotel,
    this.city = 'Hyderabad',
    this.address = 'Hitech City, Hyderabad, Telangana',
    this.gstNo = '36AABCS1429B1Z5',
    this.propertyId = 'HS-JAI',
    required this.room,
    this.roomNumber = '101',
    required this.amount,
    required this.totalAmount,
    required this.paidAmount,
    required this.balance,
    this.paymentMethod = 'UPI',
    this.status = 'Successful',
    this.checkIn = '',
    this.checkOut = '',
    this.dates = '',
    this.nights = 1,
    this.createdAt = '',
    this.folio,
    this.refundInfo,
  });

  bool get isSuccessful =>
      status.toLowerCase() == 'successful' ||
      status.toLowerCase() == 'settled' ||
      status.toLowerCase() == 'paid';

  bool get isPending =>
      status.toLowerCase() == 'pending';

  bool get isProcessing =>
      status.toLowerCase() == 'processing';

  bool get isFailed =>
      status.toLowerCase() == 'failed';

  bool get isRefunded =>
      status.toLowerCase() == 'refunded';

  bool get isPartiallyRefunded =>
      status.toLowerCase() == 'partially refunded';

  bool get hasPendingBalance => balance > 0;

  factory GuestPaymentModel.fromJson(Map<String, dynamic> json) {
    return GuestPaymentModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      paymentId: json['paymentId']?.toString() ?? json['id']?.toString() ?? 'PAY-HS',
      bookingId: json['bookingId']?.toString() ?? '',
      guestName: json['guestName']?.toString() ?? json['guest']?.toString() ?? 'Valued Guest',
      hotel: json['hotel']?.toString() ?? json['hotelName']?.toString() ?? 'Hour Stay Luxury Hotel',
      city: json['city']?.toString() ?? 'Hyderabad',
      address: json['address']?.toString() ?? 'Hitech City, Hyderabad, Telangana',
      gstNo: json['gstNo']?.toString() ?? '36AABCS1429B1Z5',
      propertyId: json['propertyId']?.toString() ?? 'HS-JAI',
      room: json['room']?.toString() ?? json['roomType']?.toString() ?? 'Standard Room',
      roomNumber: json['roomNumber']?.toString() ?? '101',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      totalAmount: double.tryParse(json['totalAmount']?.toString() ?? '0') ?? 0.0,
      paidAmount: double.tryParse(json['paidAmount']?.toString() ?? '0') ?? 0.0,
      balance: double.tryParse(json['balance']?.toString() ?? '0') ?? 0.0,
      paymentMethod: json['paymentMethod']?.toString() ?? json['method']?.toString() ?? 'UPI',
      status: json['status']?.toString() ?? 'Successful',
      checkIn: json['checkIn']?.toString() ?? '',
      checkOut: json['checkOut']?.toString() ?? '',
      dates: json['dates']?.toString() ?? '',
      nights: int.tryParse(json['nights']?.toString() ?? '1') ?? 1,
      createdAt: json['createdAt']?.toString() ?? '',
      folio: json['folio'] is Map<String, dynamic> ? GuestFolioDetails.fromJson(json['folio']) : null,
      refundInfo: json['refundInfo'] is Map<String, dynamic> ? GuestRefundInfo.fromJson(json['refundInfo']) : null,
    );
  }
}
