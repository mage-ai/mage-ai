import NextLink from 'next/link';
import { ThemeContext } from 'styled-components';
import { useContext, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import CopyToClipboard from '@oracle/components/CopyToClipboard';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Paginate from '@components/shared/Paginate';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunsTable from '@components/PipelineDetail/Runs/Table';
import PipelineRunType, {
  PIPELINE_RUN_STATUSES,
  RUN_STATUS_TO_LABEL,
  PipelineRunReqQueryParamsType,
 } from '@interfaces/PipelineRunType';
import PipelineScheduleType, {
  SCHEDULE_TYPE_TO_LABEL,
  ScheduleIntervalEnum,
  ScheduleStatusEnum,
  ScheduleTypeEnum,
  VARIABLE_BOOKMARK_VALUES_KEY,
} from '@interfaces/PipelineScheduleType';
import PipelineTriggerType from '@interfaces/PipelineTriggerType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PipelineVariableType, { GLOBAL_VARIABLES_UUID } from '@interfaces/PipelineVariableType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import TagsContainer from '@components/Tags/TagsContainer';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import buildTableSidekick, { TABS } from '@components/PipelineRun/shared/buildTableSidekick';
import useProject from '@utils/models/project/useProject';
import { BEFORE_WIDTH, BeforeStyle } from '@components/PipelineDetail/shared/index.style';
import { BlockTypeEnum } from '@interfaces/BlockType';
import {
  Alphabet,
  CalendarDate,
  Edit,
  Info,
  Lightning,
  LightningOff,
  MultiShare,
  MusicNotes,
  Once,
  PlugAPI,
  Schedule,
  Sun,
  Switch,
} from '@oracle/icons';
import { ICON_SIZE_DEFAULT, ICON_SIZE_SMALL } from '@oracle/styles/units/icons';
import { MAGE_VARIABLES_KEY } from '@interfaces/PipelineRunType';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PROVIDER_EVENTS_BY_UUID } from '@interfaces/EventMatcherType';
import {
  addTriggerVariables,
  getFormattedVariable,
  getFormattedVariables,
} from '@components/Sidekick/utils';
import {
  checkIfCustomInterval,
  convertSeconds,
  convertUtcCronExpressionToLocalTimezone,
  getTriggerApiEndpoint,
} from '../utils';
import { dateFormatLong, datetimeInLocalTimezone } from '@utils/date';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getModelAttributes } from '@utils/models/dbt';
import { goToWithQuery } from '@utils/routing';
import { indexBy } from '@utils/array';
import { ignoreKeys, isEmptyObject } from '@utils/hash';
import { isViewer } from '@utils/session';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { queryFromUrl, queryString } from '@utils/url';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

type TriggerDetailProps = {
  errors: ErrorsType;
  fetchPipelineSchedule: () => void;
  pipeline: PipelineType;
  pipelineSchedule?: PipelineScheduleType;
  setErrors: (errors: ErrorsType) => void;
  variables?: PipelineVariableType[];
};

const LIMIT = 30;

