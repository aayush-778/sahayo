import { useEffect, useState } from 'react';
import { Text } from '@sahayo/ui-native';

import { formatElapsed } from '../lib/datetime';

/** A clock counting up from `since`, once a second. */
export function ElapsedTime({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text weight="bold" className="text-4xl text-worker-ink">
      {formatElapsed(now - new Date(since).getTime())}
    </Text>
  );
}
