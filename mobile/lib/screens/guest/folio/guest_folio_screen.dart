import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/utils/formatters.dart';
import 'package:hour_stay_mobile/models/folio_model.dart';
import 'package:hour_stay_mobile/models/guest_payment_model.dart';
import 'package:hour_stay_mobile/models/reservation_model.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import 'package:hour_stay_mobile/providers/guest/guest_folio_provider.dart';
import 'package:hour_stay_mobile/widgets/empty_state.dart';
import 'package:hour_stay_mobile/widgets/status_badge.dart';
import 'package:hour_stay_mobile/services/pdf_invoice_service.dart';

class GuestFolioScreen extends StatefulWidget {
  final ReservationModel? booking;
  final String? bookingId;
  final FolioModel? folio;
  final GuestPaymentModel? payment;

  const GuestFolioScreen({
    super.key,
    this.booking,
    this.bookingId,
    this.folio,
    this.payment,
  });

  @override
  State<GuestFolioScreen> createState() => _GuestFolioScreenState();
}

class _GuestFolioScreenState extends State<GuestFolioScreen> {
  // Brand Design Tokens
  static const Color navy = Color(0xFF0D1B2A);
  static const Color navyLight = Color(0xFF1B2A4A);
  static const Color purple = Color(0xFF5B21B6);
  static const Color purpleBg = Color(0xFFEDE9FE);
  static const Color gold = Color(0xFFF5C06A);
  static const Color cream = Color(0xFFFFF7E6);
  static const Color white = Color(0xFFFFFFFF);
  static const Color muted = Color(0xFF8A8F98);
  static const Color background = Color(0xFFF8FAFC);
  static const Color cardBorder = Color(0xFFE2E8F0);
  static const Color emerald = Color(0xFF10B981);
  static const Color emeraldBg = Color(0xFFDCFCE7);
  static const Color emeraldDark = Color(0xFF047857);
  static const Color ruby = Color(0xFFE53935);

  ReservationModel? _activeBooking;
  FolioModel? _activeFolio;

  @override
  void initState() {
    super.initState();
    _activeBooking = widget.booking;
    _activeFolio = widget.folio;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GuestFolioProvider>().fetchMyFolios(silent: true);
      context.read<GuestBookingProvider>().fetchMyBookings(silent: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final folioProvider = context.watch<GuestFolioProvider>();
    final bookingProvider = context.watch<GuestBookingProvider>();

    // Target lookup ID
    final lookupId = widget.bookingId ?? widget.payment?.bookingId ?? _activeBooking?.id;

    // Resolve target booking if bookingId or payment was provided
    ReservationModel? resolvedBooking = _activeBooking;
    if (resolvedBooking == null && lookupId != null && lookupId.isNotEmpty) {
      try {
        resolvedBooking = bookingProvider.bookings.firstWhere(
          (b) => b.id == lookupId || b.bookingId == lookupId,
        );
      } catch (_) {}
    }

    // Resolve target folio if not directly provided
    FolioModel? resolvedFolio = _activeFolio;
    if (resolvedFolio == null && lookupId != null && lookupId.isNotEmpty) {
      try {
        resolvedFolio = folioProvider.folios.firstWhere(
          (f) => f.bookingId == lookupId || f.folioId == lookupId,
        );
      } catch (_) {}
    }

    final hasSpecificTarget = resolvedBooking != null || resolvedFolio != null || widget.payment != null;

    final displayStayNumber = resolvedBooking != null
        ? (resolvedBooking.bookingId.isNotEmpty ? resolvedBooking.bookingId : resolvedBooking.id)
        : (widget.payment?.bookingId.isNotEmpty == true
            ? widget.payment!.bookingId
            : (resolvedFolio?.folioId ?? ''));

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: navy,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Digital Folio & Stay Invoice',
              style: TextStyle(
                fontSize: 16.5,
                fontWeight: FontWeight.w800,
                color: cream,
                letterSpacing: -0.2,
              ),
            ),
            if (hasSpecificTarget && displayStayNumber.isNotEmpty) ...[
              const SizedBox(height: 1),
              Text(
                'Stay #$displayStayNumber',
                style: TextStyle(
                  fontSize: 11.5,
                  color: cream.withAlpha(180),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        ),
      ),
      body: hasSpecificTarget
          ? _buildBookingFolioDetailView(context, resolvedBooking, resolvedFolio, widget.payment)
          : _buildAllFoliosListView(context, folioProvider, bookingProvider),
    );
  }

