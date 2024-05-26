import { useEffect, useRef, useState } from 'react';
import TextOutput, { TextOutputProps } from './TextOutput';
import Loading, { LoadingStyleEnum } from '@oracle/components/Loading';
import Spacing from '@oracle/elements/Spacing';

type ProgressOutputProps = {
  color?: {
    accent: string;
    accentLight: string;
  };
  progress: number;
} & TextOutputProps;

function ProgressOutput({ color, progress, value, ...outputRowSharedProps }: ProgressOutputProps) {
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
