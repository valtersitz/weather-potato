import 'package:flutter/material.dart';
import 'package:wifi_iot/wifi_iot.dart';

class SetupPage extends StatefulWidget {
  const SetupPage({super.key});

  @override
  _SetupPageState createState() => _SetupPageState();
}

class _SetupPageState extends State<SetupPage> {
  List<String> availableNetworks = [];
  final TextEditingController ssidController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  Future<void> scanNetworks() async {
    try {
      final networks = await WiFiForIoTPlugin.loadWifiList();
      setState(() {
        availableNetworks = networks.map((e) => e.ssid ?? "").where((s) => s.isNotEmpty).toList();
      });
    } catch (e) {
      print("Erreur lors du scan des réseaux WiFi : $e");
    }
  }

  Future<void> connectToDeviceNetwork() async {
    final ssid = ssidController.text;
    final password = passwordController.text;

    if (ssid.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Veuillez entrer un SSID et un mot de passe valides.")),
      );
      return;
    }

    try {
      // Connect to the device's WiFi
      final success = await WiFiForIoTPlugin.connect(ssid, password: password);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Connecté au réseau $ssid.")),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Impossible de se connecter au réseau $ssid.")),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Erreur réseau : $e")),
      );
    }
  }

  @override
  void initState() {
    super.initState();
    scanNetworks();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Configuration initiale')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            DropdownButtonFormField<String>(
              items: availableNetworks.map((ssid) {
                return DropdownMenuItem(value: ssid, child: Text(ssid));
              }).toList(),
              onChanged: (value) => ssidController.text = value ?? "",
              hint: Text('Sélectionnez un réseau WiFi'),
            ),
            TextField(
              controller: passwordController,
              decoration: InputDecoration(labelText: 'Mot de passe WiFi'),
              obscureText: true,
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: connectToDeviceNetwork,
              child: Text('Se connecter'),
            ),
          ],
        ),
      ),
    );
  }
}
