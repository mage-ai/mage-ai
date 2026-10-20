import { useEffect, useMemo, useState } from 'react';

import BackfillDetail from '@components/Backfills/Detail';
import BackfillEdit from '@components/Backfills/Edit';
import ErrorsType from '@interfaces/ErrorsType';
import PrivateRoute from '@components/shared/PrivateRoute';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { queryFromUrl } from '@utils/url';

const LIMIT = 40;

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
    data: dataVariables,
  } = api.variables.pipelines.list(pipelineUUID, {}, {
    revalidateOnFocus: false,
  });
  const globalVariables = useMemo(() => dataVariables?.variables, [dataVariables]);

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

  const q = queryFromUrl();

  const backfillsQuery = {
    _limit: LIMIT,
    _offset: (q?.page ? q.page : 0) * LIMIT,
    include_preview_runs: true,
  };

  const { data, mutate } = api.backfills.detail(modelID, {
    ...backfillsQuery,
  }, {
    revalidateOnFocus: true,
  });
  const model = useMemo(() => data?.backfill, [data]);

  const qPrev = usePrevious(q);
  useEffect(() => {
    if (qPrev?.page !== q?.page) {
      mutate();
    }
  }, [mutate, q, qPrev]);

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

