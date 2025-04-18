import 'package:flutter/material.dart';
import 'map_page.dart';

class LocationPage extends StatefulWidget {
  @override
  _LocationPageState createState() => _LocationPageState();
}

class _LocationPageState extends State<LocationPage> {
  late TextEditingController latitudeController;
  late TextEditingController longitudeController;

  @override
  void initState() {
    super.initState();
    latitudeController = TextEditingController();
    longitudeController = TextEditingController();
  }

  @override
  void dispose() {
    latitudeController.dispose();
    longitudeController.dispose();
    super.dispose();
  }

  void updateCoordinates(String latitude, String longitude) {
    setState(() {
      latitudeController.text = latitude;
      longitudeController.text = longitude;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Change Location")),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: latitudeController,
              decoration: const InputDecoration(
                labelText: "Latitude",
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: longitudeController,
              decoration: const InputDecoration(
                labelText: "Longitude",
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                // Send data to the ESP32 device
                print("Latitude: ${latitudeController.text}");
                print("Longitude: ${longitudeController.text}");
                Navigator.pop(context, {
                  "latitude": latitudeController.text,
                  "longitude": longitudeController.text,
                });
              },
              child: const Text("Update Location"),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => MapPage(
                      onLocationSelected: (latitude, longitude) {
                        updateCoordinates(
                          latitude.toString(),
                          longitude.toString(),
                        );
                      },
                    ),
                  ),
                );
              },
              child: const Text("Select on Map"),
            ),
          ],
        ),
      ),
    );
  }
}
