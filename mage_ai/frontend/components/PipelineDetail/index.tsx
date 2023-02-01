import React, {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CSSTransition } from 'react-transition-group';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import AutocompleteItemType from '@interfaces/AutocompleteItemType';
import BlockType, {
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  SetEditingBlockType,
} from '@interfaces/BlockType';
import ClickOutside from '@oracle/components/ClickOutside';
import CodeBlock from '@components/CodeBlock';
import DataProviderType from '@interfaces/DataProviderType';
import FileSelectorPopup from '@components/FileSelectorPopup';
import FileType, { FileExtensionEnum } from '@interfaces/FileType';
import IntegrationPipeline from '@components/IntegrationPipeline';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import KernelType, { SetMessagesType } from '@interfaces/KernelType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import Spacing from '@oracle/elements/Spacing';
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
  KEY_CODE_A,
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_UP,
  KEY_CODE_B,
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
import { addScratchpadNote } from '@components/PipelineDetail/AddNewBlocks/utils';
import { addUnderscores, randomNameGenerator } from '@utils/string';
import { getUpstreamBlockUuids } from '@components/CodeBlock/utils';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
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
  anyInputFocused: boolean;
  autocompleteItems: AutocompleteItemType[];
  blockRefs: any;
  blocks: BlockType[];
  dataProviders: DataProviderType[];
  deleteBlock: (block: BlockType) => Promise<any>;
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  fetchSampleData: () => void;
  files: FileType[];
  globalVariables: PipelineVariableType[];
  interruptKernel: () => void;
  isPipelineUpdating: boolean;
  kernel: KernelType;
  mainContainerRef: any;
  mainContainerWidth: number;
  messages: {
    [uuid: string]: KernelOutputType[];
  };
  onChangeCodeBlock: (uuid: string, value: string) => void;
  openSidekickView: (newView: ViewKeyEnum, pushHistory?: boolean) => void;
  pipeline: PipelineType;
  pipelineContentTouched: boolean;
  pipelineLastSaved: Date;
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
  setErrors: (opts: {
    errors: any;
    response: any;
  }) => void;
  setIntegrationStreams: (streams: string[]) => void;
  setOutputBlocks: (func: (prevOutputBlocks: BlockType[]) => BlockType[]) => void;
  setPipelineContentTouched: (value: boolean) => void;
  setRecsWindowOpenBlockIdx: (idx: number) => void;
  setRunningBlocks: (blocks: BlockType[]) => void;
  setSelectedBlock: (block: BlockType) => void;
  setSelectedOutputBlock: (block: BlockType) => void;
  setSelectedStream: (stream: string) => void;
  setTextareaFocused: (value: boolean) => void;
  textareaFocused: boolean;
  widgets: BlockType[];
} & SetEditingBlockType & SetMessagesType;

