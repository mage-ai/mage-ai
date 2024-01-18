import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Ansi from 'ansi-to-react';
import InnerHTML from 'dangerously-set-html-content';
import { useMutation } from 'react-query';

import AuthToken from '@api/utils/AuthToken';
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
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType, {
  DataTypeEnum,
  DATA_TYPE_TEXTLIKE,
} from '@interfaces/KernelOutputType';
import MultiOutput from './MultiOutput';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import ProgressBar from '@oracle/components/ProgressBar';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { BorderColorShareProps } from '../index.style';
import { Check, ChevronDown, ChevronUp, Expand, Save } from '@oracle/icons';
import {
  ContainerStyle,
  ExtraInfoBorderStyle,
  ExtraInfoContentStyle,
  ExtraInfoStyle,
  HTMLOutputStyle,
  OutputRowStyle,
} from './index.style';
import { CUSTOM_EVENT_BLOCK_OUTPUT_CHANGED } from '@components/PipelineDetail/constants';
import { FileExtensionEnum } from '@interfaces/FileType';
import {
  INTERNAL_OUTPUT_REGEX,
  INTERNAL_OUTPUT_STRING,
  INTERNAL_TEST_REGEX,
  INTERNAL_TEST_STRING,
} from '@utils/models/output';
import { OutputDisplayTypeEnum } from './constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ResponseTypeEnum } from '@api/constants';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { SIDE_BY_SIDE_VERTICAL_PADDING } from '../index.style';
import {
  TAB_DBT_LINEAGE_UUID,
  TAB_DBT_LOGS_UUID,
  TAB_DBT_PREVIEW_UUID,
  TAB_DBT_SQL_UUID,
} from '../constants';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { addDataOutputBlockUUID, openSaveFileDialog } from '@components/PipelineDetail/utils';
import { isJsonString } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { isObject } from '@utils/hash';
import { range } from '@utils/array';

type CodeOutputProps = {
  alwaysShowExtraInfo?: boolean;
  block: BlockType;
  blockIndex?: number;
  blockMetadata?: {
    dbt: {
      lineage: BlockType[];
      sql: string;
    };
  };
  buttonTabs?: any;
  children?: any;
  childrenBelowTabs?: any;
  collapsed?: boolean;
  contained?: boolean;
  hasOutput?: boolean;
  hideExtraInfo?: boolean;
  hideOutput?: boolean;
  isInProgress: boolean;
  mainContainerWidth?: number;
  messages: KernelOutputType[];
  messagesAll?: KernelOutputType[];
  onClickSelectBlock?: () => void;
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean) => void;
  outputDisplayType?: OutputDisplayTypeEnum;
  outputRowNormalPadding?: boolean;
  pipeline?: PipelineType;
  runCount?: number;
  runEndTime?: number;
  runStartTime?: number;
  scrollTogether?: boolean;
  selectedTab?: TabType;
  setCollapsed?: (boolean) => void;
  setErrors?: (errors: ErrorsType) => void;
  setOutputBlocks?: (func: (prevOutputBlocks: BlockType[]) => BlockType[]) => void;
  setSelectedOutputBlock?: (block: BlockType) => void;
  setSelectedTab?: (tab: TabType) => void;
  showBorderTop?: boolean;
  sideBySideEnabled?: boolean;
  sparkEnabled?: boolean;
} & BorderColorShareProps;

const SHARED_TOOLTIP_PROPS = {
  appearAbove: true,
  appearBefore: true,
  block: true,
  size: null,
  widthFitContent: true,
};

const SHARED_BUTTON_PROPS = {
  basic: true,
  iconOnly: true,
  noPadding: true,
  transparent: true,
};

