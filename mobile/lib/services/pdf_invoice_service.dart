import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:share_plus/share_plus.dart';

import '../core/utils/formatters.dart';
import '../models/reservation_model.dart';
import '../models/folio_model.dart';
import '../models/guest_payment_model.dart';

class PdfInvoiceService {
  // Brand Colors for PDF
  static final PdfColor pdfNavy = PdfColor.fromHex('#0D1B2A');
  static final PdfColor pdfGold = PdfColor.fromHex('#F5C06A');
  static final PdfColor pdfPurple = PdfColor.fromHex('#5B21B6');
  static final PdfColor pdfCream = PdfColor.fromHex('#FFF7E6');
  static final PdfColor pdfTextMuted = PdfColor.fromHex('#64748B');
  static final PdfColor pdfBgLight = PdfColor.fromHex('#F8FAFC');
  static final PdfColor pdfBorder = PdfColor.fromHex('#E2E8F0');
  static final PdfColor pdfSuccess = PdfColor.fromHex('#10B981');

  /// Helper to format currency for PDF
  static String _fmtInr(dynamic val) {
    if (val == null) return 'INR 0';
    final d = double.tryParse(val.toString()) ?? 0.0;
    return 'INR ${NumberFormat('#,##,##0.00', 'en_IN').format(d)}';
  }

  /// Extracts standard fields from either Booking, Folio, or Payment
  static Map<String, dynamic> _extractData({
    ReservationModel? booking,
    FolioModel? folio,
    GuestPaymentModel? payment,
  }) {
    final invoiceId = folio?.folioId ??
        payment?.folio?.folioId ??
        (booking != null
            ? 'INV-${booking.reservationNumber.isNotEmpty ? booking.reservationNumber : booking.id}'
            : (payment != null ? 'PAY-${payment.paymentId}' : 'INV-1001'));

    final bookingRef = booking?.reservationNumber ??
        folio?.bookingId ??
        payment?.bookingId ??
        'HS-REF-${DateTime.now().millisecondsSinceEpoch % 100000}';

    final guestName = booking?.guest ?? folio?.guestName ?? payment?.guestName ?? 'Valued Guest';
    final guestPhone = booking?.phone ?? '';
    final guestEmail = booking?.email ?? '';

    final hotelName = folio?.hotel ?? booking?.hotel ?? payment?.hotel ?? 'Hour Stay Luxury Hotel';
    final hotelCity = folio?.city ?? booking?.city ?? payment?.city ?? 'Hyderabad';
    final hotelAddress = folio?.address ?? payment?.address ?? 'Plot 12, Financial District, Gachibowli, Hyderabad, Telangana 500032';
    final gstNo = folio?.gstNo ?? payment?.gstNo ?? '36AABCS1429B1Z5';

    final roomName = folio?.room ??
        (booking != null
            ? '${booking.roomType} (Room ${booking.roomNumber.isNotEmpty ? booking.roomNumber : "Allocated at Lobby"})'
            : (payment != null ? '${payment.room} (Room ${payment.roomNumber.isNotEmpty ? payment.roomNumber : "Assigned"})' : 'Executive Suite'));

    final checkIn = Formatters.formatDateTime(folio?.checkIn ?? booking?.checkIn ?? payment?.checkIn ?? DateTime.now()).replaceAll('•', '-');
    final checkOut = Formatters.formatDateTime(folio?.checkOut ?? booking?.checkOut ?? payment?.checkOut ?? DateTime.now().add(const Duration(days: 1))).replaceAll('•', '-');

    final stayType = booking?.stayType ?? 'overnight';
    final durationText = stayType == 'hourly'
        ? '${booking?.hours ?? 3} Hours Stay'
        : '${booking?.nights ?? payment?.nights ?? 1} Night(s)';

    final double totalAmount = folio?.totalCharges ??
        booking?.amount ??
        payment?.totalAmount ??
        payment?.amount ??
        0.0;

    final double discount = folio?.discount ?? booking?.discountAmount ?? 0.0;
    final double serviceTotal = folio?.serviceTotal ?? payment?.folio?.serviceTotal ?? 0.0;

    // Calculate tax breakdown (12% standard GST included or added)
    double roomBaseTariff = folio?.roomCharges ?? payment?.folio?.roomCharges ?? 0.0;
    if (roomBaseTariff <= 0) {
      roomBaseTariff = (totalAmount - serviceTotal) / 1.12;
    }
    final double gstTotal = folio?.gstTax ?? payment?.folio?.gstTax ?? (totalAmount - (totalAmount / 1.12));
    final double cgst = gstTotal / 2;
    final double sgst = gstTotal / 2;

    final double paidAmount = folio?.paidAmount ??
        (payment?.status.toLowerCase() == 'success' || payment?.status.toLowerCase() == 'completed' || payment?.status.toLowerCase() == 'settled' || (booking?.paymentStatus.toLowerCase() == 'paid')
            ? totalAmount
            : totalAmount);

    final double balance = folio?.balance ?? payment?.balance ?? (totalAmount - paidAmount);
    final paymentMethod = booking?.paymentMethod.isNotEmpty == true
        ? booking!.paymentMethod
        : (payment?.paymentMethod.isNotEmpty == true ? payment!.paymentMethod : 'UPI / Online');

    final paymentStatus = folio?.paymentStatus ??
        booking?.paymentStatus ??
        payment?.status ??
        'Settled';

    return {
      'invoiceId': invoiceId,
      'bookingRef': bookingRef,
      'guestName': guestName,
      'guestPhone': guestPhone,
      'guestEmail': guestEmail,
      'hotelName': hotelName,
      'hotelCity': hotelCity,
      'hotelAddress': hotelAddress,
      'gstNo': gstNo,
      'roomName': roomName,
      'checkIn': checkIn,
      'checkOut': checkOut,
      'stayType': stayType,
      'durationText': durationText,
      'roomBaseTariff': roomBaseTariff,
      'serviceTotal': serviceTotal,
      'discount': discount,
      'gstTotal': gstTotal,
      'cgst': cgst,
      'sgst': sgst,
      'totalAmount': totalAmount,
      'paidAmount': paidAmount,
      'balance': balance,
      'paymentMethod': paymentMethod,
      'paymentStatus': paymentStatus,
      'issueDate': DateFormat('dd MMM yyyy, hh:mm a').format(DateTime.now()),
    };
  }

