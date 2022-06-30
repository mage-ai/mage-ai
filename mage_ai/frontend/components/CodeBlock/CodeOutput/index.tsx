import Ansi from 'ansi-to-react';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType, { DataTypeEnum } from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import {
  ContainerStyle,
  ExtraInfoStyle,
} from './index.style';

type CodeOutputProps = {
  isInProgress: boolean;
  messages: KernelOutputType[];
  runCount: Number;
  runEndTime: Number;
  runStartTime: Number;
};

function CodeOutput({
  isInProgress,
  messages,
  runCount,
  runEndTime,
  runStartTime,
}: CodeOutputProps) {
  const primaryDataType = messages[0].type;

  if (DataTypeEnum.TABLE === primaryDataType) {

  }

  return (
    <>
      <ContainerStyle>
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

      {!isInProgress && runCount >= 1 && runEndTime >= runStartTime && (
        <ExtraInfoStyle>
          <FlexContainer fullWidth justifyContent="flex-end">
            <Text small>
              {(Number(runEndTime) - Number(runStartTime)) / 1000}s
            </Text>
          </FlexContainer>
        </ExtraInfoStyle>
      )}
    </>
  );
}

export default CodeOutput;
