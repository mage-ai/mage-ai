import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import CodeEditor, {
  CodeEditorSharedProps,
  OnDidChangeCursorPositionParameterType,
} from '@components/CodeEditor';
import CodeOutput from './CodeOutput';
import CommandButtons, { CommandButtonsSharedProps } from './CommandButtons';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import usePrevious from '@utils/usePrevious';
import {
  BlockDivider,
  BlockDividerInner,
} from './index.style';
import {
  ContainerStyle,
  CodeContainerStyle,
} from './index.style';
import { SINGLE_LINE_HEIGHT } from '@components/CodeEditor/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

type CodeBlockProps = {
  addNewBlock: (block: BlockType) => void;
  block: BlockType;
  defaultValue?: string;
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
    setRunEndTime(0)
    setRunStartTime(Number(new Date()));
  }, [
    block,
    content,
    runCount,
    runBlock,
    setRunCount,
    setRunEndTime,
    setRunStartTime,
  ]);

  const finalExecutionState = messages?.[messages.length - 1]?.execution_state;
  const isInProgress = messages?.length >= 1 && finalExecutionState !== ExecutionStateEnum.IDLE;

  const finalExecutionStatePrevious = usePrevious(finalExecutionState);
  useEffect(() => {
    if (finalExecutionState === ExecutionStateEnum.IDLE
      && finalExecutionState !== finalExecutionStatePrevious
    ) {
      setRunEndTime(Number(new Date()));
    }
  }, [
    finalExecutionState,
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

  return (
    <div
      onClick={() => {
        if (!selected) {
          setSelected(true);
        }
      }}
      style={{ position: 'relative' }}
    >
      {(selected || isInProgress) && (
        <CommandButtons
          block={block}
          deleteBlock={deleteBlock}
          interruptKernel={interruptKernel}
          runBlock={runBlockAndTrack}
          status={isInProgress ? ExecutionStateEnum.BUSY : ExecutionStateEnum.IDLE}
        />
      )}

      <ContainerStyle
        blockType={block.type}
        selected={selected}
      >
        <CodeContainerStyle
          className={selected && textareaFocused ? 'selected' : null}
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

        {messagesWithType.length >= 1 && (
          <CodeOutput
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
          {addNewBlocksVisible && <AddNewBlocks addNewBlock={addNewBlock} compact />}
          <BlockDividerInner className="block-divider-inner" />
        </BlockDivider>
      )}
    </div>
  );
}

export default CodeBlockProps;
