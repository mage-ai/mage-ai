import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useMutation } from 'react-query';

import BlockTemplateType from '@interfaces/BlockTemplateType';
import BlockType, { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';
import ClickOutside from '@oracle/components/ClickOutside';
import CodeBlock from '@components/CodeBlock';
import CodeBlockExtraContent from '../Extensions/GreatExpectations/CodeBlockExtraContent';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { Add } from '@oracle/icons';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import { ExtensionProps } from '../Extensions/constants';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_META,
  KEY_CODE_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ICON_SIZE, IconContainerStyle } from '../AddNewBlocks/index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  getdataSourceMenuItems,
  groupBlockTemplates,
} from '@components/PipelineDetail/AddNewBlocks/utils';
import { indexBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { queryFromUrl } from '@utils/url';
import { useKeyboardContext } from '@context/Keyboard';

export type CallbacksProps = {} & ExtensionProps;

function Callbacks({
  addNewBlockAtIndex,
  autocompleteItems,
  blockRefs,
  blocks,
  blocksInNotebook,
  deleteBlock,
  fetchFileTree,
  fetchPipeline,
  interruptKernel,
  messages,
  onChangeCallbackBlock,
  onChangeCodeBlock,
  onSelectBlockFile,
  pipeline,
  runBlock,
  runningBlocks,
  savePipelineContent,
  selectedBlock,
  setAnyInputFocused,
  setErrors,
  setHiddenBlocks,
  setSelectedBlock,
  setTextareaFocused,
  textareaFocused,
}: CallbacksProps) {
  const refParent = useRef(null);
  const [dropdownMenuVisible, setDropdownMenuVisible] = useState<boolean>(false);

  const qUrl = queryFromUrl();
  const {
    block_uuid: blockUUIDFromUrl,
  } = qUrl;

  useEffect(() => {
    const block = blocks.find(({ uuid }) => blockUUIDFromUrl?.split(':')?.[0] === uuid);

    if (block) {
      if (!selectedBlock || block?.uuid !== selectedBlock?.uuid) {
        // @ts-ignore
        setHiddenBlocks(prev => ({
          ...prev,
          [block.uuid]: false,
        }));
        onSelectBlockFile(block.uuid, block.type, null);
      }
    }
  }, [
    blockUUIDFromUrl,
    blocks,
    onSelectBlockFile,
    selectedBlock,
    setHiddenBlocks,
  ]);

  const {
    type: pipelineType,
  } = pipeline || {};

  const callbackBlocks = useMemo(() => pipeline?.callbacks || [], [pipeline]);
  const callbackBlocksByUUID = useMemo(() => indexBy(callbackBlocks, ({ uuid }) => uuid), [
    callbackBlocks,
  ]);

  const { data: dataBlockTemplates } = api.block_templates.list({}, {
    revalidateOnFocus: false,
  });
  const blockTemplates: BlockTemplateType[] =
    useMemo(() => dataBlockTemplates?.block_templates || [], [
      dataBlockTemplates,
    ]);

  const addNewBlock = useCallback(payload => addNewBlockAtIndex(
    payload,
    callbackBlocks?.length || 0,
  ), [
    addNewBlockAtIndex,
    callbackBlocks,
  ]);
  const blockTemplatesByBlockType = useMemo(() => groupBlockTemplates(
    blockTemplates,
    addNewBlock,
  ), [
    addNewBlock,
    blockTemplates,
  ]);
  const callbackItems = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.CALLBACK,
    pipelineType,
    {
      blockTemplatesByBlockType,
      languages: [BlockLanguageEnum.PYTHON],
    },
  ), [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

  const isSelected = useMemo(() => callbackBlocksByUUID[selectedBlock?.uuid], [
    callbackBlocksByUUID,
    selectedBlock,
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

  const [updateBlock, { isLoading: isLoadingUpdateBlock }] = useMutation(
    ({
      block,
      upstream_blocks: upstreamBlocks,
    }: {
      block: BlockType,
      upstream_blocks: string[];
    }) => api.blocks.pipelines.useUpdate(
      pipeline?.uuid,
      encodeURIComponent(block?.uuid),
      {
        query: {
          block_type: block?.type,
        },
      },
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

  const codeBlocks = useMemo(() => callbackBlocks.map((block: BlockType, idx: number) => {
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
      <Spacing key={uuid} mt={PADDING_UNITS}>
        <CodeBlock
          allBlocks={blocks}
          autocompleteItems={autocompleteItems}
          block={block}
          blockIdx={idx}
          blockRefs={blockRefs}
          blocks={blocks}
          defaultValue={block.content}
          deleteBlock={(b: BlockType) => {
            deleteBlock({
              ...b,
            });
            setAnyInputFocused(false);
          }}
          executionState={executionState}
          extraContent={(
            <CodeBlockExtraContent
              block={block}
              blocks={blocksInNotebook}
              inputPlaceholder="Select blocks to add callbacks to"
              loading={isLoadingUpdateBlock}
              onClickTag={(block: BlockType) => {
                // @ts-ignore
                setHiddenBlocks(prev => ({
                  ...prev,
                  [block.uuid]: false,
                }));
                onSelectBlockFile(block.uuid, block.type, null);
              }}
              supportedUpstreamBlockTypes={[
                BlockTypeEnum.CUSTOM,
                BlockTypeEnum.DATA_EXPORTER,
                BlockTypeEnum.DATA_LOADER,
                BlockTypeEnum.DBT,
                BlockTypeEnum.SCRATCHPAD,
                BlockTypeEnum.SENSOR,
                BlockTypeEnum.TRANSFORMER,
              ]}
              updateBlock={updateBlock}
            />
          )}
          fetchFileTree={fetchFileTree}
          fetchPipeline={fetchPipeline}
          hideRunButton
          interruptKernel={interruptKernel}
          messages={messages[uuid]}
          noDivider
          onCallbackChange={(value: string) => onChangeCallbackBlock(type, uuid, value)}
          onChange={(value: string) => onChangeCodeBlock(type, uuid, value)}
          pipeline={pipeline}
          ref={blockRefs.current[path]}
          runBlock={runBlock}
          runningBlocks={runningBlocks}
          savePipelineContent={savePipelineContent}
          selected={selected}
          setAnyInputFocused={setAnyInputFocused}
          setErrors={setErrors}
          setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
          setTextareaFocused={setTextareaFocused}
          textareaFocused={selected && textareaFocused}
        />
      </Spacing>
    );
  }), [
    autocompleteItems,
    blockRefs,
    blocks,
    blocksInNotebook,
    callbackBlocks,
    deleteBlock,
    fetchFileTree,
    fetchPipeline,
    interruptKernel,
    isLoadingUpdateBlock,
    messages,
    onChangeCallbackBlock,
    onChangeCodeBlock,
    onSelectBlockFile,
    pipeline,
    runBlock,
    runningBlocks,
    runningBlocksByUUID,
    savePipelineContent,
    selectedBlock,
    setAnyInputFocused,
    setErrors,
    setHiddenBlocks,
    setSelectedBlock,
    setTextareaFocused,
    textareaFocused,
    updateBlock,
  ]);

  const uuidKeyboard = 'Callbacks/index';
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
    (event, keyMapping) => {
      if (disableGlobalKeyboardShortcuts || !isSelected) {
        return;
      }

      if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_S], keyMapping)
        || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_S], keyMapping)
      ) {
        event.preventDefault();
        savePipelineContent();
      }
    },
    [
      isSelected,
      savePipelineContent,
    ],
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <Spacing p={PADDING_UNITS}>
        <Spacing mb={PADDING_UNITS}>
          <Text default>
            Run 1 or more callback block functions whenever another block succeeds or fails.
          </Text>
          <Spacing mt={1}>
            <Text default>
              Learn more about <Link
                href="https://docs.mage.ai/guides/blocks/callbacks#adding-a-callback-to-your-block"
                openNewWindow
              >
                callbacks
              </Link>.
            </Text>
          </Spacing>
        </Spacing>

        {codeBlocks}

        <Spacing mt={PADDING_UNITS}>
          <ClickOutside
            onClickOutside={() => setDropdownMenuVisible(false)}
            open
          >
            <FlyoutMenuWrapper
              disableKeyboardShortcuts
              items={callbackItems}
              onClickCallback={() => setDropdownMenuVisible(false)}
              open={dropdownMenuVisible}
              parentRef={refParent}
              uuid="Callback"
            >
              <KeyboardShortcutButton
                beforeElement={
                  <IconContainerStyle rose>
                    <Add size={ICON_SIZE} />
                  </IconContainerStyle>
                }
                inline
                onClick={(e) => {
                  e.preventDefault();
                  setDropdownMenuVisible(true);
                }}
                uuid="AddNewBlocks/Callback"
              >
                Callback block
              </KeyboardShortcutButton>
            </FlyoutMenuWrapper>
          </ClickOutside>
        </Spacing>
      </Spacing>
    </DndProvider>
  );
}

export default Callbacks;
