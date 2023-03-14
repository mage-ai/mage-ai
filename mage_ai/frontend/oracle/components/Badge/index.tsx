import React from 'react';
import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { UNIT } from '@oracle/styles/units/spacing';
import { REGULAR, SMALL } from '@oracle/styles/fonts/sizes';

export type BadgeProps = {
  children?: any;
  cyan?: boolean;
  disabled?: boolean;
  noVerticalPadding?: boolean;
  quantifier?: boolean;
  regular?: boolean;
  small?: boolean;
};

const BadgeStyle = styled.p<BadgeProps>`
  border-radius: ${BORDER_RADIUS_SMALL}px;
  display: inline;
  font-family: ${FONT_FAMILY_REGULAR};
  margin: 0;
  ${REGULAR};

  ${props => props.small && `
    ${SMALL};
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

  ${props => !props.disabled && `
    background-color: ${(props.theme || dark).background.row};
    color: ${(props.theme || dark).content.muted};
  `}

  ${props => props.cyan && `
    background-color: ${(props.theme || dark).accent.cyan};
    color: ${(props.theme || dark).monotone.black};
  `}

  ${props => props.disabled && `
    background-color: ${(props.theme || dark).feature.disabled};
    color: ${(props.theme || dark).content.disabled};
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
