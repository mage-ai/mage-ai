import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import cronstrue from 'cronstrue';
import moment from 'moment';
import { toast } from 'react-toastify';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Calendar, { TimeType } from '@oracle/components/Calendar';
import Checkbox from '@oracle/elements/Checkbox';
import ClickOutside from '@oracle/components/ClickOutside';
import CodeBlock from '@oracle/components/CodeBlock';
import CopyToClipboard from '@oracle/components/CopyToClipboard';
import DBTSettings from '../DBTSettings';
import ErrorsType from '@interfaces/ErrorsType';
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
import PipelineVariableType, { GLOBAL_VARIABLES_UUID } from '@interfaces/PipelineVariableType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import TagType from '@interfaces/TagType';
import TagsAutocompleteInputField from '@components/Tags/TagsAutocompleteInputField';
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
  Switch,
  Trash,
} from '@oracle/icons';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { CardStyle } from './index.style';
import { MAGE_VARIABLES_KEY } from '@interfaces/PipelineRunType';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import {
  TIME_UNIT_TO_SECONDS,
  checkIfCustomInterval,
  convertSeconds,
  convertToSeconds,
  convertUtcCronExpressionToLocalTimezone,
  getDatetimeFromDateAndTime,
  getTriggerApiEndpoint,
  getTriggerTypes,
} from '../utils';
import { getDateAndTimeObjFromDatetimeString } from '@oracle/components/Calendar/utils';
import { getFormattedVariables, parseVariables } from '@components/Sidekick/utils';
import { indexBy, pushUnique, range, removeAtIndex } from '@utils/array';
import { isEmptyObject, selectKeys } from '@utils/hash';
import { isNumeric, pluralize } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { padTime } from '@utils/date';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

type EditProps = {
  errors: ErrorsType;
  fetchPipelineSchedule: () => void;
  pipeline: PipelineType;
  pipelineSchedule?: PipelineScheduleType;
  setErrors: (errors: ErrorsType) => void;
  variables?: PipelineVariableType[];
};

