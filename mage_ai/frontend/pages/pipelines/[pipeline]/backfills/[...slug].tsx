import BackfillDetail from '@components/Backfills/Detail';
import BackfillEdit from '@components/Backfills/Edit';

type BackfillDetailPageProps = {
  backfillId: number;
  pipelineUUID: string;
  subpath: string;
};

function BackfillDetailPage({
  backfillId,
  pipelineUUID,
  subpath,
}: BackfillDetailPageProps) {
  if ('edit' === subpath) {
    return (
      <BackfillEdit
        // fetchPipelineSchedule={fetchPipelineSchedule}
        // pipeline={pipeline}
        // pipelineSchedule={pipelineSchedule}
        // variables={globalVariables}
      />
    );
  }

  return (
    <BackfillDetail
      // fetchPipelineSchedule={fetchPipelineSchedule}
      // pipeline={pipeline}
      // pipelineSchedule={pipelineSchedule}
      // variables={globalVariables}
    />
  );
}

BackfillDetailPage.getInitialProps= async(ctx: any) => {
  const {
    pipeline: pipelineUUID,
    slug: slugArray,
  }: {
    pipeline: string,
    slug: string[],
  } = ctx.query;

  if (Array.isArray(slugArray)) {
    const [backfillId, subpath] = slugArray;

    return {
      backfillId,
      pipelineUUID,
      subpath,
    };
  }

  return {
    pipelineUUID,
  };
};

export default BackfillDetailPage;

