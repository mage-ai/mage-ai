import {
  createRef,
  useEffect,
  useMemo,
  useRef,
  useState,
 } from 'react';
import { useMutation } from 'react-query';

import BlockType, { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';
import ClickOutside from '@oracle/components/ClickOutside';
import CodeBlock from '@components/CodeBlock';
import CodeBlockExtraContent from './CodeBlockExtraContent';
import ExtensionOptionType, { ExtensionOptionTemplateType } from '@interfaces/ExtensionOptionType';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { Add } from '@oracle/icons';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import { ExtensionProps } from '../constants';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_META,
  KEY_CODE_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ICON_SIZE, IconContainerStyle } from '../../AddNewBlocks/index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { getdataSourceMenuItems } from '../../AddNewBlocks/utils';
import { indexBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { useKeyboardContext } from '@context/Keyboard';

type GreatExpectationsProps = {
  extensionOption: ExtensionOptionType;
} & ExtensionProps;

function GreatExpectations({
  addNewBlockAtIndex,
  autocompleteItems,
  blockRefs,
  blocks,
  blocksInNotebook,
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
  setErrors,
  setSelectedBlock,
  setTextareaFocused,
  showBrowseTemplates,
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

  const extension = useMemo(() => extensions?.[extensionUUID], [
    extensionUUID,
    extensions,
  ]);
  const extensionBlocks = useMemo(() => extension?.blocks || [], [extension]);
  const extensionBlocksByUUID = useMemo(() => indexBy(extensionBlocks, ({ uuid }) => uuid), [
    extensionBlocks,
  ]);
  const isSelected = useMemo(() => extensionUUID === selectedBlock?.extension_uuid
    && extensionBlocksByUUID[selectedBlock?.uuid], [
    extensionBlocksByUUID,
    extensionUUID,
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
      encodeURIComponent(pipeline?.uuid),
      encodeURIComponent(block?.uuid),
      {
        query: {
          extension_uuid: block?.extension_uuid,
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

  const codeBlocks = useMemo(() => extensionBlocks.map((blockInit: BlockType, idx: number) => {
    const block = {
      ...blockInit,
      extension_uuid: extensionUUID,
    };
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
              extension_uuid: extensionUUID,
            });
            setAnyInputFocused(false);
          }}
          executionState={executionState}
          extraContent={(
            <CodeBlockExtraContent
              block={block}
              blockActionDescription="Click a block name to run expectations on it."
              blocks={blocksInNotebook}
              inputPlaceholder="Select blocks to run expectations on"
              loading={isLoadingUpdateBlock}
              supportedUpstreamBlockLanguages={[
                BlockLanguageEnum.PYTHON,
              ]}
              supportedUpstreamBlockTypes={[
                BlockTypeEnum.DATA_EXPORTER,
                BlockTypeEnum.DATA_LOADER,
                BlockTypeEnum.DBT,
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
    deleteBlock,
    extensionBlocks,
    extensionUUID,
    fetchFileTree,
    fetchPipeline,
    interruptKernel,
    isLoadingUpdateBlock,
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
    setErrors,
    setSelectedBlock,
    setTextareaFocused,
    textareaFocused,
    updateBlock,
  ]);

  const uuidKeyboard = 'Extensions/GreatExpectations/index';
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
    <>
      <Spacing mb={PADDING_UNITS}>
        <Text default>
          Add an extension block to start writing expectations for blocks in the current pipeline.
        </Text>
        <Spacing mt={1}>
          <Text default>
            When a block in your pipeline runs, it’ll run any tests you define in its code.
            All associated extension blocks will also run during that phase.
            Learn more about the <Link
              href="https://docs.mage.ai/development/testing/great-expectations"
              openNewWindow
            >
              Great Expectation power up
            </Link>.
          </Text>
        </Spacing>
        <Spacing mt={1}>
          <Text default>
            For all available expectations, read Great Expectation’s <Link
              href="https://greatexpectations.io/expectations/"
              openNewWindow
            >
              documentation
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
            items={templates?.map(({
              description,
              name,
              path,
              uuid,
            }) => ({
              label: () => name,
              onClick: () => addNewBlockAtIndex(
                {
                  config: {
                    template_path: path,
                  },
                  extension_uuid: extensionUUID,
                  type: BlockTypeEnum.EXTENSION,
                },
                extensionBlocks?.length || 0,
              ),
              tooltip: () => description,
              uuid,
              // @ts-ignore
            })).concat(getdataSourceMenuItems(
              block => addNewBlockAtIndex(
                {
                  ...block,
                  extension_uuid: extensionUUID,
                  type: BlockTypeEnum.EXTENSION,
                },
                extensionBlocks?.length || 0,
              ),
              BlockTypeEnum.EXTENSION,
              null,
              {
                onlyCustomTemplate: true,
                showBrowseTemplates,
              },
            ))}
            onClickCallback={() => setDropdownMenuVisible(false)}
            open={dropdownMenuVisible}
            parentRef={refParent}
            uuid="Extension"
          >
            <KeyboardShortcutButton
              beforeElement={
                <IconContainerStyle teal>
                  <Add size={ICON_SIZE} />
                </IconContainerStyle>
              }
              inline
              onClick={(e) => {
                e.preventDefault();
                setDropdownMenuVisible(true);
              }}
              uuid="AddNewBlocks/Extension"
            >
              Extension block
            </KeyboardShortcutButton>
          </FlyoutMenuWrapper>
        </ClickOutside>
      </Spacing>
    </>
  );
}

export default GreatExpectations;
