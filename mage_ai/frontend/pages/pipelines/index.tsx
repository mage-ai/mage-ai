import { MutateFunction, useMutation } from 'react-query';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Dashboard from '@components/Dashboard';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import PipelineType, {
  PipelineStatusEnum,
  PipelineTypeEnum,
  PIPELINE_TYPE_LABEL_MAPPING,
} from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import Toolbar from '@components/shared/Table/Toolbar';
import api from '@api';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { ChevronRight, Pause, PlayButtonFilled } from '@oracle/icons';
import { ScheduleStatusEnum } from '@interfaces/PipelineScheduleType';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize, randomNameGenerator } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { queryFromUrl } from '@utils/url';

function PipelineListPage() {
  const router = useRouter();
  const [pipelinesEditing, setPipelinesEditing] = useState<{
    [uuid: string]: boolean;
  }>({});
  const [errors, setErrors] = useState<ErrorsType>(null);

  const query = queryFromUrl();
  const { data, mutate: fetchPipelines } = api.pipelines.list({
    ...query,
    include_schedules: 1,
  });
  const pipelines: PipelineType[] = useMemo(() => data?.pipelines || [], [data]);

  const [createPipeline, { isLoading }]: [MutateFunction<any>, { isLoading: boolean }] = useMutation(
    api.pipelines.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline: {
              uuid,
            },
          }) => {
            router.push('/pipelines/[pipeline]/edit', `/pipelines/${uuid}/edit`);
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const [updatePipeline] = useMutation(
    (pipeline: PipelineType & {
      status: ScheduleStatusEnum;
    }) => api.pipelines.useUpdate(pipeline.uuid)({ pipeline }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline: {
              uuid,
            },
          }) => {
            setPipelinesEditing(prev => ({
              ...prev,
              [uuid]: false,
            }));
            fetchPipelines();
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
    <Dashboard
      errors={errors}
      setErrors={setErrors}
      subheaderChildren={
        <Toolbar
          addButtonProps={{
            isLoading,
            label: 'New pipeline',
            menuItems: [
              {
                label: () => 'Standard (batch)',
                onClick: () => createPipeline({
                  pipeline: {
                    name: randomNameGenerator(),
                  },
                }),
                uuid: 'Pipelines/NewPipelineMenu/standard',
              },
              {
                label: () => 'Data integration',
                onClick: () => createPipeline({
                  pipeline: {
                    name: randomNameGenerator(),
                    type: PipelineTypeEnum.INTEGRATION,
                  },
                }),
                uuid: 'Pipelines/NewPipelineMenu/integration',
              },
              {
                label: () => 'Streaming',
                onClick: () => createPipeline({
                  pipeline: {
                    name: randomNameGenerator(),
                    type: PipelineTypeEnum.STREAMING,
                  },
                }),
                uuid: 'Pipelines/NewPipelineMenu/streaming',
              },
            ],
          }}
          filterOptions={{
            status: Object.values(PipelineStatusEnum),
            type: Object.values(PipelineTypeEnum),
          }}
          filterValueLabelMapping={PIPELINE_TYPE_LABEL_MAPPING}
          query={query}
        />
      }
      title="Pipelines"
      uuid="pipelines/index"
    >
      {pipelines?.length === 0
        ? (
          <Spacing px ={3} py={1}>
            {!data
              ?
                <Spinner inverted large />
              :
                <Text bold default monospace muted>
                  No pipelines available
                </Text>
            }
          </Spacing>
        ): (
          <Table
            buildLinkProps={(rowIndex: number) => ({
              as: `/pipelines/${pipelines[rowIndex].uuid}`,
              href: '/pipelines/[pipeline]',
            })}
            columnFlex={[null, 1, 7, 1, 1, 1, null]}
            columns={[
              {
                label: () => '',
                uuid: 'action',
              },
              {
                uuid: 'Status',
              },
              {
                uuid: 'Name',
              },
              {
                uuid: 'Type',
              },
              {
                uuid: 'Blocks',
              },
              {
                uuid: 'Triggers',
              },
              {
                label: () => '',
                uuid: 'view',
              },
            ]}
            rows={pipelines.map((pipeline, idx) => {
              const {
                blocks,
                name,
                schedules,
                type,
                uuid,
              } = pipeline;
              const blocksCount = blocks.filter(({ type }) => BlockTypeEnum.SCRATCHPAD !== type).length;
              const schedulesCount = schedules.length;
              const isActive = schedules.find(({ status }) => ScheduleStatusEnum.ACTIVE === status);

              return [
                schedulesCount >= 1
                  ? (
                    <Button
                    iconOnly
                      loading={!!pipelinesEditing[uuid]}
                      noBackground
                      noBorder
                      noPadding
                      onClick={(e) => {
                        pauseEvent(e);
                        setPipelinesEditing(prev => ({
                          ...prev,
                          [uuid]: true,
                        }));
                        updatePipeline({
                          ...pipeline,
                          status: isActive
                            ? ScheduleStatusEnum.INACTIVE
                            : ScheduleStatusEnum.ACTIVE,
                        });
                      }}
                    >
                      {isActive
                        ? <Pause muted size={2 * UNIT} />
                        : <PlayButtonFilled default size={2 * UNIT} />
                      }
                    </Button>
                  )
                  : null
                ,
                <Text
                  default={!isActive}
                  key={`pipeline_status_${idx}`}
                  monospace
                  success={!!isActive}
                >
                  {isActive
                    ? ScheduleStatusEnum.ACTIVE
                    : schedulesCount >= 1 ? ScheduleStatusEnum.INACTIVE : 'no schedules'
                  }
                </Text>,
                <Text
                  key={`pipeline_name_${idx}`}
                >
                  {uuid}
                </Text>,
                <Text
                  key={`pipeline_type_${idx}`}
                >
                  {type === PipelineTypeEnum.PYTHON ? 'Standard' : capitalize(type)}
                </Text>,
                <Text
                  default={blocksCount === 0}
                  key={`pipeline_block_count_${idx}`}
                  monospace
                >
                  {blocksCount}
                </Text>,
                <Text
                  default={schedulesCount === 0}
                  key={`pipeline_trigger_count_${idx}`}
                  monospace
                >
                  {schedulesCount}
                </Text>,
                <Flex
                  flex={1} justifyContent="flex-end"
                  key={`chevron_icon_${idx}`}
                >
                  <ChevronRight default size={2 * UNIT} />
                </Flex>,
              ];
            })}
          />
      )}
    </Dashboard>
  );
}

PipelineListPage.getInitialProps = async () => ({});

export default PrivateRoute(PipelineListPage);
