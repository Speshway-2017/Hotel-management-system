import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/feedback_model.dart';
import '../../../models/reservation_model.dart';
import '../../../providers/guest/guest_booking_provider.dart';
import '../../../providers/guest/guest_feedback_provider.dart';
import 'package:hour_stay_mobile/colours.dart';

class GuestAddFeedbackScreen extends StatefulWidget {
  final String? reservationId;
  final ReservationModel? booking;
  final FeedbackModel? existingFeedback;

  const GuestAddFeedbackScreen({
    super.key,
    this.reservationId,
    this.booking,
    this.existingFeedback,
  });

  @override
  State<GuestAddFeedbackScreen> createState() => _GuestAddFeedbackScreenState();
}

class _GuestAddFeedbackScreenState extends State<GuestAddFeedbackScreen> {

  final _commentController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  double _overallRating = 5.0;
  int _cleanlinessRating = 5;
  int _roomRating = 5;
  int _staffRating = 5;

  ReservationModel? _selectedBooking;
  bool _isSubmitting = false;

  bool get _isEditing => widget.existingFeedback != null;

  @override
  void initState() {
    super.initState();
    if (widget.existingFeedback != null) {
      final f = widget.existingFeedback!;
      _overallRating = f.rating;
      _cleanlinessRating = f.cleanlinessRating.round().clamp(1, 5);
      _roomRating = f.roomRating.round().clamp(1, 5);
      _staffRating = f.staffRating.round().clamp(1, 5);
      _commentController.text = f.comment;
    } else if (widget.booking != null) {
      _selectedBooking = widget.booking;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_selectedBooking == null && widget.existingFeedback == null) {
        final bookingProv = context.read<GuestBookingProvider>();
        if (bookingProv.bookings.isEmpty) {
          bookingProv.fetchMyBookings(silent: true);
        }
      }
    });
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  String _getRatingSentiment(double rating) {
    if (rating >= 4.8) return '⭐ Exceptional Stay';
    if (rating >= 4.0) return '⭐ Great Experience';
    if (rating >= 3.0) return '⭐ Average Stay';
    if (rating >= 2.0) return '⭐ Below Expectations';
    return '⭐ Needs Improvement';
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final commentText = _commentController.text.trim();
    if (commentText.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please share a brief comment about your stay experience.'),
          backgroundColor: ruby,
        ),
      );
      return;
    }

    final feedbackProv = context.read<GuestFeedbackProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);

    setState(() => _isSubmitting = true);

    bool success = false;

    if (_isEditing) {
      success = await feedbackProv.updateFeedback(
        feedbackId: widget.existingFeedback!.id,
        rating: _overallRating,
        comment: commentText,
        categoryRatings: {
          'cleanliness': _cleanlinessRating,
          'room': _roomRating,
          'staff': _staffRating,
          'overall': _overallRating.round(),
        },
      );
    } else {
      final bId = _selectedBooking?.id ?? widget.reservationId ?? '';
      success = await feedbackProv.submitFeedback(
        bookingId: bId,
        reservationId: bId,
        rating: _overallRating,
        comment: commentText,
        categoryRatings: {
          'cleanliness': _cleanlinessRating,
          'room': _roomRating,
          'staff': _staffRating,
          'overall': _overallRating.round(),
        },
        propertyId: _selectedBooking?.propertyId,
        hotelName: _selectedBooking?.hotel,
        room: _selectedBooking?.room,
        roomType: _selectedBooking?.roomType,
      );
    }

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (success) {
      messenger.showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Text(_isEditing ? 'Your review was updated successfully!' : 'Thank you! Your stay review was submitted.'),
            ],
          ),
          backgroundColor: emerald,
          behavior: SnackBarBehavior.floating,
        ),
      );
      navigator.pop(true);
    } else {
      messenger.showSnackBar(
        SnackBar(
          content: Text(feedbackProv.error ?? 'Failed to submit review. Please try again.'),
          backgroundColor: ruby,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final bookingProv = context.watch<GuestBookingProvider>();
    final completedBookings = bookingProv.bookings
        .where((b) => b.status.toLowerCase() == 'checked_out' || b.status.toLowerCase() == 'checked-out' || b.status.toLowerCase() == 'completed' || b.status.toLowerCase() == 'paid')
        .toList();

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: navy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          _isEditing ? 'Edit Stay Review' : 'Rate Your Experience',
          style: const TextStyle(
            color: cream,
            fontSize: 17,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Stay Information Header Box
              _buildStayInformationCard(completedBookings),
              const SizedBox(height: 16),

              // 2. Overall Star Rating Box
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [navy, navyLight],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: gold.withAlpha(80), width: 1.2),
                  boxShadow: [
                    BoxShadow(
                      color: navy.withAlpha(80),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    const Text(
                      'How was your overall stay?',
                      style: TextStyle(
                        fontSize: 16.5,
                        fontWeight: FontWeight.w800,
                        color: cream,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _getRatingSentiment(_overallRating),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: gold,
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Interactive 5 Gold Stars
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(5, (index) {
                        final starValue = (index + 1).toDouble();
                        final isFilled = starValue <= _overallRating;
                        return GestureDetector(
                          onTap: () => setState(() => _overallRating = starValue),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            child: AnimatedScale(
                              scale: isFilled ? 1.15 : 1.0,
                              duration: const Duration(milliseconds: 150),
                              child: Icon(
                                isFilled ? Icons.star_rounded : Icons.star_outline_rounded,
                                color: isFilled ? gold : Colors.white38,
                                size: 40,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // 3. Category Ratings Card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: cardBorder),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(10),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.checklist_rtl_rounded, color: purple, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Category-Wise Rating',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: navy,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Rate specific areas to help the hotel team maintain high standards.',
                      style: TextStyle(fontSize: 11.5, color: muted),
                    ),
                    const SizedBox(height: 16),

                    _buildCategoryStarSelector(
                      icon: Icons.cleaning_services_rounded,
                      label: 'Cleanliness & Hygiene',
                      value: _cleanlinessRating,
                      onChanged: (v) => setState(() => _cleanlinessRating = v),
                    ),
                    _buildCategoryStarSelector(
                      icon: Icons.bed_rounded,
                      label: 'Room Comfort & Amenities',
                      value: _roomRating,
                      onChanged: (v) => setState(() => _roomRating = v),
                    ),
                    _buildCategoryStarSelector(
                      icon: Icons.support_agent_rounded,
                      label: 'Staff Responsiveness',
                      value: _staffRating,
                      onChanged: (v) => setState(() => _staffRating = v),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // 4. Comments / Feedback Text Field
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: cardBorder),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(10),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.edit_note_rounded, color: purple, size: 22),
                        SizedBox(width: 8),
                        Text(
                          'Your Review & Comments *',
                          style: TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w800,
                            color: navy,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _commentController,
                      maxLines: 5,
                      style: const TextStyle(fontSize: 13.5, color: navy, height: 1.4),
                      decoration: InputDecoration(
                        hintText: 'What did you like the most about your stay? Any feedback for staff, room comfort, or food quality?',
                        hintStyle: const TextStyle(fontSize: 12.5, color: muted),
                        filled: true,
                        fillColor: background,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: cardBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: cardBorder),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: purple, width: 1.5),
                        ),
                        contentPadding: const EdgeInsets.all(14),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Review comments are required';
                        }
                        if (value.trim().length < 5) {
                          return 'Please enter at least 5 characters';
                        }
                        return null;
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // 5. Submit Button
              ElevatedButton.icon(
                onPressed: _isSubmitting ? null : _handleSubmit,
                icon: _isSubmitting
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Icon(_isEditing ? Icons.save_rounded : Icons.send_rounded, size: 18, color: white),
                label: Text(
                  _isSubmitting
                      ? 'Submitting Review...'
                      : (_isEditing ? 'Update Review' : 'Submit Stay Review'),
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: white,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: navy,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: gold, width: 1.2),
                  ),
                  elevation: 2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStayInformationCard(List<ReservationModel> completedBookings) {
    if (_isEditing) {
      final f = widget.existingFeedback!;
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: cardBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: cream,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: gold),
              ),
              child: const Icon(Icons.hotel_rounded, color: navy, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    f.propertyName,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: navy),
                  ),
                  Text(
                    'Booking #${f.bookingId} · Room ${f.room}',
                    style: const TextStyle(fontSize: 12, color: muted),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    if (_selectedBooking != null) {
      final b = _selectedBooking!;
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: cardBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: cream,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: gold),
              ),
              child: const Icon(Icons.hotel_rounded, color: navy, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    b.propertyName,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: navy),
                  ),
                  Text(
                    'Booking #${b.id} · Room ${b.room}',
                    style: const TextStyle(fontSize: 12, color: muted),
                  ),
                  Text(
                    '${b.checkIn} → ${b.checkOut}',
                    style: const TextStyle(fontSize: 11, color: purple, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // Selector if multiple completed bookings
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Select Completed Stay *',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navy),
          ),
          const SizedBox(height: 8),
          if (completedBookings.isEmpty)
            const Text(
              'No completed stays found. You can submit reviews once your stay checkout is completed.',
              style: TextStyle(fontSize: 12, color: muted),
            )
          else
            DropdownButtonFormField<ReservationModel>(
              initialValue: _selectedBooking ?? completedBookings.first,
              decoration: InputDecoration(
                filled: true,
                fillColor: background,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: cardBorder),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
              items: completedBookings.map((b) {
                return DropdownMenuItem<ReservationModel>(
                  value: b,
                  child: Text(
                    '#${b.id} - ${b.propertyName} (${b.room})',
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                  ),
                );
              }).toList(),
              onChanged: (b) => setState(() => _selectedBooking = b),
            ),
        ],
      ),
    );
  }

  Widget _buildCategoryStarSelector({
    required IconData icon,
    required String label,
    required int value,
    required ValueChanged<int> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: purple),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: navy),
              ),
            ],
          ),
          Row(
            children: List.generate(5, (index) {
              final star = index + 1;
              final isFilled = star <= value;
              return GestureDetector(
                onTap: () => onChanged(star),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Icon(
                    isFilled ? Icons.star_rounded : Icons.star_outline_rounded,
                    size: 24,
                    color: isFilled ? gold : const Color(0xFFCBD5E1),
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}
