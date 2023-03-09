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
import ApiReloader from '@components/ApiReloader';
import AuthToken from '@api/utils/AuthToken';
import BlockType, {
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  SampleDataType,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import ConfigureBlock from '@components/PipelineDetail/ConfigureBlock';
import DataProviderType from '@interfaces/DataProviderType';
import FileBrowser from '@components/FileBrowser';
import FileEditor from '@components/FileEditor';
import FileHeaderMenu from '@components/PipelineDetail/FileHeaderMenu';
import FileTabs from '@components/PipelineDetail/FileTabs';
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
import PipelineLayout from '@components/PipelineLayout';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import PipelineType, { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import RecommendationRow from '@components/RecommendationsWindow/RecommendationRow';
import RecommendationsWindow from '@components/RecommendationsWindow';
import Sidekick from '@components/Sidekick';
import Spacing from '@oracle/elements/Spacing';
import SuggestionType from '@interfaces/SuggestionType';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { Add, Close } from '@oracle/icons';
import { INTERNAL_OUTPUT_REGEX } from '@utils/models/output';
import { LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS } from '@storage/constants';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN,
  get,
} from '@storage/localStorage';
import {
  FILE_EXTENSION_TO_LANGUAGE_MAPPING_REVERSE,
  SpecialFileEnum,
} from '@interfaces/FileType';
import {
  NAV_ICON_MAPPING,
  SIDEKICK_VIEWS,
  VIEW_QUERY_PARAM,
  ViewKeyEnum,
} from '@components/Sidekick/constants';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { PAGE_NAME_EDIT } from '@components/PipelineDetail/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  convertBlockUUIDstoBlockTypes,
  getDataOutputBlockUUIDs,
  initializeContentAndMessages,
  removeDataOutputBlockUUID,
  updateCollapsedBlockStates,
} from '@components/PipelineDetail/utils';
import { equals, find, indexBy, removeAtIndex } from '@utils/array';
import { getWebSocket } from '@api/utils/url';
import { goToWithQuery } from '@utils/routing';
import { isEmptyObject } from '@utils/hash';
import { isJsonString, randomNameGenerator } from '@utils/string';
import { parseErrorFromResponse, onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';
import { useModal } from '@context/Modal';
import { useWindowSize } from '@utils/sizes';

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
  const router = useRouter();
  const {
    height: heightWindow,
  } = useWindowSize();
  const [afterHidden, setAfterHidden] = useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN));
  const [afterWidthForChildren, setAfterWidthForChildren] = useState<number>(null);
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
  const [disableShortcuts, setDisableShortcuts] = useState<boolean>(false);

  const mainContainerRef = useRef(null);

  // Kernels
  const [messages, setMessages] = useState<{
    [uuid: string]: KernelOutputType[];
  }>({});
  const [pipelineMessages, setPipelineMessages] = useState<KernelOutputType[]>([]);

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
      name === PIPELINE_TYPE_TO_KERNEL_NAME[pipeline?.type],
    ) || kernels?.[0];

  // Pipeline
  const pipelineUUID = pipelineProp.uuid;
  const pipelineUUIDPrev = usePrevious(pipelineUUID);
  const {
    data,
    mutate: fetchPipeline,
  } = api.pipelines.detail(pipelineUUID, {
    includes_outputs: isEmptyObject(messages),
  });
  const { data: filesData, mutate: fetchFileTree } = api.files.list();
  const files = useMemo(() => filesData?.files || [], [filesData]);
  const projectName = useMemo(() => files?.[0]?.name, [files]);
  const pipeline = data?.pipeline;

  const isIntegration = useMemo(() => PipelineTypeEnum.INTEGRATION === pipeline?.type, [pipeline]);

  useEffect(() => {
    if (data?.error) {
      setErrors({
        errors: parseErrorFromResponse(data),
        response: data,
      });
    }
  }, [data]);
  const [pipelineLastSaved, setPipelineLastSaved] = useState<Date>(null);
  const [pipelineContentTouched, setPipelineContentTouched] = useState<boolean>(false);

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
  }, [activeSidekickView, setActiveSidekickView]);

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
  const callbackByBlockUUID = useRef({});
  const contentByBlockUUID = useRef({});
  const contentByWidgetUUID = useRef({});

  const setCallbackByBlockUUID = useCallback((data: {
    [uuid: string]: string;
  }) => {
    callbackByBlockUUID.current = {
      ...callbackByBlockUUID.current,
      ...data,
    };
  }, [callbackByBlockUUID]);
  const setContentByBlockUUID = useCallback((data: {
    [uuid: string]: string;
  }) => {
    contentByBlockUUID.current = {
      ...contentByBlockUUID.current,
      ...data,
    };
  }, [contentByBlockUUID]);
  const onChangeCallbackBlock = useCallback((uuid: string, value: string) => {
    setCallbackByBlockUUID({ [uuid]: value });
    setPipelineContentTouched(true);
  },
    [
      setCallbackByBlockUUID,
      setPipelineContentTouched,
    ],
  );
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

  // Data providers
  const { data: dataDataProviders } = api.data_providers.list({}, {
    revalidateOnFocus: true,
  });
  const dataProviders: DataProviderType[] = dataDataProviders?.data_providers;

  // Variables
  const {
    data: dataGlobalVariables,
    mutate: fetchVariables,
  } = api.variables.pipelines.list(pipelineUUID);
  const globalVariables = dataGlobalVariables?.variables;

  // Secrets
  const {
    data: dataSecrets,
    mutate: fetchSecrets,
  } = api.secrets.list();
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
  const [recsWindowOpenBlockIdx, setRecsWindowOpenBlockIdx] = useState<number>(null);

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
    setPipelineLastSaved(null);
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
    data: blockSampleData,
    mutate: fetchSampleData,
  } = api.blocks.pipelines.outputs.detail(
    !afterHidden && pipelineUUID,
    selectedOutputBlock?.type !== BlockTypeEnum.SCRATCHPAD
      && selectedOutputBlock?.type !== BlockTypeEnum.CHART
      && selectedOutputBlock?.uuid
      && encodeURIComponent(selectedOutputBlock?.uuid),
  );
  const sampleData: SampleDataType = useMemo(() => {
    if (isIntegration) {
      return find(
        blockSampleData?.outputs,
        ({ variable_uuid }) => variable_uuid === `output_sample_data_${selectedStream}`,
      )?.sample_data;
    } else {
      return blockSampleData?.outputs?.[0]?.sample_data;
    }
  }, [blockSampleData, isIntegration, selectedStream]);
  const {
    data: blockAnalysis,
    mutate: fetchAnalysis,
  } = api.blocks.pipelines.analyses.detail(
    !afterHidden && pipelineUUID,
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
  }, [editingBlock.upstreamBlocks, setActiveSidekickView]);

  // Autocomplete items
  const {
    data: dataAutocompleteItems,
    mutate: fetchAutocompleteItems,
  } = api.autocomplete_items.list({}, {
    refreshInterval: false,
    revalidateOnFocus: true,
  });
  const autocompleteItems = dataAutocompleteItems?.autocomplete_items;

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
    filePathsFromUrl,
    selectedFilePaths,
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
    pipeline?: PipelineType | {
      name: string;
      type: string;
    };
  }, opts?: {
    contentOnly?: boolean;
  }) => {
    const {
      block: blockOverride,
      pipeline: pipelineOverride = {},
    } = payload || {};
    const { contentOnly } = opts || {};

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

          let callbackToSave = callbackByBlockUUID.current[block.uuid];
          if (typeof callbackToSave === 'undefined') {
            callbackToSave = block.callback_content;
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

          const blockPayload: BlockType = {
            ...block,
            callback_content: callbackToSave,
            content: contentToSave,
            outputs,
          };

          if (blockOverride?.uuid === block.uuid) {
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
            return {
              callback_content: blockPayload.callback_content,
              content: blockPayload.content,
              outputs: blockPayload.outputs,
              uuid: blockPayload.uuid,
            };
          }

          return blockPayload;
        }),
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
    messages,
    pipeline,
    setPipelineLastSaved,
    updatePipeline,
    widgets,
  ]);

  // // Files
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
    goToWithQuery({
      'file_paths[]': filePaths,
      file_path: filePathEncoded,
    });
  }, [
    savePipelineContent,
  ]);

  const updatePipelineMetadata = useCallback((name: string, type?: PipelineTypeEnum) => savePipelineContent({
      pipeline: {
        name,
        type,
      },
    }).then((resp) => {
      if (resp?.data?.pipeline) {
        const { uuid } = resp.data.pipeline;

        if (pipelineUUID !== uuid) {
          window.location.href = `/pipelines/${uuid}/edit`;
        } else {
          fetchFileTree();
          if (type !== pipeline?.type) {
            fetchPipeline();
          }
          updateCollapsedBlockStates(blocks, pipelineUUID, uuid);
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
    blocks,
    fetchFileTree,
    fetchPipeline,
    openFile,
    pipeline?.type,
    pipelineUUID,
    savePipelineContent,
  ]);

  const [deleteBlock] = useMutation(
    ({
      uuid,
    }: BlockType) => api.blocks.pipelines.useDelete(
      pipelineUUID,
      encodeURIComponent(uuid),
    )(),
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
          onErrorCallback: (response, errors) => setErrors({
            displayMessage: 'Error deleting block file. ' +
              'Check that there are no downstream blocks, then try again.',
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [updateKernel] = useMutation(
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
  // @ts-ignore
  const restartKernel = useCallback(() => updateKernel({
    kernel: {
      action_type: 'restart',
    },
  }), [updateKernel]);
  // @ts-ignore
  const interruptKernel = useCallback(() => updateKernel({
    kernel: {
      action_type: 'interrupt',
    },
  }), [updateKernel]);

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
    let blockContent;
    if (block.converted_from) {
      blockContent = contentByBlockUUID.current[block.converted_from];
    }

    const {
      language: blockLanguage,
      type: blockType,
    } = block;

    if (isIntegration) {
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
    return createBlock({
      block: {
        content: blockContent,
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
            onCreateCallback?.(block);
            setRecsWindowOpenBlockIdx(null);
            fetchFileTree();
            fetchPipeline().then(({
              pipeline: {
                blocks: blocksNew,
              },
            }) => setBlocks((blocksPrev) => {
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
            }));
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
    fetchFileTree,
    fetchPipeline,
    isIntegration,
    setBlocks,
    setErrors,
    pipeline,
  ]);

  const [automaticallyNameBlocks, setAutomaticallyNameBlocks] = useState<boolean>(false);
  useEffect(() => {
    setAutomaticallyNameBlocks(!!get(LOCAL_STORAGE_KEY_AUTOMATICALLY_NAME_BLOCKS));
  }, []);

  const [showModal, hideModal] = useModal(({
    block,
    idx,
    name = randomNameGenerator(),
    onCreateCallback,
  }:{
    block: BlockRequestPayloadType,
    idx: number,
    name: string,
    onCreateCallback?: (block: BlockType) => void,
  }) => (
    <ConfigureBlock
      block={block}
      defaultName={name}
      onClose={hideModal}
      onSave={(opts: {
        name?: string;
      } = {}) => addNewBlockAtIndex(
        block,
        idx,
        onCreateCallback,
        opts?.name,
      ).then(() => hideModal())}
      pipeline={pipeline}
    />
  ), {
  }, [
    addNewBlockAtIndex,
    pipeline,
  ], {
    background: true,
    uuid: 'configure_block_name_and_create',
  });

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
    outputBlocks,
    outputBlocksInit,
  ]);

  const blocksPrevious = usePrevious(blocks);
  useEffect(() => {
    if (
      typeof pipeline?.blocks !== 'undefined'
        && (
          !blocks.length
            || !equals(
              blocksPrevious?.map(({ uuid }) => uuid).sort(),
              blocks?.map(({ uuid }) => uuid).sort(),
            )
          )
    ) {
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

      setMessages((messagesPrev) => {
        return {
          ...messagesInit,
          ...messagesPrev,
        };
      });
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
      goToWithQuery({
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
      const block = blocks.find(({ uuid }) => blockUUIDFromUrl === uuid);
      if (block) {
        onSelectBlockFile(block.uuid, block.type, null);
      }
    } else if (blocksPrevious?.length !== blocks?.length && selectedBlock) {
      onSelectBlockFile(selectedBlock.uuid, selectedBlock.type, null);
    }
  }, [
    blockUUIDFromUrl,
    blocksPrevious?.length,
    blocks,
    onSelectBlockFile,
    selectedBlock,
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
    // lastMessage,
    // readyState,
    sendMessage,
  } = useWebSocket(getWebSocket(), {
    onMessage: (lastMessage) => {
      if (lastMessage) {
        const message: KernelOutputType = JSON.parse(lastMessage.data);
        const {
          execution_state: executionState,
          msg_type: msgType,
          uuid,
        } = message;

        const block = blocks.find(({ uuid: uuid2 }) => uuid === uuid2);

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

        setPipelineContentTouched(true);
      }
    },
    onOpen: () => console.log('socketUrlPublish opened'),
    shouldReconnect: (closeEvent) => {
      // Will attempt to reconnect on all close events, such as server shutting down
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

  const runBlockOrig = useCallback((payload: {
    block: BlockType;
    code: string;
    ignoreAlreadyRunning?: boolean;
    runDownstream?: boolean;
    runSettings?: {
      run_model?: boolean;
    };
    runUpstream?: boolean;
    runTests?: boolean;
  }) => {
    const {
      block,
      code,
      ignoreAlreadyRunning,
      runDownstream = false,
      runSettings = {},
      runUpstream = false,
      runTests = false,
    } = payload;

    const { uuid } = block;
    const isAlreadyRunning = runningBlocks.find(({ uuid: uuid2 }) => uuid === uuid2);

    if (!isAlreadyRunning || ignoreAlreadyRunning) {
      sendMessage(JSON.stringify({
        ...sharedWebsocketData,
        code,
        pipeline_uuid: pipeline?.uuid,
        run_downstream: runDownstream,
        run_settings: runSettings,
        run_tests: runTests,
        run_upstream: runUpstream,
        type: block.type,
        uuid,
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

    return savePipelineContent({
      block: {
        outputs: [],
        uuid: block.uuid,
      },
    }, {
      contentOnly: true,
    }).then(() => runBlockOrig(payload));
  }, [
    runBlockOrig,
    savePipelineContent,
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
      cancelPipeline={cancelPipeline}
      chartRefs={chartRefs}
      deleteWidget={deleteWidget}
      editingBlock={editingBlock}
      executePipeline={executePipeline}
      fetchFileTree={fetchFileTree}
      fetchPipeline={fetchPipeline}
      fetchSecrets={fetchSecrets}
      fetchVariables={fetchVariables}
      globalVariables={globalVariables}
      insights={insights}
      interruptKernel={interruptKernel}
      isPipelineExecuting={isPipelineExecuting}
      messages={messages}
      metadata={metadata}
      onChangeChartBlock={onChangeChartBlock}
      pipeline={pipeline}
      pipelineMessages={pipelineMessages}
      runBlock={runBlock}
      runningBlocks={runningBlocks}
      sampleData={sampleData}
      savePipelineContent={savePipelineContent}
      secrets={secrets}
      selectedBlock={selectedBlock}
      selectedFilePath={selectedFilePath}
      setAnyInputFocused={setAnyInputFocused}
      setDisableShortcuts={setDisableShortcuts}
      setEditingBlock={setEditingBlock}
      setErrors={setErrors}
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
    cancelPipeline,
    deleteWidget,
    editingBlock,
    executePipeline,
    fetchFileTree,
    fetchPipeline,
    fetchSecrets,
    fetchVariables,
    globalVariables,
    insights,
    interruptKernel,
    isPipelineExecuting,
    messages,
    metadata,
    onChangeChartBlock,
    pipeline,
    pipelineMessages,
    runBlock,
    runningBlocks,
    sampleData,
    savePipelineContent,
    secrets,
    selectedBlock,
    selectedFilePath,
    setAnyInputFocused,
    setEditingBlock,
    setErrors,
    setTextareaFocused,
    statistics,
    textareaFocused,
    updateWidget,
    widgets,
  ]);

  const pipelineDetailMemo = useMemo(() => (
    <PipelineDetail
      addNewBlockAtIndex={automaticallyNameBlocks
        ? addNewBlockAtIndex
        : (block, idx, onCreateCallback, name) => new Promise((resolve, reject) => {
            if (BlockTypeEnum.DBT === block?.type && BlockLanguageEnum.SQL === block?.language) {
              addNewBlockAtIndex(block, idx, onCreateCallback, name);
            } else {
              // @ts-ignore
              showModal({ block, idx, name, onCreateCallback });
            }
          })
      }
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
      dataProviders={dataProviders}
      deleteBlock={deleteBlock}
      disableShortcuts={disableShortcuts}
      fetchFileTree={fetchFileTree}
      fetchPipeline={fetchPipeline}
      fetchSampleData={fetchSampleData}
      files={files}
      globalVariables={globalVariables}
      interruptKernel={interruptKernel}
      isPipelineUpdating={isPipelineUpdating}
      kernel={kernel}
      mainContainerRef={mainContainerRef}
      mainContainerWidth={mainContainerWidth}
      messages={messages}
      onChangeCallbackBlock={onChangeCallbackBlock}
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
      setErrors={setErrors}
      setIntegrationStreams={setIntegrationStreams}
      setMessages={setMessages}
      setOutputBlocks={setOutputBlocks}
      setPipelineContentTouched={setPipelineContentTouched}
      setRecsWindowOpenBlockIdx={setRecsWindowOpenBlockIdx}
      setRunningBlocks={setRunningBlocks}
      setSelectedBlock={setSelectedBlock}
      setSelectedOutputBlock={setSelectedOutputBlock}
      setSelectedStream={setSelectedStream}
      setTextareaFocused={setTextareaFocused}
      textareaFocused={textareaFocused}
      widgets={widgets}
    />
  ), [
    addNewBlockAtIndex,
    addWidgetAtIndex,
    anyInputFocused,
    autocompleteItems,
    automaticallyNameBlocks,
    blockRefs,
    blocks,
    dataProviders,
    deleteBlock,
    disableShortcuts,
    fetchFileTree,
    fetchPipeline,
    fetchSampleData,
    files,
    globalVariables,
    interruptKernel,
    isPipelineUpdating,
    kernel,
    mainContainerRef,
    mainContainerWidth,
    messages,
    onChangeCallbackBlock,
    onChangeCodeBlock,
    openSidekickView,
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
    setErrors,
    setMessages,
    setPipelineContentTouched,
    setRunningBlocks,
    setSelectedBlock,
    setTextareaFocused,
    showModal,
    textareaFocused,
    widgets,
  ]);

  const mainContainerHeaderMemo = useMemo(() => {
    if (page === PAGE_NAME_EDIT) {
      return (
        <>
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
            savePipelineContent={savePipelineContent}
            selectedFilePath={selectedFilePath}
            setErrors={setErrors}
            updatePipelineMetadata={updatePipelineMetadata}
          />
          {selectedFilePaths?.length > 0 &&
            <FileTabs
              filePaths={selectedFilePaths}
              filesTouched={filesTouched}
              savePipelineContent={savePipelineContent}
              selectedFilePath={selectedFilePath}
            />
          }
        </>
      );
    }
  }, [
    filesTouched,
    isPipelineUpdating,
    kernel,
    page,
    pipeline,
    pipelineContentTouched,
    pipelineLastSaved,
    restartKernel,
    runningBlocks,
    savePipelineContent,
    selectedFilePath,
    selectedFilePaths,
    setErrors,
    updatePipelineMetadata,
  ]);

  const afterHeader = useMemo(() => {
    const validBlocks = blocks?.filter(({ type }) => BlockTypeEnum.SCRATCHPAD !== type);

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
                  beforeElement={Icon && <Icon />}
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
            disabled={validBlocks?.length === 0}
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
    activeSidekickView,
    addWidgetAtIndex,
    blocks,
    finalSidekickViews,
    refAddChart,
    runBlock,
    setActiveSidekickView,
    setShowAddCharts,
    showAddCharts,
    widgets,
  ]);

  const integrationOutputsMemo = useMemo(
    () => integrationStreams
      ?.filter(stream => find(
        blockSampleData?.outputs,
        ({ variable_uuid }) => variable_uuid === `output_sample_data_${stream}`,
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
    [blockSampleData, integrationStreams, selectedStream]
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
      deleteBlockFile={deleteBlockFile}
      deleteWidget={deleteWidget}
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
    deleteBlockFile,
    deleteWidget,
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

  const beforeHeader = useMemo(() => {
    if (page === PAGE_NAME_EDIT) {
      return (
        <FileHeaderMenu
          cancelPipeline={cancelPipeline}
          createPipeline={createPipeline}
          executePipeline={executePipeline}
          interruptKernel={interruptKernel}
          isPipelineExecuting={isPipelineExecuting}
          restartKernel={restartKernel}
          savePipelineContent={savePipelineContent}
          setMessages={setMessages}
        />
      );
    }
  }, [
    cancelPipeline,
    createPipeline,
    executePipeline,
    interruptKernel,
    isPipelineExecuting,
    page,
    restartKernel,
    savePipelineContent,
    setMessages,
  ]);

  return (
    <>
      <Head title={pipeline?.name} />

      <PipelineLayout
        after={sideKick}
        afterHeader={afterHeader}
        afterHidden={afterHidden}
        afterSubheader={outputBlocks?.length > 0 && activeSidekickView === ViewKeyEnum.DATA && (
          <FlexContainer
            alignItems="center"
            fullHeight
            fullWidth
          >
            {!isIntegration && outputBlocks.map(block => {
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
            {isIntegration && integrationOutputsMemo}
          </FlexContainer>
        )}
        before={before}
        beforeHeader={beforeHeader}
        errors={errors}
        headerOffset={selectedFilePaths?.length > 0 ? 36 : 0}
        mainContainerHeader={mainContainerHeaderMemo}
        mainContainerRef={mainContainerRef}
        page={page}
        pipeline={pipeline}
        projectName={projectName}
        setAfterHidden={setAfterHidden}
        setAfterWidthForChildren={setAfterWidthForChildren}
        setErrors={setErrors}
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
                    b,
                    blocks.length,
                    cb,
                    b.name,
                  );
                  router.push(`/pipelines/${pipelineUUID}/edit`);
                }}
                fetchPipeline={fetchPipeline}
                fetchVariables={fetchVariables}
                filePath={filePath}
                openSidekickView={openSidekickView}
                pipeline={pipeline}
                selectedFilePath={selectedFilePath}
                setErrors={setErrors}
                setFilesTouched={setFilesTouched}
                setSelectedBlock={setSelectedBlock}
              />
            </ApiReloader>
          </div>
        ))}

        <Spacing
          pb={filePathFromUrl
            ? 0
            : Math.max(
              Math.floor((heightWindow * (2 / 3)) / UNIT),
              0,
            )
          }
        />
      </PipelineLayout>

      {/*{recsWindowOpenBlockIdx !== null &&
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
      }*/}
    </>
  );
}

PipelineDetailPage.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;
  const page = PAGE_NAME_EDIT;

  // let pipelineScheduleId;
  // let pipelineScheduleAction;
  // let newPipelineSchedule = false;

  // if (Array.isArray(slugArray)) {
  //   pipelineUUID = slugArray[0];
  //   if (slugArray.length > 1) {
  //     page = 'jobs';
  //     newPipelineSchedule = slugArray[1] === 'new_schedule';
  //   }
  //   if (!newPipelineSchedule && slugArray.length > 2) {
  //     pipelineScheduleId = slugArray[2];
  //     if (slugArray.length > 3) {
  //       pipelineScheduleAction = slugArray[3];
  //     }
  //   }

  // }

  // const initialProps = {
  //   newPipelineSchedule,
  //   page,
  //   pipeline: {
  //     uuid: pipelineUUID,
  //   },
  // };

  // if (pipelineScheduleId) {
  //   initialProps['pipelineSchedule'] = {
  //     id: pipelineScheduleId,
  //     pipeline_uuid: pipelineUUID,
  //   };
  //   initialProps['pipelineScheduleAction'] = pipelineScheduleAction;
  // }

  const initialProps = {
      page,
      pipeline: {
        uuid: pipelineUUID,
      },
    };

  return initialProps;
};

export default PrivateRoute(PipelineDetailPage);
