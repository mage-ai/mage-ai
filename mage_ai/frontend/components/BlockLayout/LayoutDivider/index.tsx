import { useState } from 'react';

import { Add } from '@oracle/icons';
import {
  BarStyle,
  ButtonStyle,
  DividerStyle,
} from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';

type LayoutDividerProps = {
  horizontal?: boolean;
  onClickAdd?: () => void;
};

function LayoutDivider({
  horizontal,
  onClickAdd,
}: LayoutDividerProps) {
  const [isHovering, setIsHovering] = useState<boolean>(false);

  return (
    <DividerStyle
      horizontal={horizontal}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {isHovering && (
        <>
          <ButtonStyle
            horizontal={horizontal}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onClickAdd?.();
            }}
          >
            <Add size={2 * UNIT} />
          </ButtonStyle>

          <BarStyle horizontal={horizontal} />
        </>
      )}
    </DividerStyle>
  );
}

export default LayoutDivider;
