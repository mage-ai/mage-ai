import useWebSocket from 'react-use-websocket';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import AddChartMenu from '@components/CodeBlock/CommandButtons/AddChartMenu';
import BlockType, {
  BlockRequestPayloadType,
  BlockTypeEnum,
  SampleDataType,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import ContextMenu, { ContextMenuEnum } from '@components/ContextMenu';
import ErrorPopup from '@components/ErrorPopup';
import FileBrowser from '@components/FileBrowser';
import FileEditor from '@components/FileEditor';
import FileHeaderMenu from '@components/PipelineDetail/FileHeaderMenu';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Head from '@oracle/elements/Head';
import KernelStatus from '@components/PipelineDetail/KernelStatus';
import KernelOutputType, {
  DataTypeEnum,
  ExecutionStateEnum,
} from '@interfaces/KernelOutputType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineDetail from '@components/PipelineDetail';
import PipelineType, { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';
import RecommendationRow from '@components/RecommendationsWindow/RecommendationRow';
import RecommendationsWindow from '@components/RecommendationsWindow';
import Sidekick from '@components/Sidekick';
import Spacing from '@oracle/elements/Spacing';
import SuggestionType from '@interfaces/SuggestionType';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import usePrevious from '@utils/usePrevious';

import { Add, Close } from '@oracle/icons';
import {
  AFTER_DEFAULT_WIDTH,
  BEFORE_DEFAULT_WIDTH,
} from '@components/TripleLayout/index.style';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_WIDTH,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_WIDTH,
  get,
  set,
} from '@storage/localStorage';
import {
  NAV_ICON_MAPPING,
  SIDEKICK_VIEWS,
  VIEW_QUERY_PARAM,
  ViewKeyEnum,
} from '@components/Sidekick/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { addUnderscores, randomNameGenerator } from '@utils/string';
import {
  convertBlockUUIDstoBlockTypes,
  getDataOutputBlockUUIDs,
  initializeContentAndMessages,
  redirectToFirstPipeline,
  removeCollapsedBlockStates,
  removeDataOutputBlockUUID,
  updateCollapsedBlockStates,
} from '@components/PipelineDetail/utils';
import { equals, pushAtIndex, removeAtIndex } from '@utils/array';
import { getWebSocket } from '@api/utils/url';
import { goToWithQuery } from '@utils/routing';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';
import { useWindowSize } from '@utils/sizes';

type PipelineDetailPageProps = {
  pipeline: PipelineType;
};

function PipelineDetailPage({
  pipeline: pipelineProp,
}: PipelineDetailPageProps) {
  const router = useRouter();
  const {
    height: heightWindow,
    width: widthWindow,
  } = useWindowSize();
  const [afterWidth, setAfterWidth] = useState(
    get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_WIDTH, AFTER_DEFAULT_WIDTH));
  const [afterWidthForChildren, setAfterWidthForChildren] = useState<number>(null);
  const [beforeWidth, setBeforeWidth] = useState(
    get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_WIDTH, BEFORE_DEFAULT_WIDTH));
  const [afterHidden, setAfterHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN));
  const [beforeHidden, setBeforeHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);
  const [errors, setErrors] = useState(null);
  const [recentlyAddedChart, setRecentlyAddedChart] = useState(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);
  const [showAddCharts, setShowAddCharts] = useState<boolean>(false);
  const [filesTouched, setFilesTouched] = useState<{
    [filePath: string]: boolean;
  }>({});
  const [textareaFocused, setTextareaFocused] = useState<boolean>(false);
  const [anyInputFocused, setAnyInputFocused] = useState<boolean>(false);

  // Pipeline
  const [pipelineLastSaved, setPipelineLastSaved] = useState<Date>(null);
  const [pipelineContentTouched, setPipelineContentTouched] = useState<boolean>(false);
  const { data: pipelinesData, mutate: fetchPipelines } = api.pipelines.list();
  const pipelines = useMemo(() => pipelinesData?.pipelines, [pipelinesData]);
  const numPipelines = useMemo(() => pipelines?.length || 0, [pipelines]);

  const qUrl = queryFromUrl();
  const {
    [VIEW_QUERY_PARAM]: activeSidekickView,
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
  ) => {
    if (queryFromUrl()[VIEW_QUERY_PARAM] !== newView) {
      goToWithQuery({
        [VIEW_QUERY_PARAM]: newView,
      }, {
        pushHistory,
      });
    }
  }, []);
  useEffect(() => {
    if (!activeSidekickView) {
      setActiveSidekickView(ViewKeyEnum.TREE, false);
    }
  }, [activeSidekickView]);

  const openSidekickView = useCallback((
    newView: ViewKeyEnum,
    pushHistory?: boolean,
  ) => {
    setActiveSidekickView(newView, pushHistory);
    setAfterHidden(false);
  }, [setActiveSidekickView]);

  const refAddChart = useRef(null);
  const blockRefs = useRef({});
  const chartRefs = useRef({});
  const contentByBlockUUID = useRef({});
  const contentByWidgetUUID = useRef({});
  const mainContainerRef = useRef(null);
  const pipelineUUID = pipelineProp.uuid;
  const pipelineUUIDPrev = usePrevious(pipelineUUID);

  const setContentByBlockUUID = useCallback((data: {
    [uuid: string]: string;
  }) => {
    contentByBlockUUID.current = {
      ...contentByBlockUUID.current,
      ...data,
    };
  }, [contentByBlockUUID]);
  const onChangeCodeBlock = useCallback((uuid: string, value: string) => {
    setContentByBlockUUID({ [uuid]: value });
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
  useEffect(() => {
    if (mainContainerRef?.current && !afterMousedownActive && !beforeMousedownActive) {
      setMainContainerWidth(mainContainerRef.current.getBoundingClientRect().width);
    }
  }, [
    afterMousedownActive,
    beforeMousedownActive,
    afterHidden,
    afterWidth,
    beforeHidden,
    beforeWidth,
    mainContainerRef?.current,
    setMainContainerWidth,
    widthWindow,
  ]);

  useEffect(() => {
    if (!afterMousedownActive) {
      setAfterWidthForChildren(afterWidth);
      set(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_WIDTH, afterWidth);
    }
  }, [
    afterMousedownActive,
    afterWidth,
    setAfterWidthForChildren,
  ]);
  useEffect(() => {
    if (!beforeMousedownActive) {
      set(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_WIDTH, beforeWidth);
    }
  }, [
    beforeMousedownActive,
    beforeWidth,
  ]);

  // Variables
  const {
    data: dataGlobalVariables,
    mutate: fetchVariables,
  } = api.variables.pipelines.list(!afterHidden && pipelineUUID);
  const globalVariables = dataGlobalVariables?.variables;

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
    widgetTempData.current,
  ]);

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
  const [recsWindowOpenBlockIdx, setRecsWindowOpenBlockIdx] = useState<number>(null);

  const outputBlockUUIDsInit = getDataOutputBlockUUIDs(pipelineUUID);
  const outputBlocksInit = convertBlockUUIDstoBlockTypes(outputBlockUUIDsInit, blocks);
  const [outputBlocks, setOutputBlocks] = useState<BlockType[]>(outputBlocksInit);
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
    setPipelineLastSaved(null);
    setRunningBlocks([]);
    setSelectedBlock(null);
  }, []);
  useEffect(() => {
    if (pipelineUUID !== pipelineUUIDPrev) {
      contentByBlockUUID.current = {};
    }
  }, [pipelineUUID, pipelineUUIDPrev]);

  const {
    data: blockSampleData,
    mutate: fetchSampleData,
  } = api.blocks.pipelines.outputs.detail(
    !afterHidden && pipelineUUID,
    selectedOutputBlock?.type !== BlockTypeEnum.SCRATCHPAD
      && selectedOutputBlock?.type !== BlockTypeEnum.CHART
      && selectedOutputBlock?.uuid,
  );
  const sampleData: SampleDataType = blockSampleData?.outputs?.[0]?.sample_data;
  const {
    data: blockAnalysis,
    mutate: fetchAnalysis,
  } = api.blocks.pipelines.analyses.detail(
    !afterHidden && pipelineUUID,
    selectedOutputBlock?.type !== BlockTypeEnum.SCRATCHPAD
      && selectedOutputBlock?.type !== BlockTypeEnum.CHART
      && selectedOutputBlock?.uuid,
  );
  const {
    insights,
    metadata,
    statistics = {},
  } = blockAnalysis?.analyses?.[0] || {};
  const {
    data: selectedBlockAnalysis,
    mutate: fetchSecondBlockAnalysis,
  } = api.blocks.pipelines.analyses.detail(
    pipelineUUID,
    selectedBlock?.type !== BlockTypeEnum.CHART
      && recsWindowOpenBlockIdx !== null
      && selectedBlock?.uuid,
  );
  const selectedBlockSuggestions = selectedBlockAnalysis?.analyses?.[0]?.suggestions || [];

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
  }, [editingBlock.upstreamBlocks]);

  // Autocomplete items
  const {
    data: dataAutocompleteItems,
    mutate: fetchAutocompleteItems,
  } = api.autocomplete_items.list({}, {
    refreshInterval: false,
    revalidateOnFocus: true,
  });
  const autocompleteItems = dataAutocompleteItems?.autocomplete_items;

  // Kernels
  const [messages, setMessages] = useState<{
    [uuid: string]: KernelOutputType[];
  }>({});

  const {
    data,
    isLoading,
    mutate: fetchPipeline,
  } = api.pipelines.detail(pipelineUUID);
  const { data: filesData, mutate: fetchFileTree } = api.files.list();
  const pipeline = data?.pipeline;
  const {
    data: dataKernels,
    mutate: fetchKernels,
  } = api.kernels.list({}, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });
  const kernels = dataKernels?.kernels;
  const kernel =
    kernels?.find(({ name }) =>
      name === PIPELINE_TYPE_TO_KERNEL_NAME[pipeline?.type]
    ) || kernels?.[0];

  // Files
  const openFile = useCallback((filePath: string) => {
    const filePathEncoded = encodeURIComponent(filePath);
    let filePaths = queryFromUrl()['file_paths[]'] || [];
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    if (!filePaths.includes(filePathEncoded)) {
      filePaths.push(filePathEncoded);
    }
    goToWithQuery({
      'file_paths[]': filePaths,
      file_path: filePathEncoded,
    });
  }, []);

  useEffect(() => {
    setSelectedFilePath(filePathFromUrl);
  }, [
    filePathFromUrl,
  ]);
  useEffect(() => {
    if (!equals(filePathsFromUrl, selectedFilePaths)) {
      setSelectedFilePaths(filePathsFromUrl);
    }
  }, [
    filePathsFromUrl
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
            router.push('/pipelines/[...slug]', `/pipelines/${uuid}`);
            fetchFileTree();
            fetchPipelines();
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      ),
    },
  );

  const [updatePipeline, { isLoading: isPipelineUpdating }] = useMutation(
    api.pipelines.useUpdate(pipelineUUID, { update_content: true }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => setPipelineContentTouched(false),
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const savePipelineContent = useCallback((payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => {
    const {
      block: blockOverride,
      pipeline: pipelineOverride = {},
    } = payload || {};
    setPipelineLastSaved(new Date());

    // @ts-ignore
    return updatePipeline({
      pipeline: {
        ...pipeline,
        ...pipelineOverride,
        blocks: blocks.map((block: BlockType) => {
          let contentToSave = contentByBlockUUID.current[block.uuid];
          if (typeof contentToSave === 'undefined') {
            contentToSave = block.content;
          }

          const blockPayload: BlockType = {
            ...block,
            content: contentToSave,
            // @ts-ignore
            outputs: (BlockTypeEnum.SCRATCHPAD === block.type && messages[block.uuid])
              ? messages[block.uuid].map((d: KernelOutputType, idx: number) => ({
                text_data: JSON.stringify(d),
                variable_uuid: `${block.uuid}_${idx}`,
              }))
              : block.outputs,
          };

          if (blockOverride?.uuid === block.uuid) {
            Object.entries(blockOverride).forEach(([k, v]) => {
              blockPayload[k] = v;
            });
          }

          return blockPayload;
        }),
        widgets: widgets.map((block: BlockType) => {
          let contentToSave = contentByWidgetUUID.current[block.uuid];
          const tempData = widgetTempData.current[block.uuid] || {};

          if (typeof contentToSave === 'undefined') {
            contentToSave = block.content;
          }

          return {
            ...block,
            ...tempData,
            content: contentToSave,
            configuration: {
              ...block.configuration,
              ...tempData.configuration,
            },
          };
        }),
      },
    });
  }, [
    blocks,
    contentByBlockUUID.current,
    contentByWidgetUUID.current,
    messages,
    pipeline,
    setPipelineLastSaved,
    updatePipeline,
    widgetTempData.current,
    widgets,
  ]);

  const updatePipelineMetadata = useCallback((name: string, type?: PipelineTypeEnum) => {
    return savePipelineContent({
      pipeline: {
        name,
        type,
      },
    }).then((resp) => {
      if (resp?.data?.pipeline) {
        const { uuid } = resp.data.pipeline;
        fetchFileTree();
        if (type !== pipeline?.type) {
          fetchPipeline();
        }
        updateCollapsedBlockStates(blocks, pipelineUUID, uuid);
        router.push(`/pipelines/${uuid}`);
      }
    });
  }, [
    blocks,
    fetchFileTree,
    pipelineUUID,
    savePipelineContent,
    updateCollapsedBlockStates,
  ]);
  const [deletePipeline] = useMutation(
    (uuid: string) => api.pipelines.useDelete(uuid)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline: {
              uuid,
            },
          }) => {
            if (uuid === pipelineUUID) {
              redirectToFirstPipeline(pipelines, router);
            }
            removeCollapsedBlockStates(blocks, pipelineUUID);
            fetchFileTree();
            fetchPipelines();
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      ),
    },
  );

  const [deleteBlock] = useMutation(
    ({ uuid }: BlockType) => api.blocks.pipelines.useDelete(pipelineUUID, uuid)(),
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
              blocksPrevious.findIndex(({ uuid: uuid2 }: BlockType) => uuid === uuid2),
            ));
            fetchPipeline();
            setSelectedBlock(null);
            if (type === BlockTypeEnum.SCRATCHPAD) {
              fetchFileTree();
            }
          },
          onErrorCallback: ({
            url_parameters: urlParameters,
          }: {
            url_parameters: {
              block_uuid: string;
            };
          }, {
            messages,
          }) => {
            setMessages(messagesPrev => ({
              ...messagesPrev,
              [urlParameters.block_uuid]: messages.map(msg => ({
                data: `${msg}\n`,
                error: `${msg}\n`,
                type: DataTypeEnum.TEXT_PLAIN,
              })),
            }));
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
          onErrorCallback: ({
            url_parameters: urlParameters,
          }: {
            url_parameters: {
              block_uuid: string;
            };
          }, {
            messages,
          }) => {
            setMessages(messagesPrev => ({
              ...messagesPrev,
              [urlParameters.block_uuid]: messages.map(msg => ({
                data: `${msg}\n`,
                error: `${msg}\n`,
                type: DataTypeEnum.TEXT_PLAIN,
              })),
            }));
          },
        },
      ),
    },
  );

  const [deleteBlockFile] = useMutation(
    ({ type, uuid }: BlockType) => (
      api.blocks.useDelete(encodeURIComponent(`${type}/${uuid}`))()
    ),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchAutocompleteItems();
            fetchPipeline();
            fetchFileTree();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            displayMessage: 'Error deleting block file. ' +
              'Check that there are no downstream blocks, then try again.',
            response,
          }),
        },
      ),
    },
  );

  const [restartKernel] = useMutation(
    api.restart.kernels.useCreate(kernel?.id),
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
  const [interruptKernel] = useMutation(
    api.interrupt.kernels.useCreate(kernel?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (response) => {

          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const restartKernelWithConfirm = useCallback(() => {
    const warning = 'Do you want to restart the kernel? All variables will be cleared.';
    if (typeof window !== 'undefined' && window.confirm(warning)) {
      restartKernel();
    }
  }, [restartKernel]);

  const [createBlock] = useMutation(api.blocks.pipelines.useCreate(pipelineUUID));
  const addNewBlockAtIndex = useCallback((
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name: string = randomNameGenerator(),
  ): Promise<any> => {
    // @ts-ignore
    return createBlock({
      block: {
        name,
        priority: idx,
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
            setBlocks((previousBlocks) => pushAtIndex(block, idx, previousBlocks));
            onCreateCallback?.(block);
            setRecsWindowOpenBlockIdx(null);
            fetchFileTree();
            fetchPipeline();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      );
    });
  }, [
    createBlock,
    setBlocks,
  ]);

  // Widgets
  const {
    data: dataWidgets,
    mutate: fetchWidgets,
  } = api.widgets.pipelines.list(!afterHidden && pipelineUUID);
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
    activeSidekickView,
    chartRefs.current,
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
    chartRefs.current[recentlyAddedChart?.uuid],
    setRecentlyAddedChart,
  ]);

  useEffect(() => {
    if (pipelineUUIDPrev !== pipelineUUID) {
      setBlocks([]);
      setWidgets([]);
      setOutputBlocks([]);
    }
  }, [
    pipelineUUID,
    pipelineUUIDPrev,
  ]);

  useEffect(() => {
    if (typeof pipeline?.blocks !== 'undefined') {
      setBlocks(pipeline.blocks);
    }
  }, [
    pipeline?.blocks,
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
    outputBlocks?.length,
    outputBlocksInit?.length,
  ]);

  const blocksPrevious = usePrevious(blocks);
  useEffect(() => {
    if (typeof pipeline?.blocks !== 'undefined' && (!blocks.length
      || blocksPrevious?.map(({ uuid }) => uuid).sort() !== blocks?.map(({ uuid }) => uuid).sort()
    )) {
      const {
        content: contentByBlockUUIDResults,
        messages: messagesInit,
      } = initializeContentAndMessages(pipeline.blocks);
      contentByBlockUUID.current = contentByBlockUUIDResults;

      setMessages((messagesPrev) => ({
        ...messagesInit,
        ...messagesPrev,
      }));
    }
  }, [
    blocks,
    blocksPrevious,
    pipeline?.blocks,
    setBlocks,
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
    setBlocks,
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
        const blockRef = blockRefs.current[`${block.type}s/${block.uuid}.py`];
        blockRef?.current?.scrollIntoView();
      }
    } else if (blockType === BlockTypeEnum.CHART) {
      const chart = widgets.find(({ uuid }) => uuid === blockUUID);
      if (chart) {
        setSelectedBlock(chart);
        if (chartRefs?.current) {
          const chartRef = chartRefs.current[chart.uuid];
          chartRef?.current?.scrollIntoView();
        }
      }
    } else {
      openFile(filePath);
    }
  }, [
    blocks,
  ]);

  // WebSocket
  const {
    lastMessage,
    readyState,
    sendMessage,
  } = useWebSocket(getWebSocket(), {
    onOpen: () => console.log('socketUrlPublish opened'),
    shouldReconnect: (closeEvent) => {
      // Will attempt to reconnect on all close events, such as server shutting down
      console.log('Attempting to reconnect...');

      return true;
    },
  });

  useEffect(() => {
    if (lastMessage) {
      const message: KernelOutputType = JSON.parse(lastMessage.data);
      const {
        execution_state: executionState,
        uuid,
      } = message;

      // @ts-ignore
      setMessages((messagesPrevious) => {
        const messagesFromUUID = messagesPrevious[uuid] || [];

        return {
          ...messagesPrevious,
          [uuid]: messagesFromUUID.concat(message),
        };
      });

      if (ExecutionStateEnum.IDLE === executionState) {
        // @ts-ignore
        setRunningBlocks((runningBlocksPrevious) =>
          runningBlocksPrevious.filter(({ uuid: uuid2 }) => uuid !== uuid2),
        );
      }

      setPipelineContentTouched(true);
    }
  }, [
    lastMessage,
    setMessages,
    setPipelineContentTouched,
    setRunningBlocks,
  ]);

  const runBlock = useCallback((payload: {
    block: BlockType;
    code: string;
    ignoreAlreadyRunning?: boolean;
    runDownstream?: boolean;
    runUpstream?: boolean;
    runTests?: boolean;
  }) => {
    const {
      block,
      code,
      ignoreAlreadyRunning,
      runDownstream = false,
      runUpstream = false,
      runTests = false,
    } = payload;

    const { uuid } = block;
    const isAlreadyRunning = runningBlocks.find(({ uuid: uuid2 }) => uuid === uuid2);

    if (!isAlreadyRunning || ignoreAlreadyRunning) {
      sendMessage(JSON.stringify({
        code,
        pipeline_uuid: pipeline?.uuid,
        type: block.type,
        uuid,
        run_downstream: runDownstream,
        run_upstream: runUpstream,
        run_tests: runTests,
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
    }

    // Tommy Dang: what was this for?!
    // fetchPipeline();
  }, [
    fetchPipeline,
    pipeline,
    runningBlocks,
    sendMessage,
    setMessages,
    setRunningBlocks,
    setTextareaFocused,
  ]);

  const fileTreeRef = useRef(null);
  const fileTree = useMemo(() => (
    <ContextMenu
      areaRef={fileTreeRef}
      createPipeline={createPipeline}
      deleteBlockFile={deleteBlockFile}
      deletePipeline={deletePipeline}
      enableContextItem
      numPipelines={numPipelines}
      type={ContextMenuEnum.FILE_BROWSER}
    >
      <FileBrowser
        files={filesData?.files}
        onSelectBlockFile={onSelectBlockFile}
        openFile={openFile}
        openPipeline={(uuid: string) => {
          resetState();
          router.push('/pipelines/[...slug]', `/pipelines/${uuid}`);
        }}
        openSidekickView={openSidekickView}
        ref={fileTreeRef}
      />
    </ContextMenu>
  ), [
    filesData?.files,
    onSelectBlockFile,
  ]);

  const finalSidekickViews = outputBlocks?.length > 0
    ? SIDEKICK_VIEWS
    : SIDEKICK_VIEWS.filter(({ key }) => key !== ViewKeyEnum.DATA);
  const sideKick = useMemo(() => (
    <Sidekick
      activeView={activeSidekickView}
      afterWidth={afterWidthForChildren}
      autocompleteItems={autocompleteItems}
      blockRefs={blockRefs}
      blocks={blocks}
      chartRefs={chartRefs}
      deleteWidget={deleteWidget}
      editingBlock={editingBlock}
      fetchFileTree={fetchFileTree}
      fetchPipeline={fetchPipeline}
      globalVariables={globalVariables}
      insights={insights}
      messages={messages}
      metadata={metadata}
      onChangeChartBlock={onChangeChartBlock}
      pipeline={pipeline}
      runBlock={runBlock}
      runningBlocks={runningBlocks}
      sampleData={sampleData}
      savePipelineContent={savePipelineContent}
      selectedBlock={selectedBlock}
      setAnyInputFocused={setAnyInputFocused}
      setEditingBlock={setEditingBlock}
      setSelectedBlock={setSelectedBlock}
      setTextareaFocused={setTextareaFocused}
      statistics={statistics}
      textareaFocused={textareaFocused}
      updateWidget={updateWidget}
      widgets={widgets}
    />
  ), [
    activeSidekickView,
    afterWidthForChildren,
    autocompleteItems,
    blockRefs,
    blocks,
    deleteWidget,
    editingBlock,
    fetchFileTree,
    fetchPipeline,
    globalVariables,
    insights,
    messages,
    metadata,
    onChangeChartBlock,
    pipeline,
    runBlock,
    runningBlocks,
    sampleData,
    savePipelineContent,
    selectedBlock,
    setAnyInputFocused,
    setEditingBlock,
    setTextareaFocused,
    statistics,
    textareaFocused,
    updateWidget,
    widgets,
  ]);

  const pipelineDetailMemo = useMemo(() => (
    <PipelineDetail
      addNewBlockAtIndex={addNewBlockAtIndex}
      addWidget={(
        widget: BlockType,
        {
          onCreateCallback,
        }: {
          onCreateCallback?: (block: BlockType) => void;
        },
      ) => addWidgetAtIndex(widget, widgets.length, onCreateCallback)}
      anyInputFocused={anyInputFocused}
      autocompleteItems={autocompleteItems}
      blockRefs={blockRefs}
      blocks={blocks}
      deleteBlock={deleteBlock}
      fetchFileTree={fetchFileTree}
      fetchPipeline={fetchPipeline}
      interruptKernel={interruptKernel}
      isPipelineUpdating={isPipelineUpdating}
      kernel={kernel}
      mainContainerRef={mainContainerRef}
      mainContainerWidth={mainContainerWidth}
      messages={messages}
      onChangeCodeBlock={onChangeCodeBlock}
      openSidekickView={openSidekickView}
      pipeline={pipeline}
      pipelineContentTouched={pipelineContentTouched}
      pipelineLastSaved={pipelineLastSaved}
      restartKernel={restartKernel}
      runBlock={runBlock}
      runningBlocks={runningBlocks}
      savePipelineContent={savePipelineContent}
      selectedBlock={selectedBlock}
      setAnyInputFocused={setAnyInputFocused}
      setEditingBlock={setEditingBlock}
      setMessages={setMessages}
      setOutputBlocks={setOutputBlocks}
      setPipelineContentTouched={setPipelineContentTouched}
      setRecsWindowOpenBlockIdx={setRecsWindowOpenBlockIdx}
      setRunningBlocks={setRunningBlocks}
      setSelectedBlock={setSelectedBlock}
      setSelectedOutputBlock={setSelectedOutputBlock}
      setTextareaFocused={setTextareaFocused}
      textareaFocused={textareaFocused}
      widgets={widgets}
    />
  ), [
    addNewBlockAtIndex,
    addWidgetAtIndex,
    anyInputFocused,
    autocompleteItems,
    blockRefs,
    blocks,
    deleteBlock,
    fetchFileTree,
    fetchPipeline,
    interruptKernel,
    isPipelineUpdating,
    kernel,
    mainContainerRef,
    mainContainerWidth,
    messages,
    onChangeCodeBlock,
    pipeline,
    pipelineContentTouched,
    pipelineLastSaved,
    restartKernel,
    runBlock,
    runningBlocks,
    savePipelineContent,
    selectedBlock,
    setAnyInputFocused,
    setEditingBlock,
    setMessages,
    setPipelineContentTouched,
    setRunningBlocks,
    setSelectedBlock,
    setTextareaFocused,
    textareaFocused,
    widgets,
  ]);
  const mainContainerHeaderMemo = useMemo(() => (
    <KernelStatus
      filePaths={selectedFilePaths}
      filesTouched={filesTouched}
      isBusy={runningBlocks.length >= 1}
      isPipelineUpdating={isPipelineUpdating}
      kernel={kernel}
      pipeline={pipeline}
      pipelineContentTouched={pipelineContentTouched}
      pipelineLastSaved={pipelineLastSaved}
      restartKernel={restartKernel}
      selectedFilePath={selectedFilePath}
      updatePipelineMetadata={updatePipelineMetadata}
    />
  ), [
    filesTouched,
    isPipelineUpdating,
    kernel,
    pipeline,
    pipelineContentTouched,
    pipelineLastSaved,
    restartKernel,
    runningBlocks,
    selectedFilePath,
    selectedFilePaths,
    updatePipelineMetadata,
  ]);

  const afterHeader = useMemo(() => {
    const validBlocks = blocks.filter(({ type }) => BlockTypeEnum.SCRATCHPAD !== type);

    return (
      <FlexContainer
        alignItems="center"
        fullWidth
        justifyContent="space-between"
      >
        <Flex>
          {finalSidekickViews.map(({ key, label }: any) => {
            const active = key === activeSidekickView;
            const Icon = NAV_ICON_MAPPING[key];

            return (
              <Spacing key={key} pl={1}>
                <KeyboardShortcutButton
                  beforeElement={<Icon />}
                  blackBorder
                  compact
                  onClick={() => setActiveSidekickView(key)}
                  selected={active}
                  uuid={key}
                >
                  {label}
                </KeyboardShortcutButton>
              </Spacing>
            );
          })}
        </Flex>

        <Spacing
          px={1}
          ref={refAddChart}
          style={{
            position: 'relative',
          }}
        >
          <KeyboardShortcutButton
            beforeElement={<Add />}
            blackBorder
            compact
            onClick={() => setShowAddCharts(true)}
            primaryGradient
            uuid="Pipeline/afterHeader/add_chart"
          >
            Add chart
          </KeyboardShortcutButton>

          <ClickOutside
            disableEscape
            onClickOutside={() => setShowAddCharts(false)}
            open={showAddCharts}
          >
            <AddChartMenu
              addWidget={(
                widget: BlockType,
                {
                  onCreateCallback,
                }: {
                  onCreateCallback?: (block: BlockType) => void;
                },
              ) => addWidgetAtIndex(widget, widgets.length, onCreateCallback)}
              block={validBlocks[validBlocks.length - 1]}
              onClickCallback={() => setShowAddCharts(false)}
              open={showAddCharts}
              parentRef={refAddChart}
              rightOffset={UNIT * 2}
              runBlock={runBlock}
            />
          </ClickOutside>
        </Spacing>
      </FlexContainer>
    );
  }, [
    addWidgetAtIndex,
    blocks,
    finalSidekickViews,
    refAddChart,
    runBlock,
    setShowAddCharts,
    showAddCharts,
    widgets,
  ]);

  return (
    <>
      <Head title={pipeline?.name} />

      <TripleLayout
        after={sideKick}
        afterHeader={afterHeader}
        afterHidden={afterHidden}
        afterMousedownActive={afterMousedownActive}
        afterSubheader={outputBlocks?.length > 0 && activeSidekickView === ViewKeyEnum.DATA && (
          <FlexContainer
            alignItems="center"
            fullHeight
            fullWidth
          >
            {outputBlocks.map(block => {
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
          </FlexContainer>
        )}
        afterWidth={afterWidth}
        before={fileTree}
        beforeHeader={(
          <FileHeaderMenu
            createPipeline={createPipeline}
            interruptKernel={interruptKernel}
            restartKernel={restartKernel}
            savePipelineContent={savePipelineContent}
            setMessages={setMessages}
          />
        )}
        beforeHidden={beforeHidden}
        beforeMousedownActive={beforeMousedownActive}
        beforeWidth={beforeWidth}
        mainContainerHeader={mainContainerHeaderMemo}
        mainContainerRef={mainContainerRef}
        setAfterHidden={setAfterHidden}
        setAfterMousedownActive={setAfterMousedownActive}
        setAfterWidth={setAfterWidth}
        setBeforeHidden={setBeforeHidden}
        setBeforeMousedownActive={setBeforeMousedownActive}
        setBeforeWidth={setBeforeWidth}
      >
        {!selectedFilePath && pipelineDetailMemo}

        {filePathsFromUrl?.map((filePath: string) => (
          <div
            key={filePath}
            style={{
              display: selectedFilePath === filePath
                ? null
                : 'none',
            }}
          >
            <FileEditor
              active={selectedFilePath === filePath}
              addNewBlock={(b: BlockRequestPayloadType) => {
                addNewBlockAtIndex(b, blocks.length, setSelectedBlock, b.name);
                router.push(`/pipelines/${pipelineUUID}`);
              }}
              filePath={filePath}
              pipeline={pipeline}
              setFilesTouched={setFilesTouched}
            />
          </div>
        ))}

        <Spacing
          pb={Math.max(
            Math.floor((heightWindow / 2) / UNIT),
            0,
          )}
        />
      </TripleLayout>

      {errors && (
        <ErrorPopup
          {...errors}
          onClose={() => setErrors(null)}
        />
      )}

      {recsWindowOpenBlockIdx !== null &&
        <RecommendationsWindow
          addNewBlockAtIndex={addNewBlockAtIndex}
          blockInsertionIndex={recsWindowOpenBlockIdx}
          blocks={blocks}
          loading={!selectedBlockAnalysis && selectedBlock !== null}
          selectedBlock={selectedBlock}
          setRecsWindowOpenBlockIdx={setRecsWindowOpenBlockIdx}
          setSelectedBlock={setSelectedBlock}
          suggestions={selectedBlockSuggestions}
        >
          {selectedBlockSuggestions?.map((suggestion: SuggestionType, idx: number) => (
            <RecommendationRow
              key={`${addUnderscores(suggestion.title)}_${idx}`}
              suggestion={suggestion}
            />
          ))}
        </RecommendationsWindow>
      }
    </>
  );
}

PipelineDetailPage.getInitialProps = async (ctx: any) => {
  const { slug: slugArray }: { slug: string[] } = ctx.query;
  let pipelineUUID;

  if (Array.isArray(slugArray)) {
    pipelineUUID = slugArray[0];
  }

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PipelineDetailPage;
