import type { Coordinates, LocationInfo } from '../types';

/**
 * Check if Geolocation is supported
 */
export const isGeolocationSupported = (): boolean => {
  return 'geolocation' in navigator;
};

/**
 * Get current GPS coordinates
 */
export const getCurrentPosition = async (): Promise<Coordinates> => {
  if (!isGeolocationSupported()) {
    throw new Error('Geolocation not supported');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Get city name from coordinates using reverse geocoding
 */
export const getCityFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        headers: {
          'User-Agent': 'WeatherPotato/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    return data.address.city || data.address.town || data.address.village || 'Your location';
  } catch (error) {
    console.error('Failed to get city name:', error);
    return 'Your location';
  }
};

/**
 * Get location with city name
 */
export const getLocationInfo = async (): Promise<LocationInfo> => {
  const coordinates = await getCurrentPosition();
  const city = await getCityFromCoordinates(coordinates.latitude, coordinates.longitude);

  return {
    ...coordinates,
    city
  };
};
