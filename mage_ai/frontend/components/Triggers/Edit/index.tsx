import Calendar from 'react-calendar';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineScheduleType, { ScheduleIntervalEnum, TriggerTypeEnum } from '@interfaces/PipelineScheduleType';
import PipelineType from '@interfaces/PipelineType';
import PipelineVariableType, { VariableType } from '@interfaces/PipelineVariableType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import api from '@api';
import { CardStyle, DateSelectionContainer } from './index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { getFormattedVariables, parseVariables } from '@components/Sidekick/utils';
import { onSuccess } from '@api/utils/response';
import { useMutation } from 'react-query';

const TRIGGER_TYPES = [
  {
    label: () => 'Schedule',
    description: () => 'This pipeline will run continuously on an interval or just once.',
    uuid: TriggerTypeEnum.SCHEDULE,
  },
  {
    label: () => 'Event',
    description: () => 'This pipeline will run when a specific event occurs',
    uuid: TriggerTypeEnum.EVENT,
  },
];

type EditProps = {
  pipeline: PipelineType;
  pipelineSchedule?: PipelineScheduleType;
  variables?: PipelineVariableType[];
  setErrors?: (errors: any) => void;
};

function Edit({
  fetchPipelinesSchedule,
  pipeline,
  pipelineSchedule,
  variables,
  setErrors,
}: EditProps) {
  const router = useRouter();
  const pipelineUUID = pipeline?.uuid;
  const pipelineScheduleID = pipelineSchedule?.id;

  const [overwriteVariables, setOverwriteVariables] = useState<boolean>(false);
  const [runtimeVariables, setRuntimeVariables] = useState<{[ variable: string ]: string}>({});
  const [schedule, setSchedule] = useState<PipelineScheduleType>(pipelineSchedule);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  const {
    name,
    schedule_interval: scheduleInterval,
    schedule_type,
    start_time: startTime,
    variables: schedule_variables = {},
  } = schedule || {};
  const [triggerType, setTriggerType] = useState<TriggerTypeEnum>(null);

  const [date, setDate] = useState<Date>(null);
  const [time, setTime] = useState<string>('00:00');

  const [updateSchedule, { isLoading: isLoadingUpdate }] = useMutation(
    api.pipeline_schedules.useUpdate(pipelineScheduleID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipelinesSchedule();
            router.push(
              '/pipelines/[pipeline]/triggers/[...slug]',
              `/pipelines/${pipelineUUID}/triggers/${pipelineScheduleID}`,
            );
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        }
      )
    }
  );

  const scheduleVariables = useMemo(() => schedule_variables || {}, [schedule_variables]);

  useEffect(
    () => {
      if (startTime) {
        const dateTimeSplit = startTime.split(' ');
        const timePart = dateTimeSplit[1];
        setDate(new Date(startTime));
        setTime(timePart.substring(0, 5));
      }
    },
    [startTime],
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
        const formattedVariables = getFormattedVariables(variables, block => block.uuid === 'global');
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
        if (pipelineSchedule.schedule_interval && pipelineSchedule.start_time) {
          setTriggerType(TriggerTypeEnum.SCHEDULE);
        }
      }
    },
    [pipelineSchedule],
  );

  const onSave = useCallback(() => {
    const updatedSchedule = {
      name,
      schedule_interval: scheduleInterval,
      start_time: `${date.toISOString().split('T')[0]} ${time}:00`,
      variables: parseVariables(runtimeVariables),
    };

    // @ts-ignore
    updateSchedule({
      pipeline_schedule: updatedSchedule,
    });
  }, [
    date,
    updateSchedule,
    name,
    runtimeVariables,
    scheduleInterval,
    time,
  ]);

  const detailsMemo = useMemo(() => {
    return (
      <>
        <Spacing mb={2} px={PADDING_UNITS}>
          <Headline level={5}>
            Settings
          </Headline>

          <Text muted>
            Configure schedule details.
          </Text>
        </Spacing>

        <Divider light short />

        <Table
          columnFlex={[null, 1]}
          rows={[
            [
              <Text default>
                Trigger name
              </Text>,
              <TextInput
                monospace
                onChange={(e) => {
                  e.preventDefault();
                  setSchedule(s => ({
                    ...s,
                    name: e.target.value,
                  }));
                }}
                placeholder="Name this trigger"
                value={name}
              />,
            ],
            [
              <Text default>
                Frequency
              </Text>,
              <Select
                monospace
                onChange={(e) => {
                  e.preventDefault();
                  setSchedule(s => ({
                    ...s,
                    schedule_interval: e.target.value,
                  }))
                }}
                placeholder="Choose the frequency to run"
                value={scheduleInterval}
              >
                {!scheduleInterval && <option value="" />}
                {Object.values(ScheduleIntervalEnum).map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>,
            ],
            [
              <Text default>
                Start date and time
              </Text>,
              <Flex flexDirection="column">
                <TextInput
                  monospace
                  onClick={() => setShowCalendar(val => !val)}
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
              </Flex>,
            ],
          ]}
        />
      </>
    );
  }, [
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
            <Table
              columnFlex={[1, 2]}
              rows={Object.entries(runtimeVariables).map(([uuid, value]) => {
                return [
                  <Spacing px={2}>
                    <Text
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
    <PipelineDetailPage
      after={variablesMemo}
      breadcrumbs={[
        {
          label: () => 'Triggers',
          linkProps: {
            as: `/pipelines/${pipelineUUID}/triggers`,
            href: '/pipelines/[pipeline]/triggers',
          },
        },
        {
          label: () => pipelineSchedule?.name,
          linkProps: {
            as: `/pipelines/${pipelineUUID}/triggers/${pipelineScheduleID}`,
            href: '/pipelines/[pipeline]/triggers/[...slug]',
          },
        },
      ]}
      pageName={PageNameEnum.TRIGGERS}
      pipeline={pipeline}
      subheader={(
        <FlexContainer alignItems="center">
          <Button
            loading={isLoadingUpdate}
            onClick={() => onSave()}
            outline
            primary
          >
            Save changes
          </Button>

          <Spacing mr={1} />

          <Button
            blackBorder
            noHoverUnderline
            linkProps={{
              href: '/pipelines/[pipeline]/triggers/[...slug]',
              as: `/pipelines/${pipelineUUID}/triggers/${pipelineScheduleID}`,
            }}
            outline
            sameColorAsText
          >
            Cancel
          </Button>
        </FlexContainer>
      )}
      title={() => `Edit ${pipelineSchedule?.name}`}
    >
      <Spacing p={PADDING_UNITS}>
        <Spacing mb={2}>
          <Headline level={5}>
            Trigger type
          </Headline>

          <Text muted>
            How would you like this pipeline to be triggered?
          </Text>
        </Spacing>

        <FlexContainer>
          {TRIGGER_TYPES.map(({
            label,
            description,
            uuid,
          }) => (
            <Button
              key={uuid}
              noBackground
              noBorder
              noPadding
              onClick={() => setTriggerType(uuid)}
            >
              <CardStyle selected={triggerType === uuid}>
                <FlexContainer alignItems="center">
                  <div>
                    <input checked={triggerType === uuid} type="radio" />
                  </div>

                  <Spacing mr={PADDING_UNITS} />

                  <Flex
                    alignItems="flex-start"
                    flexDirection="column"
                  >
                    <Headline bold large>
                      {label()}
                    </Headline>

                    <Text leftAligned muted>
                      {description()}
                    </Text>
                  </Flex>
                </FlexContainer>
              </CardStyle>
            </Button>
          ))}
        </FlexContainer>
      </Spacing>

      <Spacing mt={5}>
        {TriggerTypeEnum.SCHEDULE === triggerType && detailsMemo}
      </Spacing>
    </PipelineDetailPage>
  );
}

export default Edit;
