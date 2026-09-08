class FolioItem {
  final String description;
  final double amount;

  FolioItem({required this.description, required this.amount});
}

class FolioModel {
  final String folioId;
  final String bookingId;
  final String hotel;
  final String city;
  final String address;
  final String gstNo;
  final String guestName;
  final String room;
  final String checkIn;
  final String checkOut;
  final double roomCharges;
  final double gstTax;
  final double serviceTotal;
  final double discount;
  final double totalCharges;
  final double paidAmount;
  final double balance;
  final String paymentStatus;

  // Compatibility getters
  String get id => folioId;
  String get status => paymentStatus;
  String get createdAt => checkIn;
  double get subtotal => roomCharges + serviceTotal;
  double get tax => gstTax;
  double get total => totalCharges;

  List<FolioItem> get items => [
        FolioItem(description: 'Room Stay Charges ($room)', amount: roomCharges),
        if (serviceTotal > 0)
          FolioItem(description: 'Room Services & Amenities', amount: serviceTotal),
        if (discount > 0)
          FolioItem(description: 'Promo Discount', amount: -discount),
      ];

  FolioModel({
    required this.folioId,
    required this.bookingId,
    required this.hotel,
    this.city = 'Hyderabad',
    this.address = 'Hitech City, Hyderabad',
    this.gstNo = '36AABCS1429B1Z5',
    required this.guestName,
    required this.room,
    required this.checkIn,
    required this.checkOut,
    required this.roomCharges,
    required this.gstTax,
    this.serviceTotal = 0.0,
    this.discount = 0.0,
    required this.totalCharges,
    required this.paidAmount,
    required this.balance,
    required this.paymentStatus,
  });

  factory FolioModel.fromJson(Map<String, dynamic> json) {
    return FolioModel(
      folioId: json['folioId'] ?? json['id'] ?? json['_id'] ?? 'FOL-1001',
      bookingId: json['bookingId'] ?? '',
      hotel: json['hotel'] ?? 'Hour Stay Luxury Hotel',
      city: json['city'] ?? 'Hyderabad',
      address: json['address'] ?? 'Hitech City, Hyderabad',
      gstNo: json['gstNo'] ?? '36AABCS1429B1Z5',
      guestName: json['guestName'] ?? 'Guest',
      room: json['room'] ?? 'Standard Room',
      checkIn: json['checkIn'] ?? '2026-09-01',
      checkOut: json['checkOut'] ?? '2026-09-03',
      roomCharges: double.tryParse(json['roomCharges']?.toString() ?? json['subtotal']?.toString() ?? '0') ?? 0.0,
      gstTax: double.tryParse(json['gstTax']?.toString() ?? json['tax']?.toString() ?? '0') ?? 0.0,
      serviceTotal: double.tryParse(json['serviceTotal']?.toString() ?? '0') ?? 0.0,
      discount: double.tryParse(json['discount']?.toString() ?? '0') ?? 0.0,
      totalCharges: double.tryParse(json['totalCharges']?.toString() ?? json['total']?.toString() ?? '0') ?? 0.0,
      paidAmount: double.tryParse(json['paidAmount']?.toString() ?? json['total']?.toString() ?? '0') ?? 0.0,
      balance: double.tryParse(json['balance']?.toString() ?? '0') ?? 0.0,
      paymentStatus: json['paymentStatus'] ?? json['status'] ?? 'Settled',
    );
  }
}
