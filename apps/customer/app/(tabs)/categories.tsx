import { PlaceholderScreen } from '../../src/components/PlaceholderScreen';

/** TEMPORARY scaffold for the All Categories tab. */
export default function CategoriesScreen() {
  return (
    <PlaceholderScreen
      links={[
        { href: '/category/cat_cleaning', label: '/category/cat_cleaning' },
        { href: '/category/cat_plumbing', label: '/category/cat_plumbing' },
        { href: '/category/cat_electrical', label: '/category/cat_electrical' },
      ]}
    />
  );
}
