class ApprovalModel {
  final String id;
  final String category;
  final String requestedBy;
  final String guest;
  final String bookingId;
  final String room;
  final double amount;
  final String value;
  final String reason;
  final String description;
  final String status;
  final String propertyId;
  final String? decisionReason;
  final String? decidedBy;
  final String? decidedAt;
  final String createdAt;

  // Compatibility getters
  String get type => category;
  String get requesterName => requestedBy;
  bool get isPending => status.toLowerCase() == 'pending';

  ApprovalModel({
    required this.id,
    required this.category,
    required this.requestedBy,
    required this.guest,
    this.bookingId = '',
    this.room = '',
    this.amount = 0.0,
    this.value = '',
    this.reason = '',
    this.description = '',
    this.status = 'Pending',
    this.propertyId = 'HS-JAI',
    this.decisionReason,
    this.decidedBy,
    this.decidedAt,
    this.createdAt = '',
  });

  factory ApprovalModel.fromJson(Map<String, dynamic> json) {
    return ApprovalModel(
      id: json['id'] ?? json['_id'] ?? '',
      category: json['category'] ?? json['type'] ?? 'Discount Override',
      requestedBy: json['requestedBy'] ?? json['requesterName'] ?? 'Front Desk',
      guest: json['guest'] ?? json['guestName'] ?? 'Guest',
      bookingId: json['bookingId'] ?? '',
      room: json['room'] ?? '',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0.0,
      value: json['value'] ?? '',
      reason: json['reason'] ?? json['remarks'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'Pending',
      propertyId: json['propertyId']?.toString() ?? 'HS-JAI',
      decisionReason: json['decisionReason'],
      decidedBy: json['decidedBy'],
      decidedAt: json['decidedAt']?.toString(),
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
}
