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
import { Alphabet, CalendarDate, Schedule } from '@oracle/icons';
import { CardStyle, DateSelectionContainer } from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
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
  fetchPipelinesSchedule: () => void;
  pipeline: PipelineType;
  pipelineSchedule?: PipelineScheduleType;
  variables?: PipelineVariableType[];
};

function Edit({
  fetchPipelinesSchedule,
  pipeline,
  pipelineSchedule,
  variables,
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
          onErrorCallback: (response, errors) => console.log(
            errors,
            response,
          ),
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
        if (pipelineSchedule.schedule_interval || pipelineSchedule.start_time) {
          setTriggerType(TriggerTypeEnum.SCHEDULE);
        }
      }
    },
    [pipelineSchedule],
  );

  const onSave = useCallback(() => {
    const st = date && time
      ? `${date.toISOString().split('T')[0]} ${time}:00`
      : null;

    const updatedSchedule = {
      name,
      schedule_interval: scheduleInterval,
      start_time: st,
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
          <Headline>
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
              <FlexContainer alignItems="center">
                <Alphabet default size={1.5 * UNIT} />
                <Spacing mr={1} />
                <Text default>
                  Trigger name
                </Text>
              </FlexContainer>,
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
              <FlexContainer alignItems="center">
                <Schedule default size={1.5 * UNIT} />
                <Spacing mr={1} />
                <Text default>
                  Frequency
                </Text>
              </FlexContainer>,
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
              <FlexContainer alignItems="center">
                <CalendarDate default size={1.5 * UNIT} />
                <Spacing mr={1} />
                <Text default>
                  Start date and time
                </Text>
              </FlexContainer>,
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

  const eventsMemo = useMemo(() => {
    return (
      <>
        <Spacing mb={2} px={PADDING_UNITS}>
          <Headline>
            Settings
          </Headline>

          <Text muted>
            Configure trigger details.
          </Text>
        </Spacing>

        <Divider light short />

        <Table
          columnFlex={[null, 1]}
          rows={[
            [
              <FlexContainer alignItems="center">
                <Alphabet default size={1.5 * UNIT} />
                <Spacing mr={1} />
                <Text default>
                  Trigger name
                </Text>
              </FlexContainer>,
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
          ]}
        />

        <Spacing mb={2} mt={5} px={PADDING_UNITS}>
          <Headline>
            Events
          </Headline>

          <Text muted>
            Add 1 or more event that will trigger this pipeline to run.
          </Text>
        </Spacing>

        <Divider light short />
      </>
    );
  }, [
    name,
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
              columnFlex={[null, 1]}
              columns={[
                {
                  uuid: 'Variable',
                },
                {
                  uuid: 'Value',
                },
              ]}
              rows={Object.entries(runtimeVariables).map(([uuid, value]) => {
                return [
                  <Text
                    default
                    monospace
                  >
                    {uuid}
                  </Text>,
                  <TextInput
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
                    placeholder="Variable value"
                    value={value}
                  />,
                ];
              })}
            />
          </Spacing>
        )}
      </>
    )
  }, [overwriteVariables, runtimeVariables, setOverwriteVariables]);

  return (
    <PipelineDetailPage
      after={(
        <Spacing p={PADDING_UNITS}>
          {variablesMemo}
        </Spacing>
      )}
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
      uuid="triggers/edit"
    >
      <Spacing p={PADDING_UNITS}>
        <Spacing mb={2}>
          <Headline>
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
          }) => {
            const selected = triggerType === uuid;
            const othersSelected = triggerType && !selected;

            return (
              <Button
                key={uuid}
                noBackground
                noBorder
                noPadding
                onClick={() => setTriggerType(uuid)}
              >
                <CardStyle selected={selected}>
                  <FlexContainer alignItems="center">
                    <Flex>
                      <input checked={selected} type="radio" />
                    </Flex>

                    <Spacing mr={PADDING_UNITS} />

                    <Flex
                      alignItems="flex-start"
                      flexDirection="column"
                    >
                      <Headline
                        default={!selected && !othersSelected}
                        bold
                        level={5}
                        muted={!selected && othersSelected}
                      >
                        {label()}
                      </Headline>

                      <Text
                        default={!selected && !othersSelected}
                        leftAligned
                        muted={othersSelected}
                      >
                        {description()}
                      </Text>
                    </Flex>
                  </FlexContainer>
                </CardStyle>
              </Button>
            );
          })}
        </FlexContainer>
      </Spacing>

      <Spacing mt={5}>
        {TriggerTypeEnum.SCHEDULE === triggerType && detailsMemo}
        {TriggerTypeEnum.EVENT === triggerType && eventsMemo}
      </Spacing>
    </PipelineDetailPage>
  );
}

export default Edit;
