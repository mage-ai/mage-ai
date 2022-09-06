import Calendar from 'react-calendar';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import ErrorPopup from '@components/ErrorPopup';
import EventMatcherType, { PROVIDER_EVENTS } from '@interfaces/EventMatcherType';
import EventRuleType from '@interfaces/EventRuleType';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import List from '@oracle/elements/List';
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
import {
  Add,
  Alphabet,
  CalendarDate,
  Schedule,
  Trash,
} from '@oracle/icons';
import { CardStyle, DateSelectionContainer } from './index.style';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { getFormattedVariables, parseVariables } from '@components/Sidekick/utils';
import { getTriggerType } from '@utils/models/trigger';
import { indexBy, removeAtIndex } from '@utils/array';
import { onSuccess } from '@api/utils/response';

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
  fetchPipelineSchedule: () => void;
  pipeline: PipelineType;
  pipelineSchedule?: PipelineScheduleType;
  variables?: PipelineVariableType[];
};

function Edit({
  fetchPipelineSchedule,
  pipeline,
  pipelineSchedule,
  variables,
}: EditProps) {
  const router = useRouter();
  const pipelineUUID = pipeline?.uuid;
  const pipelineScheduleID = pipelineSchedule?.id;

  const [errors, setErrors] = useState(null);

  const [eventMatchers, setEventMatchers] = useState<EventMatcherType[]>([]);
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

  const { data: dataEventRules } = api.event_rules.detail('aws');
  const eventRules: EventRuleType[] = useMemo(() => dataEventRules?.event_rules || [], [dataEventRules]);
  const eventRulesByName = useMemo(() => indexBy(eventRules, ({ name }) => name), [eventRules]);

  const [updateSchedule, { isLoading: isLoadingUpdate }] = useMutation(
    api.pipeline_schedules.useUpdate(pipelineScheduleID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipelineSchedule();
            router.push(
              '/pipelines/[pipeline]/triggers/[...slug]',
              `/pipelines/${pipelineUUID}/triggers/${pipelineScheduleID}`,
            );
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const scheduleVariables = useMemo(() => schedule_variables || {}, [schedule_variables]);

  useEffect(
    () => {
      if (startTime) {
        const dateTimeSplit = startTime.split(' ');
        const timePart = dateTimeSplit[1];
        const startTimeDate = new Date(startTime);
        const utcTs = Date.UTC(
          startTimeDate.getFullYear(),
          startTimeDate.getMonth(),
          startTimeDate.getDate(),
        );
        setDate(new Date(utcTs));
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
        setEventMatchers(pipelineSchedule.event_matchers);
        setSchedule(pipelineSchedule);
        setTriggerType(getTriggerType(pipelineSchedule));
      }
    },
    [pipelineSchedule],
  );

  console.log(eventRulesByName)

  const onSave = useCallback(() => {
    const st = date && time
      ? `${date.toISOString().split('T')[0]} ${time}:00`
      : null;

    const updatedSchedule = {
      event_matchers: eventMatchers?.map((eventMatcher) => {
        const patternString = eventRulesByName[eventMatcher.name]?.event_pattern;
        const pattern = patternString ? JSON.parse(patternString) : null;

        return {
          ...eventMatcher,
          pattern,
        };
      }),
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
    eventMatchers,
    eventRulesByName,
    name,
    runtimeVariables,
    scheduleInterval,
    time,
    updateSchedule,
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



  const updateEventMatcher = useCallback((idx, data: {
    [key: string]: string;
  }) => {
    setEventMatchers(prev => {
      Object.entries(data).forEach(([k, v]) => {
        prev[idx][k] = v;
      });

      return [...prev];
    });
  }, [setEventMatchers]);

  const eventsMemo = useMemo(() => {
    return (
      <>
        <Spacing mb={PADDING_UNITS} px={PADDING_UNITS}>
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
            <br />
            If you add more than 1 event,
            this pipeline will trigger if any of the events are received.
          </Text>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <Text bold large>
              AWS events
            </Text>

            <Text muted>
              In order to retrieve all the possible AWS events you can trigger your pipeline from,
              <br />
              you’ll need to set 3 environment variables (<Link
                href="https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html"
                openNewWindow
                underline
              >
                more info here
              </Link>):
            </Text>

            <Spacing mt={1}>
              <List monospace ordered>
                <Text monospace>
                  AWS_REGION_NAME
                </Text>
                <Text monospace>
                  AWS_ACCESS_KEY_ID
                </Text>
                <Text monospace>
                  AWS_SECRET_ACCESS_KEY
                </Text>
              </List>
            </Spacing>
          </Spacing>
        </Spacing>

        <Divider light short />

        {eventMatchers?.length >= 1 && (
          <Table
            columnFlex={[1, 1, null]}
            columns={[
              {
                uuid: 'Provider',
              },
              {
                uuid: 'Event',
              },
              {
                label: () => '',
                uuid: 'delete',
              },
            ]}
            rows={eventMatchers?.map((eventMatcher: EventMatcherType, idx: number) => {
              const {
                event_type: provider,
                name: eventName,
                pattern = {},
              } = eventMatcher;
              const eventID =
                eventMatcher.id || `${provider}-${eventName}-${idx}-${JSON.stringify(pattern)}`;

              return [
                <Select
                  key={`event-provider-${eventID}`}
                  monospace
                  noBorder
                  onChange={e => updateEventMatcher(idx, { event_type: e.target.value })}
                  paddingHorizontal={0}
                  placeholder="Event provider"
                  value={provider || ''}
                >
                  {!provider && <option value="" />}
                  {PROVIDER_EVENTS.map(({
                    label,
                    uuid,
                  }) => (
                    <option key={uuid} value={uuid}>
                      {label()}
                    </option>
                  ))}
                </Select>,
                <Select
                  key={`event-name-${eventID}`}
                  monospace
                  noBorder
                  onChange={e => updateEventMatcher(idx, { name: e.target.value })}
                  paddingHorizontal={0}
                  placeholder="Event name"
                  value={eventName}
                >
                  {!eventName && <option value="" />}
                  {eventRules.map(({
                    name,
                  }) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>,
                <Button
                  default
                  iconOnly
                  noBackground
                  onClick={() => setEventMatchers(prev => removeAtIndex(prev, idx))}
                >
                  <Trash default size={2 * UNIT} />
                </Button>,
              ];
            })}
          />
        )}

        <Spacing p={PADDING_UNITS}>
          <Button
            beforeIcon={<Add size={2 * UNIT} />}
            // @ts-ignore
            onClick={() => setEventMatchers(prev => prev.concat({}))}
            outline
          >
            Add event matcher
          </Button>
        </Spacing>
      </>
    );
  }, [
    eventMatchers,
    eventRules,
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
    <>
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
      {errors && (
        <ErrorPopup
          {...errors}
          onClose={() => setErrors(null)}
        />
      )}
    </>
  );
}

export default Edit;
