import NextLink from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import DependencyGraph, { DependencyGraphProps } from '@components/DependencyGraph';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Paginate, { ROW_LIMIT } from '@components/shared/Paginate';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineScheduleType, {
  PipelineScheduleFilterQueryEnum,
  SCHEDULE_TYPE_TO_LABEL,
  ScheduleIntervalEnum,
  ScheduleStatusEnum,
  ScheduleTypeEnum,
} from '@interfaces/PipelineScheduleType';
import PipelineTriggerType from '@interfaces/PipelineTriggerType';
import PrivateRoute from '@components/shared/PrivateRoute';
import RunPipelinePopup from '@components/Triggers/RunPipelinePopup';
import RuntimeVariables from '@components/RuntimeVariables';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import TagType from '@interfaces/TagType';
import Text from '@oracle/elements/Text';
import Toolbar from '@components/shared/Table/Toolbar';
import Tooltip from '@oracle/components/Tooltip';
import TriggersTable from '@components/Triggers/Table';
import api from '@api';
import { GLOBAL_VARIABLES_UUID } from '@interfaces/PipelineVariableType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PlayButton } from '@oracle/icons';
import { dateFormatLong } from '@utils/date';
import { filterQuery, queryFromUrl, queryString } from '@utils/url';
import { getFormattedVariables } from '@components/Sidekick/utils';
import { getPipelineScheduleApiFilterQuery } from '@components/Triggers/utils';
import { indexBy, sortByKey } from '@utils/array';
import { isEmptyObject } from '@utils/hash';
import { isViewer } from '@utils/session';
import { onSuccess } from '@api/utils/response';
import { randomNameGenerator } from '@utils/string';
import { useModal } from '@context/Modal';

type PipelineSchedulesProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineSchedules({
  pipeline,
}: PipelineSchedulesProp) {
  const router = useRouter();
  const isViewerRole = isViewer();
  const pipelineUUID = pipeline.uuid;
  const [errors, setErrors] = useState(null);

  const {
    data: dataGlobalVariables,
  } = api.variables.pipelines.list(pipelineUUID, {
    global_only: true,
  }, {
    revalidateOnFocus: false,
  });
  const globalVariables = dataGlobalVariables?.variables;

  const q = queryFromUrl();
  const query = filterQuery(q, [
    PipelineScheduleFilterQueryEnum.INTERVAL,
    PipelineScheduleFilterQueryEnum.STATUS,
    PipelineScheduleFilterQueryEnum.TAG,
    PipelineScheduleFilterQueryEnum.TYPE,
  ]);
  const apiFilterQuery = getPipelineScheduleApiFilterQuery(query);
  const page = q?.page ? q.page : 0;
  const {
    data: dataPipelineSchedules,
    mutate: fetchPipelineSchedules,
  } = api.pipeline_schedules.pipelines.list(
    pipelineUUID,
    {
      ...apiFilterQuery,
      _limit: ROW_LIMIT,
      _offset: (q?.page ? q.page : 0) * ROW_LIMIT,
    },
    { refreshInterval: 7500 },
  );
  const pipelineSchedules: PipelineScheduleType[] =
    useMemo(() => dataPipelineSchedules?.pipeline_schedules || [], [dataPipelineSchedules]);

  const useCreateScheduleMutation = (onSuccessCallback) => useMutation(
    api.pipeline_schedules.pipelines.useCreate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline_schedule: {
              id,
            },
          }) => {
            onSuccessCallback?.(id);
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const [createNewSchedule, { isLoading: isLoadingCreateNewSchedule }]: any = useCreateScheduleMutation(
    (pipelineScheduleId) => router.push(
      '/pipelines/[pipeline]/triggers/[...slug]',
      `/pipelines/${pipeline?.uuid}/triggers/${pipelineScheduleId}/edit`,
    ),
  );
  const [createOnceSchedule, { isLoading: isLoadingCreateOnceSchedule }] =
    useCreateScheduleMutation(fetchPipelineSchedules);

  const variablesOrig = useMemo(() => (
    getFormattedVariables(
      globalVariables,
      block => block.uuid === GLOBAL_VARIABLES_UUID,
    )?.reduce((acc, { uuid, value }) => ({
      ...acc,
      [uuid]: value,
    }), {})
  ), [globalVariables]);

  const pipelineOnceSchedulePayload = {
    name: randomNameGenerator(),
    schedule_interval: ScheduleIntervalEnum.ONCE,
    schedule_type: ScheduleTypeEnum.TIME,
    start_time: dateFormatLong(
      new Date().toISOString(),
      { dayAgo: true, utcFormat: true },
    ),
    status: ScheduleStatusEnum.ACTIVE,
  };
  const [showModal, hideModal] = useModal(() => (
    <RunPipelinePopup
      initialPipelineSchedulePayload={pipelineOnceSchedulePayload}
      onCancel={hideModal}
      onSuccess={createOnceSchedule}
      variables={variablesOrig}
    />
  ), {
  }, [
    globalVariables,
    variablesOrig,
  ], {
    background: true,
    uuid: 'run_pipeline_now_popup',
  });

  const [selectedSchedule, setSelectedSchedule] = useState<PipelineScheduleType>();
  const buildSidekick = useMemo(() => {
    const variablesOverride = selectedSchedule?.variables;
    const hasOverride = !isEmptyObject(variablesOverride);

    const showVariables = hasOverride
      ? selectedSchedule?.variables
      : !isEmptyObject(variablesOrig) ? variablesOrig : null;

    return (props: DependencyGraphProps) => {
      const dependencyGraphHeight = props.height - (showVariables ? 151 : 80);

      return (
        <>
          {showVariables && (
            <RuntimeVariables
              hasOverride={hasOverride}
              scheduleType={selectedSchedule?.schedule_type}
              variables={variablesOrig}
              variablesOverride={variablesOverride}
            />
          )}
          {!showVariables && (
            <Spacing p={PADDING_UNITS}>
              <Text>
                This pipeline has no runtime variables.
              </Text>

              {!isViewerRole &&
                <Spacing mt={1}>
                  <NextLink
                    as={`/pipelines/${pipelineUUID}/edit?sideview=variables`}
                    href={'/pipelines/[pipeline]/edit'}
                    passHref
                  >
                    <Link primary>
                      Click here
                    </Link>
                  </NextLink> <Text inline>
                    to add variables to this pipeline.
                  </Text>
                </Spacing>
              }
            </Spacing>
          )}
          <DependencyGraph
            {...props}
            height={dependencyGraphHeight}
            noStatus
          />
        </>
      );
    };
  }, [
    isViewerRole,
    pipelineUUID,
    selectedSchedule?.schedule_type,
    selectedSchedule?.variables,
    variablesOrig,
  ]);

  const totalTriggers = useMemo(() => dataPipelineSchedules?.metadata?.count || [], [
    dataPipelineSchedules,
  ]);

  const {
    data: dataPipelineTriggers,
  } = api.pipeline_triggers.pipelines.list(pipelineUUID);
  const pipelineTriggersByName: {
    [name: string]: PipelineTriggerType;
  } = useMemo(() => indexBy(dataPipelineTriggers?.pipeline_triggers || [], ({ name }) => name), [
    dataPipelineTriggers,
  ]);

  const { data: dataTags } = api.tags.list();
  const tags: TagType[] = useMemo(() => sortByKey(dataTags?.tags || [], ({ uuid }) => uuid), [
    dataTags,
  ]);

  const toolbarEl = useMemo(() => (
    <Toolbar
      addButtonProps={{
        isLoading: isLoadingCreateNewSchedule,
        label: 'New trigger',
        onClick: () => createNewSchedule({
          pipeline_schedule: {
            name: randomNameGenerator(),
          },
        }),
      }}
      filterOptions={{
        frequency: Object.values(ScheduleIntervalEnum),
        status: Object.values(ScheduleStatusEnum),
        tag: tags.map(({ uuid }) => uuid),
        type: Object.values(ScheduleTypeEnum),
      }}
      filterValueLabelMapping={{
        tag: tags.reduce((acc, { uuid }) => ({
          ...acc,
          [uuid]: uuid,
        }), {}),
        type: SCHEDULE_TYPE_TO_LABEL,
      }}
      onClickFilterDefaults={() => {
        router.push(
          '/pipelines/[pipeline]/triggers',
          `/pipelines/${pipelineUUID}/triggers`,
        );
      }}
      query={query}
    />
  ), [
    createNewSchedule,
    isLoadingCreateNewSchedule,
    pipelineUUID,
    query,
    router,
    tags,
  ]);

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Triggers',
        },
      ]}
      buildSidekick={buildSidekick}
      errors={errors}
      pageName={PageNameEnum.TRIGGERS}
      pipeline={pipeline}
      setErrors={setErrors}
      subheader={toolbarEl}
      title={({ name }) => `${name} triggers`}
      uuid={`${PageNameEnum.TRIGGERS}_${pipelineUUID}`}
    >
      <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
        <FlexContainer justifyContent="space-between">
          <Headline level={5}>
            Pipeline triggers
          </Headline>
          <Tooltip
            appearBefore
            default
            fullSize
            label="Creates an @once trigger and runs pipeline immediately"
            widthFitContent
          >
            <Button
              beforeIcon={<PlayButton inverted size={UNIT * 2} />}
              disabled={isViewerRole}
              loading={isLoadingCreateOnceSchedule}
              onClick={isEmptyObject(variablesOrig)
                // @ts-ignore
                ? () => createOnceSchedule({
                  pipeline_schedule: pipelineOnceSchedulePayload,
                })
                : showModal}
              outline
              success={!isViewerRole}
            >
              Run pipeline now
            </Button>
          </Tooltip>
        </FlexContainer>
      </Spacing>

      <Divider light mt={PADDING_UNITS} short />

      {!dataPipelineSchedules
        ?
          <Spacing m={2}>
            <Spinner inverted />
          </Spacing>
        :
          <>
            <TriggersTable
              fetchPipelineSchedules={fetchPipelineSchedules}
              pipeline={pipeline}
              pipelineSchedules={pipelineSchedules}
              pipelineTriggersByName={pipelineTriggersByName}
              selectedSchedule={selectedSchedule}
              setErrors={setErrors}
              setSelectedSchedule={setSelectedSchedule}
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
                    '/pipelines/[pipeline]/triggers',
                    `/pipelines/${pipelineUUID}/triggers?${queryString(updatedQuery)}`,
                  );
                }}
                page={Number(page)}
                totalPages={Math.ceil(totalTriggers / ROW_LIMIT)}
              />
            </Spacing>
          </>
      }
    </PipelineDetailPage>
  );
}

PipelineSchedules.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PrivateRoute(PipelineSchedules);
