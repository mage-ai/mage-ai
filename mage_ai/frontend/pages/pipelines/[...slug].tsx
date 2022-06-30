import { useRef } from 'react';

import Head from '@oracle/elements/Head';
import PipelineDetail from '@components/PipelineDetail';
import TripleLayout from '@components/TripleLayout'

function PipelineDetailPage() {
  const mainContainerRef = useRef(null);

  return (
    <>
      <Head title="Pipeline detail page" />

      <TripleLayout
        after={<div style={{ height: 9999 }} />}
        before={<div style={{ height: 9999 }} />}
        mainContainerRef={mainContainerRef}
      >
        <PipelineDetail
          mainContainerRef={mainContainerRef}
        />
      </TripleLayout>
    </>
  );
}

export default PipelineDetailPage;
