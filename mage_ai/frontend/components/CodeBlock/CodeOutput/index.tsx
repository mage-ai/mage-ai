import { useMemo, useState } from 'react';
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
import PipelineType from '@interfaces/PipelineType';
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
  pipeline?: PipelineType;
  runCount?: number;
  runEndTime?: number;
  runStartTime?: number;
  setActiveSidekickView?: (view: ViewKeyEnum) => void;
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
  pipeline,
  runCount,
  runEndTime,
  runStartTime,
  selected,
  setActiveSidekickView,
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

  const internalOutputRegex = /\[__internal_output__\]/;
  const combineTextData = (data) => (Array.isArray(data) ? data.join('\n') : data);

  const combinedMessages = useMemo(() => messages.reduce((arr, curr) => {
    const last = arr.at(-1);

    if (DATA_TYPE_TEXTLIKE.includes(last?.type)
      && last?.type === curr.type
      && !combineTextData(curr?.data).match(internalOutputRegex)) {
      last.data += combineTextData(curr.data);
    } else if (DATA_TYPE_TEXTLIKE.includes(curr?.type)
      && !combineTextData(curr?.data).match(internalOutputRegex)) {
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

  const content = useMemo(() => {
    const createDataTableElement = ({
      columns,
      index,
      rows,
      shape,
    }, {
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
          noBorderTop
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
          last: idx === numberOfMessages - 1 && idxInner === dataArrayLength - 1,
        };

        if (typeof data === 'string' && data.match(internalOutputRegex)) {
          const rawString = data.replace(internalOutputRegex, '');
          if (isJsonString(rawString)) {
            const {
              data: dataDisplay,
              type: typeDisplay,
            } = JSON.parse(rawString);

            if (DataTypeEnum.TABLE === typeDisplay) {
              displayElement = createDataTableElement(dataDisplay, { selected });
              isTable = true;
            }
          }
        } else if (dataType === DataTypeEnum.TABLE) {
          displayElement = createDataTableElement(
            isJsonString(data) ? JSON.parse(data) : data,
            { selected },
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
        }

        arr.push(
          <div key={`code-output-${idx}-${idxInner}`}>
            {displayElement}
          </div>
        );
      });

      return arr;
    });

    return arrContent;
  }, [
    combinedMessages,
    contained,
    mainContainerWidth,
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
                    {runCount >= 1 && (
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
                        setActiveSidekickView(ViewKeyEnum.DATA);
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
