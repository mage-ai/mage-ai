import { useMemo } from 'react';

import CodeBlockEditor from './Editor';
import CodeBlockHeader from './Header';
import useDBT from './dbt/useCodeBlockProps';
import useProject from '@utils/models/project/useProject';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { UseCodeBlockComponentProps, UseCodeBlockComponentType } from './constants';

export default function useCodeBlockComponents({
  ...props
}: UseCodeBlockComponentProps): UseCodeBlockComponentType {
  const {
    featureEnabled,
    featureUUIDs,
  } = useProject();

  if (!featureEnabled?.(featureUUIDs?.CODE_BLOCK_V2)) {
    return {};
  }

  const {
    autocompleteProviders,
    block,
    content,
    executionState,
    height,
    interruptKernel,
    onChange,
    onContentSizeChangeCallback,
    onDidChangeCursorPosition,
    onMountCallback,
    pipeline,
    placeholder,
    runBlockAndTrack,
    selected,
    setSelected,
    setTextareaFocused,
    shortcuts,
    status,
    textareaFocused,
    theme,
  } = props;

  if (![PipelineTypeEnum.PYTHON, PipelineTypeEnum.PYSPARK].includes(pipeline?.type)) {
    return {};
  }

  const {
    type,
  } = block || {
    type: null,
  };

  const codeBlockProps = useMemo(() => {
    if (BlockTypeEnum.DBT === type) {
      return useDBT(props);
    }
  }, [
    block,
    executionState,
    selected,
    status,
  ]);

  const editor = useMemo(() => {
    if (codeBlockProps?.editor) {
      return (
        <CodeBlockEditor
          autocompleteProviders={autocompleteProviders}
          block={block}
          content={content}
          height={height}
          onChange={onChange}
          onContentSizeChangeCallback={onContentSizeChangeCallback}
          onDidChangeCursorPosition={onDidChangeCursorPosition}
          onMountCallback={onMountCallback}
          placeholder={placeholder}
          selected={selected}
          setSelected={setSelected}
          setTextareaFocused={setTextareaFocused}
          shortcuts={shortcuts}
          textareaFocused={textareaFocused}
          theme={theme}
          {...(codeBlockProps?.editor || {})}
        />
      );
    }

    return null;
  }, [
    codeBlockProps,
  ]);

  const header = useMemo(() => {
    if (codeBlockProps?.header) {
      return (
        <CodeBlockHeader
          block={block}
          executionState={executionState}
          interruptKernel={interruptKernel}
          runBlockAndTrack={runBlockAndTrack}
          selected={selected}
          status={status}
          theme={theme}
          {...(codeBlockProps?.header || {})}
        />
      );
    }
  }, [
    codeBlockProps,
  ]);


  return {
    editor,
    extraDetails: null,
    footer: null,
    header,
    headerTabs: null,
    output: null,
    outputTabs: null,
    tags: null,
  };
}
