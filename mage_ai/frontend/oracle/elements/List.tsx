import React from 'react';
import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import {
  FONT_FAMILY_REGULAR,
  MONO_FONT_FAMILY_REGULAR as SECONDARY_FONT_FAMILY_REGULAR,
} from '@oracle/styles/fonts/primary';
import {
  LARGE_FONT_SIZE as LARGE,
  REGULAR_FONT_SIZE as REGULAR,
  SMALL_FONT_SIZE as SMALL,
} from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

type ListProps = {
  children: any;
  color?: string;
  inverted?: boolean;
  large?: boolean;
  lineHeight?: number;
  muted?: boolean;
  monospace?: boolean;
  ordered?: boolean;
  small?: boolean;
};

const SHARED_STYLES = css<ListProps>`
  ${props => !props.muted && `
    color: ${(props.theme.content || dark.content).default};
  `}

  ${props => props.muted && `
    color: ${(props.theme.content || dark.content).muted};
  `}

  ${props => props.inverted && `
    color: ${(props.theme.content || dark.content).inverted};
  `}

  ${props => props.color && `
    color: ${props.color};
  `}

  ${props => !props.monospace && `
    font-family: ${FONT_FAMILY_REGULAR};
  `}

  ${props => props.monospace && `
    font-family: ${SECONDARY_FONT_FAMILY_REGULAR};
  `}

  ${props => props.large && `
    ${LARGE}
  `}

  ${props => !props.large && !props.small && `
    ${REGULAR}
  `}

  ${props => props.small && `
    ${SMALL}
  `}

  ${props => props.lineHeight && `
    line-height: ${props.lineHeight}px !important;
  `}
`;

const UnorderedListStyle = styled.ul`
  ${SHARED_STYLES}
`;

const OrderedListStyle = styled.ol`
  ${SHARED_STYLES}
`;

const ListItemStyle = styled.li<ListProps & {
  marginTop: boolean;
}>`
  ${props => props.large && props.marginTop && `
    margin-top: ${UNIT * 1}px;
  `}
`;

function List({
  children,
  large,
  lineHeight,
  ordered,
  ...props
}: ListProps) {
  const ListEl = ordered ? OrderedListStyle : UnorderedListStyle;

  return (
    <ListEl
      large={large}
      lineHeight={lineHeight}
      {...props}
    >
      {React.Children.map(children, (child, idx) => (
        <ListItemStyle
          key={child.props?.key || idx}
          large={large}
          marginTop={idx >= 1}
          {...props}
        >
          {React.cloneElement(child)}
        </ListItemStyle>
      ))}
    </ListEl>
  );
}

export default List;
