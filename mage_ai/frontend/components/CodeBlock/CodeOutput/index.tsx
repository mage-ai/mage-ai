import { useEffect, useMemo, useState } from 'react';
import Ansi from 'ansi-to-react';

import BlockType, {
  BLOCK_TYPES_NO_DATA_TABLE,
  BlockTypeEnum,
  StatusTypeEnum,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import CodeEditor from '@components/CodeEditor';
import DataTable from '@components/DataTable';
import DependencyGraph from '@components/DependencyGraph';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType, {
  DataTypeEnum,
  DATA_TYPE_TEXTLIKE,
} from '@interfaces/KernelOutputType';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import ProgressBar from '@oracle/components/ProgressBar';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import usePrevious from '@utils/usePrevious';
import { BorderColorShareProps } from '../index.style';
import { Check, ChevronDown, ChevronUp, Expand } from '@oracle/icons';
import {
  ContainerStyle,
  ExtraInfoBorderStyle,
  ExtraInfoContentStyle,
  ExtraInfoStyle,
  HTMLOutputStyle,
  OutputRowStyle,
} from './index.style';
import { FileExtensionEnum } from '@interfaces/FileType';
import {
  INTERNAL_OUTPUT_REGEX,
  INTERNAL_OUTPUT_STRING,
  INTERNAL_TEST_REGEX,
  INTERNAL_TEST_STRING,
} from '@utils/models/output';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import {
  TAB_DBT_LINEAGE_UUID,
  TAB_DBT_LOGS_UUID,
  TAB_DBT_PREVIEW_UUID,
  TAB_DBT_SQL_UUID,
} from '../constants';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { addDataOutputBlockUUID } from '@components/PipelineDetail/utils';
import { isJsonString } from '@utils/string';

type CodeOutputProps = {
  block: BlockType;
  blockMetadata?: {
    dbt: {
      lineage: BlockType[];
      sql: string;
    };
  };
  buttonTabs?: any;
  collapsed?: boolean;
  contained?: boolean;
  hasOutput?: boolean;
  hideExtraInfo?: boolean;
  isInProgress: boolean;
  mainContainerWidth?: number;
  messages: KernelOutputType[];
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean) => void;
  pipeline?: PipelineType;
  runCount?: number;
  runEndTime?: number;
  runStartTime?: number;
  selectedTab?: TabType;
  setCollapsed?: (boolean) => void;
  setOutputBlocks?: (func: (prevOutputBlocks: BlockType[]) => BlockType[]) => void;
  setSelectedOutputBlock?: (block: BlockType) => void;
  setSelectedTab?: (tab: TabType) => void;
} & BorderColorShareProps;

