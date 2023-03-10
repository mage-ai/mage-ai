import { useMemo, useRef, useState } from 'react';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import CodeBlock from '@components/CodeBlock';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import ExtensionOptionType, {
  ExtensionOptionTemplateType,
  ExtensionTypeEnum,
} from '@interfaces/ExtensionOptionType';
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
  deleteBlock,
  extensionOption,
  pipeline,
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
  const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);
  const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);

  const extension = useMemo(() => extensions?.[extensionUUID], [
    extensionUUID,
    extensions,
  ]);
  const extensionBlocks = useMemo(() => extension?.blocks || [], [extension]);

  const codeBlocks = useMemo(() => extensionBlocks.map((block: BlockType, idx: number) => {
    const {
      uuid,
    } = block;

    return (
      <Spacing key={uuid} mt={PADDING_UNITS}>
        <CodeBlock
          // addNewBlock={(b: BlockRequestPayloadType) => {
          //   setTextareaFocused(true);

          //   return addNewBlockAtIndex(b, idx + 1, setSelectedBlock);
          // }}
          // addNewBlockMenuOpenIdx={addNewBlockMenuOpenIdx}
          // addWidget={addWidget}
          // autocompleteItems={autocompleteItems}
          block={block}
          blockIdx={idx}
          // blockRefs={blockRefs}
          blocks={extensionBlocks}
          // dataProviders={dataProviders}
          defaultValue={block.content}
          deleteBlock={(b: BlockType) => {
            deleteBlock({
              ...b,
              extension_uuid: extensionUUID,
            });
            // setAnyInputFocused(false);
          }}
          // executionState={executionState}
          // fetchFileTree={fetchFileTree}
          // fetchPipeline={fetchPipeline}
          // interruptKernel={interruptKernel}
          // mainContainerRef={mainContainerRef}
          // mainContainerWidth={mainContainerWidth}
          // messages={messages[uuid]}
          noDivider
          // onCallbackChange={(value: string) => onChangeCallbackBlock(uuid, value)}
          // onChange={(value: string) => onChangeCodeBlock(uuid, value)}
          // onClickAddSingleDBTModel={onClickAddSingleDBTModel}
          // openSidekickView={openSidekickView}
          pipeline={pipeline}
          // ref={blockRefs.current[path]}
          // runBlock={runBlock}
          // runningBlocks={runningBlocks}
          // savePipelineContent={savePipelineContent}
          // selected={selected}
          // setAddNewBlockMenuOpenIdx={setAddNewBlockMenuOpenIdx}
          // setAnyInputFocused={setAnyInputFocused}
          // setCreatingNewDBTModel={setCreatingNewDBTModel}
          // setEditingBlock={setEditingBlock}
          // setErrors={setErrors}
          // setOutputBlocks={setOutputBlocks}
          // setRecsWindowOpenBlockIdx={setRecsWindowOpenBlockIdx}
          // setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
          // setSelectedOutputBlock={setSelectedOutputBlock}
          // setTextareaFocused={setTextareaFocused}
          // textareaFocused={selected && textareaFocused}
          // widgets={widgets}
        />
      </Spacing>
    );
  }), [
    extensionBlocks,
    pipeline,
  ]);

  return (
    <>
      <Spacing mb={PADDING_UNITS}>
        <Text default>
          Add an extension block to start writing expectations for blocks in the current pipeline.
        </Text>
      </Spacing>

      {codeBlocks}

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
    </>
  );
}

export default GreatExpectations;
