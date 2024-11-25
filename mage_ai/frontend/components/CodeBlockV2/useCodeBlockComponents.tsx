import { useMemo, useState, useRef } from 'react';

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
  const refHeader = useRef(null);

  const [selectedHeaderTab, setSelectedHeaderTab] = useState(null);
  const [selectedOutputTabs, setSelectedOutputTabs] = useState(null);
  const [sideMenuVisible, setSideMenuVisible] = useState(false);
  const [subheaderVisible, setSubheaderVisible] = useState(null);

  const {
    autocompleteProviders,
    block,
    blocks,
    content,
    executionState,
    height,
    interruptKernel,
    onChange,
    onContentSizeChangeCallback,
    onDidChangeCursorPosition,
    onMountCallback,
    openSidekickView,
    outputProps,
    pipeline,
    placeholder,
    runBlockAndTrack,
    savePipelineContent,
    scrollTogether,
    selected,
    setErrors,
    setSelected,
    setTextareaFocused,
    showConfigureProjectModal,
    sideBySideEnabled,
    status,
    textareaFocused,
    theme,
    updatePipeline,
  } = props;

  const {
    blockIndex,
    blockOutputRef,
    collapsed,
    errorMessages,
    isHidden,
    mainContainerWidth,
    messages,
    runCount,
    runEndTime,
    runStartTime,
    runningBlocks,
    setOutputBlocks,
    setSelectedOutputBlock,
  } = outputProps || {};

  const {
    featureEnabled,
    featureUUIDs,
    project,
  } = useProject();

  const enabled = useMemo(() =>
    [
      PipelineTypeEnum.PYTHON,
      PipelineTypeEnum.PYSPARK,
    ].includes(pipeline?.type)
      /*
       * Replace "featureUUIDs?.DBT_V2" with "featureUUIDs?.CODE_BLOCK_V2" when all
       * block types (not just dbt blocks) are supported by V2 of the code block.
       */
      && false,
    [
      pipeline,
    ],
  );

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
          runBlockAndTrack={runBlockAndTrack}
          selected={selected}
          setSelected={setSelected}
          setTextareaFocused={setTextareaFocused}
          sideMenuVisible={sideMenuVisible}
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
    runBlockAndTrack,
    selected,
    setSelected,
    setTextareaFocused,
    sideMenuVisible,
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
        renderTabContent={codeBlockProps?.headerTabContent?.renderTabContent}
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
          ref={refHeader}
          selected={selected}
          selectedHeaderTab={selectedHeaderTab}
          setSelectedHeaderTab={setSelectedHeaderTab}
          setSideMenuVisible={setSideMenuVisible}
          setSubheaderVisible={setSubheaderVisible}
          sideMenuVisible={sideMenuVisible}
          status={status}
          subheaderVisible={subheaderVisible}
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
    selected,
    selectedHeaderTab,
    setSelectedHeaderTab,
    setSideMenuVisible,
    setSubheaderVisible,
    sideMenuVisible,
    status,
    subheaderVisible,
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
          blockIndex={blockIndex}
          blockOutputRef={blockOutputRef}
          blocks={blocks}
          collapsed={collapsed}
          errorMessages={errorMessages}
          executionState={executionState}
          headerRef={refHeader}
          isHidden={isHidden}
          mainContainerWidth={mainContainerWidth}
          messages={messages}
          openSidekickView={openSidekickView}
          pipeline={pipeline}
          runCount={runCount}
          runEndTime={runEndTime}
          runStartTime={runStartTime}
          runningBlocks={runningBlocks}
          scrollTogether={scrollTogether}
          selected={selected}
          selectedOutputTabs={selectedOutputTabs}
          setErrors={setErrors}
          setOutputBlocks={setOutputBlocks}
          setSelectedOutputBlock={setSelectedOutputBlock}
          // @ts-ignore
          setSelectedOutputTabs={setSelectedOutputTabs}
          sideBySideEnabled={sideBySideEnabled}
          subheaderVisible={subheaderVisible}
          theme={theme}
          {...(codeBlockProps?.output || {})}
        />
      );
    }
  }, [
    block,
    blockIndex,
    blockOutputRef,
    blocks,
    codeBlockProps,
    collapsed,
    enabled,
    errorMessages,
    executionState,
    isHidden,
    mainContainerWidth,
    messages,
    openSidekickView,
    pipeline,
    runCount,
    runEndTime,
    runStartTime,
    runningBlocks,
    scrollTogether,
    selected,
    selectedOutputTabs,
    setErrors,
    setOutputBlocks,
    setSelectedOutputBlock,
    setSelectedOutputTabs,
    sideBySideEnabled,
    subheaderVisible,
    theme,
  ]);

  return {
    editor: mainContentMemo,
    header,
    output,
  };
}
