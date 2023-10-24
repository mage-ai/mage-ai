import { memo, useEffect, useRef } from 'react';

import Text from '@oracle/elements/Text';
import { ButtonProps } from '@oracle/elements/Button';
import { ButtonStyle } from './index.style';

type ServerTimeButtonProps = {
  active: boolean;
  mountedCallback: any;
  time: string;
  timeZone: string;
} & ButtonProps;

function ServerTimeButton({
  active,
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
    <ButtonStyle 
      {...props}
      active={active}
      borderLess
      compact
      highlightOnHoverAlt
      ref={buttonRef}
      transparent
    >
      <Text inline monospace>
        {`${time} ${timeZone}`}
      </Text>
    </ButtonStyle>
  );
}

export default memo(ServerTimeButton);
