import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import BlockType, {
  BLOCK_TYPE_ABBREVIATION_MAPPING,
  BLOCK_TYPE_NAME_MAPPING,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import CodeEditor, {
  CodeEditorSharedProps,
  OnDidChangeCursorPositionParameterType,
} from '@components/CodeEditor';
import CodeOutput from './CodeOutput';
import CommandButtons, { CommandButtonsSharedProps } from './CommandButtons';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import usePrevious from '@utils/usePrevious';
import {
  BlockDivider,
  BlockDividerInner,
} from './index.style';
import {
  ContainerStyle,
  CodeContainerStyle,
  getColorsForBlockType,
} from './index.style';
import { FileFill, Stack } from '@oracle/icons';
import {
  KEY_CODE_ENTER,
  KEY_CODE_META,
  KEY_CODE_SHIFT,
} from '@utils/hooks/keyboardShortcuts/constants';
import { SINGLE_LINE_HEIGHT } from '@components/CodeEditor/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pluralize } from '@utils/string';
import { useKeyboardContext } from '@context/Keyboard';

type CodeBlockProps = {
  addNewBlock: (block: BlockType) => void;
  block: BlockType;
  defaultValue?: string;
  executionState: ExecutionStateEnum;
  mainContainerRef?: any;
  noDivider?: boolean;
  messages: KernelOutputType[];
  runBlock: (payload: {
    block: BlockType;
    code: string;
  }) => void;
} & CodeEditorSharedProps & CommandButtonsSharedProps;

function CodeBlockProps({
  addNewBlock,
  block,
  defaultValue = '',
  deleteBlock,
  executionState,
  height,
  interruptKernel,
  mainContainerRef,
  messages = [],
  noDivider,
  runBlock,
  selected,
  setSelected,
  setTextareaFocused,
  textareaFocused,
}: CodeBlockProps) {
  const themeContext = useContext(ThemeContext);
  const [addNewBlocksVisible, setAddNewBlocksVisible] = useState(false);
  const [content, setContent] = useState(defaultValue)
  const [runCount, setRunCount] = useState<Number>(0);
  const [runEndTime, setRunEndTime] = useState<Number>(0);
  const [runStartTime, setRunStartTime] = useState<Number>(0);

  const runBlockAndTrack = useCallback((code?: string) => {
    runBlock({
      block,
      code: code || content,
    });
    setRunCount(1 + Number(runCount));
    setRunEndTime(null);
  }, [
    block,
    content,
    runCount,
    runBlock,
    setRunCount,
    setRunEndTime,
  ]);

  const messagesPrevious = usePrevious(messages);
  useEffect(() => {
    if (!messagesPrevious?.length && messages?.length >= 1) {
      setRunStartTime(Number(new Date()));
    }
  }, [
    messages,
    messagesPrevious,
    setRunStartTime,
  ]);

  const isInProgress = messages?.length >= 1 && executionState !== ExecutionStateEnum.IDLE;

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

  const messagesWithType = useMemo(() => messages.filter(({ type }: KernelOutputType) => type), [
    messages,
  ]);
  const hasError = !!messagesWithType.find(({ error }) => error);

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
      if (selected) {
        if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_ENTER], keyMapping)) {
          runBlockAndTrack();
        } else if (onlyKeysPresent([KEY_CODE_SHIFT, KEY_CODE_ENTER], keyMapping)) {
          runBlockAndTrack();
          addNewBlock({
            type: block.type,
          });
        }
      }
    },
    [
      addNewBlock,
      runBlockAndTrack,
      selected,
    ],
  );

  const color = getColorsForBlockType(block.type, { theme: themeContext }).accent;
  const numberOfParentBlocks = block?.upstream_blocks?.length || 0;
  const borderColorShareProps = {
    blockType: block.type,
    hasError,
    selected,
  };
  const hasOutput = messagesWithType.length >= 1;
  const onClickSelectBlock = useCallback(() => {
    if (!selected) {
      setSelected(true);
    }
  }, [
    selected,
    setSelected,
  ]);

  return (
    <div
      style={{ position: 'relative' }}
    >
      <div
        onClick={() => onClickSelectBlock()}
        style={{ marginBottom: UNIT / 4 }}
      >
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
        >
          <Flex alignItems="center" flex={1}>
            <Tooltip
              block
              label={BLOCK_TYPE_NAME_MAPPING[block.type]}
              size={null}
              widthFitContent
            >
              <FlexContainer alignItems="center">
                <Circle
                  color={color}
                  size={UNIT * 1.5}
                  square
                />

                <Spacing mr={1} />

                <Text
                  color={color}
                  monospace
                >
                  {BLOCK_TYPE_ABBREVIATION_MAPPING[block.type]}
                </Text>
              </FlexContainer>
            </Tooltip>

            <Spacing mr={PADDING_UNITS} />

            <FileFill size={UNIT * 1.5} />

            <Spacing mr={1} />

            <Text monospace muted>
              {block.uuid}
            </Text>
          </Flex>

          <div>
            <Tooltip
              appearBefore
              block
              label={`
                ${pluralize('parent block', numberOfParentBlocks)}${numberOfParentBlocks === 0 && '. Click to select 1 or more blocks to depend on.'}
              `}
              size={null}
              widthFitContent
            >
              <Button
                noBackground
                noBorder
                noPadding
                // onClick={() => toggleBefore()}
              >
                <FlexContainer alignItems="center">
                  <Text monospace>
                    {numberOfParentBlocks}
                  </Text>

                  <Spacing mr={1} />

                  <Stack size={UNIT * 2} />
                </FlexContainer>
              </Button>
            </Tooltip>
          </div>
        </FlexContainer>
      </div>

      {(selected || isInProgress) && (
        <CommandButtons
          block={block}
          deleteBlock={deleteBlock}
          executionState={executionState}
          interruptKernel={interruptKernel}
          runBlock={runBlockAndTrack}
        />
      )}

      <ContainerStyle onClick={() => onClickSelectBlock()}>
        <CodeContainerStyle
          {...borderColorShareProps}
          className={selected && textareaFocused ? 'selected' : null}
          hasOutput={hasOutput}
        >
          <CodeEditor
            // autoSave
            autoHeight
            height={height}
            onChange={(val: string) => setContent(val)}
            onDidChangeCursorPosition={onDidChangeCursorPosition}
            placeholder="Start typing here..."
            runBlock={runBlockAndTrack}
            selected={selected}
            setSelected={setSelected}
            setTextareaFocused={setTextareaFocused}
            textareaFocused={textareaFocused}
            value={content}
            width="100%"
          />
        </CodeContainerStyle>

        {hasOutput && (
          <CodeOutput
            {...borderColorShareProps}
            isInProgress={isInProgress}
            messages={messagesWithType}
            runCount={runCount}
            runEndTime={runEndTime}
            runStartTime={runStartTime}
          />
        )}
      </ContainerStyle>

      {!noDivider && (
        <BlockDivider
          onMouseEnter={() => setAddNewBlocksVisible(true)}
          onMouseLeave={() => setAddNewBlocksVisible(false)}
        >
          {addNewBlocksVisible && (
            <AddNewBlocks
              addNewBlock={addNewBlock}
              compact
            />
          )}
          <BlockDividerInner className="block-divider-inner" />
        </BlockDivider>
      )}
    </div>
  );
}

export default CodeBlockProps;
