import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/api_endpoints.dart';
import 'package:hour_stay_mobile/models/user_model.dart';
import 'package:hour_stay_mobile/providers/auth_provider.dart';
import 'package:hour_stay_mobile/providers/guest/guest_booking_provider.dart';
import 'package:hour_stay_mobile/providers/guest/guest_folio_provider.dart';
import '../settings/guest_settings_screen.dart';

class GuestProfileScreen extends StatefulWidget {
  const GuestProfileScreen({super.key});

  @override
  State<GuestProfileScreen> createState() => _GuestProfileScreenState();
}

class _GuestProfileScreenState extends State<GuestProfileScreen> {
  // Hour Stay Brand Design Tokens matching Manager Profile
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
  static const Color ruby = Color(0xFFE53935);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().refreshProfile();
      context.read<GuestBookingProvider>().fetchDashboardData(silent: true);
      context.read<GuestFolioProvider>().fetchMyFolios();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final bookingProvider = context.watch<GuestBookingProvider>();
    final folioProvider = context.watch<GuestFolioProvider>();
    final user = authProvider.user;

    final totalStays = bookingProvider.totalStays > 0 ? bookingProvider.totalStays : bookingProvider.bookings.length;
    final totalSpent = bookingProvider.totalSpent > 0
        ? bookingProvider.totalSpent
        : bookingProvider.bookings.fold<double>(0.0, (sum, b) => sum + b.totalAmount);

