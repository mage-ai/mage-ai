import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import BackfillType, {
  BACKFILL_TYPE_CODE,
  BACKFILL_TYPE_DATETIME,
  BackfillStatusEnum,
} from '@interfaces/BackfillType';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Paginate from '@components/shared/Paginate';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunsTable from '@components/PipelineDetail/Runs/Table';
import PipelineRunType, {
  PIPELINE_RUN_STATUSES,
  PipelineRunReqQueryParamsType,
  RUN_STATUS_TO_LABEL,
  RunStatus,
} from '@interfaces/PipelineRunType';
import PipelineType from '@interfaces/PipelineType';
import PipelineVariableType, {
  GLOBAL_VARIABLES_UUID,
  VariableType,
} from '@interfaces/PipelineVariableType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import buildTableSidekick, { TABS } from '@components/PipelineRun/shared/buildTableSidekick';
import {
  Backfill,
  CalendarDate,
  NumberHash,
  MultiShare,
  Pause,
  PlayButtonFilled,
  Schedule,
  Switch,
} from '@oracle/icons';
import { BeforeStyle } from '@components/PipelineDetail/shared/index.style';
import { ICON_SIZE_DEFAULT } from '@oracle/styles/units/icons';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { capitalize } from '@utils/string';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import {
  getFormattedVariable,
  getFormattedVariables,
} from '@components/Sidekick/utils';
import { getRunStatusTextProps } from '@components/shared/Table/constants';
import { goToWithQuery } from '@utils/routing';
import { isEmptyObject } from '@utils/hash';
import { isViewer } from '@utils/session';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { queryFromUrl, queryString } from '@utils/url';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

const LIMIT = 40;

type BackfillDetailProps = {
  backfill: BackfillType;
  errors: ErrorsType;
  fetchBackfill: () => void;
  pipeline: PipelineType;
  setErrors: (errors: ErrorsType) => void;
  variables?: PipelineVariableType[];
};

