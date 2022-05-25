import React from 'react';
import styled from 'styled-components';

import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { UNIT } from '@oracle/styles/units/spacing';
import { REGULAR, SMALL } from '@oracle/styles/fonts/sizes';

export type BadgeProps = {
  children?: any;
  disabled?: boolean;
  quantifier?: boolean;
  regular?: boolean;
  small?: boolean;
};

const BadgeStyle = styled.p<BadgeProps>`a
  border-radius: ${BORDER_RADIUS_SMALL}px;
  display: inline;
  font-family: ${MONO_FONT_FAMILY_REGULAR};
  font-size: ${REGULAR};
  margin: 0;

  ${props => props.regular && `
    ${REGULAR};
  `}

  ${props => props.small && `
    ${SMALL};
  `}

  ${props => !props.regular && `
    padding: 2px 4px;
  `};

  ${props => props.regular && `
    padding: ${UNIT * 1}px ${UNIT * 1.25}px;
  `};

  ${props => !props.disabled && `
    background-color: ${props.theme.feature.active};
    color: ${props.theme.monotone.purple};
  `}

  ${props => props.disabled && `
    background-color: ${props.theme.feature.disabled};
    color: ${props.theme.content.disabled};
  `}

  ${props => props.quantifier && `
    border-radius: 34px;
    line-height: 10px;
    padding: 4px 6px;
  `}
`;

const Badge = ({
  children,
  ...props
}: BadgeProps) => (
  <BadgeStyle
    {...props}
  >
    {children}
  </BadgeStyle>
);

export default Badge;