  // ==========================================
  // SPECIFIC BOOKING FOLIO DETAIL VIEW
  // ==========================================
  Widget _buildBookingFolioDetailView(
    BuildContext context,
    ReservationModel? booking,
    FolioModel? folio,
    GuestPaymentModel? payment,
  ) {
    final hotelName = booking?.propertyName ?? payment?.hotel ?? folio?.hotel ?? 'Hour Stay Luxury Hotel';
    final address = payment?.address ?? folio?.address ?? 'Hitech City, Hyderabad, Telangana';
    final gstNo = payment?.gstNo ?? folio?.gstNo ?? '36AABCS1429B1Z5';

    final folioNumber = folio?.folioId ??
        payment?.folio?.folioId ??
        'FOL-${booking != null ? (booking.bookingId.isNotEmpty ? booking.bookingId : (booking.id.length > 8 ? booking.id.substring(0, 8).toUpperCase() : booking.id.toUpperCase())) : (payment != null ? (payment.bookingId.isNotEmpty ? payment.bookingId : payment.paymentId) : "1001")}';

    final guestName = booking?.guestName ?? payment?.guestName ?? folio?.guestName ?? 'Guest User';
    final roomName = booking?.room ?? payment?.room ?? folio?.room ?? 'Room 101';
    final roomType = booking?.roomType ?? 'Standard Room';

    final checkIn = booking?.checkIn ?? (payment?.checkIn.isNotEmpty == true ? payment!.checkIn : (folio?.checkIn ?? ''));
    final checkOut = booking?.checkOut ?? (payment?.checkOut.isNotEmpty == true ? payment!.checkOut : (folio?.checkOut ?? ''));

    final totalAmount = booking?.totalAmount ??
        (payment != null ? (payment.totalAmount > 0 ? payment.totalAmount : payment.amount) : (folio?.totalCharges ?? 0.0));
    final discount = booking?.discountAmount ?? payment?.folio?.discount ?? folio?.discount ?? 0.0;

    // Accurate GST calculation (18% inclusive/itemized)
    final roomCharges = payment?.folio?.roomCharges ??
        folio?.roomCharges ??
        (totalAmount > 0 ? (totalAmount * 0.82) : (booking?.amount ?? 0.0) * 0.82);
    final gstTax = payment?.folio?.gstTax ??
        folio?.gstTax ??
        (totalAmount > 0 ? (totalAmount * 0.18) : (booking?.amount ?? 0.0) * 0.18);

    final rawStatus = booking?.paymentStatus ?? payment?.status ?? folio?.paymentStatus ?? 'Settled';
    final paymentStatus = rawStatus.isNotEmpty ? rawStatus : 'Settled';
    final stLower = paymentStatus.toLowerCase();
    final isSettled = stLower == 'paid' ||
        stLower == 'settled' ||
        stLower == 'confirmed' ||
        stLower == 'successful' ||
        stLower == 'completed';

    final paidAmount = isSettled
        ? (payment != null && payment.paidAmount > 0 ? payment.paidAmount : totalAmount)
        : (payment?.paidAmount ?? folio?.paidAmount ?? 0.0);
    final balance = isSettled
        ? 0.0
        : (booking?.balance ?? payment?.balance ?? folio?.balance ?? totalAmount);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1. Digital Tax Invoice Header Banner
          Container(
            padding: const EdgeInsets.all(18),
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
                  color: navy.withAlpha(60),
                  blurRadius: 14,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: gold.withAlpha(30),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: gold, width: 1),
                          ),
                          child: const Icon(Icons.receipt_long_rounded, color: gold, size: 20),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'TAX INVOICE & FOLIO',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: gold,
                                letterSpacing: 0.8,
                              ),
                            ),
                            Text(
                              folioNumber,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                color: white,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: isSettled ? emerald.withAlpha(30) : ruby.withAlpha(30),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isSettled ? emerald : ruby,
                          width: 1.2,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            isSettled ? Icons.check_circle_rounded : Icons.pending_rounded,
                            size: 13,
                            color: isSettled ? emerald : ruby,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isSettled ? 'SETTLED' : paymentStatus.toUpperCase(),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: isSettled ? emerald : ruby,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Divider(color: Colors.white12, height: 1),
                const SizedBox(height: 14),

                // Hotel & GSTIN Meta
                Text(
                  hotelName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: cream,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  address,
                  style: TextStyle(fontSize: 12, color: cream.withAlpha(180)),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'GSTIN: $gstNo · SAC Code: 996311 (Hotel Accommodation)',
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                      color: cream,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. Stay & Guest Overview Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: cardBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(8),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.person_pin_circle_rounded, color: purple, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Stay & Guest Details',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: navy,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _buildInfoRow('Guest Name', guestName, Icons.person_outline_rounded),
                const SizedBox(height: 8),
                _buildInfoRow('Room Assigned', '$roomName · $roomType', Icons.meeting_room_outlined),
                const SizedBox(height: 8),
                _buildInfoRow(
                  'Stay Type',
                  booking?.stayType == 'hourly'
                      ? 'Flexible Hourly Stay (${booking?.hours ?? 3} Hours)'
                      : 'Overnight Stay (${booking?.nights ?? payment?.nights ?? 1} Night${(booking?.nights ?? payment?.nights ?? 1) > 1 ? "s" : ""})',
                  Icons.schedule_rounded,
                ),
                if (checkIn.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _buildInfoRow(
                    'Check-In & Check-Out',
                    checkOut.isNotEmpty
                        ? '${Formatters.date(checkIn)} → ${Formatters.date(checkOut)}'
                        : Formatters.date(checkIn),
                    Icons.calendar_today_rounded,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 3. Itemized Tariff Breakdown Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: cardBorder),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(8),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.account_balance_wallet_rounded, color: purple, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Itemized Billing Breakdown',
                      style: TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: navy,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                _buildPriceRow('Room Stay Tariff', roomCharges),
                _buildPriceRow('GST Taxes (18%)', gstTax),
                if (discount > 0)
                  _buildPriceRow('Promotional Discount', -discount, isDiscount: true),

                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 10),
                  child: Divider(color: cardBorder, height: 1),
                ),

                _buildPriceRow('Total Stay Charges', totalAmount, isBold: true),
                _buildPriceRow('Total Amount Paid', paidAmount, isBold: true, color: emeraldDark),
                if (balance > 0)
                  _buildPriceRow('Outstanding Balance', balance, isBold: true, color: ruby),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4. Digital Verification Stamp
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: emeraldBg.withAlpha(120),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: emerald.withAlpha(80)),
            ),
            child: Row(
              children: [
                const Icon(Icons.verified_user_rounded, color: emeraldDark, size: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Digitally Verified Stay Folio',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: emeraldDark,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Generated directly from Hour Stay Central PMS. Valid for tax deductions and corporate reimbursements.',
                        style: TextStyle(
                          fontSize: 11,
                          color: emeraldDark.withAlpha(200),
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 5. Action Buttons (Download & Share)
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navy,
                    foregroundColor: white,
                    elevation: 2,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: const BorderSide(color: gold, width: 1.2),
                    ),
                  ),
                  icon: const Icon(Icons.download_rounded, color: gold, size: 18),
                  label: const Text(
                    'Download PDF',
                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: white),
                  ),
                  onPressed: () => _handleDownloadPdf(context, booking, folio, payment),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: navy,
                    side: const BorderSide(color: cardBorder, width: 1.2),
                    backgroundColor: white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: const Icon(Icons.share_outlined, color: navy, size: 18),
                  label: const Text(
                    'Share Receipt',
                    style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
                  ),
                  onPressed: () => _handleShareFolio(context, booking, folio, payment),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================
  // ALL FOLIOS LIST VIEW (WHEN NO SPECIFIC TARGET)
  // ==========================================
  Widget _buildAllFoliosListView(
    BuildContext context,
    GuestFolioProvider folioProvider,
    GuestBookingProvider bookingProvider,
  ) {
    final folios = folioProvider.folios;
    final bookings = bookingProvider.bookings;

    if (folioProvider.isLoading && folios.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: gold));
    }

    if (folios.isEmpty && bookings.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async {
          await folioProvider.fetchMyFolios();
          await bookingProvider.fetchMyBookings();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.7,
            child: EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No Digital Folios Found',
              message: 'Your itemized receipts, stay invoices, and settled bills will appear here once generated.',
              actionText: 'Refresh Stays',
              onAction: () {
                folioProvider.fetchMyFolios();
                bookingProvider.fetchMyBookings();
              },
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        await folioProvider.fetchMyFolios();
        await bookingProvider.fetchMyBookings();
      },
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
        itemCount: bookings.isNotEmpty ? bookings.length : folios.length,
        separatorBuilder: (_, _) => const SizedBox(height: 14),
        itemBuilder: (context, index) {
          if (bookings.isNotEmpty) {
            final b = bookings[index];
            return _buildBookingFolioCard(context, b);
          } else {
            final f = folios[index];
            return _buildGenericFolioCard(context, f);
          }
        },
      ),
    );
  }

  Widget _buildBookingFolioCard(BuildContext context, ReservationModel b) {
    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(6),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            setState(() {
              _activeBooking = b;
            });
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(7),
                          decoration: BoxDecoration(
                            color: purpleBg,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.receipt_long_rounded, color: purple, size: 18),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'FOL-${b.bookingId.isNotEmpty ? b.bookingId : b.id}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 14.5,
                                color: navy,
                              ),
                            ),
                            Text(
                              'Room ${b.room} · ${b.propertyName}',
                              style: const TextStyle(fontSize: 11.5, color: muted),
                            ),
                          ],
                        ),
                      ],
                    ),
                    StatusBadge(status: b.paymentStatus.isNotEmpty ? b.paymentStatus : b.status),
                  ],
                ),
                const SizedBox(height: 12),
                const Divider(color: cardBorder, height: 1),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Total Charges', style: TextStyle(fontSize: 11, color: muted)),
                        Text(
                          Formatters.currency(b.totalAmount),
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: navy,
                          ),
                        ),
                      ],
                    ),
                    Wrap(
                      spacing: 6,
                      children: [
                        IconButton.outlined(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: cardBorder),
                            padding: const EdgeInsets.all(6),
                            minimumSize: const Size(34, 34),
                          ),
                          icon: const Icon(Icons.share_outlined, size: 15, color: navy),
                          tooltip: 'Share Receipt',
                          onPressed: () => PdfInvoiceService.shareInvoice(context, booking: b),
                        ),
                        IconButton.outlined(
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: cardBorder),
                            padding: const EdgeInsets.all(6),
                            minimumSize: const Size(34, 34),
                          ),
                          icon: const Icon(Icons.download_rounded, size: 16, color: navy),
                          tooltip: 'Download PDF',
                          onPressed: () => PdfInvoiceService.downloadOrPrintInvoice(context, booking: b),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: navy,
                            foregroundColor: white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            setState(() {
                              _activeBooking = b;
                            });
                          },
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('Digital Folio', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                              SizedBox(width: 4),
                              Icon(Icons.arrow_forward_ios_rounded, size: 11, color: gold),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildGenericFolioCard(BuildContext context, FolioModel f) {
    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cardBorder),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(14),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: purpleBg, borderRadius: BorderRadius.circular(8)),
          child: const Icon(Icons.receipt_long_rounded, color: purple),
        ),
        title: Text(f.folioId, style: const TextStyle(fontWeight: FontWeight.bold, color: navy)),
        subtitle: Text('${f.hotel} · ${Formatters.currency(f.totalCharges)}'),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: muted),
        onTap: () {
          setState(() {
            _activeFolio = f;
          });
        },
      ),
    );
  }

  // --- Helper Widgets ---
  Widget _buildInfoRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: muted),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: const TextStyle(fontSize: 12.5, color: muted, fontWeight: FontWeight.w500),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: navy),
            textAlign: TextAlign.end,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _buildPriceRow(String label, double amount, {bool isBold = false, bool isDiscount = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isBold ? 13.5 : 12.5,
              fontWeight: isBold ? FontWeight.w800 : FontWeight.w500,
              color: isBold ? navy : const Color(0xFF4B5563),
            ),
          ),
          Text(
            isDiscount ? '- ${Formatters.currency(amount.abs())}' : Formatters.currency(amount),
            style: TextStyle(
              fontSize: isBold ? 15 : 13,
              fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
              color: color ?? (isDiscount ? ruby : (isBold ? navy : const Color(0xFF1E293B))),
            ),
          ),
        ],
      ),
    );
  }

  // --- Actions ---
  void _handleDownloadPdf(BuildContext context, ReservationModel? booking, FolioModel? folio, GuestPaymentModel? payment) {
    PdfInvoiceService.downloadOrPrintInvoice(
      context,
      booking: booking,
      folio: folio,
      payment: payment,
    );
  }

  void _handleShareFolio(BuildContext context, ReservationModel? booking, FolioModel? folio, GuestPaymentModel? payment) {
    PdfInvoiceService.shareInvoice(
      context,
      booking: booking,
      folio: folio,
      payment: payment,
    );
  }
}
