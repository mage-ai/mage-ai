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
import { selectKeys } from '@utils/hash';
import { useDynamicUpstreamBlocks } from '@utils/models/block';
import { useKeyboardContext } from '@context/Keyboard';

type CodeBlockProps = {
  addNewBlock: (block: BlockType) => Promise<any>;
  addNewBlockMenuOpenIdx: number;
  autocompleteItems: AutocompleteItemType[];
  block: BlockType;
  blockRefs: any;
  blockIdx: number;
  blocks: BlockType[];
  dataProviders: DataProviderType[];
  defaultValue?: string;
  executionState: ExecutionStateEnum;
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  mainContainerRef?: any;
  mainContainerWidth: number;
  messages: KernelOutputType[];
  noDivider?: boolean;
  onChange?: (value: string) => void;
  onClickAddSingleDBTModel: (blockIdx: number) => void;
  openSidekickView: (newView: ViewKeyEnum, pushHistory?: boolean) => void;
  pipeline: PipelineType;
  runBlock: (payload: {
    block: BlockType;
    code: string;
    runDownstream?: boolean;
    runUpstream?: boolean;
    runTests?: boolean;
  }) => void;
  runningBlocks: BlockType[];
  savePipelineContent: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
  setAddNewBlockMenuOpenIdx?: (cb: any) => void;
  setAnyInputFocused: (value: boolean) => void;
  setCreatingNewDBTModel?: (creatingNewDBTModel: boolean) => void;
  setOutputBlocks: (func: (prevOutputBlocks: BlockType[]) => BlockType[]) => void;
  setRecsWindowOpenBlockIdx: (idx: number) => void;
  setSelectedOutputBlock: (block: BlockType) => void;
  widgets: BlockType[];
} & CodeEditorSharedProps & CommandButtonsSharedProps & SetEditingBlockType;

