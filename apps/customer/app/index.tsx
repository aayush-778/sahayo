import { Text } from 'react-native';
import { Screen } from '@sahakar/ui-native';
import { DEFAULT_RADIUS_M } from '@sahakar/shared';

export default function CustomerHome() {
  return (
    <Screen>
      <Text>Customer Home</Text>
      <Text>{`radius:${DEFAULT_RADIUS_M}`}</Text>
    </Screen>
  );
}
