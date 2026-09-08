import { PlaceholderScreen } from '../../src/components/PlaceholderScreen';

/** TEMPORARY scaffold for the Bookings tab. */
export default function BookingsScreen() {
  return (
    <PlaceholderScreen
      links={[
        { href: '/track/bkg_live_ac', label: '/track/bkg_live_ac' },
        { href: '/track/bkg_live_bathroom', label: '/track/bkg_live_bathroom' },
      ]}
    />
  );
}
