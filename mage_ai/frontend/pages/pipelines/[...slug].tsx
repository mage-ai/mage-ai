import { useRef } from 'react';

import Head from '@oracle/elements/Head';
import PipelineDetail from '@components/PipelineDetail';
import PipelineType from '@interfaces/PipelineType';
import Sidekick from '@components/Sidekick';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import { SIDEKICK_VIEWS } from '@components/Sidekick/constants';

type PipelineDetailPageProps = {
  pipeline: PipelineType;
};

function PipelineDetailPage({
  pipeline: pipelineProp,
}: PipelineDetailPageProps) {
  const mainContainerRef = useRef(null);
  const { data, isLoading } = api.pipelines.detail(pipelineProp.uuid);
  const pipeline = data?.pipeline;

  return (
    <>
      <Head title={pipeline?.name} />

      <TripleLayout
        after={<Sidekick views={SIDEKICK_VIEWS} />}
        before={<div style={{ height: 9999 }} />}
        mainContainerRef={mainContainerRef}
      >
        {pipeline && (
          <PipelineDetail
            mainContainerRef={mainContainerRef}
            pipeline={pipeline}
          />
        )}
      </TripleLayout>
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
