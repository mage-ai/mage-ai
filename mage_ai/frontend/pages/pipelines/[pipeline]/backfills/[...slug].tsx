import { useMemo } from 'react';

import BackfillDetail from '@components/Backfills/Detail';
import BackfillEdit from '@components/Backfills/Edit';
import PrivateRoute from '@components/shared/PrivateRoute';
import api from '@api';

type BackfillDetailPageProps = {
  backfillId: number;
  pipelineUUID: string;
  subpath: string;
};

function BackfillDetailPage({
  backfillId: modelID,
  pipelineUUID,
  subpath,
}: BackfillDetailPageProps) {
  const {
    data: dataGlobalVariables,
  } = api.variables.pipelines.list(pipelineUUID);
  const globalVariables = useMemo(() => dataGlobalVariables?.variables, [dataGlobalVariables]);

  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID, {
    includes_content: false,
    includes_outputs: false,
  }, {
    revalidateOnFocus: false,
  });
  const pipeline = useMemo(() => ({
    ...dataPipeline?.pipeline,
    uuid: pipelineUUID,
  }), [dataPipeline, pipelineUUID]);

  const { data, mutate } = api.backfills.detail(modelID);
  const model = useMemo(() => data?.backfill, [data]);

  if ('edit' === subpath) {
    return (
      <BackfillEdit
        backfill={model}
        fetchBackfill={mutate}
        pipeline={pipeline}
        variables={globalVariables}
      />
    );
  }

  return (
    <BackfillDetail
      backfill={model}
      fetchBackfill={mutate}
      pipeline={pipeline}
      variables={globalVariables}
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

export default PrivateRoute(BackfillDetailPage);

