import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMutation } from 'react-query';

import KernelType from '@interfaces/KernelType';
import api from '@api';
<<<<<<< HEAD
<<<<<<< HEAD
import useDelayFetch from '@api/utils/useDelayFetch';
=======
=======
import useDelayFetch from '@api/utils/useDelayFetch';
>>>>>>> 44b7c9a32 (triple style)
import { ErrorType, ErrorProps, UseErrorOptionsType } from '@context/Error/ErrorContext';
>>>>>>> 1d279f888 (status check)
import { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';
import { onSuccess } from '@api/utils/response';

export type UseKernelType = {
  caller?: string;
  checkExecutionState?: boolean;
  pipelineType?: PipelineTypeEnum;
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
  showError?: (
    errorProps: ErrorProps,
    opts?: UseErrorOptionsType,
  ) => void;
};

function useKernel({
  caller,
  checkExecutionState,
  pipelineType,
  refreshInterval = 5000,
  revalidateOnFocus,
  showError,
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
  const checkToggleRef = useRef(null);
  const latencyRef = useRef(null);
  const timerRef = useRef(null);
  checkToggleRef.current = checkExecutionState;

  const {
    data: dataKernels,
    mutate: fetchKernels,
<<<<<<< HEAD
<<<<<<< HEAD
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

    if (checkExecutionState) {
      checkToggleRef.current = !checkToggleRef.current;
    }
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
          callback: () => fetchKernels(),
          onErrorCallback: (response, errors) => showError({
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