function CodeOutput({
  alwaysShowExtraInfo,
  block,
  blockIndex,
  blockMetadata,
  buttonTabs,
  children,
  childrenBelowTabs,
  collapsed,
  contained = true,
  dynamicBlock,
  dynamicChildBlock,
  hasError,
  hasOutput,
  hideExtraInfo,
  hideOutput,
  isInProgress,
  mainContainerWidth,
  messages,
  messagesAll,
  onClickSelectBlock,
  openSidekickView,
  outputDisplayType,
  outputRowNormalPadding,
  pipeline,
  runCount,
  runEndTime,
  runStartTime,
  scrollTogether,
  selected,
  selectedTab,
  setCollapsed,
  setErrors,
  setOutputBlocks,
  setSelectedOutputBlock,
  setSelectedTab,
  showBorderTop,
  sideBySideEnabled,
  sparkEnabled,
}: CodeOutputProps, ref) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dispatchEventChanged = useCallback(() => {
    const evt = new CustomEvent(CUSTOM_EVENT_BLOCK_OUTPUT_CHANGED, {
      detail: {
        blockIndex,
      },
    });

    window.dispatchEvent(evt);
  }, [
    blockIndex,
  ]);

  useEffect(() => {
    if (mounted && sideBySideEnabled) {
      dispatchEventChanged();
    }
  }, [
    messagesAll,
    mounted,
    scrollTogether,
    sideBySideEnabled,
  ]);

  const {
    color: blockColor,
    status,
    type: blockType,
    uuid: blockUUID,
  } = block || {};
  const borderColorShareProps = useMemo(() => ({
    blockColor,
    blockType,
    dynamicBlock,
    dynamicChildBlock,
    hasError,
    selected,
  }), [
    blockColor,
    blockType,
    dynamicBlock,
    dynamicChildBlock,
    hasError,
    selected,
  ]);
  const numberOfMessages = useMemo(() => messages?.length || 0, [messages]);
  const executedAndIdle = StatusTypeEnum.EXECUTED === status
    || (!isInProgress && runCount === 0 && numberOfMessages >= 1)
    || (!isInProgress && runCount >= 1 && runEndTime >= runStartTime);

  const [dataFrameShape, setDataFrameShape] = useState<number[]>();
  const [progress, setProgress] = useState<number>();
  const [blockOutputDownloadProgress, setBlockOutputDownloadProgress] = useState<string>(null);

  const token = useMemo(() => new AuthToken()?.decodedToken?.token, []);
  const [
    downloadBlockOutputAsCsvFile,
    { isLoading: isLoadingDownloadBlockOutputAsCsvFile },
  ]: any = useMutation(
    () => api.block_outputs.pipelines.downloads.detailAsync(
      pipeline?.uuid,
      blockUUID,
      { token },
      {
        onDownloadProgress: (p) => setBlockOutputDownloadProgress((Number(p?.loaded || 0) / 1000000).toFixed(3)),
        responseType: ResponseTypeEnum.BLOB,
      },
    ),
    {
      onSuccess: (response: any) => onSuccess(
          response, {
            callback: (blobResponse) => {
              openSaveFileDialog(blobResponse, `${blockUUID}.${FileExtensionEnum.CSV}`);
            },
            onErrorCallback: (response, errors) => setErrors?.({
              errors,
              response,
            }),
          },
        ),
    },
  );

  useEffect(() => {
    if (!isInProgress) {
      setProgress(100);
    }
  }, [isInProgress]);

  const combineTextData = (data) => (Array.isArray(data) ? data.join('\n') : data);

  const combinedMessages = useMemo(() => messages?.length >= 1
    ? messages.reduce((arr, curr) => {
      const last = arr.at(-1);

      if (DATA_TYPE_TEXTLIKE.includes(last?.type)
        && last?.type === curr.type
        && !isObject(combineTextData(curr?.data))
        && !combineTextData(curr?.data)?.match(INTERNAL_OUTPUT_REGEX)
      ) {
        if (Array.isArray(last.data)) {
          last.data.concat(curr.data);
        } else if (typeof last.data === 'string') {
          const currentText = combineTextData(curr.data) || '';
          last.data = [last.data, currentText].join('\n');
        }
      } else if (DATA_TYPE_TEXTLIKE.includes(curr?.type)
        && !isObject(combineTextData(curr?.data))
        && !combineTextData(curr?.data)?.match(INTERNAL_OUTPUT_REGEX)
      ) {
        arr.push({
          ...curr,
          data: combineTextData(curr.data),
        });
      } else {
        arr.push({ ...curr });
      }

      return arr;
    }, [])
    : messagesAll || []
  , [
    messages,
    messagesAll,
  ]);

  const renderMessagesRaw = useMemo(() => !messages?.length && messagesAll?.length >= 1, [
    messages,
    messagesAll,
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
    if (isDBT && !hasErrorPrev && hasError && setSelectedTab) {
      setSelectedTab?.(TAB_DBT_LOGS_UUID);
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
    const createDataTableElement = (output, {
      borderTop,
      selected: selectedProp,
    }, dataInit: {
      multi_output?: boolean;
    } = {}) => {
      const {
        columns,
        index,
        rows,
        shape,
      } = output;

      if (dataInit && isObject(dataInit) && !!dataInit?.multi_output) {
        return (
          <MultiOutput
            outputs={rows?.map((row, idx: number) => ({
              render: () => {
                if (!row) {
                  return <div />;
                }

                const {
                  data,
                  type,
                } = row;
                if (DataTypeEnum.TABLE === type) {
                  return createDataTableElement(data, {
                    borderTop,
                    selected: selectedProp,
                  });
                }

                return data;
              },
              uuid: columns?.[idx],
            }))}
          />
        );
      }


      if (shape) {
        setDataFrameShape(shape);
      }

      const columnHeadersContainEmptyString = columns?.some(header => header === '');
      if (columnHeadersContainEmptyString) {
        return (
          <Spacing mx={5} my={3}>
            <Text monospace warning>
              Block output table could not be rendered due to empty string headers.
              Please check your data’s column headers for empty strings.
            </Text>
          </Spacing>
        );
      }

      return rows?.length >= 1 && (
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

    combinedMessages?.forEach((output: KernelOutputType, idx: number) => {
      let dataInit;
      let dataType;
      const outputIsArray = Array.isArray(output);

      if (renderMessagesRaw && outputIsArray) {
        dataInit = {
          columns: ['-'],
          index: 0,
          rows: output?.map(i => [isJsonString(i) ? JSON.parse(i) : i]),
          shape: [output?.length, 1],
        };
        dataType = DataTypeEnum.TABLE;
      } else if (typeof output === 'string') {
        dataInit = output;
        dataType = DataTypeEnum.TEXT_PLAIN;
      } else {
        dataInit = output?.data;
        dataType = output?.type;
      }

      if (!outputIsArray && (!dataInit || dataInit?.length === 0)) {
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
        if (dataType === DataTypeEnum.TEXT_HTML) {
          dataArray.push(data);
        } else if (data && typeof data === 'string') {
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
          normalPadding: outputRowNormalPadding, sideBySideEnabled,
        };

        const borderTop = idx >= 1;

        if (typeof data === 'string' && data?.match(INTERNAL_TEST_REGEX)) {
          const parts = data.split('\n');
          const partsNonTest = [];
          parts.forEach((part: string) => {
            if (part?.match(INTERNAL_TEST_REGEX)) {
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
        } else if (typeof data === 'string' && data?.match(INTERNAL_OUTPUT_REGEX)) {
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
            const data = JSON.parse(rawString);

            if (data?.[0] && isObject(data?.[0]) && DataTypeEnum.TEXT === data?.[0]?.type) {
              if (Array.isArray(data?.[0]?.text_data)) {
                isTable = true;
                const rows = data?.map(d => d?.text_data);
                const columns = range(Math.max(...rows?.map(row => row?.length)))?.map((_, idx) => `col${idx}`);
                const shape = [rows?.length, columns?.length];
                const index = rows?.map((_, idx) => idx);
                const tableEl = createDataTableElement({
                  rows,
                  columns,
                  shape,
                  index,
                }, {
                  borderTop,
                  selected,
                }, data);
                tableContent.push(tableEl);
                displayElement = tableEl;
              } else {
                const textArr = data?.map(d => d?.text_data);
                displayElement = (
                  <OutputRowStyle {...outputRowSharedProps}>
                    {textArr.map((t) => (
                      <Text key={t} monospace preWrap>
                        {t?.length >= 1 && typeof t === 'string' && (
                          <Ansi>
                            {t}
                          </Ansi>
                        )}
                        {!t?.length && (
                          <>&nbsp;</>
                        )}
                      </Text>
                    ))}
                  </OutputRowStyle>
                );
              }
            } else {
              const {
                data: dataDisplay,
                type: typeDisplay,
              } = data;

              if (DataTypeEnum.TABLE === typeDisplay) {
                if (dataDisplay) {
                  isTable = true;
                  const tableEl = createDataTableElement(dataDisplay, {
                    borderTop,
                    selected,
                  }, data);
                  tableContent.push(tableEl);

                  if (!isDBT) {
                    displayElement = tableEl;
                  }
                }
              }
            }
          }
        } else if (dataType === DataTypeEnum.TABLE) {
          const dataDisplay = isJsonString(data) ? JSON.parse(data) : data;
          if (dataDisplay) {
            isTable = true;
            const tableEl = createDataTableElement(dataDisplay, {
              borderTop,
              selected,
            }, output);
            tableContent.push(tableEl);

            if (!isDBT) {
              displayElement = tableEl;
            }
          }
        } else if (DATA_TYPE_TEXTLIKE.includes(dataType)) {
          if (isObject(data)) {
            if (output?.multi_output && DataTypeEnum.TEXT === output?.type) {
              const {
                // @ts-ignore
                columns,
                // @ts-ignore
                rows,
              } = data;

              displayElement = (
                <MultiOutput
                  outputs={rows?.map(({
                    data: value,
                    type: typeInner,
                  }, idx: number) => ({
                    render: () => {
                      if (DATA_TYPE_TEXTLIKE.includes(typeInner)) {
                        const textArr = value?.split('\\n');
                        return (
                          <OutputRowStyle
                            contained
                            first
                            last
                            normalPadding
                          >
                            {textArr.map((t) => (
                              <Text key={t} monospace preWrap>
                                {t?.length >= 1 && typeof t === 'string' && (
                                  <Ansi>
                                    {t}
                                  </Ansi>
                                )}
                                {!t?.length && (
                                  <>&nbsp;</>
                                )}
                              </Text>
                            ))}
                          </OutputRowStyle>
                        );
                      } else if (DataTypeEnum.TABLE === typeInner && isObject(value)) {
                        return createDataTableElement(value, {
                          borderTop,
                          selected,
                        });
                      }
                    },
                    uuid: columns?.[idx],
                  }))}
                />
              );
              // @ts-ignore
            } else if (data?.data) {
              // @ts-ignore
              const textArr = data?.data?.split('\\n');

              displayElement = (
                <OutputRowStyle {...outputRowSharedProps}>
                  {textArr.map((t) => (
                    <Text key={t} monospace preWrap>
                      {t?.length >= 1 && typeof t === 'string' && (
                        <Ansi>
                          {t}
                        </Ansi>
                      )}
                      {!t?.length && (
                        <>&nbsp;</>
                      )}
                    </Text>
                  ))}
                </OutputRowStyle>
              );
            }
          } else {
            const textArr = data?.split('\\n');

            displayElement = (
              <OutputRowStyle {...outputRowSharedProps}>
                {textArr.map((t) => (
                  <Text key={t} monospace preWrap>
                    {t?.length >= 1 && typeof t === 'string' && (
                      <Ansi>
                        {t}
                      </Ansi>
                    )}
                    {!t?.length && (
                      <>&nbsp;</>
                    )}
                  </Text>
                ))}
              </OutputRowStyle>
            );
          }
        } else if (dataType === DataTypeEnum.TEXT_HTML) {
          if (data) {
            displayElement = (
              <OutputRowStyle {...outputRowSharedProps}>
                <HTMLOutputStyle monospace>
                  <InnerHTML html={data} />
                </HTMLOutputStyle>
              </OutputRowStyle>
            );
          }
        } else if (dataType === DataTypeEnum.IMAGE_PNG && data?.length >= 1) {
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

    if (isInProgress && pipeline?.type === PipelineTypeEnum.PYSPARK && !sparkEnabled) {
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
    outputRowNormalPadding,
    pipeline,
    progressBar,
    renderMessagesRaw,
    selected,
    sparkEnabled,
  ]);

  const columnCount = dataFrameShape?.[1] || 0;
  const columnsPreviewMessage = columnCount > 30
    ? ` (30 out of ${columnCount} columns displayed)`
    : '';

  const currentContentToDisplay = useMemo(() => {
    let el;

    if ((isDBT && selectedTab) || outputDisplayType) {
      const tabUUID = selectedTab?.uuid;

      if (TAB_DBT_PREVIEW_UUID.uuid === tabUUID || OutputDisplayTypeEnum.DATA === outputDisplayType) {
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
      } else if (TAB_DBT_LOGS_UUID.uuid === tabUUID || OutputDisplayTypeEnum.LOGS === outputDisplayType) {
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
              padding={UNIT * 2}
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
            // @ts-ignore
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

        {childrenBelowTabs}

        {!hideOutput && el}
      </>
    );
  }, [
    blockMetadata,
    buttonTabs,
    childrenBelowTabs,
    content,
    hasError,
    hideOutput,
    isDBT,
    isInProgress,
    outputDisplayType,
    pipeline,
    selected,
    selectedTab,
    sideBySideEnabled,
    tableContent,
  ]);

  if (!buttonTabs
    && !hasError
    && !hasOutput
    && !renderMessagesRaw
    && !children
    && !alwaysShowExtraInfo
  ) {
    return null;
  }

  return (
    <div
      ref={ref}
    >
      <div
        onClick={onClickSelectBlock
          ? () => onClickSelectBlock?.()
          : null
        }
        style={{
          paddingTop: sideBySideEnabled ? SIDE_BY_SIDE_VERTICAL_PADDING : 0,
        }}
      >
        {contained && (
          <ContainerStyle
            {...borderColorShareProps}
            addBottomPadding={isInProgress && pipeline?.type === PipelineTypeEnum.PYSPARK}
            blockType={blockType}
            dynamicBlock={dynamicBlock}
            dynamicChildBlock={dynamicChildBlock}
            executedAndIdle={executedAndIdle}
            hasError={hasError}
            selected={selected}
            showBorderTop={showBorderTop}
          >
            {children}

            {!collapsed && testContent?.length >= 1 && (
              <>
                <Spacing py={2}>
                  <OutputRowStyle contained normalPadding={sideBySideEnabled}>
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

                <Spacing mb={(sideBySideEnabled || hasError) ? 2 : 0}>
                  <Divider medium />
                </Spacing>
              </>
            )}
            {!collapsed && currentContentToDisplay}
          </ContainerStyle>
        )}

        {!contained && (
          <>
            {children}
            {currentContentToDisplay}
          </>
        )}

        {(alwaysShowExtraInfo || (executedAndIdle && !hideExtraInfo)) && (
          <ExtraInfoStyle
            {...borderColorShareProps}
            blockType={blockType}
            dynamicBlock={dynamicBlock}
            dynamicChildBlock={dynamicChildBlock}
            hasError={hasError}
            selected={selected}
          >
            <ExtraInfoBorderStyle />

            <FlexContainer justifyContent="space-between">
              <Flex alignItems="center" px={1}>
                {setCollapsed && (
                  <Button
                    {...SHARED_BUTTON_PROPS}
                    onClick={() => setCollapsed(!collapsed)}
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
                )}

                {!setCollapsed && (
                  <FlexContainer alignItems="center">
                    {dataFrameShape && (
                      <Spacing pl={1}>
                        <Text>
                          {`${dataFrameShape[0]} rows x ${dataFrameShape[1]} columns${columnsPreviewMessage}`}
                        </Text>
                      </Spacing>
                    )}
                  </FlexContainer>
                )}
              </Flex>

              <ExtraInfoContentStyle>
                <FlexContainer
                  alignItems="center"
                  fullWidth
                  justifyContent="flex-end"
                >
                  <Tooltip
                    {...SHARED_TOOLTIP_PROPS}
                    label={runCount >= 1 && runStartTime
                      ? `Last run at ${new Date(runStartTime.valueOf()).toLocaleString()}`
                      : (
                        hasError
                          ? 'Block executed with errors'
                          : 'Block executed successfully'
                      )
                    }
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
                    <Spacing pl={2}>
                      <FlexContainer alignItems="center">
                        <Tooltip
                          {...SHARED_TOOLTIP_PROPS}
                          label="Expand table"
                        >
                          <Button
                            {...SHARED_BUTTON_PROPS}
                            onClick={() => {
                              addDataOutputBlockUUID(pipeline?.uuid, blockUUID);
                              openSidekickView?.(ViewKeyEnum.DATA);
                              setOutputBlocks?.((prevOutputBlocks: BlockType[]) => {
                                if (!prevOutputBlocks.find(({ uuid }) => uuid === blockUUID)) {
                                  setSelectedOutputBlock?.(block);
                                  return prevOutputBlocks.concat(block);
                                } else {
                                  return prevOutputBlocks;
                                }
                              });
                            }}
                          >
                            <Expand muted size={UNIT * 1.75} />
                          </Button>
                        </Tooltip>

                        <Spacing pl={2} />

                        <Tooltip
                          {...SHARED_TOOLTIP_PROPS}
                          forceVisible={isLoadingDownloadBlockOutputAsCsvFile}
                          label={isLoadingDownloadBlockOutputAsCsvFile
                            ? `${blockOutputDownloadProgress || 0}mb downloaded...`
                            : 'Save output as CSV file'
                          }
                        >
                          <Button
                            {...SHARED_BUTTON_PROPS}
                            compact
                            loading={isLoadingDownloadBlockOutputAsCsvFile}
                            onClick={() => {
                              setBlockOutputDownloadProgress(null);
                              downloadBlockOutputAsCsvFile();
                            }}
                          >
                            <Save muted size={UNIT * 1.75} />
                          </Button>
                        </Tooltip>
                      </FlexContainer>
                    </Spacing>
                  }
                </FlexContainer>
              </ExtraInfoContentStyle>
            </FlexContainer>
          </ExtraInfoStyle>
        )}
      </div>
    </div>
  );
}

export default React.forwardRef(CodeOutput);
