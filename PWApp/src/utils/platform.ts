/**
 * Platform detection and capability checks
 */

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

export const isMobile = (): boolean => {
  return isIOS() || isAndroid();
};

export const supportsWebBluetooth = (): boolean => {
  return 'bluetooth' in navigator;
};

export const supportsCamera = async (): Promise<boolean> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch {
    return false;
  }
};

export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    // Request camera permission explicitly
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    // Stop the stream immediately - we just wanted to get permission
    stream.getTracks().forEach(track => track.stop());

    return true;
  } catch (error) {
    console.error('Camera permission denied:', error);
    return false;
  }
};

export const getPlatformName = (): string => {
  if (isIOS()) return 'iOS';
  if (isAndroid()) return 'Android';
  return 'Desktop';
};
