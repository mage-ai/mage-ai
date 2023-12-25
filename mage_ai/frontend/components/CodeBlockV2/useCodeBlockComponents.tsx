import { useMemo, useState } from 'react';

import CodeBlockEditor from './Editor';
import CodeBlockHeader from './Header';
import CodeBlockOutput from './Output';
import MainContent from './MainContent';
import useDBT from './dbt/useCodeBlockProps';
import useProject from '@utils/models/project/useProject';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { UseCodeBlockComponentProps, UseCodeBlockComponentType } from './constants';

export default function useCodeBlockComponents({
  ...props
}: UseCodeBlockComponentProps): UseCodeBlockComponentType {
  const [selectedHeaderTab, setSelectedHeaderTab] = useState(null);
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
    showConfigureProjectModal,
    status,
    textareaFocused,
    theme,
    updatePipeline,
  } = props;

  const {
    featureEnabled,
    featureUUIDs,
    project,
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
          pipeline={pipeline}
          placeholder={placeholder}
          project={project}
          selected={selected}
          setSelected={setSelected}
          setTextareaFocused={setTextareaFocused}
          sideMenuVisible={sideMenuVisible}
          shortcuts={shortcuts}
          showConfigureProjectModal={showConfigureProjectModal}
          textareaFocused={textareaFocused}
          theme={theme}
          updatePipeline={updatePipeline}
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
    pipeline,
    placeholder,
    project,
    selected,
    setSelected,
    setTextareaFocused,
    sideMenuVisible,
    shortcuts,
    showConfigureProjectModal,
    textareaFocused,
    theme,
    updatePipeline,
  ]);

  const mainContentMemo = useMemo(() => {
    if (!editor) {
      return null;
    }

    return (
      <MainContent
        renderTab={codeBlockProps?.headerTabContent?.renderTab}
        selectedHeaderTab={selectedHeaderTab}
        sideMenuVisible={sideMenuVisible}
      >
        {editor}
      </MainContent>
    );
  }, [
    codeBlockProps,
    editor,
    selectedHeaderTab,
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
          selectedHeaderTab={selectedHeaderTab}
          setSelectedHeaderTab={setSelectedHeaderTab}
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
    selectedHeaderTab,
    setSelectedHeaderTab,
    setSideMenuVisible,
    sideMenuVisible,
    status,
    theme,
  ]);

  const output = useMemo(() => {
    if (!enabled) {
      return null;
    }

    if (codeBlockProps?.output) {
      return (
        <CodeBlockOutput
          block={block}
          selected={selected}
          {...(codeBlockProps?.output || {})}
        />
      );
    }
  }, [
    block,
    codeBlockProps,
    selected,
  ]);

  return {
    editor: mainContentMemo,
    extraDetails: null,
    footer: null,
    header,
    output,
    outputTabs: null,
    tags: null,
  };
}
