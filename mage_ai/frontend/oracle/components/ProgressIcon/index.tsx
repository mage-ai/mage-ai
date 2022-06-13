import React from 'react';
import styled from 'styled-components';


import Button from '@oracle/elements/Button';
import light from '@oracle/styles/themes/light';
import Text from '@oracle/elements/Text';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR } from '@oracle/styles/fonts/sizes';
import { ArrowDown, ArrowUp } from '@oracle/icons';

export type ProgressIconProps = {
  children?: any;
  percentage?: number;
  danger?: boolean;
  small?: boolean;
};

const ProgressIconStyle = styled.p<ProgressIconProps>`a
  border-radius: ${BORDER_RADIUS_SMALL}px;
  display: inline;
  font-family: ${MONO_FONT_FAMILY_REGULAR};
  font-size: ${REGULAR};
  margin: 0;

  ${props => props.danger &&`
    color: ${light.percentage.negative}
  `}

  ${props => !props.danger &&`
    color: ${light.percentage.positive}
  `}
`;

const ProgressIcon = ({
  children,
  ...props
}: ProgressIconProps) => (
  <ProgressIconStyle
    {...props}
  >
    { props.danger
      ?
        <Button
          afterIcon={<ArrowDown fill={light.percentage.negative} />}
          negative
        >
          <Text danger>
            {props.percentage}%
          </Text>
        </Button>
      :
        <Button
          afterIcon={<ArrowUp fill={light.percentage.positive} />}
          positive
        >
          <Text positive>
            {props.percentage}%
          </Text>
        </Button>
    }
    {children}
  </ProgressIconStyle>
);

export default ProgressIcon;