function CodeBlockProps({
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
  fetchFileTree,
  fetchPipeline,
  height,
  interruptKernel,
  mainContainerRef,
  mainContainerWidth,
  messages: blockMessages = [],
  noDivider,
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
  setOutputBlocks,
  setRecsWindowOpenBlockIdx,
  setSelected,
  setSelectedOutputBlock,
  setTextareaFocused,
  textareaFocused,
  widgets,
}: CodeBlockProps, ref) {
  const themeContext = useContext(ThemeContext);

  const [addNewBlocksVisible, setAddNewBlocksVisible] = useState(false);
  const [autocompleteProviders, setAutocompleteProviders] = useState(null);
  const [blockMenuVisible, setBlockMenuVisible] = useState(false);
  const [codeCollapsed, setCodeCollapsed] = useState(false);
  const [content, setContent] = useState(defaultValue);
  const [currentTime, setCurrentTime] = useState<number>(null);
  const [dataProviderConfig, setDataProviderConfig] = useState({
    [CONFIG_KEY_DATA_PROVIDER]: block?.configuration?.[CONFIG_KEY_DATA_PROVIDER],
    [CONFIG_KEY_DATA_PROVIDER_DATABASE]: block?.configuration?.[CONFIG_KEY_DATA_PROVIDER_DATABASE],
    [CONFIG_KEY_DATA_PROVIDER_PROFILE]: block?.configuration?.[CONFIG_KEY_DATA_PROVIDER_PROFILE],
    [CONFIG_KEY_DATA_PROVIDER_SCHEMA]: block?.configuration?.[CONFIG_KEY_DATA_PROVIDER_SCHEMA],
    [CONFIG_KEY_DATA_PROVIDER_TABLE]: block?.configuration?.[CONFIG_KEY_DATA_PROVIDER_TABLE],
    [CONFIG_KEY_DBT_PROFILE_TARGET]: block?.configuration?.[CONFIG_KEY_DBT_PROFILE_TARGET],
    [CONFIG_KEY_DBT_PROJECT_NAME]: block?.configuration?.[CONFIG_KEY_DBT_PROJECT_NAME],
    [CONFIG_KEY_EXPORT_WRITE_POLICY]: block?.configuration?.[CONFIG_KEY_EXPORT_WRITE_POLICY]
      || ExportWritePolicyEnum.APPEND,
    [CONFIG_KEY_USE_RAW_SQL]: !!block?.configuration?.[CONFIG_KEY_USE_RAW_SQL],
  });
  const [errorMessages, setErrorMessages] = useState(null);
  const [isEditingBlock, setIsEditingBlock] = useState(false);
  const [newBlockUuid, setNewBlockUuid] = useState(block.uuid);
  const [outputCollapsed, setOutputCollapsed] = useState(false);
  const [runCount, setRunCount] = useState<number>(0);
  const [runEndTime, setRunEndTime] = useState<number>(null);
  const [runStartTime, setRunStartTime] = useState<number>(null);
  const [messages, setMessages] = useState<KernelOutputType[]>(blockMessages);

  const isDBT = BlockTypeEnum.DBT === block?.type;

  const blockPrevious = usePrevious(block);
  useEffect(() => {
    if (JSON.stringify(block) != JSON.stringify(blockPrevious)) {
      const {
        messages: messagesInit,
      } = initializeContentAndMessages([block]);
      const msgs = messagesInit?.[block?.uuid];
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
  }, []);

  const blockMenuRef = useRef(null);
  const blocksMapping = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);

  const hasDownstreamWidgets = useMemo(() => !!widgets.find(({
    upstream_blocks: upstreamBlocks,
  }: BlockType) => upstreamBlocks.includes(block.uuid)), [
    block,
    widgets,
  ]);

  const runBlockAndTrack = useCallback(
    (payload?: {
      block: BlockType;
      code?: string;
      disableReset?: boolean;
      runDownstream?: boolean;
      runUpstream?: boolean;
      runTests?: boolean;
    }) => {
      const {
        block: blockPayload,
        code,
        disableReset,
        runDownstream,
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

      runBlock({
        block: blockPayload,
        code: code || content,
        runDownstream: runDownstream || hasDownstreamWidgets,
        runUpstream: runUpstream || false,
        runTests: runTests || false,
      });

      if (!disableReset) {
        setRunCount(1 + Number(runCount));
        setRunEndTime(null);
        setOutputCollapsed(false);
      }
    }, [
      content,
      hasDownstreamWidgets,
      runCount,
      runBlock,
      setRunCount,
      setRunEndTime,
    ]);

  const isInProgress = !!runningBlocks.find(({ uuid }) => uuid === block.uuid)
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
      height,
      top,
    },
    position: {
      lineNumber,
    },
  }: OnDidChangeCursorPositionParameterType) => {
    if (mainContainerRef?.current) {
      const {
        height: mainContainerHeight,
      } = mainContainerRef.current.getBoundingClientRect();

      const heightAtLineNumber = lineNumber * SINGLE_LINE_HEIGHT;

      if (top + heightAtLineNumber > mainContainerHeight) {
        const newY = mainContainerRef.current.scrollTop
          + ((heightAtLineNumber - mainContainerHeight) + top);

        mainContainerRef.current.scrollTo(0, newY);
      } else if (heightAtLineNumber + top < SINGLE_LINE_HEIGHT) {
        const newY = mainContainerRef.current.scrollTop
          + ((heightAtLineNumber + top) - SINGLE_LINE_HEIGHT);
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
  const blockConfiguration = useMemo(() => block?.configuration || {}, [block]);

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
      setAnyInputFocused(false);
      setSelected(true);
    }
  }, [
    setAnyInputFocused,
    setSelected,
  ]);

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
      } else if (selected) {
        if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_ENTER], keyMapping)
          || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_ENTER], keyMapping)
        ) {
          runBlockAndTrack({ block });
        } else if (onlyKeysPresent([KEY_CODE_SHIFT, KEY_CODE_ENTER], keyMapping)) {
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
    buildConvertBlockMenuItems,
    savePipelineContent,
  ]);

  const codeEditorEl = useMemo(() => (
    <CodeEditor
      autoHeight
      autocompleteProviders={autocompleteProviders}
      height={height}
      language={block.language}
      onChange={(val: string) => {
        setContent(val);
        onChange?.(val);
      }}
      onDidChangeCursorPosition={onDidChangeCursorPosition}
      placeholder={BlockTypeEnum.DBT === block.type && BlockLanguageEnum.YAML === block.language
        ? 'e.g. --select path/to/my_model1.sql --exclude path/to/my_model2.sql'
        : 'Start typing here...'
      }
      selected={selected}
      setSelected={setSelected}
      setTextareaFocused={setTextareaFocused}
      shortcuts={[
        (monaco, editor) => executeCode(monaco, () => {
          runBlockAndTrack({
            block,
            code: editor.getValue(),
          });
        }),
      ]}
      textareaFocused={textareaFocused}
      value={content}
      width="100%"
    />
  ), [
    autocompleteProviders,
    block,
    blocks,
    content,
    height,
    pipeline,
    selected,
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

  const codeOutputEl = useMemo(() => (
    <CodeOutput
      {...borderColorShareProps}
      block={block}
      collapsed={outputCollapsed}
      isInProgress={isInProgress}
      mainContainerWidth={mainContainerWidth}
      messages={messagesWithType}
      openSidekickView={openSidekickView}
      pipeline={pipeline}
      runCount={runCount}
      runEndTime={runEndTime}
      runStartTime={runStartTime}
      selected={selected}
      setCollapsed={(val: boolean) => {
        setOutputCollapsed(() => {
          set(outputCollapsedUUID, val);
          return val;
        });
      }}
      setOutputBlocks={setOutputBlocks}
      setSelectedOutputBlock={setSelectedOutputBlock}
    />
  ), [
    block,
    borderColorShareProps,
    isInProgress,
    mainContainerWidth,
    messagesWithType,
    outputCollapsed,
    runCount,
    runEndTime,
    runStartTime,
    selected,
  ]);

  const closeBlockMenu = useCallback(() => setBlockMenuVisible(false), []);

  const updateDataProviderConfig = useCallback((payload) => {
    setDataProviderConfig((dataProviderConfigPrev) => {
      const data = {
        ...dataProviderConfigPrev,
        ...payload,
      };

      if ((data[CONFIG_KEY_DATA_PROVIDER] && data[CONFIG_KEY_DATA_PROVIDER_PROFILE])
        || data[CONFIG_KEY_DBT_PROFILE_TARGET]
        || data[CONFIG_KEY_DBT_PROJECT_NAME]
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
              {isDBT && (
                <Text muted monospace>
                  {getModelName(block)}
                </Text>
              )}

              {!isDBT && (
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
                  ${pluralize('parent block', numberOfParentBlocks)}. ${numberOfParentBlocks === 0 ? 'Click to select 1 or more blocks to depend on.' : 'Edit parent blocks.'}
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
            interruptKernel={interruptKernel}
            pipelineType={pipeline?.type}
            runBlock={runBlockAndTrack}
            savePipelineContent={savePipelineContent}
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
          hasOutput={hasOutput}
        >
          {BlockTypeEnum.DBT === block.type
            && !codeCollapsed
            && (
            <CodeHelperStyle>
              <FlexContainer alignItems="center">
                <Text monospace muted small>
                  DBT project name:
                </Text>
                <span>&nbsp;</span>
                {BlockLanguageEnum.YAML === block.language && (
                  <TextInput
                    compact
                    monospace
                    onBlur={() => setTimeout(() => {
                      setAnyInputFocused(false);
                    }, 300)}
                    onChange={(e) => {
                      // @ts-ignore
                      updateDataProviderConfig({
                        [CONFIG_KEY_DBT_PROJECT_NAME]: e.target.value,
                      });
                      e.preventDefault();
                    }}
                    onFocus={() => {
                      setAnyInputFocused(true);
                    }}
                    placeholder="e.g. my_project"
                    small
                    value={dataProviderConfig[CONFIG_KEY_DBT_PROJECT_NAME]}
                  />
                )}
                {BlockLanguageEnum.YAML !== block.language && (
                  <Text monospace small>
                    {block?.configuration?.file_path?.split('/')?.[0]}
                  </Text>
                )}

                <Spacing mr={2} />

                <Text monospace muted small>
                  DBT profile target:
                </Text>
                <span>&nbsp;</span>
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
                  onFocus={() => {
                    setAnyInputFocused(true);
                  }}
                  placeholder="e.g. prod"
                  small
                  value={dataProviderConfig[CONFIG_KEY_DBT_PROFILE_TARGET]}
                />
              </FlexContainer>

              {BlockLanguageEnum.YAML === block.language && (
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
              )}
            </CodeHelperStyle>
          )}

          {BlockLanguageEnum.SQL === block.language
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
                          onClick={() => updateDataProviderConfig({
                            [CONFIG_KEY_USE_RAW_SQL]: !dataProviderConfig[CONFIG_KEY_USE_RAW_SQL],
                          })}
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
                              onFocus={() => {
                                setAnyInputFocused(true);
                              }}
                              label="Database"
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
                                onFocus={() => {
                                  setAnyInputFocused(true);
                                }}
                                label="Schema"
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
                            onFocus={() => {
                              setAnyInputFocused(true);
                            }}
                            label="Table (optional)"
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
            && (pipeline?.type !== PipelineTypeEnum.STREAMING)
            && (
            <CodeHelperStyle>
              <Text small>
                {BlockLanguageEnum.SQL !== block.language && 'Positional arguments for decorated function:'}
                {BlockLanguageEnum.SQL === block.language && 'Tables available in query from upstream blocks:'}
              </Text>

              <Spacing mt={1}>
                {BlockLanguageEnum.SQL !== block.language && (
                  <>
                    <Text monospace muted small>
                      {BlockTypeEnum.DATA_EXPORTER === block.type && '@data_exporter'}
                      {BlockTypeEnum.DATA_LOADER === block.type && '@data_loader'}
                      {BlockTypeEnum.TRANSFORMER === block.type && '@transformer'}
                    </Text>
                    <Text monospace muted small>
                      def {BlockTypeEnum.DATA_EXPORTER === block.type && 'export_data'
                        || (BlockTypeEnum.DATA_LOADER === block.type && 'load_data')
                        || (BlockTypeEnum.TRANSFORMER === block.type && 'transform_df')}
                      ({block.upstream_blocks.map((_,i) => i >= 1 ? `df_${i + 1}` : 'df').join(', ')}):
                    </Text>
                  </>
                )}

                {block.upstream_blocks.map((blockUUID, i) => {
                  const b = blocksMapping[blockUUID];
                  const blockColor = getColorsForBlockType(
                      b?.type,
                      { blockColor: b?.color, theme: themeContext },
                    ).accent;

                  return (
                    <div key={blockUUID}>
                      {BlockLanguageEnum.SQL !== block.language && (
                        <Text inline monospace muted small>
                          &nbsp;&nbsp;&nbsp;&nbsp;df{i >= 1 ? `_${i + 1}` : null}
                        </Text>
                      )}{BlockLanguageEnum.SQL === block.language && (
                        <Text inline monospace muted small>
                          {`{{ df_${i + 1} }}`}
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

        {hasOutput && codeOutputEl}
      </ContainerStyle>

      {!noDivider && (
        <BlockDivider
          additionalZIndex={blocksLength - blockIdx}
          onMouseEnter={() => setAddNewBlocksVisible(true)}
          onMouseLeave={() => {
            setAddNewBlocksVisible(false);
            setAddNewBlockMenuOpenIdx(null);
          }}
        >
          {addNewBlocksVisible && (
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
                    content = addSqlBlockNote(content);
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

                  return addNewBlock({
                    ...newBlock,
                    configuration,
                    content,
                    upstream_blocks: upstreamBlocks,
                  });
                }}
                blockIdx={blockIdx}
                compact
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

export default React.forwardRef(CodeBlockProps);
