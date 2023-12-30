import { useMemo } from 'react';

import KernelType from '@interfaces/KernelType';
import api from '@api';
import { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';

function useKernel({
  pipelineType,
}: {
  pipelineType?: PipelineTypeEnum;
} = {}): {
  kernel: KernelType;
} {
  const {
    data: dataKernels,
    mutate: fetchKernels,
  } = api.kernels.list({}, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
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
    kernel,
  };
}

export default useKernel;
