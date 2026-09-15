import { Linking } from 'react-native';

/**
 * Leaving the app for the phone's own dialler and maps.
 *
 * Both are real destinations today: `tel:` opens the dialler with the number
 * filled in, and the Google Maps search URL opens the Maps app when installed
 * and the browser when not — on Android and iOS alike, with no native module.
 *
 * Phase 5 routes the call through a masked number, so a customer's real phone
 * is never shown to a worker who has not taken the job. The function name and
 * result stay; only the number it dials changes.
 */

export async function callPhone(phone: string): Promise<boolean> {
  try {
    await Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
    return true;
  } catch {
    return false;
  }
}

export async function openInMaps(point: { lat: number; lng: number }): Promise<boolean> {
  try {
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`);
    return true;
  } catch {
    return false;
  }
}

/** Turn-by-turn directions to a job, for a two-wheeler. */
export async function openDirections(point: { lat: number; lng: number }): Promise<boolean> {
  try {
    await Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=two-wheeler`,
    );
    return true;
  } catch {
    return false;
  }
}
