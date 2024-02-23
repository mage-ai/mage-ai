import NextLink from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import DependencyGraph, { DependencyGraphProps } from '@components/DependencyGraph';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import InteractionType from '@interfaces/InteractionType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import Paginate, { ROW_LIMIT } from '@components/shared/Paginate';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineInteractionType from '@interfaces/PipelineInteractionType';
import PipelineScheduleType, {
  PipelineScheduleFilterQueryEnum,
  SCHEDULE_TYPE_TO_LABEL,
  ScheduleIntervalEnum,
  ScheduleStatusEnum,
  ScheduleTypeEnum,
} from '@interfaces/PipelineScheduleType';
import PipelineTriggerType from '@interfaces/PipelineTriggerType';
import PrivateRoute from '@components/shared/PrivateRoute';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import RunPipelinePopup from '@components/Triggers/RunPipelinePopup';
import RuntimeVariables from '@components/RuntimeVariables';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import TagType from '@interfaces/TagType';
import Text from '@oracle/elements/Text';
import TriggerEdit from '@components/Triggers/Edit';
import Toolbar from '@components/shared/Table/Toolbar';
import TriggersTable from '@components/Triggers/Table';
import api from '@api';
import {
  ContainerStyle as RuntimeVariablesContainerStyle,
} from '@components/RuntimeVariables/index.style';
import { ICON_SIZE_SMALL } from '@oracle/styles/units/icons';
import {
  Interactions as InteractionsIcon,
  Once,
} from '@oracle/icons';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { SHARED_BUTTON_PROPS } from '@components/shared/AddButton';
import { VerticalDividerStyle } from '@oracle/elements/Divider/index.style';
import { capitalize, randomNameGenerator } from '@utils/string';
import { dateFormatLong } from '@utils/date';
import { filterQuery, queryFromUrl, queryString } from '@utils/url';
import { getFormattedGlobalVariables } from '@components/Sidekick/utils';
import { getPipelineScheduleApiFilterQuery } from '@components/Triggers/utils';
import { indexBy, sortByKey } from '@utils/array';
import { isEmptyObject } from '@utils/hash';
import { isViewer } from '@utils/session';
import { onSuccess } from '@api/utils/response';
import { storeLocalTimezoneSetting } from '@components/settings/workspace/utils';
import { useModal } from '@context/Modal';

type PipelineSchedulesProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineSchedules({
  pipeline: pipelineProp,
}: PipelineSchedulesProp) {
  const router = useRouter();
  const isViewerRole = isViewer();
  const pipelineUUID = pipelineProp.uuid;

  const { data } = api.pipelines.detail(pipelineUUID, {
    includes_outputs: false,
  }, {
    revalidateOnFocus: false,
  });
  const pipeline = useMemo(() => data?.pipeline || pipelineProp, [data?.pipeline, pipelineProp]);

  const [errors, setErrors] = useState<ErrorsType>(null);
  const [triggerErrors, setTriggerErrors] = useState<ErrorsType>(null);
  const [isCreatingTrigger, setIsCreatingTrigger] = useState<boolean>(false);

  const { data: dataProjects } = api.projects.list();
  const project: ProjectType = useMemo(() => dataProjects?.projects?.[0], [dataProjects]);
  const _ = useMemo(
    () => storeLocalTimezoneSetting(project?.features?.[FeatureUUIDEnum.LOCAL_TIMEZONE]),
    [project?.features],
  );

  const { data: dataClientPage } = api.client_pages.detail('pipeline_schedule:create', {
    'pipelines[]': [pipelineUUID],
  }, {}, {
    key: `Triggers/Edit/${pipelineUUID}`,
  });
  const clientPage = useMemo(() => dataClientPage?.client_page, [dataClientPage]);

  // const isInteractionsEnabled =
  //   useMemo(() => !!project?.features?.[FeatureUUIDEnum.INTERACTIONS], [
  //     project?.features,
  //   ]);
  const isInteractionsEnabled =
    useMemo(() => clientPage?.components?.find(({
      uuid,
    }) => uuid === 'create_with_interactions_component')?.enabled, [
      clientPage,
    ]);
  const isCreateDisabled =
    useMemo(() => clientPage?.disabled, [
      clientPage,
    ]);

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
  const [createOnceSchedule, { isLoading: isLoadingCreateOnceSchedule }]: any =
    useCreateScheduleMutation(fetchPipelineSchedules);

  const variablesOrig = useMemo(() => getFormattedGlobalVariables(globalVariables), [
    globalVariables,
  ]);

  const randomTriggerName = randomNameGenerator();
  const pipelineOnceSchedulePayload = useMemo(() => ({
    name: randomTriggerName,
    schedule_interval: ScheduleIntervalEnum.ONCE,
    schedule_type: ScheduleTypeEnum.TIME,
    start_time: dateFormatLong(
      new Date().toISOString(),
      { dayAgo: true, utcFormat: true },
    ),
    status: ScheduleStatusEnum.ACTIVE,
  }), [randomTriggerName]);
  const [showModal, hideModal] = useModal(() => (
    <RunPipelinePopup
      initialPipelineSchedulePayload={pipelineOnceSchedulePayload}
      onCancel={hideModal}
      onSuccess={createOnceSchedule}
      pipeline={pipeline}
      variables={variablesOrig}
    />
  ), {
  }, [
    globalVariables,
    pipeline,
    variablesOrig,
  ], {
    background: true,
    uuid: 'run_pipeline_now_popup',
  });

  const [selectedSchedule, setSelectedSchedule] = useState<PipelineScheduleType>();
  const buildSidekick = useMemo(() => {
    const variablesOverride = selectedSchedule?.variables;
    const hasVariables = !isEmptyObject(variablesOrig);

    return (props: DependencyGraphProps) => {
      /**
       * Because it's required to specify the DependencyGraph height, we calculate
       * the RuntimeVariables height here instead of within its component.
       * We dynamically calculate the RuntimeVariables height based on the number
       * of visible rows in the runtime variables table at any time.
       */
      let runtimeVariablesHeight = 80;
      if (hasVariables) {
        const maxVisibleRows = 5;
        const headerRowHeight = 46; // Includes top + bottom border
        const rowHeight = 43; // Includes bottom border
        const numVariables = Object.keys(variablesOrig).length;
        const numVisibleRows = Math.min(maxVisibleRows, numVariables);
        runtimeVariablesHeight = headerRowHeight + (numVisibleRows * rowHeight) + 1;
      }

      const dependencyGraphHeight = props.height - runtimeVariablesHeight;

      return (
        <>
          <DependencyGraph
            {...props}
            enablePorts={false}
            height={dependencyGraphHeight}
            noStatus
          />
          {hasVariables && (
            <RuntimeVariables
              height={runtimeVariablesHeight}
              scheduleType={selectedSchedule?.schedule_type}
              variables={variablesOrig}
              variablesOverride={variablesOverride}
            />
          )}
          {!hasVariables && (
            <RuntimeVariablesContainerStyle
              height={runtimeVariablesHeight}
              includePadding
              overflow
            >
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
            </RuntimeVariablesContainerStyle>
          )}
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

  useEffect(() => {
    const triggers = dataPipelineTriggers?.pipeline_triggers || [];
    const triggerWithInvalidCronExpression = triggers.find(({ settings }) => settings?.invalid_schedule_interval);
    if (triggerWithInvalidCronExpression) {
      setTriggerErrors({
        displayMessage: `Schedule interval for Trigger (in code) "${triggerWithInvalidCronExpression?.name}"`
          + ' is invalid. Please check your cron expression’s syntax in the pipeline’s triggers.yaml file.',
      });
    } else {
      setTriggerErrors(null);
    }
  }, [dataPipelineTriggers?.pipeline_triggers]);

  const { data: dataTags } = api.tags.list();
  const tags: TagType[] = useMemo(() => sortByKey(dataTags?.tags || [], ({ uuid }) => uuid), [
    dataTags,
  ]);

  const {
    data: dataPipelineInteraction,
  } = api.pipeline_interactions.detail(
    isInteractionsEnabled && pipelineUUID,
    {
      filter_for_permissions: 1,
    },
  );

  const {
    data: dataInteractions,
  } = api.interactions.pipeline_interactions.list(isInteractionsEnabled && pipelineUUID);

  const { data: dataPipeline } = api.pipelines.detail(isInteractionsEnabled && pipelineUUID);

  const pipelineInteraction: PipelineInteractionType =
    useMemo(() => dataPipelineInteraction?.pipeline_interaction || {}, [
      dataPipelineInteraction,
    ]);
  const interactions: InteractionType[] =
    useMemo(() => dataInteractions?.interactions || [], [
      dataInteractions,
    ]);
  const pipelineHasInteractions =
    useMemo(() => isInteractionsEnabled
      && Object.keys(pipelineInteraction?.blocks || {})?.length >= 1,
    [
      isInteractionsEnabled,
      pipelineInteraction,
    ]);

  const newTriggerFromInteractionsButtonMemo = useMemo(() => pipelineHasInteractions && (
    <>
      <Spacing ml="12px" />

      <VerticalDividerStyle />

      <Spacing ml="12px" />

      <KeyboardShortcutButton
        {...SHARED_BUTTON_PROPS}
        Icon={InteractionsIcon}
        inline
        onClick={() => setIsCreatingTrigger(true)}
        uuid="Create trigger with no-code"
      >
        Create trigger with no-code
      </KeyboardShortcutButton>
    </>
  ), [
    pipelineHasInteractions,
    setIsCreatingTrigger,
  ]);

  const toolbarEl = useMemo(() => (
    <Toolbar
      addButtonProps={!isCreateDisabled && {
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
        status: Object.values(ScheduleStatusEnum).reduce(
          (acc, cv) => ({ ...acc, [cv]: capitalize(cv) }), {},
        ),
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
      resetPageOnFilterApply
      secondaryButtonProps={!isCreateDisabled && {
        beforeIcon: <Once size={ICON_SIZE_SMALL} />,
        disabled: isViewerRole,
        isLoading: isLoadingCreateOnceSchedule,
        label: 'Run@once',
        onClick: showModal,
        tooltip: 'Creates an @once trigger and runs pipeline immediately',
      }}
      showDivider={!isCreateDisabled}
    >
      {newTriggerFromInteractionsButtonMemo}
    </Toolbar>
  ), [
    createNewSchedule,
    isCreateDisabled,
    isLoadingCreateNewSchedule,
    isLoadingCreateOnceSchedule,
    isViewerRole,
    newTriggerFromInteractionsButtonMemo,
    pipelineUUID,
    query,
    router,
    showModal,
    tags,
  ]);

  const breadcrumbs = useMemo(() => {
    const arr = [];

    if (isCreatingTrigger) {
      arr.push(...[
        {
          label: () => 'Triggers',
          onClick: () => setIsCreatingTrigger(false),
        },
        {
          bold: true,
          label: () => 'New trigger',
        },
      ]);
    } else {
      arr.push({
        label: () => 'Triggers',
      });
    }

    return arr;
  }, [
    isCreatingTrigger,
    setIsCreatingTrigger,
  ]);

  if (isCreatingTrigger) {
    return (
      <TriggerEdit
        creatingWithLimitation
        errors={errors}
        onCancel={() => setIsCreatingTrigger(false)}
        pipeline={dataPipeline?.pipeline}
        setErrors={setErrors}
        useCreateScheduleMutation={useCreateScheduleMutation}
      />
    );
  }

  return (
    <PipelineDetailPage
      breadcrumbs={breadcrumbs}
      buildSidekick={!isCreatingTrigger && buildSidekick}
      errors={errors || triggerErrors}
      pageName={PageNameEnum.TRIGGERS}
      pipeline={pipeline}
      setErrors={setErrors}
      subheader={!isCreatingTrigger && toolbarEl}
      title={({ name }) => `${name} triggers`}
      uuid={`${PageNameEnum.TRIGGERS}_${pipelineUUID}`}
    >
      {!isCreatingTrigger && (
        <>
          <Divider light />

          {!dataPipelineSchedules
            ?
              <Spacing m={2}>
                <Spinner inverted large />
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
        </>
      )}
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
