import React from 'react';
import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { FONT_FAMILY_REGULAR, MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  REGULAR,
  SMALL,
  XXSMALL_FONT_SIZE,
} from '@oracle/styles/fonts/sizes';

export type BadgeProps = {
  children?: any;
  color?: string;
  cyan?: boolean;
  disabled?: boolean;
  inverted?: boolean;
  monospace?: boolean;
  noVerticalPadding?: boolean;
  quantifier?: boolean;
  regular?: boolean;
  small?: boolean;
  xxsmall?: boolean;
};

const BadgeStyle = styled.p<BadgeProps>`
  border-radius: ${BORDER_RADIUS_SMALL}px;
  display: inline;
  font-family: ${FONT_FAMILY_REGULAR};
  margin: 0;
  white-space: nowrap;
  ${REGULAR};

  ${props => props.small && `
    ${SMALL};
  `}

  ${props => props.xxsmall && `
    font-size: ${XXSMALL_FONT_SIZE}px;
    line-height: ${XXSMALL_FONT_SIZE}px;
  `}

  ${props => !props.regular && `
    padding: 2px 4px;
  `};

  ${props => props.regular && `
    padding: ${UNIT * 1}px ${UNIT * 1.25}px;
  `};

  ${props => props.noVerticalPadding && `
    padding-bottom: 0;
    padding-top: 0;
  `}

  ${props => !props.disabled && !props.inverted && `
    background-color: ${(props.theme || dark).background.row};
    color: ${(props.theme || dark).content.default};
  `}

  ${props => !props.disabled && props.inverted && `
    background-color: ${(props.theme || dark).background.dark};
    color: ${(props.theme || dark).content.inverted};
  `}

  ${props => props.cyan && `
    background-color: ${(props.theme || dark).accent.cyan};
    color: ${(props.theme || dark).monotone.black};
  `}

  ${props => props.disabled && `
    background-color: ${(props.theme || dark).feature.disabled};
    color: ${(props.theme || dark).content.disabled};
  `}

  ${props => props.color && `
    background-color: ${props.color} !important;
    color: ${(props.theme || dark).content.active};
  `}

  ${props => props.quantifier && `
    border-radius: 34px;
    line-height: 10px;
    padding: 4px 6px;
  `}

  ${props => props.monospace && `
    font-family: ${MONO_FONT_FAMILY_REGULAR};
    word-break: break-all;
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
