import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:hour_stay_mobile/core/constants/api_endpoints.dart';
import 'package:hour_stay_mobile/core/constants/app_colors.dart';
import 'package:hour_stay_mobile/providers/auth_provider.dart';
import 'package:hour_stay_mobile/widgets/custom_button.dart';
import 'package:hour_stay_mobile/widgets/server_config_dialog.dart';

class GuestProfileScreen extends StatelessWidget {
  const GuestProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;

    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Profile header card
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: AppColors.secondary,
                  child: Text(
                    user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'G',
                    style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  user?.name ?? 'Valued Guest',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 4),
                Text(
                  user?.email ?? 'guest@example.com',
                  style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                ),
                if (user?.mobile != null && user!.mobile.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    user.mobile,
                    style: const TextStyle(fontSize: 13, color: AppColors.textTertiary),
                  ),
                ],
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withAlpha(20),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.primary.withAlpha(80)),
                  ),
                  child: const Text(
                    'VERIFIED GUEST',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          const Text(
            'App & Connection',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 12),

          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.dns_outlined, color: AppColors.primary),
                  title: const Text('Backend API Server'),
                  subtitle: Text(ApiEndpoints.baseUrl, style: const TextStyle(fontSize: 12)),
                  trailing: const Icon(Icons.edit_outlined, size: 18),
                  onTap: () => ServerConfigDialog.show(context),
                ),
                const Divider(height: 1),
                const ListTile(
                  leading: Icon(Icons.verified_user_outlined, color: AppColors.primary),
                  title: Text('Data Privacy & Security'),
                  subtitle: Text('End-to-end encrypted sessions', style: TextStyle(fontSize: 12)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          CustomButton(
            text: 'Sign Out',
            backgroundColor: AppColors.error,
            textColor: Colors.white,
            icon: Icons.logout,
            onPressed: () => authProvider.logout(),
          ),
        ],
      ),
    );
  }
}
