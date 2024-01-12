import { useMemo } from 'react';

import StatusType from '@interfaces/StatusType';
import api from '@api';

function useStatus({
  refreshInterval,
  revalidateOnFocus,
}: {
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
} = {}): {
  status: StatusType;
} {
  const { data: serverStatus } = api.statuses.list({}, {
    refreshInterval,
    revalidateOnFocus,
  });
  const status = useMemo(() => serverStatus?.statuses?.[0], [serverStatus]);

  return {
    status,
  };
}

export default useStatus;