function TriggerDetail({
  errors,
  fetchPipelineSchedule,
  pipeline,
  pipelineSchedule,
  setErrors,
  variables,
}: TriggerDetailProps) {
  const themeContext = useContext(ThemeContext);

  const {
    project,
  } = useProject();
  const router = useRouter();
  const isViewerRole = isViewer();
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const blocksMapping =
    useMemo(() => indexBy(pipeline?.blocks || [], ({ uuid }) => uuid), [pipeline]);

  const {
    uuid: pipelineUUID,
    type: pipelineType,
  } = pipeline || {};
  const {
    description,
    id: pipelineScheduleID,
    event_matchers: eventMatchers,
    last_enabled_at: lastEnabledAt,
    name: pipelineScheduleName,
    next_pipeline_run_date: nextRunDate,
    schedule_interval: scheduleInterval,
    schedule_type: scheduleType,
    settings,
    sla,
    start_time: startTime,
    status,
    tags,
    variables: scheduleVariablesInit = {},
  } = pipelineSchedule || {};

  const isCustomInterval = useMemo(
    () => checkIfCustomInterval(scheduleInterval),
    [scheduleInterval],
  );

  const q = queryFromUrl();

  const pipelineRunsRequestQuery: PipelineRunReqQueryParamsType = {
    _limit: LIMIT,
    _offset: (q?.page ? q.page : 0) * LIMIT,
  };
  if (q?.status) {
    pipelineRunsRequestQuery.status = q.status;
  }
  if (pipelineSchedule?.global_data_product_uuid) {
    pipelineRunsRequestQuery.global_data_product_uuid = pipelineSchedule?.global_data_product_uuid;
  }
  const {
    data: dataPipelineRuns,
    mutate: fetchPipelineRuns,
  } = api.pipeline_runs.pipeline_schedules.list(
    pipelineScheduleID,
    pipelineRunsRequestQuery, {
    refreshInterval: 3000,
    revalidateOnFocus: true,
  });
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);
  const totalRuns = useMemo(() => dataPipelineRuns?.metadata?.count || [], [dataPipelineRuns]);

  const [selectedRun, setSelectedRun] = useState<PipelineRunType>(null);
  const tablePipelineRuns = useMemo(() => {
    const page = q?.page ? q.page : 0;

    return (
      <>
        <PipelineRunsTable
          fetchPipelineRuns={fetchPipelineRuns}
          onClickRow={(rowIndex: number) => setSelectedRun((prev) => {
            const run = pipelineRuns[rowIndex];

            return prev?.id !== run.id ? run : null;
          })}
          pipelineRuns={pipelineRuns}
          selectedRun={selectedRun}
          setErrors={setErrors}
          setSelectedRun={setSelectedRun}
        />
        <Spacing p={2}>
          <Paginate
            maxPages={9}
            onUpdate={(p) => {
              const newPage = Number(p);
              const updatedQuery = {
                ...q,
                page: newPage >= 0 ? newPage : 0,
              };
              router.push(
                '/pipelines/[pipeline]/triggers/[...slug]',
                `/pipelines/${pipelineUUID}/triggers/${pipelineScheduleID}?${queryString(updatedQuery)}`,
              );
            }}
            page={Number(page)}
            totalPages={Math.ceil(totalRuns / LIMIT)}
          />
        </Spacing>
      </>
    );
  }, [
    fetchPipelineRuns,
    pipelineRuns,
    pipelineScheduleID,
    pipelineUUID,
    q,
    router,
    selectedRun,
    setErrors,
    totalRuns,
  ]);

  const [selectedTab, setSelectedTab] = useState(TABS[0]);

  const [updatePipelineSchedule, { isLoading: isLoadingUpdatePipelineSchedule }] = useMutation(
    (pipelineSchedule: PipelineScheduleType) =>
      api.pipeline_schedules.useUpdate(pipelineSchedule.id)({
        pipeline_schedule: ignoreKeys(pipelineSchedule, ['id']),
      }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipelineSchedule();
          },
          onErrorCallback: (response, errors) => setErrors?.({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const {
    data: dataPipelineTriggers,
    mutate: fetchPipelineTriggers,
  } = api.pipeline_triggers.pipelines.list(pipelineUUID);
  const pipelineTriggersByName: {
    [name: string]: PipelineTriggerType;
  } = useMemo(() => indexBy(dataPipelineTriggers?.pipeline_triggers || [], ({ name }) => name), [
      dataPipelineTriggers,
    ]);
  const triggerExistsInCode = useMemo(() => !!pipelineTriggersByName?.[pipelineSchedule?.name], [
    pipelineSchedule,
    pipelineTriggersByName,
  ]);

  const [createPipelineTrigger, { isLoading: isLoadingCreatePipelineTrigger }] = useMutation(
    api.pipeline_triggers.pipelines.useCreate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipelineTriggers();
          },
          onErrorCallback: (response, errors) => setErrors?.({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [createPipelineRun, { isLoading: isLoadingCreatePipelineRun }]: any = useMutation(
      api.pipeline_runs.pipeline_schedules.useCreate(pipelineScheduleID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipelineRuns();
          },
          onErrorCallback: (response, errors) => setErrors?.({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const isActive = useMemo(() => ScheduleStatusEnum.ACTIVE === status, [status]);
  const disabledRunOnce = useMemo(() => !isActive
    && !(scheduleType === ScheduleTypeEnum.TIME
      && scheduleInterval === ScheduleIntervalEnum.ONCE),
    [isActive, scheduleInterval, scheduleType],
  );

  const detailsMemo = useMemo(() => {
    const iconProps = {
      default: true,
      size: 1.5 * UNIT,
    };

    const rows = [
      [
        <FlexContainer
          alignItems="center"
          key="trigger_type_label"
        >
          <MultiShare {...iconProps} />
          <Spacing mr={1} />
          <Text default>
            Trigger type
          </Text>
        </FlexContainer>,
        <Text
          key="trigger_type"
          monospace
        >
          {SCHEDULE_TYPE_TO_LABEL[scheduleType]?.()}
        </Text>,
      ],
      [
        <FlexContainer
          alignItems="center"
          key="trigger_status_label"
        >
          <Switch {...iconProps} />
          <Spacing mr={1} />
          <Text default>
            Status
          </Text>
        </FlexContainer>,
        <Text
          danger={!isActive}
          key="trigger_status"
          monospace
          success={isActive}
        >
          {status}
        </Text>,
      ],
    ];

    if (description) {
      rows.push([
        <FlexContainer
          alignItems="center"
          key="trigger_description_label"
        >
          <Alphabet {...iconProps} />
          <Spacing mr={1} />
          <Text default>
            Description
          </Text>
        </FlexContainer>,
        <Text
          key="trigger_description"
        >
          {description}
        </Text>,
      ]);
    }

    if (sla) {
      const { time, unit } = convertSeconds(sla);
      const finalUnit = time === 1 ? unit : `${unit}s`;
      rows.push(
        [
          <FlexContainer
            alignItems="center"
            key="trigger_sla_label"
          >
            <Info {...iconProps} />
            <Spacing mr={1} />
            <Text default>
              SLA
            </Text>
          </FlexContainer>,
          <Text
            key="trigger_sla"
            monospace
          >
            {`${time} ${finalUnit}`}
          </Text>,
        ],
      );
    }

    if (scheduleInterval) {
      rows.push(
        [
          <FlexContainer
            alignItems="center"
            key="trigger_frequency_label"
          >
            <Schedule {...iconProps} />
            <Spacing mr={1} />
            <Text default>
              Frequency
            </Text>
          </FlexContainer>,
          <Text
            key="trigger_frequency"
            monospace
          >
            {(displayLocalTimezone && isCustomInterval)
              ? convertUtcCronExpressionToLocalTimezone(scheduleInterval)
              : scheduleInterval.replace('@', '')
            }
          </Text>,
        ],
        [
          <FlexContainer
            alignItems="center"
            key="trigger_next_run_date_label"
          >
            <CalendarDate {...iconProps} />
            <Spacing mr={1} />
            <Text default>
              Next run date
            </Text>
          </FlexContainer>,
          <Text
            key="trigger_next_run_date"
            monospace
          >
            {nextRunDate
              ? (displayLocalTimezone
                ? datetimeInLocalTimezone(nextRunDate, displayLocalTimezone)
                : dateFormatLong(
                  nextRunDate,
                  { includeSeconds: true, utcFormat: true },
                )
              ): 'N/A'
            }
          </Text>,
        ],
      );
    }

    if (startTime) {
      rows.push([
        <FlexContainer
          alignItems="center"
          key="trigger_start_date_label"
        >
          <CalendarDate {...iconProps} />
          <Spacing mr={1} />
          <Text default>
            Start date
          </Text>
        </FlexContainer>,
        <Text
          key="trigger_start_date"
          monospace
        >
          {displayLocalTimezone
            ? datetimeInLocalTimezone(startTime, displayLocalTimezone)
            : startTime
          }
        </Text>,
      ]);
    }

    if (lastEnabledAt) {
      rows.push([
        <FlexContainer
          alignItems="center"
          key="trigger_last_enabled_at_label"
        >
          <CalendarDate {...iconProps} />
          <Spacing mr={1} />
          <Text default>
            Last enabled at
          </Text>
        </FlexContainer>,
        <Text
          key="trigger_last_enabled_at"
          monospace
        >
          {displayLocalTimezone
            ? datetimeInLocalTimezone(lastEnabledAt, displayLocalTimezone)
            : dateFormatLong(lastEnabledAt, { includeSeconds: true })
          }
        </Text>,
      ]);
    }

    if (ScheduleTypeEnum.API === scheduleType) {
      const url = getTriggerApiEndpoint(pipelineSchedule);
      rows.push([
        <FlexContainer
          alignItems="center"
          key="trigger_api_endpoint_label"
        >
          <PlugAPI {...iconProps} />
          <Spacing mr={1} />
          <Text default>
            API endpoint
          </Text>
        </FlexContainer>,
        <CopyToClipboard
          copiedText={url}
          key="trigger_api_endpoint"
        >
          <Text monospace small>
            {url}
          </Text>
        </CopyToClipboard>,
      ]);
    }

    if (settings?.timeout) {
      const { time, unit } = convertSeconds(settings?.timeout);
      const finalUnit = time === 1 ? unit : `${unit}s`;
      rows.push([
        <FlexContainer
          alignItems="center"
          key="trigger_timeout"
        >
          <Tooltip
            default
            label="Timeout set for runs of this trigger"
            size={ICON_SIZE_DEFAULT}
            widthFitContent
          />
          <Spacing mr={1} />
          <Text default>
            Timeout
          </Text>
        </FlexContainer>,
        <Text
          key="trigger_timeout_label"
          monospace
        >
          {`${time} ${finalUnit}`}
        </Text>,
      ]);
    }
    if (settings?.skip_if_previous_running) {
      rows.push([
        <FlexContainer
          alignItems="center"
          key="trigger_skip_if_running"
        >
          <Tooltip
            default
            label="Skip current run if any previous runs are still in progress"
            size={ICON_SIZE_DEFAULT}
            widthFitContent
          />
          <Spacing mr={1} />
          <Text default>
            Skip if running
          </Text>
        </FlexContainer>,
        <Text
          key="trigger_skip_if_running_label"
          monospace
        >
          {settings.skip_if_previous_running?.toString()}
        </Text>,
      ]);
    }
    if (settings?.allow_blocks_to_fail) {
      rows.push([
        <FlexContainer
          alignItems="center"
          key="trigger_allow_blocks_to_fail"
        >
          <Tooltip
            default
            label="Trigger runs will continue running blocks if other unrelated blocks fail"
            size={ICON_SIZE_DEFAULT}
            widthFitContent
          />
          <Spacing mr={1} />
          <Text default>
            Allow blocks to fail
          </Text>
        </FlexContainer>,
        <Text
          key="trigger_allow_blocks_to_fail_label"
          monospace
        >
          {settings.allow_blocks_to_fail.toString()}
        </Text>,
      ]);
    }
    if (settings?.create_initial_pipeline_run) {
      rows.push([
        <FlexContainer
          alignItems="center"
          key="trigger_create_initial_pipeline_run"
        >
          <Tooltip
            default
            label="Create initial pipeline run if start date is before current execution period"
            maxWidth={UNIT * 32}
            size={ICON_SIZE_DEFAULT}
          />
          <Spacing mr={1} />
          <Text default>
            Create initial run
          </Text>
        </FlexContainer>,
        <Text
          key="trigger_create_initial_pipeline_run_label"
          monospace
        >
          {settings.create_initial_pipeline_run?.toString()}
        </Text>,
      ]);
    }

    return (
      <Table
        columnFlex={[null, 1]}
        rows={rows}
      />
    );
  }, [
    description,
    displayLocalTimezone,
    isActive,
    isCustomInterval,
    nextRunDate,
    pipelineSchedule,
    scheduleInterval,
    scheduleType,
    settings,
    sla,
    startTime,
    status,
  ]);

  const scheduleVariables = useMemo(() => scheduleVariablesInit || {}, [scheduleVariablesInit]);
  const variablesTable = useMemo(() => {
    let arr = [];

    if (!isEmptyObject(scheduleVariables)) {
      Object.entries(scheduleVariables).forEach(([k, v]) => {
        if (![MAGE_VARIABLES_KEY, VARIABLE_BOOKMARK_VALUES_KEY].includes(k)) {
          arr.push({
            uuid: k,
            value: getFormattedVariable(v),
          });
        }
      });
    } else {
      arr = getFormattedVariables(variables, block => block.uuid === GLOBAL_VARIABLES_UUID);
    }

    arr = addTriggerVariables(arr || [], scheduleType);

    if (typeof arr === 'undefined' || !arr?.length) {
      return null;
    }

    return (
      <Table
        columnFlex={[null, 1]}
        rows={arr.map(({
          uuid,
          value,
        }) => [
          <Text
            default
            key={`settings_variable_label_${uuid}`}
            monospace
          >
            {uuid}
          </Text>,
          <Text
            key={`settings_variable_${uuid}`}
            monospace
          >
            {value}
          </Text>,
        ])}
      />
    );
  }, [
    scheduleType,
    scheduleVariables,
    variables,
  ]);

  const bookmarkValuesTable = useMemo(() => {
    const bookmarkValues = scheduleVariables?.[VARIABLE_BOOKMARK_VALUES_KEY];

    if (!bookmarkValues) {
      return null;
    }

    return (
      <>
        {Object.entries(bookmarkValues || {}).map(([blockUUID, streams]) => {
          const block = blocksMapping?.[blockUUID];

          return (
            <Spacing key={blockUUID} mt={1}>
              <Spacing pb={1} px={PADDING_UNITS}>
                <Text
                  color={getColorsForBlockType(
                    block?.type,
                    {
                      blockColor: block?.color,
                      theme: themeContext,
                    },
                  ).accent}
                  monospace
                >
                  {blockUUID}
                </Text>
              </Spacing>

              <Divider light />

              {Object.entries(streams || {})?.map(([streamID, keyValues], idx) => (
                <div key={streamID}>
                  <Table
                    columnFlex={[null, 1]}
                    rows={[
                      [
                        <Text
                          default
                          key={`stream_title_${idx}`}
                          monospace
                        >
                          Stream
                        </Text>,
                        <Text
                          key={`stream_id_${idx}`}
                          monospace
                          rightAligned
                        >
                          {streamID}
                        </Text>,
                      ],
                    ].concat(Object.entries(keyValues || {}).map(([uuid, value]) => [
                      <Text
                        default
                        key={`settings_variable_label_${uuid}`}
                        monospace
                      >
                        {uuid}
                      </Text>,
                      <Text
                        key={`settings_variable_${uuid}`}
                        monospace
                        rightAligned
                      >
                        {value}
                      </Text>,
                    ]))}
                  />
                </div>
              ))}
            </Spacing>
          );
        })}
      </>
    );
  }, [
    blocksMapping,
    scheduleVariables,
    themeContext,
  ]);

  const dbtSettingsTable = useMemo(() => {
    const arr = [];
    // @ts-ignore
    const blocksData = scheduleVariables?.[MAGE_VARIABLES_KEY]?.blocks;

    pipeline?.blocks?.forEach((block) => {
      const {
        type,
        uuid,
      } = block;

      if (BlockTypeEnum.DBT === type) {
        const config = blocksData?.[uuid]?.configuration;
        const {
          flags,
          prefix,
          suffix,
        } = config || {};
        const {
          name: modelName,
        } = getModelAttributes(block);

        if (flags || prefix || suffix) {
          arr.push({
            flags,
            prefix,
            suffix,
            uuid: modelName,
          });
        }
      }
    });

    if (typeof arr === 'undefined' || !arr?.length) {
      return null;
    }

    return (
      <Table
        columnFlex={[1, null]}
        rows={arr.map(({
          flags,
          prefix,
          suffix,
          uuid,
        }) => [
          <Text
            key={`settings_variable_label_${uuid}`}
            monospace
            small
          >
            {prefix && (
              <Text inline monospace muted small>
                {prefix}
              </Text>
            )}{uuid}{suffix && (
              <Text inline monospace muted small>
                {suffix}
              </Text>
            )}
          </Text>,
          <Text
            key={`settings_variable_${uuid}`}
            monospace
            muted
            small
          >
            {flags && flags.join(', ')}
          </Text>,
        ])}
      />
    );
  }, [
    pipeline,
    scheduleVariables,
  ]);

  const eventsTable = useMemo(() => (
    <Table
      columnFlex={[null, 1]}
      columns={[
        {
          uuid: 'Provider',
        },
        {
          uuid: 'Event',
        },
      ]}
      rows={eventMatchers?.map(({
        event_type: eventType,
        name,
      }, idx) => [
        <Text
          default
          key={`${eventType}_${idx}_label`}
          monospace
        >
          {PROVIDER_EVENTS_BY_UUID[eventType].label()}
        </Text>,
        <Text
          key={`${eventType}_${idx}_name`}
          monospace
        >
          {name}
        </Text>,
      ])}
    />
  ), [eventMatchers]);

  const saveInCodeAutomaticallyToggled =
    useMemo(() => typeof pipeline?.settings?.triggers?.save_in_code_automatically === 'undefined'
      ? project?.pipelines?.settings?.triggers?.save_in_code_automatically
      : pipeline?.settings?.triggers?.save_in_code_automatically,
    [
      pipeline,
      project,
    ]);

  return (
    <PipelineDetailPage
      afterHidden={!selectedRun}
      before={(
        <BeforeStyle>
          <Spacing
            mb={UNITS_BETWEEN_SECTIONS}
            pt={PADDING_UNITS}
            px={PADDING_UNITS}
          >
            <Spacing mb={PADDING_UNITS}>
              {ScheduleTypeEnum.TIME === scheduleType && (
                <Sun size={5 * UNIT} />
              )}
              {ScheduleTypeEnum.EVENT === scheduleType && (
                <MusicNotes size={5 * UNIT} />
              )}
              {ScheduleTypeEnum.API === scheduleType && (
                <Lightning size={5 * UNIT} />
              )}
              {!scheduleType && (
                <MultiShare size={5 * UNIT} />
              )}
            </Spacing>

            <Headline>
              {pipelineScheduleName}
            </Headline>
          </Spacing>

          <Spacing px={PADDING_UNITS}>
            <Headline level={5}>
              Settings
            </Headline>
          </Spacing>

          <Divider light mt={1} short />

          {detailsMemo}

          {eventMatchers?.length >= 1 && (
            <Spacing my={UNITS_BETWEEN_SECTIONS}>
              <Spacing px={PADDING_UNITS}>
                <Headline level={5}>
                  Events
                </Headline>
              </Spacing>

              <Divider light mt={1} short />

              {eventsTable}
            </Spacing>
          )}

          {variablesTable && (
            <Spacing my={UNITS_BETWEEN_SECTIONS}>
              <Spacing px={PADDING_UNITS}>
                <Headline level={5}>
                  Runtime variables
                </Headline>
              </Spacing>

              <Divider light mt={1} short />

              {variablesTable}
            </Spacing>
          )}

          {bookmarkValuesTable && (
            <Spacing my={UNITS_BETWEEN_SECTIONS}>
              <Spacing px={PADDING_UNITS}>
                <Headline level={5}>
                  Bookmark values
                </Headline>
              </Spacing>

              <Divider light mt={1} short />

              {bookmarkValuesTable}
            </Spacing>
          )}

          {dbtSettingsTable && (
            <Spacing my={UNITS_BETWEEN_SECTIONS}>
              <Spacing px={PADDING_UNITS}>
                <Headline level={5}>
                  dbt runtime settings
                </Headline>
              </Spacing>

              <Divider light mt={1} short />

              {dbtSettingsTable}
            </Spacing>
          )}

          {tags?.length >= 1 && (
            <Spacing my={UNITS_BETWEEN_SECTIONS}>
              <Spacing px={PADDING_UNITS}>
                <Headline level={5}>
                  Tags
                </Headline>
              </Spacing>

              <Divider light mt={1} short />

              <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
                <TagsContainer
                  tags={tags?.map(tag => ({ uuid: tag }))}
                />
              </Spacing>
            </Spacing>
          )}\

          <Spacing my={UNITS_BETWEEN_SECTIONS}>
            <Spacing px={PADDING_UNITS}>
              <Headline level={5}>
                {triggerExistsInCode && 'Trigger exists in code'}
                {!triggerExistsInCode && 'Store trigger in code'}
              </Headline>

              <Spacing mt={1}>
                {saveInCodeAutomaticallyToggled && (
                  <Text default>
                    This trigger will automatically be persisted in code.
                    To change this behavior, update the <NextLink
                      as={`/pipelines/${pipelineUUID}/settings`}
                      href={'/pipelines/[pipeline]/settings'}
                      passHref
                    >
                      <Link openNewWindow>pipeline’s settings</Link>
                    </NextLink> or <NextLink
                      as="/settings/workspace/preferences"
                      href="/settings/workspace/preferences"
                      passHref
                    >
                      <Link openNewWindow>project settings</Link>
                    </NextLink>.
                  </Text>
                )}
                {!saveInCodeAutomaticallyToggled && (
                  <Text default>
                    Save or update the trigger and its settings in the
                    pipeline’s metadata and version control the trigger using Git.
                    For more information, please read the <Link
                      href="https://docs.mage.ai/guides/triggers/configure-triggers-in-code"
                      openNewWindow
                    >
                      documentation
                    </Link>.
                  </Text>
                )}
              </Spacing>

              {!saveInCodeAutomaticallyToggled && (
                <Spacing mt={PADDING_UNITS}>
                  {!dataPipelineTriggers && <Spinner inverted />}
                  {dataPipelineTriggers && (
                    <Button
                      disabled={!pipelineSchedule?.id}
                      loading={isLoadingCreatePipelineTrigger}
                      onClick={() => {
                        // @ts-ignore
                        createPipelineTrigger({
                          pipeline_trigger: {
                            pipeline_schedule_id: pipelineSchedule?.id,
                          },
                        });
                      }}
                      secondary
                    >
                      {triggerExistsInCode && 'Update trigger in code'}
                      {!triggerExistsInCode && 'Save trigger in code'}
                    </Button>
                  )}
                </Spacing>
              )}
            </Spacing>
          </Spacing>
        </BeforeStyle>
      )}
      beforeWidth={BEFORE_WIDTH}
      breadcrumbs={[
        {
          label: () => 'Triggers',
          linkProps: {
            as: `/pipelines/${pipelineUUID}/triggers`,
            href: '/pipelines/[pipeline]/triggers',
          },
        },
        {
          label: () => pipelineScheduleName,
          linkProps: {
            as: `/pipelines/${pipelineUUID}/triggers/${pipelineScheduleID}`,
            href: '/pipelines/[pipeline]/triggers/[...slug]',
          },
        },
      ]}
      buildSidekick={props => buildTableSidekick({
        ...props,
        selectedRun,
        selectedTab,
        setSelectedTab,
      })}
      errors={errors}
      pageName={PageNameEnum.TRIGGERS}
      pipeline={pipeline}
      setErrors={setErrors}
      subheader={(
        <FlexContainer alignItems="center">
          <Button
            beforeIcon={isActive
              ?
                <LightningOff size={ICON_SIZE_SMALL} />
              :
                <Lightning
                  inverted={!isViewerRole}
                  size={ICON_SIZE_SMALL}
                />
            }
            danger={isActive && !isViewerRole}
            loading={isLoadingUpdatePipelineSchedule}
            onClick={(e) => {
              pauseEvent(e);
              updatePipelineSchedule({
                id: pipelineScheduleID,
                status: isActive
                  ? ScheduleStatusEnum.INACTIVE
                  : ScheduleStatusEnum.ACTIVE,
              });
            }}
            outline
            success={!isActive && !isViewerRole}
          >
            {isActive
              ? 'Disable trigger'
              : 'Enable trigger'
            }
          </Button>

          <Spacing mr={PADDING_UNITS} />

          {pipelineType !== PipelineTypeEnum.STREAMING &&
            <>
              <Button
                beforeIcon={<Once size={ICON_SIZE_SMALL} />}
                disabled={disabledRunOnce}
                loading={isLoadingCreatePipelineRun}
                onClick={() => createPipelineRun({
                  pipeline_run: {
                    pipeline_schedule_id: pipelineScheduleID,
                    pipeline_uuid: pipelineUUID,
                    variables: scheduleVariables,
                  },
                })}
                outline
                title={disabledRunOnce
                  ? 'Trigger must be enabled to run@once'
                  : 'Manually run pipeline once immediately'
                }
              >
                <Text disabled={disabledRunOnce}>
                  Run@once
                </Text>
              </Button>
              <Spacing mr={PADDING_UNITS} />
            </>
          }

          {!isViewerRole &&
            <>
              <Button
                beforeIcon={<Edit size={ICON_SIZE_SMALL} />}
                linkProps={{
                  as: `/pipelines/${pipelineUUID}/triggers/${pipelineScheduleID}/edit`,
                  href: '/pipelines/[pipeline]/triggers/[...slug]',
                }}
                noHoverUnderline
                outline
                sameColorAsText
              >
                Edit trigger
              </Button>

              <Spacing mr={PADDING_UNITS} />
            </>
          }

          <Select
            compact
            defaultColor
            onChange={e => {
              e.preventDefault();
              const updatedStatus = e.target.value;
              if (updatedStatus === 'all') {
                router.push(
                  '/pipelines/[pipeline]/triggers/[...slug]',
                  `/pipelines/${pipelineUUID}/triggers/${pipelineScheduleID}`,
                );
              } else {
                goToWithQuery(
                  {
                    page: 0,
                    status: e.target.value,
                  },
                );
              }
            }}
            paddingRight={UNIT * 4}
            placeholder="Select run status"
            value={q?.status || 'all'}
          >
            <option key="all_statuses" value="all">
              All statuses
            </option>
            {PIPELINE_RUN_STATUSES.map(status => (
              <option key={status} value={status}>
                {RUN_STATUS_TO_LABEL[status]}
              </option>
            ))}
          </Select>
        </FlexContainer>
      )}
      title={() => pipelineScheduleName}
      uuid="triggers/detail"
    >
      <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
        <Headline level={5}>
          Runs for this trigger
        </Headline>
      </Spacing>

      <Divider light mt={PADDING_UNITS} short />

      {tablePipelineRuns}
    </PipelineDetailPage>
  );
}

export default TriggerDetail;
