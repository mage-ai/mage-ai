import Head from '@oracle/elements/Head';
import TripleLayout from '@components/TripleLayout'

function PipelineDetail() {
  return (
    <div>
      <Head title="Pipeline detail page" />

      <TripleLayout
        after={
          <div>
            Hey
          </div>
        }
        before={
          <div>
            Hey
          </div>
        }
      >

      </TripleLayout>
    </div>
  );
}

export default PipelineDetail;
