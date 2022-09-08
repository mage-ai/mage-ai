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
import CodeBlock from '@oracle/components/CodeBlock';
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
import PipelineScheduleType, {
  ScheduleIntervalEnum,
  ScheduleTypeEnum,
} from '@interfaces/PipelineScheduleType';
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
  Code,
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
import { indexBy, removeAtIndex } from '@utils/array';
import { isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';

const TRIGGER_TYPES = [
  {
    label: () => 'Schedule',
    description: () => 'This pipeline will run continuously on an interval or just once.',
    uuid: ScheduleTypeEnum.TIME,
  },
  {
    label: () => 'Event',
    description: () => 'This pipeline will run when a specific event occurs',
    uuid: ScheduleTypeEnum.EVENT,
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
  const [customInterval, setCustomInterval] = useState<string>(null);

  const formattedVariables = useMemo(() => getFormattedVariables(
    variables,
    block => block.uuid === 'global',
  ), [
    variables,
  ]);

  const {
    name,
    schedule_interval: scheduleInterval,
    schedule_type: scheduleType,
    start_time: startTime,
    variables: scheduleVariablesInit = {},
  } = schedule || {};

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

  const scheduleVariables = useMemo(() => scheduleVariablesInit || {}, [scheduleVariablesInit]);

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
      if (overwriteVariables) {
        setRuntimeVariables(formattedVariables?.reduce(
          (vars, { uuid, value }) => ({ ...vars, [uuid]: scheduleVariables[uuid] || value }),
          {},
        ));
      } else {
        setRuntimeVariables(null);
      }
    },
    [
      formattedVariables,
      overwriteVariables,
    ],
  );

  useEffect(
    () => {
      if (pipelineSchedule) {
        setEventMatchers(pipelineSchedule.event_matchers);
        if (isCustomInterval) {
          setSchedule({
            ...pipelineSchedule,
            schedule_interval: 'custom',
          });
          setCustomInterval(scheduleInterval);
        } else {
          setSchedule(pipelineSchedule);
        }
      }
    },
    [pipelineSchedule],
  );

  const onSave = useCallback(() => {
    const data = {
      ...selectKeys(schedule, [
        'name',
        'schedule_type',
      ]),
      event_matchers: [],
      schedule_interval: null,
      start_time: null,
      variables: parseVariables(runtimeVariables),
    };

    if (ScheduleTypeEnum.EVENT === schedule.schedule_type) {
      data.event_matchers = eventMatchers;
    } else {
      data.schedule_interval = isCustomInterval ? customInterval : schedule.schedule_interval;
      data.start_time = date && time
        ? `${date.toISOString().split('T')[0]} ${time}:00`
        : null;
    }

    // @ts-ignore
    updateSchedule({
      pipeline_schedule: data,
    });
  }, [
    customInterval,
    date,
    eventMatchers,
    runtimeVariables,
    schedule,
    time,
    updateSchedule,
  ]);

  const isCustomInterval = useMemo(
    () => scheduleInterval &&
      !Object.values(ScheduleIntervalEnum).includes(scheduleInterval as ScheduleIntervalEnum),
    [scheduleInterval],
  );

  const detailsMemo = useMemo(() => {
    const rows = [
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
            const interval = e.target.value;
            setSchedule(s => ({
              ...s,
              schedule_interval: interval,
            }))
          }}
          placeholder="Choose the frequency to run"
          value={scheduleInterval}
        >
          {!scheduleInterval && <option value="" />}
          {Object.values(ScheduleIntervalEnum).map(value => (
            <option key={value} value={value}>
              {value.substring(1)}
            </option>
          ))}
          <option key="custom" value="custom">
            custom
          </option>
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
        <div>
          {!showCalendar && (
            <TextInput
              monospace
              onClick={() => setShowCalendar(val => !val)}
              placeholder="YYYY-MM-DD HH:MM"
              value={date
                ? `${date.toISOString().split('T')[0]} ${time}`
                : ''
              }
            />
          )}
          <div style={{ width: '400px' }}>
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
        </div>,
      ],
    ];

    if (isCustomInterval) {
      rows.splice(
        2,
        0,
        [
          <FlexContainer alignItems="center">
            <Code default size={1.5 * UNIT} />
            <Spacing mr={1} />
            <Text default>
              Cron expression
            </Text>
          </FlexContainer>,
          <TextInput
            monospace
            onChange={(e) => {
              e.preventDefault();
              setCustomInterval(e.target.value);
            }}
            placeholder="* * * * *"
            value={customInterval}
          />,
        ]
      )
    }

    return (
      <>
        <Spacing mb={2} px={PADDING_UNITS}>
          <Headline>
            Settings
          </Headline>
        </Spacing>

        <Divider light short />

        <Table
          columnFlex={[null, 1]}
          rows={rows}
        />
      </>
    );
  }, [
    customInterval,
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
            alignTop
            columnFlex={[1, 1, 2, null]}
            columns={[
              {
                uuid: 'Provider',
              },
              {
                uuid: 'Event',
              },
              {
                uuid: 'Pattern',
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
                pattern,
              } = eventMatcher;
              const eventID =
                eventMatcher.id || `${provider}-${eventName}-${idx}-${JSON.stringify(pattern)}`;
              const patternDisplay = [];
              if (pattern) {
                JSON.stringify(pattern, null, 2).split('\n').forEach((line) => {
                  patternDisplay.push(`    ${line}`);
                });
              }

              return [
                <Select
                  key={`event-provider-${eventID}`}
                  monospace
                  onChange={e => updateEventMatcher(idx, { event_type: e.target.value })}
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
                  onChange={(e) => {
                    const eventName = e.target.value;
                    const patternString = eventRulesByName[eventName]?.event_pattern;

                    updateEventMatcher(idx, {
                      name: eventName,
                      pattern: patternString ? JSON.parse(patternString) : null,
                    });
                  }}
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
                pattern && (
                  <CodeBlock
                    language="json"
                    small
                    source={patternDisplay.join('\n')}
                  />
                ),
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

  const saveButtonDisabled = !scheduleType || (
    ScheduleTypeEnum.TIME === scheduleType && !(scheduleInterval && date)
  ) || (
    ScheduleTypeEnum.EVENT === scheduleType && (
      !eventMatchers?.length
        || !eventMatchers.every(({ event_type: et, name }) => et && name)
    )
  );

  // TODO: allow users to set their own custom runtime variables.
  const variablesMemo = useMemo(() => !isEmptyObject(formattedVariables) && (
    <Spacing p={PADDING_UNITS}>
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
    </Spacing>
  ), [
    formattedVariables,
    overwriteVariables,
    runtimeVariables,
    setOverwriteVariables,
  ]);

  return (
    <>
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
              disabled={saveButtonDisabled}
              loading={isLoadingUpdate}
              onClick={onSave}
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
              const selected = scheduleType === uuid;
              const othersSelected = scheduleType && !selected;

              return (
                <Button
                  key={uuid}
                  noBackground
                  noBorder
                  noPadding
                  onClick={() => {
                    if (ScheduleTypeEnum.EVENT === uuid && !eventMatchers?.length) {
                      // @ts-ignore
                      setEventMatchers([{}]);
                    }

                    setSchedule(s => ({
                      ...s,
                      schedule_type: uuid,
                    }));
                  }}
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
          {ScheduleTypeEnum.TIME === scheduleType && detailsMemo}
          {ScheduleTypeEnum.EVENT === scheduleType && eventsMemo}
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
