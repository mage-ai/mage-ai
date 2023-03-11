import {
  createRef,
  useMemo,
  useRef,
  useState,
 } from 'react';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import CodeBlock from '@components/CodeBlock';
import ExtensionOptionType, { ExtensionOptionTemplateType } from '@interfaces/ExtensionOptionType';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Add } from '@oracle/icons';
import { ExtensionProps } from '../constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { indexBy } from '@utils/array';

type GreatExpectationsProps = {
  extensionOption: ExtensionOptionType;
} & ExtensionProps;

function GreatExpectations({
  addNewBlockAtIndex,
  autocompleteItems,
  blockRefs,
  blocks,
  deleteBlock,
  extensionOption,
  fetchFileTree,
  fetchPipeline,
  interruptKernel,
  messages,
  onChangeCallbackBlock,
  onChangeCodeBlock,
  pipeline,
  runBlock,
  runningBlocks,
  savePipelineContent,
  selectedBlock,
  setAnyInputFocused,
  setSelectedBlock,
  setTextareaFocused,
  textareaFocused,
}: GreatExpectationsProps) {
  const refParent = useRef(null);
  const [dropdownMenuVisible, setDropdownMenuVisible] = useState<boolean>(false);
  const {
    uuid: extensionUUID,
  } = extensionOption || {};
  const { extensions } = pipeline || {};
  const templates: ExtensionOptionTemplateType[] = useMemo(() => extensionOption?.templates || [], [
    extensionOption,
  ]);
  // const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);
  // const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);

  const extension = useMemo(() => extensions?.[extensionUUID], [
    extensionUUID,
    extensions,
  ]);
  const extensionBlocks = useMemo(() => extension?.blocks || [], [extension]);

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

  const codeBlocks = useMemo(() => extensionBlocks.map((block: BlockType, idx: number) => {
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
          autocompleteItems={autocompleteItems}
          block={block}
          blockIdx={idx}
          blockRefs={blockRefs}
          blocks={blocks}
          defaultValue={block.content}
          deleteBlock={(b: BlockType) => {
            deleteBlock({
              ...b,
              extension_uuid: extensionUUID,
            });
            setAnyInputFocused(false);
          }}
          executionState={executionState}
          fetchFileTree={fetchFileTree}
          fetchPipeline={fetchPipeline}
          interruptKernel={interruptKernel}
          // mainContainerRef={mainContainerRef}
          // mainContainerWidth={mainContainerWidth}
          messages={messages[uuid]}
          noDivider
          onCallbackChange={(value: string) => onChangeCallbackBlock(type, uuid, value)}
          onChange={(value: string) => onChangeCodeBlock(type, uuid, value)}
          // onClickAddSingleDBTModel={onClickAddSingleDBTModel}
          // openSidekickView={openSidekickView}
          pipeline={pipeline}
          ref={blockRefs.current[path]}
          runBlock={runBlock}
          runningBlocks={runningBlocks}
          savePipelineContent={savePipelineContent}
          selected={selected}
          // setAddNewBlockMenuOpenIdx={setAddNewBlockMenuOpenIdx}
          setAnyInputFocused={setAnyInputFocused}
          // setCreatingNewDBTModel={setCreatingNewDBTModel}
          // setEditingBlock={setEditingBlock}
          // setErrors={setErrors}
          // setOutputBlocks={setOutputBlocks}
          // setRecsWindowOpenBlockIdx={setRecsWindowOpenBlockIdx}
          setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
          // setSelectedOutputBlock={setSelectedOutputBlock}
          setTextareaFocused={setTextareaFocused}
          textareaFocused={selected && textareaFocused}
        />
      </Spacing>
    );
  }), [
    autocompleteItems,
    blockRefs,
    blocks,
    deleteBlock,
    extensionBlocks,
    extensionUUID,
    fetchFileTree,
    fetchPipeline,
    interruptKernel,
    messages,
    onChangeCallbackBlock,
    onChangeCodeBlock,
    pipeline,
    runBlock,
    runningBlocks,
    runningBlocksByUUID,
    savePipelineContent,
    selectedBlock,
    setAnyInputFocused,
    setSelectedBlock,
    setTextareaFocused,
    textareaFocused,
  ]);

  return (
    <>
      <Spacing mb={PADDING_UNITS}>
        <Text default>
          Add an extension block to start writing expectations for blocks in the current pipeline.
        </Text>
      </Spacing>

      {codeBlocks}

      <Spacing mt={PADDING_UNITS}>
        <FlyoutMenuWrapper
          disableKeyboardShortcuts
          items={templates?.map(({
            description,
            name,
            path,
            uuid,
          }) => ({
            label: () => name,
            onClick: () => addNewBlockAtIndex({
              config: {
                template_path: path,
              },
              extension_uuid: extensionUUID,
              type: BlockTypeEnum.EXTENSION,
            }),
            tooltip: () => description,
            uuid,
          }))}
          onClickCallback={() => setDropdownMenuVisible(false)}
          open={dropdownMenuVisible}
          parentRef={refParent}
          uuid="Extension"
        >
          <KeyboardShortcutButton
            beforeElement={
              <Add />
            }
            inline
            onClick={(e) => {
              e.preventDefault();
              setDropdownMenuVisible(true);
            }}
            uuid="AddNewBlocks/Extension"
          >
            Add extension block
          </KeyboardShortcutButton>
        </FlyoutMenuWrapper>
      </Spacing>
    </>
  );
}

export default GreatExpectations;
