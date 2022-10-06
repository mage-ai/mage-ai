import { useEffect, useMemo, useState } from 'react';
import Ansi from 'ansi-to-react';

import BlockType, {
  BLOCK_TYPES_NO_DATA_TABLE,
  StatusTypeEnum,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import DataTable from '@components/DataTable';
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
import { INTERNAL_OUTPUT_REGEX } from '@utils/models/output';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { addDataOutputBlockUUID } from '@components/PipelineDetail/utils';
import { isJsonString } from '@utils/string';

type CodeOutputProps = {
  block: BlockType;
  collapsed?: boolean;
  contained?: boolean;
  hideExtraInfo?: boolean;
  isInProgress: boolean;
  mainContainerWidth?: number;
  messages: KernelOutputType[];
  openSidekickView?: (newView: ViewKeyEnum, pushHistory?: boolean) => void;
  pipeline?: PipelineType;
  runCount?: number;
  runEndTime?: number;
  runStartTime?: number;
  setCollapsed?: (boolean) => void;
  setOutputBlocks?: (func: (prevOutputBlocks: BlockType[]) => BlockType[]) => void;
  setSelectedOutputBlock?: (block: BlockType) => void;
} & BorderColorShareProps;

function CodeOutput({
  block,
  collapsed,
  contained = true,
  hasError,
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
  setCollapsed,
  setOutputBlocks,
  setSelectedOutputBlock,
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
      && !combineTextData(curr?.data).match(INTERNAL_OUTPUT_REGEX)) {
      last.data += combineTextData(curr.data);
    } else if (DATA_TYPE_TEXTLIKE.includes(curr?.type)
      && !combineTextData(curr?.data).match(INTERNAL_OUTPUT_REGEX)) {
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

  const progressBar = useMemo(() => {
    return (
      <ProgressBar
        progress={progress}
      />
    )
  }, [
    progress,
  ]);

  const content = useMemo(() => {
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

    const arrContent = combinedMessages?.map(({
      data: dataInit,
      type: dataType,
    }: KernelOutputType, idx: number) => {
      if (!dataInit || dataInit?.length === 0) {
        return;
      }

      let dataArray: string[] = [];
      if (Array.isArray(dataInit)) {
        dataArray = dataInit;
      } else {
        dataArray = [dataInit];
      }
      dataArray = dataArray.filter(d => d);
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

        if (typeof data === 'string' && data.match(INTERNAL_OUTPUT_REGEX)) {
          const parts = data.split('[__internal_output__]')
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
              displayElement = createDataTableElement(dataDisplay, {
                borderTop,
                selected,
              });
              isTable = true;
            }
          }
        } else if (dataType === DataTypeEnum.TABLE) {
          displayElement = createDataTableElement(
            isJsonString(data) ? JSON.parse(data) : data,
            {
              borderTop,
              selected,
            },
          );
          isTable = true;
        } else if (DATA_TYPE_TEXTLIKE.includes(dataType)) {
          displayElement = (
            <OutputRowStyle {...outputRowSharedProps}>
              <Text monospace preWrap>
                <Ansi>
                  {data}
                </Ansi>
              </Text>
            </OutputRowStyle>
          );
        } else if (dataType === DataTypeEnum.TEXT_HTML) {
          displayElement = (
            <OutputRowStyle {...outputRowSharedProps}>
              <HTMLOutputStyle>
                <Text
                  // @ts-ignore
                  dangerouslySetInnerHTML={{
                    __html: data
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
            </div>
          );
        }
      });

      return arr;
    });

    if (isInProgress && pipeline?.type === PipelineTypeEnum.PYSPARK) {
      arrContent.unshift([
        <OutputRowStyle contained>
          <Spacing mt={1}>
            {progressBar}
          </Spacing>
        </OutputRowStyle>
      ]);
    }

    return arrContent;
  }, [
    combinedMessages,
    contained,
    mainContainerWidth,
    progress,
    progressBar,
    selected,
  ]);

  return (
    <>
      {contained && (
        <ContainerStyle
          blockType={blockType}
          executedAndIdle={executedAndIdle}
          hasError={hasError}
          selected={selected}
        >
          {!collapsed && content}
        </ContainerStyle>
      )}

      {!contained && content}

      {executedAndIdle && !hideExtraInfo && (
        <ExtraInfoStyle
          blockType={blockType}
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
                            {`${dataFrameShape[0]} rows x ${dataFrameShape[1]} columns`}
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
                        openSidekickView(ViewKeyEnum.DATA);
                        setOutputBlocks((prevOutputBlocks: BlockType[]) => {
                          if (!prevOutputBlocks.find(({ uuid }) => uuid === block.uuid)) {
                            setSelectedOutputBlock(block);
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
