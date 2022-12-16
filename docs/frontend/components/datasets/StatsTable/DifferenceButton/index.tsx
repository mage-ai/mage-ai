import React from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import { ArrowDown, ArrowUp } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { getPercentage } from '@utils/number';

export type DifferenceButtonProps = {
  danger?: boolean;
  decrease?: boolean;
  increase?: boolean;
  percentage?: number;
  success?: boolean;
};

const ICON_SIZE = UNIT * 2;

const DifferenceButton = ({
  danger,
  decrease,
  increase,
  percentage,
  success,
}: DifferenceButtonProps) => {
  const icon = decrease
    ? <ArrowDown />
    : (increase && <ArrowUp />);

  return (
    <Button
      danger={danger}
      notClickable
      padding="2px 6px"
      success={success}
    >
      <FlexContainer alignItems="center">
        <Text
          danger={danger}
          success={success}
        >
          {getPercentage(percentage)}
        </Text>
        {icon && React.cloneElement(icon, {
          danger,
          size: ICON_SIZE,
          success,
        })}
      </FlexContainer>
    </Button>
  );
};

export default DifferenceButton;
