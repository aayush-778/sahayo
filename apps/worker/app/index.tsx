import { Text } from 'react-native';
import { Screen } from '@sahakar/ui-native';
import { GIG_OFFER_TIMEOUT_MS } from '@sahakar/shared';

export default function WorkerDashboard() {
  return (
    <Screen>
      <Text>Worker Dashboard</Text>
      <Text>{`offerTimeout:${GIG_OFFER_TIMEOUT_MS}`}</Text>
    </Screen>
  );
}