function CodeOutput({
  block,
  blockMetadata,
  buttonTabs,
  collapsed,
  contained = true,
  dynamicBlock,
  dynamicChildBlock,
  hasError,
  hasOutput,
  hideExtraInfo,
  isInProgress,
  mainContainerWidth,
  messages,
  openSidekickView,
  pipeline,
  runCount,
  runEndTime,
  runStartTime,
  selected,
  selectedTab,
  setCollapsed,
  setOutputBlocks,
  setSelectedOutputBlock,
  setSelectedTab,
}: CodeOutputProps) {
  const {
    status,
    type: blockType,
  } = block;
  const numberOfMessages = useMemo(() => messages?.length || 0, [messages]);
  const executedAndIdle = StatusTypeEnum.EXECUTED === status
    || (!isInProgress && runCount === 0 && numberOfMessages >= 1)
    || (!isInProgress && runCount >= 1 && runEndTime >= runStartTime);

  const [dataFrameShape, setDataFrameShape] = useState<number[]>();
  const [progress, setProgress] = useState<number>();

  useEffect(() => {
    if (!isInProgress) {
      setProgress(100);
    }
  }, [isInProgress]);

  const combineTextData = (data) => (Array.isArray(data) ? data.join('\n') : data);

  const combinedMessages = useMemo(() => messages.reduce((arr, curr) => {
    const last = arr.at(-1);

    if (DATA_TYPE_TEXTLIKE.includes(last?.type)
      && last?.type === curr.type
      && !combineTextData(curr?.data).match(INTERNAL_OUTPUT_REGEX)
    ) {
      if (Array.isArray(last.data)) {
        last.data.concat(curr.data);
      } else if (typeof last.data === 'string') {
        const currentText = combineTextData(curr.data) || '';
        last.data = [last.data, currentText].join('\n');
      }
    } else if (DATA_TYPE_TEXTLIKE.includes(curr?.type)
      && !combineTextData(curr?.data).match(INTERNAL_OUTPUT_REGEX)
    ) {
      arr.push({
        ...curr,
        data: combineTextData(curr.data),
      });
    } else {
      arr.push({ ...curr });
    }

    return arr;
  }, []), [
    messages,
  ]);

  const progressBar = useMemo(() => (
    <ProgressBar
      progress={progress}
    />
  ), [
    progress,
  ]);

  const isDBT = BlockTypeEnum.DBT === block?.type;

  const hasErrorPrev = usePrevious(hasError);
  useEffect(() => {
    if (isDBT && !hasErrorPrev && hasError) {
      setSelectedTab(TAB_DBT_LOGS_UUID);
    }
  }, [
    hasError,
    hasErrorPrev,
    isDBT,
    setSelectedTab,
  ]);

  const {
    content,
    tableContent,
    testContent,
  } = useMemo(() => {
    const createDataTableElement = ({
      columns,
      index,
      rows,
      shape,
    }, {
      borderTop,
      selected: selectedProp,
    }) => {
      if (shape) {
        setDataFrameShape(shape);
      }
      return rows.length >= 1 && (
        <DataTable
          columns={columns}
          disableScrolling={!selectedProp}
          index={index}
          key={`data-table-${index}`}
          maxHeight={UNIT * 60}
          noBorderBottom
          noBorderLeft
          noBorderRight
          noBorderTop={!borderTop}
          rows={rows}
          // Remove border 2px and padding from each side
          width={mainContainerWidth - (2 + (PADDING_UNITS * UNIT * 2) + 2 + SCROLLBAR_WIDTH)}
        />
      );
    };

    let isTable = false;

    const arrContent = [];
    const tableContent = [];
    const testMessages = [];

    combinedMessages?.forEach(({
      data: dataInit,
      type: dataType,
    }: KernelOutputType, idx: number) => {
      if (!dataInit || dataInit?.length === 0) {
        return;
      }

      let dataArray1: string[] = [];
      if (Array.isArray(dataInit)) {
        dataArray1 = dataInit;
      } else {
        dataArray1 = [dataInit];
      }
      dataArray1 = dataArray1.filter(d => d);

      const dataArray = [];
      dataArray1.forEach((data: string | {
        columns: string[];
        rows: any[][];
        shape: number[];
      }) => {
        if (data && typeof data === 'string') {
          const lines = data.split('\n');
          dataArray.push(...lines);
        } else if (typeof dataArray === 'object') {
          dataArray.push(data);
        }
      });

      const dataArrayLength = dataArray.length;

      const arr = [];

      dataArray.forEach((data: string, idxInner: number) => {
        let displayElement;
        const outputRowSharedProps = {
          contained,
          first: idx === 0 && idxInner === 0,
          last: idx === combinedMessages.length - 1 && idxInner === dataArrayLength - 1,
        };

        const borderTop = idx >= 1;

        if (typeof data === 'string' && data.match(INTERNAL_TEST_REGEX)) {
          const parts = data.split('\n');
          const partsNonTest = [];
          parts.forEach((part: string) => {
            if (part.match(INTERNAL_TEST_REGEX)) {
              const parts = part.split(INTERNAL_TEST_STRING);
              const rawString = parts[parts.length - 1];
              if (isJsonString(rawString)) {
                testMessages.push(JSON.parse(rawString));
              }
            } else {
              partsNonTest.push(part);
            }

            if (partsNonTest.length >= 1) {
              data = partsNonTest.join('\n');
            } else {
              data = null;
            }
          });
        }


        if (data === null) {
          return;
        } else if (typeof data === 'string' && data.match(INTERNAL_OUTPUT_REGEX)) {
          const parts = data.split(INTERNAL_OUTPUT_STRING);
          let rawString = parts[parts.length - 1];

          // Sometimes the FloatProgress is appended to the end of the table data
          // without a newline character \n
          // e.g.
          // \"type\": \"table\"}FloatProgress(value=0.0
          const parts2 = rawString.split('FloatProgress');
          if (parts.length >= 2) {
            rawString = parts2[0];
          }

          if (isJsonString(rawString)) {
            const {
              data: dataDisplay,
              type: typeDisplay,
            } = JSON.parse(rawString);

            if (DataTypeEnum.TABLE === typeDisplay) {
              isTable = true;

              const tableEl = createDataTableElement(dataDisplay, {
                borderTop,
                selected,
              });
              tableContent.push(tableEl);

              if (!isDBT) {
                displayElement = tableEl;
              }
            }
          }
        } else if (dataType === DataTypeEnum.TABLE) {

          isTable = true;
          const tableEl = createDataTableElement(
            isJsonString(data) ? JSON.parse(data) : data,
            {
              borderTop,
              selected,
            },
          );
          tableContent.push(tableEl);

          if (!isDBT) {
            displayElement = tableEl;
          }
        } else if (DATA_TYPE_TEXTLIKE.includes(dataType)) {
          const textArr = data?.split('\\n');

          displayElement = (
            <OutputRowStyle {...outputRowSharedProps}>
              {textArr.map((t) => (
                <Text key={t} monospace preWrap>
                  <Ansi>
                    {t}
                  </Ansi>
                </Text>
              ))}
            </OutputRowStyle>
          );
        } else if (dataType === DataTypeEnum.TEXT_HTML) {
          displayElement = (
            <OutputRowStyle {...outputRowSharedProps}>
              <HTMLOutputStyle>
                <Text
                  // @ts-ignore
                  dangerouslySetInnerHTML={{
                    __html: data,
                  }}
                  monospace
                />
              </HTMLOutputStyle>
            </OutputRowStyle>
          );
        } else if (dataType === DataTypeEnum.IMAGE_PNG) {
          displayElement = (
            <div style={{ backgroundColor: 'white' }}>
              <img
                alt={`Image ${idx} from code output`}
                src={`data:image/png;base64, ${data}`}
              />
            </div>
          );
        } else if (dataType === DataTypeEnum.PROGRESS) {
          const percent = parseInt(data);
          setProgress(percent > 90 ? 90 : percent);
        }

        if (displayElement) {
          arr.push(
            <div key={`code-output-${idx}-${idxInner}`}>
              {displayElement}
            </div>,
          );
        }
      });

      if (arr.length >= 1) {
        arrContent.push(arr);
      }
    });

    if (isInProgress && pipeline?.type === PipelineTypeEnum.PYSPARK) {
      arrContent.unshift([
        <OutputRowStyle
          contained
          key="progress_bar"
        >
          <Spacing mt={1}>
            {progressBar}
          </Spacing>
        </OutputRowStyle>,
      ]);
    }

    return {
      content: arrContent,
      tableContent,
      testContent: testMessages,
    };
  }, [
    combinedMessages,
    contained,
    isDBT,
    isInProgress,
    mainContainerWidth,
    pipeline,
    progressBar,
    selected,
  ]);

  const columnCount = dataFrameShape?.[1] || 0;
  const columnsPreviewMessage = columnCount > 30
    ? ` (30 out of ${columnCount} columns displayed)`
    : '';

  const currentContentToDisplay = useMemo(() => {
    let el;

    if (isDBT && selectedTab) {
      const tabUUID = selectedTab.uuid;

      if (TAB_DBT_PREVIEW_UUID.uuid === tabUUID) {
        if (tableContent?.length >= 1) {
          el = tableContent;
        } else if (!isInProgress) {
          el = (
            <Spacing px={2} py={1}>
              <Text muted>
                {hasError
                  ? 'Error, check logs.'
                  : 'No preview to display yet, try running the block.'
                }
              </Text>
            </Spacing>
          );
        }
      } else if (TAB_DBT_LOGS_UUID.uuid === tabUUID) {
        if (content?.length >= 1) {
          el = content;
        } else if (!isInProgress) {
          el = (
            <Spacing px={2} py={1}>
              <Text muted>
                {hasError
                  ? 'Error, check logs.'
                  : 'No logs to display yet, try running the block.'
                }
              </Text>
            </Spacing>
          );
        }
      } else if (TAB_DBT_SQL_UUID.uuid === tabUUID) {
        const sql = blockMetadata?.dbt?.sql;
        if (sql) {
          el = (
            <CodeEditor
              autoHeight
              language={FileExtensionEnum.SQL}
              padding
              readOnly
              value={sql}
              width="100%"
            />
          );
        } else {
          el = null;
        }
      } else if (TAB_DBT_LINEAGE_UUID.uuid === tabUUID) {
        const lineage = blockMetadata?.dbt?.lineage;
        if (lineage) {
          el = (
            <DependencyGraph
              disabled
              enablePorts={false}
              height={UNIT * 55}
              pannable={selected}
              pipeline={{
                ...pipeline,
                blocks: lineage,
              }}
              zoomable={selected}
            />
          );
        } else {
          el = null;
        }
      }
    } else {
      el = content;
    }

    return (
      <>
        {buttonTabs}
        {el}
      </>
    );
  }, [
    blockMetadata,
    buttonTabs,
    content,
    hasError,
    isDBT,
    isInProgress,
    pipeline,
    selected,
    selectedTab,
    tableContent,
  ]);

  if (!buttonTabs && !hasOutput) {
    return null;
  }

  return (
    <>
      {contained && (
        <ContainerStyle
          addBottomPadding={isInProgress && pipeline?.type === PipelineTypeEnum.PYSPARK}
          blockType={blockType}
          dynamicBlock={dynamicBlock}
          dynamicChildBlock={dynamicChildBlock}
          executedAndIdle={executedAndIdle}
          hasError={hasError}
          selected={selected}
        >
          {!collapsed && testContent?.length >= 1 && (
            <>
              <Spacing py={2}>
                <OutputRowStyle contained>
                  {testContent.map(({
                    error,
                    message,
                    stacktrace,
                  }, idx) => (
                    <Spacing key={message} mt={idx >= 1 ? 3 : 0}>
                      <Text monospace preWrap>
                        <Ansi>
                          {`${message}${error ? ' ' + error : ''}`}
                        </Ansi>
                      </Text>

                      {stacktrace?.map((line: string) => (
                        <Text default key={line} monospace preWrap small>
                          <Ansi>
                            {line}
                          </Ansi>
                        </Text>
                      ))}
                    </Spacing>
                  ))}
                </OutputRowStyle>
              </Spacing>

              <Spacing mb={hasError ? 2 : 0}>
                <Divider medium />
              </Spacing>
            </>
          )}
          {!collapsed && currentContentToDisplay}
        </ContainerStyle>
      )}

      {!contained && currentContentToDisplay}

      {executedAndIdle && !hideExtraInfo && (
        <ExtraInfoStyle
          blockType={blockType}
          dynamicBlock={dynamicBlock}
          dynamicChildBlock={dynamicChildBlock}
          hasError={hasError}
          selected={selected}
        >
          <ExtraInfoBorderStyle />

          <FlexContainer justifyContent="space-between">
            {setCollapsed && (
              <Flex alignItems="center" px={1}>
                <Button
                  basic
                  iconOnly
                  noPadding
                  onClick={() => setCollapsed(!collapsed)}
                  transparent
                >
                  {collapsed ? (
                    <FlexContainer alignItems="center">
                      <ChevronDown muted size={UNIT * 2} />&nbsp;
                      <Text default>
                        Expand output
                      </Text>
                    </FlexContainer>
                  ) : (
                    <FlexContainer alignItems="center">
                      <ChevronUp muted size={UNIT * 2} />
                      {dataFrameShape && (
                        <Spacing ml={2}>
                          <Text>
                            {`${dataFrameShape[0]} rows x ${dataFrameShape[1]} columns${columnsPreviewMessage}`}
                          </Text>
                        </Spacing>
                      )}
                    </FlexContainer>
                  )}
                </Button>
              </Flex>
            )}
            <ExtraInfoContentStyle>
              <FlexContainer
                alignItems="center"
                fullWidth
                justifyContent="flex-end"
              >
                <Tooltip
                  appearAbove
                  appearBefore
                  block
                  label={runCount >= 1 && runStartTime
                    ? `Last run at ${new Date(runStartTime.valueOf()).toLocaleString()}`
                    : (
                      hasError
                        ? 'Block executed with errors'
                        : 'Block executed successfully'
                    )
                  }
                  size={null}
                  widthFitContent
                >
                  <FlexContainer alignItems="center">
                    {runCount >= 1 && Number(runEndTime) > Number(runStartTime) && (
                      <>
                        <Text small>
                          {(Number(runEndTime) - Number(runStartTime)) / 1000}s
                        </Text>

                        <Spacing mr={1} />
                      </>
                    )}

                    {!hasError && <Check size={UNIT * 2} success />}
                    {hasError && (
                      <Circle
                        danger
                        size={UNIT * 2}
                      >
                        <Text bold monospace small>
                          !
                        </Text>
                      </Circle>
                    )}
                  </FlexContainer>
                </Tooltip>
                {!hasError && !BLOCK_TYPES_NO_DATA_TABLE.includes(blockType) &&
                  <Spacing pl={1}>
                    <Button
                      afterIcon={<Expand muted size={UNIT * 1.75} />}
                      basic
                      noPadding
                      onClick={() => {
                        addDataOutputBlockUUID(pipeline?.uuid, block.uuid);
                        openSidekickView?.(ViewKeyEnum.DATA);
                        setOutputBlocks?.((prevOutputBlocks: BlockType[]) => {
                          if (!prevOutputBlocks.find(({ uuid }) => uuid === block.uuid)) {
                            setSelectedOutputBlock?.(block);
                            return prevOutputBlocks.concat(block);
                          } else {
                            return prevOutputBlocks;
                          }
                        });
                      }}
                      transparent
                    >
                      <Text default>
                        Expand table
                      </Text>
                    </Button>
                  </Spacing>
                }
              </FlexContainer>
            </ExtraInfoContentStyle>
          </FlexContainer>
        </ExtraInfoStyle>
      )}
    </>
  );
}

export default CodeOutput;
