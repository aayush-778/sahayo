import { PlaceholderScreen } from '../../src/components/PlaceholderScreen';

/** TEMPORARY scaffold for the priced item list. */
export default function SubCategoryScreen() {
  return (
    <PlaceholderScreen
      links={[
        { href: '/booking/now', label: '/booking/now' },
        { href: '/booking/schedule', label: '/booking/schedule' },
      ]}
    />
  );
}
