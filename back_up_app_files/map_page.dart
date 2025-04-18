import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class MapPage extends StatefulWidget {
  final Function(double latitude, double longitude) onLocationSelected;

  const MapPage({Key? key, required this.onLocationSelected}) : super(key: key);

  @override
  _MapPageState createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  LatLng? selectedLocation;
  late GoogleMapController mapController;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sélectionner une localisation')),
      body: GoogleMap(
        initialCameraPosition: const CameraPosition(
          target: LatLng(48.8566, 2.3522), // Paris par défaut
          zoom: 5,
        ),
        onMapCreated: (controller) {
          mapController = controller;
        },
        onTap: (LatLng location) {
          setState(() {
            selectedLocation = location;
          });
        },
        markers: selectedLocation != null
            ? {
                Marker(
                  markerId: const MarkerId('selectedLocation'),
                  position: selectedLocation!,
                ),
              }
            : {},
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          if (selectedLocation != null) {
            widget.onLocationSelected(
              selectedLocation!.latitude,
              selectedLocation!.longitude,
            );
            Navigator.pop(context); // Fermer la page de la carte
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Veuillez sélectionner une localisation sur la carte.')),
            );
          }
        },
        child: const Icon(Icons.check),
      ),
    );
  }
}
