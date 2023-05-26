import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { useDrag, useDrop } from 'react-dnd';
import { useMutation } from 'react-query';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import AutocompleteItemType from '@interfaces/AutocompleteItemType';
import Badge from '@oracle/components/Badge';
import BlockExtras from './BlockExtras';
import BlockTemplateType from '@interfaces/BlockTemplateType';
import BlockType, {
  ABBREV_BLOCK_LANGUAGE_MAPPING,
  BLOCK_TYPES_WITH_NO_PARENTS,
  BLOCK_TYPES_WITH_UPSTREAM_INPUTS,
  BLOCK_TYPE_NAME_MAPPING,
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  SetEditingBlockType,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Checkbox from '@oracle/elements/Checkbox';
import Circle from '@oracle/elements/Circle';
import CodeEditor, {
  CodeEditorSharedProps,
  OnDidChangeCursorPositionParameterType,
} from '@components/CodeEditor';
import CodeOutput from './CodeOutput';
import CommandButtons, { CommandButtonsSharedProps } from './CommandButtons';
import DataProviderType, {
  DataProviderEnum,
  EXPORT_WRITE_POLICIES,
  ExportWritePolicyEnum,
} from '@interfaces/DataProviderType';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KernelOutputType, {
  DataTypeEnum,
  ExecutionStateEnum,
} from '@interfaces/KernelOutputType';
import LabelWithValueClicker from '@oracle/components/LabelWithValueClicker';
import Link from '@oracle/elements/Link';
import Markdown from '@oracle/components/Markdown';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import UpstreamBlockSettings from './UpstreamBlockSettings';
import api from '@api';
import buildAutocompleteProvider from '@components/CodeEditor/autocomplete';
import usePrevious from '@utils/usePrevious';
import {
  ArrowDown,
  ChevronDown,
  ChevronUp,
  FileFill,
  Info,
  ParentEmpty,
  ParentLinked,
} from '@oracle/icons';
import {
  BlockDivider,
  BlockDividerInner,
  CodeHelperStyle,
  TimeTrackerStyle,
} from './index.style';
import {
  BlockHeaderStyle,
  ContainerStyle,
  CodeContainerStyle,
  getColorsForBlockType,
} from './index.style';
import {
  CONFIG_KEY_DATA_PROVIDER,
  CONFIG_KEY_DATA_PROVIDER_DATABASE,
  CONFIG_KEY_DATA_PROVIDER_PROFILE,
  CONFIG_KEY_DATA_PROVIDER_SCHEMA,
  CONFIG_KEY_DATA_PROVIDER_TABLE,
  CONFIG_KEY_DBT_PROFILE_TARGET,
  CONFIG_KEY_DBT_PROJECT_NAME,
  CONFIG_KEY_EXPORT_WRITE_POLICY,
  CONFIG_KEY_LIMIT,
  CONFIG_KEY_UNIQUE_UPSTREAM_TABLE_NAME,
  CONFIG_KEY_USE_RAW_SQL,
} from '@interfaces/ChartBlockType';
import { DataSourceTypeEnum } from '@interfaces/DataSourceType';
import { DRAG_AND_DROP_TYPE } from './constants';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_ENTER,
  KEY_CODE_META,
  KEY_CODE_SHIFT,
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SINGLE_LINE_HEIGHT } from '@components/CodeEditor/index.style';
import {
  TABS_DBT,
  TAB_DBT_LINEAGE_UUID,
  TAB_DBT_LOGS_UUID,
  TAB_DBT_SQL_UUID,
} from './constants';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { addScratchpadNote, addSqlBlockNote } from '@components/PipelineDetail/AddNewBlocks/utils';
import {
  buildBorderProps,
  buildConvertBlockMenuItems,
  getDownstreamBlockUuids,
  getUpstreamBlockUuids,
} from './utils';
import { capitalize, pluralize } from '@utils/string';
import { executeCode } from '@components/CodeEditor/keyboard_shortcuts/shortcuts';
import { get, set } from '@storage/localStorage';
import { getModelName } from '@utils/models/dbt';
import { indexBy } from '@utils/array';
import { initializeContentAndMessages } from '@components/PipelineDetail/utils';
import { onError, onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { selectKeys } from '@utils/hash';
import { useDynamicUpstreamBlocks } from '@utils/models/block';
import { useKeyboardContext } from '@context/Keyboard';

export const DEFAULT_SQL_CONFIG_KEY_LIMIT = 1000;

type CodeBlockProps = {
  addNewBlock?: (block: BlockType, downstreamBlocks?: BlockType[]) => Promise<any>;
  addNewBlockMenuOpenIdx?: number;
  allBlocks: BlockType[];
  allowCodeBlockShortcuts?: boolean;
  autocompleteItems: AutocompleteItemType[];
  block: BlockType;
  blockIdx: number;
  blockRefs: any;
  blockTemplates?: BlockTemplateType[];
  blocks: BlockType[];
  dataProviders?: DataProviderType[];
  defaultValue?: string;
  disableShortcuts?: boolean;
  executionState: ExecutionStateEnum;
  extraContent?: any;
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  hideRunButton?: boolean;
  mainContainerRef?: any;
  mainContainerWidth?: number;
  messages: KernelOutputType[];
  noDivider?: boolean;
  onCallbackChange?: (value: string) => void;
  onChange?: (value: string) => void;
  onClickAddSingleDBTModel?: (blockIdx: number) => void;
  onDrop?: (block: BlockType, blockDropped: BlockType) => void;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean, opts?: {
    blockUUID: string;
  }) => void;
  pipeline: PipelineType;
  runBlock: (payload: {
    block: BlockType;
    code: string;
    runDownstream?: boolean;
    runSettings?: {
      run_model?: boolean;
    };
    runUpstream?: boolean;
    runTests?: boolean;
  }) => void;
  runningBlocks?: BlockType[];
  savePipelineContent: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
  setAddNewBlockMenuOpenIdx?: (cb: any) => void;
  setAnyInputFocused?: (value: boolean) => void;
  setCreatingNewDBTModel?: (creatingNewDBTModel: boolean) => void;
  setErrors: (errors: ErrorsType) => void;
  setOutputBlocks?: (func: (prevOutputBlocks: BlockType[]) => BlockType[]) => void;
  setSelectedOutputBlock?: (block: BlockType) => void;
  widgets?: BlockType[];
} & CodeEditorSharedProps & CommandButtonsSharedProps & SetEditingBlockType;

