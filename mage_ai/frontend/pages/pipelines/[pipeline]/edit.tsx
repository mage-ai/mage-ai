import moment from 'moment';
import useWebSocket from 'react-use-websocket';
import { ThemeContext } from 'styled-components';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import ApiReloader from '@components/ApiReloader';
import AuthToken from '@api/utils/AuthToken';
import BlockType, {
  BlockColorEnum,
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  SIDEKICK_BLOCK_TYPES,
  SampleDataType,
} from '@interfaces/BlockType';
import BlocksInPipeline from '@components/PipelineDetail/BlocksInPipeline';
import BrowseTemplates from '@components/CustomTemplates/BrowseTemplates';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import ConfigureBlock from '@components/PipelineDetail/ConfigureBlock';
import DataIntegrationModal from '@components/DataIntegrationModal';
import DataProviderType from '@interfaces/DataProviderType';
import ErrorsType from '@interfaces/ErrorsType';
import FileBrowser from '@components/FileBrowser';
import FileEditor from '@components/FileEditor';
import FileHeaderMenu from '@components/PipelineDetail/FileHeaderMenu';
import FileTabs from '@components/PipelineDetail/FileTabs';
import FileType, {
  FILE_EXTENSION_TO_LANGUAGE_MAPPING_REVERSE,
  SpecialFileEnum,
} from '@interfaces/FileType';
import FlexContainer from '@oracle/components/FlexContainer';
import GlobalDataProductType from '@interfaces/GlobalDataProductType';
import GlobalDataProducts from '@components/GlobalDataProducts';
import Head from '@oracle/elements/Head';
import KernelStatus from '@components/PipelineDetail/KernelStatus';
import KernelOutputType, {
  DataTypeEnum,
  ExecutionStateEnum,
} from '@interfaces/KernelOutputType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import InteractionType from '@interfaces/InteractionType';
import Panel from '@oracle/components/Panel';
import PipelineDetail from '@components/PipelineDetail';
import PipelineInteractionType, {
  BlockInteractionRoleWithUUIDType,
  BlockInteractionTriggerType,
  BlockInteractionTriggerWithUUIDType,
  BlockInteractionType,
  InteractionPermission,
  InteractionPermissionWithUUID,
} from '@interfaces/PipelineInteractionType';
import PipelineLayout from '@components/PipelineLayout';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import PipelineType, {
  PIPELINE_TYPE_TO_KERNEL_NAME,
  PipelineExtensionsType,
  PipelineTypeEnum,
} from '@interfaces/PipelineType';
import PopupMenu from '@oracle/components/PopupMenu';
import Preferences from '@components/settings/workspace/Preferences';
import PrivateRoute from '@components/shared/PrivateRoute';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import Sidekick from '@components/Sidekick';
import SidekickHeader from '@components/Sidekick/Header';
import Spacing from '@oracle/elements/Spacing';
import StatusFooter from '@components/PipelineDetail/StatusFooter';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import usePrevious from '@utils/usePrevious';
import useProject from '@utils/models/project/useProject';
import { ANIMATION_DURATION_CONTENT } from '@oracle/components/Accordion/AccordionPanel';
import {
  BLOCK_EXISTS_ERROR,
  CUSTOM_EVENT_BLOCK_OUTPUT_CHANGED,
  CUSTOM_EVENT_CODE_BLOCK_CHANGED,
  EDIT_BEFORE_TABS,
  EDIT_BEFORE_TAB_ALL_FILES,
  EDIT_BEFORE_TAB_FILES_IN_PIPELINE,
  PAGE_NAME_EDIT,
} from '@components/PipelineDetail/constants';
import { Close } from '@oracle/icons';
import { ErrorProvider } from '@context/Error';
import { INTERNAL_OUTPUT_REGEX } from '@utils/models/output';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EDIT_BEFORE_TAB_SELECTED,
  LOCAL_STORAGE_KEY_PIPELINE_EDIT_BLOCK_OUTPUT_LOGS,
  LOCAL_STORAGE_KEY_PIPELINE_EDIT_HIDDEN_BLOCKS,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_SIDE_BY_SIDE_ENABLED,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_SIDE_BY_SIDE_SCROLL_TOGETHER,
} from '@storage/constants';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN,
  get,
  set,
} from '@storage/localStorage';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { NAV_TAB_BLOCKS } from '@components/CustomTemplates/BrowseTemplates/constants';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { ObjectType } from '@interfaces/BlockActionObjectType';
import { OpenDataIntegrationModalOptionsType } from '@components/DataIntegrationModal/constants';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PipelineHeaderStyle } from '@components/PipelineDetail/index.style';
import { RoleFromServerEnum } from '@interfaces/UserType';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  VIEW_QUERY_PARAM,
  ViewKeyEnum,
} from '@components/Sidekick/constants';
import { buildBlockRefKey } from '@components/PipelineDetail/utils';
import { buildNavigationItems } from '@components/PipelineDetailPage/utils';
import {
  buildNavigationItems as buildNavigationItemsSidekick,
} from '@components/Sidekick/Navigation/constants';
import {
  convertBlockUUIDstoBlockTypes,
  displayPipelineLastSaved,
  getDataOutputBlockUUIDs,
  initializeContentAndMessages,
  removeDataOutputBlockUUID,
  updateCollapsedBlockStates,
} from '@components/PipelineDetail/utils';
import { cleanName, randomNameGenerator } from '@utils/string';
import { displayErrorFromReadResponse, onSuccess } from '@api/utils/response';
import { equals, find, indexBy, removeAtIndex } from '@utils/array';
import { getBlockFromFilePath, getRelativePathFromBlock } from '@components/FileBrowser/utils';
import { getWebSocket } from '@api/utils/url';
import { goToWithQuery } from '@utils/routing';
import { ignoreKeys, isEmptyObject } from '@utils/hash';
import { isJsonString } from '@utils/string';
import { queryFromUrl } from '@utils/url';
import { resetColumnScroller } from '@components/PipelineDetail/ColumnScroller/utils';
import { storeLocalTimezoneSetting } from '@components/settings/workspace/utils';
import { useModal } from '@context/Modal';
import { useWindowSize } from '@utils/sizes';
import { utcNowDate } from '@utils/date';

type PipelineDetailPageProps = {
  newPipelineSchedule: boolean;
  page: string;
  pipeline: PipelineType;
  pipelineSchedule?: PipelineScheduleType;
  pipelineScheduleAction?: string;
};

