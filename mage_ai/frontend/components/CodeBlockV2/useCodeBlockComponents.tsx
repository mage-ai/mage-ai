import { useMemo, useState } from 'react';

import CodeBlockEditor from './Editor';
import CodeBlockHeader from './Header';
import MainContent from './MainContent';
import useDBT from './dbt/useCodeBlockProps';
import useProject from '@utils/models/project/useProject';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { UseCodeBlockComponentProps, UseCodeBlockComponentType } from './constants';

export default function useCodeBlockComponents({
  ...props
}: UseCodeBlockComponentProps): UseCodeBlockComponentType {
  const [sideMenuVisible, setSideMenuVisible] = useState(false);

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
    savePipelineContent,
    selected,
    setSelected,
    setTextareaFocused,
    shortcuts,
    status,
    textareaFocused,
    theme,
    updatePipeline,
  } = props;

  const {
    featureEnabled,
    featureUUIDs,
  } = useProject();

  const enabled = useMemo(() => [
    PipelineTypeEnum.PYTHON,
    PipelineTypeEnum.PYSPARK,
  ].includes(pipeline?.type) && featureEnabled?.(featureUUIDs?.CODE_BLOCK_V2), [
    featureEnabled,
    featureUUIDs,
    pipeline,
  ]);

  const {
    type,
  } = block || {
    type: null,
  };

  const codeBlockProps = useMemo(() => {
    if (!enabled) {
      return null;
    }

    if (BlockTypeEnum.DBT === type) {
      return useDBT(props);
    }
  }, [
    enabled,
    props,
    type,
  ]);

  const editor = useMemo(() => {
    if (!enabled) {
      return null;
    }

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
          sideMenuVisible={sideMenuVisible}
          shortcuts={shortcuts}
          textareaFocused={textareaFocused}
          theme={theme}
          {...(codeBlockProps?.editor || {})}
        />
      );
    }

    return null;
  }, [
    autocompleteProviders,
    block,
    codeBlockProps,
    content,
    enabled,
    height,
    onChange,
    onContentSizeChangeCallback,
    onDidChangeCursorPosition,
    onMountCallback,
    placeholder,
    selected,
    setSelected,
    setTextareaFocused,
    sideMenuVisible,
    shortcuts,
    textareaFocused,
    theme,
  ]);

  const mainContentMemo = useMemo(() => {
    if (!editor) {
      return null;
    }

    return (
      <MainContent sideMenuVisible={sideMenuVisible}>
        {editor}
      </MainContent>
    );
  }, [
    editor,
    sideMenuVisible,
  ]);

  const header = useMemo(() => {
    if (!enabled) {
      return null;
    }

    if (codeBlockProps?.header) {
      return (
        <CodeBlockHeader
          block={block}
          executionState={executionState}
          interruptKernel={interruptKernel}
          runBlockAndTrack={runBlockAndTrack}
          selected={selected}
          setSideMenuVisible={setSideMenuVisible}
          sideMenuVisible={sideMenuVisible}
          status={status}
          theme={theme}
          {...(codeBlockProps?.header || {})}
        />
      );
    }
  }, [
    block,
    codeBlockProps,
    enabled,
    executionState,
    interruptKernel,
    runBlockAndTrack,
    selected,
    setSideMenuVisible,
    sideMenuVisible,
    status,
    theme,
  ]);

  return {
    editor: mainContentMemo,
    extraDetails: null,
    footer: null,
    header,
    headerTabs: null,
    output: null,
    outputTabs: null,
    tags: null,
  };
}