function CodeBlock({
  addNewBlock,
  addNewBlockMenuOpenIdx,
  addWidget,
  allBlocks,
  allowCodeBlockShortcuts,
  autocompleteItems,
  block,
  blockIdx,
  blockRefs,
  blockTemplates,
  blocks,
  dataProviders,
  defaultValue = '',
  deleteBlock,
  disableShortcuts,
  executionState,
  extraContent,
  fetchFileTree,
  fetchPipeline,
  height,
  hideRunButton,
  interruptKernel,
  mainContainerRef,
  mainContainerWidth,
  messages: blockMessages = [],
  noDivider,
  onCallbackChange,
  onChange,
  onClickAddSingleDBTModel,
  onDrop,
  openSidekickView,
  pipeline,
  runBlock,
  runningBlocks,
  savePipelineContent,
  selected,
  setAddNewBlockMenuOpenIdx,
  setAnyInputFocused,
  setCreatingNewDBTModel,
  setEditingBlock,
  setErrors,
  setOutputBlocks,
  setSelected,
  setSelectedOutputBlock,
  setTextareaFocused,
  textareaFocused,
  widgets,
}: CodeBlockProps, ref) {
  const themeContext = useContext(ThemeContext);

  const {
    callback_content: callbackContentOrig,
    configuration: blockConfig = {},
    color: blockColor,
    error: blockError,
    has_callback: hasCallback,
    language: blockLanguage,
    replicated_block: replicatedBlockUUID,
    type: blockType,
    upstream_blocks: blockUpstreamBlocks = [],
    uuid: blockUUID,
  } = block || {};
  const blockConfiguration = useMemo(() => blockConfig, [blockConfig]);

  const [addNewBlocksVisible, setAddNewBlocksVisible] = useState(false);
  const [autocompleteProviders, setAutocompleteProviders] = useState(null);
  const [blockMenuVisible, setBlockMenuVisible] = useState(false);
  const [codeCollapsed, setCodeCollapsed] = useState(false);
  const [content, setContent] = useState(defaultValue);
  const [currentTime, setCurrentTime] = useState<number>(null);

  const {
    type: pipelineType,
    uuid: pipelineUUID,
  } = pipeline || {};
  const isStreamingPipeline = useMemo(() => PipelineTypeEnum.STREAMING === pipelineType, [pipelineType]);
  const isDBT = BlockTypeEnum.DBT === blockType;
  const isSQLBlock = BlockLanguageEnum.SQL === blockLanguage;
  const isRBlock = BlockLanguageEnum.R === blockLanguage;
  const isMarkdown = BlockTypeEnum.MARKDOWN === blockType;

  let defaultLimitValue = blockConfiguration[CONFIG_KEY_LIMIT];
  if (isSQLBlock && defaultLimitValue === undefined) {
    defaultLimitValue = DEFAULT_SQL_CONFIG_KEY_LIMIT;
  }

  const [dataProviderConfig, setDataProviderConfig] = useState({
    ...blockConfiguration,
    [CONFIG_KEY_DATA_PROVIDER]: blockConfiguration[CONFIG_KEY_DATA_PROVIDER],
    [CONFIG_KEY_DATA_PROVIDER_DATABASE]: blockConfiguration[CONFIG_KEY_DATA_PROVIDER_DATABASE],
    [CONFIG_KEY_DATA_PROVIDER_PROFILE]: blockConfiguration[CONFIG_KEY_DATA_PROVIDER_PROFILE],
    [CONFIG_KEY_DATA_PROVIDER_SCHEMA]: blockConfiguration[CONFIG_KEY_DATA_PROVIDER_SCHEMA],
    [CONFIG_KEY_DATA_PROVIDER_TABLE]: blockConfiguration[CONFIG_KEY_DATA_PROVIDER_TABLE],
    [CONFIG_KEY_DBT_PROFILE_TARGET]: blockConfiguration[CONFIG_KEY_DBT_PROFILE_TARGET],
    [CONFIG_KEY_DBT_PROJECT_NAME]: blockConfiguration[CONFIG_KEY_DBT_PROJECT_NAME],
    [CONFIG_KEY_EXPORT_WRITE_POLICY]: blockConfiguration[CONFIG_KEY_EXPORT_WRITE_POLICY]
      || ExportWritePolicyEnum.APPEND,
    [CONFIG_KEY_LIMIT]: defaultLimitValue,
    [CONFIG_KEY_UNIQUE_UPSTREAM_TABLE_NAME]: blockConfiguration[CONFIG_KEY_UNIQUE_UPSTREAM_TABLE_NAME],
    [CONFIG_KEY_USE_RAW_SQL]: !!blockConfiguration[CONFIG_KEY_USE_RAW_SQL],
  });

  const [errorMessages, setErrorMessages] = useState(null);
  const [isEditingBlock, setIsEditingBlock] = useState<boolean>(isMarkdown);
  const [isEditingBlockName, setIsEditingBlockName] = useState<boolean>(false);
  const [newBlockUuid, setNewBlockUuid] = useState(blockUUID);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [runCount, setRunCount] = useState<number>(0);
  const [runEndTime, setRunEndTime] = useState<number>(null);
  const [runStartTime, setRunStartTime] = useState<number>(null);
  const [messages, setMessages] = useState<KernelOutputType[]>(blockMessages);
  const [selectedTab, setSelectedTab] = useState<TabType>(TABS_DBT(block)[0]);

  const [collected, drag] = useDrag(() => ({
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    item: block,
    type: DRAG_AND_DROP_TYPE,
  }), [block]);
  const [, drop] = useDrop(() => ({
    accept: DRAG_AND_DROP_TYPE,
    drop: (item: BlockType) => onDrop?.(block, item),
  }), [block]);

  const dbtMetadata = useMemo(() => block?.metadata?.dbt || { project: null, projects: {} }, [block]);
  const dbtProjects = useMemo(() => dbtMetadata.projects || {}, [dbtMetadata]);
  const dbtProjectName =
    useMemo(() => dbtMetadata.project || dataProviderConfig[CONFIG_KEY_DBT_PROJECT_NAME], [
      dataProviderConfig,
      dbtMetadata,
    ]);
  const dbtProfileData = useMemo(() => dbtProjects[dbtProjectName] || {
    target: null,
    targets: [],
  }, [
    dbtProjectName,
    dbtProjects,
  ]);

  const dbtProfileTargets = useMemo(() => dbtProfileData.targets || [], [dbtProfileData]);
  const dbtProfileTarget = useMemo(() => dataProviderConfig[CONFIG_KEY_DBT_PROFILE_TARGET], [
    dataProviderConfig,
  ]);

  const [manuallyEnterTarget, setManuallyEnterTarget] = useState<boolean>(dbtProfileTarget &&
    !dbtProfileTargets?.includes(dbtProfileTarget),
  );

  const [callbackContent, setCallbackContent] = useState(null);
  useEffect(() => {
    if (callbackContentOrig !== callbackContent) {
      setCallbackContent(callbackContentOrig);
    }
  }, [
    callbackContent,
    callbackContentOrig,
  ]);

  const blockPrevious = usePrevious(block);
  useEffect(() => {
    if (JSON.stringify(block) != JSON.stringify(blockPrevious)) {
      const {
        messages: messagesInit,
      } = initializeContentAndMessages([block]);
      const msgs = messagesInit?.[blockType]?.[blockUUID];
      if (msgs?.length >= 1) {
        setMessages(msgs);
      }
    }
  },
  [
    block,
    blockType,
    blockUUID,
    blockPrevious,
    setMessages,
  ]);

  const blockMessagesPrev = usePrevious(blockMessages);
  useEffect(() => {
    if (typeof blockMessages !== 'undefined'
        && blockMessages.length !== blockMessagesPrev?.length) {

      setMessages(blockMessages);
    }
  }, [blockMessages, blockMessagesPrev, setMessages]);

  const dataProviderProfiles = useMemo(() => {
    let set = new Set();
    dataProviders?.forEach(({ profiles }) => {
      // @ts-ignore
      set = new Set([...set, ...profiles]);
    });

    // @ts-ignore
    return [...set];
  }, [
    dataProviders,
  ]);

  const codeCollapsedUUID = useMemo(() => (
    `${pipelineUUID}/${blockUUID}/codeCollapsed`
  ), [pipelineUUID, blockUUID]);

  const outputCollapsedUUID = useMemo(() => (
    `${pipelineUUID}/${blockUUID}/outputCollapsed`
  ), [pipelineUUID, blockUUID]);

  useEffect(() => {
    setCodeCollapsed(get(codeCollapsedUUID, false));
    setOutputCollapsed(get(outputCollapsedUUID, false));
  }, [
    codeCollapsedUUID,
    outputCollapsedUUID,
  ]);

  const blockMenuRef = useRef(null);
  const blocksMapping = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);

  const hasDownstreamWidgets = useMemo(() => !!widgets?.find(({
    upstream_blocks: upstreamBlocks,
  }: BlockType) => upstreamBlocks.includes(blockUUID)), [
    blockUUID,
    widgets,
  ]);

  const runBlockAndTrack = useCallback((payload?: {
    block: BlockType;
    code?: string;
    disableReset?: boolean;
    runDownstream?: boolean;
    runSettings?: {
      run_model?: boolean;
    };
    runUpstream?: boolean;
    runTests?: boolean;
  }) => {
    const {
      block: blockPayload,
      code,
      disableReset,
      runDownstream,
      runSettings,
      runUpstream,
      runTests: runTestsInit,
    } = payload || {};

    let runTests = runTestsInit;
    if (runTests === null || typeof runTests === 'undefined') {
      const {
        type: blockType,
      } = blockPayload || {};
      runTests = [
        BlockTypeEnum.DATA_LOADER,
        BlockTypeEnum.DATA_EXPORTER,
        BlockTypeEnum.TRANSFORMER,
      ].includes(blockType);
    }

    if (isDBT && TAB_DBT_LOGS_UUID !== selectedTab) {
      setSelectedTab(TAB_DBT_LOGS_UUID);
    }

    runBlock({
      block: blockPayload,
      code: code || content,
      runDownstream: runDownstream || hasDownstreamWidgets,
      runSettings,
      runTests: runTests || false,
      runUpstream: runUpstream || false,
    });

    if (!disableReset) {
      setRunCount(1 + Number(runCount));
      setRunEndTime(null);
      setOutputCollapsed(false);
    }
  }, [
    content,
    hasDownstreamWidgets,
    isDBT,
    runBlock,
    runCount,
    selectedTab,
    setRunCount,
    setRunEndTime,
    setSelectedTab,
  ]);

  const isInProgress = !!runningBlocks?.find(({ uuid }) => uuid === blockUUID)
    || messages?.length >= 1 && executionState !== ExecutionStateEnum.IDLE;

  useEffect(() => {
    if (isInProgress) {
      setRunStartTime(Number(new Date()));
    }
  }, [
    isInProgress,
    setRunStartTime,
  ]);

  const finalExecutionStatePrevious = usePrevious(executionState);
  useEffect(() => {
    if (executionState === ExecutionStateEnum.IDLE
      && executionState !== finalExecutionStatePrevious
    ) {
      setRunEndTime(Number(new Date()));
    }
  }, [
    executionState,
    finalExecutionStatePrevious,
    setRunEndTime,
  ]);

  const onDidChangeCursorPosition = useCallback(({
    editorRect: {
      top,
    },
    position: {
      lineNumberTop,
    },
  }: OnDidChangeCursorPositionParameterType) => {
    if (mainContainerRef?.current) {
      const {
        height: mainContainerHeight,
      } = mainContainerRef.current.getBoundingClientRect();

      if (top + lineNumberTop > mainContainerHeight) {
        const newY = mainContainerRef.current.scrollTop
          + ((lineNumberTop - mainContainerHeight) + top);

        mainContainerRef.current.scrollTo(0, newY);
      } else if (lineNumberTop + top < SINGLE_LINE_HEIGHT) {
        const newY = mainContainerRef.current.scrollTop
          + ((lineNumberTop + top) - SINGLE_LINE_HEIGHT);
        mainContainerRef.current.scrollTo(0, newY);
      }
    }
  }, [
    mainContainerRef,
  ]);

  const messagesWithType = useMemo(() => {
    if (errorMessages?.length >= 0) {
      return errorMessages.map((errorMessage: string) => ({
        data: errorMessage,
        execution_state: ExecutionStateEnum.IDLE,
        type: DataTypeEnum.TEXT_PLAIN,
      }));
    }
    return messages.filter((kernelOutput: KernelOutputType) => kernelOutput?.type);
  }, [
    errorMessages,
    messages,
  ]);
  const hasError = !!messagesWithType.find(({ error }) => error);

  const color = getColorsForBlockType(
    blockType,
    { blockColor, theme: themeContext },
  ).accent;
  const numberOfParentBlocks = blockUpstreamBlocks?.length || 0;

  const {
    dynamic,
    dynamicUpstreamBlock,
    reduceOutput,
    reduceOutputUpstreamBlock,
  } = useDynamicUpstreamBlocks([block], blocks)[0];

  const {
    borderColorShareProps,
    tags,
  } = useMemo(() => buildBorderProps({
    block,
    dynamic,
    dynamicUpstreamBlock,
    hasError,
    reduceOutput,
    reduceOutputUpstreamBlock,
    selected,
  }), [
    block,
    dynamic,
    dynamicUpstreamBlock,
    hasError,
    reduceOutput,
    reduceOutputUpstreamBlock,
    selected,
  ]);

  const hasOutput = messagesWithType.length >= 1;
  const onClickSelectBlock = useCallback(() => {
    if (!selected) {
      setAnyInputFocused?.(false);
      setSelected?.(true);
    }
  }, [
    selected,
    setAnyInputFocused,
    setSelected,
  ]);

  const {
    data: dataBlock,
    mutate: fetchBlock,
  } = api.blocks.pipelines.detail(
    pipelineUUID,
    (
      TAB_DBT_LINEAGE_UUID.uuid === selectedTab?.uuid ||
        TAB_DBT_SQL_UUID.uuid === selectedTab?.uuid
    ) ? encodeURIComponent(blockUUID)
      : null,
    {
      _format: 'dbt',
    },
    {
      revalidateOnFocus: true,
    },
  );
  const blockMetadata = useMemo(() => dataBlock?.block?.metadata || {}, [dataBlock]);

  const [updateBlock] = useMutation(
    api.blocks.pipelines.useUpdate(pipelineUUID, blockUUID),
    {
      onError: (response: any) => {
        const {
          messages,
        } = onError(response);
        setErrorMessages(messages);
      },
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setIsEditingBlockName(false);
            fetchPipeline();
            fetchFileTree();
            setContent(content);
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const uuidKeyboard = `CodeBlock/${blockUUID}`;
  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping, keyHistory) => {
      if (disableShortcuts && !allowCodeBlockShortcuts) {
        return;
      }

      if (isEditingBlockName
        && String(keyHistory[0]) === String(KEY_CODE_ENTER)
        && String(keyHistory[1]) !== String(KEY_CODE_META)
      ) {
        if (blockUUID === newBlockUuid) {
          event.target.blur();
        } else {
          // @ts-ignore
          updateBlock({
            block: {
              ...block,
              name: newBlockUuid,
            },
          });
        }
      } else if (selected && !hideRunButton) {
        if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_ENTER], keyMapping)
          || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_ENTER], keyMapping)
        ) {
          runBlockAndTrack({ block });
        } else if (onlyKeysPresent([KEY_CODE_SHIFT, KEY_CODE_ENTER], keyMapping) && addNewBlock) {
          event.preventDefault();
          addNewBlock({
            language: blockLanguage,
            type: blockType,
            upstream_blocks: [blockUUID],
          });
          runBlockAndTrack({ block });
        }
      }
    },
    [
      addNewBlock,
      block,
      hideRunButton,
      isEditingBlockName,
      newBlockUuid,
      runBlockAndTrack,
      selected,
      updateBlock,
    ],
  );

  useEffect(() => {
    let interval;

    if (runStartTime) {
      interval = setInterval(() => setCurrentTime(Number(new Date())), 1000);
    }
    if (currentTime && !isInProgress) {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [currentTime, isInProgress, runStartTime]);


  const buildBlockMenu = useCallback((b: BlockType) => {
    const blockMenuItems = {
      [BlockTypeEnum.SCRATCHPAD]: [
        ...buildConvertBlockMenuItems(b, blocks, 'block_menu/scratchpad', addNewBlock),
      ].map((config) => ({
        ...config,
        onClick: () => savePipelineContent().then(() => config.onClick()),
      })),
    };

    return blockMenuItems[b.type];
  }, [
    addNewBlock,
    blocks,
    savePipelineContent,
  ]);

  const replicatedBlock =
    useMemo(() => replicatedBlockUUID && blocksMapping?.[replicatedBlockUUID], [
      blocksMapping,
      replicatedBlockUUID,
    ]);

  const codeEditorEl = useMemo(() => !replicatedBlockUUID && (
    <>
      <CodeEditor
        autoHeight
        autocompleteProviders={autocompleteProviders}
        block={block}
        height={height}
        language={blockLanguage}
        onChange={(val: string) => {
          setContent(val);
          onChange?.(val);
        }}
        onDidChangeCursorPosition={onDidChangeCursorPosition}
        placeholder={BlockTypeEnum.DBT === blockType && BlockLanguageEnum.YAML === blockLanguage
          ? `e.g. --select ${dbtProjectName || 'project'}/models --exclude ${dbtProjectName || 'project'}/models/some_dir`
          : 'Start typing here...'
        }
        selected={selected}
        setSelected={setSelected}
        setTextareaFocused={setTextareaFocused}
        shortcuts={[
          (monaco, editor) => executeCode(monaco, () => {
            if (!hideRunButton) {
              runBlockAndTrack({
                /*
                 * This block doesn't get updated when the upstream dependencies change,
                 * so we need to update the shortcuts in the CodeEditor component.
                 */
                block,
                code: editor.getValue(),
              });
            }
          }),
        ]}
        textareaFocused={textareaFocused}
        value={content}
        width="100%"
      />
      {hasCallback && (
        <>
          <Divider />
          <Spacing mt={1}>
            <CodeHelperStyle normalPadding>
              <Text small>
                Callback block: define @on_success or @on_failure callbacks for this block.
              </Text>
              <Text monospace muted small>
                kwargs<Text inline monospace muted small> → </Text>
                global variables
              </Text>
            </CodeHelperStyle>
            <CodeEditor
              autoHeight
              autocompleteProviders={autocompleteProviders}
              language="python"
              onChange={(val: string) => {
                setCallbackContent(val);
                onCallbackChange?.(val);
              }}
              onDidChangeCursorPosition={onDidChangeCursorPosition}
              placeholder="Start typing here..."
              selected={selected}
              setSelected={setSelected}
              setTextareaFocused={setTextareaFocused}
              textareaFocused={textareaFocused}
              value={callbackContent}
              width="100%"
            />
          </Spacing>
        </>
      )}
    </>
  ), [
    autocompleteProviders,
    block,
    blockLanguage,
    blockType,
    callbackContent,
    content,
    dbtProjectName,
    hasCallback,
    height,
    hideRunButton,
    onCallbackChange,
    onChange,
    onDidChangeCursorPosition,
    replicatedBlockUUID,
    runBlockAndTrack,
    selected,
    setContent,
    setSelected,
    setTextareaFocused,
    textareaFocused,
  ]);

  useEffect(() => {
    setAutocompleteProviders({
      python: buildAutocompleteProvider({
        autocompleteItems,
        block,
        blocks,
        pipeline,
      }),
    });
  }, [
    autocompleteItems,
    block,
    blocks,
    pipeline,
  ]);

  const buttonTabs = useMemo(() => isDBT
    ? (
      <Spacing py={1}>
        <ButtonTabs
          onClickTab={(tab: TabType) => {
            setSelectedTab(tab);

            if (TAB_DBT_LINEAGE_UUID.uuid === tab.uuid || TAB_DBT_SQL_UUID.uuid === tab.uuid) {
              fetchBlock();
            }
          }}
          selectedTabUUID={selectedTab?.uuid}
          small
          tabs={TABS_DBT(block)}
        />
      </Spacing>
    )
    : null
  , [
    fetchBlock,
    isDBT,
    selectedTab,
  ]);

  const codeOutputEl = useMemo(() => (
    <CodeOutput
      {...borderColorShareProps}
      block={block}
      blockMetadata={blockMetadata}
      buttonTabs={buttonTabs}
      collapsed={outputCollapsed}
      hasOutput={hasOutput}
      isInProgress={isInProgress}
      mainContainerWidth={mainContainerWidth}
      messages={messagesWithType}
      openSidekickView={openSidekickView}
      pipeline={pipeline}
      runCount={runCount}
      runEndTime={runEndTime}
      runStartTime={runStartTime}
      selected={selected}
      selectedTab={selectedTab}
      setCollapsed={(val: boolean) => {
        setOutputCollapsed(() => {
          set(outputCollapsedUUID, val);
          return val;
        });
      }}
      setOutputBlocks={setOutputBlocks}
      setSelectedOutputBlock={setSelectedOutputBlock}
      setSelectedTab={setSelectedTab}
    />
  ), [
    block,
    blockMetadata,
    borderColorShareProps,
    buttonTabs,
    hasOutput,
    isInProgress,
    mainContainerWidth,
    messagesWithType,
    openSidekickView,
    outputCollapsed,
    outputCollapsedUUID,
    pipeline,
    runCount,
    runEndTime,
    runStartTime,
    selected,
    selectedTab,
    setOutputBlocks,
    setOutputCollapsed,
    setSelectedOutputBlock,
  ]);

  const closeBlockMenu = useCallback(() => setBlockMenuVisible(false), []);

  const timeout = useRef(null);
  const updateDataProviderConfig = useCallback((payload) => {
    clearTimeout(timeout.current);

    setDataProviderConfig((dataProviderConfigPrev) => {
      const data = {
        ...dataProviderConfigPrev,
        ...payload,
      };

      return data;
    });

    timeout.current = setTimeout(() => {
      const data = {
        ...dataProviderConfig,
        ...payload,
      };

      if ((typeof data[CONFIG_KEY_DATA_PROVIDER] !== 'undefined'
        && data[CONFIG_KEY_DATA_PROVIDER_PROFILE] !== 'undefined'
      )
        || typeof data[CONFIG_KEY_DBT_PROFILE_TARGET] !== 'undefined'
        || typeof data[CONFIG_KEY_DBT_PROJECT_NAME] !== 'undefined'
        || typeof data[CONFIG_KEY_LIMIT] !== 'undefined'
      ) {
        savePipelineContent({
          block: {
            configuration: data,
            uuid: blockUUID,
          },
        });
      }
    }, 1000);
  }, [
    blockUUID,
    dataProviderConfig,
    savePipelineContent,
  ]);

  const requiresDatabaseName = (DataSourceTypeEnum.BIGQUERY === dataProviderConfig[CONFIG_KEY_DATA_PROVIDER]
    || DataSourceTypeEnum.SNOWFLAKE === dataProviderConfig[CONFIG_KEY_DATA_PROVIDER]
  );

  const blocksLength = useMemo(() => blocks?.length || 0, [blocks]);

  const markdownEl = useMemo(() => (
    (!content)
    ?
      <Spacing px={1}>
        <Text monospace muted>
          Double-click to edit
        </Text>
      </Spacing>
    :
      <Markdown>
        {content}
      </Markdown>
  ), [content]);
  useEffect(() => {
    if (isMarkdown && isEditingBlock && !selected) {
      setIsEditingBlock(false);
    }
  }, [isEditingBlock, isMarkdown, selected]);

  const limitInputEl = useMemo(() => (
    <TextInput
      compact
      monospace
      onBlur={() => setTimeout(() => {
        setAnyInputFocused(false);
      }, 300)}
      onChange={(e) => {
        // @ts-ignore
        setAnyInputFocused(true);
        updateDataProviderConfig({
          [CONFIG_KEY_LIMIT]: e.target.value,
        });
        e.preventDefault();
      }}
      onClick={pauseEvent}
      onFocus={() => {
        setAnyInputFocused(true);
      }}
      small
      type="number"
      value={dataProviderConfig[CONFIG_KEY_LIMIT] || ''}
      width={UNIT * 11}
    />
  ), [
    dataProviderConfig,
    setAnyInputFocused,
    updateDataProviderConfig,
  ]);

  return (
    <div ref={drop}>
      <div
        ref={ref}
        style={{
          position: 'relative',
          zIndex: blockIdx === addNewBlockMenuOpenIdx ? (blocksLength + 9) : null,
        }}
      >
        <div
          style={{
            position: 'relative',
          }}
        >
          <BlockHeaderStyle
            {...{
              ...borderColorShareProps,
              ...collected,
            }}
            bottomBorder={isMarkdown}
            onClick={() => onClickSelectBlock()}
            ref={drag}
            zIndex={blocksLength + 1 - (blockIdx || 0)}
          >
            <FlexContainer
              alignItems="center"
              justifyContent="space-between"
            >
              <Flex alignItems="center" flex={1}>
                <FlexContainer alignItems="center">
                  <Badge monospace>
                    {ABBREV_BLOCK_LANGUAGE_MAPPING[blockLanguage]}
                  </Badge>

                  <Spacing mr={1} />

                  <Circle
                    color={color}
                    size={UNIT * 1.5}
                    square
                  />

                  <Spacing mr={1} />

                  <FlyoutMenuWrapper
                    items={buildBlockMenu(block)}
                    onClickCallback={closeBlockMenu}
                    onClickOutside={closeBlockMenu}
                    open={blockMenuVisible}
                    parentRef={blockMenuRef}
                    uuid="CodeBlock/block_menu"
                  >
                    <Text
                      color={color}
                      monospace
                    >
                      {(
                        isDBT
                          ? BlockTypeEnum.DBT
                          : BLOCK_TYPE_NAME_MAPPING[blockType]
                      )?.toUpperCase()}
                    </Text>
                  </FlyoutMenuWrapper>

                  {BlockTypeEnum.SCRATCHPAD === blockType && (
                    <>
                      &nbsp;
                      <Button
                        basic
                        iconOnly
                        noPadding
                        onClick={() => setBlockMenuVisible(true)}
                        transparent
                      >
                        <ArrowDown muted />
                      </Button>
                    </>
                  )}
                </FlexContainer>

                <Spacing mr={PADDING_UNITS} />

                <FileFill size={UNIT * 1.5} />

                <Spacing mr={1} />

                <FlexContainer alignItems="center">
                  {isDBT && BlockLanguageEnum.YAML !== blockLanguage && (
                    <Tooltip
                      block
                      label={getModelName(block, {
                        fullPath: true,
                      })}
                      size={null}
                    >
                      <Text monospace muted>
                        {getModelName(block)}
                      </Text>
                    </Tooltip>
                  )}

                  {(!isDBT || BlockLanguageEnum.YAML === blockLanguage) && (
                    <LabelWithValueClicker
                      bold={false}
                      inputValue={newBlockUuid}
                      monospace
                      muted
                      notRequired
                      onBlur={() => setTimeout(() => {
                        setAnyInputFocused(false);
                        setIsEditingBlockName(false);
                      }, 300)}
                      onChange={(e) => {
                        setNewBlockUuid(e.target.value);
                        e.preventDefault();
                      }}
                      onClick={() => {
                        setAnyInputFocused(true);
                        setIsEditingBlockName(true);
                      }}
                      onFocus={() => {
                        setAnyInputFocused(true);
                        setIsEditingBlockName(true);
                      }}
                      stacked
                      value={!isEditingBlockName && blockUUID}
                    />
                  )}

                  {isEditingBlockName && !isDBT && (
                    <>
                      <Spacing ml={1} />
                      <Link
                        // @ts-ignore
                        onClick={() => savePipelineContent({
                          block: {
                            name: newBlockUuid,
                            uuid: blockUUID,
                          },
                        }).then(() => {
                          setIsEditingBlockName(false);
                          fetchPipeline();
                          fetchFileTree();
                        })}
                        preventDefault
                        sameColorAsText
                        small
                      >
                        Update name
                      </Link>
                    </>
                  )}
                </FlexContainer>

                <Spacing mr={2} />

                {(!BLOCK_TYPES_WITH_NO_PARENTS.includes(blockType)
                  && mainContainerWidth > 700) && (
                  <Tooltip
                    appearBefore
                    block
                    label={`
                      ${pluralize('parent block', numberOfParentBlocks)}. ${numberOfParentBlocks === 0
                        ? 'Click to select 1 or more blocks to depend on.'
                        : 'Edit parent blocks.'
                      }
                    `}
                    size={null}
                    widthFitContent={numberOfParentBlocks >= 1}
                  >
                    <Button
                      noBackground
                      noBorder
                      noPadding
                      onClick={() => {
                        setSelected(true);
                        setEditingBlock({
                          upstreamBlocks: {
                            block,
                            values: blockUpstreamBlocks?.map(uuid => ({ uuid })),
                          },
                        });
                      }}
                      >
                      <FlexContainer alignItems="center">
                        <Text
                          monospace={numberOfParentBlocks >= 1}
                          small={numberOfParentBlocks >= 1}
                          underline={numberOfParentBlocks === 0}
                        >
                          {numberOfParentBlocks === 0 && 'Edit parent blocks'}
                          {numberOfParentBlocks >= 1 && pluralize('parent block', numberOfParentBlocks)}
                        </Text>

                        <Spacing mr={1} />

                        {numberOfParentBlocks === 0 && <ParentEmpty size={UNIT * 3} />}
                        {numberOfParentBlocks >= 1 &&  <ParentLinked size={UNIT * 3} />}
                      </FlexContainer>
                    </Button>
                  </Tooltip>
                )}
              </Flex>

              <CommandButtons
                addNewBlock={addNewBlock}
                addWidget={addWidget}
                block={block}
                blocks={blocks}
                deleteBlock={deleteBlock}
                executionState={executionState}
                fetchFileTree={fetchFileTree}
                fetchPipeline={fetchPipeline}
                interruptKernel={interruptKernel}
                isEditingBlock={isEditingBlock}
                pipeline={pipeline}
                runBlock={hideRunButton ? null : runBlockAndTrack}
                savePipelineContent={savePipelineContent}
                setErrors={setErrors}
                setIsEditingBlock={setIsEditingBlock}
                setOutputCollapsed={setOutputCollapsed}
              />

              <Spacing px={1}>
                <Button
                  basic
                  iconOnly
                  noPadding
                  onClick={() => {
                    setCodeCollapsed((collapsedPrev) => {
                      set(codeCollapsedUUID, !collapsedPrev);
                      return !collapsedPrev;
                    });

                    if (!codeCollapsed) {
                      setOutputCollapsed(() => {
                        set(outputCollapsedUUID, true);
                        return true;
                      });
                    }
                  }}
                  transparent
                >
                  {codeCollapsed
                    ? <ChevronDown muted size={UNIT * 2} />
                    : <ChevronUp muted size={UNIT * 2} />
                  }
                </Button>
              </Spacing>
            </FlexContainer>
          </BlockHeaderStyle>

          <ContainerStyle
            onClick={() => onClickSelectBlock()}
          >
            <CodeContainerStyle
              {...borderColorShareProps}
              className={selected && textareaFocused ? 'selected' : null}
              hasOutput={!!buttonTabs || hasOutput}
              lightBackground={isMarkdown && !isEditingBlock}
              onDoubleClick={() => {
                if (isMarkdown && !isEditingBlock) {
                  setIsEditingBlock(true);
                }
              }}
            >
              {BlockTypeEnum.DBT === blockType
                && !codeCollapsed
                && (
                <CodeHelperStyle normalPadding>
                  <FlexContainer
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Flex alignItems="center">
                      {BlockLanguageEnum.YAML === blockLanguage && (
                        <Select
                          compact
                          monospace
                          onBlur={() => setTimeout(() => {
                            setAnyInputFocused(false);
                          }, 300)}
                          onChange={(e) => {
                            // @ts-ignore
                            updateDataProviderConfig({
                              [CONFIG_KEY_DBT_PROFILE_TARGET]: '',
                              [CONFIG_KEY_DBT_PROJECT_NAME]: e.target.value,
                            });
                            e.preventDefault();
                          }}
                          onClick={pauseEvent}
                          onFocus={() => {
                            setAnyInputFocused(true);
                          }}
                          placeholder="Project"
                          small
                          value={dataProviderConfig[CONFIG_KEY_DBT_PROJECT_NAME] || ''}
                        >
                          {Object.keys(dbtProjects || {}).map((projectName: string) => (
                            <option key={projectName} value={projectName}>
                              {projectName}
                            </option>
                          ))}
                        </Select>
                      )}

                      {BlockLanguageEnum.YAML !== blockLanguage && (
                        <Text monospace small>
                          {dbtProjectName}
                        </Text>
                      )}

                      <Spacing mr={2} />

                      <Text monospace muted small>
                        Target
                      </Text>

                      <span>&nbsp;</span>

                      {!manuallyEnterTarget && (
                        <Select
                          compact
                          disabled={!dbtProjectName}
                          monospace
                          onBlur={() => setTimeout(() => {
                            setAnyInputFocused(false);
                          }, 300)}
                          onChange={(e) => {
                            // @ts-ignore
                            updateDataProviderConfig({
                              [CONFIG_KEY_DBT_PROFILE_TARGET]: e.target.value,
                            });
                            e.preventDefault();
                          }}
                          onClick={pauseEvent}
                          onFocus={() => {
                            setAnyInputFocused(true);
                          }}
                          placeholder={dbtProjectName
                            ? isSQLBlock
                              ? dbtProfileData?.target
                              : null
                            : 'Select project first'
                          }
                          small
                          value={dbtProfileTarget || ''}
                        >
                          {dbtProfileTargets?.map((target: string) => (
                            <option key={target} value={target}>
                              {target}
                            </option>
                          ))}
                        </Select>
                      )}

                      {manuallyEnterTarget && (
                        <TextInput
                          compact
                          monospace
                          onBlur={() => setTimeout(() => {
                            setAnyInputFocused(false);
                          }, 300)}
                          onChange={(e) => {
                            // @ts-ignore
                            updateDataProviderConfig({
                              [CONFIG_KEY_DBT_PROFILE_TARGET]: e.target.value,
                            });
                            e.preventDefault();
                          }}
                          onClick={pauseEvent}
                          onFocus={() => {
                            setAnyInputFocused(true);
                          }}
                          placeholder={dbtProjectName
                            ? isSQLBlock
                              ? dbtProfileData?.target
                              : null
                            : 'Select project first'
                          }
                          small
                          value={dbtProfileTarget || ''}
                          width={UNIT * 21}
                        />
                      )}

                      <Spacing mr={1} />

                      <FlexContainer alignItems="center">
                        <Tooltip
                          block
                          description={
                            <Text default inline>
                              Manually type the name of the target you want to use in the profile.
                              <br />
                              Interpolate environment variables and
                              global variables using the following syntax:
                              <br />
                              <Text default inline monospace>
                                {'{{ env_var(\'NAME\') }}'}
                              </Text> or <Text default inline monospace>
                                {'{{ variables(\'NAME\') }}'}
                              </Text>
                            </Text>
                          }
                          size={null}
                          widthFitContent
                        >
                          <FlexContainer alignItems="center">
                            <Checkbox
                              checked={manuallyEnterTarget}
                              label={
                                <Text muted small>
                                  Manually enter target
                                </Text>
                              }
                              onClick={(e) => {
                                pauseEvent(e);
                                setManuallyEnterTarget(!manuallyEnterTarget);
                              }}
                            />
                            <span>&nbsp;</span>
                            <Info muted />
                          </FlexContainer>
                        </Tooltip>
                      </FlexContainer>
                    </Flex>

                    {BlockLanguageEnum.YAML !== blockLanguage && !dbtMetadata?.block?.snapshot && (
                      <FlexContainer alignItems="center">
                        <Tooltip
                          appearBefore
                          block
                          description={
                            <Text default inline>
                              Limit the number of results that are returned
                              <br />
                              when running this block in the notebook.
                              <br />
                              This limit won’t affect the number of results
                              <br />
                              returned when running the pipeline end-to-end.
                            </Text>
                          }
                          size={null}
                          widthFitContent
                        >
                          <FlexContainer alignItems="center">
                            <Info muted />
                            <span>&nbsp;</span>
                            <Text monospace muted small>
                              Sample limit
                            </Text>
                            <span>&nbsp;</span>
                          </FlexContainer>
                        </Tooltip>
                        {limitInputEl}
                        <Spacing mr={1} />
                      </FlexContainer>
                    )}
                  </FlexContainer>

                  {BlockLanguageEnum.YAML === blockLanguage && (
                    <Spacing mt={1}>
                      <FlexContainer alignItems="center">
                        <Flex flex={1}>
                          <Text default monospace small>
                            dbt run <Text
                              inline
                              monospace
                              small
                            >
                              [type your --select and --exclude syntax below]
                            </Text>
                          </Text>

                          <Spacing mr={1} />

                          <Text monospace muted small>
                            (paths start from {dataProviderConfig?.[CONFIG_KEY_DBT_PROJECT_NAME] || 'project'} folder)
                          </Text>
                        </Flex>

                        <Spacing mr={1} />

                        <Text muted small>
                          <Link
                            href="https://docs.getdbt.com/reference/node-selection/syntax#examples"
                            openNewWindow
                            small
                          >
                            Examples
                          </Link>
                        </Text>

                        <Spacing mr={1} />
                      </FlexContainer>
                    </Spacing>
                  )}
                </CodeHelperStyle>
              )}

              {isSQLBlock
                && !codeCollapsed
                && BlockTypeEnum.DBT !== blockType
                && (
                <CodeHelperStyle normalPadding>
                  <FlexContainer
                    flexWrap="wrap"
                    style={{ marginTop: '-8px' }}
                  >
                    <FlexContainer style={{ marginTop: '8px' }}>
                      <Select
                        compact
                        label="Connection"
                        // @ts-ignore
                        onChange={e => updateDataProviderConfig({
                          [CONFIG_KEY_DATA_PROVIDER]: e.target.value,
                        })}
                        onClick={pauseEvent}
                        small
                        value={dataProviderConfig[CONFIG_KEY_DATA_PROVIDER]}
                      >
                        {dataProviders?.map(({
                          id,
                          value,
                        }: DataProviderType) => (
                          <option key={id} value={value}>
                            {id}
                          </option>
                        ))}
                      </Select>

                      <Spacing mr={1} />

                      <Select
                        compact
                        label="Profile"
                        // @ts-ignore
                        onChange={e => updateDataProviderConfig({
                          [CONFIG_KEY_DATA_PROVIDER_PROFILE]: e.target.value,
                        })}
                        onClick={pauseEvent}
                        small
                        value={dataProviderConfig[CONFIG_KEY_DATA_PROVIDER_PROFILE]}
                      >
                        {dataProviderProfiles?.map((id: string) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </Select>

                      <Spacing mr={1} />

                      <FlexContainer alignItems="center">
                        <Tooltip
                          block
                          description={
                            <Text default inline>
                              If checked, you’ll have to write your own custom
                              <br />
                              CREATE TABLE commands and INSERT commands.
                              <br />
                              Separate your commands using a semi-colon: <Text default inline monospace>
                                ;
                              </Text>
                            </Text>
                          }
                          size={null}
                          widthFitContent
                        >
                          <FlexContainer alignItems="center">
                            <Checkbox
                              checked={dataProviderConfig[CONFIG_KEY_USE_RAW_SQL]}
                              label={
                                <Text muted small>
                                  Use raw SQL
                                </Text>
                              }
                              onClick={(e) => {
                                pauseEvent(e);
                                updateDataProviderConfig({
                                  [CONFIG_KEY_USE_RAW_SQL]: !dataProviderConfig[CONFIG_KEY_USE_RAW_SQL],
                                });
                              }}
                            />
                            <span>&nbsp;</span>
                            <Info muted />
                          </FlexContainer>
                        </Tooltip>
                      </FlexContainer>

                      {!dataProviderConfig[CONFIG_KEY_USE_RAW_SQL] && (
                        <>
                          {requiresDatabaseName && (
                            <>
                              <Spacing mr={1} />

                              <FlexContainer alignItems="center">
                                <TextInput
                                  compact
                                  label="Database"
                                  monospace
                                  onBlur={() => setTimeout(() => {
                                    setAnyInputFocused(false);
                                  }, 300)}
                                  onChange={(e) => {
                                    // @ts-ignore
                                    updateDataProviderConfig({
                                      [CONFIG_KEY_DATA_PROVIDER_DATABASE]: e.target.value,
                                    });
                                    e.preventDefault();
                                  }}
                                  onClick={pauseEvent}
                                  onFocus={() => {
                                    setAnyInputFocused(true);
                                  }}
                                  small
                                  value={dataProviderConfig[CONFIG_KEY_DATA_PROVIDER_DATABASE]}
                                  width={10 * UNIT}
                                />
                              </FlexContainer>
                            </>
                          )}

                          <Spacing mr={1} />

                          {![
                            DataProviderEnum.CLICKHOUSE,
                            DataProviderEnum.MYSQL,
                            // @ts-ignore
                          ].includes(dataProviderConfig[CONFIG_KEY_DATA_PROVIDER]) &&
                            <>
                              <Tooltip
                                block
                                description={
                                  <Text default inline>
                                    Schema that is used when creating a table and inserting values.
                                    <br />
                                    This field is required.
                                  </Text>
                                }
                                size={null}
                                widthFitContent
                              >
                                <FlexContainer alignItems="center">
                                  <TextInput
                                    compact
                                    label="Schema"
                                    monospace
                                    onBlur={() => setTimeout(() => {
                                      setAnyInputFocused(false);
                                    }, 300)}
                                    onChange={(e) => {
                                      // @ts-ignore
                                      updateDataProviderConfig({
                                        [CONFIG_KEY_DATA_PROVIDER_SCHEMA]: e.target.value,
                                      });
                                      e.preventDefault();
                                    }}
                                    onClick={pauseEvent}
                                    onFocus={() => {
                                      setAnyInputFocused(true);
                                    }}
                                    small
                                    value={dataProviderConfig[CONFIG_KEY_DATA_PROVIDER_SCHEMA]}
                                    width={10 * UNIT}
                                  />
                                </FlexContainer>
                              </Tooltip>

                              <Spacing mr={1} />
                            </>
                          }

                          <Tooltip
                            block
                            description={
                              <Text default inline>
                                This value will be used as the table name.
                                <br />
                                If blank, the default table name will be:
                                <br />
                                <Text inline monospace>
                                  {pipelineUUID}_{blockUUID}
                                </Text>
                                <br />
                                This field is optional.
                              </Text>
                            }
                            size={null}
                            widthFitContent
                          >
                            <FlexContainer alignItems="center">
                              <TextInput
                                compact
                                label="Table (optional)"
                                monospace
                                onBlur={() => setTimeout(() => {
                                  setAnyInputFocused(false);
                                }, 300)}
                                onChange={(e) => {
                                  // @ts-ignore
                                  updateDataProviderConfig({
                                    [CONFIG_KEY_DATA_PROVIDER_TABLE]: e.target.value,
                                  });
                                  e.preventDefault();
                                }}
                                onClick={pauseEvent}
                                onFocus={() => {
                                  setAnyInputFocused(true);
                                }}
                                small
                                value={dataProviderConfig[CONFIG_KEY_DATA_PROVIDER_TABLE]}
                                width={20 * UNIT}
                              />
                            </FlexContainer>
                          </Tooltip>
                        </>
                      )}
                      <Spacing mr={1} />
                    </FlexContainer>

                    {!dataProviderConfig[CONFIG_KEY_USE_RAW_SQL] && (
                      <FlexContainer alignItems="center" style={{ marginTop: '8px' }}>
                        <Tooltip
                          block
                          description={
                            <Text default inline>
                              Limit the number of results that are returned
                              <br />
                              when running this block in the notebook.
                              <br />
                              This limit won’t affect the number of results
                              <br />
                              returned when running the pipeline end-to-end.
                            </Text>
                          }
                          size={null}
                          widthFitContent
                        >
                          <FlexContainer alignItems="center">
                            <Info muted />
                            <span>&nbsp;</span>
                            <Text monospace muted small>
                              Limit
                            </Text>
                            <span>&nbsp;</span>
                          </FlexContainer>
                        </Tooltip>
                        {limitInputEl}
                        <Spacing mr={1} />
                        <Tooltip
                          autoWidth
                          block
                          description={
                            <Text default inline>
                              How do you want to handle existing data with the
                              same{requiresDatabaseName ? ' database,' : ''} schema, and table name?
                              <br />
                              <Text bold inline monospace>Append</Text>: add rows to the existing table.
                              <br />
                              <Text bold inline monospace>Replace</Text>: delete the existing data.
                              <br />
                              <Text bold inline monospace>Fail</Text>: raise an error during execution.
                            </Text>
                          }
                          size={null}
                          widthFitContent
                        >
                          <FlexContainer alignItems="center">
                            <Info muted />
                            <span>&nbsp;</span>
                            <Text monospace muted small>
                              Write policy:
                            </Text>
                            <span>&nbsp;</span>

                            <Select
                              compact
                              label="strategy"
                              // @ts-ignore
                              onChange={e => updateDataProviderConfig({
                                [CONFIG_KEY_EXPORT_WRITE_POLICY]: e.target.value,
                              })}
                              onClick={pauseEvent}
                              small
                              value={dataProviderConfig[CONFIG_KEY_EXPORT_WRITE_POLICY]}
                            >
                              {EXPORT_WRITE_POLICIES?.map(value => (
                                <option key={value} value={value}>
                                  {capitalize(value)}
                                </option>
                              ))}
                            </Select>
                          </FlexContainer>
                        </Tooltip>
                        <Spacing mr={1} />
                      </FlexContainer>
                    )}

                    {dataProviderConfig?.[CONFIG_KEY_DATA_PROVIDER] === DataProviderEnum.TRINO
                      && blockUpstreamBlocks.length >= 1
                      && (
                      <FlexContainer alignItems="center"  style={{ marginTop: '8px' }}>
                        <Tooltip
                          appearBefore
                          block
                          description={
                            <Text default inline>
                              If checked, upstream blocks that aren’t SQL blocks
                              <br />
                              will have their data exported into a table that is
                              <br />
                              uniquely named upon each block run. For example,
                              <br />
                              <Text default inline monospace>
                                [pipeline_uuid]_[block_uuid]_[unique_timestamp]
                              </Text>.
                            </Text>
                          }
                          size={null}
                          widthFitContent
                        >
                          <FlexContainer alignItems="center">
                            <Checkbox
                              checked={dataProviderConfig[CONFIG_KEY_UNIQUE_UPSTREAM_TABLE_NAME]}
                              label={
                                <Text muted small>
                                  Unique upstream table names
                                </Text>
                              }
                              onClick={(e) => {
                                pauseEvent(e);
                                updateDataProviderConfig({
                                  [CONFIG_KEY_UNIQUE_UPSTREAM_TABLE_NAME]: !dataProviderConfig[CONFIG_KEY_UNIQUE_UPSTREAM_TABLE_NAME],
                                });
                              }}
                            />
                            <span>&nbsp;</span>
                            <Info muted />
                          </FlexContainer>
                        </Tooltip>

                        <Spacing mr={1} />
                      </FlexContainer>
                    )}
                  </FlexContainer>
                </CodeHelperStyle>
              )}

              {tags.length >= 1 && (
                <CodeHelperStyle normalPadding>
                  <FlexContainer>
                    {tags.map(({
                      description,
                      title,
                    }, idx) => (
                      <Spacing key={title} ml={idx >= 1 ? 1 : 0}>
                        <Tooltip
                          block
                          description={description}
                          size={null}
                          widthFitContent
                        >
                          <Badge>
                            {title}
                          </Badge>
                        </Tooltip>
                      </Spacing>
                    ))}
                  </FlexContainer>
                </CodeHelperStyle>
              )}

              {blockUpstreamBlocks.length >= 1
                && !codeCollapsed
                && BLOCK_TYPES_WITH_UPSTREAM_INPUTS.includes(blockType)
                && !isStreamingPipeline
                && !replicatedBlockUUID
                && (
                <CodeHelperStyle normalPadding>
                  <Spacing mr={1}>
                    <Text muted small>
                      {!isSQLBlock && `Positional arguments for ${isRBlock ? '' : 'decorated '}function:`}
                      {isSQLBlock && (
                        <>
                          The interpolated tables below are available in queries from upstream blocks.
                          <br />
                          Example: <Text inline monospace small>
                            {'SELECT * FROM {{ df_1 }}'}
                          </Text> to insert
                          all rows from <Text inline monospace small>
                            {blockUpstreamBlocks?.[0]}
                          </Text> into a table.
                        </>
                      )}
                    </Text>
                  </Spacing>

                  <Spacing mt={1}>
                    {(!isSQLBlock && !isRBlock) && (
                      <>
                        <Text monospace muted small>
                          {BlockTypeEnum.DATA_EXPORTER === blockType && '@data_exporter'}
                          {BlockTypeEnum.DATA_LOADER === blockType && '@data_loader'}
                          {BlockTypeEnum.TRANSFORMER === blockType && '@transformer'}
                          {BlockTypeEnum.CUSTOM === blockType && '@custom'}
                        </Text>
                        <Text monospace muted small>
                          def {BlockTypeEnum.DATA_EXPORTER === blockType && 'export_data'
                            || (BlockTypeEnum.DATA_LOADER === blockType && 'load_data')
                            || (BlockTypeEnum.TRANSFORMER === blockType && 'transform')
                            || (BlockTypeEnum.CUSTOM === blockType && 'transform_custom')}
                          ({blockUpstreamBlocks.map((_,i) => i >= 1 ? `data_${i + 1}` : 'data').join(', ')}):
                        </Text>
                      </>
                    )}
                    {isRBlock && (
                      <>
                        <Text monospace muted small>
                          {BlockTypeEnum.DATA_EXPORTER === blockType && 'export_data'
                            || (BlockTypeEnum.TRANSFORMER === blockType && 'transform')}
                          &nbsp;← function({blockUpstreamBlocks.map((_,i) => `df_${i + 1}`).join(', ')}):
                        </Text>
                      </>
                    )}

                    {isSQLBlock && blockUpstreamBlocks?.length >= 1 && (
                      <UpstreamBlockSettings
                        block={block}
                        blockConfiguration={dataProviderConfig}
                        blockRefs={blockRefs}
                        blocks={blockUpstreamBlocks?.map(blockUUID => blocksMapping?.[blockUUID])}
                        updateBlockConfiguration={updateDataProviderConfig}
                      />
                    )}

                    {!isSQLBlock && blockUpstreamBlocks.map((blockUUID, i) => {
                      const b = blocksMapping[blockUUID];
                      const blockColor = getColorsForBlockType(
                          b?.type,
                          { blockColor: b?.color, theme: themeContext },
                        ).accent;
                      const sqlVariable = `{{ df_${i + 1} }}`;

                      return (
                        <div key={blockUUID}>
                          {(!isSQLBlock && !isRBlock) && (
                            <Text inline monospace muted small>
                              &nbsp;&nbsp;&nbsp;&nbsp;data{i >= 1 ? `_${i + 1}` : null}
                            </Text>
                          )}{isSQLBlock && (
                            <Text inline monospace muted small>
                              {sqlVariable}
                            </Text>
                          )}{isRBlock && (
                            <Text inline monospace muted small>
                              &nbsp;&nbsp;&nbsp;&nbsp;{`df${i + 1}`}
                            </Text>
                          )} <Text inline monospace muted small>→</Text> <Link
                            color={blockColor}
                            onClick={() => {
                              const refBlock = blockRefs?.current?.[`${b?.type}s/${b?.uuid}.py`];
                              refBlock?.current?.scrollIntoView();
                            }}
                            preventDefault
                            small
                          >
                            <Text
                              color={blockColor}
                              inline
                              monospace
                              small
                            >
                              {blockUUID}
                            </Text>
                          </Link>
                        </div>
                      );
                    })}
                  </Spacing>
                </CodeHelperStyle>
              )}

              {!blockError && (
                <>
                  {!codeCollapsed
                    ? (!(isMarkdown && !isEditingBlock)
                      ? replicatedBlock
                        ? (<Spacing px={1}>
                          <Text monospace muted>
                            Replicated from block <Link
                              color={getColorsForBlockType(
                                replicatedBlock?.type,
                                { blockColor: replicatedBlock?.color, theme: themeContext },
                              ).accent}
                              onClick={(e) => {
                                pauseEvent(e);

                                const refBlock =
                                  blockRefs?.current?.[`${replicatedBlock?.type}s/${replicatedBlock?.uuid}.py`];
                                refBlock?.current?.scrollIntoView();
                              }}
                              preventDefault
                            >
                              <Text
                                color={getColorsForBlockType(
                                  replicatedBlock?.type,
                                  { blockColor: replicatedBlock?.color, theme: themeContext },
                                ).accent}
                                inline
                                monospace
                              >
                                {replicatedBlock?.uuid}
                              </Text>
                            </Link>
                          </Text>
                        </Spacing>)
                        : codeEditorEl
                      : markdownEl
                    )
                    : (
                      <Spacing px={1}>
                        <Text monospace muted>
                          ({pluralize('line', content?.split(/\r\n|\r|\n/).length)} collapsed)
                        </Text>
                      </Spacing>
                    )
                  }
                </>
              )}

              {extraContent && React.cloneElement(extraContent, {
                runBlockAndTrack,
              })}

              {blockError && (
                <Spacing p={PADDING_UNITS}>
                  <Text bold danger>
                    {blockError?.error}
                  </Text>
                  <Text muted>
                    {blockError?.message}
                  </Text>
                </Spacing>
              )}

              {isInProgress && currentTime && currentTime > runStartTime && (
                <TimeTrackerStyle>
                  <Text muted>
                    {`${Math.round((currentTime - runStartTime) / 1000)}`}s
                  </Text>
                </TimeTrackerStyle>
              )}

              {!codeCollapsed && ![
                BlockTypeEnum.CALLBACK,
                BlockTypeEnum.EXTENSION,
              ].includes(blockType) && (
                <BlockExtras
                  block={block}
                  blocks={allBlocks}
                  openSidekickView={openSidekickView}
                />
              )}
            </CodeContainerStyle>

            {codeOutputEl}
          </ContainerStyle>
        </div>

        {!noDivider && (
          <BlockDivider
            additionalZIndex={blocksLength - blockIdx}
            onMouseEnter={() => setAddNewBlocksVisible(true)}
            onMouseLeave={() => {
              setAddNewBlocksVisible(false);
              setAddNewBlockMenuOpenIdx?.(null);
            }}
          >
            {addNewBlocksVisible && addNewBlock && (
              <Spacing mt={2}>
                <AddNewBlocks
                  addNewBlock={(newBlock: BlockRequestPayloadType) => {
                    let content = newBlock.content;
                    let configuration = newBlock.configuration;
                    const upstreamBlocks = getUpstreamBlockUuids(block, newBlock);
                    const downstreamBlockUUIDs = getDownstreamBlockUuids(pipeline, block, newBlock);
                    const downstreamBlocks = downstreamBlockUUIDs.map(uuid => {
                      const currDownstreamBlock = { ...(blocksMapping[uuid] || {}) };
                      const upstreamsOfDownstreamBlock = currDownstreamBlock.upstream_blocks;
                      if (upstreamsOfDownstreamBlock) {
                        currDownstreamBlock.upstream_blocks = upstreamsOfDownstreamBlock.filter(
                          upstreamUUID => upstreamUUID !== blockUUID,
                        );
                      }
                      return currDownstreamBlock;
                    });

                    if ([BlockTypeEnum.DATA_LOADER, BlockTypeEnum.TRANSFORMER].includes(blockType)
                      && BlockTypeEnum.SCRATCHPAD === newBlock.type
                    ) {
                      content = `from mage_ai.data_preparation.variable_manager import get_variable


  df = get_variable('${pipelineUUID}', '${blockUUID}', 'output_0')`;
                    }
                    content = addScratchpadNote(newBlock, content);

                    if (BlockLanguageEnum.SQL === blockLanguage) {
                      configuration = {
                        ...selectKeys(blockConfiguration, [
                          CONFIG_KEY_DATA_PROVIDER,
                          CONFIG_KEY_DATA_PROVIDER_DATABASE,
                          CONFIG_KEY_DATA_PROVIDER_PROFILE,
                          CONFIG_KEY_DATA_PROVIDER_SCHEMA,
                          CONFIG_KEY_EXPORT_WRITE_POLICY,
                        ]),
                        ...configuration,
                      };
                    }
                    if (BlockLanguageEnum.SQL === newBlock.language) {
                      content = addSqlBlockNote(content);
                    }

                    return addNewBlock(
                      {
                        ...newBlock,
                        configuration,
                        content,
                        upstream_blocks: upstreamBlocks,
                      },
                      downstreamBlocks,
                    );
                  }}
                  blockIdx={blockIdx}
                  blockTemplates={blockTemplates}
                  compact
                  hideCustom={isStreamingPipeline}
                  hideDbt={isStreamingPipeline}
                  onClickAddSingleDBTModel={onClickAddSingleDBTModel}
                  pipeline={pipeline}
                  setAddNewBlockMenuOpenIdx={setAddNewBlockMenuOpenIdx}
                  setCreatingNewDBTModel={setCreatingNewDBTModel}
                />
              </Spacing>
            )}
            <BlockDividerInner className="block-divider-inner" />
          </BlockDivider>
        )}
      </div>
    </div>
  );
}

export default React.forwardRef(CodeBlock);
