import { useMemo } from 'react';

import StatusType from '@interfaces/StatusType';
import api from '@api';

function useStatus(): {
  status: StatusType;
} {
  const { data: serverStatus } = api.statuses.list();
  const status = useMemo(() => serverStatus?.statuses?.[0], [serverStatus]);

  return {
    status,
  };
}

export default useStatus;
