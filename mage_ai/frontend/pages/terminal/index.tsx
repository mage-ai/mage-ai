import { useMutation } from 'react-query';

import Terminal from '@components/Terminal';
import api from '@api';
import { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';
import { parseErrorFromResponse, onSuccess } from '@api/utils/response';

function TerminalPage() {
  const [interruptKernel] = useMutation(
    api.interrupt.kernels.useCreate(PIPELINE_TYPE_TO_KERNEL_NAME[PipelineTypeEnum.PYTHON]),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          onErrorCallback: (response, errors) => console.log({
            errors,
            response,
          }),
        },
      ),
    },
  );

  return (
    <Terminal
      interruptKernel={interruptKernel}
    />
  );
}

export default TerminalPage;
