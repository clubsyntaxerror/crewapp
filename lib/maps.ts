import { Platform, Linking } from 'react-native';

export function openMapLocation(address: string, venueName?: string) {
  const encodedAddress = encodeURIComponent(address);
  const label = venueName ? encodeURIComponent(venueName) : encodedAddress;

  let url: string;

  if (Platform.OS === 'ios') {
    // Use Apple Maps on iOS
    url = `maps://maps.apple.com/?q=${label}&address=${encodedAddress}`;
  } else {
    // Use Google Maps on Android and web
    url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  }

  Linking.canOpenURL(url)
    .then((supported) => {
      if (supported) {
        return Linking.openURL(url);
      } else {
        // Fallback to Google Maps web on all platforms
        const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        return Linking.openURL(fallbackUrl);
      }
    })
    .catch((err) => console.error('Error opening maps:', err));
}
