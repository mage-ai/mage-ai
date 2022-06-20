import React from 'react';
import styled from 'styled-components';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import { ArrowDown, ArrowUp } from '@oracle/icons';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

export type DifferenceButtonProps = {
  danger?: boolean;
  decrease?: boolean;
  increase?: boolean;
  percentage?: number;
  success?: boolean;
};

const DifferenceButtonStyle = styled.p<DifferenceButtonProps>`
  border-radius: ${BORDER_RADIUS_SMALL}px;
  display: inline;
  font-family: ${MONO_FONT_FAMILY_REGULAR};
  font-size: ${REGULAR};
  margin: 0;
`;

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
    <DifferenceButtonStyle>
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
            {percentage}%
          </Text>
          {icon && React.cloneElement(icon, {
            danger,
            size: ICON_SIZE,
            success,
          })}
        </FlexContainer>
      </Button>
    </DifferenceButtonStyle>
  );
};

export default DifferenceButton;
