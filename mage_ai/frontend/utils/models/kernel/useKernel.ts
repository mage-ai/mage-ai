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
  caller?: string;
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
