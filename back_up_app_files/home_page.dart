import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:io';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  _HomePageState createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String? weatherCondition;
  String? temperature;
  String? ipAddress;

  Future<void> fetchData() async {
    try {
      final response = await http.get(Uri.parse('http://192.168.4.1/'));
      if (response.statusCode == 200) {
        final html = response.body;

        // Extraction des données dynamiques depuis le HTML
        weatherCondition = _extractValue(html, r"<b>Dernier code meteo:</b> (.*?)</p>");
        temperature = _extractValue(html, r"<b>Temperature:</b> (.*?)°C</p>");
        ipAddress = _extractValue(html, r"<b>Adresse IP locale:</b> (.*?)</p>");

        setState(() {}); // Met à jour l'interface utilisateur
      } else {
        print('Erreur du serveur : ${response.statusCode}');
      }
    } on SocketException catch (e) {
      print('Erreur réseau : ${e.message}');
    } catch (e) {
      print('Erreur inconnue : $e');
    }
  }

  String? _extractValue(String html, String pattern) {
    final regex = RegExp(pattern);
    final match = regex.firstMatch(html);
    return match?.group(1); // Retourne la valeur capturée
  }

  @override
  void initState() {
    super.initState();
    fetchData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Weather Potato')),
      body: weatherCondition == null || temperature == null || ipAddress == null
          ? Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Dernier code météo : $weatherCondition',
                      style: TextStyle(fontSize: 18)),
                  SizedBox(height: 10),
                  Text('Température : $temperature°C',
                      style: TextStyle(fontSize: 18)),
                  SizedBox(height: 10),
                  Text('Adresse IP locale : $ipAddress',
                      style: TextStyle(fontSize: 18)),
                ],
              ),
            ),
    );
  }
}
