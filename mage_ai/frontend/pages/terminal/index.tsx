import { useCallback } from 'react';
import { useMutation } from 'react-query';

import PrivateRoute from '@components/shared/PrivateRoute';
import Terminal from '@components/Terminal';
import api from '@api';
import { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';
import { onSuccess } from '@api/utils/response';

function TerminalPage() {
  const [updateKernel] = useMutation(
    api.kernels.useUpdate(PIPELINE_TYPE_TO_KERNEL_NAME[PipelineTypeEnum.PYTHON]),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const interruptKernel = useCallback(() => updateKernel({
    kernel: {
      action_type: 'interrupt',
    },
  }), [updateKernel]);

  return (
    <Terminal
      interruptKernel={interruptKernel}
    />
  );
}

TerminalPage.getInitialProps = async () => ({});

export default PrivateRoute(TerminalPage);
