import { useMemo } from 'react';

import StatusType from '@interfaces/StatusType';
import api from '@api';
import useDelayFetch from '@api/utils/useDelayFetch';

function useStatus({
  delay = 7000,
  pauseFetch,
  refreshInterval,
  revalidateOnFocus,
}: {
  delay?: number;
  pauseFetch?: boolean;
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
} = {}): {
  status: StatusType;
} {
  const { data: serverStatus } = useDelayFetch(api.statuses.list, {}, {
    refreshInterval,
    revalidateOnFocus,
  }, {
    delay,
    condition: () => !pauseFetch,
  });
  const status = useMemo(() => serverStatus?.statuses?.[0], [serverStatus]);

  return {
    status,
  };
}

export default useStatus;
