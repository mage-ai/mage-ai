import { memo, useEffect, useRef } from 'react';

import Button, { ButtonProps } from '@oracle/elements/Button';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';

type ServerTimeButtonProps = {
  mountedCallback: any;
  time: string;
  timeZone: string;
} & ButtonProps;

function ServerTimeButton({
  mountedCallback,
  time,
  timeZone,
  ...props
}: ServerTimeButtonProps) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (buttonRef?.current) {
      mountedCallback(buttonRef.current.offsetHeight);
    }
  }, [mountedCallback]);

  return (
    <Button 
      {...props}
      backgroundColor={dark.background.dashboard}
      borderLess
      compact
      ref={buttonRef}
    >
      <Text inline monospace>
        {`${time} ${timeZone}`}
      </Text>
    </Button>
  );
}

export default memo(ServerTimeButton);
