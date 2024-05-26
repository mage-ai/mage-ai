import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Ansi from 'ansi-to-react';
import InnerHTML from 'dangerously-set-html-content';
import { ThemeContext } from 'styled-components';
import { useMutation } from 'react-query';

import AuthToken from '@api/utils/AuthToken';
import BlockType, {
  BLOCK_TYPES_NO_DATA_TABLE,
  BlockTypeEnum,
  OutputType,
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
import KernelOutputType, { DataTypeEnum, DATA_TYPE_TEXTLIKE } from '@interfaces/KernelOutputType';
import MultiOutput from './MultiOutput';
import OutputRenderer from './OutputRenderer';
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
  OutputRowProps,
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
import { SIDE_BY_SIDE_VERTICAL_PADDING, getColorsForBlockType } from '../index.style';
import {
  TAB_DBT_LINEAGE_UUID,
  TAB_DBT_LOGS_UUID,
  TAB_DBT_PREVIEW_UUID,
  TAB_DBT_SQL_UUID,
} from '../constants';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import {
  addDataOutputBlockUUID,
  openSaveFileDialog,
  prepareOutput,
} from '@components/PipelineDetail/utils';
import {
  getNewUUID,
  containsOnlySpecialCharacters,
  containsHTML,
  isJsonString,
} from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { ignoreKeys, isObject } from '@utils/hash';
import { range } from '@utils/array';
import TextOutput from './TextOutput';
import ImageOutput from './ImageOutput';
import HTMLOutput from './HTMLOutput';

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

function CodeOutput(
  {
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
  }: CodeOutputProps,
  ref,
) {
  const themeContext = useContext(ThemeContext);
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
  }, [blockIndex]);

  useEffect(() => {
    if (mounted && sideBySideEnabled) {
      dispatchEventChanged();
    }
  }, [messagesAll, mounted, scrollTogether, sideBySideEnabled, dispatchEventChanged]);

  const { color: blockColor, status, type: blockType, uuid: blockUUID } = block || {};
  const borderColorShareProps = useMemo(
    () => ({
      blockColor,
      blockType,
      dynamicBlock,
      dynamicChildBlock,
      hasError,
      selected,
    }),
    [blockColor, blockType, dynamicBlock, dynamicChildBlock, hasError, selected],
  );
  const blockTypeColor = useMemo(
    () =>
      getColorsForBlockType(blockType, {
        blockColor,
        theme: themeContext,
      }),
    [blockColor, blockType, themeContext],
  );
  const numberOfMessages = useMemo(() => messages?.length || 0, [messages]);
  const executedAndIdle =
    StatusTypeEnum.EXECUTED === status ||
    (!isInProgress && runCount === 0 && numberOfMessages >= 1) ||
    (!isInProgress && runCount >= 1 && runEndTime >= runStartTime);

  const [dataFrameShape, setDataFrameShape] = useState<number[]>();
  const [dataFrameShapes, setDataFrameShapes] = useState<{
    [key: string]: number[];
  }>({});
  const multipleDataFrames = useMemo(
    () => Object.keys(dataFrameShapes).length >= 2,
    [dataFrameShapes],
  );
  const [selectedOutputTab, setSelectedOutputTab] = useState<TabType>(null);

  const dataFrameShapeDisplay = useMemo(() => {
    if (!multipleDataFrames) {
      return dataFrameShape;
    }

    if (Object.values(dataFrameShapes)?.length >= 1) {
      if (selectedOutputTab) {
        return dataFrameShapes?.[String(selectedOutputTab?.index)];
      } else {
        return dataFrameShapes?.[0];
      }
    }
  }, [multipleDataFrames, selectedOutputTab, dataFrameShape, dataFrameShapes]);

  const [progress, setProgress] = useState<number>();
  const [blockOutputDownloadProgress, setBlockOutputDownloadProgress] = useState<string>(null);

  const token = useMemo(() => new AuthToken()?.decodedToken?.token, []);
  const [downloadBlockOutputAsCsvFile, { isLoading: isLoadingDownloadBlockOutputAsCsvFile }]: any =
    useMutation(
      () =>
        api.block_outputs.pipelines.downloads.detailAsync(
          pipeline?.uuid,
          blockUUID,
          { token },
          {
            onDownloadProgress: p =>
              setBlockOutputDownloadProgress((Number(p?.loaded || 0) / 1000000).toFixed(3)),
            responseType: ResponseTypeEnum.BLOB,
          },
        ),
      {
        onSuccess: (response: any) =>
          onSuccess(response, {
            callback: blobResponse => {
              openSaveFileDialog(blobResponse, `${blockUUID}.${FileExtensionEnum.CSV}`);
            },
            onErrorCallback: (response, errors) =>
              setErrors?.({
                errors,
                response,
              }),
          }),
      },
    );

  useEffect(() => {
    if (!isInProgress) {
      setProgress(100);
    }
  }, [isInProgress]);

  const combineTextData = data => (Array.isArray(data) ? data.join('\n') : data);

  const singleOutput = useMemo(() => block?.outputs?.length === 1, [block]);
  const combinedMessages = useMemo(() => {
    const arr = [];
    const arrRender = [];
    const variableMapping = {};

    if (messages?.length >= 1) {
      messages.map((curr, idxOutter: number) => {
        let currentData = curr?.data;
        const renderOutputMatches = [];
        const leftOverMessages = [];

        if (currentData && Array.isArray(currentData)) {
          currentData?.forEach((textData: string, idxMiddle: number) => {
            const match =
              textData &&
              typeof textData === 'string' &&
              textData?.match(/<RenderOutput>(.*?)<\/RenderOutput>/);

            if (match && match[1] && isJsonString(match[1])) {
              const outputs = [];

              const output = JSON.parse(match[1]);

              if (Array.isArray(output)) {
                outputs.push(...output);
              } else {
                outputs.push(output);
              }

              outputs?.forEach((itemInit, idxInner: number) => {
                const {
                  data,
                  priority,
                  multi_output: multiOutput,
                  sample_data: sampleData,
                  text_data: textData,
                  timestamp = 0,
                  type: outputType,
                  variable_uuid: variableUuid,
                } = itemInit;
                const item = {
                  ...itemInit,
                  priority:
                    typeof priority !== 'undefined' && priority !== null
                      ? [priority]
                      : [idxOutter, idxMiddle, idxInner],
                  indexes: [idxOutter, idxMiddle, idxInner],
                };

                // WARNING: server must return unique variable UUIDs or they won’t show up here.
                const existingItem = variableMapping?.[variableUuid];
                if (!existingItem || (timestamp || 0) > (existingItem?.timestamp || 0)) {
                  variableMapping[variableUuid] = item;
                }

                if (
                  isObject(item) &&
                  outputType &&
                  (variableUuid || data || sampleData || textData)
                ) {
                  if (multiOutput || DataTypeEnum.GROUP === outputType) {
                    renderOutputMatches.push(item);
                  } else {
                    renderOutputMatches.push({
                      ...item,
                      multi_output: true,
                    });
                  }
                } else if (isObject(item)) {
                  renderOutputMatches.push({
                    ...item,
                    multi_output: true,
                  });
                } else {
                  renderOutputMatches.push({
                    ...item,
                    multi_output: true,
                    sample_data: {
                      columns: ['value'],
                      rows: [[item]],
                    },
                    shape: [1, 1],
                    type: DataTypeEnum.TABLE,
                    variable_uuid: `output_${idxInner}`,
                  });
                }
              });
            } else {
              leftOverMessages.push(textData);
            }
          });

          currentData = leftOverMessages;
          arrRender.push(...renderOutputMatches);
        }

        const last = arr.at(-1);

        if (
          DATA_TYPE_TEXTLIKE.includes(last?.type) &&
          last?.type === curr.type &&
          !isObject(combineTextData(currentData)) &&
          !combineTextData(currentData)?.match(INTERNAL_OUTPUT_REGEX) &&
          combineTextData(currentData)
        ) {
          if (Array.isArray(last.data)) {
            last.data.concat(currentData);
          } else if (typeof last.data === 'string') {
            const currentText = combineTextData(currentData) || '';
            last.data = [last.data, currentText].join('\n');
          }
        } else if (
          DATA_TYPE_TEXTLIKE.includes(curr?.type) &&
          !isObject(combineTextData(currentData)) &&
          !combineTextData(currentData)?.match(INTERNAL_OUTPUT_REGEX)
        ) {
          arr.push({
            ...curr,
            data: combineTextData(currentData),
          });
        } else {
          arr.push({ ...curr });
        }
      });
    } else {
      arr.push(...(messagesAll || []));
    }

    const combined = arr
      .concat(arrRender)
      .filter(output => {
        const { variable_uuid: variableUuid, indexes } = output;

        const existingItem = variableMapping?.[variableUuid];
        return !existingItem || indexes === existingItem?.indexes;
      })
      .sort((a, b) => {
        const aPriority = a?.priority;
        const bPriority = b?.priority;

        if (aPriority && bPriority) {
          return (
            aPriority[0] - bPriority[0] ||
            aPriority?.slice(0, 2)?.length - bPriority?.slice(0, 2)?.length ||
            aPriority[1] - bPriority[1] ||
            aPriority?.slice(0, 3)?.length - bPriority?.slice(0, 3)?.length ||
            aPriority[2] - bPriority[2]
          );
        }

        return 0;
      });
    const separateRows = [];
    const multiOutputs = [];

    // 1. combinedMessages flattens the outputs
    // 2. Grouped outputs are already grouped into a single object
    // 3. Multi-output enabled outputs need to be grouped

    combined?.forEach(output => {
      if (isObject(output) && output?.multi_output) {
        multiOutputs.push(output);
      } else {
        separateRows.push(output);
      }
    });

    if (multiOutputs?.length >= 1) {
      separateRows.unshift({
        multi_output: true,
        outputs: multiOutputs,
      });
    }

    return separateRows;
  }, [messages, messagesAll]);

  const renderMessagesRaw = useMemo(
    () => !messages?.length && messagesAll?.length >= 1,
    [messages, messagesAll],
  );

  const progressBar = useMemo(() => <ProgressBar progress={progress} />, [progress]);

  const isDBT = BlockTypeEnum.DBT === block?.type;

  const hasErrorPrev = usePrevious(hasError);
  useEffect(() => {
    if (isDBT && !hasErrorPrev && hasError && setSelectedTab) {
      setSelectedTab?.(TAB_DBT_LOGS_UUID);
    }
  }, [hasError, hasErrorPrev, isDBT, setSelectedTab]);

  function buildDisplayForHTMLOutput(
    value: string,
    outputRowSharedProps?: OutputRowProps,
  ): JSX.Element {
    return <HTMLOutput {...outputRowSharedProps} value={value} />;
  }

  function buildDisplayForTextOutput(
    value: string | { text_data: string } | { text_data: string }[],
    outputRowSharedProps?: OutputRowProps,
  ): JSX.Element {
    return <TextOutput {...outputRowSharedProps} value={value} />;
  }

  // @ts-ignore
  const { content, tableContent, testContent } = useMemo(() => {
    const createDataTableElement = (
      output: any,
      {
        borderTop,
        multiOutputInit: multiOutputInitFromData,
        selected: selectedProp,
      }: {
        borderTop?: boolean;
        multiOutputInit?: boolean;
        selected?: boolean;
      },
      dataInit: {
        multi_output?: boolean;
        uuid?: string;
      } = {},
    ) => {
      const { columns, index, rows, shape } = output;
      const multiOutputInit: boolean = !!dataInit?.multi_output;
      if (dataInit && isObject(dataInit) && multiOutputInit) {
        return (
          <MultiOutput
            color={blockTypeColor?.accent}
            onTabChange={setSelectedOutputTab}
            outputs={rows?.map((row, idxWithinGroup: number) => ({
              render: () => {
                const { data, text_data: textData, type: typeInner } = row || {};

                let el;
                if (!row) {
                  el = <div />;
                } else if (DataTypeEnum.TABLE === typeInner) {
                  el = createDataTableElement(
                    data,
                    {
                      borderTop,
                      multiOutputInit,
                      selected: selectedProp,
                    },
                    {
                      uuid: String(idxWithinGroup),
                    },
                  );
                } else if (DataTypeEnum.TEXT === typeInner) {
                  el = buildDisplayForTextOutput(textData || data, {
                    contained: true,
                    normalPadding: true,
                    first: true,
                    last: true,
                  });
                } else {
                  el = data;
                }

                return (
                  <>
                    {(DataTypeEnum.TABLE !== typeInner || !borderTop) && <Divider medium />}
                    {el}
                  </>
                );
              },
              uuid: columns?.[idxWithinGroup],
            }))}
          />
        );
      }

      if (shape) {
        setDataFrameShape(shape);
        if (dataInit?.uuid) {
          setDataFrameShapes(prev => ({
            ...prev,
            [dataInit.uuid]: shape,
          }));
        }
      }

      const columnHeadersContainEmptyString = columns?.some(header => header === '');
      if (columnHeadersContainEmptyString) {
        return (
          <Spacing mx={5} my={3}>
            <Text monospace warning>
              Block output table could not be rendered due to empty string headers. Please check
              your data’s column headers for empty strings.
            </Text>
          </Spacing>
        );
      }

      if (rows?.length >= 1) {
        if (multiOutputInitFromData && rows?.some(row => row && containsHTML(row))) {
          return (
            <Spacing pb={PADDING_UNITS} px={PADDING_UNITS}>
              <HTMLOutputStyle monospace>
                {rows?.map((row, idx) => <InnerHTML html={row} key={`html-row-${idx}`} />)}
              </HTMLOutputStyle>
            </Spacing>
          );
        }

        return (
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
            renderColumnHeaderCell={(
              { Header: columnName },
              _,
              {
                index: columnIndex,
                key: columnKey,
                props: columnProps,
                style: columnStyle,
                width: columnWidth,
              },
            ) => {
              const empty = columnName?.length === 0 || containsOnlySpecialCharacters(columnName);
              return (
                <div
                  {...columnProps}
                  className="th"
                  key={columnKey}
                  style={{
                    ...columnStyle,
                    paddingBottom: 0,
                    paddingTop: 0,
                  }}
                  title={columnIndex ? 'Row number' : undefined}
                >
                  <FlexContainer alignItems="center" fullHeight fullWidth>
                    <Text disabled monospace small>
                      {empty ? '' : columnName}
                    </Text>
                  </FlexContainer>
                </div>
              );
            }}
            rows={rows}
            // Remove border 2px and padding from each side
            width={mainContainerWidth - (2 + PADDING_UNITS * UNIT * 2 + 2 + SCROLLBAR_WIDTH)}
          />
        );
      }
    };

    let isMultiOutput = false;
    let isTable = false;

    const arrContent = [];
    const tableContent = [];
    const testMessages = [];

    combinedMessages?.forEach((output: OutputType, idx: number) => {
      const outputIsGroupedOutputs = DataTypeEnum?.GROUP === output?.type;
      const outputIsMultiOutputs = output?.multi_output && output?.outputs?.length >= 1;

      if (
        (outputIsGroupedOutputs || outputIsMultiOutputs || singleOutput) &&
        (typeof output?.data !== 'string' || !output?.data?.match(INTERNAL_TEST_REGEX))
      ) {
        arrContent.push(
          <OutputRenderer
            block={block}
            contained
            containerWidth={mainContainerWidth}
            first={idx === 0}
            index={idx}
            key={`output-${idx}`}
            last={idx === combinedMessages?.length - 1}
            normalPadding
            output={output}
            selected={selected}
            singleOutput={singleOutput}
          />,
        );

        return;
      }

      let dataInit = null;
      let dataType = null;
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

      if (!outputIsArray && (!dataInit || dataInit?.length === 0) && !outputIsGroupedOutputs) {
        return;
      }

      let dataArray1: string[] = [];
      const dataArray = [];

      if (Array.isArray(dataInit)) {
        dataArray1 = dataInit;
      } else {
        dataArray1 = [dataInit];
      }
      dataArray1 = dataArray1.filter(d => d);

      dataArray1.forEach(
        (
          data:
            | string
            | {
                columns: string[];
                rows: any[][];
                shape: number[];
              },
        ) => {
          if (dataType === DataTypeEnum.TEXT_HTML) {
            dataArray.push(data);
          } else if (data && typeof data === 'string') {
            const lines = data.split('\n');
            dataArray.push(...lines);
          } else if (typeof dataArray === 'object') {
            dataArray.push(data);
          }
        },
      );

      const dataArrayLength = dataArray.length;

      const arr = [];

      function buildDisplayElement(
        data,
        dataTypeInner,
        idxInner: number,
        outputRowProps?: OutputRowProps,
      ) {
        let displayElement;
        const outputRowSharedProps: OutputRowProps = outputRowProps || {
          contained,
          first: idx === 0 && idxInner === 0,
          last: idx === combinedMessages.length - 1 && idxInner === dataArrayLength - 1,
          normalPadding: true,
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

            // Order matters; this must go 1st in order to handle multi-output from the notebook.
            if (data?.length >= 1 && Array.isArray(data) && data?.every(d => d?.multi_output)) {
              isMultiOutput = true;

              displayElement = (
                <MultiOutput
                  color={blockTypeColor?.accent}
                  onTabChange={setSelectedOutputTab}
                  outputs={data?.map((item, idxWithinGroup: number) => ({
                    render: () => {
                      const { type: typeInner } = item;
                      const itemPrepared = prepareOutput(ignoreKeys(item, ['multi_output']));

                      return (
                        <>
                          {(DataTypeEnum.TABLE !== typeInner || idx === 0) && <Divider medium />}

                          {buildDisplayElement(
                            itemPrepared?.data,
                            itemPrepared?.type,
                            idxWithinGroup,
                            {
                              contained: true,
                              first: true,
                              last: true,
                              normalPadding: true,
                            },
                          )}
                        </>
                      );
                    },
                    uuid: `Output ${idx}`,
                  }))}
                />
              );
            } else if (data?.[0] && isObject(data?.[0]) && DataTypeEnum.TEXT === data?.[0]?.type) {
              if (Array.isArray(data?.[0]?.text_data)) {
                isTable = true;
                const rows = data?.map(d => d?.text_data);
                const columns = range(Math.max(...rows?.map(row => row?.length)))?.map(
                  (_, idx) => `col${idx}`,
                );
                const shape = [rows?.length, columns?.length];
                const index = rows?.map((_, idx) => idx);
                const tableEl = createDataTableElement(
                  {
                    rows,
                    columns,
                    shape,
                    index,
                  },
                  {
                    borderTop,
                    selected,
                  },
                  {
                    ...data,
                    uuid: String(idxInner),
                  },
                );
                tableContent.push(tableEl);
                displayElement = tableEl;
              } else {
                displayElement = buildDisplayForTextOutput(data, outputRowSharedProps);
              }
            } else {
              const { data: dataDisplay, text_data: textData, type: typeDisplay } = data;
              if (DataTypeEnum.TABLE === typeDisplay) {
                if (dataDisplay) {
                  isTable = true;
                  const tableEl = createDataTableElement(
                    dataDisplay,
                    {
                      borderTop,
                      selected,
                    },
                    {
                      ...data,
                      uuid: String(idxInner),
                    },
                  );
                  tableContent.push(tableEl);

                  if (!isDBT) {
                    displayElement = tableEl;
                  }
                }
              } else if (DataTypeEnum.IMAGE_PNG === typeDisplay && textData) {
                displayElement = (
                  <ImageOutput data={textData} height={UNIT * 60} uuid={String(idxInner)} />
                );
              }
            }
          }
        } else if (dataTypeInner === DataTypeEnum.TABLE) {
          const dataDisplay = isJsonString(data) ? JSON.parse(data) : data;
          if (dataDisplay) {
            isTable = true;
            const tableEl = createDataTableElement(
              dataDisplay,
              {
                borderTop,
                selected,
              },
              {
                ...output,
                uuid: String(idxInner),
              },
            );
            tableContent.push(tableEl);

            if (!isDBT) {
              displayElement = tableEl;
            }
          }
        } else if (
          DATA_TYPE_TEXTLIKE.includes(dataTypeInner) ||
          (DataTypeEnum.TEXT_HTML === dataTypeInner && isObject(data) && output?.multi_output)
        ) {
          if (isObject(data)) {
            if (
              output?.multi_output &&
              [DataTypeEnum.TEXT, DataTypeEnum.TEXT_HTML].includes(output?.type)
            ) {
              isMultiOutput = true;

              const {
                // @ts-ignore
                columns,
                // @ts-ignore
                rows,
              } = data;

              displayElement = (
                <MultiOutput
                  color={blockTypeColor?.accent}
                  onTabChange={setSelectedOutputTab}
                  outputs={rows?.map(
                    ({ data: value, type: typeInner }, idxWithinGroup: number) => ({
                      render: () => {
                        let el;
                        if (DATA_TYPE_TEXTLIKE.includes(typeInner)) {
                          el = buildDisplayForTextOutput(value, {
                            contained: true,
                            first: true,
                            last: true,
                            normalPadding: true,
                          });
                        } else if (isObject(value) && DataTypeEnum.TABLE === typeInner) {
                          el = createDataTableElement(
                            value,
                            {
                              borderTop,
                              selected,
                            },
                            {
                              uuid: String(idxWithinGroup),
                            },
                          );
                        } else if (DataTypeEnum.TEXT_HTML === typeInner) {
                          el = buildDisplayForHTMLOutput(value, {
                            contained: true,
                            first: true,
                            last: true,
                            normalPadding: true,
                          });
                        }

                        return (
                          <>
                            {(DataTypeEnum.TABLE !== typeInner || idx === 0) && <Divider medium />}

                            {el}
                          </>
                        );
                      },
                      uuid: columns?.[idxWithinGroup],
                    }),
                  )}
                />
              );
              // @ts-ignore
            } else if (data?.data || data?.text_data) {
              // @ts-ignore
              displayElement = buildDisplayForTextOutput(
                data?.data || data?.text_data,
                outputRowSharedProps,
              );
            }
          } else {
            displayElement = buildDisplayForTextOutput(data, outputRowSharedProps);
          }
        } else if (dataTypeInner === DataTypeEnum.TEXT_HTML) {
          if (data) {
            displayElement = buildDisplayForHTMLOutput(data, outputRowSharedProps);
          }
        } else if (dataTypeInner === DataTypeEnum.IMAGE_PNG && data?.length >= 1) {
          displayElement = (
            <div style={{ overflow: 'auto', backgroundColor: 'white', maxHeight: UNIT * 60 }}>
              <img alt={`Image ${idx} from code output`} src={`data:image/png;base64, ${data}`} />
            </div>
          );
        } else if (dataTypeInner === DataTypeEnum.PROGRESS) {
          const percent = parseInt(data);
          setProgress(percent > 90 ? 90 : percent);
        }

        return displayElement;
      }

      dataArray.forEach((data: string, idxInner: number) => {
        const displayElement = buildDisplayElement(data, dataType, idxInner);

        if (displayElement) {
          arr.push(<div key={`code-output-${idx}-${idxInner}`}>{displayElement}</div>);
        }
      });

      if (arr.length >= 1) {
        arrContent.push(arr);
      }
    });

    if (isInProgress && pipeline?.type === PipelineTypeEnum.PYSPARK && !sparkEnabled) {
      arrContent.unshift([
        <OutputRowStyle contained key="progress_bar">
          <Spacing mt={1}>{progressBar}</Spacing>
        </OutputRowStyle>,
      ]);
    }

    return {
      content: arrContent,
      tableContent,
      testContent: testMessages,
    };
  }, [
    block,
    blockTypeColor,
    combinedMessages,
    contained,
    isDBT,
    isInProgress,
    mainContainerWidth,
    pipeline,
    progressBar,
    renderMessagesRaw,
    selected,
    singleOutput,
    sparkEnabled,
  ]);

  const columnCount = dataFrameShape?.[1] || 0;
  const columnsPreviewMessage =
    columnCount > 30 ? ` (30 out of ${columnCount} columns displayed)` : '';

  const currentContentToDisplay = useMemo(() => {
    let el;

    if ((isDBT && selectedTab) || outputDisplayType) {
      const tabUUID = selectedTab?.uuid;

      if (
        TAB_DBT_PREVIEW_UUID.uuid === tabUUID ||
        OutputDisplayTypeEnum.DATA === outputDisplayType
      ) {
        if (tableContent?.length >= 1) {
          el = tableContent;
        } else if (!isInProgress) {
          el = (
            <Spacing px={2} py={1}>
              <Text muted>
                {hasError
                  ? 'Error, check logs.'
                  : 'No preview to display yet, try running the block.'}
              </Text>
            </Spacing>
          );
        }
      } else if (
        TAB_DBT_LOGS_UUID.uuid === tabUUID ||
        OutputDisplayTypeEnum.LOGS === outputDisplayType
      ) {
        if (content?.length >= 1) {
          el = content;
        } else if (!isInProgress) {
          el = (
            <Spacing px={2} py={1}>
              <Text muted>
                {hasError ? 'Error, check logs.' : 'No logs to display yet, try running the block.'}
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
    tableContent,
  ]);

  if (
    !buttonTabs &&
    !hasError &&
    !hasOutput &&
    !renderMessagesRaw &&
    !children &&
    !alwaysShowExtraInfo
  ) {
    return null;
  }

  return (
    <div ref={ref}>
      <div
        onClick={onClickSelectBlock ? () => onClickSelectBlock?.() : null}
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
                  <OutputRowStyle contained normalPadding>
                    {testContent.map(({ error, message, stacktrace }, idx) => (
                      <Spacing key={message} mt={idx >= 1 ? 3 : 0}>
                        <Text monospace preWrap>
                          <Ansi>{`${message}${error ? ' ' + error : ''}`}</Ansi>
                        </Text>

                        {stacktrace?.map((line: string) => (
                          <Text default key={line} monospace preWrap small>
                            <Ansi>{line}</Ansi>
                          </Text>
                        ))}
                      </Spacing>
                    ))}
                  </OutputRowStyle>
                </Spacing>

                <Spacing mb={sideBySideEnabled || hasError ? 2 : 0}>
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
                  <Button {...SHARED_BUTTON_PROPS} onClick={() => setCollapsed(!collapsed)}>
                    {collapsed ? (
                      <FlexContainer alignItems="center">
                        <ChevronDown muted size={UNIT * 2} />
                        &nbsp;
                        <Text default>Expand output</Text>
                      </FlexContainer>
                    ) : (
                      <FlexContainer alignItems="center">
                        <ChevronUp muted size={UNIT * 2} />
                        {dataFrameShapeDisplay && (
                          <Spacing ml={2}>
                            <Text>
                              {`${dataFrameShapeDisplay[0]} rows x ${dataFrameShapeDisplay[1]} columns${columnsPreviewMessage}`}
                            </Text>
                          </Spacing>
                        )}
                      </FlexContainer>
                    )}
                  </Button>
                )}

                {!setCollapsed && (
                  <FlexContainer alignItems="center">
                    {dataFrameShapeDisplay && (
                      <Spacing pl={1}>
                        <Text>
                          {`${dataFrameShapeDisplay[0]} rows x ${dataFrameShapeDisplay[1]} columns${columnsPreviewMessage}`}
                        </Text>
                      </Spacing>
                    )}
                  </FlexContainer>
                )}
              </Flex>

              <ExtraInfoContentStyle>
                <FlexContainer alignItems="center" fullWidth justifyContent="flex-end">
                  <Tooltip
                    {...SHARED_TOOLTIP_PROPS}
                    label={
                      runCount >= 1 && runStartTime
                        ? `Last run at ${new Date(runStartTime.valueOf()).toLocaleString()}`
                        : hasError
                          ? 'Block executed with errors'
                          : 'Block executed successfully'
                    }
                  >
                    <FlexContainer alignItems="center">
                      {runCount >= 1 && Number(runEndTime) > Number(runStartTime) && (
                        <>
                          <Text small>{(Number(runEndTime) - Number(runStartTime)) / 1000}s</Text>

                          <Spacing mr={1} />
                        </>
                      )}

                      {!hasError && <Check size={UNIT * 2} success />}
                      {hasError && (
                        <Circle danger size={UNIT * 2}>
                          <Text bold monospace small>
                            !
                          </Text>
                        </Circle>
                      )}
                    </FlexContainer>
                  </Tooltip>
                  {!hasError && !BLOCK_TYPES_NO_DATA_TABLE.includes(blockType) && (
                    <Spacing pl={2}>
                      <FlexContainer alignItems="center">
                        <Tooltip {...SHARED_TOOLTIP_PROPS} label="Expand table">
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
                          label={
                            isLoadingDownloadBlockOutputAsCsvFile
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
                  )}
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