function PipelineDetailPage({
  page,
  pipeline: pipelineProp,
}: PipelineDetailPageProps) {
  const mainContainerFooterRef = useRef(null);
  const timeoutRef = useRef(null);
  const {
    featureEnabled,
    featureUUIDs,
    fetchProjects,
    project,
    sparkEnabled,
  } = useProject();
  const themeContext = useContext(ThemeContext);
  const router = useRouter();
  const {
    height: heightWindow,
  } = useWindowSize();
  const { pipeline: pipelineUUIDFromUrl }: any = router.query;
  const pipelineUUID = pipelineProp.uuid || pipelineUUIDFromUrl;

  const [afterHidden, setAfterHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN));
  const [beforeHidden, setBeforeHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN));

  const [initializedMessages, setInitializedMessages] = useState<boolean>(false);
  const [afterWidthForChildren, setAfterWidthForChildren] = useState<number>(null);
  const [errors, setErrors] = useState<ErrorsType>(null);
  const [pipelineErrors, setPipelineErrors] = useState<ErrorsType>(null);
  const [recentlyAddedChart, setRecentlyAddedChart] = useState(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);
  const [filesTouched, setFilesTouched] = useState<{
    [filePath: string]: boolean;
  }>({});
  const [textareaFocused, setTextareaFocused] = useState<boolean>(false);
  const [anyInputFocused, setAnyInputFocused] = useState<boolean>(false);
  const [disableShortcuts, setDisableShortcuts] = useState<boolean>(false);
  const [allowCodeBlockShortcuts, setAllowCodeBlockShortcuts] = useState<boolean>(false);
  const [includeSparkOutputs, setIncludeSparkOutputs] = useState<boolean>(true);

  const _ = useMemo(
    () => storeLocalTimezoneSetting(project?.features?.[FeatureUUIDEnum.LOCAL_TIMEZONE]),
    [project?.features],
  );

  const isInteractionsEnabled =
    useMemo(() => !!project?.features?.[FeatureUUIDEnum.INTERACTIONS], [
      project?.features,
    ]);

  const localStorageTabSelectedKey =
    `${LOCAL_STORAGE_KEY_PIPELINE_EDIT_BEFORE_TAB_SELECTED}_${pipelineUUID}`;
  const selectedTabUUIDInit = get(localStorageTabSelectedKey);
  const [selectedTab, setSelectedTabState] = useState(
    find(EDIT_BEFORE_TABS, ({ uuid }) => uuid === selectedTabUUIDInit)
      || EDIT_BEFORE_TABS[0],
  );
  const setSelectedTab = useCallback((tab: TabType) => {
    setSelectedTabState(tab);
    set(localStorageTabSelectedKey, tab?.uuid);
  }, [
    localStorageTabSelectedKey,
    setSelectedTabState,
  ]);

  const localStorageHiddenBlocksKey =
    `${LOCAL_STORAGE_KEY_PIPELINE_EDIT_HIDDEN_BLOCKS}_${pipelineUUID}`;
  const [hiddenBlocks, setHiddenBlocksState] = useState<{
    [uuid: string]: boolean;
  }>({});

  const mainContainerRef = useRef(null);

  // Server status
  const { data: serverStatus } = api.statuses.list({}, {
    revalidateOnFocus: false,
  });
  const disablePipelineEditAccess = useMemo(
    () => serverStatus?.statuses?.[0]?.disable_pipeline_edit_access,
    [serverStatus],
  );
  const maxPrintOutputLines = useMemo(
    () => serverStatus?.statuses?.[0]?.max_print_output_lines,
    [serverStatus],
  );

  // Kernels
  const [messages, setMessages] = useState<{
    [uuid: string]: KernelOutputType[];
  }>({});
  const [pipelineMessages, setPipelineMessages] = useState<KernelOutputType[]>([]);

  // Pipeline
  let pipeline;
  const pipelineUUIDPrev = usePrevious(pipelineUUID);
  const {
    data,
    mutate: fetchPipeline,
  } = api.pipelines.detail(
    pipelineUUID,
    {
      include_block_pipelines: true,
      include_remote_variables_dir: true,
      include_variables_dir: true,
      includes_outputs: isEmptyObject(messages)
        || typeof pipeline === 'undefined'
        || pipeline === null
        || typeof pipeline?.blocks === 'undefined'
        || pipeline?.blocks === null
        || !!pipeline?.blocks?.find(({ ouputs }) => typeof ouputs === 'undefined'),
      ...(includeSparkOutputs
        ? {
          includes_outputs_spark: true,
        }
        : {}
      ),
    },
    {
      refreshInterval: 60000,
    },
    {
      key: `/pipelines/${pipelineUUID}/edit`,
    },
  );

  const {
    data: dataPipelineInteraction,
    mutate: fetchPipelineInteraction,
  } = api.pipeline_interactions.detail(isInteractionsEnabled && pipelineUUID);

  const {
    data: dataInteractions,
    mutate: fetchInteractions,
  } = api.interactions.pipeline_interactions.list(isInteractionsEnabled && pipelineUUID);

  const pipelineInteraction: PipelineInteractionType =
    useMemo(() => dataPipelineInteraction?.pipeline_interaction || {}, [
      dataPipelineInteraction,
    ]);
  const interactions: InteractionType[] =
    useMemo(() => dataInteractions?.interactions || {}, [
      dataInteractions,
    ]);

  const [
    updatePipelineInteraction,
    {
      isLoading: isLoadingUpdatePipelineInteraction,
    },
  ] = useMutation(
    api.pipeline_interactions.useUpdate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (resp) => {
            fetchPipelineInteraction();
          },
        },
      ),
    },
  );

  const [
    createInteraction,
    {
      isLoading: isLoadingCreateInteraction,
    },
  ] = useMutation(
    api.interactions.pipeline_interactions.useCreate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (resp) => {
            fetchInteractions();
            fetchPipelineInteraction();
          },
        },
      ),
    },
  );

  const { data: filesData, mutate: fetchFileTree } = api.files.list();
  const files = useMemo(() => filesData?.files || [], [filesData]);
  pipeline = useMemo(() => data?.pipeline, [data]);

  const isDataIntegration = useMemo(() => PipelineTypeEnum.INTEGRATION === pipeline?.type, [pipeline]);

  useEffect(() => {
    if (pipeline && includeSparkOutputs && sparkEnabled) {
      setIncludeSparkOutputs(false);
    }
  }, [
    includeSparkOutputs,
    pipeline,
    setIncludeSparkOutputs,
    sparkEnabled,
  ]);

  const [sideBySideEnabledState, setSideBySideEnabledState] = useState<boolean>(
    get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_SIDE_BY_SIDE_ENABLED, false),
  );
  const sideBySideEnabled = useMemo(() => {
    return !isDataIntegration
      && featureEnabled?.(featureUUIDs?.NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW)
      && sideBySideEnabledState;
  }, [
    featureEnabled,
    featureUUIDs,
    isDataIntegration,
    sideBySideEnabledState,
  ]);
  const [scrollTogetherState, setScrollTogetherState] = useState<boolean>(
    get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_SIDE_BY_SIDE_SCROLL_TOGETHER, false),
  );
  const scrollTogether = useMemo(() => featureEnabled?.(featureUUIDs?.NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW)
      && scrollTogetherState, [
    featureEnabled,
    featureUUIDs,
    scrollTogetherState,
  ]);
  const setScrollTogether = useCallback((prev) => {
    setScrollTogetherState(prev);
    set(
      LOCAL_STORAGE_KEY_PIPELINE_EDITOR_SIDE_BY_SIDE_SCROLL_TOGETHER,
      typeof prev === 'function' ? prev() : prev,
    );
  }, [
    setScrollTogetherState,
  ]);
  const setSideBySideEnabled = useCallback((prev) => {
    const value = typeof prev === 'function' ? prev() : prev;

    setSideBySideEnabledState(prev);
    set(
      LOCAL_STORAGE_KEY_PIPELINE_EDITOR_SIDE_BY_SIDE_ENABLED,
      value,
    );

    if (!value) {
      setScrollTogether(prev);
    }
  }, [
    setScrollTogether,
    setSideBySideEnabledState,
  ]);

  const dispatchEventChanged = useCallback(() => {
    const evt = new CustomEvent(CUSTOM_EVENT_CODE_BLOCK_CHANGED, {
      detail: {},
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(evt);
    }
  }, []);

  const dispatchEventChangedOutput = useCallback(() => {
    const evt = new CustomEvent(CUSTOM_EVENT_BLOCK_OUTPUT_CHANGED, {
      detail: {},
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(evt);
    }
  }, []);

  const setHiddenBlocks = useCallback((callback) => {
    setHiddenBlocksState((prev) => {
      const data = callback(prev);
      set(localStorageHiddenBlocksKey, JSON.stringify(data));

      return data;
    });

    if (sideBySideEnabled) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        dispatchEventChangedOutput();
        dispatchEventChanged();
      }, ANIMATION_DURATION_CONTENT + 1);
    }
  }, [
    localStorageHiddenBlocksKey,
    setHiddenBlocksState,
    sideBySideEnabled,
  ]);

  useEffect(() => {
    const hiddenBlocksInitString = get(localStorageHiddenBlocksKey);
    if (hiddenBlocksInitString && isJsonString(hiddenBlocksInitString)) {
      setHiddenBlocksState(JSON.parse(hiddenBlocksInitString));
    }
  }, [
    localStorageHiddenBlocksKey,
    setHiddenBlocksState,
  ]);

  const {
    data: dataKernels,
    mutate: fetchKernels,
  } = api.kernels.list({}, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });
  const kernel = useMemo(() => {
    const kernels = dataKernels?.kernels;

    return kernels?.find(({ name }) =>
      name === PIPELINE_TYPE_TO_KERNEL_NAME[pipeline?.type],
    ) || kernels?.[0];
  }, [
    dataKernels,
    pipeline,
  ]);

  const [pipelineLastSaved, setPipelineLastSaved] = useState<number>(null);
  const [pipelineLastSavedState, setPipelineLastSavedState] = useState<number>(Number(utcNowDate({ dateObj: true })));
  const [pipelineContentTouched, setPipelineContentTouched] = useState<boolean>(false);

  const [showStalePipelineMessageModal, hideStalePipelineMessageModal] = useModal(() => (
    <PopupMenu
      centerOnScreen
      neutral
      onClick={hideStalePipelineMessageModal}
      subtitle="Please refresh your page to have the most up-to-date data before making any changes."
      title="Your pipeline may be stale."
      width={UNIT * 34}
    />
  ), {}, [], {
    background: true,
    uuid: 'stale_pipeline_message',
  });

  useEffect(() => {
    if (data?.pipeline?.updated_at
      && pipelineLastSaved !== moment().utc().unix()
    ) {
      // This assumes datetime is saved without a timezone offset e.g.'2023-11-16 10:37:35'
      setPipelineLastSaved(moment(data.pipeline.updated_at).unix());
    }
    if (pipelineLastSaved && pipelineLastSaved > pipelineLastSavedState) {
      showStalePipelineMessageModal();
    }
  }, [
    data?.pipeline?.updated_at,
    pipelineLastSaved,
    pipelineLastSavedState,
    showStalePipelineMessageModal,
  ]);

  const qUrl = queryFromUrl();
  const {
    [VIEW_QUERY_PARAM]: activeSidekickView,
    block_uuid: blockUUIDFromUrl,
    file_path: filePathFromUrl,
  } = qUrl;
  const filePathsFromUrl = useMemo(() => {
    let arr = qUrl['file_paths[]'] || [];
    if (!Array.isArray(arr)) {
      arr = [arr];
    }
    return arr;
  }, [qUrl]);
  const setActiveSidekickView = useCallback((
    newView: ViewKeyEnum,
    pushHistory: boolean = true,
    opts?: {
      addon?: string;
      blockUUID: string;
      extension?: string;
    },
  ) => {
    const newQuery: {
      [VIEW_QUERY_PARAM]: ViewKeyEnum;
      addon?: string;
      block_uuid?: string;
      extension?: string;
    } = {
      [VIEW_QUERY_PARAM]: newView,
    };

    if (opts?.addon) {
      newQuery.addon = opts?.addon;
    }

    if (opts?.blockUUID) {
      newQuery.block_uuid = opts?.blockUUID;
    }

    if (opts?.extension) {
      newQuery.extension = opts?.extension;
    }

    goToWithQuery(newQuery, {
      preserveParams: [
        'addon',
        'block_uuid',
        'file_path',
        'file_paths[]',
      ],
      pushHistory,
      replaceParams: true,
    });
  }, []);

  useEffect(() => {
    if (!activeSidekickView) {
      setActiveSidekickView(ViewKeyEnum.TREE, false);
    }
  }, [activeSidekickView, setActiveSidekickView]);

  const openSidekickView = useCallback((
    newView: ViewKeyEnum,
    pushHistory?: boolean,
    opts?: {
      addon?: string;
      blockUUID: string;
      // http://localhost:3000/pipelines/delicate_field/edit?addon=conditionals&sideview=power_ups&extension=great_expectations
      extension?: string;
    },
  ) => {
    setAfterHidden(false);
    setTimeout(() => setActiveSidekickView(newView, pushHistory, opts), 1);
  }, [setActiveSidekickView]);

  const blockRefs = useRef({});
  const chartRefs = useRef({});
  const treeRef = useRef(null);
  const callbackByBlockUUID = useRef({});
  const contentByBlockUUID = useRef({});
  const contentByWidgetUUID = useRef({});

  const [blocksThatNeedToRefresh, setBlocksThatNeedToRefresh] = useState<{
    [uuid: string]: number;
  }>({});

  const setCallbackByBlockUUID = useCallback((type: string, uuid: string, value: string) => {
    const d = callbackByBlockUUID.current || {};
    callbackByBlockUUID.current = {
      ...d,
      [type]: {
        ...(d[type] || {}),
        [uuid]: value,
      },
    };
  }, [callbackByBlockUUID]);
  const setContentByBlockUUID = useCallback((type: string, uuid: string, value: string) => {
    const d = contentByBlockUUID.current || {};
    contentByBlockUUID.current = {
      ...d,
      [type]: {
        ...(d[type] || {}),
        [uuid]: value,
      },
    };
  }, [contentByBlockUUID]);
  const onChangeCallbackBlock = useCallback((type: string, uuid: string, value: string) => {
    setCallbackByBlockUUID(type, uuid, value);
    setPipelineContentTouched(true);
  },
    [
      setCallbackByBlockUUID,
      setPipelineContentTouched,
    ],
  );
  const onChangeCodeBlock = useCallback((type: string, uuid: string, value: string) => {
    setContentByBlockUUID(type, uuid, value);
    setPipelineContentTouched(true);
  },
    [
      setContentByBlockUUID,
      setPipelineContentTouched,
    ],
  );
  const setContentByWidgetUUID = useCallback((data: {
    [uuid: string]: string;
  }) => {
    contentByWidgetUUID.current = {
      ...contentByWidgetUUID.current,
      ...data,
    };
  }, [contentByWidgetUUID]);
  const onChangeChartBlock = useCallback((uuid: string, value: string) => {
    setContentByWidgetUUID({ [uuid]: value });
    setPipelineContentTouched(true);
  },
    [
      setContentByWidgetUUID,
      setPipelineContentTouched,
    ],
  );

  const [mainContainerWidth, setMainContainerWidth] = useState<number>(null);

  // Data providers
  const { data: dataDataProviders } = api.data_providers.list({}, {
    revalidateOnFocus: false,
  });
  const dataProviders: DataProviderType[] = dataDataProviders?.data_providers;

  // Variables
  const {
    data: dataGlobalVariables,
    mutate: fetchVariables,
  } = api.variables.pipelines.list(pipelineUUID, {
    global_only: true,
  }, {
    revalidateOnFocus: false,
  });
  const globalVariables = dataGlobalVariables?.variables;

  // Secrets
  const {
    data: dataSecrets,
    mutate: fetchSecrets,
  } = api.secrets.list({}, { revalidateOnFocus: false });
  const secrets = dataSecrets?.secrets;

  // Blocks
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [widgets, setWidgets] = useState<BlockType[]>([]);
  const widgetTempData = useRef({});
  const updateWidget = useCallback((block: BlockType) => {
    setPipelineContentTouched(true);
    const blockPrev = widgetTempData.current[block.uuid] || {};

    let upstreamBlocks = blockPrev.upstream_blocks;
    if (block?.upstream_blocks?.length >= 1) {
      upstreamBlocks = block.upstream_blocks;
    }

    widgetTempData.current[block.uuid] = {
      ...blockPrev,
      ...block,
      configuration: {
        ...blockPrev.configuration,
        ...block.configuration,
      },
      upstream_blocks: upstreamBlocks,
    };
  }, [
    setPipelineContentTouched,
    widgetTempData,
  ]);

  const [isPipelineExecuting, setIsPipelineExecuting] = useState<boolean>(false);
  const [editingBlock, setEditingBlock] = useState<{
    upstreamBlocks: {
      block: BlockType;
      values: BlockType[];
    };
  }>({
    upstreamBlocks: null,
  });
  const [runningBlocks, setRunningBlocks] = useState<BlockType[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<BlockType>(null);

  const outputBlockUUIDsInit = getDataOutputBlockUUIDs(pipelineUUID);
  const outputBlocksInit = convertBlockUUIDstoBlockTypes(outputBlockUUIDsInit, blocks);
  const [outputBlocks, setOutputBlocks] = useState<BlockType[]>(outputBlocksInit);
  const [integrationStreams, setIntegrationStreams] = useState<string[]>();
  const [selectedStream, setSelectedStream] = useState<string>();
  const [selectedOutputBlock, setSelectedOutputBlock] = useState<BlockType>(null);
  const outputBlocksPrev = usePrevious(outputBlocks);

  const resetState = useCallback(() => {
    setEditingBlock({
      upstreamBlocks: {
        block: null,
        values: [],
      },
    });
    setMessages({});
    setPipelineContentTouched(false);
    setRunningBlocks([]);
    setSelectedBlock(null);
  }, []);
  useEffect(() => {
    if (pipelineUUID !== pipelineUUIDPrev) {
      callbackByBlockUUID.current = {};
      contentByBlockUUID.current = {};
    }
  }, [pipelineUUID, pipelineUUIDPrev]);

  const {
    data: blockOutputData,
    mutate: fetchSampleData,
  } = api.block_outputs.detail(
    (!afterHidden && selectedOutputBlock?.type !== BlockTypeEnum.SCRATCHPAD
      && selectedOutputBlock?.type !== BlockTypeEnum.CHART
      && selectedOutputBlock?.uuid)
      ? encodeURIComponent(selectedOutputBlock?.uuid)
      : null,
    { pipeline_uuid: pipelineUUID },
  );
  const blockSampleData = useMemo(() => blockOutputData?.block_output, [blockOutputData]);
  const sampleData: SampleDataType = useMemo(() => {
    if (isDataIntegration) {
      return find(
        blockSampleData?.outputs,
        ({ variable_uuid }) => variable_uuid === `output_sample_data_${cleanName(selectedStream)}`,
      )?.sample_data;
    } else {
      return blockSampleData?.outputs?.[0]?.sample_data;
    }
  }, [blockSampleData, isDataIntegration, selectedStream]);
  const {
    data: blockAnalysis,
    mutate: fetchAnalysis,
  } = api.blocks.pipelines.analyses.detail(
    !afterHidden ? pipelineUUID : null,
    selectedOutputBlock?.type !== BlockTypeEnum.SCRATCHPAD
      && selectedOutputBlock?.type !== BlockTypeEnum.CHART
      && selectedOutputBlock?.uuid
      && encodeURIComponent(selectedOutputBlock?.uuid),
  );
  const {
    insights = {},
    metadata = {},
    statistics = {},
  } = blockAnalysis?.analyses?.[0] || {};

  useEffect(() => {
    if (runningBlocks.length === 0) {
      fetchAnalysis();
      fetchSampleData();
      fetchVariables();
    }
  }, [
    fetchAnalysis,
    fetchSampleData,
    fetchVariables,
    runningBlocks,
  ]);

  useEffect(() => {
    if (outputBlocks.length === 0) {
      setSelectedOutputBlock(null);
    } else if (outputBlocksPrev?.length !== outputBlocks?.length
      && outputBlocks?.length < outputBlocksPrev?.length) {
      const selectedBlockIdx = outputBlocksPrev.findIndex(({ uuid }) => uuid === selectedOutputBlock?.uuid);
      const newSelectedBlockIdx = outputBlocksPrev.length - 1 === selectedBlockIdx
        ? selectedBlockIdx - 1
        : selectedBlockIdx + 1;
      setSelectedOutputBlock(outputBlocksPrev[Math.max(0, newSelectedBlockIdx)]);
    }
  }, [outputBlocks, outputBlocksPrev, selectedOutputBlock?.uuid]);

  useEffect(() => {
    if (editingBlock.upstreamBlocks?.block) {
      setAfterHidden(false);
      setActiveSidekickView(ViewKeyEnum.TREE);
    }
  }, [editingBlock.upstreamBlocks, setActiveSidekickView]);

  // Autocomplete items
  const {
    data: dataAutocompleteItems,
    mutate: fetchAutocompleteItems,
  } = api.autocomplete_items.list({}, {
    refreshInterval: false,
    revalidateOnFocus: false,
  });
  const autocompleteItems = dataAutocompleteItems?.autocomplete_items;

  useEffect(() => {
    if (!filePathFromUrl) {
      setDisableShortcuts(false);
    }
    setSelectedFilePath(filePathFromUrl);
  }, [
    filePathFromUrl,
    // This dependency is required or else the effect will not trigger on updated query parameters.
    qUrl,
  ]);
  useEffect(() => {
    if (!equals(filePathsFromUrl, selectedFilePaths)) {
      setSelectedFilePaths(filePathsFromUrl);
    }
  }, [
    filePathsFromUrl,
    selectedFilePaths,
    // This dependency is required or else the effect will not trigger on updated query parameters.
    qUrl,
  ]);

  const [createPipeline] = useMutation(
    api.pipelines.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline: {
              uuid,
            },
          }) => {
            router.push('/pipelines/[pipeline]/edit', `/pipelines/${uuid}/edit`);
            fetchFileTree();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [updatePipeline, { isLoading: isPipelineUpdating }] = useMutation(
    api.pipelines.useUpdate(pipelineUUID, { update_content: true }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setPipelineContentTouched(false);
            fetchPipeline().then(({
              pipeline: pipelineServer,
            }) => {
              if (sideBySideEnabled) {
                const blockUUIDsPrevious = pipeline?.blocks?.map(({ uuid }) => uuid);
                const blockUUIDsServer = pipelineServer?.blocks?.map(({ uuid }) => uuid);

                if (!equals(blockUUIDsPrevious || [], blockUUIDsServer || [])) {
                  setTimeout(() => {
                    resetColumnScroller();
                  }, 1);
                }
              }
            });

            fetchFileTree();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [ouputsToSaveByBlockUUID, setOuputsToSaveByBlockUUID] = useState<{
    [blockUUID: string]: any;
  }>({});

  const savePipelineContent = useCallback((payload?: {
    block?: BlockType;
    pipeline?: PipelineType | {
      blocks?: BlockType[];
      extensions?: PipelineExtensionsType;
      name?: string;
      type?: string;
    };
  }, opts?: {
    contentOnly?: boolean;
  }) => {
    const {
      block: blockOverride,
      // @ts-ignore
      pipeline: pipelineOverride = {
        extensions: {},
      },
    } = payload || {};
    const { contentOnly } = opts || {};

    if (pipelineLastSaved && pipelineLastSaved > pipelineLastSavedState) {
      showStalePipelineMessageModal();
      return;
    }
    const utcNowDateObj = utcNowDate({ dateObj: true });
    const utcNowDateString = utcNowDate();
    setPipelineLastSavedState(Number(utcNowDateObj));

    const blocksByExtensions = {};
    const blocksByUUID = {};
    const callbacksByUUID = {};
    const conditionalsByUUID = {};

    const blocksFinal = pipelineOverride?.blocks || blocks;

    blocksFinal.forEach((block: BlockType) => {
      const {
        extension_uuid: extensionUUID,
        type,
        uuid,
      } = block;

      let contentToSave = contentByBlockUUID.current[type]?.[uuid];
      if (typeof contentToSave === 'undefined') {
        contentToSave = block.content;
      }

      let callbackToSave = callbackByBlockUUID.current[type]?.[uuid];
      if (typeof callbackToSave === 'undefined') {
        callbackToSave = block.callback_content;
      }

      let outputs = null;
      const messagesForBlock = messages[uuid]?.filter(m => !!m);
      const hasError = messagesForBlock?.find(({ error }) => error);

      if (messagesForBlock && (!sparkEnabled || !runningBlocks?.length)) {
        const arr2 = [];
        let plainTextLineCount = 0;

        messagesForBlock.forEach((d: KernelOutputType) => {
          const {
            data,
            type,
          } = d;

          if (BlockTypeEnum.SCRATCHPAD === block.type
            || hasError
            || ('table' !== type && ouputsToSaveByBlockUUID?.[block?.uuid])
          ) {
            if (Array.isArray(data)) {
              d.data = data.reduce((acc, text: string) => {
                if (text.match(INTERNAL_OUTPUT_REGEX)) {
                  return acc;
                }

                return acc.concat(text);
              }, []);

              if (type === DataTypeEnum.TEXT_PLAIN) {
                plainTextLineCount += data?.length || 0;
              }
            }

            /*
             * The saved print output is limited to maxPrintOutputLines (taken from
             * MAX_PRINT_OUTPUT_LINES env var on backend) in order to
             * minimize the Pipeline PUT request payload when saving the pipeline.
             *
             * An additional 5 is added to the maxPrintOutputLines condition below to account
             * for a few extra lines that indicate passed tests, truncated output message, or
             * misc empty string. Otherwise, the print output may not be saved as intended.
             */
            if (!maxPrintOutputLines || plainTextLineCount < maxPrintOutputLines + 5) {
              arr2.push(d);
            }
          }
        });

        // @ts-ignore
        outputs = arr2.map((d: KernelOutputType, idx: number) => ({
          text_data: JSON.stringify(d),
          variable_uuid: `output_${idx}`,
        }));
      }

      const blockPayload: BlockType = {
        ...block,
        callback_content: callbackToSave,
        content: contentToSave,
      };

      if (outputs === null) {
        delete blockPayload.outputs;
      } else {
        blockPayload.outputs = outputs;
      }

      if (blockOverride?.uuid === uuid) {
        Object.entries(blockOverride).forEach(([k, v]) => {
          if (typeof v === 'object' && !Array.isArray(v) && !!v) {
            Object.entries(v).forEach(([k2, v2]) => {
              if (!blockPayload[k]) {
                blockPayload[k] = {};
              }
              blockPayload[k][k2] = v2;
            });
          } else {
            blockPayload[k] = v;
          }
        });
      }

      if (contentOnly) {
        blocksByUUID[blockPayload.uuid] = {
          callback_content: blockPayload.callback_content,
          content: blockPayload.content,
          outputs: blockPayload.outputs,
          uuid: blockPayload.uuid,
        };

        return;
      }

      if ([BlockTypeEnum.EXTENSION].includes(type)) {
        if (!blocksByExtensions[extensionUUID]) {
          blocksByExtensions[extensionUUID] = [];
        }
        blocksByExtensions[extensionUUID].push(blockPayload);
      } else if (BlockTypeEnum.CALLBACK === type) {
        callbacksByUUID[blockPayload.uuid] = blockPayload;
      } else if (BlockTypeEnum.CONDITIONAL === type) {
        conditionalsByUUID[blockPayload.uuid] = blockPayload;
      } else {
        blocksByUUID[blockPayload.uuid] = blockPayload;
      }
    });

    const extensionsToSave: PipelineExtensionsType = {
      ...pipeline?.extensions,
      ...pipelineOverride?.extensions,
    };
    Object.entries(blocksByExtensions).forEach(([extensionUUID, arr]) => {
      if (!extensionsToSave[extensionUUID]) {
        extensionsToSave[extensionUUID] = {};
      }
      // @ts-ignore
      extensionsToSave[extensionUUID]['blocks'] = arr;
    });

    const blocksToSave = [];
    const callbacksToSave = [];
    const conditionalsToSave = [];

    // @ts-ignore
    (pipelineOverride?.blocks || blocks).forEach(({ uuid }) => {
      const blockToSave = blocksByUUID[uuid];
      const callbackBlock = callbacksByUUID[uuid];
      const conditionalBlock = conditionalsByUUID[uuid];

      if (typeof blockToSave !== 'undefined') {
        blocksToSave.push(blockToSave);
      } else if (typeof callbackBlock !== 'undefined') {
        callbacksToSave.push(callbackBlock);
      } else if (typeof conditionalBlock !== 'undefined') {
        conditionalsToSave.push(conditionalBlock);
      }
    });

    setOuputsToSaveByBlockUUID({});

    // @ts-ignore
    return updatePipeline({
      pipeline: {
        ...pipeline,
        ...pipelineOverride,
        blocks: blocksToSave,
        callbacks: callbacksToSave,
        conditionals: conditionalsToSave,
        extensions: extensionsToSave,
        updated_at: utcNowDateString,
        widgets: widgets.map((block: BlockType) => {
          let contentToSave = contentByWidgetUUID.current[block.uuid];
          const tempData = widgetTempData.current[block.uuid] || {};

          if (typeof contentToSave === 'undefined') {
            contentToSave = block.content;
          }

          let outputs;
          const messagesForBlock = messages[block.uuid]?.filter(m => !!m);
          const hasError = messagesForBlock?.find(({ error }) => error);

          if (messagesForBlock) {
            const arr2 = [];

            messagesForBlock.forEach((d: KernelOutputType) => {
              const {
                data,
                type,
              } = d;

              if (BlockTypeEnum.SCRATCHPAD === block.type || hasError || 'table' !== type) {
                if (Array.isArray(data)) {
                  d.data = data.reduce((acc, text: string) => {
                    if (text.match(INTERNAL_OUTPUT_REGEX)) {
                      return acc;
                    }

                    return acc.concat(text);
                  }, []);
                }

                arr2.push(d);
              }
            });

            // @ts-ignore
            outputs = arr2.map((d: KernelOutputType, idx: number) => ({
              text_data: JSON.stringify(d),
              variable_uuid: `${block.uuid}_${idx}`,
            }));
          }

          return {
            ...block,
            ...tempData,
            configuration: {
              ...block.configuration,
              ...tempData.configuration,
            },
            content: contentToSave,
            outputs,
          };
        }),
      },
    });
  }, [
    blocks,
    maxPrintOutputLines,
    messages,
    ouputsToSaveByBlockUUID,
    pipeline,
    pipelineLastSaved,
    pipelineLastSavedState,
    runningBlocks,
    showStalePipelineMessageModal,
    sparkEnabled,
    updatePipeline,
    widgets,
  ]);

  const saveStatus: string = useMemo(() => displayPipelineLastSaved(
    pipeline,
    {
      displayRelative: true,
      isPipelineUpdating,
      pipelineContentTouched,
      pipelineLastSaved,
    },
  ), [
    isPipelineUpdating,
    pipeline,
    pipelineContentTouched,
    pipelineLastSaved,
  ]);

  // Data integration modal
  const [showDataIntegrationModal, hideDataIntegrationModal] = useModal((
    opts: OpenDataIntegrationModalOptionsType,
  ) => {
    const {
      block,
      contentByBlockUUID,
    } = opts || {
      block: null,
      contentByBlockUUID: null,
    };
    const {
      type: blockType,
      uuid: blockUUID,
    } = block || {
      type: null,
      uuid: null,
    };
    const blockWithContent = { ...block };

    if (contentByBlockUUID) {
      blockWithContent.content = contentByBlockUUID?.current?.[blockType]?.[blockUUID];
    }

    return (
      <ErrorProvider>
        {/* @ts-ignore */}
        <DataIntegrationModal
          {...opts}
          block={blockWithContent}
          onChangeCodeBlock={onChangeCodeBlock}
          onClose={hideDataIntegrationModal}
          pipeline={pipeline}
          savePipelineContent={savePipelineContent}
        />
      </ErrorProvider>
    );
  }, {}, [
    onChangeCodeBlock,
    pipeline,
    savePipelineContent,
  ], {
    background: true,
    disableClickOutside: true,
    disableCloseButton: true,
    disableEscape: true,
    uuid: `DataIntegrationModal/${pipelineUUID}`,
  });

  // Files
  const openFile = useCallback((filePath: string) => {
    savePipelineContent();

    const filePathEncoded = encodeURIComponent(filePath);
    let filePaths = queryFromUrl()['file_paths[]'] || [];
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    if (!filePaths.includes(filePathEncoded)) {
      filePaths.push(filePathEncoded);
    }

    // const block = getBlockFromFilePath(filePath, blocks);

    // if (block) {
    //   setSelectedBlock(block);
    //   if (blockRefs?.current) {
    //     const blockRef = blockRefs.current[`${block.type}s/${block.uuid}.py`];
    //     blockRef?.current?.scrollIntoView();
    //   }
    // } else {
    //   goToWithQuery({
    //     file_path: filePathEncoded,
    //     'file_paths[]': filePaths,
    //   });
    // }

    goToWithQuery({
      file_path: filePathEncoded,
      'file_paths[]': filePaths,
    });
  }, [
    // blockRefs,
    // blocks,
    savePipelineContent,
  ]);

  const onUpdateFileSuccess = useCallback((fileContent: FileType, opts?: {
    blockUUID: string;
  }) => {
    const {
      content,
      path: filePath,
    } = fileContent || {};

    let block;

    if (opts?.blockUUID) {
      block = blocks?.find(({ uuid }) => uuid === opts?.blockUUID);
    } else {
      block = getBlockFromFilePath(filePath, blocks);
    }

    if (block) {
      const {
        type: blockType,
        uuid: blockUUID,
      } = block;
      onChangeCodeBlock(blockType, blockUUID, content);

      setBlocks((prev) => {
        const blockIndex =
          prev?.findIndex(({ type, uuid }) => type === blockType && uuid === blockUUID);

        if (blockIndex >= 0) {
          prev[blockIndex].content = content;
        }

        return prev;
      });

      setBlocksThatNeedToRefresh(prev => ({
        ...prev,
        [blockType]: {
          // @ts-ignore
          ...prev?.[blockType],
          [blockUUID]: Number(new Date()),
        },
      }));

      fetchPipeline();
    }
  }, [
    blocks,
    fetchPipeline,
    onChangeCodeBlock,
  ]);

  // Check for pipeline or project config errors
  useEffect(() => {
    let dataWithPotentialError = data;
    let configFileLinks = [];
    if (!data?.hasOwnProperty('error') && dataDataProviders?.hasOwnProperty('error')) {
      dataWithPotentialError = dataDataProviders;
    } else if ((pipeline?.variables_dir?.includes('.mage_data')
      || pipeline?.remote_variables_dir === 'None') && !filePathFromUrl) {
      /*
       * If the variables_dir is not provided in the metadata.yaml project config file,
       * the default Mage data directory (.mage_data) is used, so we check for that value.
       * The remote_variables_dir property is not required to have a value, but if an
       * empty variable is accidentally used, its value may be assigned to "None", which
       * would not be the intended directory.
       */
      dataWithPotentialError = {
        error: {
          displayMessage: 'The variables_dir or remote_variables_dir might be empty or '
            + 'configured incorrectly. Please make sure those properties have values '
            + 'entered or interpolated correctly in your project’s metadata.yaml config file.',
        },
      };
      configFileLinks = [{
        label: 'Check project configuration',
        onClick: () => {
          openFile(`${SpecialFileEnum.METADATA_YAML}`);
          setPipelineErrors(null);
        },
      }];
    }
    displayErrorFromReadResponse(dataWithPotentialError, setPipelineErrors, configFileLinks);
  }, [
    data,
    dataDataProviders,
    filePathFromUrl,
    openFile,
    pipeline?.remote_variables_dir,
    pipeline?.variables_dir,
  ]);

  const {
    blocksInNotebook,
    blocksInSidekick,
  } = useMemo(() => {
    const blocksInNotebookInner = [];
    const blocksInSidekickInner = [];

    blocks.forEach((block: BlockType) => {
      if (SIDEKICK_BLOCK_TYPES.includes(block.type)) {
        blocksInSidekickInner.push(block);
      } else {
        blocksInNotebookInner.push(block);
      }
    });

    return {
      blocksInNotebook: blocksInNotebookInner,
      blocksInSidekick: blocksInSidekickInner,
    };
  }, [blocks]);

  const updatePipelineMetadata =
    useCallback((name: string, type?: PipelineTypeEnum) => savePipelineContent({
      pipeline: {
        name,
        type,
      },
    }).then((resp) => {
      if (resp?.data?.pipeline) {
        const { uuid } = resp.data.pipeline;

        if (pipelineUUID !== uuid) {
          window.location.href = `${router.basePath}/pipelines/${uuid}/edit`;
        } else {
          fetchFileTree();
          if (type !== pipeline?.type) {
            fetchPipeline();
          }
          updateCollapsedBlockStates(blocksInNotebook, pipelineUUID, uuid);
          updateCollapsedBlockStates(blocksInSidekick, pipelineUUID, uuid);
        }
      } else if (resp?.data?.error) {
        setErrors(err => ({
          ...err,
          links: [{
            label: 'Check pipeline configuration',
            onClick: () => {
              openFile(`pipelines/${pipelineUUID}/${SpecialFileEnum.METADATA_YAML}`);
              setErrors(null);
            },
          }],
        }));
      }
    }), [
    blocksInNotebook,
    blocksInSidekick,
    fetchFileTree,
    fetchPipeline,
    openFile,
    pipeline?.type,
    pipelineUUID,
    router,
    savePipelineContent,
  ]);

  const [interactionsMapping, setInteractionsMapping] = useState<{
    [interactionUUID: string]: InteractionType;
  }>(null);
  const [blockInteractionsMapping, setBlockInteractionsMapping] = useState<{
    [blockUUID: string]: BlockInteractionType[];
  }>(null);
  const [permissions, setPermissions] =
    useState<InteractionPermission[] | InteractionPermissionWithUUID[]>(null);

  const savePipelineInteraction = useCallback((opts?: {
    blockInteractionsMapping?: {
      [blockUUID: string]: BlockInteractionType[];
    },
    // @ts-ignore
  }) => updatePipelineInteraction({
    pipeline_interaction: {
      ...pipelineInteraction,
      blocks: opts?.blockInteractionsMapping
        ? opts?.blockInteractionsMapping
        : blockInteractionsMapping,
      interactions: interactionsMapping,
      permissions: permissions?.map(
        ({
          roles,
          triggers,
        }: InteractionPermission | InteractionPermissionWithUUID) => ({
          roles: roles?.map(
            (roleItem: RoleFromServerEnum | BlockInteractionRoleWithUUIDType) => typeof roleItem === 'string'
              ? roleItem
              : roleItem?.role,
          ),
          triggers: triggers?.map(({
            schedule_interval: scheduleInterval,
            schedule_type: scheduleType,
          }: BlockInteractionTriggerType | BlockInteractionTriggerWithUUIDType) => ({
            schedule_interval: scheduleInterval,
            schedule_type: scheduleType,
          })),
        }),
      ),
    },
  }), [
    blockInteractionsMapping,
    interactionsMapping,
    permissions,
    pipelineInteraction,
    updatePipelineInteraction,
  ]);

  const [deleteBlock] = useMutation(
    ({
      extension_uuid: extensionUUID,
      force,
      type: blockType,
      uuid,
    }: BlockType) => {
      const query: {
        extension_uuid?: string;
        force?: boolean;
        block_type?: string;
      } = {};

      if (blockType) {
        query.block_type = blockType;
      }
      if (extensionUUID) {
        query.extension_uuid = extensionUUID;
      }
      if (typeof force !== 'undefined') {
        query.force = force;
      }

      return api.blocks.pipelines.useDelete(
        pipelineUUID,
        encodeURIComponent(uuid),
        query,
      )();
    },
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            block: {
              type,
              uuid,
            },
          }) => {
            setBlocks((blocksPrevious) => removeAtIndex(
              blocksPrevious,
              blocksPrevious.findIndex(({
                type: type2,
                uuid: uuid2,
              }: BlockType) => type === type2 && uuid === uuid2),
            ));
            fetchPipeline();
            setSelectedBlock(null);
            if (type === BlockTypeEnum.SCRATCHPAD) {
              fetchFileTree();
            }

            if (isInteractionsEnabled) {
              const blocksMapping = { ...blockInteractionsMapping };
              delete blocksMapping[uuid];

              savePipelineInteraction({
                blockInteractionsMapping: blocksMapping,
              }).then(({
                pipeline_interaction: pi,
              }) => setBlockInteractionsMapping(pi?.blocks));
            }
          },
          onErrorCallback: (response: {
            url_parameters: {
              block_uuid: string;
            };
          }, errors) => {
            const {
              url_parameters: urlParameters,
            } = response;
            const {
              messages,
            } = errors;

            setErrors({
              errors,
              response,
            });

            if (urlParameters?.block_uuid) {
              setMessages(messagesPrev => ({
                ...messagesPrev,
                [urlParameters.block_uuid]: messages.map(msg => ({
                  data: `${msg}\n`,
                  error: `${msg}\n`,
                  type: DataTypeEnum.TEXT_PLAIN,
                })),
              }));
            }
          },
        },
      ),
    },
  );
  const [deleteWidget] = useMutation(
    ({ uuid }: BlockType) => api.widgets.pipelines.useDelete(pipelineUUID, uuid)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            widget: {
              uuid,
            },
          }) => {
            setWidgets((widgetsPrevious) => removeAtIndex(
              widgetsPrevious,
              widgetsPrevious.findIndex(({ uuid: uuid2 }: BlockType) => uuid === uuid2),
            ));
            fetchPipeline();
            fetchFileTree();
          },
          onErrorCallback: (response: {
            url_parameters: {
              block_uuid: string;
            };
          }, errors) => {
            const {
              url_parameters: urlParameters,
            } = response;
            const {
              messages,
            } = errors;

            setErrors({
              errors,
              response,
            });

            if (urlParameters?.block_uuid) {
              setMessages(messagesPrev => ({
                ...messagesPrev,
                [urlParameters.block_uuid]: messages.map(msg => ({
                  data: `${msg}\n`,
                  error: `${msg}\n`,
                  type: DataTypeEnum.TEXT_PLAIN,
                })),
              }));
            }
          },
        },
      ),
    },
  );

  const [showDeleteConfirmation, hideDeleteConfirmation] = useModal((block: BlockType) => (
    <PopupMenu
      centerOnScreen
      neutral
      onCancel={hideDeleteConfirmation}
      onClick={() => deleteBlockFile(block)}
      subtitle={
        'Deleting this block is dangerous. Your block may have downstream ' +
        'dependencies that depend on this block. You can delete this block anyway ' +
        'and remove it as a dependency from downstream blocks.'
      }
      title="Your block has dependencies"
      width={UNIT * 34}
    />
  ));

  const [deleteBlockFile] = useMutation(
    ({
      language,
      type,
      uuid,
    }: BlockType) => {
      let path = `${type}/${uuid}`;
      if (language && FILE_EXTENSION_TO_LANGUAGE_MAPPING_REVERSE[language]) {
        path = `${path}.${FILE_EXTENSION_TO_LANGUAGE_MAPPING_REVERSE[language].toLowerCase()}`;
      }

      return api.blocks.useDelete(encodeURIComponent(path))();
    },
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchAutocompleteItems();
            fetchPipeline();
            fetchFileTree();
          },
          onErrorCallback: (response, errors) => {
            showDeleteConfirmation();
            setErrors({
              displayMessage: response.exception,
              errors,
              response,
            });
          },
        },
      ),
    },
  );

  const [updateKernel]: any = useMutation(
    api.kernels.useUpdate(kernel?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => fetchKernels(),
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const restartKernel = useCallback(() => updateKernel({
    kernel: {
      action_type: 'restart',
    },
  }), [updateKernel]);
  const interruptKernel = useCallback(() => {
    updateKernel({
      kernel: {
        action_type: 'interrupt',
      },
    });
    setRunningBlocks([]);
  }, [updateKernel]);

  const [createBlock] = useMutation(api.blocks.pipelines.useCreate(pipelineUUID));
  const addNewBlockAtIndex = useCallback((
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name: string = randomNameGenerator(),
  ): Promise<any> => {
    let blockContent;
    if (block.converted_from_type && block.converted_from_uuid) {
      blockContent = contentByBlockUUID.current[block.converted_from_type]?.[block.converted_from_uuid];
    }

    const {
      language: blockLanguage,
      type: blockType,
    } = block;

    if (isDataIntegration) {
      const blocksByType = indexBy(pipeline?.blocks || [], ({ type }) => type);
      const dataExporterBlock = blocksByType[BlockTypeEnum.DATA_EXPORTER];
      const dataLoaderBlock = blocksByType[BlockTypeEnum.DATA_LOADER];
      const transformerBlock = blocksByType[BlockTypeEnum.TRANSFORMER];

      if (BlockTypeEnum.DATA_LOADER === blockType) {
        if (BlockLanguageEnum.YAML !== blockLanguage) {
          setErrors({
            displayMessage: `The source you’re trying to add must contain the language ${BlockLanguageEnum.YAML} and not ${blockLanguage}.`,
          });
          return;
        } else if (dataLoaderBlock) {
          setErrors({
            displayMessage: `Pipeline ${pipeline?.uuid} already has a source: ${dataLoaderBlock?.uuid}.`,
          });
          return;
        }
      } else if (BlockTypeEnum.TRANSFORMER === blockType) {
        if (transformerBlock) {
          setErrors({
            displayMessage: `Pipeline ${pipeline?.uuid} already has a transformer: ${transformerBlock?.uuid}.`,
          });
          return;
        }
      } else if (BlockTypeEnum.DATA_EXPORTER === blockType) {
        if (BlockLanguageEnum.YAML !== blockLanguage) {
          setErrors({
            displayMessage: `The destination you’re trying to add must contain the language ${BlockLanguageEnum.YAML} and not ${blockLanguage}.`,
          });
          return;
        } else if (dataExporterBlock) {
          setErrors({
            displayMessage: `Pipeline ${pipeline?.uuid} already has a destination: ${dataExporterBlock?.uuid}.`,
          });
          return;
        }
      }
    }

    // @ts-ignore
    const func = () => createBlock({
      block: {
        content: blockContent,
        name,
        priority: idx,
        require_unique_name: true,
        ...block,
      },
    }).then((response: {
      data: {
        block: BlockType;
      };
    }) => {
      onSuccess(
        response, {
          callback: () => {
            const {
              data: {
                block,
              },
            } = response;
            onCreateCallback?.(block);

            // TODO (tommy dang): there is a very difficult bug when you add a new block while the
            // split view is enabled and the 1st block is scrolled out of view, the notebook
            // will scroll the 1st block down into view, but when calculating where to position
            // the next blocks after the 1st block, it factors in the 1st block’s initial
            // negative top positioning. Therefore, all the blocks below the 1st block will be
            // positioned with a top pixel offset equal to where the 1st block was positioned
            // prior to adding the new block.
            // I can’t figure out how to fix this yet, so we’ll just do a refresh of the page
            // for now until I can fix it.
            if (sideBySideEnabled
              && featureEnabled?.(featureUUIDs?.NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW)
            ) {
              if (typeof window !== 'undefined') {
                window?.location?.reload();
              }
            } else {
              fetchFileTree();
              fetchPipeline().then(({
                pipeline: {
                  blocks: blocksNewInit,
                  extensions,
                },
              }) => {
                setBlocks((blocksPrev) => {
                  const blocksNew = [...blocksNewInit];
                  // @ts-ignore
                  Object.entries(extensions || {}).forEach(([extensionUUID, { blocks }]) => {
                    if (blocks) {
                      blocksNew.push(...blocks.map(b => ({ ...b, extension_uuid: extensionUUID })));
                    }
                  });

                  const blocksPrevMapping = indexBy(blocksPrev, ({ uuid }) => uuid);
                  const blocksFinal = [];
                  blocksNew.forEach((blockNew: BlockType) => {
                    const blockPrev = blocksPrevMapping[blockNew.uuid];
                    if (blockPrev) {
                      blocksFinal.push(blockPrev);
                    } else {
                      blocksFinal.push(blockNew);
                    }
                  });

                  return blocksFinal;
                });
              });
            }
          },
          onErrorCallback: (response, errors) => {
            const exception = response?.error?.exception;
            const filePath = getRelativePathFromBlock({
              ...block,
              name,
            });

            if (exception && filePath && exception.startsWith(BLOCK_EXISTS_ERROR)) {
              setErrors(() => ({
                errors,
                links: [{
                  label: 'View existing block file contents and optionally add to pipeline (if applicable).',
                  onClick: () => {
                    openFile(filePath);
                    setErrors(null);
                  },
                }],
                response,
              }));
            } else {
              setErrors({
                errors,
                response,
              });
            }
          },
        },
      );
    });

    if (sideBySideEnabled && featureEnabled?.(featureUUIDs?.NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW)) {
      return savePipelineContent().then(() => func());
    }

    return func();
  }, [
    createBlock,
    fetchFileTree,
    fetchPipeline,
    isDataIntegration,
    openFile,
    pipeline,
    savePipelineContent,
    setBlocks,
    setErrors,
    sideBySideEnabled,
  ]);

  // const [automaticallyNameBlocks, setAutomaticallyNameBlocks] = useState<boolean>(false);
  // useEffect(() => {
  //   setAutomaticallyNameBlocks(!!get(LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS));
  // }, []);

  const [showAddBlockModal, hideAddBlockModal] = useModal(({
    block,
    idx,
    isReplacingBlock = false,
    isUpdatingBlock = false,
    name = randomNameGenerator(),
    onCreateCallback,
  }: {
    block: BlockRequestPayloadType;
    idx?: number;
    isReplacingBlock?: boolean;
    isUpdatingBlock?: boolean;
    name: string;
    onCreateCallback?: (block: BlockType) => void;
  }) => (
    <ErrorProvider>
      <ConfigureBlock
        block={block}
        defaultName={name}
        isReplacingBlock={isReplacingBlock}
        isUpdatingBlock={isUpdatingBlock}
        onClose={hideAddBlockModal}
        onSave={(opts: {
          color?: BlockColorEnum;
          language?: BlockLanguageEnum;
          name?: string;
        } = {}) => {
          if (isUpdatingBlock || isReplacingBlock) {
            const detachBlock = block.detach || false;
            savePipelineContent({
              block: {
                color: opts?.color || null,
                detach: detachBlock,
                name: opts?.name,
                uuid: block.uuid,
              },
              pipeline: {
                blocks: pipeline?.blocks || [],
              },
            }).then(() => {
              setSelectedBlock(null);
              hideAddBlockModal();
            });
          } else {
            addNewBlockAtIndex(
              {
                ...block,
                ...ignoreKeys(opts, ['name']),
              },
              idx,
              onCreateCallback,
              opts?.name,
            ).then(() => hideAddBlockModal());
          }
        }
        }
        pipeline={pipeline}
      />
    </ErrorProvider>
  ), {
  }, [
    addNewBlockAtIndex,
    pipeline,
  ], {
    background: true,
    disableEscape: true,
    uuid: 'configure_block_name_and_create',
  });

  const [showConfigureProjectModal, hideConfigureProjectModal] = useModal(({
    cancelButtonText,
    header,
    onCancel,
    onSaveSuccess,
  }: {
    cancelButtonText?: string;
    header?: any;
    onCancel?: () => void;
    onSaveSuccess?: (project: ProjectType) => void;
  }) => (
    <ErrorProvider>
      <Preferences
        cancelButtonText={cancelButtonText}
        contained
        header={header}
        onCancel={() => {
          onCancel?.();
          hideConfigureProjectModal();
        }}
        onSaveSuccess={(project: ProjectType) => {
          fetchProjects();
          hideConfigureProjectModal();
          onSaveSuccess?.(project);
        }}
      />
    </ErrorProvider>
  ), {
  }, [
    fetchProjects,
  ], {
    background: true,
    uuid: 'configure_project',
  });

  // Widgets
  const [createWidget] = useMutation(api.widgets.pipelines.useCreate(pipelineUUID));
  const addWidgetAtIndex = useCallback((
    widget: BlockType,
    idx: number,
    onCreateCallback?: (widget: BlockType) => void,
    name: string = randomNameGenerator(),
    // @ts-ignore
  ) => createWidget({
    widget: {
      name,
      priority: idx,
      type: BlockTypeEnum.CHART,
      ...widget,
    },
  }).then((response: {
    data: {
      widget: BlockType;
    };
  }) => onSuccess(
    response, {
      callback: () => {
        const {
          data: {
            widget,
          },
        } = response;
        onCreateCallback?.(widget);
        fetchFileTree();
        fetchPipeline();

        setActiveSidekickView(ViewKeyEnum.CHARTS);

        setRecentlyAddedChart(widget);
      },
      onErrorCallback: (response, errors) => setErrors({
        errors,
        response,
      }),
    },
  )), [
    fetchFileTree,
    fetchPipeline,
    createWidget,
    setActiveSidekickView,
  ]);

  useEffect(() => {
    if (recentlyAddedChart) {
      const refChart = chartRefs.current[recentlyAddedChart.uuid]?.current;
      if (refChart) {
        refChart.scrollIntoView();
        setRecentlyAddedChart(null);
      }
    }
  }, [
    recentlyAddedChart,
    setRecentlyAddedChart,
  ]);

  useEffect(() => {
    if (pipelineUUIDPrev !== pipelineUUID) {
      setBlocks([]);
      setWidgets([]);
      setOutputBlocks([]);
      setPipelineMessages([]);
    }
  }, [
    pipelineUUID,
    pipelineUUIDPrev,
  ]);

  useEffect(() => {
    if (typeof pipeline?.blocks !== 'undefined' || typeof pipeline?.extensions !== 'undefined') {
      const arr = [];
      if (typeof pipeline?.blocks !== 'undefined') {
        arr.push(...pipeline?.blocks);
      }
      if (typeof pipeline?.callbacks !== 'undefined') {
        arr.push(...pipeline?.callbacks);
      }
      if (typeof pipeline?.conditionals !== 'undefined') {
        arr.push(...pipeline?.conditionals);
      }
      if (typeof pipeline?.extensions !== 'undefined') {
        // @ts-ignore
        Object.entries(pipeline?.extensions || {}).forEach(([extensionUUID, { blocks }]) => {
          if (blocks) {
            arr.push(...blocks.map(b => ({ ...b, extension_uuid: extensionUUID })));
          }
        });
      }
      setBlocks(arr);
    }
  }, [
    pipeline?.blocks,
    pipeline?.callbacks,
    pipeline?.conditionals,
    pipeline?.extensions,
  ]);

  useEffect(() => {
    if (typeof pipeline?.widgets !== 'undefined') {
      setWidgets(pipeline.widgets);
    }
  }, [
    pipeline?.widgets,
  ]);

  useEffect(() => {
    if (outputBlocksInit?.length > 0 && outputBlocks?.length === 0) {
      setOutputBlocks(outputBlocksInit);
      setSelectedOutputBlock(outputBlocksInit[0]);
    }
  }, [
    outputBlocks,
    outputBlocksInit,
  ]);

  const blocksPrevious = usePrevious(blocks);
  useEffect(() => {
    if (!initializedMessages) {
      if (
        typeof pipeline?.blocks !== 'undefined'
          && (
            !blocks.length
              || !equals(
                blocksPrevious?.map(({ uuid }) => uuid).sort(),
                blocks?.map(({ uuid }) => uuid).sort(),
              )
              || isEmptyObject(messages)
            )
      ) {
        const {
          content: contentByBlockUUIDResults,
          messages: messagesInit,
        } = initializeContentAndMessages(pipeline.blocks);
        contentByBlockUUID.current = contentByBlockUUIDResults;

        if (!isEmptyObject(messagesInit)) {
          setMessages((messagesPrev) => ({
            ...messagesInit,
            ...messagesPrev,
          }));
        }

        setInitializedMessages(true);
      }
    }
  }, [
    blocks,
    blocksPrevious,
    initializedMessages,
    messages,
    pipeline?.blocks,
    setInitializedMessages,
    setMessages,
  ]);

  useEffect(() => {
    if (!widgets.length && typeof pipeline?.widgets !== 'undefined') {
      const {
        content: contentByBlockUUIDResults,
        messages: messagesInit,
      } = initializeContentAndMessages(pipeline.widgets);
      contentByWidgetUUID.current = contentByBlockUUIDResults;

      setMessages((messagesPrev) => ({
        ...messagesInit,
        ...messagesPrev,
      }));
    }
  }, [
    pipeline?.widgets,
    setMessages,
    widgets,
  ]);

  const onSelectBlockFile = useCallback((
    blockUUID: string,
    blockType: BlockTypeEnum,
    filePath: string,
  ) => {
    // Block is in pipeline
    const block =
      blocks.find(({ type, uuid }: BlockType) => type === blockType && uuid === blockUUID);

    if (block) {
      setSelectedBlock(block);
      if (blockRefs?.current) {
        const blockRef = blockRefs.current[buildBlockRefKey(block)];
        blockRef?.current?.scrollIntoView();
      }
      goToWithQuery({
        block_uuid: null,
        file_path: null,
        'file_paths[]': [],
      });
    } else if (blockType === BlockTypeEnum.CHART) {
      const chart = widgets.find(({ uuid }) => uuid === blockUUID);
      if (chart) {
        setSelectedBlock(chart);
        if (chartRefs?.current) {
          const chartRef = chartRefs.current[chart.uuid];
          chartRef?.current?.scrollIntoView();
        }
      }
    } else if (filePath) {
      openFile(filePath);
    }
  }, [
    blocks,
    openFile,
    widgets,
  ]);

  useEffect(() => {
    if (blockUUIDFromUrl && !selectedBlock) {
      const block = blocks.find(({ uuid }) => blockUUIDFromUrl?.split(':')?.[0] === uuid);
      if (block) {
        // ts-ignore
        setHiddenBlocks(prev => ({
          ...prev,
          [block.uuid]: false,
        }));
        onSelectBlockFile(block.uuid, block.type, null);
      }
    } else if (blocksPrevious?.length !== blocks?.length && selectedBlock) {
      // ts-ignore
      setHiddenBlocks(prev => ({
        ...prev,
        [selectedBlock.uuid]: false,
      }));
      onSelectBlockFile(selectedBlock.uuid, selectedBlock.type, null);
    }
  }, [
    blockUUIDFromUrl,
    blocks,
    blocksPrevious?.length,
    onSelectBlockFile,
    selectedBlock,
    setHiddenBlocks,
  ]);

  const token = useMemo(() => new AuthToken(), []);
  const sharedWebsocketData = useMemo(() => ({
    api_key: OAUTH2_APPLICATION_CLIENT_ID,
    token: token.decodedToken.token,
  }), [
    token,
  ]);

  // WebSocket
  const {
    sendMessage,
  } = useWebSocket(getWebSocket(), {
    onClose: () => console.log('socketUrlPublish closed'),
    onMessage: (lastMessage) => {
      if (lastMessage) {
        const message: KernelOutputType = JSON.parse(lastMessage.data);
        const {
          block_type: blockType,
          execution_state: executionState,
          msg_type: msgType,
          pipeline_uuid,
          uuid,
        } = message;

        if (!uuid && !pipeline_uuid) {
          return;
        }

        const block =
          blocks.find(({ type: type2, uuid: uuid2 }) => blockType === type2 && uuid === uuid2);

        if (msgType !== 'stream_pipeline') {
          // @ts-ignore
          setMessages((messagesPrevious) => {
            const messagesFromUUID = messagesPrevious[uuid] || [];
            return {
              ...messagesPrevious,
              [uuid]: messagesFromUUID.concat(message),
            };
          });
        } else {
          setPipelineMessages((pipelineMessagesPrevious) => [
            ...pipelineMessagesPrevious,
            message,
          ]);
          if (ExecutionStateEnum.IDLE === executionState) {
            setRunningBlocks([]);
            fetchPipeline();

            if (!uuid) {
              setIsPipelineExecuting(false);
            }
          }
        }

        if (ExecutionStateEnum.BUSY === executionState) {
          setRunningBlocks((runningBlocksPrevious) => {
            if (runningBlocksPrevious.find(({ uuid: uuid2 }) => uuid === uuid2) || !block) {
              return runningBlocksPrevious;
            }

            return runningBlocksPrevious.concat(block);
          });
        } else if (ExecutionStateEnum.IDLE === executionState) {
          // @ts-ignore
          setRunningBlocks((runningBlocksPrevious) =>
            runningBlocksPrevious.filter(({ uuid: uuid2 }) => uuid !== uuid2),
          );
        }

        if (!disablePipelineEditAccess) {
          setPipelineContentTouched(true);
        }
      }
    },
    onOpen: () => console.log('socketUrlPublish opened'),
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    shouldReconnect: () => {
      // Will attempt to reconnect on all close events, such as server shutting down.
      console.log('Attempting to reconnect...');

      return true;
    },
  });

  const executePipeline = useCallback(() => {
    savePipelineContent().then(() => {
      setIsPipelineExecuting(true);
      setPipelineMessages([]);

      sendMessage(JSON.stringify({
        ...sharedWebsocketData,
        execute_pipeline: true,
        pipeline_uuid: pipelineUUID,
      }));
    });
  }, [
    pipelineUUID,
    savePipelineContent,
    sendMessage,
    sharedWebsocketData,
  ]);

  const cancelPipeline = useCallback(() => {
    sendMessage(JSON.stringify({
      ...sharedWebsocketData,
      cancel_pipeline: true,
      pipeline_uuid: pipelineUUID,
    }));
  }, [
    pipelineUUID,
    sendMessage,
    sharedWebsocketData,
  ]);

  // The cancelPipeline method is not called with an arg due to "Converting circular
  // structure to JSON" TypeError when "Cancel pipeline" button is clicked.
  const cancelPipelineWithoutMessage = useCallback(() => {
    sendMessage(JSON.stringify({
      ...sharedWebsocketData,
      cancel_pipeline: true,
      pipeline_uuid: pipelineUUID,
      skip_publish_message: true,
    }));
  }, [
    pipelineUUID,
    sendMessage,
    sharedWebsocketData,
  ]);

  const checkIfPipelineRunning = useCallback(() => {
    sendMessage(JSON.stringify({
      ...sharedWebsocketData,
      check_if_pipeline_running: true,
      pipeline_uuid: pipelineUUID,
    }));
  }, [
    pipelineUUID,
    sendMessage,
    sharedWebsocketData,
  ]);

  useEffect(() => {
    window.addEventListener('pagehide', cancelPipelineWithoutMessage);
    router?.events?.on('routeChangeStart', cancelPipelineWithoutMessage);

    return () => {
      router?.events?.off('routeChangeStart', cancelPipelineWithoutMessage);
      window.removeEventListener('pagehide', cancelPipelineWithoutMessage);
    };
  }, [cancelPipelineWithoutMessage, router?.events]);

  const runBlockOrig = useCallback((payload: {
    block: BlockType;
    code: string;
    ignoreAlreadyRunning?: boolean;
    runDownstream?: boolean;
    runIncompleteUpstream?: boolean;
    runSettings?: {
      run_model?: boolean;
    };
    runUpstream?: boolean;
    runTests?: boolean;
    variables?: {
      [key: string]: any;
    };
  }) => {
    const {
      block,
      code,
      ignoreAlreadyRunning,
      runDownstream = false,
      runIncompleteUpstream = false,
      runSettings = {},
      runTests = false,
      runUpstream,
      variables,
    } = payload;

    const {
      extension_uuid: extensionUUID,
      upstream_blocks: upstreamBlocks,
      uuid,
    } = block;
    const isAlreadyRunning = runningBlocks.find(({ uuid: uuid2 }) => uuid === uuid2);

    if (!isAlreadyRunning || ignoreAlreadyRunning) {
      const localStorageBlockOutputLogsKey =
        `${LOCAL_STORAGE_KEY_PIPELINE_EDIT_BLOCK_OUTPUT_LOGS}_${pipeline?.uuid}`;

      sendMessage(JSON.stringify({
        ...sharedWebsocketData,
        code,
        extension_uuid: extensionUUID,
        output_messages_to_logs: !!get(localStorageBlockOutputLogsKey),
        pipeline_uuid: pipeline?.uuid,
        run_downstream: runDownstream, // This will only run downstream blocks that are charts/widgets
        run_incomplete_upstream: runIncompleteUpstream,
        run_settings: runSettings,
        run_tests: runTests,
        run_upstream: runUpstream,
        type: block.type,
        upstream_blocks: upstreamBlocks,
        uuid,
        variables,
      }));

      // @ts-ignore
      setMessages((messagesPrevious) => {
        delete messagesPrevious[uuid];

        return messagesPrevious;
      });

      setTextareaFocused(false);

      // @ts-ignore
      setRunningBlocks((runningBlocksPrevious) => {
        if (runningBlocksPrevious.find(({ uuid: uuid2 }) => uuid === uuid2)) {
          return runningBlocksPrevious;
        }

        return runningBlocksPrevious.concat(block);
      });

      setOuputsToSaveByBlockUUID(prev => ({
        ...prev,
        [block?.uuid]: true,
      }));
    }

    // Need to fetch pipeline to refresh block status in dependency graph
    fetchPipeline();
  }, [
    fetchPipeline,
    pipeline,
    runningBlocks,
    sendMessage,
    setMessages,
    setRunningBlocks,
    setTextareaFocused,
    sharedWebsocketData,
  ]);

  const runBlock = useCallback((payload) => {
    const {
      block,
    } = payload;

    if (disablePipelineEditAccess) {
      return runBlockOrig(payload);
    } else {
      return savePipelineContent({
        block: {
          outputs: [],
          uuid: block.uuid,
        },
      }, {
        contentOnly: true,
      })?.then(() => runBlockOrig(payload));
    }
  }, [
    disablePipelineEditAccess,
    runBlockOrig,
    savePipelineContent,
  ]);

  const {
    lastMessage: lastTerminalMessage,
    sendMessage: sendTerminalMessage,
  } = useWebSocket(getWebSocket('terminal'), {
    shouldReconnect: () => true,
  });

  const [showBrowseTemplates, hideBrowseTemplates] = useModal(({
    addNew,
    addNewBlock,
    blockType,
  }: {
    addNew?: boolean;
    addNewBlock?: (block: BlockRequestPayloadType) => Promise<any>,
    blockType?: BlockTypeEnum;
    language?: BlockLanguageEnum;
  }) => (
    <ErrorProvider>
      <BrowseTemplates
        contained
        defaultLinkUUID={blockType}
        onClickCustomTemplate={(customTemplate) => {
          addNewBlock({
            config: {
              custom_template: customTemplate,
              custom_template_uuid: customTemplate?.template_uuid,
            },
          });
          hideBrowseTemplates();
        }}
        showAddingNewTemplates={!!addNew}
        showBreadcrumbs
        tabs={[NAV_TAB_BLOCKS]}
      />
    </ErrorProvider>
  ), {
  }, [
  ], {
    background: true,
    uuid: 'browse_templates',
  });

  const { data: dataGlobalProducts } = api.global_data_products.list();
  const globalDataProducts: GlobalDataProductType[] =
    useMemo(() => dataGlobalProducts?.global_data_products || [], [dataGlobalProducts]);

  const [showGlobalDataProducts, hideGlobalDataProducts] = useModal(({
    addNewBlock,
  }: {
    addNewBlock?: (block: BlockRequestPayloadType) => Promise<any>,
  }) => (
    <ErrorProvider>
      <Panel>
        <GlobalDataProducts
          globalDataProducts={globalDataProducts}
          onClickRow={(globalDataProduct: GlobalDataProductType) => {
            addNewBlock({
              configuration: {
                global_data_product: {
                  uuid: globalDataProduct?.uuid,
                },
              },
              type: BlockTypeEnum.GLOBAL_DATA_PRODUCT,
            });
            hideGlobalDataProducts();
          }}
        />
      </Panel>
    </ErrorProvider>
  ), {
  }, [
    globalDataProducts,
  ], {
    background: true,
    uuid: 'global_data_products',
  });

  // After footer for interactions in Sidekick

  const refAfterFooter = useRef(null);

  const [afterFooterBottomOffset, setAfterFooterBottomOffset] = useState<number>(null);

  const isSidekickOnInteractions: boolean =
    useMemo(() => ViewKeyEnum.INTERACTIONS === activeSidekickView, [
      activeSidekickView,
    ]);

  useEffect(() => {
    if (activeSidekickView && refAfterFooter?.current) {
      setAfterFooterBottomOffset(refAfterFooter?.current?.getBoundingClientRect()?.height);
    }
  }, [
    activeSidekickView,
    afterHidden,
    heightWindow,
    isInteractionsEnabled,
    refAfterFooter,
  ]);

  useEffect(() => {
    if (!interactionsMapping && interactions?.length >= 1) {
      setInteractionsMapping(indexBy(
        interactions || [],
        ({ uuid }) => uuid,
      ));
    }
  }, [
    interactions,
    interactionsMapping,
    setInteractionsMapping,
  ]);

  useEffect(() => {
    if (!blockInteractionsMapping && pipelineInteraction?.blocks) {
      setBlockInteractionsMapping(pipelineInteraction?.blocks);
    }
  }, [
    blockInteractionsMapping,
    pipelineInteraction,
    setBlockInteractionsMapping,
  ]);

  const sideKick = useMemo(() => (
    <Sidekick
      activeView={activeSidekickView}
      addNewBlockAtIndex={(
        block: BlockType,
        idx: number,
        onCreateCallback: any,
        name: string,
        isReplacingBlock = false,
      ) => new Promise(() => showAddBlockModal({
        block,
        idx,
        isReplacingBlock,
        name,
        onCreateCallback,
      }))}
      afterWidth={afterWidthForChildren}
      autocompleteItems={autocompleteItems}
      blockInteractionsMapping={blockInteractionsMapping}
      blockRefs={blockRefs}
      blocks={blocks}
      blocksInNotebook={blocksInNotebook}
      cancelPipeline={cancelPipeline}
      chartRefs={chartRefs}
      checkIfPipelineRunning={checkIfPipelineRunning}
      containerHeightOffset={isSidekickOnInteractions ? (afterFooterBottomOffset + 1) : null}
      contentByBlockUUID={contentByBlockUUID}
      createInteraction={createInteraction}
      deleteBlock={deleteBlock}
      deleteWidget={deleteWidget}
      editingBlock={editingBlock}
      executePipeline={executePipeline}
      fetchFileTree={fetchFileTree}
      fetchPipeline={fetchPipeline}
      fetchSecrets={fetchSecrets}
      fetchVariables={fetchVariables}
      globalDataProducts={globalDataProducts}
      globalVariables={globalVariables}
      insights={insights}
      interactions={interactions}
      interactionsMapping={interactionsMapping}
      interruptKernel={interruptKernel}
      isLoadingCreateInteraction={isLoadingCreateInteraction}
      isLoadingUpdatePipelineInteraction={isLoadingUpdatePipelineInteraction}
      isPipelineExecuting={isPipelineExecuting}
      isPipelineUpdating={isPipelineUpdating}
      lastTerminalMessage={lastTerminalMessage}
      messages={messages}
      metadata={metadata}
      onChangeCallbackBlock={onChangeCallbackBlock}
      onChangeChartBlock={onChangeChartBlock}
      onChangeCodeBlock={onChangeCodeBlock}
      onSelectBlockFile={onSelectBlockFile}
      onUpdateFileSuccess={onUpdateFileSuccess}
      permissions={permissions}
      pipeline={pipeline}
      pipelineInteraction={pipelineInteraction}
      pipelineMessages={pipelineMessages}
      project={project}
      refAfterFooter={refAfterFooter}
      runBlock={runBlock}
      runningBlocks={runningBlocks}
      sampleData={sampleData}
      savePipelineContent={savePipelineContent}
      savePipelineInteraction={savePipelineInteraction}
      secrets={secrets}
      selectedBlock={selectedBlock}
      selectedFilePath={selectedFilePath}
      sendTerminalMessage={sendTerminalMessage}
      setActiveSidekickView={setActiveSidekickView}
      setAllowCodeBlockShortcuts={setAllowCodeBlockShortcuts}
      setAnyInputFocused={setAnyInputFocused}
      // @ts-ignore
      setBlockInteractionsMapping={setBlockInteractionsMapping}
      setDisableShortcuts={setDisableShortcuts}
      setEditingBlock={setEditingBlock}
      setErrors={setErrors}
      // @ts-ignore
      setHiddenBlocks={setHiddenBlocks}
      // @ts-ignore
      setInteractionsMapping={setInteractionsMapping}
      setPermissions={setPermissions}
      setSelectedBlock={setSelectedBlock}
      setTextareaFocused={setTextareaFocused}
      showBrowseTemplates={showBrowseTemplates}
      showDataIntegrationModal={showDataIntegrationModal}
      // @ts-ignore
      showUpdateBlockModal={(
        block,
        name = randomNameGenerator(),
        isReplacingBlock = false,
      ) => new Promise(() => showAddBlockModal({
        block,
        isReplacingBlock,
        isUpdatingBlock: !isReplacingBlock,
        name,
      }))}
      sideBySideEnabled={sideBySideEnabled}
      statistics={statistics}
      textareaFocused={textareaFocused}
      treeRef={treeRef}
      updatePipelineInteraction={updatePipelineInteraction}
      updatePipelineMetadata={updatePipelineMetadata}
      updateWidget={updateWidget}
      widgets={widgets}
    />
  ), [
    activeSidekickView,
    afterFooterBottomOffset,
    afterWidthForChildren,
    autocompleteItems,
    blockInteractionsMapping,
    blockRefs,
    blocks,
    blocksInNotebook,
    cancelPipeline,
    checkIfPipelineRunning,
    contentByBlockUUID,
    createInteraction,
    deleteBlock,
    deleteWidget,
    editingBlock,
    executePipeline,
    fetchFileTree,
    fetchPipeline,
    fetchSecrets,
    fetchVariables,
    globalDataProducts,
    globalVariables,
    insights,
    interactions,
    interactionsMapping,
    interruptKernel,
    isLoadingCreateInteraction,
    isLoadingUpdatePipelineInteraction,
    isPipelineExecuting,
    isPipelineUpdating,
    isSidekickOnInteractions,
    lastTerminalMessage,
    messages,
    metadata,
    onChangeCallbackBlock,
    onChangeChartBlock,
    onChangeCodeBlock,
    onSelectBlockFile,
    onUpdateFileSuccess,
    permissions,
    pipeline,
    pipelineInteraction,
    pipelineMessages,
    project,
    refAfterFooter,
    runBlock,
    runningBlocks,
    sampleData,
    savePipelineContent,
    savePipelineInteraction,
    secrets,
    selectedBlock,
    selectedFilePath,
    sendTerminalMessage,
    setActiveSidekickView,
    setAnyInputFocused,
    setBlockInteractionsMapping,
    setEditingBlock,
    setErrors,
    setHiddenBlocks,
    setInteractionsMapping,
    setPermissions,
    setTextareaFocused,
    showAddBlockModal,
    showBrowseTemplates,
    showDataIntegrationModal,
    sideBySideEnabled,
    statistics,
    textareaFocused,
    updatePipelineInteraction,
    updatePipelineMetadata,
    updateWidget,
    widgets,
  ]);

  const pipelineDetailMemo = useMemo(() => (
    <PipelineDetail
      // addNewBlockAtIndex={automaticallyNameBlocks
      //   ? addNewBlockAtIndex
      //   : (block, idx, onCreateCallback, name) => new Promise((resolve, reject) => {
      //       if (BlockTypeEnum.DBT === block?.type && BlockLanguageEnum.SQL === block?.language) {
      //         addNewBlockAtIndex(block, idx, onCreateCallback, name);
      //       } else {
      //         // @ts-ignore
      //         showAddBlockModal({ block, idx, name, onCreateCallback });
      //       }
      //     })
      // }
      addNewBlockAtIndex={(
        block,
        idx,
        onCreateCallback,
        name,
      ) => new Promise(() => {
        if (ObjectType.BLOCK_FILE === block?.block_action_object?.object_type
          || (
          BlockTypeEnum.DBT === block?.type
            && BlockLanguageEnum.SQL === block?.language
            && !block?.block_action_object
        )) {
          addNewBlockAtIndex(block, idx, onCreateCallback, name);
        } else {
          // @ts-ignore
          showAddBlockModal({ block, idx, name, onCreateCallback });
        }
      })}
      addWidget={(
        widget: BlockType,
        {
          onCreateCallback,
        }: {
          onCreateCallback?: (block: BlockType) => void;
        },
      ) => addWidgetAtIndex(widget, widgets.length, onCreateCallback)}
      afterHidden={afterHidden}
      allBlocks={blocks}
      allowCodeBlockShortcuts={allowCodeBlockShortcuts}
      anyInputFocused={anyInputFocused}
      autocompleteItems={autocompleteItems}
      beforeHidden={beforeHidden}
      blockInteractionsMapping={blockInteractionsMapping}
      blockRefs={blockRefs}
      blocks={blocksInNotebook}
      blocksThatNeedToRefresh={blocksThatNeedToRefresh}
      dataProviders={dataProviders}
      deleteBlock={deleteBlock}
      disableShortcuts={disableShortcuts}
      fetchFileTree={fetchFileTree}
      fetchPipeline={fetchPipeline}
      fetchSampleData={fetchSampleData}
      files={files}
      globalDataProducts={globalDataProducts}
      globalVariables={globalVariables}
      // @ts-ignore
      hiddenBlocks={hiddenBlocks}
      interactionsMapping={interactionsMapping}
      interruptKernel={interruptKernel}
      mainContainerRef={mainContainerRef}
      mainContainerWidth={mainContainerWidth}
      messages={messages}
      onChangeCallbackBlock={onChangeCallbackBlock}
      onChangeCodeBlock={onChangeCodeBlock}
      openSidekickView={openSidekickView}
      pipeline={pipeline}
      pipelineContentTouched={pipelineContentTouched}
      project={project}
      restartKernel={restartKernel}
      runBlock={runBlock}
      runningBlocks={runningBlocks}
      savePipelineContent={savePipelineContent}
      scrollTogether={scrollTogether}
      selectedBlock={selectedBlock}
      setAnyInputFocused={setAnyInputFocused}
      setDisableShortcuts={setDisableShortcuts}
      setEditingBlock={setEditingBlock}
      setErrors={setErrors}
      // @ts-ignore
      setHiddenBlocks={setHiddenBlocks}
      setIntegrationStreams={setIntegrationStreams}
      setOutputBlocks={setOutputBlocks}
      setPipelineContentTouched={setPipelineContentTouched}
      setSelectedBlock={setSelectedBlock}
      setSelectedOutputBlock={setSelectedOutputBlock}
      setSelectedStream={setSelectedStream}
      setTextareaFocused={setTextareaFocused}
      showBrowseTemplates={showBrowseTemplates}
      showConfigureProjectModal={showConfigureProjectModal}
      showDataIntegrationModal={showDataIntegrationModal}
      showGlobalDataProducts={showGlobalDataProducts}
      showUpdateBlockModal={(
        block,
        name = randomNameGenerator(),
      ) => new Promise(() => showAddBlockModal({
        block,
        isUpdatingBlock: true,
        name,
      }))}
      sideBySideEnabled={sideBySideEnabled}
      textareaFocused={textareaFocused}
      widgets={widgets}
    />
  ), [
    addNewBlockAtIndex,
    addWidgetAtIndex,
    afterHidden,
    allowCodeBlockShortcuts,
    anyInputFocused,
    autocompleteItems,
    // automaticallyNameBlocks,
    beforeHidden,
    blockRefs,
    blockInteractionsMapping,
    blocks,
    blocksInNotebook,
    blocksThatNeedToRefresh,
    dataProviders,
    deleteBlock,
    disableShortcuts,
    fetchFileTree,
    fetchPipeline,
    fetchSampleData,
    files,
    globalDataProducts,
    globalVariables,
    hiddenBlocks,
    interactionsMapping,
    interruptKernel,
    mainContainerRef,
    mainContainerWidth,
    messages,
    onChangeCallbackBlock,
    onChangeCodeBlock,
    openSidekickView,
    pipeline,
    pipelineContentTouched,
    project,
    restartKernel,
    runBlock,
    runningBlocks,
    savePipelineContent,
    scrollTogether,
    selectedBlock,
    setAnyInputFocused,
    setEditingBlock,
    setErrors,
    setHiddenBlocks,
    setPipelineContentTouched,
    setSelectedBlock,
    setTextareaFocused,
    showAddBlockModal,
    showBrowseTemplates,
    showConfigureProjectModal,
    showDataIntegrationModal,
    showGlobalDataProducts,
    sideBySideEnabled,
    textareaFocused,
    widgets,
  ]);

  const beforeHeader = useMemo(() => {
    if (page === PAGE_NAME_EDIT) {
      return (
        <FileHeaderMenu
          cancelPipeline={cancelPipeline}
          createPipeline={createPipeline}
          executePipeline={executePipeline}
          interruptKernel={interruptKernel}
          isPipelineExecuting={isPipelineExecuting}
          kernel={kernel}
          pipeline={pipeline}
          restartKernel={restartKernel}
          savePipelineContent={savePipelineContent}
          scrollTogether={scrollTogether}
          setActiveSidekickView={setActiveSidekickView}
          setMessages={setMessages}
          setScrollTogether={setScrollTogether}
          setSideBySideEnabled={setSideBySideEnabled}
          sideBySideEnabled={sideBySideEnabled}
          updatePipelineMetadata={updatePipelineMetadata}
        >
          {selectedFilePath && (
            <Spacing ml={1}>
              <FlexContainer alignItems="center" fullHeight>
                <Button
                  compact
                  onClick={() => setSelectedFilePath(null)}
                  small
                >
                  View pipeline
                </Button>
              </FlexContainer>
            </Spacing>
          )}
        </FileHeaderMenu>
      );
    }
  }, [
    cancelPipeline,
    createPipeline,
    executePipeline,
    interruptKernel,
    isPipelineExecuting,
    kernel,
    page,
    pipeline,
    restartKernel,
    savePipelineContent,
    scrollTogether,
    selectedFilePath,
    setActiveSidekickView,
    setMessages,
    setScrollTogether,
    setSelectedFilePath,
    setSideBySideEnabled,
    sideBySideEnabled,
    updatePipelineMetadata,
  ]);

  const mainContainerHeaderMemo = useMemo(() => {
    if (page === PAGE_NAME_EDIT) {
      return (
        <>
          <KernelStatus
            filePaths={selectedFilePaths}
            filesTouched={filesTouched}
            isBusy={runningBlocks.length >= 1}
            kernel={kernel}
            pipeline={pipeline}
            restartKernel={restartKernel}
            savePipelineContent={savePipelineContent}
            selectedFilePath={selectedFilePath}
            setErrors={setErrors}
            setRunningBlocks={setRunningBlocks}
            updatePipelineMetadata={updatePipelineMetadata}
          >
            {beforeHeader}
          </KernelStatus>

          {selectedFilePaths?.length > 0 &&
            <PipelineHeaderStyle relativePosition secondary>
              <FileTabs
                filePaths={selectedFilePaths}
                filesTouched={filesTouched}
                savePipelineContent={savePipelineContent}
                selectedFilePath={selectedFilePath}
              />
            </PipelineHeaderStyle>
          }
        </>
      );
    }
  }, [
    beforeHeader,
    filesTouched,
    kernel,
    page,
    pipeline,
    restartKernel,
    runningBlocks,
    savePipelineContent,
    selectedFilePath,
    selectedFilePaths,
    setErrors,
    updatePipelineMetadata,
  ]);

  const mainContainerFooterMemo = useMemo(() => {
    if (page === PAGE_NAME_EDIT) {
      return (
        <StatusFooter
          kernel={kernel}
          pipelineContentTouched={pipelineContentTouched}
          pipelineLastSaved={pipelineLastSaved}
          ref={mainContainerFooterRef}
          saveStatus={saveStatus}
          width={mainContainerWidth}
        />
      );
    }
  }, [
    mainContainerWidth,
    page,
    pipelineContentTouched,
    pipelineLastSaved,
    saveStatus,
  ]);

  const integrationOutputsMemo = useMemo(
    () => integrationStreams
      ?.filter(stream => find(
        blockSampleData?.outputs,
        ({ variable_uuid }) => variable_uuid === `output_sample_data_${cleanName(stream)}`,
      ))
      ?.map(stream => (
        <Spacing key={stream} pl={1}>
          <KeyboardShortcutButton
            blackBorder
            compact
            muted
            onClick={() => setSelectedStream(stream)}
            selected={selectedStream === stream}
            uuid={stream}
          >
            {stream}
          </KeyboardShortcutButton>
        </Spacing>
      )),
    [blockSampleData, integrationStreams, selectedStream],
  );

  const fileTreeRef = useRef(null);
  const before = useMemo(() => (
    <FileBrowser
      addNewBlock={(
        b: BlockRequestPayloadType,
        cb: (block: BlockType) => void,
      ) => {
        addNewBlockAtIndex(
          b,
          blocks.length,
          cb,
          b.name,
        );
        if (filePathsFromUrl?.length >= 1) {
          router.push(`/pipelines/${pipelineUUID}/edit`);
        }
      }}
      blocks={blocks}
      // deleteBlockFile={deleteBlockFile}
      deleteWidget={deleteWidget}
      fetchAutocompleteItems={fetchAutocompleteItems}
      fetchFileTree={fetchFileTree}
      fetchPipeline={fetchPipeline}
      files={files}
      onSelectBlockFile={onSelectBlockFile}
      openFile={openFile}
      openPipeline={(uuid: string) => {
        resetState();
        router.push('/pipelines/[pipeline]/edit', `/pipelines/${uuid}/edit`);
      }}
      openSidekickView={openSidekickView}
      pipeline={pipeline}
      ref={fileTreeRef}
      setErrors={setErrors}
      setSelectedBlock={setSelectedBlock}
      widgets={widgets}
    />
  ), [
    addNewBlockAtIndex,
    blocks,
    deleteWidget,
    fetchAutocompleteItems,
    fetchFileTree,
    fetchPipeline,
    filePathsFromUrl?.length,
    files,
    onSelectBlockFile,
    openFile,
    openSidekickView,
    pipeline,
    pipelineUUID,
    resetState,
    router,
    setErrors,
    setSelectedBlock,
    widgets,
  ]);

  const blocksInPipeline = useMemo(() => (
    <BlocksInPipeline
      blockRefs={blockRefs}
      // @ts-ignore
      hiddenBlocks={hiddenBlocks}
      pipeline={pipeline}
      // @ts-ignore
      setHiddenBlocks={setHiddenBlocks}
    />
  ), [
    blockRefs,
    hiddenBlocks,
    pipeline,
    setHiddenBlocks,
  ]);

  const beforeToShow = useMemo(() => {
    if (EDIT_BEFORE_TAB_ALL_FILES.uuid === selectedTab?.uuid) {
      return before;
    } else if (EDIT_BEFORE_TAB_FILES_IN_PIPELINE.uuid === selectedTab?.uuid) {
      return blocksInPipeline;
    }

    return null;
  }, [
    before,
    blocksInPipeline,
    selectedTab,
  ]);

  const buttonTabs = useMemo(() => (
    <Spacing px={1}>
      <ButtonTabs
        noPadding
        onClickTab={(tab: TabType) => {
          setSelectedTab(tab);
        }}
        selectedTabUUID={selectedTab?.uuid}
        tabs={EDIT_BEFORE_TABS}
        underlineColor={(themeContext || dark).accent.purple}
        underlineStyle
      />
    </Spacing>
  ), [
    setSelectedTab,
    selectedTab,
    themeContext,
  ]);

  return (
    <>
      <Head title={pipeline?.name} />

      <PipelineLayout
        after={sideKick}
        afterHeader={(
          <SidekickHeader
            activeView={activeSidekickView}
            pipeline={pipeline}
            project={project}
            secrets={secrets}
            selectedBlock={selectedBlock}
            setSelectedBlock={setSelectedBlock}
            variables={globalVariables}
          />
        )}
        afterHeightOffset={HEADER_HEIGHT}
        afterHidden={afterHidden}
        afterInnerHeightMinus={afterFooterBottomOffset}
        afterNavigationItems={buildNavigationItemsSidekick({
          activeView: activeSidekickView,
          pipeline,
          project,
          secrets,
          setActiveSidekickView,
          variables: globalVariables,
        })}
        afterOverflow={ViewKeyEnum.DATA === activeSidekickView ? 'hidden' : null}
        afterSubheader={outputBlocks?.length > 0 && activeSidekickView === ViewKeyEnum.DATA && (
          <FlexContainer
            alignItems="center"
            fullHeight
            fullWidth
          >
            {!isDataIntegration && outputBlocks.map(block => {
              const { uuid: outputBlockUUID } = block;
              const selected = selectedOutputBlock?.uuid === outputBlockUUID;

              return (
                <Spacing key={outputBlockUUID} pl={1}>
                  <KeyboardShortcutButton
                    afterElement={selected
                      ?
                        <Button
                          basic
                          highlightOnHover
                          onClick={() => {
                            removeDataOutputBlockUUID(pipelineUUID, block.uuid);
                            setOutputBlocks(prevOutputBlocks =>
                              prevOutputBlocks.filter(({ uuid }) => uuid !== outputBlockUUID));
                          }}
                          padding="2px"
                          transparent
                        >
                          <Close muted size={UNIT * 1.25}/>
                        </Button>
                      : null
                    }
                    blackBorder
                    compact
                    muted
                    onClick={() => setSelectedOutputBlock(block)}
                    selected={selected}
                    uuid={outputBlockUUID}
                  >
                    {outputBlockUUID}
                  </KeyboardShortcutButton>
                </Spacing>
              );
            })}
            {isDataIntegration && integrationOutputsMemo}
          </FlexContainer>
        )}
        before={beforeToShow}
        beforeHeader={buttonTabs}
        beforeHeightOffset={HEADER_HEIGHT}
        beforeHidden={beforeHidden}
        beforeNavigationItems={buildNavigationItems(PageNameEnum.EDIT, pipeline)}
        errors={pipelineErrors || errors}
        footerOffset={mainContainerFooterRef?.current?.getBoundingClientRect()?.height}
        headerOffset={selectedFilePaths?.length > 0 ? 36 : 0}
        mainContainerFooter={mainContainerFooterMemo}
        mainContainerHeader={mainContainerHeaderMemo}
        mainContainerRef={mainContainerRef}
        page={page}
        pipeline={pipeline}
        setAfterHidden={setAfterHidden}
        setAfterWidthForChildren={setAfterWidthForChildren}
        setBeforeHidden={setBeforeHidden}
        setErrors={pipelineErrors ? setPipelineErrors : setErrors}
        setMainContainerWidth={setMainContainerWidth}
      >
        <div
          style={{
            height: selectedFilePath ? 0 : null,
            opacity: selectedFilePath ? 0 : null,
            visibility: selectedFilePath ? 'hidden' : null,
          }}
        >
          <ApiReloader uuid={`PipelineDetail/${pipelineUUID}`}>
            {pipelineDetailMemo}
          </ApiReloader>
        </div>

        {filePathsFromUrl?.map((filePath: string) => (
          <div
            key={filePath}
            style={{
              display: selectedFilePath === filePath
                ? null
                : 'none',
            }}
          >
            <ApiReloader uuid={`FileEditor/${decodeURIComponent(filePath)}`}>
              <FileEditor
                active={selectedFilePath === filePath}
                addNewBlock={(
                  b: BlockRequestPayloadType,
                  cb: (block: BlockType) => void,
                ) => {
                  addNewBlockAtIndex(
                    {
                      ...b,
                      require_unique_name: false,
                    },
                    blocks.length,
                    cb,
                    b.name,
                  );
                  router.push(`/pipelines/${pipelineUUID}/edit`);
                }}
                fetchPipeline={fetchPipeline}
                fetchVariables={fetchVariables}
                filePath={filePath}
                onUpdateFileSuccess={onUpdateFileSuccess}
                openSidekickView={openSidekickView}
                pipeline={pipeline}
                selectedFilePath={selectedFilePath}
                sendTerminalMessage={sendTerminalMessage}
                setDisableShortcuts={setDisableShortcuts}
                setErrors={setErrors}
                setFilesTouched={setFilesTouched}
                setSelectedBlock={setSelectedBlock}
              />
            </ApiReloader>
          </div>
        ))}

        <Spacing
          pb={(filePathFromUrl || sideBySideEnabled)
            ? 0
            : Math.max(
              Math.floor((heightWindow * (2 / 3)) / UNIT),
              0,
            )
          }
        />
      </PipelineLayout>
    </>
  );
}

PipelineDetailPage.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;
  const page = PAGE_NAME_EDIT;

  const initialProps = {
      page,
      pipeline: {
        uuid: pipelineUUID,
      },
    };

  return initialProps;
};

export default PrivateRoute(PipelineDetailPage);
