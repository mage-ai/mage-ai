import { useCallback, useMemo } from 'react';
import Ansi from 'ansi-to-react';

import Circle from '@oracle/elements/Circle';
import DataTable from '@components/DataTable';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType, { DataTypeEnum } from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { BorderColorShareProps } from '../index.style';
import { Check } from '@oracle/icons';
import {
  ContainerStyle,
  ExtraInfoBorderStyle,
  ExtraInfoContentStyle,
  ExtraInfoStyle,
  OutputRowStyle,
} from './index.style';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { isJsonString } from '@utils/string';

type CodeOutputProps = {
  isInProgress: boolean;
  mainContainerWidth: number;
  messages: KernelOutputType[];
  runCount: Number;
  runEndTime: Number;
  runStartTime: Number;
} & BorderColorShareProps;

function CodeOutput({
  blockType,
  hasError,
  isInProgress,
  mainContainerWidth,
  messages,
  runCount,
  runEndTime,
  runStartTime,
  selected,
}: CodeOutputProps) {
  const numberOfMessages = useMemo(() => messages?.length || 0, [messages]);
  const primaryDataType = messages[0].type;
  const executedAndIdle = !isInProgress && runCount >= 1 && runEndTime >= runStartTime;

  if (DataTypeEnum.TABLE === primaryDataType) {

  }

  const createDataTableElement = useCallback(({
    columns,
    rows,
  }) => rows.length >= 1 && (
    <DataTable
      columns={columns}
      disableScrolling={!selected}
      height={UNIT * 40}
      noBorderBottom
      noBorderLeft
      noBorderRight
      noBorderTop
      rows={rows}
      // Remove border 2px and padding from each side
      width={mainContainerWidth - (2 + (PADDING_UNITS * UNIT * 2) + 2 + SCROLLBAR_WIDTH)}
    />
  ), [
    selected,
    mainContainerWidth,
  ]);

  return (
    <>
      <ContainerStyle
        blockType={blockType}
        executedAndIdle={executedAndIdle}
        hasError={hasError}
        selected={selected}
      >
        {messages?.map(({
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

          return dataArray.map((data: string, idxInner: number) => {
            let displayElement;
            const internalOutputRegex = /^\[__internal_output__\]/;
            const outputRowSharedProps = {
              first: idx === 0 && idxInner === 0,
              last: idx === numberOfMessages - 1 && idxInner === dataArrayLength - 1,
            };

            if (typeof data === 'string' && data.match(internalOutputRegex)) {
              const rawString = data.replace(internalOutputRegex, '');
              if (isJsonString) {
                const {
                  data: dataDisplay,
                  type: typeDisplay,
                } = JSON.parse(rawString);

                if (DataTypeEnum.TABLE === typeDisplay) {
                  displayElement = createDataTableElement(dataDisplay)
                }
              }
            } else if (dataType === DataTypeEnum.TABLE) {
              displayElement = createDataTableElement(isJsonString(data) ? JSON.parse(data) : data);
            } else if (dataType === DataTypeEnum.TEXT || dataType === DataTypeEnum.TEXT_PLAIN) {
              displayElement = (
                <OutputRowStyle {...outputRowSharedProps}>
                  <Text monospace preWrap>
                    <Ansi>
                      {data}
                    </Ansi>
                  </Text>
                </OutputRowStyle>
              );
            } else if (dataType === DataTypeEnum.IMAGE_PNG) {
              displayElement = (
                <div style={{ backgroundColor: 'white' }}>
                  <img
                    alt={`Image {idx} from code output`}
                    src={`data:image/png;base64, ${data}`}
                  />
                </div>
              );
            }

            return (
              <div key={data}>
                {displayElement}
              </div>
            );
          });
        })}
      </ContainerStyle>

      {executedAndIdle && (
        <ExtraInfoStyle
          blockType={blockType}
          hasError={hasError}
          selected={selected}
        >
          <ExtraInfoBorderStyle />

          <ExtraInfoContentStyle>
            <FlexContainer
              alignItems="center"
              fullWidth
              justifyContent="flex-end"
            >
              <Text small>
                {(Number(runEndTime) - Number(runStartTime)) / 1000}s
              </Text>

              <Spacing mr={1} />

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
          </ExtraInfoContentStyle>
        </ExtraInfoStyle>
      )}
    </>
  );
}

export default CodeOutput;
