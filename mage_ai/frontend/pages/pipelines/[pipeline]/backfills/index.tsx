import {
  useCallback,
  useMemo,
  useEffect,
  useState,
} from 'react';

import BackfillType from '@interfaces/BackfillType';
import BackfillsTable from '@components/Backfills/Table';
import PipelineDetailPage from '@components/PipelineDetailPage';
import RowDetail from '@components/Backfills/RowDetail';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl } from '@utils/url';

type PipelineBackfillsProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineBackfills({
  pipeline,
}: PipelineBackfillsProp) {
  const pipelineUUID = pipeline.uuid;
  const {
    data: dataPipelineRuns,
    mutate: fetchPipelineRuns,
  } = api.backfills.list({
    _limit: 20,
    _offset: 0,
    pipeline_uuid: pipelineUUID,
  }, {
    refreshInterval: 5000,
  });
  const models = useMemo(() => dataPipelineRuns?.backfills || [], [dataPipelineRuns]);

  const q = queryFromUrl();

  const [selectedRow, setSelectedRow] = useState<BackfillType>(null);

  useEffect(() => {
    if (q?.backfill_id) {
      setSelectedRow(models?.find(({ id }) => id === Number(q.backfill_id)));
    } else if (selectedRow) {
      setSelectedRow(null);
    }
  }, [
    models,
    q,
    selectedRow,
  ]);

  // const buildSidekick = useCallback(() => {
  //   const streams = selectedRow ? getStreams(selectedRow) : [];

  //   return (
  //     <RowDetail
  //       onClickRow={(rowIndex: number) => {
  //         const stream = streams[rowIndex];

  //         goToWithQuery({
  //           stream: selectedStream === stream ? null : stream,
  //         });
  //       }}
  //       pipelineRun={selectedRow}
  //       selectedStream={selectedStream}
  //     />
  //   );
  // }, [
  //   selectedRow,
  //   selectedStream,
  // ]);

  const breadcrumbs = useMemo(() => {
    let asLink = `/pipelines/${pipelineUUID}/backfills`;

    const arr = [
      {
        label: () => 'Backfills',
        linkProps: selectedRow ? {
          as: asLink,
          href: '/pipelines/[pipeline]/backfills',
        } : null,
      },
    ];

    if (selectedRow) {
      // @ts-ignore
      arr.push({
        label: () => selectedRow.name,
      });
    }

    return arr;
  }, [
    selectedRow,
  ]);

  return (
    <PipelineDetailPage
      breadcrumbs={breadcrumbs}
      // buildSidekick={buildSidekick}
      pageName={PageNameEnum.BACKFILLS}
      pipeline={pipeline}
      title={({ name }) => `${name} backfills`}
      uuid={`${PageNameEnum.BACKFILLS}_${pipelineUUID}`}
    >
      {models && models.length === 0 && (
        <Spacing p={2}>
          <Text bold default monospace muted>
            No backfills
          </Text>
        </Spacing>
      )}
      {models?.length >= 1 && (
        <BackfillsTable
          models={models}
          onClickRow={({ id }: BackfillType) => goToWithQuery({
            backfill_id: id,
          })}
          selectedRow={selectedRow}
        />
      )}
    </PipelineDetailPage>
  );
}

PipelineBackfills.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PipelineBackfills;
