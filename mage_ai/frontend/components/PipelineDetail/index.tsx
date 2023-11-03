import * as path from 'path';
import NextLink from 'next/link';
import React, {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CSSTransition } from 'react-transition-group';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useMutation } from 'react-query';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import AutocompleteItemType from '@interfaces/AutocompleteItemType';
import BlockTemplateType from '@interfaces/BlockTemplateType';
import BlockType, {
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  SetEditingBlockType,
} from '@interfaces/BlockType';
import ClickOutside from '@oracle/components/ClickOutside';
import CodeBlock, { DEFAULT_SQL_CONFIG_KEY_LIMIT } from '@components/CodeBlock';
import ColumnScroller, { StartDataType } from './ColumnScroller';
import DataProviderType from '@interfaces/DataProviderType';
import ErrorsType from '@interfaces/ErrorsType';
import FileSelectorPopup from '@components/FileSelectorPopup';
import FileType, { FileExtensionEnum } from '@interfaces/FileType';
import GlobalDataProductType from '@interfaces/GlobalDataProductType';
import HiddenBlock from '@components/CodeBlock/HiddenBlock';
import IntegrationPipeline from '@components/IntegrationPipeline';
import InteractionType from '@interfaces/InteractionType';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import Link from '@oracle/elements/Link';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import {
  ANIMATION_DURATION,
  OverlayStyle,
  PipelineContainerStyle,
} from './index.style';
import { BlockInteractionType } from '@interfaces/PipelineInteractionType';
import {
  CONFIG_KEY_DATA_PROVIDER,
  CONFIG_KEY_DATA_PROVIDER_DATABASE,
  CONFIG_KEY_DATA_PROVIDER_PROFILE,
  CONFIG_KEY_DATA_PROVIDER_SCHEMA,
  CONFIG_KEY_EXPORT_WRITE_POLICY,
} from '@interfaces/ChartBlockType';
import {
  CUSTOM_EVENT_BLOCK_OUTPUT_CHANGED,
  CUSTOM_EVENT_CODE_BLOCK_CHANGED,
} from './constants';
import {
  KEY_CODES_SYSTEM,
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_UP,
  KEY_CODE_CONTROL,
  KEY_CODE_D,
  KEY_CODE_ENTER,
  KEY_CODE_ESCAPE,
  KEY_CODE_FORWARD_SLASH,
  KEY_CODE_I,
  KEY_CODE_META,
  KEY_CODE_NUMBER_0,
  KEY_CODE_R,
  KEY_CODE_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { OpenDataIntegrationModalType } from '@components/DataIntegrationModal/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SIDE_BY_SIDE_VERTICAL_PADDING } from '@components/CodeBlock/index.style';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { addScratchpadNote, addSqlBlockNote } from '@components/PipelineDetail/AddNewBlocks/utils';
import { addUnderscores, randomNameGenerator, removeExtensionFromFilename } from '@utils/string';
import { buildBlockRefKey } from './utils';
import { getUpstreamBlockUuids } from '@components/CodeBlock/utils';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { onSuccess } from '@api/utils/response';
import { pushAtIndex, removeAtIndex } from '@utils/array';
import { selectKeys } from '@utils/hash';
import { useKeyboardContext } from '@context/Keyboard';
import { useWindowSize } from '@utils/sizes';

type PipelineDetailProps = {
  addNewBlockAtIndex: (
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name?: string,
  ) => Promise<any>;
  addWidget: (widget: BlockType, opts?: {
    onCreateCallback?: (block: BlockType) => void;
  }) => Promise<any>;
  afterHidden?: boolean;
  allBlocks: BlockType[];
  allowCodeBlockShortcuts?: boolean;
  anyInputFocused: boolean;
  autocompleteItems: AutocompleteItemType[];
  beforeHidden?: boolean;
  blockInteractionsMapping?: {
    [blockUUID: string]: BlockInteractionType[];
  };
  blockRefs: any;
  blocks: BlockType[];
  blocksThatNeedToRefresh?: {
    [uuid: string]: number;
  };
  dataProviders: DataProviderType[];
  deleteBlock: (block: BlockType) => Promise<any>;
  disableShortcuts: boolean;
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  fetchSampleData: () => void;
  files: FileType[];
  globalDataProducts?: GlobalDataProductType[];
  globalVariables: PipelineVariableType[];
  hiddenBlocks: {
    [uuid: string]: BlockType;
  };
  interactionsMapping?: {
    [interactionUUID: string]: InteractionType;
  };
  interruptKernel: () => void;
  mainContainerRef: any;
  mainContainerWidth: number;
  messages: {
    [uuid: string]: KernelOutputType[];
  };
  onChangeCallbackBlock: (type: string, uuid: string, value: string) => void;
  onChangeCodeBlock: (type: string, uuid: string, value: string) => void;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
    blockUUID: string;
  }) => void;
  pipeline: PipelineType;
  pipelineContentTouched: boolean;
  project?: ProjectType;
  restartKernel: () => void;
  runBlock: (payload: {
    block: BlockType;
    code: string;
    runUpstream?: boolean;
    runTests?: boolean;
  }) => void;
  runningBlocks: BlockType[];
  savePipelineContent: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
  scrollTogether?: boolean;
  selectedBlock: BlockType;
  setAnyInputFocused: (value: boolean) => void;
  setDisableShortcuts: (disableShortcuts: boolean) => void;
  setErrors: (errors: ErrorsType) => void;
  setIntegrationStreams: (streams: string[]) => void;
  setHiddenBlocks: ((opts: {
    [uuid: string]: BlockType;
  }) => {
    [uuid: string]: BlockType;
  });
  setOutputBlocks: (func: (prevOutputBlocks: BlockType[]) => BlockType[]) => void;
  setPipelineContentTouched: (value: boolean) => void;
  setSelectedBlock: (block: BlockType) => void;
  setSelectedOutputBlock: (block: BlockType) => void;
  setSelectedStream: (stream: string) => void;
  setTextareaFocused: (value: boolean) => void;
  showBrowseTemplates?: (opts?: {
    addNew?: boolean;
    blockType?: BlockTypeEnum;
    language?: BlockLanguageEnum;
  }) => void;
  showConfigureProjectModal?: (opts: {
    cancelButtonText?: string;
    header?: any;
    onCancel?: () => void;
    onSaveSuccess?: (project: ProjectType) => void;
  }) => void;
  showGlobalDataProducts?: (opts?: {
    addNewBlock?: (block: BlockRequestPayloadType) => Promise<any>;
  }) => void;
  showUpdateBlockModal?: (
    block: BlockType,
    name: string,
  ) => void;
  sideBySideEnabled?: boolean;
  textareaFocused: boolean;
  widgets: BlockType[];
} & SetEditingBlockType & OpenDataIntegrationModalType;

