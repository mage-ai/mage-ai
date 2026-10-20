import { memo, useEffect, useRef } from 'react';

import Text from '@oracle/elements/Text';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
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
      borderRadius={`${BORDER_RADIUS_SMALL}px`}
      compact
      highlightOnHoverAlt
      ref={buttonRef}
      transparent
    >
      <Text inline monospace noWrapping small>
        {`${time} ${timeZone}`}
      </Text>
    </ButtonStyle>
  );
}

export default memo(ServerTimeButton);
