import { useEffect, useMemo, useRef, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import DataTable from '@components/DataTable';
import Divider from '@oracle/elements/Divider';
import FileEditorHeader from '@components/FileEditor/Header';
import FlexContainer from '@oracle/components/FlexContainer';
import MultiColumnController from '@components/MultiColumnController';
import Text from '@oracle/elements/Text';
import TextOutputDisplay from './TextOutputDisplay';
import useCodeOutput from '@components/CodeBlock/CodeOutput/useCodeOutput';
import { BORDER_WIDTH_THICK } from '@oracle/styles/units/borders';
import { CodeBlockOutputProps } from '../constants';
import { ContainerStyle } from '@components/CodeBlock/CodeOutput/index.style';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import { OutputDisplayTypeEnum } from '@components/CodeBlock/CodeOutput/constants';
import { OutputTabEnum } from '../dbt/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { SubheaderMenuStyle, WrapperStyle } from './index.style';
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
  const refLogs = useRef(null);

  useEffect(() => {
    setTimeout(() => setHeaderHeight(headerRef?.current?.getBoundingClientRect()?.height), 1);
  }, [subheaderVisible]);

  useEffect(() => {
    if (tabs?.length && !selectedOutputTabs) {
      const tab = tabs[0];
      setSelectedOutputTabs?.(() => tabs?.slice(0, 2)?.reduce((acc, tab) => ({
        ...acc,
        [tab?.uuid]: tab,
      }), {}));
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
    allContentCleaned,
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

  useEffect(() => {
    if (hasError && !(OutputTabEnum.LOGS in (selectedOutputTabs || {}))) {
      // @ts-ignore
      setSelectedOutputTabs?.(prev => ({
        ...prev,
        [OutputTabEnum.LOGS]: {
          uuid: OutputTabEnum.LOGS,
        },
      }));
    }
  }, [hasError]);

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
            allowScroll
            onClickTab={(tab: TabType) => {
              // @ts-ignore
              setSelectedOutputTabs?.(prev => {
                const data = { ...(prev || {}) };

                if (data && tab?.uuid in data) {
                  if (Object.keys(data)?.length >= 2) {
                    delete data[tab?.uuid];
                  }
                } else {
                  data[tab?.uuid] = tab;
                }

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

  const codeOutputProps = useMemo(() => ({
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
  }), [
    block,
    blockIndex,
    borderColorShareProps,
    collapsed,
    hasOutput,
    isHidden,
    isInProgress,
    mainContainerWidth,
    messages,
    messagesWithType,
    openSidekickView,
    pipeline,
    runCount,
    runEndTime,
    runStartTime,
    scrollTogether,
    selected,
    setErrors,
    setOutputBlocks,
    setSelectedOutputBlock,
    sideBySideEnabled,
    sideBySideEnabled,
  ]);

  const {
    extraInfo,
    tableContentData,
    testMessages,
    textContent,
  } = useCodeOutput(codeOutputProps);

  const {
    textContent: textContentErrors,
  } = useCodeOutput({ ...codeOutputProps, messages: withError?.length >= 1 ? withError : [] });

  const {
    textContent: textContentInfo,
  } = useCodeOutput({ ...codeOutputProps, messages: withoutError?.length >= 1 ? withoutError : [] });

  const columnsOfItems = useMemo(() => {
    const columns = [];

    if (OutputTabEnum.OUTPUT in (selectedOutputTabs || {})) {
      if (tableContentData?.length >= 1) {
        columns.push(tableContentData?.map(data => ({
          render: ({
            numberOfColumns,
            columnWidth,
            width,
          }) => (
            <DataTable
              columns={data?.columns || []}
              disableScrolling={!selected}
              index={data?.index}
              key={`data-table-${data?.index}`}
              maxHeight={textContent?.length >= 1
                ? (refLogs?.current?.getBoundingClientRect()?.height || UNIT * 60)
                : UNIT * 60
              }
              noBorderBottom
              noBorderLeft
              noBorderRight
              noBorderTop={!data?.borderTop}
              rows={data?.rows || []}
              width={columnWidth}
            />
          ),
        })));
      }
    }

    if (OutputTabEnum.LOGS in (selectedOutputTabs || {})) {
      columns.push([
        {
          render: () => (
            <div ref={refLogs} style={{ width: '100%' }}>
              {Object.keys(selectedOutputTabs || {})?.length === 1 && <Divider light />}

              <TextOutputDisplay
                allContentCleaned={allContentCleaned}
                contentAll={textContent}
                contentNoErrors={textContentInfo}
                contentWithErrors={textContentErrors}
                errorsCleaned={errorsCleaned}
                infoCleaned={infoCleaned}
              />
            </div>
          ),
        },
      ]);;
    }

    return columns;
  }, [
    selected,
    selectedOutputTabs,
    tableContentData,
    textContent,
    textContentErrors,
    textContentInfo,
  ]);

  return (
    <>
      <SubheaderMenuStyle
        {...borderColorShareProps}
        top={headerHeight}
      >
        <Divider light />

        {menuMemo}
      </SubheaderMenuStyle>

      <WrapperStyle
        borderBottom={!extraInfo}
        {...borderColorShareProps}
      >
        <MultiColumnController
          columnsOfItems={columnsOfItems}
          dividerBackgroundColor={color?.accentLight}
          dividerBackgroundColorHover={color?.accent}
          uuid={`${pipeline?.uuid}_${block?.uuid}`}
          width={mainContainerWidth - (
            (2 * PADDING_UNITS * UNIT) +
            (2 * BORDER_WIDTH_THICK) +
            SCROLLBAR_WIDTH
          )}
        />
      </WrapperStyle>

      {extraInfo}
    </>
  );
}

export default CodeBlockOutput;
