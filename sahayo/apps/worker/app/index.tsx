import { Text } from 'react-native';
import { Screen } from '@sahayo/ui-native';
import { GIG_OFFER_TIMEOUT_MS } from '@sahayo/shared';

export default function WorkerDashboard() {
  return (
    <Screen>
      <Text>Worker Dashboard</Text>
      <Text>{`offerTimeout:${GIG_OFFER_TIMEOUT_MS}`}</Text>
    </Screen>
  );
}
