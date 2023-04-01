import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Calendar, { TimeType } from '@oracle/components/Calendar';
import Checkbox from '@oracle/elements/Checkbox';
import ClickOutside from '@oracle/components/ClickOutside';
import CodeBlock from '@oracle/components/CodeBlock';
import CopyToClipboard from '@oracle/components/CopyToClipboard';
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
  PipelineScheduleSettingsType,
  ScheduleIntervalEnum,
  ScheduleTypeEnum,
} from '@interfaces/PipelineScheduleType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
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
import { CardStyle } from './index.style';
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
import { convertSeconds, convertToSeconds, getTimeInUTC, TIME_UNIT_TO_SECONDS } from '../utils';

const getTriggerTypes = (
  isStreamingPipeline?: boolean,
): {
  description: () => string;
  label: () => string;
  uuid: ScheduleTypeEnum;
}[] => {
  const triggerTypes = [
    {
      description: () => 'This pipeline will run continuously on an interval or just once.',
      label: () => 'Schedule',
      uuid: ScheduleTypeEnum.TIME,
    },
    {
      description: () => 'This pipeline will run when a specific event occurs.',
      label: () => 'Event',
      uuid: ScheduleTypeEnum.EVENT,
    },
    {
      description: () => 'Run this pipeline when you make an API call.',
      label: () => 'API',
      uuid: ScheduleTypeEnum.API,
    },
  ];

  return isStreamingPipeline
    ? triggerTypes.slice(0, 1)
    : triggerTypes;
};

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
  const isStreamingPipeline = pipeline?.type === PipelineTypeEnum.STREAMING;

  const [errors, setErrors] = useState(null);

  const [eventMatchers, setEventMatchers] = useState<EventMatcherType[]>([]);
  const [overwriteVariables, setOverwriteVariables] = useState<boolean>(false);
  const [enableSLA, setEnableSLA] = useState<boolean>(false);

  const [settings, setSettings] = useState<PipelineScheduleSettingsType>();
  const [runtimeVariables, setRuntimeVariables] = useState<{ [ variable: string ]: string }>({});
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
    settings: settingsInit = {},
    sla,
    start_time: startTime,
    token,
    variables: scheduleVariablesInit = {},
  } = schedule || {};

  useEffect(() => {
    if (settingsInit) {
      setSettings(settingsInit);
    }
  }, [settingsInit]);

  const [date, setDate] = useState<Date>(null);
  const [time, setTime] = useState<TimeType>({ hour: '00', minute: '00' });

  const { data: dataEventRules } = api.event_rules.detail('aws');
  const eventRules: EventRuleType[] = useMemo(() => dataEventRules?.event_rule?.rules || [], [dataEventRules]);
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
        setDate(getTimeInUTC(startTime));
        setTime({
          hour: timePart.substring(0, 2),
          minute: timePart.substring(3, 5),
        });
      } else {
        const currentDatetime = new Date();
        setDate(currentDatetime);
        setTime({
          hour: String(currentDatetime.getUTCHours()).padStart(2, '0'),
          minute: String(currentDatetime.getUTCMinutes()).padStart(2, '0'),
        });
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
          if (isStreamingPipeline) {
            setSchedule({
              ...pipelineSchedule,
              schedule_interval: ScheduleIntervalEnum.ONCE,
            });
          } else {
            setSchedule(pipelineSchedule);
          }
        }

        const slaFromSchedule = pipelineSchedule.sla;

        if (slaFromSchedule) {
          setEnableSLA(true);

          const { time, unit } = convertSeconds(sla);
          setSchedule(schedule => ({
            ...schedule,
            slaAmount: time,
            slaUnit: unit,
          }));
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
      data.start_time = date && time?.hour && time?.minute
        ? `${date.toISOString().split('T')[0]} ${time?.hour}:${time?.minute}:00`
        : null;
    }

    if (enableSLA) {
      const slaAmount = schedule?.['slaAmount'];
      const slaUnit = schedule?.['slaUnit'];
      if (!slaAmount || isNaN(slaAmount) || !slaUnit) {
        toast.error(
          'Please enter a valid SLA',
          {
            position: toast.POSITION.BOTTOM_RIGHT,
            toastId: 'sla_error',
          },
        );
        return;
      }

      data.sla = convertToSeconds(slaAmount, slaUnit);
    } else if (pipelineSchedule?.sla) {
      data.sla = 0;
    }

    data.settings = settings;

    // @ts-ignore
    updateSchedule({
      pipeline_schedule: data,
    });
  }, [
    customInterval,
    date,
    enableSLA,
    eventMatchers,
    pipelineSchedule,
    runtimeVariables,
    schedule,
    settings,
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
        <FlexContainer
          alignItems="center"
          key="trigger_name_detail"
        >
          <Alphabet default size={1.5 * UNIT} />
          <Spacing mr={1} />
          <Text default>
            Trigger name
          </Text>
        </FlexContainer>,
        <TextInput
          key="trigger_name_input_detail"
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
        <FlexContainer
          alignItems="center"
          key="frequency"
        >
          <Schedule default size={1.5 * UNIT} />
          <Spacing mr={1} />
          <Text default>
            Frequency
          </Text>
        </FlexContainer>,
        <div key="frequency_input">
          <Select
            monospace
            onChange={(e) => {
              e.preventDefault();
              const interval = e.target.value;
              setSchedule(s => ({
                ...s,
                schedule_interval: interval,
              }));
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
          </Select>

          <Spacing mt={1} p={1}>
            <Text muted small>
              If you don’t see the frequency option you need, select <Text inline monospace small>
                custom
              </Text> and enter CRON syntax.
            </Text>
          </Spacing>
        </div>,
      ],
      [
        <FlexContainer
          alignItems="center"
          key="start_time"
        >
          <CalendarDate default size={1.5 * UNIT} />
          <Spacing mr={1} />
          <Text default>
            Start date and time
          </Text>
        </FlexContainer>,
        <div
          key="start_time_input"
          style={{ minHeight: `${UNIT * 5.75}px` }}
        >
          {!showCalendar && (
            <TextInput
              monospace
              onClick={() => setShowCalendar(val => !val)}
              placeholder="YYYY-MM-DD HH:MM"
              value={date
                ? `${date.toISOString().split('T')[0]} ${time?.hour}:${time?.minute}`
                : ''
              }
            />
          )}
          <div style={{ width: '400px' }}>
            <ClickOutside
              disableEscape
              onClickOutside={() => setShowCalendar(false)}
              open={showCalendar}
              style={{ position: 'relative' }}
            >
              <Calendar
                selectedDate={date}
                selectedTime={time}
                setSelectedDate={setDate}
                setSelectedTime={setTime}
                topPosition
              />
            </ClickOutside>
          </div>
        </div>,
      ],
    ];

    if (isStreamingPipeline) {
      rows.splice(1, 1);
    }

    if (isCustomInterval) {
      rows.splice(
        2,
        0,
        [
          <FlexContainer
            alignItems="center"
            key="cron_expression"
          >
            <Code default size={1.5 * UNIT} />
            <Spacing mr={1} />
            <Text default>
              Cron expression
            </Text>
          </FlexContainer>,
          <div key="cron_expression_input">
            <TextInput
              monospace
              onChange={(e) => {
                e.preventDefault();
                setCustomInterval(e.target.value);
              }}
              placeholder="* * * * *"
              value={customInterval}
            />

            <Spacing mt={1} p={1}>
              <Text muted small>
                If you want this pipeline to trigger every 1 minute,
                the CRON syntax is <Text inline monospace small>
                  */1 * * * *
                </Text>.
              </Text>

              <Text muted small>
                For more CRON syntax examples, check out this <Link
                  href="https://crontab.guru/"
                  openNewWindow
                  small
                >
                  resource
                </Link>.
              </Text>
            </Spacing>
          </div>,
        ],
      );
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
    isCustomInterval,
    isStreamingPipeline,
    name,
    scheduleInterval,
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

  const eventsMemo = useMemo(() => (
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
            <FlexContainer
              alignItems="center"
              key="trigger_name_event"
            >
              <Alphabet default size={1.5 * UNIT} />
              <Spacing mr={1} />
              <Text default>
                Trigger name
              </Text>
            </FlexContainer>,
            <TextInput
              key="trigger_name_input_event"
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
                key="remove_event"
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
  ), [
    eventMatchers,
    eventRules,
    name,
  ]);

  const apiMemo = useMemo(() => {
    let url = '';
    if (typeof window !== 'undefined') {
      url = `${window.origin}/api/pipeline_schedules/${pipelineSchedule?.id}/pipeline_runs`;

      if (pipelineSchedule?.token) {
        url = `${url}/${pipelineSchedule.token}`;
      }
    }

    let port;
    if (typeof window !== 'undefined') {
      port = window.location.port;

      if (port) {
        url = url.replace(port, '6789');
      }
    }

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
              <FlexContainer
                alignItems="center"
                key="trigger_name_api"
              >
                <Alphabet default size={1.5 * UNIT} />
                <Spacing mr={1} />
                <Text default>
                  Trigger name
                </Text>
              </FlexContainer>,
              <TextInput
                key="trigger_name_input_api"
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
            Endpoint
          </Headline>

          <Text muted>
            Make a <Text bold inline monospace>
              POST
            </Text> request to the following endpoint:
          </Text>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <CopyToClipboard
              copiedText={url}
              linkText={url}
              monospace
              withCopyIcon
            />
          </Spacing>
        </Spacing>

        <Spacing mb={2} mt={5} px={PADDING_UNITS}>
          <Headline>
            Payload
          </Headline>

          <Text muted>
            You can optionally include runtime variables in your request payload.
            These runtime variables are accessible from within each pipeline block.
          </Text>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <CopyToClipboard
              withCopyIcon
              copiedText={`{
  "pipeline_run": {
    "variables": {
      "key1": "value1",
      "key2": "value2"
    }
  }
}
`}
            >
              <CodeBlock
                language="json"
                small
                source={`
    {
      "pipeline_run": {
        "variables": {
          "key1": "value1",
          "key2": "value2"
        }
      }
    }
`}
              />
            </CopyToClipboard>
          </Spacing>
        </Spacing>

        <Spacing mb={2} mt={5} px={PADDING_UNITS}>
          <Headline>
            Sample cURL command
          </Headline>

          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <CodeBlock
              language="bash"
              small
              source={`
    curl -X POST ${url} \\
      --header 'Content-Type: application/json' \\
      --data '
    {
      "pipeline_run": {
        "variables": {
          "key1": "value1",
          "key2": "value2"
        }
      }
    }'
`}
            />
          </Spacing>
        </Spacing>
      </>
    );
  }, [
    name,
    pipelineSchedule,
    typeof window,
  ]);

  const saveButtonDisabled = !scheduleType || (
    ScheduleTypeEnum.TIME === scheduleType
      && !((isStreamingPipeline && date) || (!isStreamingPipeline && date && scheduleInterval))
  ) || (
    ScheduleTypeEnum.EVENT === scheduleType && (
      !eventMatchers?.length
        || !eventMatchers.every(({ event_type: et, name }) => et && name)
    )
  );

  // TODO: allow users to set their own custom runtime variables.
  const afterMemo = useMemo(() => (
    <Spacing p={PADDING_UNITS}>
      {!isEmptyObject(formattedVariables) && (
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
                rows={Object.entries(runtimeVariables).map(([uuid, value]) => [
                  <Text
                    default
                    key={`variable_${uuid}`}
                    monospace
                  >
                    {uuid}
                  </Text>,
                  <TextInput
                    borderless
                    key={`variable_uuid_input_${uuid}`}
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
                ])}
              />
            </Spacing>
          )}
        </>
      )}
      <Spacing mt={2}>
        <FlexContainer alignItems="center">
          <Spacing mr={2}>
            <ToggleSwitch
              checked={enableSLA}
              onCheck={val => {
                setEnableSLA(val);
                if (!val) {
                  setSchedule(schedule => ({
                    ...schedule,
                    slaAmount: 0,
                  }));
                }
              }}
            />
          </Spacing>
          <Text default monospace>
            Configure trigger SLA
          </Text>
        </FlexContainer>
        {enableSLA && (
          <Spacing mt={2}>
            <Table
              columnFlex={[null, 1]}
              rows={[[
                <FlexContainer
                  alignItems="center"
                  key="sla_detail"
                >
                  <CalendarDate default size={1.5 * UNIT} />
                  <Spacing mr={1} />
                  <Text default>
                    SLA
                  </Text>
                </FlexContainer>,
                <FlexContainer key="sla_input_detail">
                  <Flex flex={1}>
                    <TextInput
                      fullWidth
                      monospace
                      noBorder
                      onChange={(e) => {
                        e.preventDefault();
                        setSchedule(s => ({
                          ...s,
                          slaAmount: e.target.value,
                        }));
                      }}
                      placeholder="Time"
                      value={schedule?.['slaAmount']}
                    />
                  </Flex>
                  <Flex flex={1}>
                    <Select
                      fullWidth
                      monospace
                      noBorder
                      onChange={(e) => {
                        e.preventDefault();
                        setSchedule(s => ({
                          ...s,
                          slaUnit: e.target.value,
                        }));
                      }}
                      placeholder="Select time unit"
                      small
                      value={schedule?.['slaUnit']}
                    >
                      {Object.keys(TIME_UNIT_TO_SECONDS).map(unit => (
                        <option key={unit} value={unit}>
                          {`${unit}(s)`}
                        </option>
                      ))}
                    </Select>
                  </Flex>
                </FlexContainer>
              ]]}
            />
          </Spacing>
        )}
        <Spacing mt={2}>
          <Headline level={5} monospace>
            Additional settings
          </Headline>
          {ScheduleTypeEnum.TIME === scheduleType && (
            <Spacing mt={2}>
              <FlexContainer alignItems="center">
                <Checkbox
                  checked={settings?.skip_if_previous_running}
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    skip_if_previous_running: !settings?.skip_if_previous_running,
                  }))}
                />
                <Spacing ml={2}/>
                <Text default monospace small>
                  Skip run if previous run still in progress
                </Text>
              </FlexContainer>
            </Spacing>
          )}

          <Spacing mt={2}>
            <FlexContainer alignItems="center">
              <Checkbox
                checked={settings?.allow_blocks_to_fail}
                onClick={() => setSettings(prev => ({
                  ...prev,
                  allow_blocks_to_fail: !settings?.allow_blocks_to_fail,
                }))}
              />
              <Spacing ml={2}/>
              <Text default monospace small>
                Keep running pipeline even if blocks fail
              </Text>
            </FlexContainer>
          </Spacing>
        </Spacing>
      </Spacing>
    </Spacing>
  ), [
    enableSLA,
    formattedVariables,
    overwriteVariables,
    runtimeVariables,
    schedule,
    setEnableSLA,
    setOverwriteVariables,
    settings,
  ]);

  return (
    <>
      <PipelineDetailPage
        after={afterMemo}
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
        errors={errors}
        pageName={PageNameEnum.TRIGGERS}
        pipeline={pipeline}
        setErrors={setErrors}
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
              linkProps={{
                href: '/pipelines/[pipeline]/triggers/[...slug]',
                as: `/pipelines/${pipelineUUID}/triggers/${pipelineScheduleID}`,
              }}
              noHoverUnderline
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
            {getTriggerTypes(isStreamingPipeline).map(({
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
                          bold
                          default={!selected && !othersSelected}
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
          {ScheduleTypeEnum.API === scheduleType && apiMemo}
        </Spacing>

      </PipelineDetailPage>
    </>
  );
}

export default Edit;
