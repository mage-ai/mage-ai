import React from 'react';
import styled from 'styled-components';

import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { UNIT } from '@oracle/styles/units/spacing';
import { REGULAR, SMALL } from '@oracle/styles/fonts/sizes';

export type BadgeProps = {
  block?: boolean;
  children?: any;
  compact?: boolean;
  disabled?: boolean;
  quantifier?: boolean;
  regular?: boolean;
  small?: boolean;
};

const BadgeStyle = styled.p<BadgeProps>`a
  border-radius: ${BORDER_RADIUS_SMALL}px;
  font-family: ${MONO_FONT_FAMILY_REGULAR};
  font-size: ${REGULAR};
  margin: 0;

  ${props => !props.block && `
    display: inline;
  `}

  ${props => props.regular && `
    ${REGULAR};
  `}

  ${props => props.small && `
    ${SMALL};
  `}

  ${props => !props.compact && !props.regular && `
    padding: 2px 4px;
  `};

  ${props => props.compact && !props.regular && `
    line-height: ${UNIT * 1.5}px;
    padding: ${UNIT * 0.25}px ${UNIT * 0.5}px;
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
