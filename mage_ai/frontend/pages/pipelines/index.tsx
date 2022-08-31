import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType'
import Button from '@oracle/elements/Button';
import Dashboard from '@components/Dashboard';
import Flex from '@oracle/components/Flex';
import FlexTable from '@oracle/components/FlexTable';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType from '@interfaces/PipelineType'
import Text from '@oracle/elements/Text';
import api from '@api';
import { Add, ChevronRight, Pause, PlayButtonFilled } from '@oracle/icons';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import { ScheduleStatusEnum } from '@interfaces/PipelineScheduleType'
import { UNIT } from '@oracle/styles/units/spacing';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { randomNameGenerator } from '@utils/string';

function PipelineListPage() {
  const router = useRouter();
  const [pipelinesEditing, setPipelinesEditing] = useState<{
    [uuid: string]: boolean;
  }>({});

  const { data, mutate: fetchPipelines } = api.pipelines.list({ include_schedules: 1 });

  const pipelines = useMemo(() => data?.pipelines || [], [data]);

  const [createPipeline, { isLoading }] = useMutation(
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
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
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
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      ),
    },
  );

  return (
    <Dashboard
      subheaderChildren={
        <KeyboardShortcutButton
          background={BUTTON_GRADIENT}
          bold
          beforeElement={<Add size={2.5 * UNIT} />}
          inline
          loading={isLoading}
          // @ts-ignore
          onClick={() => createPipeline({
            pipeline: {
              name: randomNameGenerator(),
            },
          })}
          uuid="PipelineListPage/new_pipeline"
        >
          New pipeline
        </KeyboardShortcutButton>
      }
      title="Pipelines"
    >
      <FlexTable
        buildLinkProps={(rowIndex: number) => ({
          as: `/pipelines/${pipelines[rowIndex].uuid}`,
          href: '/pipelines/[pipeline]',
        })}
        columnHeaders={[
          null,
          <Text bold monospace muted>
            Status
          </Text>,
          <Text bold monospace muted>
            Name
          </Text>,
          <Text bold monospace muted>
            Blocks
          </Text>,
          <Text bold monospace muted>
            Schedules
          </Text>,
          null,
        ]}
        columnFlex={[1, 4, 10, 2, 2, 1]}
        rows={pipelines.map((pipeline) => {
          const {
            blocks,
            name,
            schedules,
            uuid,
          } = pipeline;
          const blocksCount = blocks.filter(({ type }) => BlockTypeEnum.SCRATCHPAD !== type).length;
          const schedulesCount = schedules.length;
          const isActive = schedules.find(({ status }) => ScheduleStatusEnum.ACTIVE === status);

          return [
            schedulesCount >= 1
              ? (
                <Button
                  loading={!!pipelinesEditing[uuid]}
                  iconOnly
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
                    : <PlayButtonFilled size={2 * UNIT} success />
                  }
                </Button>
              )
              : null
            ,
            <Text muted={!isActive} success={isActive}>
              {isActive
                ? ScheduleStatusEnum.ACTIVE
                : schedulesCount >= 1 ? ScheduleStatusEnum.INACTIVE : 'no schedules'
              }
            </Text>,
            <Text>
              {name}
            </Text>,
            <Text muted={blocksCount === 0}>
              {blocksCount}
            </Text>,
            <Text muted={schedulesCount === 0}>
              {schedulesCount}
            </Text>,
            <Flex flex={1} justifyContent="flex-end">
              <ChevronRight muted size={2 * UNIT} />
            </Flex>
          ];
        })}
      />
    </Dashboard>
  );
}

export default PipelineListPage;
