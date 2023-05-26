import * as path from 'path';
import React, {
  createRef,
  useCallback,
  useEffect,
  useMemo,
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
import DataProviderType from '@interfaces/DataProviderType';
import ErrorsType from '@interfaces/ErrorsType';
import FileSelectorPopup from '@components/FileSelectorPopup';
import FileType, { FileExtensionEnum } from '@interfaces/FileType';
import HiddenBlock from '@components/CodeBlock/HiddenBlock';
import IntegrationPipeline from '@components/IntegrationPipeline';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import {
  ANIMATION_DURATION,
  OverlayStyle,
  PipelineContainerStyle,
} from './index.style';
import {
  CONFIG_KEY_DATA_PROVIDER,
  CONFIG_KEY_DATA_PROVIDER_DATABASE,
  CONFIG_KEY_DATA_PROVIDER_PROFILE,
  CONFIG_KEY_DATA_PROVIDER_SCHEMA,
  CONFIG_KEY_EXPORT_WRITE_POLICY,
} from '@interfaces/ChartBlockType';
import {
  KEY_CODES_SYSTEM,
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_UP,
  KEY_CODE_CONTROL,
  KEY_CODE_D,
  KEY_CODE_ENTER,
  KEY_CODE_ESCAPE,
  KEY_CODE_I,
  KEY_CODE_META,
  KEY_CODE_NUMBER_0,
  KEY_CODE_R,
  KEY_CODE_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { addScratchpadNote, addSqlBlockNote } from '@components/PipelineDetail/AddNewBlocks/utils';
import { addUnderscores, randomNameGenerator, removeExtensionFromFilename } from '@utils/string';
import { getUpstreamBlockUuids } from '@components/CodeBlock/utils';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { onSuccess } from '@api/utils/response';
import { pushAtIndex, removeAtIndex } from '@utils/array';
import { selectKeys } from '@utils/hash';
import { useKeyboardContext } from '@context/Keyboard';

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
  allBlocks: BlockType[];
  allowCodeBlockShortcuts?: boolean;
  anyInputFocused: boolean;
  autocompleteItems: AutocompleteItemType[];
  blockRefs: any;
  blocks: BlockType[];
  dataProviders: DataProviderType[];
  deleteBlock: (block: BlockType) => Promise<any>;
  disableShortcuts: boolean;
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  fetchSampleData: () => void;
  files: FileType[];
  globalVariables: PipelineVariableType[];
  hiddenBlocks: {
    [uuid: string]: BlockType;
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
  textareaFocused: boolean;
  widgets: BlockType[];
} & SetEditingBlockType;

function PipelineDetail({
  addNewBlockAtIndex,
  addWidget,
  allBlocks,
  allowCodeBlockShortcuts,
  anyInputFocused,
  autocompleteItems,
  blockRefs,
  blocks = [],
  dataProviders,
  deleteBlock,
  disableShortcuts,
  fetchFileTree,
  fetchPipeline,
  fetchSampleData,
  files,
  globalVariables,
  hiddenBlocks,
  interruptKernel,
  mainContainerRef,
  mainContainerWidth,
  messages,
  onChangeCallbackBlock,
  onChangeCodeBlock,
  openSidekickView,
  pipeline,
  pipelineContentTouched,
  restartKernel,
  runBlock,
  runningBlocks = [],
  savePipelineContent,
  selectedBlock,
  setAnyInputFocused,
  setDisableShortcuts,
  setEditingBlock,
  setErrors,
  setIntegrationStreams,
  setHiddenBlocks,
  setOutputBlocks,
  setPipelineContentTouched,
  setSelectedBlock,
  setSelectedOutputBlock,
  setSelectedStream,
  setTextareaFocused,
  textareaFocused,
  widgets,
}: PipelineDetailProps) {
  const [addDBTModelVisible, setAddDBTModelVisible] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const [visibleOverlay, setVisibleOverlay] = useState<boolean>(true);
  const [addNewBlockMenuOpenIdx, setAddNewBlockMenuOpenIdx] = useState<number>(null);
  const [lastBlockIndex, setLastBlockIndex] = useState<number>(null);
  const [creatingNewDBTModel, setCreatingNewDBTModel] = useState<boolean>(false);
  const [dbtModelName, setDbtModelName] = useState<string>('');

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

  const selectedBlockPrevious = usePrevious(selectedBlock);
  const numberOfBlocks = useMemo(() => blocks.length, [blocks]);

  const isIntegration = useMemo(() => PipelineTypeEnum.INTEGRATION === pipeline?.type, [pipeline]);
  const isStreaming = useMemo(() => PipelineTypeEnum.STREAMING === pipeline?.type, [pipeline]);

  const { data: dataBlockTemplates } = api.block_templates.list({}, {
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
        if (selectedBlock) {
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
      interruptKernel,
      isIntegration,
      numberOfBlocks,
      pipelineContentTouched,
      restartKernel,
      savePipelineContent,
      selectedBlock,
      selectedBlockPrevious,
      setPipelineContentTouched,
      setSelectedBlock,
      setTextareaFocused,
      textareaFocused,
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

  const codeBlocks = useMemo(() => {
    const arr = [];

    const blocksFiltered =
      blocks.filter(({ type }) => !isIntegration || BlockTypeEnum.TRANSFORMER === type);

    blocksFiltered.forEach((block: BlockType, idx: number) => {
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

      const path = `${type}s/${uuid}.py`;
      blockRefs.current[path] = createRef();

      let el;
      const isMarkdown = type === BlockTypeEnum.MARKDOWN;
      const isTransformer = type === BlockTypeEnum.TRANSFORMER;
      const isHidden = !!hiddenBlocks?.[uuid];
      const noDivider = idx === numberOfBlocks - 1 || isIntegration;
      const currentBlockRef = blockRefs.current[path];

      if (isHidden) {
        el = (
          <HiddenBlock
            block={block}
            blocks={blocks}
            key={uuid}
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
                idx + 1,
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
            blockRefs={blockRefs}
            blockTemplates={blockTemplates}
            blocks={blocks}
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
            hideRunButton={isStreaming || isMarkdown || (isIntegration && isTransformer)}
            interruptKernel={interruptKernel}
            key={uuid}
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
            ref={currentBlockRef}
            runBlock={runBlock}
            runningBlocks={runningBlocks}
            savePipelineContent={savePipelineContent}
            selected={selected}
            setAddNewBlockMenuOpenIdx={setAddNewBlockMenuOpenIdx}
            setAnyInputFocused={setAnyInputFocused}
            setCreatingNewDBTModel={setCreatingNewDBTModel}
            setEditingBlock={setEditingBlock}
            setErrors={setErrors}
            setOutputBlocks={setOutputBlocks}
            setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
            setSelectedOutputBlock={setSelectedOutputBlock}
            setTextareaFocused={setTextareaFocused}
            textareaFocused={selected && textareaFocused}
            widgets={widgets}
          />
        );
      }

      arr.push(el);
    });

    return arr;
  },
  [
    addNewBlockAtIndex,
    addNewBlockMenuOpenIdx,
    addWidget,
    allBlocks,
    allowCodeBlockShortcuts,
    autocompleteItems,
    blockRefs,
    blockTemplates,
    blocks,
    dataProviders,
    deleteBlock,
    disableShortcuts,
    fetchFileTree,
    fetchPipeline,
    hiddenBlocks,
    interruptKernel,
    isIntegration,
    isStreaming,
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
    runBlock,
    runningBlocks,
    runningBlocksByUUID,
    savePipelineContent,
    selectedBlock,
    setAddNewBlockMenuOpenIdx,
    setAnyInputFocused,
    setEditingBlock,
    setErrors,
    setHiddenBlocks,
    setOutputBlocks,
    setSelectedBlock,
    setSelectedOutputBlock,
    setTextareaFocused,
    textareaFocused,
    updateBlock,
    widgets,
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

  const addNewBlocksMemo = useMemo(() => (
    <AddNewBlocks
      addNewBlock={(newBlock: BlockRequestPayloadType) => {
        const block = blocks[blocks.length - 1];

        let content = null;
        let configuration = {};
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
      hideCustom={isIntegration || isStreaming}
      hideDataExporter={isIntegration}
      hideDataLoader={isIntegration}
      hideDbt={isIntegration || isStreaming}
      hideScratchpad={isIntegration}
      hideSensor={isIntegration}
      onClickAddSingleDBTModel={onClickAddSingleDBTModel}
      pipeline={pipeline}
      setCreatingNewDBTModel={setCreatingNewDBTModel}
    />
  ), [
    addNewBlockAtIndex,
    blockTemplates,
    blocks,
    isIntegration,
    isStreaming,
    numberOfBlocks,
    onClickAddSingleDBTModel,
    pipeline,
    setSelectedBlock,
    setTextareaFocused,
  ]);

  return (
    <DndProvider backend={HTML5Backend}>
      <PipelineContainerStyle>
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

      <Spacing mt={1} px={PADDING_UNITS}>
        {isIntegration && integrationMemo}

        {!isIntegration && (
          <>
            {codeBlocks}
            <Spacing mt={PADDING_UNITS}>
              {addNewBlocksMemo}
            </Spacing>
          </>
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
                }, isAddingFromBlock ? numberOfBlocks : lastBlockIndex + 1, setSelectedBlock);

                closeAddDBTModelPopup();
                setTextareaFocused(true);
              }}
              setDbtModelName={setDbtModelName}
            />
          </ClickOutside>
        )}
      </Spacing>
    </DndProvider>
  );
}

export default PipelineDetail;
