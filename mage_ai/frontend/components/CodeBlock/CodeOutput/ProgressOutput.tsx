import { useEffect, useRef, useState } from 'react';
import Ansi from 'ansi-to-react';

import Text from '@oracle/elements/Text';
import TextOutput, { TextOutputProps } from './TextOutput';
import Loading, { LoadingStyleEnum } from '@oracle/components/Loading';
import Spacing from '@oracle/elements/Spacing';
import { DataTypeEnum, MsgTypeEnum } from '@interfaces/KernelOutputType';

type ProgressOutputProps = {
  color?: {
    accent?: string;
    accentLight?: string;
  };
  data?: any;
  msgType: MsgTypeEnum;
  dataType: DataTypeEnum;
  progress: number;
} & TextOutputProps;

function ProgressOutput({
  color,
  data,
  dataType,
  msgType,
  progress,
  value,
  ...outputRowSharedProps
}: ProgressOutputProps) {
  const timeout = useRef(null);

  const [hidden, setHidden] = useState(false);
  const [progressValue, setProgressValue] = useState(progress);

  useEffect(() => {
    if (progressValue) {
      setProgressValue(progressValue);

      if (progressValue >= 1) {
        timeout.current = setTimeout(() => setHidden(true), 3000);
      } else {
        clearTimeout(timeout.current);
      }
    }
  }, [progressValue]);

  if (msgType === MsgTypeEnum.COMM_MSG) {
    return <div />;
  }

  if (DataTypeEnum.PROGRESS === dataType) {
    if (Array.isArray(data)) {
      return (
        <>
          {data.map((line, index1) => (
            <span
              key={`${index1}-progress`}
              style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
            >
              <Ansi>{line}</Ansi>
            </span>
          ))}
        </>
      );
    }
  }

  return (
    <div>
      {value && (
        <Spacing mb={hidden ? 0 : 2}>
          <TextOutput value={value} {...outputRowSharedProps} />
        </Spacing>
      )}

      {!hidden && (
        <Loading
          color={color?.accent}
          colorLight={color?.accentLight}
          loadingStyle={LoadingStyleEnum.DEFAULT}
          width={`${progressValue * 100}%`}
        />
      )}
    </div>
  );
}

export default ProgressOutput;
