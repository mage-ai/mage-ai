import React, { useMemo, useState } from 'react';

import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineScheduleType, { SelectedScheduleType } from '@interfaces/PipelineScheduleType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { CaretDown, CaretRight } from '@oracle/icons';
import { EntryStyle } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';

type SidebarProps = {
  pipelineSchedules: {
    [uuid: string]: PipelineScheduleType[],
  };
  selectedSchedule: SelectedScheduleType;
  setSelectedSchedule: (schedule: SelectedScheduleType) => void;
  width?: number;
};

type PipelineSchedulesProps = {
  pipelineUuid: string;
  schedules: PipelineScheduleType[];
  selectedSchedule: SelectedScheduleType;
  setSelectedSchedule: (schedule: SelectedScheduleType) => void;
};

function PipelineSchedules({
  pipelineUuid,
  schedules,
  selectedSchedule,
  setSelectedSchedule,
}: PipelineSchedulesProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  const {
    pipelineUuid: selectedPipelineUuid,
    scheduleName: selectedScheduleName,
  } = selectedSchedule || {};

  const pipelineSelected = useMemo(
    () => selectedPipelineUuid === pipelineUuid,
    [selectedPipelineUuid],
  );

  return (
    <>
      <EntryStyle>
        <Link
          noHoverUnderline
          noOutline
          onClick={() => setExpanded(expanded => !expanded)}
        >
          <FlexContainer alignItems="end">
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
          </FlexContainer>
        </Link>
      </EntryStyle>
      {expanded && schedules?.map(({ name }) => {
        const scheduleSelected = pipelineSelected && selectedScheduleName === name;

        return (
          <Link
            noHoverUnderline
            noOutline
            onClick={() => setSelectedSchedule({
              pipelineUuid,
              scheduleName: name,
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
  selectedSchedule,
  setSelectedSchedule,
  width,
}: SidebarProps) {
  return (
    <FlexContainer flexDirection="column" width={width}>
      {Object.entries(pipelineSchedules || {}).map(([pipelineUuid, schedules]) => (
        <PipelineSchedules
          pipelineUuid={pipelineUuid}
          schedules={schedules}
          selectedSchedule={selectedSchedule}
          setSelectedSchedule={setSelectedSchedule}
        />
      ))}
    </FlexContainer>
  );
}

export default Sidebar;
