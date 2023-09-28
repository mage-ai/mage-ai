import React, { useEffect, useMemo, useState } from 'react';
import Router from 'next/router';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Add, CaretDown, CaretRight } from '@oracle/icons';
import { EntryStyle } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { queryFromUrl } from '@utils/url';

type SidebarProps = {
  pipelineSchedules: {
    [uuid: string]: PipelineScheduleType[],
  };
  pipelineScheduleId: number;
  pipelineUuid: string;
  width?: number;
};

type PipelineSchedulesProps = {
  pipelineUuid: string;
  schedules: PipelineScheduleType[];
  selectedPipelineUuid: string;
  selectedScheduleId: number;
};

function PipelineSchedules({
  pipelineUuid,
  schedules,
  selectedPipelineUuid,
  selectedScheduleId,
}: PipelineSchedulesProps) {
  const pipelineSelected = useMemo(
    () => selectedPipelineUuid === pipelineUuid,
    [pipelineUuid, selectedPipelineUuid],
  );
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(
    () => {
      if (pipelineSelected) {
        setExpanded(true);
      }
    },
    [pipelineSelected],
  )

  return (
    <>
      <EntryStyle>
        <FlexContainer justifyContent="space-between">
          <Link
            noHoverUnderline
            noOutline
            onClick={() => setExpanded(expanded => !expanded)}
          >
            <Flex alignItems="end">
              {expanded && (
                <CaretDown muted size={3 * UNIT} />
              )}
              {!expanded && (
                <CaretRight muted size={3 * UNIT} />
              )}
              <Text
                bold={pipelineSelected}
                monospace
                muted={!pipelineSelected}
                textOverflow
              >
                {pipelineUuid}
              </Text>
            </Flex>
          </Link>
          <Link
            noHoverUnderline
            noOutline
            onClick={() => Router.push({
              pathname: `/pipelines/${pipelineUuid}/triggers/new`,
              query: queryFromUrl(),
            })}
          >
            <Add size={2.5 * UNIT} />
          </Link>
        </FlexContainer>
      </EntryStyle>
      {expanded && schedules?.map(({ id, name }) => {
        const scheduleSelected = pipelineSelected && String(selectedScheduleId) === String(id);

        return (
          <Link
            key={id}
            noHoverUnderline
            noOutline
            onClick={() => Router.push({
              pathname: `/pipelines/${pipelineUuid}/triggers/${id}`,
              query: queryFromUrl(),
            })}
          >
            <EntryStyle
              selected={scheduleSelected}
            >
              <Spacing pl={4}>
                <Text
                  bold={scheduleSelected}
                  monospace
                  muted={!scheduleSelected}
                >
                  {name}
                </Text>
              </Spacing>
            </EntryStyle>
          </Link>
        );
      })}
    </>
  );
}

function Sidebar({
  pipelineSchedules,
  pipelineScheduleId: selectedScheduleId,
  pipelineUuid: selectedPipelineUuid,
  width,
}: SidebarProps) {
  return (
    <FlexContainer flexDirection="column" width={width}>
      {Object.entries(pipelineSchedules || {}).map(([pipelineUuid, schedules], idx) => (
        <PipelineSchedules
          key={`${pipelineUuid}_${idx}`}
          pipelineUuid={pipelineUuid}
          schedules={schedules}
          selectedPipelineUuid={selectedPipelineUuid}
          selectedScheduleId={selectedScheduleId}
        />
      ))}
    </FlexContainer>
  );
}

export default Sidebar;
