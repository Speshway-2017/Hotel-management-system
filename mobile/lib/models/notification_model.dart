class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String category;
  final bool isRead;
  final String propertyId;
  final String createdAt;

  // Compatibility getter
  String get type => category;

  NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    this.category = 'Operations',
    this.isRead = false,
    this.propertyId = 'HS-JAI',
    this.createdAt = '',
    String? type,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] ?? json['_id'] ?? '',
      title: json['title'] ?? 'Notification',
      message: json['message'] ?? '',
      category: json['category'] ?? json['type'] ?? 'Operations',
      isRead: json['isRead'] == true,
      propertyId: json['propertyId']?.toString() ?? 'HS-JAI',
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
}
