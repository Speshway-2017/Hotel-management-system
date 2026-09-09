import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/api_endpoints.dart';
import 'package:hour_stay_mobile/models/user_model.dart';
import 'package:hour_stay_mobile/providers/auth_provider.dart';
import 'package:hour_stay_mobile/services/api_service.dart';

class ManagerProfileScreen extends StatefulWidget {
  const ManagerProfileScreen({super.key});

  @override
  State<ManagerProfileScreen> createState() => _ManagerProfileScreenState();
}

class _ManagerProfileScreenState extends State<ManagerProfileScreen> {
  // Hour Stay Brand Design Tokens
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

  Map<String, dynamic>? _propertyData;
  bool _isLoadingProperty = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = context.read<AuthProvider>();
      authProvider.refreshProfile();
      _fetchPropertyDetails();
    });
  }

  Future<void> _fetchPropertyDetails() async {
    setState(() => _isLoadingProperty = true);
    try {
      final res = await ApiService.get(ApiEndpoints.property);
      if (res.success && res.data != null) {
        setState(() {
          _propertyData = res.data is Map<String, dynamic> ? res.data : null;
        });
      }
    } catch (_) {
      // Ignored: fallback to user model property values
    } finally {
      if (mounted) setState(() => _isLoadingProperty = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;

    return Scaffold(
      backgroundColor: background,
      appBar: _buildAppBar(context),
      body: RefreshIndicator(
        color: purple,
        backgroundColor: white,
        onRefresh: () async {
          await authProvider.refreshProfile();
          await _fetchPropertyDetails();
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 36),
          children: [
            // 1. Hero Profile Header Card
            _buildHeroProfileCard(context, user, authProvider),
            const SizedBox(height: 16),

            // 2. Quick Operations Summary Tiles
            _buildScopeSummaryTiles(user),
            const SizedBox(height: 16),

            // 3. Assigned Property Card
            _buildAssignedPropertyCard(user),
            const SizedBox(height: 16),

            // 4. Personal Information & Contact Details Card
            _buildPersonalInfoCard(context, user, authProvider),
            const SizedBox(height: 20),

            // 5. Sign Out Action Button
            _buildSignOutButton(context, authProvider),
            const SizedBox(height: 16),

            // 6. Footer App Version
            _buildAppFooter(),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // APP BAR
  // ==========================================
  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: navy,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      leading: IconButton(
        icon: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: white.withAlpha(20),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: white.withAlpha(30)),
          ),
          child: const Icon(Icons.arrow_back_ios_new_rounded, color: white, size: 16),
        ),
        onPressed: () => Navigator.of(context).pop(),
      ),
      title: const Text(
        'Manager Profile',
        style: TextStyle(
          color: white,
          fontSize: 18,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
        ),
      ),
    );
  }

  // ==========================================
  // HERO PROFILE CARD
  // ==========================================
  Widget _buildHeroProfileCard(BuildContext context, UserModel? user, AuthProvider authProvider) {
    final name = user?.name.trim().isNotEmpty == true ? user!.name : 'Hotel Manager';
    final email = user?.email.trim().isNotEmpty == true ? user!.email : 'manager@hourstay.com';
    final roleName = (user?.role ?? 'manager').toUpperCase();
    final avatarUrl = user?.avatar;
    final initials = name.isNotEmpty ? name[0].toUpperCase() : 'M';

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
              // 1. Avatar with Upload Camera Button
              GestureDetector(
                onTap: () => _pickAndUploadImage(context, authProvider),
                child: Stack(
                  children: [
                    Container(
                      width: 78,
                      height: 78,
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
                        child: avatarUrl != null &&
                                avatarUrl.isNotEmpty &&
                                avatarUrl.startsWith('http')
                            ? Image.network(
                                avatarUrl,
                                fit: BoxFit.cover,
                                errorBuilder: (_, _, _) => Center(
                                  child: Text(
                                    initials,
                                    style: const TextStyle(
                                      fontSize: 30,
                                      fontWeight: FontWeight.w900,
                                      color: navy,
                                    ),
                                  ),
                                ),
                              )
                            : Center(
                                child: Text(
                                  initials,
                                  style: const TextStyle(
                                    fontSize: 30,
                                    fontWeight: FontWeight.w900,
                                    color: navy,
                                  ),
                                ),
                              ),
                      ),
                    ),
                    // Upload / Camera Button Badge on Profile Icon
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

              // 2. Name & Role Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 19,
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
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.verified_user_rounded, size: 12, color: gold),
                              const SizedBox(width: 4),
                              Text(
                                roleName,
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                  color: gold,
                                  letterSpacing: 0.6,
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
                            'ACTIVE',
                            style: TextStyle(
                              fontSize: 10,
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
  // SCOPE / PERMISSIONS SUMMARY TILES
  // ==========================================
  Widget _buildScopeSummaryTiles(UserModel? user) {
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
            title: 'Reservations',
            subtitle: 'Full Control',
          ),
          _buildDivider(),
          _buildSummaryItem(
            icon: Icons.approval_rounded,
            color: const Color(0xFFD97706),
            bg: const Color(0xFFFEF3C7),
            title: 'Hourly Stays',
            subtitle: 'Approvals',
          ),
          _buildDivider(),
          _buildSummaryItem(
            icon: Icons.payments_rounded,
            color: emerald,
            bg: const Color(0xFFDCFCE7),
            title: 'Billing',
            subtitle: 'Folio & UPI',
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
  // ASSIGNED PROPERTY CARD
  // ==========================================
  Widget _buildAssignedPropertyCard(UserModel? user) {
    final propName = _propertyData?['name']?.toString() ??
        user?.propertyName ??
        'Hour Stay Resort & Luxury Suites';
    final propCode = _propertyData?['propertyId']?.toString() ??
        user?.propertyId ??
        'HS-JAI';
    final address = _propertyData?['address']?.toString() ??
        _propertyData?['city']?.toString() ??
        'Jaipur, Rajasthan, India';
    final totalRooms = _propertyData?['totalRooms']?.toString() ?? '24';
    final status = _propertyData?['status']?.toString() ?? 'Active';

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
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: cream,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: gold.withAlpha(80)),
                ),
                child: const Icon(Icons.business_rounded, color: purple, size: 18),
              ),
              const SizedBox(width: 10),
              const Text(
                'Assigned Property',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: navy,
                ),
              ),
              const Spacer(),
              if (_isLoadingProperty)
                const SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: purple),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                  decoration: BoxDecoration(
                    color: emerald.withAlpha(20),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: emerald.withAlpha(50)),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: emerald,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),

          // Property Name & Code Box
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: cardBorder),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        propName,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: navy,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 13, color: muted),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              address,
                              style: const TextStyle(fontSize: 11.5, color: muted),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: navy,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    propCode,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: gold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Property specs row
          Row(
            children: [
              Expanded(
                child: _buildPropertyMiniInfo(
                  icon: Icons.meeting_room_outlined,
                  label: 'Rooms',
                  value: '$totalRooms Inventory',
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildPropertyMiniInfo(
                  icon: Icons.timer_outlined,
                  label: 'Hourly Stay',
                  value: '24h Standard',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPropertyMiniInfo({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: cardBorder),
      ),
      child: Row(
        children: [
          Icon(icon, size: 15, color: purple),
          const SizedBox(width: 6),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 10, color: muted, fontWeight: FontWeight.w500)),
                Text(
                  value,
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: navy),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // PERSONAL INFORMATION & CONTACT CARD
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
                    'Account Information',
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
            value: user?.name.isNotEmpty == true ? user!.name : 'Hotel Manager',
          ),
          const Divider(height: 18, color: cardBorder),
          _buildProfileDetailRow(
            icon: Icons.email_outlined,
            label: 'Email Address',
            value: user?.email.isNotEmpty == true ? user!.email : 'manager@hotel.com',
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
            value: user?.mobile.isNotEmpty == true ? user!.mobile : 'Add mobile number',
            isMuted: user?.mobile.isEmpty ?? true,
          ),
          const Divider(height: 18, color: cardBorder),
          _buildProfileDetailRow(
            icon: Icons.corporate_fare_outlined,
            label: 'Department',
            value: user?.dept ?? 'Front Desk & Operations',
          ),
          const Divider(height: 18, color: cardBorder),
          _buildProfileDetailRow(
            icon: Icons.schedule_outlined,
            label: 'Duty Shift',
            value: user?.shift ?? 'General / Morning Shift (06:00 - 14:00)',
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
  // SIGN OUT BUTTON
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
        'Sign Out of Property Session',
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
          'Are you sure you want to sign out from your Manager account on this device?',
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
              Navigator.of(context).popUntil((route) => route.isFirst);
              authProvider.logout();
            },
            child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // FOOTER
  // ==========================================
  Widget _buildAppFooter() {
    return const Column(
      children: [
        Text(
          'Hour Stay PMS • Manager Portal v2.4.0',
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
                          'Update Profile Details',
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
                      'Changes will be synced with the hotel PMS and MongoDB backend.',
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

                    // Full Name field
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

                    // Phone field
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

                    // Avatar URL field (optional)
                    const Text('Profile Avatar URL (Optional)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: avatarCtrl,
                      decoration: InputDecoration(
                        hintText: 'https://example.com/avatar.jpg',
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
              'Upload Profile Picture',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: navy,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Select a photo from your device to set as profile image.',
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

  Future<void> _processImagePick(
    BuildContext context,
    AuthProvider authProvider,
    ImageSource source,
  ) async {
    final picker = ImagePicker();
    final messenger = ScaffoldMessenger.of(context);

    try {
      final pickedFile = await picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (pickedFile == null) return;

      messenger.showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2, color: gold),
              ),
              SizedBox(width: 12),
              Text('Uploading profile image from device...'),
            ],
          ),
          duration: Duration(seconds: 4),
          behavior: SnackBarBehavior.floating,
        ),
      );

      final bytes = await pickedFile.readAsBytes();
      final success = await authProvider.uploadProfilePicture(
        filePath: pickedFile.path,
        fileBytes: bytes,
        fileName: pickedFile.name,
      );

      messenger.hideCurrentSnackBar();

      if (success) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Profile picture updated successfully!'),
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
      final err = e.toString();
      if (err.contains('MissingPluginException') ||
          err.contains('missingimageplugin') ||
          err.contains('No implementation found')) {
        if (context.mounted) {
          _showNativePluginRestartDialog(context, authProvider);
        }
      } else {
        messenger.showSnackBar(
          SnackBar(
            content: Text('Error picking image: $err'),
            backgroundColor: ruby,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showNativePluginRestartDialog(BuildContext context, AuthProvider authProvider) {
    final urlCtrl = TextEditingController();
    bool isSubmitting = false;
    String? modalError;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.info_outline_rounded, color: Color(0xFFD97706), size: 22),
              SizedBox(width: 8),
              Text(
                'Restart App Build',
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: navy),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'The image picker native plugin was just installed. To enable direct gallery/camera picking on your device, please restart the Flutter app (stop and run "flutter run").',
                  style: TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.4),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Quick Image URL Upload:',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: navy),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: urlCtrl,
                  decoration: InputDecoration(
                    hintText: 'https://example.com/photo.jpg',
                    prefixIcon: const Icon(Icons.link_rounded, size: 18, color: muted),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: cardBorder)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
                if (modalError != null) ...[
                  const SizedBox(height: 8),
                  Text(modalError!, style: const TextStyle(fontSize: 12, color: ruby, fontWeight: FontWeight.w600)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogCtx).pop(),
              child: const Text('Cancel', style: TextStyle(color: muted, fontWeight: FontWeight.w600)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: navy,
                foregroundColor: white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final url = urlCtrl.text.trim();
                      if (url.isEmpty) {
                        setDialogState(() => modalError = 'Please enter an image URL');
                        return;
                      }

                      setDialogState(() {
                        isSubmitting = true;
                        modalError = null;
                      });

                      final messenger = ScaffoldMessenger.of(context);
                      final success = await authProvider.updateProfile({'avatar': url});

                      if (dialogCtx.mounted) {
                        Navigator.of(dialogCtx).pop();
                      }

                      if (success) {
                        messenger.showSnackBar(
                          const SnackBar(
                            content: Text('Profile picture updated successfully!'),
                            backgroundColor: emerald,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      } else {
                        messenger.showSnackBar(
                          SnackBar(
                            content: Text(authProvider.errorMessage ?? 'Failed to update photo'),
                            backgroundColor: ruby,
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      }
                    },
              child: isSubmitting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: gold),
                    )
                  : const Text('Save URL', style: TextStyle(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }
}
