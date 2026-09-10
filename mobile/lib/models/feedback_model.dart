class FeedbackModel {
  final String id;
  final String bookingId;
  final String guestName;
  final String guestEmail;
  final String guestPhone;
  final String room;
  final String roomType;
  final double rating;
  final Map<String, dynamic> ratings;
  final String category;
  final String sentiment;
  final String status;
  final String comment;
  final String response;
  final String respondedBy;
  final String respondedAt;
  final String createdAt;

  FeedbackModel({
    required this.id,
    this.bookingId = '',
    required this.guestName,
    this.guestEmail = '',
    this.guestPhone = '',
    this.room = '101',
    this.roomType = 'Standard Room',
    this.rating = 5.0,
    this.ratings = const {},
    this.category = 'General',
    this.sentiment = 'Positive',
    this.status = 'Published',
    this.comment = '',
    this.response = '',
    this.respondedBy = '',
    this.respondedAt = '',
    this.createdAt = '',
  });

  bool get hasResponse => response.trim().isNotEmpty;
  bool get isResolved => status.toLowerCase() == 'resolved';
  bool get isPositive => rating >= 4.0 || sentiment.toLowerCase() == 'positive';
  bool get isCritical => rating <= 2.0 || sentiment.toLowerCase() == 'negative';

  double get cleanlinessRating =>
      _extractRating('cleanliness', fallback: rating);
  double get serviceRating =>
      _extractRating('service', fallback: rating);
  double get roomRating =>
      _extractRating('room', fallback: rating);
  double get foodRating =>
      _extractRating('food', fallback: rating);
  double get overallRating =>
      _extractRating('overall', fallback: rating);

  double _extractRating(String key, {required double fallback}) {
    if (ratings.containsKey(key)) {
      return double.tryParse(ratings[key]?.toString() ?? '') ?? fallback;
    }
    return fallback;
  }

  factory FeedbackModel.fromJson(Map<String, dynamic> json) {
    return FeedbackModel(
      id: json['id'] ?? json['_id'] ?? '',
      bookingId: json['bookingId'] ?? '',
      guestName: json['guestName'] ?? json['guest'] ?? json['name'] ?? 'Guest',
      guestEmail: json['guestEmail'] ?? json['email'] ?? '',
      guestPhone: json['guestPhone'] ?? json['phone'] ?? '',
      room: json['room'] ?? json['roomNumber'] ?? '101',
      roomType: json['roomType'] ?? 'Standard Room',
      rating: double.tryParse(json['rating']?.toString() ?? '5') ?? 5.0,
      ratings: json['ratings'] is Map<String, dynamic>
          ? Map<String, dynamic>.from(json['ratings'] as Map)
          : {},
      category: json['category'] ?? 'General',
      sentiment: json['sentiment'] ?? 'Positive',
      status: json['status'] ?? 'Published',
      comment: json['comment'] ?? json['comments'] ?? '',
      response: json['response'] ?? '',
      respondedBy: json['respondedBy'] ?? '',
      respondedAt: json['respondedAt']?.toString() ?? '',
      createdAt: json['createdAt']?.toString() ?? '',
    );
  }
}

