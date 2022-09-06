import React, { useMemo } from 'react';

import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlexTable from '@oracle/components/FlexTable';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import PipelineType from '@interfaces/PipelineType';
import Router from 'next/router';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import { ChevronRight } from '@oracle/icons';
import { HeaderStyle } from './index.style';
import { LIME_DARK } from '@oracle/styles/colors/main';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { queryFromUrl } from '@utils/url';

type OrchestrationDetailProps = {
  pipeline: PipelineType;
  pipelineSchedule: PipelineScheduleType;
}

function OrchestrationDetail({
  pipeline,
  pipelineSchedule,
}: OrchestrationDetailProps) {
  const {
    uuid: pipelineUUID,
  } = pipeline || {};
  const { data: dataPipelineRuns } =
    api.pipeline_runs.pipeline_schedules.list(pipelineSchedule?.id);
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);

  const {
    id,
    name,
    schedule_interval,
    start_time,
  } = pipelineSchedule || {};

  return (
    <>
      <HeaderStyle>
        <FlexContainer justifyContent="space-between">
          <FlexContainer>
            <div
              style={{
                height: '100%',
                width: '4px',
                backgroundColor: LIME_DARK,
                borderRadius: '2px',
                marginRight: `${2 * UNIT}px`,
              }}
            />
            <Flex flexDirection="column">
              <Headline
                level={3}
                monospace
              >
                {name}
              </Headline>
              <Text monospace muted>
                {schedule_interval} @ {start_time}
              </Text>
            </Flex>
          </FlexContainer>
          <div>
            <KeyboardShortcutButton
              blackBorder
              inline
              linkProps={{
                as: `/pipelines/${pipelineUUID}/triggers/${id}/edit`,
                href: '/pipelines/[pipeline]/triggers/[...slug]',
              }}
              noHoverUnderline
              sameColorAsText
              uuid="PipelineDetailPage/edit_schedule"
            >
              Edit trigger
            </KeyboardShortcutButton>
          </div>
        </FlexContainer>
      </HeaderStyle>

      <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
        <Headline level={5}>
          Pipeline runs
        </Headline>
        <Divider light mt={PADDING_UNITS} short />
      </Spacing>

      <FlexTable
        buildLinkProps={(rowIndex: number) => ({
          as: `/pipelines/${pipelineUUID}/runs?pipeline_run_id=${pipelineRuns[rowIndex].id}&tab=block_runs`,
          href: '/pipelines/[pipeline]/runs',
        })}
        columnHeaders={[
          <Text bold monospace muted>
            Run date
          </Text>,
          <Text bold monospace muted>
            Status
          </Text>,
          <Text bold monospace muted>
            Block runs
          </Text>,
          null,
        ]}
        columnFlex={[3, 2, 2, 1]}
        rows={pipelineRuns.map(({
          block_runs_count: blockRunsCount,
          created_at: createdAt,
          pipeline_schedule_name: pipelineScheduleName,
          pipeline_uuid: pipelineUUID,
          status,
        }: PipelineRunType) => [
          <Text monospace>
            {createdAt}
          </Text>,
          <Text
            danger={RunStatus.FAILED === status}
            info={RunStatus.INITIAL === status}
            muted={RunStatus.CANCELLED === status}
            success={RunStatus.COMPLETED === status}
            warning={RunStatus.RUNNING === status}
          >
            {status}
          </Text>,
          <Text>
            {blockRunsCount}
          </Text>,
          <Flex flex={1} justifyContent="flex-end">
            <ChevronRight muted size={2 * UNIT} />
          </Flex>,
        ])}
      />
    </>
  )
}

export default OrchestrationDetail;
