import { useMemo, useState } from 'react';

import BackfillDetail from '@components/Backfills/Detail';
import BackfillEdit from '@components/Backfills/Edit';
import ErrorsType from '@interfaces/ErrorsType';
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
  const [errors, setErrors] = useState<ErrorsType>(null);

  const {
    data: dataGlobalVariables,
  } = api.variables.pipelines.list(pipelineUUID, {}, {
    revalidateOnFocus: false,
  });
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

  const { data, mutate } = api.backfills.detail(modelID, { include_preview_runs: true });
  const model = useMemo(() => data?.backfill, [data]);

  if ('edit' === subpath) {
    return (
      <BackfillEdit
        backfill={model}
        errors={errors}
        fetchBackfill={mutate}
        pipeline={pipeline}
        setErrors={setErrors}
        variables={globalVariables}
      />
    );
  }

  return (
    <BackfillDetail
      backfill={model}
      errors={errors}
      fetchBackfill={mutate}
      pipeline={pipeline}
      setErrors={setErrors}
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

