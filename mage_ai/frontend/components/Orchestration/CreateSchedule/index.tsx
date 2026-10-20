import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Calendar from 'react-calendar';
import styled from 'styled-components';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import ClickOutside from '@oracle/components/ClickOutside';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlexTable from '@oracle/components/FlexTable';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineScheduleType, { ScheduleIntervalEnum } from '@interfaces/PipelineScheduleType';
import PipelineType from '@interfaces/PipelineType';
import PipelineVariableType, { GLOBAL_VARIABLES_UUID } from '@interfaces/PipelineVariableType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import api from '@api';
import { BLUE_TEXT, LIME_DARK } from '@oracle/styles/colors/main';
import { DateSelectionContainer } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { getFormattedVariables, parseVariables } from '@components/Sidekick/utils';
import { queryFromUrl, queryString } from '@utils/url';
import { onSuccess } from '@api/utils/response';

const ContainerStyle = styled.div<any>`
  padding: ${3 * UNIT}px;
`;

type CreateScheduleProps = {
  editSchedule?: boolean;
  pipeline: PipelineType;
  pipelineSchedule?: PipelineScheduleType;
  variables?: PipelineVariableType[];
  setErrors?: (errors: any) => void;
};

function CreateSchedule({
  editSchedule,
  pipeline,
  pipelineSchedule,
  variables,
  setErrors,
}: CreateScheduleProps) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<PipelineScheduleType>(pipelineSchedule);
  const [runtimeVariables, setRuntimeVariables] = useState<{[ variable: string ]: string}>({});
  const [overwriteVariables, setOverwriteVariables] = useState<boolean>(false);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  const [date, setDate] = useState<Date>(null);
  const [time, setTime] = useState<string>('00:00');

  const [createSchedule] = useMutation(
    api.pipeline_schedules.pipelines.useCreate(pipeline?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => router.push(
            '/pipelines/[pipeline]/triggers',
            `/pipelines/${pipeline?.uuid}/triggers`,
          ),
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        }
      )
    }
  );

  const [updateSchedule] = useMutation(
    api.pipeline_schedules.useUpdate(pipelineSchedule?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback:
            (res) =>
              window.location.href =
                `${router?.basePath}/pipelines/${pipeline?.uuid}/triggers/` +
                `${res?.pipeline_schedule?.id}?${queryString(queryFromUrl())}`,
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        }
      )
    }
  );

  const {
    name,
    schedule_type,
    start_time,
    schedule_interval,
    variables: schedule_variables = {},
  } = schedule || {};

  const scheduleVariables = useMemo(() => schedule_variables || {}, [schedule_variables]);

  useEffect(
    () => {
      if (start_time) {
        const dateTimeSplit = start_time.split(' ');
        const timePart = dateTimeSplit[1];
        setDate(new Date(start_time));
        setTime(timePart.substring(0, 5));
      }
    },
    [start_time],
  );

  useEffect(
    () => {
      if (scheduleVariables && Object.keys(scheduleVariables).length > 0) {
        setOverwriteVariables(true);
      }
    },
    [scheduleVariables],
  );

  useEffect(
    () => {
      if (variables) {
        const formattedVariables = getFormattedVariables(variables, block => block.uuid === GLOBAL_VARIABLES_UUID);
        if (overwriteVariables) {
          setRuntimeVariables(formattedVariables?.reduce(
            (vars, { uuid, value }) => ({ ...vars, [uuid]: scheduleVariables[uuid] || value }),
            {},
          ));
        } else {
          setRuntimeVariables(null);
        }
      }
    },
    [overwriteVariables],
  );

  useEffect(
    () => {
      if (pipelineSchedule) {
        setSchedule(pipelineSchedule);
      }
    },
    [pipelineSchedule],
  );

  const onSave = useCallback(() => {
    const updatedSchedule = {
      name,
      start_time: `${date.toISOString().split('T')[0]} ${time}:00`,
      schedule_interval,
      variables: parseVariables(runtimeVariables),
    };

    const scheduleAction = editSchedule ? updateSchedule : createSchedule;

    // @ts-ignore
    scheduleAction({
      pipeline_schedule: updatedSchedule,
    });
  }, [
    createSchedule,
    editSchedule,
    date,
    updateSchedule,
    name,
    runtimeVariables,
    schedule_interval,
    time,
  ]);

  const detailsMemo = useMemo(() => (
    <>
      <Headline level={5} monospace>
        Details
      </Headline>
      <Spacing mb={2} />
      <FlexTable
        borderRadius
        columnFlex={[1, 2]}
        paddingHorizontal={0}
        rows={[
          [
            <Spacing pl={2}>
              <Text
                color={BLUE_TEXT}
                monospace
              >
                job name
              </Text>
            </Spacing>,
            <TextInput
              borderless
              monospace
              onChange={e => {
                e.preventDefault();
                setSchedule(s => ({
                  ...s,
                  name: e.target.value,
                }));
              }}
              paddingHorizontal={16}
              paddingVertical={12}
              placeholder="enter schedule name"
              value={name}
            />
          ],
          [
            <Spacing pl={2}>
              <Text
                color={BLUE_TEXT}
                monospace
              >
                frequency
              </Text>
            </Spacing>,
            <Select
              monospace
              noBorder
              onChange={e => {
                e.preventDefault();
                setSchedule(s => ({
                  ...s,
                  schedule_interval: e.target.value,
                }))
              }}
              paddingHorizontal={16}
              paddingVertical={12}
              placeholder="select interval"
              value={schedule_interval}
            >
              {Object.values(ScheduleIntervalEnum).map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          ],
          [
            <Spacing pl={2}>
              <Text
                color={BLUE_TEXT}
                monospace
              >
                start date
              </Text>
            </Spacing>,
            <Flex flexDirection="column">
              <TextInput
                borderless
                monospace
                onClick={() => setShowCalendar(val => !val)}
                paddingHorizontal={16}
                paddingVertical={12}
                placeholder="YYYY-MM-DD HH:MM"
                value={date
                  ? `${date.toISOString().split('T')[0]} ${time}`
                  : ''
                }
              />
              <div style={{ position: 'absolute', zIndex: 100 }}>
                <ClickOutside
                  disableEscape
                  onClickOutside={() => setShowCalendar(false)}
                  open={showCalendar}
                >
                  <DateSelectionContainer>
                    <Calendar
                      onChange={setDate}
                      value={date}
                    />
                    <Spacing mb={2} />
                    <TextInput
                      label="Time (UTC)"
                      monospace
                      onChange={e => {
                        e.preventDefault();
                        setTime(e.target.value);
                      }}
                      paddingVertical={12}
                      value={time}
                    />
                  </DateSelectionContainer>
                </ClickOutside>
              </div>
            </Flex>
          ],
        ]}
      />
    </>
  ), [
    date,
    schedule,
    showCalendar,
    time,
  ]);

  // TODO: allow users to set their own custom runtime variables.
  const variablesMemo = useMemo(() => {
    return (
      <>
        <FlexContainer alignItems="center">
          <Spacing mr={2}>
            <ToggleSwitch
              checked={overwriteVariables}
              onCheck={setOverwriteVariables}
            />
          </Spacing>
          <Text monospace muted>
            Overwrite global variables
          </Text>
        </FlexContainer>
        {overwriteVariables && runtimeVariables
          && Object.entries(runtimeVariables).length > 0 && (
          <Spacing mt={2}>
            <FlexTable
              borderRadius
              columnFlex={[1, 2]}
              paddingHorizontal={0}
              paddingVertical={12}
              rows={Object.entries(runtimeVariables).map(([uuid, value]) => {
                return [
                  <Spacing px={2}>
                    <Text
                      color={LIME_DARK}
                      monospace
                    >
                      {uuid}
                    </Text>
                  </Spacing>,
                  <Spacing px={2}>
                    <TextInput
                      compact
                      borderless
                      monospace
                      onChange={(e) => {
                        e.preventDefault();
                        setRuntimeVariables(vars => ({
                          ...vars,
                          [uuid]: e.target.value,
                        }));
                      }}
                      paddingHorizontal={0}
                      placeholder="variable"
                      value={value}
                    />
                  </Spacing>,
                ]
              })}
            />
          </Spacing>
        )}
      </>
    )
  }, [overwriteVariables, runtimeVariables, setOverwriteVariables]);

  return (
    <ContainerStyle>
      <FlexContainer flexDirection="column" fullWidth>
        <FlexContainer justifyContent="space-between">
          <Headline level={2} monospace>
            {editSchedule ? 'Configure' : 'Create new schedule'}
          </Headline>
          <Flex>
            {/* <Button
              beforeIcon={<PlayButtonFilled inverted size={UNIT * 2}/>}
              success
            >
              <Text inverted monospace>
                Start
              </Text>
            </Button>
            <Spacing ml={2} /> */}
            <KeyboardShortcutButton
              blackBorder
              inline
              noHoverUnderline
              onClick={onSave}
              sameColorAsText
              uuid="PipelineDetailPage/save"
            >
              Save
            </KeyboardShortcutButton>
          </Flex>
        </FlexContainer>
        <Spacing my={3}>
          {detailsMemo}
        </Spacing>
        {variablesMemo}
      </FlexContainer>
    </ContainerStyle>
  )
}

export default CreateSchedule;
