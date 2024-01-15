import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation } from 'react-query';

import KernelType from '@interfaces/KernelType';
import api from '@api';
<<<<<<< HEAD
import useDelayFetch from '@api/utils/useDelayFetch';
=======
import { ErrorType, ErrorProps, UseErrorOptionsType } from '@context/Error/ErrorContext';
>>>>>>> 1d279f888 (status check)
import { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';
import { onSuccess } from '@api/utils/response';

export type UseKernelType = {
  checkExecutionState?: boolean;
  pipelineType?: PipelineTypeEnum;
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
  showError?: (
    key: string,
    component: ErrorType,
    hideError: (key: string) => void,
    errorProps: ErrorProps,
    opts?: UseErrorOptionsType,
  ) => void;
};

function useKernel({
  checkExecutionState,
  pipelineType,
  refreshInterval = 5000,
  revalidateOnFocus,
  showErrors,
}: UseKernelType = {}): {
  fetch: () => void;
  health: {
    checkExecutionState: boolean;
    latency: number;
    refreshInterval: number;
    timeBetween: number;
    timeLastTest: number;
  };
  interrupt: () => void;
  kernel: KernelType;
  restart: () => void;
  update: () => void;
} {
  const latencyRef = useRef(null);
  const timerRef = useRef(null);

  const {
    data: dataKernels,
    mutate: fetchKernels,
<<<<<<< HEAD
  } = useDelayFetch(api.kernels.list, {}, {
    refreshInterval,
    revalidateOnFocus,
  }, {
    delay: 5000,
  });
=======
  } = api.kernels.list(checkExecutionState
    ? { check_execution_state: true }
    : {},
    {
      refreshInterval,
      revalidateOnFocus,
    },
  );

>>>>>>> 1d279f888 (status check)
  const kernel = useMemo(() => {
    const kernels = dataKernels?.kernels;

    return kernels?.find(({ name }) =>
      name === PIPELINE_TYPE_TO_KERNEL_NAME[pipelineType],
    ) || kernels?.[0];
  }, [
    dataKernels?.kernels,
    pipelineType,
  ]);

  timerRef.current = Number(new Date())
  useEffect(() => {
    latencyRef.current = {
      checkExecutionState,
      latency: kernel?.latency,
      refreshInterval,
      timeBetween: timerRef.current ? Number(new Date()) - timerRef.current : null,
      timeLastTest: Number(new Date()),
    }
    timerRef.current = Number(new Date())
  }, [kernel])

  const [updateKernel]: any = useMutation(
    ({
      action_type,
    }: {
      action_type: string;
    }) => api.kernels.useUpdate('__auto_detect')({
      kernel: {
        action_type,
      },
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => fetch(),
          onErrorCallback: (response, errors) => showErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const restart = useCallback(() => updateKernel({
    action_type: 'restart',
  }), [updateKernel]);

  const interrupt = useCallback(() => updateKernel({
    action_type: 'interrupt',
  }), [updateKernel]);

  return {
    fetch: fetchKernels,
    health: latencyRef.current,
    interrupt,
    kernel,
    restart,
    update: updateKernel,
  };
}

export default useKernel;
