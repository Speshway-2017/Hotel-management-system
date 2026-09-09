import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../models/guest_model.dart';
import '../../../providers/manager/guest_provider.dart';
import '../../../providers/manager/reservation_provider.dart';

class ManagerGuestsScreen extends StatefulWidget {
  const ManagerGuestsScreen({super.key});

  @override
  State<ManagerGuestsScreen> createState() => _ManagerGuestsScreenState();
}

class _ManagerGuestsScreenState extends State<ManagerGuestsScreen> {
  String _searchQuery = '';
  String _selectedStatus = 'All';

  final List<String> _statusFilters = ['All', 'Checked-in', 'Confirmed', 'Checked-out', 'Pending'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GuestProvider>().fetchGuests();
    });
  }

  @override
  Widget build(BuildContext context) {
    final guestProvider = context.watch<GuestProvider>();
    final guests = guestProvider.guests;

    final filteredGuests = guests.where((g) {
      final matchesSearch = g.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          g.phone.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          g.room.toLowerCase().contains(_searchQuery.toLowerCase());

      final matchesStatus = _selectedStatus == 'All' ||
          g.status.toLowerCase() == _selectedStatus.toLowerCase() ||
          (g.status.toLowerCase().contains('check') && _selectedStatus == 'Checked-in' && g.status.toLowerCase().contains('in'));

      return matchesSearch && matchesStatus;
    }).toList();

    final totalCount = guests.length;
    final inHouseCount = guests.where((g) => g.status.toLowerCase().contains('in') && g.status.toLowerCase().contains('check')).length;
    final confirmedCount = guests.where((g) => g.status.toLowerCase() == 'confirmed').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Guest CRM & Directory'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () => guestProvider.fetchGuests(),
          ),
        ],
      ),
      body: guestProvider.isLoading && guests.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => guestProvider.fetchGuests(),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // KPI stats row
                  Row(
                    children: [
                      Expanded(
                        child: _buildKpiCard(
                          title: 'TOTAL GUESTS',
                          value: '$totalCount',
                          subtitle: 'All historical & active',
                          color: AppColors.primary,
                          icon: Icons.people_alt_outlined,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildKpiCard(
                          title: 'IN-HOUSE',
                          value: '$inHouseCount',
                          subtitle: 'Currently staying',
                          color: AppColors.success,
                          icon: Icons.meeting_room_outlined,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildKpiCard(
                          title: 'CONFIRMED',
                          value: '$confirmedCount',
                          subtitle: 'Upcoming arrivals',
                          color: AppColors.secondary,
                          icon: Icons.calendar_today_outlined,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Search bar
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Search guests by name, phone, or room...',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () => setState(() => _searchQuery = ''),
                            )
                          : null,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onChanged: (val) => setState(() => _searchQuery = val),
                  ),
                  const SizedBox(height: 12),

                  // Filter chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _statusFilters.map((status) {
                        final isSelected = _selectedStatus == status;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(status),
                            selected: isSelected,
                            onSelected: (selected) {
                              setState(() => _selectedStatus = status);
                            },
                            selectedColor: AppColors.primary.withAlpha(40),
                            checkmarkColor: AppColors.primary,
                            labelStyle: TextStyle(
                              color: isSelected ? AppColors.primary : AppColors.textSecondary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              fontSize: 12,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Guest List
                  if (filteredGuests.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          children: [
                            Icon(Icons.person_search_outlined, size: 48, color: Colors.grey[400]),
                            const SizedBox(height: 12),
                            Text(
                              _searchQuery.isEmpty ? 'No guests found' : 'No guests matching "$_searchQuery"',
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 16),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ...filteredGuests.map((guest) => _buildGuestCard(guest)),
                ],
              ),
            ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required String subtitle,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withAlpha(40)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(10),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.8,
                  color: AppColors.textSecondary,
                ),
              ),
              Icon(icon, size: 16, color: color),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 9, color: AppColors.textSecondary),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildGuestCard(GuestModel guest) {
    final statusColor = _getStatusColor(guest.status);
    final isPaid = guest.paymentStatus.toLowerCase() == 'paid';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.withAlpha(30)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showGuestDetailsModal(guest),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.primary.withAlpha(30),
                    child: Text(
                      guest.name.isNotEmpty ? guest.name[0].toUpperCase() : 'G',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        fontSize: 16,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Text(
                                guest.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: statusColor.withAlpha(30),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                guest.status,
                                style: TextStyle(
                                  color: statusColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.phone_outlined, size: 13, color: AppColors.textSecondary),
                            const SizedBox(width: 4),
                            Text(
                              guest.phone,
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                            const SizedBox(width: 12),
                            const Icon(Icons.meeting_room_outlined, size: 13, color: AppColors.textSecondary),
                            const SizedBox(width: 4),
                            Text(
                              'Room ${guest.room}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.date_range_outlined, size: 14, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        '${_formatDate(guest.checkIn)} → ${_formatDate(guest.checkOut)}',
                        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isPaid ? AppColors.success.withAlpha(20) : AppColors.warning.withAlpha(20),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      isPaid ? 'PAID' : 'PENDING',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isPaid ? AppColors.success : AppColors.warning,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showGuestDetailsModal(GuestModel guest) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Guest Stay Profile',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  radius: 24,
                  backgroundColor: AppColors.primary.withAlpha(30),
                  child: Text(
                    guest.name.isNotEmpty ? guest.name[0].toUpperCase() : 'G',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ),
                title: Text(guest.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                subtitle: Text('Booking ID: ${guest.bookingId}'),
              ),
              const Divider(),
              _buildDetailRow(Icons.phone, 'Phone Number', guest.phone),
              _buildDetailRow(Icons.meeting_room, 'Assigned Room', guest.room),
              _buildDetailRow(Icons.login, 'Check-In', guest.checkIn.isNotEmpty ? guest.checkIn : '—'),
              _buildDetailRow(Icons.logout, 'Check-Out', guest.checkOut.isNotEmpty ? guest.checkOut : '—'),
              _buildDetailRow(Icons.info_outline, 'Stay Status', guest.status),
              _buildDetailRow(Icons.payment, 'Payment Status', guest.paymentStatus),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.arrow_forward),
                  label: const Text('View Full Reservation Record'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    // Open reservation
                    final resProvider = context.read<ReservationProvider>();
                    final matched = resProvider.reservations.firstWhere(
                      (r) => r.id == guest.bookingId || r.bookingId == guest.bookingId,
                      orElse: () => resProvider.reservations.first,
                    );
                    Navigator.of(context).pushNamed(
                      '/manager-reservation-detail',
                      arguments: matched,
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppColors.textSecondary),
          const SizedBox(width: 10),
          Text(
            '$label: ',
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              textAlign: TextAlign.end,
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'checked-in':
      case 'checked in':
        return AppColors.success;
      case 'confirmed':
        return AppColors.primary;
      case 'pending':
        return AppColors.warning;
      case 'checked-out':
      case 'checked out':
        return AppColors.textSecondary;
      case 'cancelled':
        return AppColors.error;
      default:
        return AppColors.primary;
    }
  }

  String _formatDate(String dateStr) {
    if (dateStr.isEmpty) return '—';
    try {
      final dt = DateTime.parse(dateStr);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return dateStr;
    }
  }
}
