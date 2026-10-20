import {
  useMemo,
  useEffect,
  useState,
} from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import BackfillType from '@interfaces/BackfillType';
import BackfillsTable from '@components/Backfills/Table';
import ErrorsType from '@interfaces/ErrorsType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { Add } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';
import { randomNameGenerator } from '@utils/string';

type PipelineBackfillsProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineBackfills({
  pipeline,
}: PipelineBackfillsProp) {
  const router = useRouter();
  const pipelineUUID = pipeline.uuid;
  const {
    data: dataBackfills,
    mutate: fetchBackfills,
  } = api.backfills.list({
    _limit: 20,
    _offset: 0,
    include_run_count: true,
    pipeline_uuid: pipelineUUID,
  }, {
    refreshInterval: 60000,
  });
  const models = useMemo(() => dataBackfills?.backfills || [], [dataBackfills]);

  const q = queryFromUrl();

  const [selectedRow, setSelectedRow] = useState<BackfillType>(null);
  const [errors, setErrors] = useState<ErrorsType>(null);

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
    const asLink = `/pipelines/${pipelineUUID}/backfills`;

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
    pipelineUUID,
    selectedRow,
  ]);

  const [createBackfill, { isLoading }] = useMutation(
    api.backfills.pipelines.useCreate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            backfill: {
              id,
            },
          }) => {
            router.push(
              '/pipelines/[pipeline]/backfills/[...slug]',
              `/pipelines/${pipelineUUID}/backfills/${id}/edit`,
            );
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  return (
    <PipelineDetailPage
      breadcrumbs={breadcrumbs}
      errors={errors}
      pageName={PageNameEnum.BACKFILLS}
      pipeline={pipeline}
      setErrors={setErrors}
      title={({ name }) => `${name} backfills`}
      uuid={`${PageNameEnum.BACKFILLS}_${pipelineUUID}`}
    >
      <Spacing p={PADDING_UNITS}>
        <KeyboardShortcutButton
          beforeElement={<Add size={2.5 * UNIT} />}
          blackBorder
          inline
          loading={isLoading}
          noHoverUnderline
          // @ts-ignore
          onClick={() => createBackfill({
            backfill: {
              name: randomNameGenerator(),
            },
          })}
          sameColorAsText
          uuid="PipelineDetailPage/Backfills/add_new_backfill"
        >
          Create new backfill
        </KeyboardShortcutButton>
      </Spacing>

      {models && models.length === 0 && (
        <Spacing p={PADDING_UNITS}>
          <Text bold default monospace muted>
            No backfills available
          </Text>
        </Spacing>
      )}
      {models?.length >= 1 && (
        <BackfillsTable
          fetchBackfills={fetchBackfills}
          models={models}
          // onClickRow={({ id }: BackfillType) => goToWithQuery({
          //   backfill_id: id,
          // })}
          pipeline={pipeline}
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

export default PrivateRoute(PipelineBackfills);
