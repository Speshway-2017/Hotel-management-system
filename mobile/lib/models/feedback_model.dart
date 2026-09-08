class FeedbackModel {
  final String id;
  final String bookingId;
  final String guestName;
  final String room;
  final double rating;
  final Map<String, dynamic> ratings;
  final String category;
  final String sentiment;
  final String status;
  final String comment;
  final String response;
  final String respondedBy;
  final String createdAt;

  FeedbackModel({
    required this.id,
    this.bookingId = '',
    required this.guestName,
    this.room = '101',
    this.rating = 5.0,
    this.ratings = const {},
    this.category = 'General',
    this.sentiment = 'Positive',
    this.status = 'Published',
    this.comment = '',
    this.response = '',
    this.respondedBy = '',
    this.createdAt = '',
  });

  factory FeedbackModel.fromJson(Map<String, dynamic> json) {
    return FeedbackModel(
      id: json['id'] ?? json['_id'] ?? '',
      bookingId: json['bookingId'] ?? '',
      guestName: json['guestName'] ?? json['guest'] ?? 'Guest',
      room: json['room'] ?? '101',
      rating: double.tryParse(json['rating']?.toString() ?? '5') ?? 5.0,
      ratings: json['ratings'] is Map<String, dynamic> ? json['ratings'] : {},
      category: json['category'] ?? 'General',
      sentiment: json['sentiment'] ?? 'Positive',
      status: json['status'] ?? 'Published',
      comment: json['comment'] ?? json['comments'] ?? '',
      response: json['response'] ?? '',
      respondedBy: json['respondedBy'] ?? '',
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
}
