import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { capitalize, lowercase, pluralize } from '@utils/string';
import {
  getdataSourceMenuItems,
  groupBlockTemplates,
} from '@components/PipelineDetail/AddNewBlocks/utils';
import { indexBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { queryFromUrl } from '@utils/url';
import { useKeyboardContext } from '@context/Keyboard';

export type AddonBlockProps = {
  addOnBlocks: BlockType[];
  addOnBlockType: BlockTypeEnum;
  description: string;
  displayBlockName: string;
} & ExtensionProps;

function AddonBlock({
  addNewBlockAtIndex,
  addOnBlocks,
  addOnBlockType,
  autocompleteItems,
  blockRefs,
  blocks,
  blocksInNotebook,
  deleteBlock,
  description,
  displayBlockName,
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
  showBrowseTemplates,
  showUpdateBlockModal,
  textareaFocused,
}: AddonBlockProps) {
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

  const addOnBlocksByUUID = useMemo(() => indexBy(addOnBlocks || [], ({ uuid }) => uuid), [
    addOnBlocks,
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
    addOnBlocksByUUID?.length || 0,
  ), [
    addNewBlockAtIndex,
    addOnBlocksByUUID,
  ]);
  const blockTemplatesByBlockType = useMemo(() => groupBlockTemplates(
    blockTemplates,
    addNewBlock,
  ), [
    addNewBlock,
    blockTemplates,
  ]);
  const addOnItems = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    addOnBlockType,
    pipelineType,
    {
      blockTemplatesByBlockType,
      languages: [BlockLanguageEnum.PYTHON],
      showBrowseTemplates,
    },
  ), [
    addNewBlock,
    addOnBlockType,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

  const isSelected = useMemo(() => addOnBlocksByUUID?.[selectedBlock?.uuid], [
    addOnBlocksByUUID,
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

  const codeBlocks = useMemo(() => addOnBlocks?.map((block: BlockType, idx: number) => {
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
              inputPlaceholder={`Select blocks to add ${pluralize(displayBlockName, null)} to`}
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
          // onCallbackChange={(value: string) => onChangeCallbackBlock(type, uuid, value)}
          onChange={(value: string) => onChangeCodeBlock(type, uuid, value)}
          pipeline={pipeline}
          ref={blockRefs.current[path]}
          runBlock={runBlock}
          runningBlocks={runningBlocks}
          savePipelineContent={savePipelineContent}
          showUpdateBlockModal={showUpdateBlockModal}
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
    addOnBlocks,
    autocompleteItems,
    blockRefs,
    blocks,
    blocksInNotebook,
    deleteBlock,
    displayBlockName,
    fetchFileTree,
    fetchPipeline,
    interruptKernel,
    isLoadingUpdateBlock,
    messages,
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
    showUpdateBlockModal,
    textareaFocused,
    updateBlock,
  ]);

  const uuidKeyboard = `${displayBlockName}/index`;
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
          {description}
        </Text>
        <Spacing mt={1}>
          <Text default>
            Learn more about <Link
              href={`https://docs.mage.ai/development/blocks/${lowercase(pluralize(displayBlockName, null))}/overview`}
              openNewWindow
            >
              {lowercase(pluralize(displayBlockName, null))}
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
            items={addOnItems}
            onClickCallback={() => setDropdownMenuVisible(false)}
            open={dropdownMenuVisible}
            parentRef={refParent}
            uuid={displayBlockName}
          >
            <KeyboardShortcutButton
              beforeElement={
                <IconContainerStyle
                  rose={addOnBlockType === BlockTypeEnum.CALLBACK}
                >
                  <Add size={ICON_SIZE} />
                </IconContainerStyle>
              }
              inline
              onClick={(e) => {
                e.preventDefault();
                setDropdownMenuVisible(true);
              }}
              uuid={`AddNewBlocks/${displayBlockName}`}
            >
              {capitalize(displayBlockName)} block
            </KeyboardShortcutButton>
          </FlyoutMenuWrapper>
        </ClickOutside>
      </Spacing>
    </>
  );
}

export default AddonBlock;
