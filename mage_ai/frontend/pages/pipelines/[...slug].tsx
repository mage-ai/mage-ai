import {
  useCallback,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import FileHeaderMenu from '@components/PipelineDetail/FileHeaderMenu';
import Head from '@oracle/elements/Head';
import KernelContext from '@context/Kernel';
import PipelineContext from '@context/Pipeline';
import PipelineDetail from '@components/PipelineDetail';
import PipelineType from '@interfaces/PipelineType';
import Sidekick from '@components/Sidekick';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import { SIDEKICK_VIEWS } from '@components/Sidekick/constants';
import { onSuccess } from '@api/utils/response';

type PipelineDetailPageProps = {
  pipeline: PipelineType;
};

function PipelineDetailPage({
  pipeline: pipelineProp,
}: PipelineDetailPageProps) {
  const [selectedBlock, setSelectedBlock] = useState(null);
  const mainContainerRef = useRef(null);

  const {
    data,
    isLoading,
    mutate: fetchPipeline,
  } = api.pipelines.detail(pipelineProp.uuid);
  const pipeline = data?.pipeline;
  const {
    data: dataKernels,
    mutate: fetchKernels,
  } = api.kernels.list({}, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });
  const kernels = dataKernels?.kernels;
  const kernel = kernels?.[0];

  const [restartKernel] = useMutation(
    api.restart.kernels.useCreate(kernel?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => fetchKernels(),
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      ),
    },
  );
  const [interruptKernel] = useMutation(
    api.interrupt.kernels.useCreate(kernel?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (response) => {

          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      ),
    },
  );

  const restartKernelWithConfirm = useCallback(() => {
    const warning = 'Do you want to restart the kernel? All variables will be cleared.';
    if (typeof window !== 'undefined' && window.confirm(warning)) {
      restartKernel();
    }
  }, [restartKernel]);

  return (
    <>
      <Head title={pipeline?.name} />

      <PipelineContext.Provider
        value={{
          fetchPipeline,
          pipeline,
        }}
      >
        <KernelContext.Provider
          value={{
            fetchKernels,
            interruptKernel,
            kernel,
            restartKernel: restartKernelWithConfirm,
          }}
        >
          <TripleLayout
            after={<Sidekick views={SIDEKICK_VIEWS} />}
            before={<div style={{ height: 9999 }} />}
            beforeHeader={<FileHeaderMenu />}
            mainContainerRef={mainContainerRef}
          >
            {pipeline && (
              <PipelineDetail
                mainContainerRef={mainContainerRef}
                selectedBlock={selectedBlock}
                setSelectedBlock={setSelectedBlock}
              />
            )}
          </TripleLayout>
        </KernelContext.Provider>
      </PipelineContext.Provider>
    </>
  );
}

PipelineDetailPage.getInitialProps = async (ctx: any) => {
  const { slug: slugArray }: { slug: string[] } = ctx.query;
  let pipelineUUID;

  if (Array.isArray(slugArray)) {
    pipelineUUID = slugArray[0];
  }

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PipelineDetailPage;
