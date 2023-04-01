import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { useMutation } from 'react-query';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import AutocompleteItemType from '@interfaces/AutocompleteItemType';
import Badge from '@oracle/components/Badge';
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
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
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
  CONFIG_KEY_USE_RAW_SQL,
} from '@interfaces/ChartBlockType';
import { DataSourceTypeEnum } from '@interfaces/DataSourceType';
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
import { buildConvertBlockMenuItems, getUpstreamBlockUuids } from './utils';
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

type CodeBlockProps = {
  addNewBlock?: (block: BlockType) => Promise<any>;
  addNewBlockMenuOpenIdx?: number;
  autocompleteItems: AutocompleteItemType[];
  block: BlockType;
  blockRefs: any;
  blockIdx: number;
  blocks: BlockType[];
  dataProviders?: DataProviderType[];
  defaultValue?: string;
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
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean) => void;
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
  setRecsWindowOpenBlockIdx?: (idx: number) => void;
  setSelectedOutputBlock?: (block: BlockType) => void;
  widgets?: BlockType[];
} & CodeEditorSharedProps & CommandButtonsSharedProps & SetEditingBlockType;

function CodeBlock({
  addNewBlock,
  addNewBlockMenuOpenIdx,
  addWidget,
  autocompleteItems,
  block,
  blockIdx,
  blockRefs,
  blocks,
  dataProviders,
  defaultValue = '',
  deleteBlock,
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
  setRecsWindowOpenBlockIdx,
  setSelected,
  setSelectedOutputBlock,
  setTextareaFocused,
  textareaFocused,
  widgets,
}: CodeBlockProps, ref) {
  const themeContext = useContext(ThemeContext);

  const blockConfiguration = useMemo(() => block?.configuration || {}, [block]);

  const [addNewBlocksVisible, setAddNewBlocksVisible] = useState(false);
  const [autocompleteProviders, setAutocompleteProviders] = useState(null);
  const [blockMenuVisible, setBlockMenuVisible] = useState(false);
  const [codeCollapsed, setCodeCollapsed] = useState(false);
  const [content, setContent] = useState(defaultValue);
  const [currentTime, setCurrentTime] = useState<number>(null);

  const [dataProviderConfig, setDataProviderConfig] = useState({
    [CONFIG_KEY_DATA_PROVIDER]: blockConfiguration[CONFIG_KEY_DATA_PROVIDER],
    [CONFIG_KEY_DATA_PROVIDER_DATABASE]: blockConfiguration[CONFIG_KEY_DATA_PROVIDER_DATABASE],
    [CONFIG_KEY_DATA_PROVIDER_PROFILE]: blockConfiguration[CONFIG_KEY_DATA_PROVIDER_PROFILE],
    [CONFIG_KEY_DATA_PROVIDER_SCHEMA]: blockConfiguration[CONFIG_KEY_DATA_PROVIDER_SCHEMA],
    [CONFIG_KEY_DATA_PROVIDER_TABLE]: blockConfiguration[CONFIG_KEY_DATA_PROVIDER_TABLE],
    [CONFIG_KEY_DBT_PROFILE_TARGET]: blockConfiguration[CONFIG_KEY_DBT_PROFILE_TARGET],
    [CONFIG_KEY_DBT_PROJECT_NAME]: blockConfiguration[CONFIG_KEY_DBT_PROJECT_NAME],
    [CONFIG_KEY_EXPORT_WRITE_POLICY]: blockConfiguration[CONFIG_KEY_EXPORT_WRITE_POLICY]
      || ExportWritePolicyEnum.APPEND,
    [CONFIG_KEY_LIMIT]: blockConfiguration[CONFIG_KEY_LIMIT],
    [CONFIG_KEY_USE_RAW_SQL]: !!blockConfiguration[CONFIG_KEY_USE_RAW_SQL],
  });

  const [errorMessages, setErrorMessages] = useState(null);
  const [isEditingBlock, setIsEditingBlock] = useState(false);
  const [newBlockUuid, setNewBlockUuid] = useState(block.uuid);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [runCount, setRunCount] = useState<number>(0);
  const [runEndTime, setRunEndTime] = useState<number>(null);
  const [runStartTime, setRunStartTime] = useState<number>(null);
  const [messages, setMessages] = useState<KernelOutputType[]>(blockMessages);
  const [selectedTab, setSelectedTab] = useState<TabType>(TABS_DBT[0]);

  const isStreamingPipeline = PipelineTypeEnum.STREAMING === pipeline?.type;
  const isDBT = BlockTypeEnum.DBT === block?.type;
  const isSQLBlock = BlockLanguageEnum.SQL === block?.language;
  const isRBlock = BlockLanguageEnum.R === block?.language;

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

  const {
    callback_content: callbackContentOrig,
    has_callback: hasCallback,
  } = block;
  const [callbackContent, setCallbackContent] = useState(callbackContentOrig);
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
      const msgs = messagesInit?.[block?.type]?.[block?.uuid];
      if (msgs?.length >= 1) {
        setMessages(msgs);
      }
    }
  },
  [
    block,
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
    `${pipeline?.uuid}/${block?.uuid}/codeCollapsed`
  ), [pipeline?.uuid, block?.uuid]);

  const outputCollapsedUUID = useMemo(() => (
    `${pipeline?.uuid}/${block?.uuid}/outputCollapsed`
  ), [pipeline?.uuid, block?.uuid]);

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
  }: BlockType) => upstreamBlocks.includes(block.uuid)), [
    block,
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

  const isInProgress = !!runningBlocks?.find(({ uuid }) => uuid === block.uuid)
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
    block.type,
    { blockColor: block.color, theme: themeContext },
  ).accent;
  const numberOfParentBlocks = block?.upstream_blocks?.length || 0;

  const {
    dynamic,
    dynamicUpstreamBlock,
    reduceOutput,
    reduceOutputUpstreamBlock,
  } = useDynamicUpstreamBlocks([block], blocks)[0];

  const {
    borderColorShareProps,
    tags,
  } = useMemo(() => {
    const arr = [];

    if (dynamic) {
      arr.push({
        title: 'Dynamic',
        description: 'This block will create N blocks for each of its downstream blocks.',
      });
    }

    const dynamicChildBlock = dynamicUpstreamBlock && !reduceOutputUpstreamBlock;
    if (dynamicChildBlock) {
      arr.push({
        title: 'Dynamic child',
        description: 'This block is dynamically created by its upstream parent block that is dynamic.',
      });

      if (reduceOutput) {
        arr.push({
          title: 'Reduce output',
          description: 'Reduce output from all dynamically created blocks into a single array output.',
        });
      }
    }

    return {
      borderColorShareProps: {
        blockColor: block?.color,
        blockType: block?.type,
        dynamicBlock: dynamic,
        dynamicChildBlock,
        hasError,
        selected,
      },
      tags: arr,
    };
  }, [
    block?.color,
    block?.type,
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
    pipeline?.uuid,
    (
      TAB_DBT_LINEAGE_UUID.uuid === selectedTab?.uuid ||
        TAB_DBT_SQL_UUID.uuid === selectedTab?.uuid
    ) ? encodeURIComponent(block?.uuid)
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
    api.blocks.pipelines.useUpdate(pipeline?.uuid, block.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setIsEditingBlock(false);
            fetchPipeline();
            fetchFileTree();
            setContent(content);
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
      onError: (response: any) => {
        const {
          messages,
        } = onError(response);
        setErrorMessages(messages);
      },
    },
  );

  const uuidKeyboard = `CodeBlock/${block.uuid}`;
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
      if (isEditingBlock
        && String(keyHistory[0]) === String(KEY_CODE_ENTER)
        && String(keyHistory[1]) !== String(KEY_CODE_META)
      ) {
        if (block.uuid === newBlockUuid) {
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
            language: block.language,
            type: block.type,
            upstream_blocks: [block.uuid],
          });
          runBlockAndTrack({ block });
        }
      }
    },
    [
      addNewBlock,
      block,
      hideRunButton,
      isEditingBlock,
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

    return () => clearInterval(interval);
  }, [runStartTime]);


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

  const codeEditorEl = useMemo(() => (
    <>
      <CodeEditor
        autoHeight
        autocompleteProviders={autocompleteProviders}
        block={block}
        height={height}
        language={block.language}
        onChange={(val: string) => {
          setContent(val);
          onChange?.(val);
        }}
        onDidChangeCursorPosition={onDidChangeCursorPosition}
        placeholder={BlockTypeEnum.DBT === block.type && BlockLanguageEnum.YAML === block.language
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
            <CodeHelperStyle>
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
    callbackContent,
    content,
    dbtProjectName,
    hasCallback,
    height,
    hideRunButton,
    onCallbackChange,
    onChange,
    onDidChangeCursorPosition,
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
          tabs={TABS_DBT}
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

  const updateDataProviderConfig = useCallback((payload) => {
    setDataProviderConfig((dataProviderConfigPrev) => {
      const data = {
        ...dataProviderConfigPrev,
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
            uuid: block.uuid,
          },
        });
      }

      return data;
    });
  }, [
    block,
    savePipelineContent,
  ]);

  const requiresDatabaseName = (DataSourceTypeEnum.BIGQUERY === dataProviderConfig[CONFIG_KEY_DATA_PROVIDER]
    || DataSourceTypeEnum.SNOWFLAKE === dataProviderConfig[CONFIG_KEY_DATA_PROVIDER]
  );

  const blocksLength = useMemo(() => blocks?.length || 0, [blocks]);

  return (
    <div ref={ref} style={{
      position: 'relative',
      zIndex: blockIdx === addNewBlockMenuOpenIdx ? (blocksLength + 9) : null,
    }}>
      <div style={{ position: 'relative' }}>
        <BlockHeaderStyle
          {...borderColorShareProps}
          onClick={() => onClickSelectBlock()}
          zIndex={blocksLength + 1 - (blockIdx || 0)}
        >
          <FlexContainer
            alignItems="center"
            justifyContent="space-between"
          >
            <Flex alignItems="center" flex={1}>
              <FlexContainer alignItems="center">
                <Badge>
                  {ABBREV_BLOCK_LANGUAGE_MAPPING[block.language]}
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
                        : BLOCK_TYPE_NAME_MAPPING[block.type]
                    )?.toUpperCase()}
                  </Text>
                </FlyoutMenuWrapper>

                {BlockTypeEnum.SCRATCHPAD === block.type && (
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

                <Spacing mr={1} />
              </FlexContainer>

              <Spacing mr={PADDING_UNITS} />

              <FileFill size={UNIT * 1.5} />

              <Spacing mr={1} />

              <FlexContainer alignItems="center">
                {isDBT && BlockLanguageEnum.YAML !== block.language && (
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

                {(!isDBT || BlockLanguageEnum.YAML === block.language) && (
                  <LabelWithValueClicker
                    bold={false}
                    inputValue={newBlockUuid}
                    monospace
                    muted
                    notRequired
                    onBlur={() => setTimeout(() => {
                      setAnyInputFocused(false);
                      setIsEditingBlock(false);
                    }, 300)}
                    onChange={(e) => {
                      setNewBlockUuid(e.target.value);
                      e.preventDefault();
                    }}
                    onClick={() => {
                      setAnyInputFocused(true);
                      setIsEditingBlock(true);
                    }}
                    onFocus={() => {
                      setAnyInputFocused(true);
                      setIsEditingBlock(true);
                    }}
                    stacked
                    value={!isEditingBlock && block.uuid}
                  />
                )}

                {isEditingBlock && !isDBT && (
                  <>
                    <Spacing ml={1} />
                    <Link
                      // @ts-ignore
                      onClick={() => savePipelineContent({
                        block: {
                          name: newBlockUuid,
                          uuid: block.uuid,
                        },
                      }).then(() => {
                        setIsEditingBlock(false);
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

              {!BLOCK_TYPES_WITH_NO_PARENTS.includes(block.type) && (
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
                          values: block.upstream_blocks?.map(uuid => ({ uuid })),
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
              pipeline={pipeline}
              runBlock={hideRunButton ? null : runBlockAndTrack}
              savePipelineContent={savePipelineContent}
              setErrors={setErrors}
              setOutputCollapsed={setOutputCollapsed}
              visible={selected || isInProgress}
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

        <ContainerStyle onClick={() => onClickSelectBlock()}>
          <CodeContainerStyle
            {...borderColorShareProps}
            className={selected && textareaFocused ? 'selected' : null}
            hasOutput={!!buttonTabs || hasOutput}
          >
            {BlockTypeEnum.DBT === block.type
              && !codeCollapsed
              && (
              <CodeHelperStyle>
                <FlexContainer
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Flex alignItems="center">
                    {BlockLanguageEnum.YAML === block.language && (
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
                        <option value="" />
                        {Object.keys(dbtProjects || {}).map((projectName: string) => (
                          <option key={projectName} value={projectName}>
                            {projectName}
                          </option>
                        ))}
                      </Select>
                    )}

                    {BlockLanguageEnum.YAML !== block.language && (
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
                        <option value="" />
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

                  {BlockLanguageEnum.YAML !== block.language && (
                    <FlexContainer alignItems="center">
                      <Tooltip
                        appearBefore
                        block
                        description={
                          <Text default inline>
                            Limit the number of results that are returned when running this block in
                            the notebook.
                            <br />
                            This limit won’t affect the number of results returned when running the
                            pipeline end-to-end.
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

                      <TextInput
                        compact
                        monospace
                        onBlur={() => setTimeout(() => {
                          setAnyInputFocused(false);
                        }, 300)}
                        onChange={(e) => {
                          // @ts-ignore
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
                        width={UNIT * 10}
                      />

                      <Spacing mr={5} />
                    </FlexContainer>
                  )}
                </FlexContainer>

                {BlockLanguageEnum.YAML === block.language && (
                  <Spacing mt={1}>
                    <FlexContainer alignItems="center">
                      <Flex flex={1}>
                        <Text monospace default small>
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

                      <Spacing mr={5} />
                    </FlexContainer>
                  </Spacing>
                )}
              </CodeHelperStyle>
            )}

            {isSQLBlock
              && !codeCollapsed
              && BlockTypeEnum.DBT !== block.type
              && (
              <CodeHelperStyle>
                <FlexContainer justifyContent="space-between">
                  <FlexContainer>
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
                      <option value="" />
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
                      <option value="" />
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

                        {dataProviderConfig[CONFIG_KEY_DATA_PROVIDER] !== DataProviderEnum.MYSQL &&
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
                                {pipeline?.uuid}_{block?.uuid}
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
                  </FlexContainer>

                  {!dataProviderConfig[CONFIG_KEY_USE_RAW_SQL] && (
                    <FlexContainer alignItems="center">
                      <Tooltip
                        appearBefore
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
                        </FlexContainer>
                      </Tooltip>

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
                        <option value="" />
                        {EXPORT_WRITE_POLICIES?.map(value => (
                          <option key={value} value={value}>
                            {capitalize(value)}
                          </option>
                        ))}
                      </Select>

                      <Spacing mr={5} />
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

            {block.upstream_blocks.length >= 1
              && !codeCollapsed
              && BLOCK_TYPES_WITH_UPSTREAM_INPUTS.includes(block.type)
              && !isStreamingPipeline
              && (
              <CodeHelperStyle>
                <Spacing mr={5}>
                  <Text small>
                    {!isSQLBlock && `Positional arguments for ${isRBlock ? '' : 'decorated '}function:`}
                    {isSQLBlock && 'The interpolated tables below are available in queries from upstream blocks. \
                      For example, you can use the query "SELECT * FROM {{ df_1 }}" to insert all the rows from an \
                      upstream block into the designated database table.'}
                  </Text>
                </Spacing>

                <Spacing mt={1}>
                  {(!isSQLBlock && !isRBlock) && (
                    <>
                      <Text monospace muted small>
                        {BlockTypeEnum.DATA_EXPORTER === block.type && '@data_exporter'}
                        {BlockTypeEnum.DATA_LOADER === block.type && '@data_loader'}
                        {BlockTypeEnum.TRANSFORMER === block.type && '@transformer'}
                        {BlockTypeEnum.CUSTOM === block.type && '@custom'}
                      </Text>
                      <Text monospace muted small>
                        def {BlockTypeEnum.DATA_EXPORTER === block.type && 'export_data'
                          || (BlockTypeEnum.DATA_LOADER === block.type && 'load_data')
                          || (BlockTypeEnum.TRANSFORMER === block.type && 'transform')
                          || (BlockTypeEnum.CUSTOM === block.type && 'transform_custom')}
                        ({block.upstream_blocks.map((_,i) => i >= 1 ? `data_${i + 1}` : 'data').join(', ')}):
                      </Text>
                    </>
                  )}
                  {isRBlock && (
                    <>
                      <Text monospace muted small>
                        {BlockTypeEnum.DATA_EXPORTER === block.type && 'export_data'
                          || (BlockTypeEnum.TRANSFORMER === block.type && 'transform')}
                        &nbsp;← function({block.upstream_blocks.map((_,i) => `df_${i + 1}`).join(', ')}):
                      </Text>
                    </>
                  )}

                  {block.upstream_blocks.map((blockUUID, i) => {
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

            {!block?.error && (
              <>
                {!codeCollapsed
                  ? codeEditorEl
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

            {block?.error && (
              <Spacing p={PADDING_UNITS}>
                <Text bold danger>
                  {block?.error?.error}
                </Text>
                <Text muted>
                  {block?.error?.message}
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

                  if ([BlockTypeEnum.DATA_LOADER, BlockTypeEnum.TRANSFORMER].includes(block.type)
                    && BlockTypeEnum.SCRATCHPAD === newBlock.type
                  ) {
                    content = `from mage_ai.data_preparation.variable_manager import get_variable


df = get_variable('${pipeline.uuid}', '${block.uuid}', 'output_0')`;
                  }
                  content = addScratchpadNote(newBlock, content);

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
                  if (BlockLanguageEnum.SQL === newBlock.language) {
                    content = addSqlBlockNote(content);
                  }

                  return addNewBlock({
                    ...newBlock,
                    configuration,
                    content,
                    upstream_blocks: upstreamBlocks,
                  });
                }}
                blockIdx={blockIdx}
                compact
                hideCustom={isStreamingPipeline}
                hideDbt={isStreamingPipeline}
                onClickAddSingleDBTModel={onClickAddSingleDBTModel}
                pipeline={pipeline}
                setAddNewBlockMenuOpenIdx={setAddNewBlockMenuOpenIdx}
                setCreatingNewDBTModel={setCreatingNewDBTModel}
                setRecsWindowOpenBlockIdx={setRecsWindowOpenBlockIdx}
              />
            </Spacing>
          )}
          <BlockDividerInner className="block-divider-inner" />
        </BlockDivider>
      )}
    </div>
  );
}

export default React.forwardRef(CodeBlock);
