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

  // Compatibility getters
  String get type => category;
  double get basePrice => baseRate;

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
    this.propertyId = 'HS-JAI',
    this.isReserved = false,
    this.isAvailable = true,
    this.guest,
    this.checkIn,
    this.checkOut,
    Map<int, double>? rates,
    List<String>? amenities,
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
            ];

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
    if (json['amenities'] != null && json['amenities'] is List) {
      amenitiesList = (json['amenities'] as List).map((e) => e.toString()).toList();
    }

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
      bedType: json['bedType']?.toString() ?? 'King Bed',
      propertyId: json['propertyId']?.toString() ?? 'HS-JAI',
      isReserved: json['isReserved'] == true,
      isAvailable: json['isAvailable'] == true || (json['status'] == 'Available' && json['isReserved'] != true),
      guest: json['guest'],
      checkIn: json['checkIn'],
      checkOut: json['checkOut'],
      rates: customRates.isNotEmpty ? customRates : null,
      amenities: amenitiesList.isNotEmpty ? amenitiesList : null,
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
    };
  }
}