function BackfillDetail({
  backfill: model,
  errors,
  fetchBackfill,
  pipeline,
  setErrors,
  variables,
}: BackfillDetailProps) {
  const router = useRouter();
  const isViewerRole = isViewer(router?.basePath);
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const {
    block_uuid: blockUUID,
    end_datetime: endDatetime,
    id: modelID,
    interval_type: intervalType,
    interval_units: intervalUnits,
    name: modelName,
    pipeline_run_dates: pipelineRunDates,
    start_datetime: startDatetime,
    started_at: startedAt,
    status,
    total_run_count: totalRunCount,
    variables: modelVariablesInit = {},
  } = model || {};
  const {
    uuid: pipelineUUID,
  } = pipeline;

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
  } = api.pipeline_runs.list(
    {
      ...pipelineRunsRequestQuery,
      backfill_id: modelID,
    },
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    },
    {
      pauseFetch: !modelID,
    },
  );

  const isNotConfigured = !(startDatetime && endDatetime && intervalType && intervalUnits);
  const showPreviewRuns = !status;
  const pipelineRuns = useMemo(() => ((
    showPreviewRuns
      ? pipelineRunDates
      : dataPipelineRuns?.pipeline_runs)
    || []
    ), [
      dataPipelineRuns,
      pipelineRunDates,
      showPreviewRuns,
    ],
  );
  const totalRuns = useMemo(
    () => showPreviewRuns ? totalRunCount : dataPipelineRuns?.metadata?.count,
    [dataPipelineRuns, showPreviewRuns, totalRunCount],
  );

  const [selectedRun, setSelectedRun] = useState<PipelineRunType>(null);
  const tablePipelineRuns = useMemo(() => {
    const page = q?.page ? q.page : 0;

    return (
      <>
        <PipelineRunsTable
          disableRowSelect={showPreviewRuns}
          emptyMessage={(!q?.status && !status)
            ? 'No runs available. Please complete backfill configuration by clicking "Edit backfill" above.'
            : 'No runs available'
          }
          fetchPipelineRuns={fetchPipelineRuns}
          hidePipelineColumn
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
                '/pipelines/[pipeline]/backfills/[...slug]',
                `/pipelines/${pipelineUUID}/backfills/${modelID}?${queryString(updatedQuery)}`,
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
    modelID,
    pipelineRuns,
    pipelineUUID,
    q,
    router,
    selectedRun,
    setErrors,
    showPreviewRuns,
    status,
    totalRuns,
  ]);

  const [selectedTab, setSelectedTab] = useState(TABS[0]);

  const [updateModel, { isLoading: isLoadingUpdate }] = useMutation(
    api.backfills.useUpdate(modelID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchBackfill();
            fetchPipelineRuns();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const isActive = useMemo(() => status
    ? BackfillStatusEnum.CANCELLED !== status && BackfillStatusEnum.FAILED !== status
    : false,
    [
      status,
    ],
  );
  const cannotStartOrCancel = useMemo(() => status
    && BackfillStatusEnum.CANCELLED !== status
    && BackfillStatusEnum.FAILED !== status
    && BackfillStatusEnum.INITIAL !== status
    && BackfillStatusEnum.RUNNING !== status, [status]);

  const detailsMemo = useMemo(() => {
    const iconProps = {
      default: true,
      size: 1.5 * UNIT,
    };

    const rows = [
      [
        <FlexContainer
          alignItems="center"
          key="backfill_type_label"
        >
          <MultiShare {...iconProps} />
          <Spacing mr={1} />
          <Text default>
            Backfill type
          </Text>
        </FlexContainer>,
        <Text
          key="backfill_type"
          monospace
        >
          {blockUUID ? BACKFILL_TYPE_CODE : BACKFILL_TYPE_DATETIME}
        </Text>,
      ],
      [
        <FlexContainer
          alignItems="center"
          key="backfill_status_label"
        >
          <Switch {...iconProps} />
          <Spacing mr={1} />
          <Text default>
            Status
          </Text>
        </FlexContainer>,
        <Text
          {...getRunStatusTextProps(status)}
          key="backfill_status"
        >
          {status || 'inactive'}
        </Text>,
      ],
    ];

    if (blockUUID) {

    } else {
      rows.push(...[
        [
          <FlexContainer
            alignItems="center"
            key="backfill_start_date_label"
          >
            <CalendarDate {...iconProps} />
            <Spacing mr={1} />
            <Text default>
              Start date and time
            </Text>
          </FlexContainer>,
          <Text
            key="backfill_start_date"
            monospace
            small
          >
            {displayLocalOrUtcTime(startDatetime, displayLocalTimezone)}
          </Text>,
        ],
        [
          <FlexContainer
            alignItems="center"
            key="backfill_end_date_label"
          >
            <CalendarDate {...iconProps} />
            <Spacing mr={1} />
            <Text default>
              End date and time
            </Text>
          </FlexContainer>,
          <Text
            key="backfill_end_date"
            monospace
            small
          >
            {displayLocalOrUtcTime(endDatetime, displayLocalTimezone)}
          </Text>,
        ],
        [
          <FlexContainer
            alignItems="center"
            key="interval_type_label"
          >
            <Schedule {...iconProps} />
            <Spacing mr={1} />
            <Text default>
              Interval type
            </Text>
          </FlexContainer>,
          <Text
            key="interval_type"
            monospace
          >
            {intervalType && capitalize(intervalType)}
          </Text>,
        ],
        [
          <FlexContainer
            alignItems="center"
            key="interval_units_label"
          >
            <Schedule {...iconProps} />
            <Spacing mr={1} />
            <Text default>
              Interval units
            </Text>
          </FlexContainer>,
          <Text
            key="interval_units"
            monospace
          >
            {intervalUnits}
          </Text>,
        ],
        [
          <FlexContainer
            alignItems="center"
            key="total_runs_label"
          >
            <NumberHash {...iconProps} />
            <Spacing mr={1} />
            <Text default>
              Total runs
            </Text>
            <Spacing mr={1} />
            <Tooltip
              default
              label="This count does not include retries."
              size={ICON_SIZE_DEFAULT}
              widthFitContent
            />
          </FlexContainer>,
          <Text
            key="total_runs"
            monospace
          >
            {totalRunCount}
          </Text>,
        ],
      ]);
    }

    return (
      <Table
        columnFlex={[null, 1]}
        rows={rows}
      />
    );
  }, [
    blockUUID,
    displayLocalTimezone,
    endDatetime,
    intervalType,
    intervalUnits,
    startDatetime,
    status,
    totalRunCount,
  ]);

  const modelVariables = useMemo(() => modelVariablesInit || {}, [modelVariablesInit]);
  const variablesTable = useMemo(() => {
    const arr = getFormattedVariables(variables, block => block.uuid === GLOBAL_VARIABLES_UUID) || [];

    if (!isEmptyObject(modelVariables)) {
      Object.entries(modelVariables).forEach(([k, v]) => {
        const currentVarIdx = arr.findIndex((pipelineVar: VariableType) => pipelineVar?.uuid === k);
        if (currentVarIdx !== -1) {
          arr.splice(currentVarIdx, 1, {
            uuid: k,
            value: getFormattedVariable(v),
          });
        } else {
          arr.push({
            uuid: k,
            value: getFormattedVariable(v),
          });
        }
      });
    }

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
    modelVariables,
    variables,
  ]);

  return (
    <>
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
                <Backfill size={5 * UNIT} />
              </Spacing>

              <Headline>
                {modelName}
              </Headline>
            </Spacing>

            <Spacing px={PADDING_UNITS}>
              <Headline level={5}>
                Settings
              </Headline>
            </Spacing>

            <Divider light mt={1} short />

            {detailsMemo}

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
          </BeforeStyle>
        )}
        beforeWidth={34 * UNIT}
        breadcrumbs={[
          {
            label: () => 'Backfills',
            linkProps: {
              as: `/pipelines/${pipelineUUID}/backfills`,
              href: '/pipelines/[pipeline]/backfills',
            },
          },
          {
            label: () => modelName,
            linkProps: {
              as: `/pipelines/${pipelineUUID}/backfills/${modelID}`,
              href: '/pipelines/[pipeline]/backfills/[...slug]',
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
        pageName={PageNameEnum.BACKFILLS}
        pipeline={pipeline}
        setErrors={setErrors}
        subheader={(
          <FlexContainer alignItems="center">
            {!cannotStartOrCancel && (
              <>
                <Button
                  beforeIcon={isActive
                    ? <Pause size={2 * UNIT} />
                    : <PlayButtonFilled
                        inverted={!(BackfillStatusEnum.CANCELLED === status || BackfillStatusEnum.FAILED === status)}
                        size={2 * UNIT}
                      />
                  }
                  danger={isActive}
                  disabled={isNotConfigured}
                  loading={isLoadingUpdate}
                  onClick={(e) => {
                    pauseEvent(e);
                    // @ts-ignore
                    updateModel({
                      backfill: {
                        status: isActive
                          ? BackfillStatusEnum.CANCELLED
                          : BackfillStatusEnum.INITIAL,
                      },
                    });
                  }}
                  outline
                  success={!isActive
                    && !(BackfillStatusEnum.CANCELLED === status || BackfillStatusEnum.FAILED === status)
                    && !isNotConfigured
                  }
                >
                  {isActive
                    ? 'Cancel backfill'
                    : BackfillStatusEnum.CANCELLED === status || BackfillStatusEnum.FAILED === status
                      ? 'Retry backfill'
                      : 'Start backfill'
                  }
                </Button>
                <Spacing mr={PADDING_UNITS} />
              </>
            )}

            {(!isViewerRole && !startedAt) &&
              <Button
                linkProps={{
                  as: `/pipelines/${pipelineUUID}/backfills/${modelID}/edit`,
                  href: '/pipelines/[pipeline]/backfills/[...slug]',
                }}
                noHoverUnderline
                outline
                sameColorAsText
                title="Backfills cannot be edited once they've been started."
              >
                Edit backfill
              </Button>
            }

            {!showPreviewRuns &&
              <>
                <Text bold default large>
                  Filter runs by status:
                </Text>
                <Spacing mr={PADDING_UNITS} />
                <Select
                  compact
                  defaultColor
                  onChange={e => {
                    e.preventDefault();
                    const updatedStatus = e.target.value;
                    if (updatedStatus === 'all') {
                      router.push(
                        '/pipelines/[pipeline]/backfills/[...slug]',
                        `/pipelines/${pipelineUUID}/backfills/${modelID}`,
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
              </>
            }
          </FlexContainer>
        )}
        title={() => modelName}
        uuid="backfill/detail"
      >
        <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
          <Headline level={5}>
            Runs for this backfill
          </Headline>
        </Spacing>

        <Divider light mt={PADDING_UNITS} short />

        {!dataPipelineRuns
          ?
            <Spacing m={2}>
              <Spinner inverted />
            </Spacing>
          : tablePipelineRuns}
      </PipelineDetailPage>
    </>
  );
}

export default BackfillDetail;
