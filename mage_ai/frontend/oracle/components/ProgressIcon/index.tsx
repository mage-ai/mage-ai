import React from 'react';
import styled from 'styled-components';

import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { UNIT } from '@oracle/styles/units/spacing';
import { REGULAR, SMALL } from '@oracle/styles/fonts/sizes';
import light from '@oracle/styles/themes/light';
import { ArrowDown, ArrowUp } from '@oracle/icons';
import Button from '@oracle/elements/Button';

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

  ${props => !props.danger && `
    background-color: ${(props.theme.percentage || light.percentage).positive};
    color: ${props.theme.monotone.purple};
  `}

  // Otherwise Danger red
  ${props => props.danger && `
    background-color: ${(props.theme.percentage || light.percentage).negative};
    color: ${props.theme.content.disabled};
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
        <Button afterIcon={<ArrowDown />}> {props.percentage} </Button>
      :
        <Button afterIcon={<ArrowUp />}> {props.percentage} </Button>
    }
    {children}
  </ProgressIconStyle>
);

export default ProgressIcon;
