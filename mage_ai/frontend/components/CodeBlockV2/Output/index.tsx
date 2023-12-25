import { useEffect, useMemo, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
import FileEditorHeader from '@components/FileEditor/Header';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import useCodeOutput from '@components/CodeBlock/CodeOutput/useCodeOutput';
import { CodeBlockOutputProps } from './constants';
import { ContainerStyle } from '@components/CodeBlock/CodeOutput/index.style';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import { OutputDisplayTypeEnum } from '@components/CodeBlock/CodeOutput/constants';
import { OutputTabEnum } from '../dbt/constants';
import { SubheaderMenuStyle } from './index.style';
import {
  buildBorderProps,
  buildConvertBlockMenuItems,
  calculateOffsetPercentage,
  getDownstreamBlockUuids,
  getMessagesWithType,
  getUpstreamBlockUuids,
  hasErrorOrOutput,
} from '@components/CodeBlock/utils';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getMessagesWithAndWithoutErrors } from '@utils/models/kernel/utils';
import { isDynamic, isDynamicChild, reduceOutput, useDynamicUpstreamBlocks } from '@utils/models/block';

function CodeBlockOutput({
  block,
  blockIndex,
  blockOutputRef,
  blocks,
  collapsed,
  errorMessages,
  executionState,
  headerRef,
  isHidden,
  mainContainerWidth,
  menuGroups,
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
  tabs,
  theme,
}: CodeBlockOutputProps) {
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    setTimeout(() => setHeaderHeight(headerRef?.current?.getBoundingClientRect()?.height), 1);
  }, [subheaderVisible]);

  useEffect(() => {
    if (tabs?.length && !selectedOutputTabs) {
      const tab = tabs[0];
      setSelectedOutputTabs?.({
        [tab?.uuid]: tab,
      });
    }
  }, []);

  const color = getColorsForBlockType(block?.type, {
    blockColor: block?.color,
    theme,
  });

  const messagesWithType = useMemo(() => getMessagesWithType(messages, errorMessages), [
    errorMessages,
    messages,
  ]);

  const {
    errors,
    errorsCleaned,
    info,
    infoCleaned,
    withError,
    withoutError,
  } = getMessagesWithAndWithoutErrors(messagesWithType, errorMessages);

  const {
    hasError,
    hasOutput: hasOutputInit,
  } = hasErrorOrOutput(messagesWithType);
  const hasOutput = useMemo(() => hasOutputInit || messages?.length >= 1, [
    hasOutputInit,
    messages,
  ]);

  const isInProgress = !!runningBlocks?.find(({
    uuid,
  }) => uuid === block?.uuid) || messages?.length >= 1 && ExecutionStateEnum.IDLE !== executionState;

  const {
    reduceOutputUpstreamBlock,
  } = useDynamicUpstreamBlocks([block], blocks)[0];

  const {
    borderColorShareProps,
    tags,
  } = useMemo(() => buildBorderProps({
    block,
    dynamic: isDynamic(block),
    dynamicUpstreamBlock: isDynamicChild(block),
    hasError,
    reduceOutput: reduceOutput(block),
    reduceOutputUpstreamBlock,
    selected,
  }), [
    block,
    hasError,
    selected,
  ]);

  const menuMemo = useMemo(() => menuGroups?.length >= 1 && (
    <FlexContainer
      alignItems="center"
      justifyContent="space-between"
    >
      {tabs?.length >= 1
        ? (
          <ButtonTabs
            multiSelection
            onClickTab={(tab: TabType) => {
              setSelectedOutputTabs?.(prev => {
                const data = { ...(prev || {}) };

                if (data && tab?.uuid in data) {
                  delete data[tab?.uuid];
                } else {
                  data[tab?.uuid] = tab;
                }

                console.log(data)

                return data;
              });
            }}
            selectedTabUUIDs={selectedOutputTabs}
            tabs={tabs}
            underlineColor={color?.accent}
            underlineStyle
          />
        )
        : <div />
      }

      {tabs?.length >= 1
        ? <FileEditorHeader defaultTextContent menuGroups={menuGroups} rightOffset={0} />
        : (
          <SubheaderMenuStyle>
            <FileEditorHeader defaultTextContent menuGroups={menuGroups} rightOffset={0} />
          </SubheaderMenuStyle>
        )
      }
    </FlexContainer>
  ), [
    color,
    menuGroups,
    selectedOutputTabs,
    setSelectedOutputTabs,
    tabs,
  ]);

  const {
    tableContent,
    testMessages,
    textContent,
  } = useCodeOutput({
    ...borderColorShareProps,
    alwaysShowExtraInfo: true,
    block,
    blockIndex,
    collapsed,
    hasOutput,
    isInProgress,
    mainContainerWidth,
    messages: messagesWithType,
    messagesAll: messages,
    openSidekickView: openSidekickView,
    outputRowNormalPadding: true,
    pipeline,
    runCount,
    runEndTime,
    runStartTime,
    scrollTogether,
    selected: selected && (!isHidden || !sideBySideEnabled),
    setErrors,
    setOutputBlocks,
    setSelectedOutputBlock,
    showBorderTop: sideBySideEnabled,
    sideBySideEnabled,
  });

  console.log('textContent', textContent)
  console.log('testMessages', testMessages)
  console.log('tableContent', tableContent)

  return (
    <>
      {hasOutput && (
        <SubheaderMenuStyle
          {...borderColorShareProps}
          top={headerHeight}
        >
          <Divider light />

          {menuMemo}
        </SubheaderMenuStyle>
      )}

      {selectedOutputTabs && OutputTabEnum.OUTPUT in selectedOutputTabs && tableContent}
      {selectedOutputTabs && OutputTabEnum.LOGS in selectedOutputTabs && textContent}
    </>
  );
}

export default CodeBlockOutput;