function PipelineDetail({
  addNewBlockAtIndex,
  addWidget,
  afterHidden,
  allBlocks,
  allowCodeBlockShortcuts,
  anyInputFocused,
  autocompleteItems,
  beforeHidden,
  blockInteractionsMapping,
  blockRefs,
  blocks = [],
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
  runningBlocks = [],
  savePipelineContent,
  scrollTogether,
  selectedBlock,
  setAnyInputFocused,
  setDisableShortcuts,
  setEditingBlock,
  setErrors,
  setHiddenBlocks,
  setIntegrationStreams,
  setOutputBlocks,
  setPipelineContentTouched,
  setSelectedBlock,
  setSelectedOutputBlock,
  setSelectedStream,
  setTextareaFocused,
  showBrowseTemplates,
  showConfigureProjectModal,
  showDataIntegrationModal,
  showGlobalDataProducts,
  showUpdateBlockModal,
  sideBySideEnabled,
  textareaFocused,
  widgets,
}: PipelineDetailProps) {
  // const startTime = performance.now();
  // useEffect(() => {
  //   const duration = performance.now() - startTime;
  //   console.log('PipelineDetail render', duration);
  // }, []);

  const containerRef = useRef(null);
  const searchTextInputRef = useRef(null);
  const blockOutputRefs = useRef({});

  const [addDBTModelVisible, setAddDBTModelVisible] = useState<boolean>(false);
  const [focusedAddNewBlockSearch, setFocusedAddNewBlockSearch] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [visibleOverlay, setVisibleOverlay] = useState<boolean>(true);
  const [addNewBlockMenuOpenIdx, setAddNewBlockMenuOpenIdx] = useState<number>(null);
  const [lastBlockIndex, setLastBlockIndex] = useState<number>(null);
  const [creatingNewDBTModel, setCreatingNewDBTModel] = useState<boolean>(false);
  const [dbtModelName, setDbtModelName] = useState<string>('');
  const [mainContainerRect, setMainContainerRect] = useState<{
    height: number;
    width: number;
    x: number;
    y: number;
  }>({
    height: null,
    width: null,
    x: null,
    y: null,
  });

  const isIntegration = useMemo(() => PipelineTypeEnum.INTEGRATION === pipeline?.type, [pipeline]);
  const isStreaming = useMemo(() => PipelineTypeEnum.STREAMING === pipeline?.type, [pipeline]);

  const blocksFiltered =
    useMemo(() => blocks.filter(({ type }) => !isIntegration || BlockTypeEnum.TRANSFORMER === type), [
      blocks,
      isIntegration,
    ]);

  const [mountedBlocks, setMountedBlocks] = useState<{
    [blockUUID: string]: boolean;
  }>({});

  const {
    height: windowHeight,
    width: windowWidth,
  } = useWindowSize();

  useEffect(() => {
    if (mainContainerRef?.current) {
      setMainContainerRect(mainContainerRef?.current?.getBoundingClientRect());
    }
  }, [
    afterHidden,
    beforeHidden,
    mainContainerRef,
    mainContainerWidth,
    setMainContainerRect,
    windowHeight,
    windowWidth,
  ]);

  const runningBlocksByUUID = useMemo(() => runningBlocks.reduce((
    acc: {
      [uuid: string]: BlockType;
    },
    block: BlockType,
    idx: number,
  ) => ({
    ...acc,
    [block.uuid]: {
      ...block,
      priority: idx,
    },
  }), {}), [runningBlocks]);

  const [cursorHeight1, setCursorHeight1] = useState<number>(null);
  const column1ScrollMemo = useMemo(() => {
    return (
      <ColumnScroller
        blocks={blocksFiltered}
        columnIndex={0}
        columns={2}
        disabled={scrollTogether}
        eventNameRefsMapping={{
          [CUSTOM_EVENT_CODE_BLOCK_CHANGED]: blockRefs,
        }}
        invisible={!blocks?.length || !cursorHeight1 || scrollTogether}
        mainContainerRect={mainContainerRect}
        scrollTogether={scrollTogether}
        setCursorHeight={setCursorHeight1}
      />
    );
  }, [
    blockRefs,
    blocksFiltered,
    cursorHeight1,
    mainContainerRect,
    scrollTogether,
    setCursorHeight1,
  ]);

  const [cursorHeight2, setCursorHeight2] = useState<number>(null);
  const column2ScrollMemo = useMemo(() => {
    return (
      <ColumnScroller
        blocks={blocksFiltered}
        columnIndex={1}
        columns={2}
        disabled={scrollTogether}
        eventNameRefsMapping={{
          [CUSTOM_EVENT_BLOCK_OUTPUT_CHANGED]: blockOutputRefs,
        }}
        invisible={!blocks?.length || !cursorHeight2 || scrollTogether}
        mainContainerRect={mainContainerRect}
        rightAligned
        scrollTogether={scrollTogether}
        setCursorHeight={setCursorHeight2}
      />
    );
  }, [
    blockOutputRefs,
    blocksFiltered,
    cursorHeight2,
    mainContainerRect,
    scrollTogether,
    setCursorHeight2,
  ]);

  const [cursorHeight3, setCursorHeight3] = useState<number>(null);
  const column3ScrollMemo = useMemo(() => {
    return (
      <ColumnScroller
        blocks={blocksFiltered}
        disabled={!scrollTogether}
        columnIndex={2}
        columns={1}
        eventNameRefsMapping={{
          [CUSTOM_EVENT_BLOCK_OUTPUT_CHANGED]: blockOutputRefs,
          [CUSTOM_EVENT_CODE_BLOCK_CHANGED]: blockRefs,
        }}
        invisible={!blocks?.length || !cursorHeight3 || !scrollTogether}
        mainContainerRect={mainContainerRect}
        rightAligned
        scrollTogether={scrollTogether}
        setCursorHeight={setCursorHeight3}
      />
    );
  }, [
    blockOutputRefs,
    blockRefs,
    blocksFiltered,
    cursorHeight3,
    mainContainerRect,
    scrollTogether,
    setCursorHeight3,
  ]);

  const selectedBlockPrevious = usePrevious(selectedBlock);
  const numberOfBlocks = useMemo(() => blocks.length, [blocks]);

  const useV2AddNewBlock = useMemo(
    () => PipelineTypeEnum.PYTHON === pipeline?.type
      && project?.features?.[FeatureUUIDEnum.ADD_NEW_BLOCK_V2],
    [
      pipeline,
      project,
    ],
  );
  const { data: dataBlockTemplates } = api.block_templates.list({
    show_all: useV2AddNewBlock ? true : false,
  }, {
    revalidateOnFocus: false,
  });
  const blockTemplates: BlockTemplateType[] =
    useMemo(() => dataBlockTemplates?.block_templates || [], [
      dataBlockTemplates,
    ]);

  const uuidKeyboard = 'PipelineDetail/index';
  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping, keyHistory) => {
      if (pipelineContentTouched && onlyKeysPresent([KEY_CODE_META, KEY_CODE_R], keyMapping)) {
        event.preventDefault();
        const warning = 'You have changes that are unsaved. Click cancel and save your changes before reloading page.';
        if (typeof window !== 'undefined' && typeof location !== 'undefined' && window.confirm(warning)) {
          location.reload();
        }
      }

      if (disableShortcuts || disableGlobalKeyboardShortcuts) {
        return;
      }

      if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_S], keyMapping)
        || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_S], keyMapping)
      ) {
        event.preventDefault();
        savePipelineContent();
      } else if (textareaFocused) {
        if (keyMapping[KEY_CODE_ESCAPE]) {
          setTextareaFocused(false);
        } else if (!pipelineContentTouched && !KEY_CODES_SYSTEM.find(key => keyMapping[key])) {
          setPipelineContentTouched(true);
        }
      } else if (!isIntegration) {
        if (useV2AddNewBlock && (
          onlyKeysPresent([KEY_CODE_META, KEY_CODE_FORWARD_SLASH], keyMapping)
            || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_FORWARD_SLASH], keyMapping)
        )) {
          event.preventDefault();
          setFocusedAddNewBlockSearch(true);
          searchTextInputRef?.current?.focus();
        } else if (useV2AddNewBlock
          && focusedAddNewBlockSearch
          && onlyKeysPresent([KEY_CODE_ESCAPE], keyMapping)
        ) {
          event.preventDefault();
          setFocusedAddNewBlockSearch(false);
          searchTextInputRef?.current?.blur();
        } else if (selectedBlock) {
          const selectedBlockIndex =
            blocks.findIndex(({ uuid }: BlockType) => selectedBlock.uuid === uuid);

          if (keyMapping[KEY_CODE_ESCAPE]) {
            setSelectedBlock(null);
          } else if (keyHistory[0] === KEY_CODE_I
            && keyHistory[1] === KEY_CODE_I
          ) {
            interruptKernel();
          } else if (keyHistory[0] === KEY_CODE_D
            && keyHistory[1] === KEY_CODE_D
            && selectedBlockIndex !== -1
          ) {
            deleteBlock(selectedBlock).then((resp) => {
              if (!resp?.error) {
                setTimeout(() => {
                  if (selectedBlockIndex === blocks.length - 1) {
                    setSelectedBlock(blocks[selectedBlockIndex - 1]);
                  } else if (blocks.length >= 0) {
                    setSelectedBlock(blocks[selectedBlockIndex + 1]);
                  } else {
                    setSelectedBlock(null);
                  }
                }, 100);
              }
            });
          } else if (keyMapping[KEY_CODE_ARROW_UP] && selectedBlockIndex >= 1) {
            const nextBlock = blocks[selectedBlockIndex - 1];
            if (nextBlock) {
              setSelectedBlock(nextBlock);
              const path = `${nextBlock.type}s/${nextBlock.uuid}.py`;
              blockRefs.current[path]?.current?.scrollIntoView();
            }
          } else if (keyMapping[KEY_CODE_ARROW_DOWN] && selectedBlockIndex <= numberOfBlocks - 2) {
            const nextBlock = blocks[selectedBlockIndex + 1];
            if (nextBlock) {
              setSelectedBlock(nextBlock);
              const path = `${nextBlock.type}s/${nextBlock.uuid}.py`;
              blockRefs.current[path]?.current?.scrollIntoView();
            }
          } else if (onlyKeysPresent([KEY_CODE_ENTER], keyMapping)) {
            setTextareaFocused(true);
          }
        } else if (selectedBlockPrevious) {
          if (keyMapping[KEY_CODE_ENTER]) {
            setSelectedBlock(selectedBlockPrevious);
          }
        }

        if (!anyInputFocused && keyHistory[0] === KEY_CODE_NUMBER_0 && keyHistory[1] === KEY_CODE_NUMBER_0) {
          restartKernel();
        }
      }
    },
    [
      addNewBlockAtIndex,
      anyInputFocused,
      blockRefs.current,
      blocks,
      focusedAddNewBlockSearch,
      interruptKernel,
      isIntegration,
      numberOfBlocks,
      pipelineContentTouched,
      restartKernel,
      savePipelineContent,
      searchTextInputRef,
      selectedBlock,
      selectedBlockPrevious,
      setPipelineContentTouched,
      setSelectedBlock,
      setTextareaFocused,
      textareaFocused,
      useV2AddNewBlock,
    ],
  );

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (pipelineContentTouched) {
        savePipelineContent();
      }
    }, 1000 * 10);

    return () => {
      clearInterval(autoSaveInterval);
    };
  }, [
    pipelineContentTouched,
    savePipelineContent,
  ]);

  useEffect(() => {
    setTimeout(() => setVisible(true), ANIMATION_DURATION * 2);
  }, [pipeline]);

  const [updateBlock] = useMutation(
    ({
      block,
      upstreamBlocks,
    }: {
      block: BlockType,
      upstreamBlocks: string[];
    }) => api.blocks.pipelines.useUpdate(
      pipeline?.uuid,
      block?.uuid,
    )({
      block: {
        upstream_blocks: upstreamBlocks,
      },
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipeline();
          },
          onErrorCallback: (response, errors) => setErrors?.({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const onClickAddSingleDBTModel = useCallback((blockIndex: number) => {
    setAddDBTModelVisible(true);
    setLastBlockIndex(blockIndex);
    setDisableShortcuts(true);
  }, [
    setAddDBTModelVisible,
    setDisableShortcuts,
    setLastBlockIndex,
  ]);

  const closeAddDBTModelPopup = useCallback(() => {
    setAddDBTModelVisible(false);
    setCreatingNewDBTModel(false);
    setDbtModelName('');
    setDisableShortcuts(false);
  }, [setDisableShortcuts]);

  const onDrop = useCallback((block: BlockType, blockDropped: BlockType) => {
    let blockIndex;
    let blockDroppedIndex;

    blocks.forEach(({ uuid }, idx: number) => {
      if (blockIndex >= 0 && blockDroppedIndex >= 0) {
        return;
      }

      if (uuid === block.uuid) {
        blockIndex = idx;
      } else if (uuid === blockDropped.uuid) {
        blockDroppedIndex = idx;
      }
    });

    let arr = removeAtIndex(blocks, blockDroppedIndex);
    arr = pushAtIndex(blockDropped, Math.max(blockIndex, 0), arr);

    return savePipelineContent({
      pipeline: {
        blocks: arr,
        uuid: pipeline?.uuid,
      },
    });
  }, [
    blocks,
    pipeline,
    savePipelineContent,
  ]);

  const addNewBlocksMemo = useMemo(() => pipeline && (
    <>
      <AddNewBlocks
        addNewBlock={(newBlock: BlockRequestPayloadType) => {
          const block = blocks[blocks.length - 1];

          let content = null;
          let configuration = newBlock.configuration || {};
          const upstreamBlocks = block ? getUpstreamBlockUuids(block, newBlock) : [];

          if (block) {
            if ([BlockTypeEnum.DATA_LOADER, BlockTypeEnum.TRANSFORMER].includes(block.type)
              && BlockTypeEnum.SCRATCHPAD === newBlock.type
            ) {
              content = `from mage_ai.data_preparation.variable_manager import get_variable


  df = get_variable('${pipeline.uuid}', '${block.uuid}', 'output_0')
  `;
            }

            if (BlockLanguageEnum.SQL === block.language) {
              configuration = {
                ...selectKeys(block.configuration, [
                  CONFIG_KEY_DATA_PROVIDER,
                  CONFIG_KEY_DATA_PROVIDER_DATABASE,
                  CONFIG_KEY_DATA_PROVIDER_PROFILE,
                  CONFIG_KEY_DATA_PROVIDER_SCHEMA,
                  CONFIG_KEY_EXPORT_WRITE_POLICY,
                ]),
                ...configuration,
              };
            }
          }

          if (BlockLanguageEnum.SQL === newBlock.language) {
            content = addSqlBlockNote(content);
          }
          content = addScratchpadNote(newBlock, content);

          addNewBlockAtIndex({
            ...newBlock,
            configuration,
            content,
            upstream_blocks: upstreamBlocks,
          }, numberOfBlocks, setSelectedBlock);
          setTextareaFocused(true);
        }}
        blockTemplates={blockTemplates}
        focusedAddNewBlockSearch={focusedAddNewBlockSearch}
        hideCustom={isIntegration || isStreaming}
        hideDataExporter={isIntegration}
        hideDataLoader={isIntegration}
        hideDbt={isIntegration || isStreaming}
        hideScratchpad={isIntegration}
        hideSensor={isIntegration}
        onClickAddSingleDBTModel={onClickAddSingleDBTModel}
        pipeline={pipeline}
        project={project}
        searchTextInputRef={searchTextInputRef}
        setCreatingNewDBTModel={setCreatingNewDBTModel}
        setFocusedAddNewBlockSearch={setFocusedAddNewBlockSearch}
        showBrowseTemplates={showBrowseTemplates}
        showConfigureProjectModal={showConfigureProjectModal}
        showGlobalDataProducts={showGlobalDataProducts}
      />

      {!useV2AddNewBlock && !isIntegration && !isStreaming && (
        <Spacing mt={1}>
          <Text muted small>
            Want to try the new add block UI?
            <br />
            Turn on the feature named <Text bold inline muted small>
              {FeatureUUIDEnum.ADD_NEW_BLOCK_V2}
            </Text> in your <NextLink
              href="/settings/workspace/preferences"
              passHref
            >
              <Link muted underline>
                <Text bold inline muted small>
                  project settings
                </Text>
              </Link>
            </NextLink>.
          </Text>
        </Spacing>
      )}
    </>
  ), [
    addNewBlockAtIndex,
    blockTemplates,
    blocks,
    focusedAddNewBlockSearch,
    isIntegration,
    isStreaming,
    numberOfBlocks,
    onClickAddSingleDBTModel,
    pipeline,
    project,
    searchTextInputRef,
    setFocusedAddNewBlockSearch,
    setSelectedBlock,
    setTextareaFocused,
    showBrowseTemplates,
    showConfigureProjectModal,
    showGlobalDataProducts,
    sideBySideEnabled,
    useV2AddNewBlock,
  ]);

  const codeBlocks = useMemo(() => {
    const arr = [];

    const blocksCount = blocksFiltered?.length || 0;

    blocksFiltered.forEach((block: BlockType, idx: number) => {
      const isLast = idx === blocksCount - 1;

      const {
        type,
        uuid,
      } = block;
      const selected: boolean = selectedBlock?.uuid === uuid;
      const runningBlock = runningBlocksByUUID[uuid];
      const executionState = runningBlock
        ? (runningBlock.priority === 0
          ? ExecutionStateEnum.BUSY
          : ExecutionStateEnum.QUEUED
        )
        : ExecutionStateEnum.IDLE;

      const path = buildBlockRefKey({
        type,
        uuid,
      });
      blockOutputRefs.current[path] = createRef();
      blockRefs.current[path] = createRef();

      let el;
      const isMarkdown = type === BlockTypeEnum.MARKDOWN;
      const isTransformer = type === BlockTypeEnum.TRANSFORMER;
      const isHidden = !!hiddenBlocks?.[uuid];
      const noDivider = idx === numberOfBlocks - 1 || isIntegration;
      const currentBlockOutputRef = blockOutputRefs.current[path];
      const currentBlockRef = blockRefs.current[path];

      let key = uuid;
      const refreshTimestamp = blocksThatNeedToRefresh?.[type]?.[uuid];
      if (refreshTimestamp) {
        key = `${key}:${refreshTimestamp}`;
      }

      if (isHidden) {
        el = (
          <HiddenBlock
            block={block}
            blocks={blocks}
            key={key}
            // @ts-ignore
            onClick={() => setHiddenBlocks(prev => ({
              ...prev,
              [uuid]: !isHidden,
            }))}
            onDrop={onDrop}
            ref={currentBlockRef}
          />
        );
      } else {
        el = (
          <CodeBlock
            addNewBlock={(
              b: BlockRequestPayloadType,
              downstreamBlocks?: BlockType[],
            ) => {
              setTextareaFocused(true);
              const onCreateCallback = (block: BlockType) => {
                if (downstreamBlocks?.length === 1) {
                  const downstreamBlockUUID = downstreamBlocks[0]?.uuid;
                  const upstreamsOfDownstreamBlock = downstreamBlocks[0]?.upstream_blocks || [];
                  updateBlock({
                    block: { uuid: downstreamBlockUUID },
                    upstreamBlocks: [block.uuid, ...upstreamsOfDownstreamBlock],
                  });
                }
                setSelectedBlock?.(block);
              };

              return addNewBlockAtIndex(
                b,
                sideBySideEnabled ? idx : idx + 1,
                onCreateCallback,
              );
            }}
            addNewBlockMenuOpenIdx={addNewBlockMenuOpenIdx}
            addWidget={addWidget}
            allBlocks={allBlocks}
            allowCodeBlockShortcuts={allowCodeBlockShortcuts}
            autocompleteItems={autocompleteItems}
            block={block}
            blockIdx={idx}
            blockInteractions={blockInteractionsMapping?.[uuid]}
            blockOutputRef={currentBlockOutputRef}
            blockRefs={blockRefs}
            blockTemplates={blockTemplates}
            blocks={blocks}
            containerRef={containerRef}
            cursorHeight1={cursorHeight1}
            cursorHeight2={cursorHeight2}
            cursorHeight3={cursorHeight3}
            dataProviders={dataProviders}
            defaultValue={block.content}
            deleteBlock={(b: BlockType) => {
              deleteBlock(b);
              setAnyInputFocused(false);
            }}
            disableShortcuts={disableShortcuts}
            executionState={executionState}
            fetchFileTree={fetchFileTree}
            fetchPipeline={fetchPipeline}
            globalDataProducts={globalDataProducts}
            hideRunButton={isStreaming || isMarkdown || (isIntegration && isTransformer)}
            interactionsMapping={interactionsMapping}
            interruptKernel={interruptKernel}
            key={key}
            mainContainerRect={mainContainerRect}
            mainContainerRef={mainContainerRef}
            mainContainerWidth={mainContainerWidth}
            messages={messages[uuid]}
            noDivider={noDivider}
            onCallbackChange={(value: string) => onChangeCallbackBlock(type, uuid, value)}
            onChange={(value: string) => onChangeCodeBlock(type, uuid, value)}
            onClickAddSingleDBTModel={onClickAddSingleDBTModel}
            onDrop={onDrop}
            openSidekickView={openSidekickView}
            pipeline={pipeline}
            project={project}
            ref={currentBlockRef}
            runBlock={runBlock}
            runningBlocks={runningBlocks}
            savePipelineContent={savePipelineContent}
            scrollTogether={scrollTogether}
            selected={selected}
            setAddNewBlockMenuOpenIdx={setAddNewBlockMenuOpenIdx}
            setAnyInputFocused={setAnyInputFocused}
            setCreatingNewDBTModel={setCreatingNewDBTModel}
            setEditingBlock={setEditingBlock}
            setErrors={setErrors}
            setMountedBlocks={setMountedBlocks}
            setOutputBlocks={setOutputBlocks}
            setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
            setSelectedBlock={setSelectedBlock}
            setSelectedOutputBlock={setSelectedOutputBlock}
            setTextareaFocused={setTextareaFocused}
            showBrowseTemplates={showBrowseTemplates}
            showConfigureProjectModal={showConfigureProjectModal}
            showDataIntegrationModal={showDataIntegrationModal}
            showGlobalDataProducts={showGlobalDataProducts}
            showUpdateBlockModal={showUpdateBlockModal}
            sideBySideEnabled={sideBySideEnabled}
            textareaFocused={selected && textareaFocused}
            widgets={widgets}
            windowWidth={windowWidth}
          >
            {sideBySideEnabled && isLast && (
              <div
                style={{
                  paddingBottom: SIDE_BY_SIDE_VERTICAL_PADDING,
                  paddingTop: SIDE_BY_SIDE_VERTICAL_PADDING,
                }}
              >
                {addNewBlocksMemo}
              </div>
            )}
          </CodeBlock>
        );
      }

      arr.push(el);
    });

    return arr;
  },
  [
    addNewBlockAtIndex,
    addNewBlockMenuOpenIdx,
    addNewBlocksMemo,
    addWidget,
    allBlocks,
    allowCodeBlockShortcuts,
    autocompleteItems,
    blockInteractionsMapping,
    blockOutputRefs,
    blockRefs,
    blockTemplates,
    blocks,
    blocksFiltered,
    blocksThatNeedToRefresh,
    containerRef,
    cursorHeight1,
    cursorHeight2,
    cursorHeight3,
    dataProviders,
    deleteBlock,
    disableShortcuts,
    fetchFileTree,
    fetchPipeline,
    globalDataProducts,
    hiddenBlocks,
    interactionsMapping,
    interruptKernel,
    isIntegration,
    isStreaming,
    mainContainerRect,
    mainContainerRef,
    mainContainerWidth,
    messages,
    numberOfBlocks,
    onChangeCallbackBlock,
    onChangeCodeBlock,
    onClickAddSingleDBTModel,
    onDrop,
    openSidekickView,
    pipeline,
    project,
    runBlock,
    runningBlocks,
    runningBlocksByUUID,
    savePipelineContent,
    scrollTogether,
    selectedBlock,
    setAddNewBlockMenuOpenIdx,
    setAnyInputFocused,
    setEditingBlock,
    setErrors,
    setHiddenBlocks,
    setMountedBlocks,
    setOutputBlocks,
    setSelectedBlock,
    setSelectedOutputBlock,
    setTextareaFocused,
    showBrowseTemplates,
    showConfigureProjectModal,
    showDataIntegrationModal,
    showGlobalDataProducts,
    showUpdateBlockModal,
    sideBySideEnabled,
    textareaFocused,
    updateBlock,
    widgets,
    windowWidth,
  ]);

  const integrationMemo = useMemo(() => (
    <IntegrationPipeline
      addNewBlockAtIndex={addNewBlockAtIndex}
      blocks={blocks}
      codeBlocks={codeBlocks}
      fetchFileTree={fetchFileTree}
      fetchPipeline={fetchPipeline}
      fetchSampleData={fetchSampleData}
      globalVariables={globalVariables}
      onChangeCodeBlock={onChangeCodeBlock}
      openSidekickView={openSidekickView}
      pipeline={pipeline}
      savePipelineContent={savePipelineContent}
      setErrors={setErrors}
      setIntegrationStreams={setIntegrationStreams}
      setOutputBlocks={setOutputBlocks}
      setSelectedBlock={setSelectedBlock}
      setSelectedOutputBlock={setSelectedOutputBlock}
      setSelectedStream={setSelectedStream}
    />
  ), [
    addNewBlockAtIndex,
    blocks,
    codeBlocks,
    fetchFileTree,
    fetchPipeline,
    fetchSampleData,
    globalVariables,
    onChangeCodeBlock,
    openSidekickView,
    pipeline,
    savePipelineContent,
    setErrors,
    setIntegrationStreams,
    setOutputBlocks,
    setSelectedBlock,
    setSelectedOutputBlock,
    setSelectedStream,
  ]);

  return (
    <DndProvider backend={HTML5Backend}>
      <PipelineContainerStyle ref={containerRef}>
        {visibleOverlay && (
          <CSSTransition
            classNames="pipeline-detail"
            in={visible}
            onEntered={() => setTimeout(() => setVisibleOverlay(false), ANIMATION_DURATION)}
            timeout={1}
          >
            <OverlayStyle />
          </CSSTransition>
        )}
      </PipelineContainerStyle>

      {isIntegration && (
        <Spacing mt={1} px={PADDING_UNITS}>
          {integrationMemo}
        </Spacing>
      )}

      {!sideBySideEnabled && (
        <Spacing mt={1} px={PADDING_UNITS}>
          {!isIntegration && (
            <>
              {codeBlocks}
              <Spacing mt={PADDING_UNITS}>
                {addNewBlocksMemo}
              </Spacing>
            </>
          )}
        </Spacing>
      )}

      {sideBySideEnabled && (
        <div style={{ position: 'relative' }}>
          {column1ScrollMemo}
          {codeBlocks}
          {column2ScrollMemo}
          {column3ScrollMemo}

          {!blocks?.length && (
            <Spacing p={PADDING_UNITS}>
              {addNewBlocksMemo}
            </Spacing>
          )}
        </div>
      )}

      {addDBTModelVisible && (
        <ClickOutside
          onClickOutside={closeAddDBTModelPopup}
          open
        >
          <FileSelectorPopup
            blocks={blocks}
            creatingNewDBTModel={creatingNewDBTModel}
            dbtModelName={dbtModelName}
            files={files}
            onClose={closeAddDBTModelPopup}
            onOpenFile={(filePath: string) => {
              let finalFilePath = filePath;
              if (creatingNewDBTModel) {
                let blockName = addUnderscores(dbtModelName || randomNameGenerator());
                const sqlExtension = `.${FileExtensionEnum.SQL}`;
                if (blockName.endsWith(sqlExtension)) {
                  blockName = blockName.slice(0, -4);
                }
                finalFilePath = `${filePath}${path.sep}${blockName}.${FileExtensionEnum.SQL}`;
              }

              const newBlock: BlockRequestPayloadType = {
                configuration: {
                  file_path: finalFilePath,
                  limit: DEFAULT_SQL_CONFIG_KEY_LIMIT,
                },
                language: BlockLanguageEnum.SQL,
                name: removeExtensionFromFilename(finalFilePath),
                type: BlockTypeEnum.DBT,
              };
              if (creatingNewDBTModel) {
                newBlock.content = `--Docs: https://docs.mage.ai/dbt/sources
`;
              }

              const isAddingFromBlock =
                typeof lastBlockIndex === 'undefined' || lastBlockIndex === null;
              const block = blocks[isAddingFromBlock ? blocks.length - 1 : lastBlockIndex];
              const upstreamBlocks = block ? getUpstreamBlockUuids(block, newBlock) : [];

              addNewBlockAtIndex({
                  ...newBlock,
                  upstream_blocks: upstreamBlocks,
                }, (isAddingFromBlock
                  ? numberOfBlocks
                  : lastBlockIndex + 1
                ) - (sideBySideEnabled ? 1 : 0),
                setSelectedBlock,
              );

              closeAddDBTModelPopup();
              setTextareaFocused(true);
            }}
            setDbtModelName={setDbtModelName}
          />
        </ClickOutside>
      )}
    </DndProvider>
  );
}

export default PipelineDetail;
