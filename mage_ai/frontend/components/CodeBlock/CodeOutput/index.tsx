import Ansi from 'ansi-to-react';

import Circle from '@oracle/elements/Circle';
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
} from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';

type CodeOutputProps = {
  isInProgress: boolean;
  messages: KernelOutputType[];
  runCount: Number;
  runEndTime: Number;
  runStartTime: Number;
} & BorderColorShareProps;

function CodeOutput({
  blockType,
  hasError,
  isInProgress,
  messages,
  runCount,
  runEndTime,
  runStartTime,
  selected,
}: CodeOutputProps) {
  const primaryDataType = messages[0].type;
  const executedAndIdle = !isInProgress && runCount >= 1 && runEndTime >= runStartTime;

  if (DataTypeEnum.TABLE === primaryDataType) {

  }

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

          return dataArray.map((data: string) => (
            <div key={data}>
              {(dataType === DataTypeEnum.TEXT || dataType === DataTypeEnum.TEXT_PLAIN) && (
                <Text monospace>
                  <Ansi>
                    {data}
                  </Ansi>
                </Text>
              )}
              {dataType === DataTypeEnum.IMAGE_PNG && (
                <img
                  alt={`Image {idx} from code output`}
                  src={`data:image/png;base64, ${data}`}
                />
              )}
            </div>
          ));
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
