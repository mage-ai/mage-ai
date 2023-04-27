import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Paginate from '@components/shared/Paginate';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunsTable from '@components/PipelineDetail/Runs/Table';
import PipelineRunType, {
  PipelineRunReqQueryParamsType,
  RUN_STATUS_TO_LABEL,
 } from '@interfaces/PipelineRunType';
import PipelineScheduleType, {
  SCHEDULE_TYPE_TO_LABEL,
  ScheduleStatusEnum,
  ScheduleTypeEnum,
} from '@interfaces/PipelineScheduleType';
import PipelineType from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import buildTableSidekick, { TABS } from '@components/PipelineRun/shared/buildTableSidekick';
import { BEFORE_WIDTH, BeforeStyle } from '@components/PipelineDetail/shared/index.style';
import { BlockTypeEnum } from '@interfaces/BlockType';
import {
  CalendarDate,
  Info,
  Lightning,
  MultiShare,
  MusicNotes,
  Pause,
  PlayButtonFilled,
  Schedule,
  Sun,
  Switch,
} from '@oracle/icons';
import { MAGE_VARIABLES_KEY } from '@interfaces/PipelineRunType';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PROVIDER_EVENTS_BY_UUID } from '@interfaces/EventMatcherType';
import { RunStatus as RunStatusEnum } from '@interfaces/BlockRunType';
import {
  addTriggerVariables,
  getFormattedVariable,
  getFormattedVariables,
} from '@components/Sidekick/utils';
import { convertSeconds } from '../utils';
import { getModelAttributes } from '@utils/models/dbt';
import { goToWithQuery } from '@utils/routing';
import { ignoreKeys, isEmptyObject } from '@utils/hash';
import { isViewer } from '@utils/session';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { queryFromUrl, queryString } from '@utils/url';

type TriggerDetailProps = {
  fetchPipelineSchedule: () => void;
  pipeline: PipelineType;
  pipelineSchedule?: PipelineScheduleType;
  variables?: PipelineVariableType[];
};

const LIMIT = 30;

function TriggerDetail({
  fetchPipelineSchedule,
  pipeline,
  pipelineSchedule,
  variables,
}: TriggerDetailProps) {
  const router = useRouter();
  const isViewerRole = isViewer();
  const [errors, setErrors] = useState(null);

  const {
    uuid: pipelineUUID,
  } = pipeline || {};
  const {
    id: pipelineScheduleID,
    event_matchers: eventMatchers,
    name: pipelineScheduleName,
    schedule_interval: scheduleInterval,
    schedule_type: scheduleType,
    settings,
    sla,
    start_time: startTime,
    status,
    variables: scheduleVariablesInit = {},
  } = pipelineSchedule || {};

  const q = queryFromUrl();

  const pipelineRunsRequestQuery: PipelineRunReqQueryParamsType = {
    _limit: LIMIT,
    _offset: (q?.page ? q.page : 0) * LIMIT,
  };
  if (q?.status) {
    pipelineRunsRequestQuery.status = q.status;
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
        />
        <Spacing p={2}>
          <Paginate
            page={Number(page)}
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
            totalPages={Math.ceil(totalRuns / LIMIT)}
          />
        </Spacing>
      </>
    );
  }, [
    fetchPipelineRuns,
    pipeline,
    pipelineRuns,
    selectedRun,
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
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const isActive = useMemo(() => ScheduleStatusEnum.ACTIVE === status, [status]);

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
        </Text>
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
        </Text>
      ],
    ];

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
          </Text>
        ]
      );
    }

    if (scheduleInterval) {
      rows.push([
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
          {scheduleInterval.replace('@', '')}
        </Text>,
      ]);
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
          {startTime}
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
            size={UNIT*1.5}
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
            size={UNIT*1.5}
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

    return (
      <Table
        columnFlex={[null, 1]}
        rows={rows}
      />
    );
  }, [
    isActive,
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
        if (MAGE_VARIABLES_KEY !== k) {
          arr.push({
            uuid: k,
            value: getFormattedVariable(v),
          });
        }
      });
    } else {
      arr = getFormattedVariables(variables, block => block.uuid === 'global');
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
            small
          >
            {uuid}
          </Text>,
          <Text
            key={`settings_variable_${uuid}`}
            monospace
            small
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
        }
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
                <Pause size={2 * UNIT} />
              :
                <PlayButtonFilled
                  inverted={!isViewerRole}
                  size={2 * UNIT}
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
              ? 'Pause trigger'
              : 'Start trigger'
            }
          </Button>

          <Spacing mr={PADDING_UNITS} />

          {!isViewerRole &&
            <>
              <Button
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
            {Object.values(RunStatusEnum).map(status => (
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
