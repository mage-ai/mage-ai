import { useMemo } from 'react';

import KernelType from '@interfaces/KernelType';
import api from '@api';
<<<<<<< HEAD
<<<<<<< HEAD
import useDelayFetch from '@api/utils/useDelayFetch';
<<<<<<< HEAD
=======
=======
import useDelayFetch from '@api/utils/useDelayFetch';
>>>>>>> 44b7c9a32 (triple style)
import { ErrorType, ErrorProps, UseErrorOptionsType } from '@context/Error/ErrorContext';
>>>>>>> 1d279f888 (status check)
=======
>>>>>>> 0c652d69d (fix merge)
import { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';

function useKernel({
  pipelineType,
  refreshInterval = 5000,
  revalidateOnFocus,
}: {
  pipelineType?: PipelineTypeEnum;
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
} = {}): {
  fetch: () => void;
  kernel: KernelType;
} {
  const {
    data: dataKernels,
    mutate: fetchKernels,
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 0c652d69d (fix merge)
  } = useDelayFetch(api.kernels.list, {}, {
    refreshInterval,
    revalidateOnFocus,
  }, {
    delay: 5000,
  });
<<<<<<< HEAD
=======
  } = api.kernels.list(checkExecutionState
    ? { check_execution_state: true }
    : {},
=======
  } = api.kernels.list(
=======
  } = useDelayFetch(api.kernels.list
>>>>>>> 44b7c9a32 (triple style)
    // checkExecutionState
    !!caller
    ? {
      // check_execution_state: checkToggleRef.current
      __limit: caller,
    }
    : {

    },
>>>>>>> 0d2a347b6 (status)
    {
      refreshInterval,
      revalidateOnFocus,
    },
    {
      delay: 5000,
    },
  );

>>>>>>> 1d279f888 (status check)
=======
>>>>>>> 0c652d69d (fix merge)
  const kernel = useMemo(() => {
    const kernels = dataKernels?.kernels;

    return kernels?.find(({ name }) =>
      name === PIPELINE_TYPE_TO_KERNEL_NAME[pipelineType],
    ) || kernels?.[0];
  }, [
    dataKernels?.kernels,
    pipelineType,
  ]);

  return {
    fetch: fetchKernels,
    kernel,
  };
}

export default useKernel;
