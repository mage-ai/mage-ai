import { SelectedScheduleType } from '@interfaces/PipelineScheduleType';
import PipelineType from '@interfaces/PipelineType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { CaretDown, CaretRight } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import React, { useMemo, useState } from 'react';
import { Icon } from 'reaflow';
import { EntryStyle } from './index.style';

type SidebarProps = {
  pipelines: PipelineType[];
  selectedSchedule: SelectedScheduleType;
  setSelectedSchedule: (schedule: SelectedScheduleType) => void;
  width?: number;
};

type PipelineSchedulesProps = {
  pipeline: PipelineType;
  selectedSchedule: SelectedScheduleType;
  setSelectedSchedule: (schedule: SelectedScheduleType) => void;
}

function PipelineSchedules({
  pipeline,
  selectedSchedule,
  setSelectedSchedule,
}: PipelineSchedulesProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  const {
    pipelineUuid: selectedPipelineUuid,
    scheduleName: selectedScheduleName,
  } = selectedSchedule || {};

  const pipelineSchedules = [
    {
      name: 'test1'
    },
    {
      name: 'test2'
    },
    {
      name: 'test3'
    }
  ]

  const pipelineSelected = useMemo(
    () => selectedPipelineUuid === pipeline,
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
              {pipeline}
            </Text>
          </FlexContainer>
        </Link>
      </EntryStyle>
      {expanded && pipelineSchedules?.map(({ name }) => {
        const scheduleSelected = pipelineSelected && selectedScheduleName === name;

        return (
          <EntryStyle
            onClick={() => setSelectedSchedule({
              pipelineUuid: pipeline,
              scheduleName: name,
            })}
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
        );
      })}
    </>
  )
}

function Sidebar({
  pipelines,
  selectedSchedule,
  setSelectedSchedule,
  width,
}: SidebarProps) {
  return (
    <FlexContainer flexDirection="column" width={width}>
      {pipelines?.map(pipeline => (
        <PipelineSchedules
          pipeline={pipeline}
          selectedSchedule={selectedSchedule}
          setSelectedSchedule={setSelectedSchedule}
        />
      ))}
    </FlexContainer>
  )
}

export default Sidebar;