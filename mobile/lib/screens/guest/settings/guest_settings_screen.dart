import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/api_endpoints.dart';
import '../../../models/user_model.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/guest/guest_settings_provider.dart';
import 'package:hour_stay_mobile/colours.dart';

class GuestSettingsScreen extends StatefulWidget {
  const GuestSettingsScreen({super.key});

  @override
  State<GuestSettingsScreen> createState() => _GuestSettingsScreenState();
}

class _GuestSettingsScreenState extends State<GuestSettingsScreen> {

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<GuestSettingsProvider>().fetchSettings(silent: true);
      context.read<AuthProvider>().refreshProfile();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final settingsProvider = context.watch<GuestSettingsProvider>();
    final user = authProvider.user;

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: navy,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: gold, size: 20),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: const Text(
          'Settings',
          style: TextStyle(
            color: cream,
            fontSize: 18,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.3,
          ),
        ),
      ),
      body: settingsProvider.isLoading
          ? const Center(
              child: CircularProgressIndicator(color: purple),
            )
          : RefreshIndicator(
              color: purple,
              backgroundColor: white,
              onRefresh: () async {
                await Future.wait([
                  settingsProvider.fetchSettings(),
                  authProvider.refreshProfile(),
                ]);
              },
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                children: [
                  // 1. Account Settings Card with Edit Action
                  _buildAccountSection(user, authProvider),
                  const SizedBox(height: 20),

                  // 2. Notifications Section
                  _buildNotificationSection(settingsProvider),
                  const SizedBox(height: 20),

                  // 3. Privacy & Security Section
                  _buildPrivacySecuritySection(user, settingsProvider),
                  const SizedBox(height: 20),

                  // 4. Help & Support Section
                  _buildHelpSupportSection(settingsProvider),
                  const SizedBox(height: 24),

                  // 5. Logout Section
                  _buildSignOutSection(authProvider),
                  const SizedBox(height: 20),

                  // Footer Status
                  _buildFooter(),
                ],
              ),
            ),
    );
  }

  // ==========================================
  // 1. ACCOUNT SETTINGS CARD
  // ==========================================
  Widget _buildAccountSection(UserModel? user, AuthProvider authProvider) {
    final name = user?.name.trim().isNotEmpty == true ? user!.name : 'Valued Guest';
    final email = user?.email.trim().isNotEmpty == true ? user!.email : 'guest@hourstay.com';
    final mobile = user?.mobile.trim().isNotEmpty == true ? user!.mobile : 'No phone set';
    final city = user?.city.trim().isNotEmpty == true ? user!.city : 'Hyderabad, IN';

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            icon: Icons.person_rounded,
            title: 'Account Settings',
            subtitle: 'Personal profile & verified contact details',
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              // Avatar
              Container(
                width: 54,
                height: 54,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: cream,
                  border: Border.all(color: gold, width: 2),
                ),
                child: ClipOval(
                  child: _buildAvatar(user),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: navy,
                        letterSpacing: -0.2,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      email,
                      style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                        color: muted,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.phone_iphone_rounded, size: 12, color: purple),
                        const SizedBox(width: 4),
                        Text(
                          mobile,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: navyLight,
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Icon(Icons.location_on_outlined, size: 12, color: amber),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            city,
                            style: const TextStyle(
                              fontSize: 12,
                              color: muted,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
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
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _showEditProfileBottomSheet(user, authProvider),
                  icon: const Icon(Icons.edit_outlined, size: 16, color: purple),
                  label: const Text(
                    'Edit Profile Details',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: purple,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: purple, width: 1.2),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 2. NOTIFICATIONS SECTION
  // ==========================================
  Widget _buildNotificationSection(GuestSettingsProvider settings) {
    final notifs = settings.notificationSettings;

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            icon: Icons.notifications_active_rounded,
            title: 'Notifications',
            subtitle: 'Choose how Hour Stay communicates alerts and updates',
          ),
          const SizedBox(height: 14),

          _buildSwitchTile(
            title: 'Push Notifications',
            subtitle: 'Real-time stay updates, concierge chat & key cards',
            value: notifs.pushNotifications,
            icon: Icons.cell_tower_rounded,
            onChanged: (val) async {
              final ok = await settings.updateNotificationSetting('pushNotifications', val);
              if (!mounted) return;
              if (ok) _showToast('Push notifications ${val ? "enabled" : "disabled"}');
            },
          ),
          _buildDivider(),

          _buildSwitchTile(
            title: 'Email Confirmations',
            subtitle: 'Instant booking vouchers, receipts, and digital folios',
            value: notifs.emailConfirmations,
            icon: Icons.mark_email_read_outlined,
            onChanged: (val) async {
              final ok = await settings.updateNotificationSetting('emailConfirmations', val);
              if (!mounted) return;
              if (ok) _showToast('Email confirmations ${val ? "enabled" : "disabled"}');
            },
          ),
          _buildDivider(),

          _buildSwitchTile(
            title: 'SMS Booking Alerts',
            subtitle: 'Instant check-in passcodes, OTPs, and property directions',
            value: notifs.smsAlerts,
            icon: Icons.sms_outlined,
            onChanged: (val) async {
              final ok = await settings.updateNotificationSetting('smsAlerts', val);
              if (!mounted) return;
              if (ok) _showToast('SMS alerts ${val ? "enabled" : "disabled"}');
            },
          ),
          _buildDivider(),

          _buildSwitchTile(
            title: 'Check-in Reminders',
            subtitle: 'Helpful countdown reminders 2 hours before scheduled stay',
            value: notifs.checkInReminders,
            icon: Icons.alarm_on_rounded,
            onChanged: (val) async {
              final ok = await settings.updateNotificationSetting('checkInReminders', val);
              if (!mounted) return;
              if (ok) _showToast('Check-in reminders ${val ? "enabled" : "disabled"}');
            },
          ),
          _buildDivider(),

          _buildSwitchTile(
            title: 'Promotional Offers & Rewards',
            subtitle: 'Exclusive hourly deals, festive discounts & loyalty perks',
            value: notifs.promotionalOffers,
            icon: Icons.discount_outlined,
            onChanged: (val) async {
              final ok = await settings.updateNotificationSetting('promotionalOffers', val);
              if (!mounted) return;
              if (ok) _showToast('Promotional offers ${val ? "enabled" : "disabled"}');
            },
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 3. PRIVACY & SECURITY SECTION
  // ==========================================
  Widget _buildPrivacySecuritySection(
    UserModel? user,
    GuestSettingsProvider settings,
  ) {
    final prefs = settings.preferences;

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            icon: Icons.security_rounded,
            title: 'Privacy & Security',
            subtitle: 'Protect your account credentials, data and sessions',
          ),
          const SizedBox(height: 14),

          // Change Password Action Tile
          _buildActionTile(
            icon: Icons.lock_reset_rounded,
            iconColor: purple,
            title: 'Change Password',
            subtitle: 'Update your account password with instant encryption',
            trailingText: settings.lastPasswordChange != null ? 'Updated' : 'Secure',
            onTap: () => _showChangePasswordBottomSheet(settings),
          ),
          _buildDivider(),

          // Biometric Authentication Switch
          _buildSwitchTile(
            title: 'Biometric Login (Face / Fingerprint)',
            subtitle: 'Use fingerprint or face recognition for fast sign in',
            value: prefs.biometricLogin,
            icon: Icons.fingerprint_rounded,
            onChanged: (val) async {
              final ok = await settings.updateAppPreference('biometricLogin', val);
              if (!mounted) return;
              if (ok) {
                _showToast('Biometric login ${val ? "activated" : "deactivated"}');
              }
            },
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 4. HELP & SUPPORT SECTION
  // ==========================================
  Widget _buildHelpSupportSection(GuestSettingsProvider settings) {
    final hotel = settings.hotelProfile;

    return Container(
      decoration: BoxDecoration(
        color: white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: cardBorder),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            icon: Icons.support_agent_rounded,
            title: 'Help & Support',
            subtitle: '24/7 Concierge, front desk assistance & FAQ',
          ),
          const SizedBox(height: 14),

          _buildActionTile(
            icon: Icons.headset_mic_rounded,
            iconColor: purple,
            title: '24/7 Front Desk Concierge',
            subtitle: 'Call manager desk for instant room support',
            trailingText: hotel.phone.isNotEmpty ? hotel.phone : 'Helpdesk',
            onTap: () => _showConciergeContactModal(hotel),
          ),
          _buildDivider(),

          _buildActionTile(
            icon: Icons.help_outline_rounded,
            iconColor: amber,
            title: 'FAQ & Stay Policies',
            subtitle: 'Hourly stay rules, cancellation terms & ID checks',
            trailingText: 'View',
            onTap: () => _showFaqBottomSheet(),
          ),
          _buildDivider(),

          _buildActionTile(
            icon: Icons.emergency_outlined,
            iconColor: ruby,
            title: 'Emergency Assistance (SOS)',
            subtitle: 'Security, ambulance and local property emergency team',
            trailingText: 'SOS',
            textColor: ruby,
            onTap: () => _showEmergencyDialog(),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // 5. LOGOUT SECTION
  // ==========================================
  Widget _buildSignOutSection(AuthProvider authProvider) {
    return Container(
      decoration: BoxDecoration(
        color: rubyBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: ruby.withAlpha(60)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: ruby.withAlpha(25),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.logout_rounded, color: ruby, size: 22),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Logout',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: ruby,
                        letterSpacing: -0.2,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Log out of your Hour Stay account on this device',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: muted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _showSignOutDialog(authProvider),
              icon: const Icon(Icons.power_settings_new_rounded, size: 18, color: white),
              label: const Text(
                'Logout of Hour Stay',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: white,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: ruby,
                foregroundColor: white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================
  // FOOTER STATUS
  // ==========================================
  Widget _buildFooter() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: const BoxDecoration(
                color: emerald,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            const Text(
              'HMS Cloud System Online • Encrypted SSL',
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: muted,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          '© 2026 Hour Stay Hotels & Resorts. All Rights Reserved.',
          style: TextStyle(
            fontSize: 11,
            color: Color(0xFF94A3B8),
          ),
        ),
      ],
    );
  }

  // ==========================================
  // HELPER WIDGETS & DIALOGS
  // ==========================================

  Widget _buildSectionHeader({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: purpleBg,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: purple, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 15.5,
                  fontWeight: FontWeight.w800,
                  color: navy,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 11.5,
                  color: muted,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required IconData icon,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: background,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: purpleLight, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: navy,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 11.5,
                    color: muted,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Switch.adaptive(
            value: value,
            activeThumbColor: purple,
            activeTrackColor: purpleBg,
            inactiveThumbColor: Colors.white,
            inactiveTrackColor: cardBorder,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    String? trailingText,
    Color? textColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: background,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: iconColor, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: textColor ?? navy,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: muted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (trailingText != null) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: background,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: cardBorder),
                ),
                child: Text(
                  trailingText,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: textColor ?? purple,
                  ),
                ),
              ),
            ],
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFFCBD5E1), size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Divider(height: 1, color: Color(0xFFF1F5F9)),
    );
  }

  Widget _buildAvatar(UserModel? user) {
    final avatarUrl = ApiEndpoints.resolveImageUrl(user?.avatar);
    final initial = user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'G';

    if (avatarUrl.isNotEmpty) {
      if (avatarUrl.startsWith('data:image')) {
        try {
          final base64Str = avatarUrl.split(',').last;
          return Image.memory(
            base64Decode(base64Str),
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => _buildInitialsFallback(initial),
          );
        } catch (_) {
          return _buildInitialsFallback(initial);
        }
      }
      if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
        return Image.network(
          avatarUrl,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _buildInitialsFallback(initial),
        );
      }
    }
    return _buildInitialsFallback(initial);
  }

  Widget _buildInitialsFallback(String initial) {
    return Center(
      child: Text(
        initial,
        style: const TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          color: navy,
        ),
      ),
    );
  }

  // ==========================================
  // MODALS & ACTIONS
  // ==========================================

  // Edit Profile Bottom Sheet
  void _showEditProfileBottomSheet(UserModel? user, AuthProvider authProvider) {
    final nameCtrl = TextEditingController(text: user?.name ?? '');
    final phoneCtrl = TextEditingController(text: user?.mobile ?? '');
    final cityCtrl = TextEditingController(text: user?.city ?? '');
    final addressCtrl = TextEditingController(text: user?.address ?? '');
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
            top: 20,
            left: 20,
            right: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Edit Personal Details',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: navy,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: muted),
                    onPressed: () => Navigator.of(modalCtx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              _buildInputField(label: 'Full Name', controller: nameCtrl, icon: Icons.person_outline),
              const SizedBox(height: 12),
              _buildInputField(label: 'Mobile Number', controller: phoneCtrl, icon: Icons.phone_outlined, keyboardType: TextInputType.phone),
              const SizedBox(height: 12),
              _buildInputField(label: 'City', controller: cityCtrl, icon: Icons.location_city_outlined),
              const SizedBox(height: 12),
              _buildInputField(label: 'Address', controller: addressCtrl, icon: Icons.home_outlined),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          final name = nameCtrl.text.trim();
                          if (name.isEmpty) {
                            if (!mounted) return;
                            _showToast('Full name cannot be empty');
                            return;
                          }

                          setModalState(() => isSaving = true);
                          final ok = await authProvider.updateProfile({
                            'name': name,
                            'mobile': phoneCtrl.text.trim(),
                            'city': cityCtrl.text.trim(),
                            'address': addressCtrl.text.trim(),
                          });
                          setModalState(() => isSaving = false);

                          if (!mounted || !modalCtx.mounted) return;
                          if (ok) {
                            Navigator.of(modalCtx).pop();
                            _showToast('Profile updated successfully');
                          } else {
                            _showToast(authProvider.errorMessage ?? 'Update failed');
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navy,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: gold),
                    ),
                  ),
                  child: isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: white, strokeWidth: 2),
                        )
                      : const Text(
                          'Save Changes',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: white,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Change Password Bottom Sheet
  void _showChangePasswordBottomSheet(GuestSettingsProvider settings) {
    final currentPassCtrl = TextEditingController();
    final newPassCtrl = TextEditingController();
    final confirmPassCtrl = TextEditingController();
    bool hideCurrent = true;
    bool hideNew = true;
    bool hideConfirm = true;
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (modalCtx, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(modalCtx).viewInsets.bottom + 24,
            top: 20,
            left: 20,
            right: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Change Password',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: navy,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: muted),
                    onPressed: () => Navigator.of(modalCtx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Current Password
              _buildPasswordField(
                label: 'Current Password',
                controller: currentPassCtrl,
                obscure: hideCurrent,
                onToggle: () => setModalState(() => hideCurrent = !hideCurrent),
              ),
              const SizedBox(height: 12),

              // New Password
              _buildPasswordField(
                label: 'New Password (min 6 characters)',
                controller: newPassCtrl,
                obscure: hideNew,
                onToggle: () => setModalState(() => hideNew = !hideNew),
              ),
              const SizedBox(height: 12),

              // Confirm New Password
              _buildPasswordField(
                label: 'Confirm New Password',
                controller: confirmPassCtrl,
                obscure: hideConfirm,
                onToggle: () => setModalState(() => hideConfirm = !hideConfirm),
              ),
              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          final cur = currentPassCtrl.text.trim();
                          final n = newPassCtrl.text.trim();
                          final c = confirmPassCtrl.text.trim();

                          if (cur.isEmpty || n.isEmpty || c.isEmpty) {
                            if (!mounted) return;
                            _showToast('Please fill in all password fields');
                            return;
                          }
                          if (n.length < 6) {
                            if (!mounted) return;
                            _showToast('New password must be at least 6 characters');
                            return;
                          }
                          if (n != c) {
                            if (!mounted) return;
                            _showToast('New passwords do not match');
                            return;
                          }

                          setModalState(() => isSaving = true);
                          final res = await settings.changePassword(
                            currentPassword: cur,
                            newPassword: n,
                          );
                          setModalState(() => isSaving = false);

                          if (!mounted || !modalCtx.mounted) return;
                          if (res.success) {
                            Navigator.of(modalCtx).pop();
                            _showToast('Password changed successfully');
                          } else {
                            _showToast(res.message ?? 'Failed to change password');
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navy,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: gold),
                    ),
                  ),
                  child: isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: white, strokeWidth: 2),
                        )
                      : const Text(
                          'Update Password',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: white,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }



  // Concierge Modal
  void _showConciergeContactModal(GuestHotelProfile hotel) {
    showModalBottomSheet(
      context: context,
      backgroundColor: white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.headset_mic_rounded, color: purple, size: 24),
                SizedBox(width: 10),
                Text(
                  '24/7 Front Desk Concierge',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: navy),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Reach out directly to the property front desk for hourly extensions, stay inquiries, or digital check-in support.',
              style: TextStyle(fontSize: 13, color: muted),
            ),
            const SizedBox(height: 16),
            _buildContactRow(
              Icons.phone,
              'Support Contact Number',
              hotel.phone.isNotEmpty ? hotel.phone : '+91 1800 266 4687',
            ),
            const SizedBox(height: 10),
            _buildContactRow(
              Icons.email,
              'Support / Reservation Email',
              hotel.email.isNotEmpty ? hotel.email : 'concierge@hourstay.com',
            ),
            const SizedBox(height: 10),
            _buildContactRow(
              Icons.apartment_rounded,
              'Hotel Property',
              hotel.hotelName.isNotEmpty ? hotel.hotelName : 'Speshway Luxury Hotel',
            ),
            const SizedBox(height: 10),
            _buildContactRow(
              Icons.pin_drop,
              'Property Address',
              hotel.fullAddress,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: navy,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: gold),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 13),
                ),
                child: const Text('Close', style: TextStyle(color: white, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(color: purpleBg, borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, color: purple, size: 16),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11.5, color: muted)),
              Text(
                value,
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: navy),
                overflow: TextOverflow.ellipsis,
                maxLines: 2,
              ),
            ],
          ),
        ),
      ],
    );
  }



  // FAQ Bottom Sheet
  void _showFaqBottomSheet() {
    final faqs = [
      {
        'q': 'How do Hour Stay hourly bookings work?',
        'a': 'You can book rooms in flexible hourly slots (3h, 6h, 12h, 24h). Your check-in timer begins at your selected arrival time.'
      },
      {
        'q': 'Can I extend my stay during my active booking?',
        'a': 'Yes! You can request stay extensions directly from your Active Booking card in the mobile app subject to room availability.'
      },
      {
        'q': 'What is the cancellation & refund policy?',
        'a': 'Free cancellation is permitted up to 24 hours prior to check-in. Refunds are credited to the original payment method in 2-4 business days.'
      },
      {
        'q': 'What ID proof is required at check-in?',
        'a': 'Any government-issued photo ID (Aadhaar Card, Passport, Voter ID, Driving License) is acceptable.'
      },
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        expand: false,
        builder: (ctx, scrollController) => Padding(
          padding: const EdgeInsets.all(20),
          child: ListView(
            controller: scrollController,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Frequently Asked Questions',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: navy),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: muted),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...faqs.map((faq) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: background,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          faq['q']!,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: navy,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          faq['a']!,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: muted,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }

  // Emergency SOS Dialog
  void _showEmergencyDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.emergency_rounded, color: ruby, size: 24),
            SizedBox(width: 10),
            Text('Emergency Contacts', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: ruby)),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('In case of urgent medical or security emergencies:'),
            SizedBox(height: 10),
            Text('• Hotel Security Duty Desk: Dial 999 from in-room phone', style: TextStyle(fontWeight: FontWeight.w700, color: navy)),
            Text('• National Emergency Service: 112', style: TextStyle(fontWeight: FontWeight.w700, color: navy)),
            Text('• Ambulance / First Aid: 108', style: TextStyle(fontWeight: FontWeight.w700, color: navy)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close', style: TextStyle(fontWeight: FontWeight.w700, color: navy)),
          ),
        ],
      ),
    );
  }

  // Sign Out Dialog
  void _showSignOutDialog(AuthProvider authProvider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: ruby, size: 22),
            SizedBox(width: 10),
            Text('Logout', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: navy)),
          ],
        ),
        content: const Text(
          'Are you sure you want to log out of your Hour Stay account? You will need to sign in again to manage your reservations.',
          style: TextStyle(fontSize: 13.5, color: muted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.w600, color: muted)),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              await authProvider.logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: ruby,
              foregroundColor: white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Yes, Logout', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildInputField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: navy,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: const TextStyle(fontSize: 14, color: navy),
          decoration: InputDecoration(
            prefixIcon: Icon(icon, color: purple, size: 20),
            filled: true,
            fillColor: background,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: cardBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: cardBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: purple, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPasswordField({
    required String label,
    required TextEditingController controller,
    required bool obscure,
    required VoidCallback onToggle,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: navy,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          obscureText: obscure,
          style: const TextStyle(fontSize: 14, color: navy),
          decoration: InputDecoration(
            prefixIcon: const Icon(Icons.lock_outline_rounded, color: purple, size: 20),
            suffixIcon: IconButton(
              icon: Icon(
                obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                color: muted,
                size: 20,
              ),
              onPressed: onToggle,
            ),
            filled: true,
            fillColor: background,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: cardBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: cardBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: purple, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  void _showToast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(fontWeight: FontWeight.w600, color: white),
        ),
        backgroundColor: navy,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 3),
      ),
    );
  }
}
