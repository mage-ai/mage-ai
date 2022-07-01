import { useRef } from 'react';

import Head from '@oracle/elements/Head';
import PipelineDetail from '@components/PipelineDetail';
import PipelineType from '@interfaces/PipelineType';
import Sidekick from '@components/Sidekick';
import TripleLayout from '@components/TripleLayout';
import { SIDEKICK_VIEWS } from '@components/Sidekick/constants';

type PipelineDetailPageProps = {
  pipeline: PipelineType;
};

function PipelineDetailPage({
  pipeline,
}: PipelineDetailPageProps) {
  const mainContainerRef = useRef(null);

  return (
    <>
      <Head title="Pipeline detail page" />

      <TripleLayout
        after={<Sidekick views={SIDEKICK_VIEWS} />}
        before={<div style={{ height: 9999 }} />}
        mainContainerRef={mainContainerRef}
      >
        <PipelineDetail
          mainContainerRef={mainContainerRef}
          pipeline={pipeline}
        />
      </TripleLayout>
    </>
  );
}

PipelineDetailPage.getInitialProps = async (ctx: any) => {
  const { slug: slugArray }: { slug: string[] } = ctx.query;
  let pipelineId;

  if (Array.isArray(slugArray)) {
    pipelineId = slugArray[0];
  }

  return {
    pipeline: {
      id: pipelineId,
    },
  };
};

export default PipelineDetailPage;
