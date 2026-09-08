import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/models/room_model.dart';
import 'package:hour_stay_mobile/providers/manager/reservation_provider.dart';
import 'package:hour_stay_mobile/providers/manager/room_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_button.dart';
import 'package:hour_stay_mobile/widgets/custom_text_field.dart';

class ManagerCreateReservationScreen extends StatefulWidget {
  const ManagerCreateReservationScreen({super.key});

  @override
  State<ManagerCreateReservationScreen> createState() => _ManagerCreateReservationScreenState();
}

class _ManagerCreateReservationScreenState extends State<ManagerCreateReservationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _guestNameController = TextEditingController();
  final _guestEmailController = TextEditingController();
  final _guestPhoneController = TextEditingController();

  RoomModel? _selectedRoom;
  String _stayType = 'hourly';
  int _selectedHours = 3;
  DateTime _checkInDate = DateTime.now();
  TimeOfDay _checkInTime = TimeOfDay.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RoomProvider>().fetchAll();
    });
  }

  @override
  void dispose() {
    _guestNameController.dispose();
    _guestEmailController.dispose();
    _guestPhoneController.dispose();
    super.dispose();
  }

  double _calculateEstimatedPrice() {
    if (_selectedRoom == null) return 0.0;
    if (_stayType == 'overnight') {
      return _selectedRoom!.basePrice;
    } else {
      final rate = _selectedRoom!.rates[_selectedHours] ?? (_selectedRoom!.basePrice / 24 * _selectedHours);
      return rate.toDouble();
    }
  }

  Future<void> _selectCheckInDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _checkInDate,
      firstDate: DateTime.now().subtract(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null) {
      setState(() => _checkInDate = picked);
    }
  }

  Future<void> _selectCheckInTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _checkInTime,
    );
    if (picked != null) {
      setState(() => _checkInTime = picked);
    }
  }

  Future<void> _handleCreate() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedRoom == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a room'), backgroundColor: AppColors.error),
      );
      return;
    }

    final checkIn = DateTime(
      _checkInDate.year,
      _checkInDate.month,
      _checkInDate.day,
      _checkInTime.hour,
      _checkInTime.minute,
    );
    final checkOut = _stayType == 'hourly'
        ? checkIn.add(Duration(hours: _selectedHours))
        : checkIn.add(const Duration(days: 1));

    final provider = context.read<ReservationProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    final success = await provider.createReservation({
      'roomId': _selectedRoom!.id,
      'guestName': _guestNameController.text.trim(),
      'guestEmail': _guestEmailController.text.trim(),
      'guestPhone': _guestPhoneController.text.trim(),
      'checkIn': checkIn.toIso8601String(),
      'checkOut': checkOut.toIso8601String(),
      'stayType': _stayType,
      'hours': _stayType == 'hourly' ? _selectedHours : null,
      'totalAmount': _calculateEstimatedPrice(),
      'paymentStatus': 'pending',
    });

    if (success && mounted) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Reservation created successfully!'), backgroundColor: AppColors.success),
      );
      navigator.pop();
    } else if (mounted) {
      messenger.showSnackBar(
        SnackBar(content: Text(provider.errorMessage ?? 'Failed to create reservation'), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final roomProvider = context.watch<RoomProvider>();
    final availableRooms = roomProvider.rooms.where((r) => r.status.toLowerCase() == 'available').toList();
    final resProvider = context.watch<ReservationProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('New Walk-in / Booking'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Stay Type Selector
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('Hourly Stay')),
                      selected: _stayType == 'hourly',
                      onSelected: (val) {
                        if (val) setState(() => _stayType = 'hourly');
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text('Overnight Stay')),
                      selected: _stayType == 'overnight',
                      onSelected: (val) {
                        if (val) setState(() => _stayType = 'overnight');
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              if (_stayType == 'hourly') ...[
                const Text('Duration (Hours):', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [2, 3, 6, 12, 24].map((h) {
                    return ChoiceChip(
                      label: Text('${h}h'),
                      selected: _selectedHours == h,
                      onSelected: (val) {
                        if (val) setState(() => _selectedHours = h);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
              ],

              // Room selection
              const Text('Select Room:', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              DropdownButtonFormField<RoomModel>(
                initialValue: _selectedRoom,
                decoration: InputDecoration(
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                hint: const Text('Choose available room'),
                items: availableRooms.map((room) {
                  return DropdownMenuItem(
                    value: room,
                    child: Text('Room ${room.roomNumber} - ${room.type}'),
                  );
                }).toList(),
                onChanged: (room) => setState(() => _selectedRoom = room),
                validator: (val) => val == null ? 'Please select a room' : null,
              ),
              const SizedBox(height: 16),

              // Date & Time pickers
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.calendar_today, size: 16),
                      label: Text(DateFormat('MMM dd, yyyy').format(_checkInDate)),
                      onPressed: _selectCheckInDate,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.access_time, size: 16),
                      label: Text(_checkInTime.format(context)),
                      onPressed: _selectCheckInTime,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Guest Information
              CustomTextField(
                controller: _guestNameController,
                label: 'Guest Name',
                hint: 'Full name',
                prefixIcon: Icons.person_outline,
                validator: (v) => v == null || v.trim().isEmpty ? 'Name required' : null,
              ),
              const SizedBox(height: 12),
              CustomTextField(
                controller: _guestEmailController,
                label: 'Guest Email',
                hint: 'email@example.com',
                prefixIcon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
                validator: (v) => v == null || v.trim().isEmpty ? 'Email required' : null,
              ),
              const SizedBox(height: 12),
              CustomTextField(
                controller: _guestPhoneController,
                label: 'Guest Phone',
                hint: '+1234567890',
                prefixIcon: Icons.phone_outlined,
                keyboardType: TextInputType.phone,
                validator: (v) => v == null || v.trim().isEmpty ? 'Phone required' : null,
              ),
              const SizedBox(height: 20),

              // Pricing Summary Box
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primary.withAlpha(50)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Estimated Total:',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      '\$${_calculateEstimatedPrice().toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              CustomButton(
                text: 'Create Reservation',
                isLoading: resProvider.isLoading,
                onPressed: _handleCreate,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
