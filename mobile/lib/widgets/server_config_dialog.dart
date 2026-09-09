import 'package:flutter/material.dart';
import '../core/constants/api_endpoints.dart';
import '../core/constants/app_colors.dart';
import '../services/socket_service.dart';
import '../services/storage_service.dart';

class ServerConfigDialog extends StatefulWidget {
  const ServerConfigDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      builder: (context) => const ServerConfigDialog(),
    );
  }

  @override
  State<ServerConfigDialog> createState() => _ServerConfigDialogState();
}

class _ServerConfigDialogState extends State<ServerConfigDialog> {
  final TextEditingController _urlController = TextEditingController();
  final StorageService _storageService = StorageService();

  @override
  void initState() {
    super.initState();
    _urlController.text = ApiEndpoints.baseUrl;
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _saveConfig() async {
    final newUrl = _urlController.text.trim();
    if (newUrl.isNotEmpty) {
      await _storageService.saveServerUrl(newUrl);
      await StorageService.saveSocketUrl(ApiEndpoints.getDefaultSocketUrl(newUrl));
      ApiEndpoints.setBaseUrl(newUrl);
      SocketService().reconnect();
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Server updated to $newUrl'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    }
  }

  void _applyPreset(String url) {
    setState(() {
      _urlController.text = url;
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.dns_rounded, color: AppColors.primary),
          SizedBox(width: 8),
          Text('Server Configuration', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Set the backend base URL. For physical devices on Wi-Fi, use your PC IP 192.168.88.17:5000.',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _urlController,
              decoration: const InputDecoration(
                labelText: 'Base URL',
                hintText: 'http://192.168.88.17:5000/api',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Quick Presets:',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textTertiary),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  label: const Text('PC Wi-Fi (192.168.88.17)', style: TextStyle(fontSize: 12)),
                  onPressed: () => _applyPreset('http://192.168.88.17:5000/api'),
                ),
                ActionChip(
                  label: const Text('Local (127.0.0.1)', style: TextStyle(fontSize: 12)),
                  onPressed: () => _applyPreset('http://127.0.0.1:5000/api'),
                ),
                ActionChip(
                  label: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 12)),
                  onPressed: () => _applyPreset('http://10.0.2.2:5000/api'),
                ),
                ActionChip(
                  label: const Text('Localhost (5000)', style: TextStyle(fontSize: 12)),
                  onPressed: () => _applyPreset('http://localhost:5000/api'),
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _saveConfig,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
          ),
          child: const Text('Save & Reconnect'),
        ),
      ],
    );
  }
}
