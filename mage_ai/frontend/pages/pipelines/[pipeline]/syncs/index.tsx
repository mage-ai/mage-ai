import {
  useCallback,
  useMemo,
  useEffect,
  useState,
} from 'react';

import ErrorsType from '@interfaces/ErrorsType';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunType from '@interfaces/PipelineRunType';
import PrivateRoute from '@components/shared/PrivateRoute';
import SyncRow from '@components/PipelineDetail/Syncs/SyncRow';
import SyncRowDetail from '@components/PipelineDetail/Syncs/SyncRowDetail';
import api from '@api';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { getStreams } from '@utils/models/pipelineRun';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl } from '@utils/url';

type PipelineSyncsProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineSyncs({
  pipeline,
}: PipelineSyncsProp) {
  const pipelineUUID = pipeline.uuid;
  const {
    data: dataPipelineRuns,
  } = api.pipeline_runs.list({
    _limit: 20,
    _offset: 0,
    pipeline_uuid: pipelineUUID,
  }, {
    refreshInterval: 5000,
  });
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);

  const q = queryFromUrl();

  const [errors, setErrors] = useState<ErrorsType>(null);
  const [selectedStream, setSelectedStream] = useState<string>(null);
  const [selectedPipelineRun, setSelectedPipelineRun] = useState<PipelineRunType>(null);

  useEffect(() => {
    if (q?.pipeline_run_id) {
      setSelectedPipelineRun(pipelineRuns?.find(({ id }) => id === Number(q.pipeline_run_id)));
    } else if (selectedPipelineRun) {
      setSelectedPipelineRun(null);
    }

    if (q?.stream) {
      setSelectedStream(q.stream);
    } else if (selectedStream) {
      setSelectedStream(null);
    }
  }, [
    pipelineRuns,
    q,
    selectedPipelineRun,
    selectedStream,
  ]);

  const buildSidekick = useCallback(() => {
    const streams = selectedPipelineRun ? getStreams(selectedPipelineRun) : [];

    return (
      <SyncRowDetail
        onClickRow={(rowIndex: number) => {
          const stream = streams[rowIndex];

          goToWithQuery({
            stream: selectedStream === stream ? null : stream,
          });
        }}
        pipelineRun={selectedPipelineRun}
        selectedStream={selectedStream}
      />
    );
  }, [
    selectedPipelineRun,
    selectedStream,
  ]);

  const breadcrumbs = useMemo(() => {
    let asLink = `/pipelines/${pipelineUUID}/syncs`;
    if (selectedPipelineRun) {
      asLink = `${asLink}?pipeline_run_id=${selectedPipelineRun.id}`;
    }

    const arr = [
      {
        label: () => 'Syncs',
        linkProps: selectedStream
          ? {
            as: asLink,
            href: '/pipelines/[pipeline]/syncs',
          }
          : null
        ,
      },
    ];

    if (selectedStream) {
      // @ts-ignore
      arr.push({
        label: () => selectedStream,
      });
    }

    return arr;
  }, [
    pipelineUUID,
    selectedPipelineRun,
    selectedStream,
  ]);

  return (
    <PipelineDetailPage
      breadcrumbs={breadcrumbs}
      buildSidekick={buildSidekick}
      errors={errors}
      pageName={PageNameEnum.SYNCS}
      pipeline={pipeline}
      setErrors={setErrors}
      title={({ name }) => `${name} syncs`}
      uuid={`${PageNameEnum.SYNCS}_${pipelineUUID}`}
    >
      {pipelineRuns.map((pipelineRun: PipelineRunType) => {
        const selected = selectedPipelineRun?.id === pipelineRun.id;

        return (
          <SyncRow
            key={pipelineRun.id}
            onSelect={(id: number) => goToWithQuery({
              pipeline_run_id: id,
              stream: null,
            })}
            pipelineRun={pipelineRun}
            selected={selected}
          />
        );
      })}
    </PipelineDetailPage>
  );
}

PipelineSyncs.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PrivateRoute(PipelineSyncs);
