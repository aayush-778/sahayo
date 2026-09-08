import { PlaceholderScreen } from '../../src/components/PlaceholderScreen';

/** TEMPORARY scaffold for the sub-category grid. */
export default function CategoryScreen() {
  return (
    <PlaceholderScreen
      links={[
        { href: '/subcategory/sub_bathroom_cleaning', label: '/subcategory/sub_bathroom_cleaning' },
        { href: '/subcategory/sub_kitchen_cleaning', label: '/subcategory/sub_kitchen_cleaning' },
      ]}
    />
  );
}