    return Scaffold(
      backgroundColor: background,
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: () async {
          await Future.wait([
            authProvider.refreshProfile(),
            bookingProvider.fetchDashboardData(),
            folioProvider.fetchMyFolios(),
          ]);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
          children: [
            // 1. Hero Profile Header Card
            _buildHeroProfileCard(context, user, authProvider),
            const SizedBox(height: 16),

            // 2. Stays & Rewards Summary Tiles
            _buildStaySummaryTiles(totalStays, totalSpent, folioProvider.folios.length),
            const SizedBox(height: 16),

            // 3. Personal Information & Contact Details Card
            _buildPersonalInfoCard(context, user, authProvider),
            const SizedBox(height: 16),

            // 4. Settings & Preferences Navigation Card
            _buildSettingsActionCard(context),
            const SizedBox(height: 20),

            // 5. Sign Out Action Button
            _buildSignOutButton(context, authProvider),
            const SizedBox(height: 16),

            // 6. App Footer
            _buildAppFooter(),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // 1. HERO PROFILE CARD
  // ==========================================
  Widget _buildHeroProfileCard(BuildContext context, UserModel? user, AuthProvider authProvider) {
    final name = user?.name.trim().isNotEmpty == true ? user!.name : 'Valued Guest';
    final email = user?.email.trim().isNotEmpty == true ? user!.email : 'guest@hourstay.com';
    final avatarUrl = user?.avatar;
    final initials = name.isNotEmpty ? name[0].toUpperCase() : 'G';

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [navy, navyLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: gold.withAlpha(90), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: navy.withAlpha(80),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Avatar with Upload Camera Button
              GestureDetector(
                onTap: () => _pickAndUploadImage(context, authProvider),
                child: Stack(
                  children: [
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: cream,
                        border: Border.all(color: gold, width: 2.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(60),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: Builder(
                          builder: (context) {
                            final resolvedUrl = ApiEndpoints.resolveImageUrl(avatarUrl);
                            if (resolvedUrl.isNotEmpty) {
                              if (resolvedUrl.startsWith('data:image')) {
                                try {
                                  final base64Str = resolvedUrl.split(',').last;
                                  return Image.memory(
                                    base64Decode(base64Str),
                                    key: ValueKey('${user?.id}_${resolvedUrl.hashCode}'),
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) => Center(
                                      child: Text(
                                        initials,
                                        style: const TextStyle(
                                          fontSize: 28,
                                          fontWeight: FontWeight.w900,
                                          color: navy,
                                        ),
                                      ),
                                    ),
                                  );
                                } catch (_) {}
                              }
                              if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
                                return Image.network(
                                  resolvedUrl,
                                  key: ValueKey('${user?.id}_${resolvedUrl.hashCode}'),
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, _, _) => Center(
                                    child: Text(
                                      initials,
                                      style: const TextStyle(
                                        fontSize: 28,
                                        fontWeight: FontWeight.w900,
                                        color: navy,
                                      ),
                                    ),
                                  ),
                                );
                              }
                            }
                            return Center(
                              child: Text(
                                initials,
                                style: const TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.w900,
                                  color: navy,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 26,
                        height: 26,
                        decoration: BoxDecoration(
                          color: gold,
                          shape: BoxShape.circle,
                          border: Border.all(color: navy, width: 2),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(60),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.camera_alt_rounded,
                          size: 13,
                          color: navy,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),

              // Name & Account Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 18.5,
                        fontWeight: FontWeight.w800,
                        color: white,
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      email,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: cream.withAlpha(200),
                        fontWeight: FontWeight.w500,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),

                    // Role Pill & Status Badge
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3.5),
                          decoration: BoxDecoration(
                            color: gold.withAlpha(40),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: gold, width: 1.2),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.verified_rounded, size: 12, color: gold),
                              SizedBox(width: 4),
                              Text(
                                'GUEST ACCOUNT',
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  color: gold,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                          decoration: BoxDecoration(
                            color: emerald.withAlpha(35),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: emerald.withAlpha(80)),
                          ),
                          child: const Text(
                            'VERIFIED',
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF6EE7B7),
                              letterSpacing: 0.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Bottom Quick Edit Banner
          InkWell(
            onTap: () {
              if (user != null) {
                _showEditProfileModal(context, user, authProvider);
              }
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: white.withAlpha(15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: white.withAlpha(30)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.manage_accounts_rounded, color: gold, size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Edit Personal & Contact Info',
                        style: TextStyle(
                          color: white,
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  Icon(Icons.arrow_forward_ios_rounded, color: gold, size: 13),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 2. STAYS & REWARDS SUMMARY TILES
  // ==========================================
  Widget _buildStaySummaryTiles(int totalStays, double totalSpent, int foliosCount) {
    String spendFormatted;
    if (totalSpent >= 100000) {
      spendFormatted = '₹${(totalSpent / 100000).toStringAsFixed(1)}L';
    } else if (totalSpent >= 1000) {
      spendFormatted = '₹${(totalSpent / 1000).toStringAsFixed(1)}k';
    } else {
      spendFormatted = '₹${totalSpent.toStringAsFixed(0)}';
    }

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
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildSummaryItem(
            icon: Icons.hotel_rounded,
            color: purple,
            bg: purpleBg,
            title: '$totalStays Stays',
            subtitle: 'Completed',
          ),
          _buildDivider(),
          _buildSummaryItem(
            icon: Icons.account_balance_wallet_rounded,
            color: const Color(0xFF2563EB),
            bg: const Color(0xFFEFF6FF),
            title: spendFormatted,
            subtitle: 'Total Spent',
          ),
          _buildDivider(),
          _buildSummaryItem(
            icon: Icons.receipt_long_rounded,
            color: emerald,
            bg: const Color(0xFFDCFCE7),
            title: '$foliosCount Folios',
            subtitle: 'Invoices & Bills',
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 36,
      color: cardBorder,
    );
  }

  Widget _buildSummaryItem({
    required IconData icon,
    required Color color,
    required Color bg,
    required String title,
    required String subtitle,
  }) {
    return Column(
      children: [
        Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(height: 6),
        Text(
          title,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: navy,
          ),
        ),
        Text(
          subtitle,
          style: const TextStyle(
            fontSize: 10.5,
            color: muted,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  // ==========================================
  // 3. PERSONAL INFORMATION & CONTACT CARD
  // ==========================================
  Widget _buildPersonalInfoCard(
    BuildContext context,
    UserModel? user,
    AuthProvider authProvider,
  ) {
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
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: const Color(0xFFDBEAFE),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.badge_outlined, color: Color(0xFF2563EB), size: 18),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Personal & Contact Info',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: navy,
                    ),
                  ),
                ],
              ),
              InkWell(
                onTap: () {
                  if (user != null) {
                    _showEditProfileModal(context, user, authProvider);
                  }
                },
                child: const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  child: Text(
                    'Edit',
                    style: TextStyle(
                      color: purple,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          _buildProfileDetailRow(
            icon: Icons.person_outline_rounded,
            label: 'Full Name',
            value: user?.name.isNotEmpty == true ? user!.name : 'Valued Guest',
          ),
          const Divider(height: 18, color: cardBorder),
          _buildProfileDetailRow(
            icon: Icons.email_outlined,
            label: 'Email Address',
            value: user?.email.isNotEmpty == true ? user!.email : 'guest@example.com',
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: emerald.withAlpha(25),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                'VERIFIED',
                style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: emerald),
              ),
            ),
          ),
          const Divider(height: 18, color: cardBorder),
          _buildProfileDetailRow(
            icon: Icons.phone_outlined,
            label: 'Phone / Mobile',
            value: user?.mobile.isNotEmpty == true ? user!.mobile : 'Tap Edit to add phone number',
            isMuted: user?.mobile.isEmpty ?? true,
          ),
          const Divider(height: 18, color: cardBorder),
          _buildProfileDetailRow(
            icon: Icons.home_outlined,
            label: 'Address / Location',
            value: user?.address.isNotEmpty == true
                ? user!.address
                : (user?.city.isNotEmpty == true ? user!.city : 'Tap Edit to add address'),
            isMuted: (user?.address.isEmpty ?? true) && (user?.city.isEmpty ?? true),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileDetailRow({
    required IconData icon,
    required String label,
    required String value,
    Widget? trailing,
    bool isMuted = false,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: muted),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 11, color: muted, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 1),
              Text(
                value,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: isMuted ? muted : navy,
                ),
              ),
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }

  // ==========================================
  // 4. SETTINGS & PREFERENCES ACTION CARD
  // ==========================================
  Widget _buildSettingsActionCard(BuildContext context) {
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
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const GuestSettingsScreen()),
            );
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: purpleBg,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.settings_outlined, color: purple, size: 22),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Settings & Preferences',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: navy,
                          letterSpacing: -0.2,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Notifications, Security, Currency & Policies',
                        style: TextStyle(
                          fontSize: 12,
                          color: muted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: background,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: cardBorder),
                  ),
                  child: const Icon(Icons.chevron_right_rounded, color: purple, size: 20),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ==========================================
  // 5. SIGN OUT BUTTON
  // ==========================================
  Widget _buildSignOutButton(BuildContext context, AuthProvider authProvider) {
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(
        foregroundColor: ruby,
        side: const BorderSide(color: Color(0xFFFECACA), width: 1.5),
        backgroundColor: const Color(0xFFFEF2F2),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      icon: const Icon(Icons.logout_rounded, size: 18, color: ruby),
      label: const Text(
        'Sign Out of Guest Account',
        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: ruby),
      ),
      onPressed: () => _confirmSignOut(context, authProvider),
    );
  }

  void _confirmSignOut(BuildContext context, AuthProvider authProvider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: ruby, size: 22),
            SizedBox(width: 8),
            Text('Sign Out', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: navy)),
          ],
        ),
        content: const Text(
          'Are you sure you want to sign out from your Hour Stay guest account on this device?',
          style: TextStyle(fontSize: 13.5, color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600, color: muted)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: ruby,
              foregroundColor: white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              authProvider.logout();
            },
            child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 6. FOOTER
  // ==========================================
  Widget _buildAppFooter() {
    return const Column(
      children: [
        Text(
          'Hour Stay PMS • Guest Portal v2.4.0',
          style: TextStyle(fontSize: 11, color: muted, fontWeight: FontWeight.w500),
        ),
        SizedBox(height: 2),
        Text(
          'Protected by Hour Stay Hotel Management Security',
          style: TextStyle(fontSize: 10, color: Color(0xFFCBD5E1)),
        ),
      ],
    );
  }

  // ==========================================
  // EDIT PROFILE MODAL
  // ==========================================
  void _showEditProfileModal(BuildContext context, UserModel user, AuthProvider authProvider) {
    final nameCtrl = TextEditingController(text: user.name);
    final mobileCtrl = TextEditingController(text: user.mobile);
    final addressCtrl = TextEditingController(text: user.address.isNotEmpty ? user.address : user.city);
    final avatarCtrl = TextEditingController(text: user.avatar ?? '');
    bool isSaving = false;
    String? formError;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              decoration: const BoxDecoration(
                color: white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              padding: EdgeInsets.fromLTRB(
                20,
                16,
                20,
                MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle bar
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: cardBorder,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Title
                    const Row(
                      children: [
                        Icon(Icons.edit_note_rounded, color: purple, size: 24),
                        SizedBox(width: 8),
                        Text(
                          'Update Guest Details',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: navy,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Changes will be synced with your Hour Stay account in MongoDB.',
                      style: TextStyle(fontSize: 12.5, color: muted),
                    ),
                    const SizedBox(height: 20),

                    if (formError != null) ...[
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEE2E2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: ruby, size: 16),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                formError!,
                                style: const TextStyle(fontSize: 12, color: ruby, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    // Full Name
                    const Text('Full Name', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: nameCtrl,
                      decoration: InputDecoration(
                        hintText: 'Enter full name',
                        prefixIcon: const Icon(Icons.person_outline, size: 18, color: muted),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: cardBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: cardBorder)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: purple, width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Phone
                    const Text('Phone / Mobile', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: mobileCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        hintText: '+91 9876543210',
                        prefixIcon: const Icon(Icons.phone_outlined, size: 18, color: muted),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: cardBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: cardBorder)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: purple, width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Address / City
                    const Text('Address / Location', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: addressCtrl,
                      decoration: InputDecoration(
                        hintText: 'e.g. Jaipur, Rajasthan, India',
                        prefixIcon: const Icon(Icons.home_outlined, size: 18, color: muted),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: cardBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: cardBorder)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: purple, width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Avatar URL (optional)
                    const Text('Profile Photo URL (Optional)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: avatarCtrl,
                      decoration: InputDecoration(
                        hintText: 'https://example.com/photo.jpg',
                        prefixIcon: const Icon(Icons.image_outlined, size: 18, color: muted),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: cardBorder)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: cardBorder)),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: purple, width: 1.5)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Action buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: navy,
                              side: const BorderSide(color: cardBorder),
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () => Navigator.of(ctx).pop(),
                            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: navy,
                              foregroundColor: white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 13),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                                side: const BorderSide(color: gold, width: 1.2),
                              ),
                            ),
                            onPressed: isSaving
                                ? null
                                : () async {
                                    final name = nameCtrl.text.trim();
                                    final mobile = mobileCtrl.text.trim();
                                    final address = addressCtrl.text.trim();
                                    final avatar = avatarCtrl.text.trim();

                                    if (name.isEmpty) {
                                      setModalState(() => formError = 'Name cannot be empty');
                                      return;
                                    }

                                    setModalState(() {
                                      isSaving = true;
                                      formError = null;
                                    });

                                    final updateMap = <String, dynamic>{
                                      'name': name,
                                      'mobile': mobile,
                                      'address': address,
                                      'city': address,
                                    };
                                    if (avatar.isNotEmpty) {
                                      updateMap['avatar'] = avatar;
                                    }

                                    final messenger = ScaffoldMessenger.of(context);
                                    final success = await authProvider.updateProfile(updateMap);

                                    if (success) {
                                      if (ctx.mounted) {
                                        Navigator.of(ctx).pop();
                                      }
                                      messenger.showSnackBar(
                                        const SnackBar(
                                          content: Text('Profile updated successfully!'),
                                          backgroundColor: emerald,
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    } else {
                                      setModalState(() {
                                        isSaving = false;
                                        formError = authProvider.errorMessage ?? 'Failed to update profile';
                                      });
                                    }
                                  },
                            child: isSaving
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: gold),
                                  )
                                : const Text(
                                    'Save Changes',
                                    style: TextStyle(fontWeight: FontWeight.w800, color: white),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  // ==========================================
  // DEVICE IMAGE PICK & UPLOAD
  // ==========================================
  Future<void> _pickAndUploadImage(BuildContext context, AuthProvider authProvider) async {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: cardBorder,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Upload Profile Photo',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Select a photo from your device to set as your profile avatar.',
              style: TextStyle(fontSize: 12.5, color: muted),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: purpleBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.photo_library_rounded, color: purple, size: 22),
              ),
              title: const Text(
                'Choose from Gallery',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: navy),
              ),
              subtitle: const Text('Pick an existing photo from device storage', style: TextStyle(fontSize: 11.5, color: muted)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: cardBorder),
              ),
              onTap: () {
                Navigator.of(ctx).pop();
                _processImagePick(context, authProvider, ImageSource.gallery);
              },
            ),
            const SizedBox(height: 12),
            ListTile(
              leading: Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.camera_alt_rounded, color: Color(0xFFD97706), size: 22),
              ),
              title: const Text(
                'Take Photo',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: navy),
              ),
              subtitle: const Text('Use camera to capture a new profile photo', style: TextStyle(fontSize: 11.5, color: muted)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: cardBorder),
              ),
              onTap: () {
                Navigator.of(ctx).pop();
                _processImagePick(context, authProvider, ImageSource.camera);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _processImagePick(BuildContext context, AuthProvider authProvider, ImageSource source) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: source,
        maxWidth: 600,
        maxHeight: 600,
        imageQuality: 85,
      );

      if (image == null) return;

      messenger.showSnackBar(
        const SnackBar(
          content: Text('Uploading profile photo...'),
          duration: Duration(seconds: 1),
          behavior: SnackBarBehavior.floating,
        ),
      );

      final bytes = await image.readAsBytes();
      final success = await authProvider.uploadProfilePicture(
        filePath: image.path,
        fileBytes: bytes,
        fileName: image.name,
      );

      if (success) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Profile photo uploaded successfully!'),
            backgroundColor: emerald,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text(authProvider.errorMessage ?? 'Failed to upload photo'),
            backgroundColor: ruby,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Error selecting image: $e'),
          backgroundColor: ruby,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}