  /// Generates the raw PDF Document bytes
  static Future<Uint8List> generateInvoicePdf({
    ReservationModel? booking,
    FolioModel? folio,
    GuestPaymentModel? payment,
  }) async {
    final pdf = pw.Document(
      title: 'Hour Stay - Tax Invoice',
      author: 'Hour Stay PMS',
    );

    final data = _extractData(booking: booking, folio: folio, payment: payment);

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // ================= TOP HEADER BANNER =================
              pw.Container(
                padding: const pw.EdgeInsets.all(16),
                decoration: pw.BoxDecoration(
                  color: pdfNavy,
                  borderRadius: pw.BorderRadius.circular(8),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'HOUR STAY',
                          style: pw.TextStyle(
                            fontSize: 22,
                            fontWeight: pw.FontWeight.bold,
                            color: pdfGold,
                            letterSpacing: 1.5,
                          ),
                        ),
                        pw.SizedBox(height: 2),
                        pw.Text(
                          'Luxury Hospitality & Dynamic Stays',
                          style: pw.TextStyle(
                            fontSize: 9,
                            color: PdfColors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                        pw.SizedBox(height: 6),
                        pw.Text(
                          '${data['hotelName']} | ${data['hotelCity']}',
                          style: pw.TextStyle(fontSize: 9, color: pdfCream),
                        ),
                        pw.Text(
                          data['hotelAddress'],
                          style: const pw.TextStyle(fontSize: 8, color: PdfColors.white),
                        ),
                        pw.Text(
                          'GSTIN: ${data['gstNo']} | 24/7 Desk: +91 91234 56789',
                          style: pw.TextStyle(fontSize: 8, color: pdfGold),
                        ),
                      ],
                    ),
                    pw.Container(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: pw.BoxDecoration(
                        color: PdfColor.fromHex('#1E293B'),
                        borderRadius: pw.BorderRadius.circular(6),
                        border: pw.Border.all(color: pdfGold, width: 1),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.end,
                        children: [
                          pw.Text(
                            'TAX INVOICE',
                            style: pw.TextStyle(
                              fontSize: 12,
                              fontWeight: pw.FontWeight.bold,
                              color: pdfGold,
                              letterSpacing: 1,
                            ),
                          ),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            data['invoiceId'],
                            style: pw.TextStyle(
                              fontSize: 11,
                              fontWeight: pw.FontWeight.bold,
                              color: PdfColors.white,
                            ),
                          ),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            'Date: ${data['issueDate']}',
                            style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.white),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 16),

              // ================= GUEST & RESERVATION META =================
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Guest Info
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(12),
                      decoration: pw.BoxDecoration(
                        color: pdfBgLight,
                        borderRadius: pw.BorderRadius.circular(6),
                        border: pw.Border.all(color: pdfBorder),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            'BILLED TO (GUEST DETAILS)',
                            style: pw.TextStyle(
                              fontSize: 8.5,
                              fontWeight: pw.FontWeight.bold,
                              color: pdfPurple,
                              letterSpacing: 0.5,
                            ),
                          ),
                          pw.SizedBox(height: 6),
                          pw.Text(
                            data['guestName'],
                            style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: pdfNavy),
                          ),
                          if (data['guestPhone'].isNotEmpty) ...[
                            pw.SizedBox(height: 2),
                            pw.Text('Phone: ${data['guestPhone']}', style: const pw.TextStyle(fontSize: 9, color: PdfColors.black)),
                          ],
                          if (data['guestEmail'].isNotEmpty) ...[
                            pw.SizedBox(height: 2),
                            pw.Text('Email: ${data['guestEmail']}', style: const pw.TextStyle(fontSize: 9, color: PdfColors.black)),
                          ],
                          pw.SizedBox(height: 4),
                          pw.Text('Booking Ref: ${data['bookingRef']}', style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: pdfNavy)),
                        ],
                      ),
                    ),
                  ),

                  pw.SizedBox(width: 12),

                  // Stay Details
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(12),
                      decoration: pw.BoxDecoration(
                        color: pdfBgLight,
                        borderRadius: pw.BorderRadius.circular(6),
                        border: pw.Border.all(color: pdfBorder),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            'STAY & ACCOMMODATION',
                            style: pw.TextStyle(
                              fontSize: 8.5,
                              fontWeight: pw.FontWeight.bold,
                              color: pdfPurple,
                              letterSpacing: 0.5,
                            ),
                          ),
                          pw.SizedBox(height: 6),
                          pw.Text(
                            data['roomName'],
                            style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: pdfNavy),
                          ),
                          pw.SizedBox(height: 2),
                          pw.Text('Check-in: ${data['checkIn']}', style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.black)),
                          pw.Text('Check-out: ${data['checkOut']}', style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.black)),
                          pw.SizedBox(height: 2),
                          pw.Text('Duration: ${data['durationText']}', style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: pdfNavy)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 16),

              // ================= ITEMIZED CHARGES TABLE =================
              pw.Container(
                decoration: pw.BoxDecoration(
                  borderRadius: pw.BorderRadius.circular(6),
                  border: pw.Border.all(color: pdfBorder),
                ),
                child: pw.Column(
                  children: [
                    // Table Header
                    pw.Container(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: pw.BoxDecoration(
                        color: PdfColor.fromHex('#F1F5F9'),
                        borderRadius: const pw.BorderRadius.only(
                          topLeft: pw.Radius.circular(5),
                          topRight: pw.Radius.circular(5),
                        ),
                      ),
                      child: pw.Row(
                        children: [
                          pw.Expanded(flex: 5, child: pw.Text('DESCRIPTION / SERVICE', style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: pdfNavy))),
                          pw.Expanded(flex: 2, child: pw.Text('HSN / SAC', style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: pdfNavy), textAlign: pw.TextAlign.center)),
                          pw.Expanded(flex: 3, child: pw.Text('AMOUNT', style: pw.TextStyle(fontSize: 8.5, fontWeight: pw.FontWeight.bold, color: pdfNavy), textAlign: pw.TextAlign.right)),
                        ],
                      ),
                    ),

                    // Table Row 1: Room Tariff
                    pw.Padding(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      child: pw.Row(
                        children: [
                          pw.Expanded(
                            flex: 5,
                            child: pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text('Room Stay Tariff (${data['durationText']})', style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: pdfNavy)),
                                pw.Text(data['roomName'], style: pw.TextStyle(fontSize: 8, color: pdfTextMuted)),
                              ],
                            ),
                          ),
                          pw.Expanded(flex: 2, child: pw.Text('996311', style: const pw.TextStyle(fontSize: 8.5), textAlign: pw.TextAlign.center)),
                          pw.Expanded(flex: 3, child: pw.Text(_fmtInr(data['roomBaseTariff']), style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: pdfNavy), textAlign: pw.TextAlign.right)),
                        ],
                      ),
                    ),

                    // Table Row 2: Room Services (if any)
                    if (data['serviceTotal'] > 0) ...[
                      pw.Divider(height: 1, color: pdfBorder),
                      pw.Padding(
                        padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        child: pw.Row(
                          children: [
                            pw.Expanded(
                              flex: 5,
                              child: pw.Column(
                                crossAxisAlignment: pw.CrossAxisAlignment.start,
                                children: [
                                  pw.Text('In-Stay Services & Amenities', style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: pdfNavy)),
                                  pw.Text('F&B and Room Service add-ons', style: pw.TextStyle(fontSize: 8, color: pdfTextMuted)),
                                ],
                              ),
                            ),
                            pw.Expanded(flex: 2, child: pw.Text('996331', style: const pw.TextStyle(fontSize: 8.5), textAlign: pw.TextAlign.center)),
                            pw.Expanded(flex: 3, child: pw.Text(_fmtInr(data['serviceTotal']), style: pw.TextStyle(fontSize: 9.5, fontWeight: pw.FontWeight.bold, color: pdfNavy), textAlign: pw.TextAlign.right)),
                          ],
                        ),
                      ),
                    ],

                    // Table Row 3: Taxes (CGST & SGST)
                    pw.Divider(height: 1, color: pdfBorder),
                    pw.Padding(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      child: pw.Row(
                        children: [
                          pw.Expanded(flex: 5, child: pw.Text('Central GST (CGST @ 6.0%)', style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.black))),
                          pw.Expanded(flex: 2, child: pw.Text('GST', style: const pw.TextStyle(fontSize: 8.5), textAlign: pw.TextAlign.center)),
                          pw.Expanded(flex: 3, child: pw.Text(_fmtInr(data['cgst']), style: const pw.TextStyle(fontSize: 8.5), textAlign: pw.TextAlign.right)),
                        ],
                      ),
                    ),
                    pw.Padding(
                      padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      child: pw.Row(
                        children: [
                          pw.Expanded(flex: 5, child: pw.Text('State GST (SGST @ 6.0%)', style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.black))),
                          pw.Expanded(flex: 2, child: pw.Text('GST', style: const pw.TextStyle(fontSize: 8.5), textAlign: pw.TextAlign.center)),
                          pw.Expanded(flex: 3, child: pw.Text(_fmtInr(data['sgst']), style: const pw.TextStyle(fontSize: 8.5), textAlign: pw.TextAlign.right)),
                        ],
                      ),
                    ),

                    // Discount (if any)
                    if (data['discount'] > 0) ...[
                      pw.Divider(height: 1, color: pdfBorder),
                      pw.Padding(
                        padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        child: pw.Row(
                          children: [
                            pw.Expanded(flex: 5, child: pw.Text('Promo / Loyalty Discount', style: pw.TextStyle(fontSize: 8.5, color: pdfSuccess, fontWeight: pw.FontWeight.bold))),
                            pw.Expanded(flex: 2, child: pw.Text('-', style: const pw.TextStyle(fontSize: 8.5), textAlign: pw.TextAlign.center)),
                            pw.Expanded(flex: 3, child: pw.Text('- ${_fmtInr(data['discount'])}', style: pw.TextStyle(fontSize: 8.5, color: pdfSuccess, fontWeight: pw.FontWeight.bold), textAlign: pw.TextAlign.right)),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              pw.SizedBox(height: 14),

              // ================= TOTALS & PAYMENT SUMMARY =================
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Payment Info & Stamp
                  pw.Expanded(
                    flex: 5,
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(10),
                      decoration: pw.BoxDecoration(
                        color: pdfBgLight,
                        borderRadius: pw.BorderRadius.circular(6),
                        border: pw.Border.all(color: pdfBorder),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Row(
                            children: [
                              pw.Container(
                                padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: pw.BoxDecoration(
                                  color: pdfSuccess,
                                  borderRadius: pw.BorderRadius.circular(4),
                                ),
                                child: pw.Text(
                                  'PAID & SETTLED',
                                  style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                                ),
                              ),
                              pw.SizedBox(width: 8),
                              pw.Text(
                                'Mode: ${data['paymentMethod']}',
                                style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: pdfNavy),
                              ),
                            ],
                          ),
                          pw.SizedBox(height: 6),
                          pw.Text(
                            'Payment Ref / UTR: HS-TXN-${data['bookingRef']}',
                            style: const pw.TextStyle(fontSize: 7.5, color: PdfColors.black),
                          ),
                          pw.SizedBox(height: 2),
                          pw.Text(
                            'Folio Status: ${data['paymentStatus']} | Zero outstanding balance',
                            style: pw.TextStyle(fontSize: 7.5, color: pdfPurple, fontWeight: pw.FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),

                  pw.SizedBox(width: 14),

                  // Financial Totals Box
                  pw.Expanded(
                    flex: 5,
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(10),
                      decoration: pw.BoxDecoration(
                        color: pdfNavy,
                        borderRadius: pw.BorderRadius.circular(6),
                      ),
                      child: pw.Column(
                        children: [
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('Total Tax (12%):', style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.white)),
                              pw.Text(_fmtInr(data['gstTotal']), style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.white)),
                            ],
                          ),
                          pw.SizedBox(height: 4),
                          pw.Divider(height: 1, color: PdfColor.fromHex('#334155')),
                          pw.SizedBox(height: 4),
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('GRAND TOTAL:', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: pdfGold)),
                              pw.Text(_fmtInr(data['totalAmount']), style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: pdfGold)),
                            ],
                          ),
                          pw.SizedBox(height: 3),
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('Amount Paid:', style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.white)),
                              pw.Text(_fmtInr(data['paidAmount']), style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.white)),
                            ],
                          ),
                          pw.Row(
                            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                            children: [
                              pw.Text('Balance Due:', style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.white)),
                              pw.Text(_fmtInr(data['balance']), style: const pw.TextStyle(fontSize: 8.5, color: PdfColors.white)),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              pw.Spacer(),

              // ================= FOOTER / SIGNATURE =================
              pw.Divider(height: 1, color: pdfBorder),
              pw.SizedBox(height: 8),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Terms & Conditions:',
                        style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold, color: pdfNavy),
                      ),
                      pw.Text(
                        '1. Standard check-in is 12:00 PM and check-out is 11:00 AM (or per booked hourly slot).\n'
                        '2. Subject to local jurisdiction. This is a system generated computer tax invoice.',
                        style: const pw.TextStyle(fontSize: 6.5, color: PdfColors.grey700),
                      ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.center,
                    children: [
                      pw.Container(
                        width: 100,
                        height: 1,
                        color: pdfNavy,
                      ),
                      pw.SizedBox(height: 3),
                      pw.Text(
                        'Authorized Signatory',
                        style: pw.TextStyle(fontSize: 7.5, fontWeight: pw.FontWeight.bold, color: pdfNavy),
                      ),
                      pw.Text(
                        'Hour Stay Front Desk',
                        style: const pw.TextStyle(fontSize: 6.5, color: PdfColors.grey700),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  /// Formatted plain text receipt for sharing or copying
  static String formatReceiptText(Map<String, dynamic> data) {
    final subtotal = Formatters.currency(data['roomBaseTariff']);
    final total = Formatters.currency(data['totalAmount']);
    final paid = Formatters.currency(data['paidAmount']);
    final cgst = Formatters.currency(data['cgst']);
    final sgst = Formatters.currency(data['sgst']);

    return '''
====================================
🏨 HOUR STAY — TAX INVOICE & RECEIPT
====================================
Invoice Ref: ${data['invoiceId']}
Booking Ref: ${data['bookingRef']}
Date: ${data['issueDate']}
Hotel: ${data['hotelName']} (${data['hotelCity']})
Address: ${data['hotelAddress']}
GSTIN: ${data['gstNo']}

GUEST DETAILS
Name: ${data['guestName']}
${data['guestPhone'].isNotEmpty ? 'Phone: ${data['guestPhone']}\n' : ''}${data['guestEmail'].isNotEmpty ? 'Email: ${data['guestEmail']}\n' : ''}
STAY INFORMATION
Room: ${data['roomName']}
Check-In: ${data['checkIn']}
Check-Out: ${data['checkOut']}
Duration: ${data['durationText']}

TARIFF & CHARGES
Room Tariff: $subtotal
${data['serviceTotal'] > 0 ? 'Services / Add-ons: ${Formatters.currency(data['serviceTotal'])}\n' : ''}CGST (6.0%): $cgst
SGST (6.0%): $sgst
${data['discount'] > 0 ? 'Promo Discount: -${Formatters.currency(data['discount'])}\n' : ''}------------------------------------
GRAND TOTAL: $total
Amount Paid: $paid
Status: ${data['paymentStatus']} (Mode: ${data['paymentMethod']})
====================================
Thank you for choosing Hour Stay!
24/7 Front Desk Concierge: +91 91234 56789
====================================
''';
  }

  /// Displays an in-app digital receipt modal sheet
  static void showDigitalReceiptModal(BuildContext context, Map<String, dynamic> data) {
    final receiptText = formatReceiptText(data);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.75,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (_, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Drag Handle
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Digital Tax Receipt',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0D1B2A),
                            ),
                          ),
                          Text(
                            data['invoiceId'],
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF5B21B6),
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'PAID IN FULL',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF15803D),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24, color: Color(0xFFE2E8F0)),

                  // Property Details Box
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          data['hotelName'],
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0D1B2A)),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          data['hotelAddress'],
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'GSTIN: ${data['gstNo']} | Issue Date: ${data['issueDate']}',
                          style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: Color(0xFF0D1B2A)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Guest & Stay Info
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Billed To', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          Text(data['guestName'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0D1B2A))),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Stay Duration', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          Text(data['durationText'], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0D1B2A))),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Itemized Table
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: [
                        _buildModalRow('Room Tariff', Formatters.currency(data['roomBaseTariff'])),
                        if (data['serviceTotal'] > 0) ...[
                          const SizedBox(height: 6),
                          _buildModalRow('Services & Amenities', Formatters.currency(data['serviceTotal'])),
                        ],
                        const SizedBox(height: 6),
                        _buildModalRow('CGST (6.0%)', Formatters.currency(data['cgst'])),
                        const SizedBox(height: 6),
                        _buildModalRow('SGST (6.0%)', Formatters.currency(data['sgst'])),
                        if (data['discount'] > 0) ...[
                          const SizedBox(height: 6),
                          _buildModalRow('Discount', '-${Formatters.currency(data['discount'])}', valueColor: const Color(0xFF15803D)),
                        ],
                        const Divider(height: 16, color: Color(0xFFE2E8F0)),
                        _buildModalRow('Total Paid', Formatters.currency(data['totalAmount']), isBold: true, fontSize: 15, valueColor: const Color(0xFF5B21B6)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Action Buttons in Modal
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0D1B2A),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.copy_all_rounded, size: 18, color: Color(0xFFF5C06A)),
                          label: const Text(
                            'Copy Receipt',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: receiptText));
                            HapticFeedback.lightImpact();
                            Navigator.of(ctx).pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Receipt ${data['invoiceId']} copied to clipboard!'),
                                backgroundColor: const Color(0xFF10B981),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF0D1B2A),
                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                          padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () => Navigator.of(ctx).pop(),
                        child: const Text('Close', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  static Widget _buildModalRow(String label, String value, {bool isBold = false, double fontSize = 12.5, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            color: const Color(0xFF475569),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: valueColor ?? const Color(0xFF0D1B2A),
          ),
        ),
      ],
    );
  }

  /// Downloads the PDF directly into the mobile device's public Downloads directory
  static Future<void> downloadOrPrintInvoice(
    BuildContext context, {
    ReservationModel? booking,
    FolioModel? folio,
    GuestPaymentModel? payment,
  }) async {
    final data = _extractData(booking: booking, folio: folio, payment: payment);
    final filename = '${data['invoiceId']}.pdf';

    try {
      HapticFeedback.lightImpact();

      // 1. Generate PDF bytes
      final bytes = await generateInvoicePdf(
        booking: booking,
        folio: folio,
        payment: payment,
      );

      // 2. Save directly to phone's public Downloads directory
      String savedPath = '';
      File? targetFile;

      if (Platform.isAndroid) {
        try {
          final publicDownloadDir = Directory('/storage/emulated/0/Download');
          if (await publicDownloadDir.exists()) {
            targetFile = File('${publicDownloadDir.path}/$filename');
            await targetFile.writeAsBytes(bytes, flush: true);
            savedPath = targetFile.path;
          }
        } catch (_) {}
      }

      if (targetFile == null || savedPath.isEmpty) {
        try {
          final downloadDir = await getDownloadsDirectory() ?? await getApplicationDocumentsDirectory();
          targetFile = File('${downloadDir.path}/$filename');
          await targetFile.writeAsBytes(bytes, flush: true);
          savedPath = targetFile.path;
        } catch (_) {
          final appDir = await getApplicationDocumentsDirectory();
          targetFile = File('${appDir.path}/$filename');
          await targetFile.writeAsBytes(bytes, flush: true);
          savedPath = targetFile.path;
        }
      }

      // 3. Display success confirmation with direct option to share/open
      if (context.mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.download_done_rounded, color: Color(0xFFF5C06A), size: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Downloaded: $filename',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.white),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Saved to phone Downloads folder',
                        style: TextStyle(fontSize: 11, color: Color(0xFFE2E8F0)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            action: SnackBarAction(
              label: 'SHARE / OPEN',
              textColor: const Color(0xFFF5C06A),
              onPressed: () {
                shareInvoice(context, booking: booking, folio: folio, payment: payment);
              },
            ),
            backgroundColor: const Color(0xFF0D1B2A),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      // Graceful fallback on storage restriction
      final receiptText = formatReceiptText(data);
      await Clipboard.setData(ClipboardData(text: receiptText));

      if (context.mounted) {
        showDigitalReceiptModal(context, data);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Digital Invoice (${data['invoiceId']}) ready & copied to clipboard!',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            backgroundColor: const Color(0xFF0D1B2A),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  /// Shares the PDF file via native Share Sheet (WhatsApp, Teams, Instagram, Snapchat, etc.)
  static Future<void> shareInvoice(
    BuildContext context, {
    ReservationModel? booking,
    FolioModel? folio,
    GuestPaymentModel? payment,
  }) async {
    final data = _extractData(booking: booking, folio: folio, payment: payment);
    final filename = '${data['invoiceId']}.pdf';
    final receiptText = formatReceiptText(data);

    try {
      HapticFeedback.lightImpact();

      // 1. Generate PDF bytes and write to temp file
      final bytes = await generateInvoicePdf(
        booking: booking,
        folio: folio,
        payment: payment,
      );

      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/$filename');
      await file.writeAsBytes(bytes);

      // 2. Open System Share sheet (WhatsApp, Teams, Instagram, Snapchat, etc.)
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path, mimeType: 'application/pdf', name: filename)],
          text: 'Tax Invoice & Folio (${data['invoiceId']}) — Hour Stay Luxury Hotel\n\nGuest: ${data['guestName']}\nRoom: ${data['roomName']}\nTotal Paid: ${Formatters.currency(data['totalAmount'])}\nGSTIN: ${data['gstNo']}',
          subject: 'Tax Invoice ${data['invoiceId']} - Hour Stay',
        ),
      );
    } catch (e) {
      // Fallback 1: Share plain text to WhatsApp, Teams, Instagram, Snapchat
      try {
        await SharePlus.instance.share(
          ShareParams(
            text: receiptText,
            subject: 'Tax Invoice ${data['invoiceId']} - Hour Stay',
          ),
        );
      } catch (_) {
        // Fallback 2: Copy to clipboard & show modal
        await Clipboard.setData(ClipboardData(text: receiptText));
        if (context.mounted) {
          showDigitalReceiptModal(context, data);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Invoice details for ${data['invoiceId']} copied to clipboard for easy sharing!',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              backgroundColor: const Color(0xFF0D1B2A),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        }
      }
    }
  }
}