function PipelineDetail({
  addNewBlockAtIndex,
  addWidget,
  anyInputFocused,
  autocompleteItems,
  blockRefs,
  blocks = [],
  dataProviders,
  deleteBlock,
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
  onChangeCodeBlock,
  openSidekickView,
  pipeline,
  pipelineContentTouched,
  pipelineLastSaved,
  restartKernel,
  runBlock,
  runningBlocks = [],
  savePipelineContent,
  selectedBlock,
  setAnyInputFocused,
  setEditingBlock,
  setErrors,
  setIntegrationStreams,
  setMessages,
  setOutputBlocks,
  setPipelineContentTouched,
  setRecsWindowOpenBlockIdx,
  setRunningBlocks,
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

  const uuidKeyboard = 'PipelineDetail/index';
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
      if (pipelineContentTouched && onlyKeysPresent([KEY_CODE_META, KEY_CODE_R], keyMapping)) {
        event.preventDefault();
        const warning = 'You have changes that are unsaved. Click cancel and save your changes before reloading page.';
        if (typeof window !== 'undefined' && typeof location !== 'undefined' && window.confirm(warning)) {
          location.reload();
        }
      } else if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_S], keyMapping)
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
            setRecsWindowOpenBlockIdx(null);
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
          } else if (!anyInputFocused && onlyKeysPresent([KEY_CODE_A], keyMapping)) {
            addNewBlockAtIndex({
              type: BlockTypeEnum.SCRATCHPAD,
            }, selectedBlockIndex, setSelectedBlock);
          } else if (!anyInputFocused && onlyKeysPresent([KEY_CODE_B], keyMapping)) {
            addNewBlockAtIndex({
              type: BlockTypeEnum.SCRATCHPAD,
            }, selectedBlockIndex + 1, setSelectedBlock);
          }
        } else if (selectedBlockPrevious) {
          if (keyMapping[KEY_CODE_ENTER]) {
            setSelectedBlock(selectedBlockPrevious);
          }
        }

        if (keyHistory[0] === KEY_CODE_NUMBER_0 && keyHistory[1] === KEY_CODE_NUMBER_0) {
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
    }, 5000);

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



  const onClickAddSingleDBTModel = useCallback((blockIndex: number) => {
    setAddDBTModelVisible(true);
    setLastBlockIndex(blockIndex);
  }, [
    setAddDBTModelVisible,
    setLastBlockIndex,
  ]);

  const closeAddDBTModelPopup = useCallback(() => {
    setAddDBTModelVisible(false);
    setCreatingNewDBTModel(false);
    setDbtModelName('');
  }, []);

  const codeBlocks = useMemo(
    () => blocks
    .filter(({ type }) => !isIntegration || BlockTypeEnum.TRANSFORMER === type)
    .map((block: BlockType, idx: number) => {
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

      return (
        <CodeBlock
          addNewBlock={(b: BlockRequestPayloadType) => {
            setTextareaFocused(true);

            return addNewBlockAtIndex(b, idx + 1, setSelectedBlock);
          }}
          addNewBlockMenuOpenIdx={addNewBlockMenuOpenIdx}
          addWidget={addWidget}
          autocompleteItems={autocompleteItems}
          block={block}
          blockIdx={idx}
          blockRefs={blockRefs}
          blocks={blocks}
          dataProviders={dataProviders}
          defaultValue={block.content}
          deleteBlock={(b: BlockType) => {
            deleteBlock(b);
            setAnyInputFocused(false);
          }}
          executionState={executionState}
          fetchFileTree={fetchFileTree}
          fetchPipeline={fetchPipeline}
          interruptKernel={interruptKernel}
          key={uuid}
          mainContainerRef={mainContainerRef}
          mainContainerWidth={mainContainerWidth}
          messages={messages[uuid]}
          noDivider={idx === numberOfBlocks - 1 || isIntegration}
          onChange={(value: string) => onChangeCodeBlock(uuid, value)}
          onClickAddSingleDBTModel={onClickAddSingleDBTModel}
          openSidekickView={openSidekickView}
          pipeline={pipeline}
          ref={blockRefs.current[path]}
          runBlock={runBlock}
          runningBlocks={runningBlocks}
          savePipelineContent={savePipelineContent}
          selected={selected}
          setAddNewBlockMenuOpenIdx={setAddNewBlockMenuOpenIdx}
          setAnyInputFocused={setAnyInputFocused}
          setCreatingNewDBTModel={setCreatingNewDBTModel}
          setEditingBlock={setEditingBlock}
          setOutputBlocks={setOutputBlocks}
          setRecsWindowOpenBlockIdx={setRecsWindowOpenBlockIdx}
          setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
          setSelectedOutputBlock={setSelectedOutputBlock}
          setTextareaFocused={setTextareaFocused}
          textareaFocused={selected && textareaFocused}
          widgets={widgets}
        />
      );
    }
  ),
  [
    addNewBlockAtIndex,
    addNewBlockMenuOpenIdx,
    addWidget,
    autocompleteItems,
    blockRefs,
    blocks,
    deleteBlock,
    fetchFileTree,
    fetchPipeline,
    interruptKernel,
    isIntegration,
    mainContainerRef,
    mainContainerWidth,
    messages,
    numberOfBlocks,
    onChangeCodeBlock,
    onClickAddSingleDBTModel,
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
    setOutputBlocks,
    setRecsWindowOpenBlockIdx,
    setSelectedBlock,
    setSelectedOutputBlock,
    setTextareaFocused,
    textareaFocused,
    widgets,
  ]);

  const integrationMemo = useMemo(() => (
    <IntegrationPipeline
      addNewBlockAtIndex={addNewBlockAtIndex}
      blocks={blocks}
      codeBlocks={codeBlocks}
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
    fetchPipeline,
    globalVariables,
    onChangeCodeBlock,
    onChangeCodeBlock,
    pipeline,
    savePipelineContent,
    setErrors,
    setSelectedBlock,
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
        content = addScratchpadNote(newBlock, content);

        addNewBlockAtIndex({
          ...newBlock,
          configuration,
          content,
          upstream_blocks: upstreamBlocks,
        }, numberOfBlocks, setSelectedBlock);
        setTextareaFocused(true);
      }}
      hideDataExporter={isIntegration}
      hideDataLoader={isIntegration}
      hideDbt={isIntegration || PipelineTypeEnum.STREAMING === pipeline?.type}
      hideRecommendations={isIntegration}
      hideScratchpad={isIntegration}
      hideSensor={isIntegration}
      onClickAddSingleDBTModel={onClickAddSingleDBTModel}
      pipeline={pipeline}
      setCreatingNewDBTModel={setCreatingNewDBTModel}
      setRecsWindowOpenBlockIdx={setRecsWindowOpenBlockIdx}
    />
  ), [
    blocks,
    isIntegration,
    pipeline,
    onClickAddSingleDBTModel,
    setRecsWindowOpenBlockIdx,
  ]);

  return (
    <>
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
                const finalFilePath = creatingNewDBTModel
                  ? `${filePath}/${addUnderscores(dbtModelName || randomNameGenerator())}.${FileExtensionEnum.SQL}`
                  : filePath;
                const newBlock: BlockRequestPayloadType = {
                  configuration: {
                    file_path: finalFilePath,
                  },
                  language: BlockLanguageEnum.SQL,
                  name: finalFilePath,
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
    </>
  );
}

export default PipelineDetail;
