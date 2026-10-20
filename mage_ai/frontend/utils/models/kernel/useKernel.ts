import { useMemo } from 'react';

import KernelType from '@interfaces/KernelType';
import api from '@api';
import useDelayFetch from '@api/utils/useDelayFetch';
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
  } = useDelayFetch(api.kernels.list, {}, {
    refreshInterval,
    revalidateOnFocus,
  }, {
    delay: 5000,
  });
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
