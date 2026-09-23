class RoomModel {
  final String id;
  final String roomNumber;
  final String category;
  final String status;
  final String operationalStatus;
  final String ratePlan;
  final double baseRate;
  final double currentRate;
  final String floor;
  final String capacity;
  final String bedType;
  final String propertyId;
  final bool isReserved;
  final bool isAvailable;
  final String? guest;
  final String? checkIn;
  final String? checkOut;
  final Map<int, double> rates;
  final List<String> amenities;
  final List<String> images;
  final String? description;
  final String? propertyName;
  final String? city;
  final String? cancellationPolicy;
  final double rating;

  // Compatibility getters
  String get type => category;
  double get basePrice => baseRate;
  String get mainImage => images.isNotEmpty ? images.first : '';

  RoomModel({
    required this.id,
    required this.roomNumber,
    required this.category,
    this.status = 'Available',
    this.operationalStatus = 'Available',
    this.ratePlan = 'Standard Plan',
    this.baseRate = 3000.0,
    this.currentRate = 3000.0,
    this.floor = 'Floor 1',
    this.capacity = '2 Adults',
    this.bedType = 'King Bed',
    this.propertyId = 'HS-9HQ8P',
    this.isReserved = false,
    this.isAvailable = true,
    this.guest,
    this.checkIn,
    this.checkOut,
    Map<int, double>? rates,
    List<String>? amenities,
    List<String>? images,
    this.description,
    this.propertyName,
    this.city,
    this.cancellationPolicy,
    this.rating = 4.9,
  })  : rates = rates ??
            {
              2: (baseRate * 0.3).roundToDouble(),
              3: (baseRate * 0.4).roundToDouble(),
              6: (baseRate * 0.6).roundToDouble(),
              12: (baseRate * 0.8).roundToDouble(),
              24: baseRate,
            },
        amenities = amenities ??
            const [
              'High-Speed Wi-Fi',
              'King Bed',
              'Smart TV',
              'Air Conditioning',
              'Complimentary Toiletries',
            ],
        images = images ?? const [];

  RoomModel copyWith({
    String? id,
    String? roomNumber,
    String? category,
    String? status,
    String? operationalStatus,
    String? ratePlan,
    double? baseRate,
    double? currentRate,
    String? floor,
    String? capacity,
    String? bedType,
    String? propertyId,
    bool? isReserved,
    bool? isAvailable,
    String? guest,
    String? checkIn,
    String? checkOut,
    Map<int, double>? rates,
    List<String>? amenities,
    List<String>? images,
    String? description,
    String? propertyName,
    String? city,
    String? cancellationPolicy,
    double? rating,
  }) {
    return RoomModel(
      id: id ?? this.id,
      roomNumber: roomNumber ?? this.roomNumber,
      category: category ?? this.category,
      status: status ?? this.status,
      operationalStatus: operationalStatus ?? this.operationalStatus,
      ratePlan: ratePlan ?? this.ratePlan,
      baseRate: baseRate ?? this.baseRate,
      currentRate: currentRate ?? this.currentRate,
      floor: floor ?? this.floor,
      capacity: capacity ?? this.capacity,
      bedType: bedType ?? this.bedType,
      propertyId: propertyId ?? this.propertyId,
      isReserved: isReserved ?? this.isReserved,
      isAvailable: isAvailable ?? this.isAvailable,
      guest: guest ?? this.guest,
      checkIn: checkIn ?? this.checkIn,
      checkOut: checkOut ?? this.checkOut,
      rates: rates ?? this.rates,
      amenities: amenities ?? this.amenities,
      images: images ?? this.images,
      description: description ?? this.description,
      propertyName: propertyName ?? this.propertyName,
      city: city ?? this.city,
      cancellationPolicy: cancellationPolicy ?? this.cancellationPolicy,
      rating: rating ?? this.rating,
    );
  }

  factory RoomModel.fromJson(Map<String, dynamic> json) {
    final bRate = double.tryParse(json['baseRate']?.toString() ?? json['basePrice']?.toString() ?? '3000') ?? 3000.0;
    final cRate = double.tryParse(json['currentRate']?.toString() ?? json['dailyRate']?.toString() ?? bRate.toString()) ?? bRate;

    Map<int, double> customRates = {};
    if (json['rates'] != null && json['rates'] is Map) {
      final map = json['rates'] as Map;
      map.forEach((k, v) {
        final keyInt = int.tryParse(k.toString());
        final valDouble = double.tryParse(v.toString());
        if (keyInt != null && valDouble != null) {
          customRates[keyInt] = valDouble;
        }
      });
    }

    List<String> amenitiesList = [];
    if (json['amenities'] != null) {
      if (json['amenities'] is List) {
        amenitiesList = (json['amenities'] as List).map((e) => e.toString().trim()).where((e) => e.isNotEmpty).toList();
      } else if (json['amenities'] is String) {
        amenitiesList = (json['amenities'] as String).split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toList();
      }
    }

    List<String> imagesList = [];
    if (json['images'] != null && json['images'] is List) {
      imagesList = (json['images'] as List).map((e) => e.toString().trim()).where((e) => e.isNotEmpty).toList();
    } else if (json['image'] != null && json['image'].toString().trim().isNotEmpty) {
      imagesList = [json['image'].toString().trim()];
    }

    final rat = double.tryParse(json['rating']?.toString() ?? '4.9') ?? 4.9;

    return RoomModel(
      id: json['id'] ?? json['_id'] ?? '',
      roomNumber: json['roomNumber']?.toString() ?? '',
      category: json['category'] ?? json['type'] ?? 'Standard Room',
      status: json['status'] ?? 'Available',
      operationalStatus: json['operationalStatus'] ?? json['status'] ?? 'Available',
      ratePlan: json['ratePlan'] ?? 'Standard Plan',
      baseRate: bRate,
      currentRate: cRate,
      floor: json['floor']?.toString() ?? 'Floor 1',
      capacity: json['capacity']?.toString() ?? '2 Adults',
      bedType: json['bedType']?.toString() ?? json['beds']?.toString() ?? 'King Bed',
      propertyId: json['propertyId']?.toString() ?? 'HS-9HQ8P',
      isReserved: json['isReserved'] == true,
      isAvailable: json['isAvailable'] == true || (json['status'] == 'Available' && json['isReserved'] != true),
      guest: json['guest'],
      checkIn: json['checkIn'],
      checkOut: json['checkOut'],
      rates: customRates.isNotEmpty ? customRates : null,
      amenities: amenitiesList.isNotEmpty ? amenitiesList : null,
      images: imagesList,
      description: json['description']?.toString(),
      propertyName: json['propertyName']?.toString() ?? json['hotelName']?.toString() ?? json['hotel']?.toString(),
      city: json['city']?.toString(),
      cancellationPolicy: json['cancellationPolicy']?.toString(),
      rating: rat,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'roomNumber': roomNumber,
      'category': category,
      'type': category,
      'status': status,
      'ratePlan': ratePlan,
      'baseRate': baseRate,
      'basePrice': baseRate,
      'currentRate': currentRate,
      'floor': floor,
      'capacity': capacity,
      'bedType': bedType,
      'propertyId': propertyId,
      'rates': rates.map((k, v) => MapEntry(k.toString(), v)),
      'amenities': amenities,
      'images': images,
      'description': description,
      'propertyName': propertyName,
      'city': city,
      'cancellationPolicy': cancellationPolicy,
      'rating': rating,
    };
  }
}