function Edit({
  errors,
  fetchPipelineSchedule,
  pipeline,
  pipelineSchedule,
  setErrors,
  variables,
}: EditProps) {
  const router = useRouter();
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const pipelineUUID = pipeline?.uuid;
  const pipelineScheduleID = pipelineSchedule?.id;
  const isStreamingPipeline = pipeline?.type === PipelineTypeEnum.STREAMING;

  const [eventMatchers, setEventMatchers] = useState<EventMatcherType[]>([]);
  const [overwriteVariables, setOverwriteVariables] = useState<boolean>(false);
  const [enableSLA, setEnableSLA] = useState<boolean>(false);

  const [settings, setSettings] = useState<PipelineScheduleSettingsType>();
  const [runtimeVariables, setRuntimeVariables] = useState<{ [ variable: string ]: string }>({});
  const [schedule, setSchedule] = useState<PipelineScheduleType>(null);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [customInterval, setCustomInterval] = useState<string>(null);

  const formattedVariables = useMemo(() => getFormattedVariables(
    variables,
    block => block.uuid === GLOBAL_VARIABLES_UUID,
  ), [
    variables,
  ]);

  const {
    description,
    name,
    schedule_interval: scheduleInterval,
    schedule_type: scheduleType,
    settings: settingsInit = {},
    sla,
    start_time: startTime,
    tags,
    variables: scheduleVariablesInit = {},
  } = schedule || {};

  useEffect(() => {
    if (settingsInit) {
      setSettings(settingsInit);
    }
  }, [settingsInit]);

  const [date, setDate] = useState<Date>(null);
  const [time, setTime] = useState<TimeType>({ hour: '00', minute: '00' });
  const [landingTimeData, setLandingTimeData] = useState<{
    dayOfMonth?: number;
    dayOfWeek?: number;
    hour?: number;
    minute?: number;
    second?: number;
  }>({
    dayOfMonth: null,
    dayOfWeek: null,
    hour: null,
    minute: null,
    second: null,
  });

  const { data: dataEventRules } =
    api.event_rules.detail(ScheduleTypeEnum.EVENT === scheduleType ? 'aws' : null);
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
        const startDatetimeObj = getDateAndTimeObjFromDatetimeString(
          startTime,
          { localTimezone: displayLocalTimezone },
        );
        setDate(startDatetimeObj?.date);
        setTime(startDatetimeObj?.time);

        const mt = moment(startTime).utc();
        setLandingTimeData({
          dayOfMonth: mt.date(),
          dayOfWeek: mt.day(),
          hour: mt.hours(),
          minute: mt.minutes(),
          second: mt.seconds(),
        });
      } else {
        const currentDatetime = new Date();
        setDate(currentDatetime);
        if (displayLocalTimezone) {
          setTime({
            hour: padTime(String(currentDatetime.getHours())),
            minute: padTime(String(currentDatetime.getMinutes())),
          });
        } else {
          setTime({
            hour: padTime(String(currentDatetime.getUTCHours())),
            minute: padTime(String(currentDatetime.getUTCMinutes())),
          });
        }
      }
    },
    [displayLocalTimezone, startTime],
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
      scheduleVariables,
    ],
  );

  const isCustomInterval = useMemo(
    () => checkIfCustomInterval(scheduleInterval),
    [scheduleInterval],
  );
  const readableCronExpression = useMemo(() => (
    (isCustomInterval && customInterval)
      ? cronstrue.toString(customInterval, { throwExceptionOnParseError: false })
      : ''
    ),
    [customInterval, isCustomInterval],
  );
  const cronExpressionInvalid = useMemo(
    () => readableCronExpression?.toLowerCase().includes('error'),
    [readableCronExpression],
  );

  useEffect(
    () => {
      if (pipelineSchedule && !schedule) {
        setEventMatchers(pipelineSchedule.event_matchers);
        const custom = checkIfCustomInterval(pipelineSchedule?.schedule_interval);

        if (custom) {
          const customIntervalInit = displayLocalTimezone
            ? convertUtcCronExpressionToLocalTimezone(pipelineSchedule?.schedule_interval)
            : pipelineSchedule?.schedule_interval;
          setCustomInterval(customIntervalInit);
          setSchedule({
            ...pipelineSchedule,
            schedule_interval: 'custom',
          });
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

          const { time, unit } = convertSeconds(slaFromSchedule);
          setSchedule(schedule => ({
            ...schedule,
            slaAmount: time,
            slaUnit: unit,
          }));
        }
      }
    },
    [
      displayLocalTimezone,
      isStreamingPipeline,
      pipelineSchedule,
      schedule,
      scheduleInterval,
    ],
  );

  const landingTimeEnabled = useMemo(() => !!settings?.landing_time_enabled, [settings]);
  const landingTimeDisabled = useMemo(() => ScheduleTypeEnum.TIME !== scheduleType
    || ![
      ScheduleIntervalEnum.DAILY,
      ScheduleIntervalEnum.HOURLY,
      ScheduleIntervalEnum.MONTHLY,
      ScheduleIntervalEnum.WEEKLY,
    ].includes(scheduleInterval as ScheduleIntervalEnum),
    [
      scheduleInterval,
      scheduleType,
    ],
  );
  const showLandingTime = useMemo(() => landingTimeEnabled && !landingTimeDisabled, [
    landingTimeDisabled,
    landingTimeEnabled,
  ]);

  const onSave = useCallback(() => {
    const data = {
      ...selectKeys(schedule, [
        'name',
        'description',
        'schedule_type',
        'tags',
      ]),
      event_matchers: [],
      schedule_interval: null,
      start_time: null,
      variables: parseVariables(runtimeVariables),
    };

    if (showLandingTime) {
      const {
        dayOfMonth,
        dayOfWeek,
        hour,
        minute,
        second,
      } = landingTimeData;
      // This month of this year has 31 days (most days in a single month);
      let mt = moment('2023-07-01').utc();

      if (isNumeric(dayOfMonth)) {
        mt = mt.date(dayOfMonth);
      }
      if (isNumeric(dayOfWeek)) {
        mt = mt.day(dayOfWeek);
      }
      if (isNumeric(hour)) {
        mt = mt.hours(hour);
      }
      if (isNumeric(minute)) {
        mt = mt.minutes(minute);
      }
      if (isNumeric(second)) {
        mt = mt.seconds(second);
      }

      data.schedule_interval = isCustomInterval ? customInterval : schedule.schedule_interval;
      data.start_time = mt.toISOString();
    } else if (ScheduleTypeEnum.EVENT === schedule.schedule_type) {
      data.event_matchers = eventMatchers;
    } else {
      data.schedule_interval = isCustomInterval
        ? ((displayLocalTimezone && !cronExpressionInvalid && !!customInterval)
          ? convertUtcCronExpressionToLocalTimezone(customInterval, true)
          : customInterval
        )
        : schedule.schedule_interval;
      data.start_time = (date && time?.hour && time?.minute)
        ? getDatetimeFromDateAndTime(
          date,
          time,
          {
            convertToUtc: displayLocalTimezone,
            includeSeconds: true,
            localTimezone: displayLocalTimezone,
          })
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
    cronExpressionInvalid,
    customInterval,
    date,
    displayLocalTimezone,
    enableSLA,
    eventMatchers,
    isCustomInterval,
    landingTimeData,
    pipelineSchedule,
    runtimeVariables,
    schedule,
    settings,
    showLandingTime,
    time,
    updateSchedule,
  ]);

  const runtimeAverage = useMemo(() => {
    if (!pipelineSchedule?.runtime_average) {
      return 'Trigger doesn’t have enough history to estimate runtime.';
    }

    const runtime = Number(pipelineSchedule?.runtime_average);

    const hours = Math.max(
      Math.floor(runtime / (60 * 60)),
      0,
    );
    const minutes = Math.max(
      Math.floor((runtime - (hours * 60 * 60)) / 60),
      0,
    );
    const seconds = Math.max(
      Math.floor(runtime - ((hours * 60 * 60) + (minutes * 60))),
      0,
    );

    const strings = [];

    if (hours >= 1) {
      strings.push(pluralize('hour', hours, true));
    }

    if (minutes >= 1) {
      strings.push(pluralize('minute', minutes, true));
    }

    if (seconds >= 1) {
      strings.push(pluralize('second', seconds, true));
    }

    return strings.join(' ');
  }, [pipelineSchedule]);

  const landingTimeInputs = useMemo(() => {
    if (!showLandingTime) {
      return null;
    }

    const inputs = [
      <Spacing key="Minute" mr={1}>
        <Spacing mb={1}>
          <Text bold default small>
            Minute
          </Text>
        </Spacing>
        <Select
          compact
          monospace
          onChange={(e) => {
            setLandingTimeData(prev => ({
              ...prev,
              minute: e.target.value,
            }));
          }}
          value={landingTimeData?.minute || ''}
        >
          <option value="" />
          {range(60).map((_, idx: number) => (
            <option key={idx} value={idx}>
              {idx >= 10 ? String(idx) : `0${idx}`}
            </option>
          ))}
        </Select>
      </Spacing>,
      <Spacing key="Second" mr={1}>
        <Spacing mb={1}>
          <Text bold default small>
            Second
          </Text>
        </Spacing>
        <Select
          compact
          monospace
          onChange={(e) => {
            setLandingTimeData(prev => ({
              ...prev,
              second: e.target.value,
            }));
          }}
          value={landingTimeData?.second || ''}
        >
          <option value="" />
          {range(60).map((_, idx: number) => (
            <option key={idx} value={idx}>
              {idx >= 10 ? String(idx) : `0${idx}`}
            </option>
          ))}
        </Select>
      </Spacing>,
    ];

    if ([
      ScheduleIntervalEnum.DAILY,
      ScheduleIntervalEnum.MONTHLY,
      ScheduleIntervalEnum.WEEKLY,
    ].includes(scheduleInterval as ScheduleIntervalEnum)) {
      inputs.unshift(
        <Spacing key="Hour" mr={1}>
          <Spacing mb={1}>
            <Text bold default small>
              Hour
            </Text>
          </Spacing>
          <Select
            compact
            monospace
            onChange={(e) => {
              setLandingTimeData(prev => ({
                ...prev,
                hour: e.target.value,
              }));
            }}
            value={landingTimeData?.hour || ''}
          >
            <option value="" />
            {range(24).map((_, idx: number) => (
              <option key={idx} value={idx}>
                {idx >= 10 ? String(idx) : `0${idx}`}
              </option>
            ))}
          </Select>
        </Spacing>,
      );
    }

    if (ScheduleIntervalEnum.WEEKLY === scheduleInterval) {
      inputs.unshift(
        <Spacing key="Day of the week" mr={1}>
          <Spacing mb={1}>
            <Text bold default small>
              Day of the week
            </Text>
          </Spacing>
          <Select
            compact
            monospace
            onChange={(e) => {
              setLandingTimeData(prev => ({
                ...prev,
                dayOfWeek: e.target.value,
              }));
            }}
            value={landingTimeData?.dayOfWeek || ''}
          >
            <option value="" />
            <option value={6}>
              Sunday
            </option>
            <option value={0}>
              Monday
            </option>
            <option value={1}>
              Tuesday
            </option>
            <option value={2}>
              Wednesday
            </option>
            <option value={3}>
              Thursday
            </option>
            <option value={4}>
              Friday
            </option>
            <option value={5}>
              Saturday
            </option>
          </Select>
        </Spacing>,
      );
    } else if (ScheduleIntervalEnum.MONTHLY === scheduleInterval) {
      inputs.unshift(
        <Spacing key="Day of the month" mr={1}>
          <Spacing mb={1}>
            <Text bold default small>
              Day of the month
            </Text>
          </Spacing>
          <Select
            compact
            monospace
            onChange={(e) => {
              setLandingTimeData(prev => ({
                ...prev,
                dayOfMonth: e.target.value,
              }));
            }}
            value={landingTimeData?.dayOfMonth || ''}
          >
            <option value="" />
            {range(31).map((_, idx: number) => (
              <option key={idx + 1} value={idx + 1}>
                {idx + 1 >= 10 ? String(idx + 1) : `0${idx + 1}`}
              </option>
            ))}
          </Select>
        </Spacing>,
      );
    }

    return (
      <FlexContainer>
        {inputs}
      </FlexContainer>
    );
  }, [
    landingTimeData,
    scheduleInterval,
    showLandingTime,
  ]);

  const triggerNameRowEl = useMemo(() => ([
    <FlexContainer
      alignItems="center"
      key="trigger_name"
    >
      <Alphabet default />
      <Spacing mr={1} />
      <Text default>
        Trigger name
      </Text>
    </FlexContainer>,
    <TextInput
      key="trigger_name_input"
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
  ]), [name]);
  const triggerDescriptionRowEl = useMemo(() => ([
    <FlexContainer
      alignItems="center"
      key="trigger_description"
    >
      <Alphabet default />
      <Spacing mr={1} />
      <Text default>
        Trigger description
      </Text>
    </FlexContainer>,
    <TextInput
      key="trigger_description_input"
      monospace
      onChange={(e) => {
        e.preventDefault();
        setSchedule(s => ({
          ...s,
          description: e.target.value,
        }));
      }}
      placeholder="Description"
      value={description}
    />,
  ]), [description]);

  const detailsMemo = useMemo(() => {
    const rows = [
      triggerNameRowEl,
      triggerDescriptionRowEl,
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
    ];

    rows.push([
      <FlexContainer
        alignItems="center"
        key="frequency"
      >
        <Switch default size={1.5 * UNIT} />
        <Spacing mr={1} />
        <Text default>
          Enable landing time
        </Text>
      </FlexContainer>,

      <div key="frequency_input">
        <ToggleSwitch
          checked={landingTimeEnabled}
          disabled={landingTimeDisabled}
          onCheck={() => {
            setSettings(prev => ({
              ...prev,
              landing_time_enabled: !landingTimeEnabled,
            }));
          }}
        />

        <Spacing mt={1} p={1}>
          {landingTimeDisabled && (
            <Text muted small>
              In order to enable landing time, the trigger’s frequency must
              be <Text inline monospace small>{ScheduleIntervalEnum.HOURLY}
              </Text>, <Text inline monospace small>
                {ScheduleIntervalEnum.DAILY}
              </Text>, <Text inline monospace small>
                {ScheduleIntervalEnum.WEEKLY}
              </Text>, or <Text inline monospace small>
                {ScheduleIntervalEnum.MONTHLY}
              </Text>.
            </Text>
          )}
          {!landingTimeDisabled && (
            <Text muted small>
              Instead of starting at a specific time,
              this trigger will schedule pipeline runs at a time where it will finish
              by the specified time below.
            </Text>
          )}
        </Spacing>
      </div>,
    ]);

    if (showLandingTime) {
      rows.push([
        <FlexContainer
          alignItems="center"
          key="runtime_average"
        >
          <Schedule default size={1.5 * UNIT} />
          <Spacing mr={1} />
          <Text default>
            Average runtime
          </Text>
        </FlexContainer>,
        <FlexContainer
          alignItems="center"
          key="runtime_average_value"
          style={{ minHeight: `${UNIT * 5.75}px` }}
        >
          <Text monospace>
            {runtimeAverage}
          </Text>
        </FlexContainer>,
      ]);
    }

    rows.push([
      <FlexContainer
        alignItems="center"
        key="start_time"
      >
        <CalendarDate default size={1.5 * UNIT} />
        <Spacing mr={1} />
        <Text default>
          {showLandingTime && 'Pipeline complete by'}
          {!showLandingTime && 'Start date and time'}
        </Text>
      </FlexContainer>,

      showLandingTime
        ? landingTimeInputs
        : (
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
                  ? getDatetimeFromDateAndTime(
                    date,
                    time,
                    { localTimezone: displayLocalTimezone })
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
                  localTime={displayLocalTimezone}
                  selectedDate={date}
                  selectedTime={time}
                  setSelectedDate={setDate}
                  setSelectedTime={setTime}
                  topPosition
                />
              </ClickOutside>
            </div>
          </div>
        ),
    ]);

    if (isStreamingPipeline) {
      // Remove frequency and landing time rows since they are not
      // relevant for streaming pipelines.
      rows.splice(2, 2);
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
              <Text monospace xsmall>
                [minute] [hour] [day(month)] [month] [day(week)]
              </Text>

              <Spacing mb="2px" />

              {!customInterval
                ? null
                : (
                  <Text
                    danger={cronExpressionInvalid}
                    muted
                    small
                  >
                    {cronExpressionInvalid
                      ? 'Invalid cron expression. Please check the cron syntax.'
                      : <>&#34;{readableCronExpression}&#34;</>
                    }
                  </Text>
                )
              }

              {displayLocalTimezone && (
                <>
                  <Text bold inline small warning>
                    Note:&nbsp;
                  </Text>
                  <Text inline small>
                    If you have the display_local_timezone setting enabled, the local cron expression
                    above will match your local timezone only
                    <br />
                    if the minute and hour values are single
                    values without any special characters, such as the comma, hyphen, or slash.
                    <br />
                    You can still use cron expressions with special characters for the minute/hour
                    values, but it will be based in UTC time.
                  </Text>
                </>
              )}
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
    cronExpressionInvalid,
    customInterval,
    date,
    displayLocalTimezone,
    isCustomInterval,
    isStreamingPipeline,
    landingTimeDisabled,
    landingTimeEnabled,
    landingTimeInputs,
    readableCronExpression,
    runtimeAverage,
    scheduleInterval,
    showCalendar,
    showLandingTime,
    time,
    triggerNameRowEl,
    triggerDescriptionRowEl,
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
          triggerNameRowEl,
          triggerDescriptionRowEl,
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
    eventRulesByName,
    triggerNameRowEl,
    triggerDescriptionRowEl,
    updateEventMatcher,
  ]);

  const apiMemo = useMemo(() => {
    const url = getTriggerApiEndpoint(pipelineSchedule);

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
            triggerNameRowEl,
            triggerDescriptionRowEl,
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
              copiedText={`{
  "pipeline_run": {
    "variables": {
      "key1": "value1",
      "key2": "value2"
    }
  }
}
`}
              withCopyIcon
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
  }, [pipelineSchedule, triggerDescriptionRowEl, triggerNameRowEl]);

  const saveButtonDisabled = !scheduleType || (
    ScheduleTypeEnum.TIME === scheduleType
      && !((isStreamingPipeline && date) || (!isStreamingPipeline && date && scheduleInterval))
  ) || (
    ScheduleTypeEnum.EVENT === scheduleType && (
      !eventMatchers?.length
        || !eventMatchers.every(({ event_type: et, name }) => et && name)
    )
  );

  const dbtBlocks =
    useMemo(() => pipeline?.blocks?.filter(({ type }) => BlockTypeEnum.DBT === type) || [], [
      pipeline,
    ]);

  // TODO: allow users to set their own custom runtime variables.
  const afterMemo = useMemo(() => (
    <Spacing p={PADDING_UNITS}>
      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Headline>
          Run settings
        </Headline>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          {!isStreamingPipeline && (
            <Spacing mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
              <Text>
                Set a timeout for each run of this trigger (optional)
              </Text>
              <Spacing mb={1} />
              <TextInput
                label="Timeout (in seconds)"
                onChange={e => setSettings(prev => ({
                  ...prev,
                  timeout: e.target.value,
                }))}
                primary
                setContentOnMount
                type="number"
                value={settings?.timeout}
              />
            </Spacing>
          )}
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
                </FlexContainer>,
              ]]}
            />
          )}
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
          <FlexContainer alignItems="center">
            <Checkbox
              checked={settings?.allow_blocks_to_fail}
              label="Keep running pipeline even if blocks fail"
              onClick={() => setSettings(prev => ({
                ...prev,
                allow_blocks_to_fail: !settings?.allow_blocks_to_fail,
              }))}
            />
          </FlexContainer>
        </Spacing>

        {ScheduleTypeEnum.TIME === scheduleType && (
          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <FlexContainer alignItems="center">
              <Checkbox
                checked={settings?.skip_if_previous_running}
                label="Skip run if previous run still in progress"
                onClick={() => setSettings(prev => ({
                  ...prev,
                  skip_if_previous_running: !settings?.skip_if_previous_running,
                }))}
              />
            </FlexContainer>
          </Spacing>
        )}
      </Spacing>

      <Spacing mb={UNITS_BETWEEN_SECTIONS}>
        <Headline>
          Runtime variables
        </Headline>

        {!isEmptyObject(formattedVariables) && (
          <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
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

            {overwriteVariables
              && runtimeVariables
              && Object.entries(runtimeVariables).length > 0
              && (
              <Spacing mt={1}>
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
                  rows={Object.entries(runtimeVariables).reduce((acc, [uuid, value]) => {
                    if (MAGE_VARIABLES_KEY === uuid) {
                      return acc;
                    }

                    return acc.concat([[
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
                    ]]);
                  }, [])}
                />
              </Spacing>
            )}
          </Spacing>
        )}
      </Spacing>

      {dbtBlocks?.length >= 1 && (
        <Spacing mb={UNITS_BETWEEN_SECTIONS}>
          <DBTSettings
            blocks={dbtBlocks}
            // @ts-ignore
            updateVariables={setRuntimeVariables}
            variables={{
              ...scheduleVariables,
              ...runtimeVariables,
            }}
          />
        </Spacing>
      )}
    </Spacing>
  ), [
    dbtBlocks,
    enableSLA,
    formattedVariables,
    isStreamingPipeline,
    overwriteVariables,
    runtimeVariables,
    schedule,
    scheduleType,
    scheduleVariables,
    setEnableSLA,
    setOverwriteVariables,
    setRuntimeVariables,
    settings,
  ]);

  const { data: dataTags } = api.tags.list();
  const unselectedTags =
    useMemo(() => (dataTags?.tags || []).filter(({ uuid }) => !tags?.includes(uuid)), [
      dataTags,
      tags,
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
                as: `/pipelines/${pipelineUUID}/triggers/${pipelineScheduleID}`,
                href: '/pipelines/[pipeline]/triggers/[...slug]',
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

        <Spacing mt={UNITS_BETWEEN_SECTIONS}>
          {ScheduleTypeEnum.TIME === scheduleType && detailsMemo}
          {ScheduleTypeEnum.EVENT === scheduleType && eventsMemo}
          {ScheduleTypeEnum.API === scheduleType && apiMemo}
        </Spacing>

        <Spacing mt={UNITS_BETWEEN_SECTIONS} px={PADDING_UNITS}>
          <Spacing mb={2}>
            <Headline>
              Tags
            </Headline>

            <Text muted>
              Add or remove tags from this trigger.
            </Text>
          </Spacing>

          <TagsAutocompleteInputField
            removeTag={(tag: TagType) => {
              setSchedule(prev => ({
                ...prev,
                tags: tags?.filter(uuid => uuid !== tag.uuid),
              }));
            }}
            selectTag={(tag: TagType) => {
              setSchedule(prev => ({
                ...prev,
                tags: pushUnique(tag.uuid, tags, uuid => uuid === tag.uuid),
              }));
            }}
            selectedTags={tags?.map(tag => ({ uuid: tag }))}
            tags={unselectedTags}
            uuid={`TagsAutocompleteInputField-trigger-${pipelineScheduleID}`}
          />
        </Spacing>
      </PipelineDetailPage>
    </>
  );
}

export default Edit;
