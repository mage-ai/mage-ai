import { MutateFunction, useMutation } from 'react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Dashboard from '@components/Dashboard';
import Flex from '@oracle/components/Flex';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';

import { Add, ChevronRight, Pause, PlayButtonFilled } from '@oracle/icons';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import { ScheduleStatusEnum } from '@interfaces/PipelineScheduleType';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize, randomNameGenerator } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';

function PipelineListPage() {
  const router = useRouter();
  const [pipelinesEditing, setPipelinesEditing] = useState<{
    [uuid: string]: boolean;
  }>({});
  const [newPipelineMenuOpen, setNewPipelineMenuOpen] = useState(false);
  const newPipelineMenuRef = useRef(null);

  const { data, mutate: fetchPipelines } = api.pipelines.list({ include_schedules: 1 });

  const pipelines: PipelineType[] = useMemo(() => data?.pipelines || [], [data]);
  const closeNewPipelineMenu = useCallback(() => setNewPipelineMenuOpen(false), []);

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
        <FlyoutMenuWrapper
          disableKeyboardShortcuts
          items={[
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
              label: () => 'Streaming',
              onClick: () => createPipeline({
                pipeline: {
                  name: randomNameGenerator(),
                  type: PipelineTypeEnum.STREAMING,
                },
              }),
              uuid: 'Pipelines/NewPipelineMenu/streaming',
            },
            // {
            //   label: () => 'Data integration',
            //   onClick: () => createPipeline({
            //     pipeline: {
            //       name: randomNameGenerator(),
            //       type: PipelineTypeEnum.INTEGRATION,
            //     },
            //   }),
            //   uuid: 'Pipelines/NewPipelineMenu/data_integration',
            // },
          ]}
          onClickCallback={closeNewPipelineMenu}
          onClickOutside={closeNewPipelineMenu}
          open={newPipelineMenuOpen}
          parentRef={newPipelineMenuRef}
          roundedStyle
          uuid="pipelines/new_pipeline_menu"
        >
          <KeyboardShortcutButton
            background={BUTTON_GRADIENT}
            beforeElement={<Add size={2.5 * UNIT} />}
            bold
            inline
            loading={isLoading}
            onClick={e => {
              e.preventDefault();
              setNewPipelineMenuOpen(prevOpenState => !prevOpenState);
            }}
            uuid="pipelines/new_pipeline_button"
          >
            New pipeline
          </KeyboardShortcutButton>
        </FlyoutMenuWrapper>
      }
      title="Pipelines"
      uuid="pipelines/index"
    >
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
              {name}
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
    </Dashboard>
  );
}

export default PipelineListPage;
