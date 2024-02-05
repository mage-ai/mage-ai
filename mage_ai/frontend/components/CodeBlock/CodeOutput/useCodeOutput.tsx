import React, { useCallback, useMemo, useRef, useState } from 'react';
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

export default function useCodeOutput({
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
}: CodeOutputProps) {
  const refDataFrameShape = useRef(null);
  const dataFrameShape = refDataFrameShape.current;

  const {
    color: blockColor,
    status,
    type: blockType,
    uuid: blockUUID,
  } = block || {};

  const [blockOutputDownloadProgress, setBlockOutputDownloadProgress] = useState<string>(null);

  const token = new AuthToken()?.decodedToken?.token;
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

  const combineTextData = useCallback((data) => (Array.isArray(data) ? data.join('\n') : data), [
  ]);

  const combinedMessages = useMemo(() => {
    return messages?.length >= 1
      ? messages.reduce((arr, curr) => {
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
      }, [])
      : messagesAll || [];
  }, [
    combineTextData,
    messages,
    messagesAll,
  ]);

  const renderMessagesRaw = useMemo(() => !messages?.length && messagesAll?.length >= 1, [
    messages,
    messagesAll,
  ]);

  const createTableData = useCallback(({
    columns,
    index,
    rows,
    shape,
  }, {
    borderTop,
    selected: selectedProp,
  }) => {
    if (shape) {
      refDataFrameShape.current = shape;
    }

    const columnHeadersContainEmptyString = columns?.some(header => header === '');

    return {
      borderTop,
      columnHeadersContainEmptyString,
      columns,
      index,
      mainContainerWidth,
      rows,
      selected: selectedProp,
      // Remove border 2px and padding from each side
      width: mainContainerWidth - (2 + (PADDING_UNITS * UNIT * 2) + 2 + SCROLLBAR_WIDTH),
    };
  }, [
    mainContainerWidth,
  ]);

  const {
    tableContentData,
    testMessages,
    textContent,
  } = useMemo(() => {
    const arrContent = [];
    const tableContentDataInner = [];
    const testMessagesInner = [];

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

        if (typeof data === 'string' && data.match(INTERNAL_TEST_REGEX)) {
          const parts = data.split('\n');
          const partsNonTest = [];
          parts.forEach((part: string) => {
            if (part.match(INTERNAL_TEST_REGEX)) {
              const parts = part.split(INTERNAL_TEST_STRING);
              const rawString = parts[parts.length - 1];
              if (isJsonString(rawString)) {
                testMessagesInner.push(JSON.parse(rawString));
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
              const tableEl = createTableData(dataDisplay, {
                borderTop,
                selected,
              });
              tableContentDataInner.push(tableEl);
            }
          }
        } else if (dataType === DataTypeEnum.TABLE) {
          const tableEl = createTableData(
            isJsonString(data) ? JSON.parse(data) : data,
            {
              borderTop,
              selected,
            },
          );
          tableContentDataInner.push(tableEl);

        } else if (DATA_TYPE_TEXTLIKE.includes(dataType)) {
          const textArr = data?.split('\\n');

          displayElement = (
            <OutputRowStyle {...outputRowSharedProps}>
              {textArr.map((t) => (
                <Text key={t} monospace preWrap>
                  {t?.length >= 1 && (
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

    return {
      tableContentData: tableContentDataInner,
      testMessages: testMessagesInner,
      textContent: arrContent,
    };
  }, [
    combinedMessages,
    createTableData,
    outputRowNormalPadding,
    renderMessagesRaw,
    sideBySideEnabled,
  ]);

  const borderColorShareProps = {
    blockColor,
    blockType,
    dynamicBlock,
    dynamicChildBlock,
    hasError,
    selected,
  };

  const columnCount = dataFrameShape?.[1] || 0;
  const columnsPreviewMessage = columnCount > 30
    ? ` (30 out of ${columnCount} columns displayed)`
    : '';

  const extraInfo = (
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
  );

  return {
    extraInfo,
    tableContentData,
    testMessages,
    textContent,
  };
}
