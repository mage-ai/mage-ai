import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import {
  BORDER_RADIUS,
  BORDER_STYLE,
  BORDER_WIDTH,
} from '@oracle/styles/units/borders';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

type LinkProps = {
  alternateBackground?: boolean;
  disabled?: boolean;
  highlighted: boolean;
  indent?: boolean;
  largePadding?: boolean;
};

export const FlyoutMenuContainerStyle = styled.div<{
  maxHeight?: number;
  roundedStyle?: boolean;
  width?: number;
}>`
  ${ScrollbarStyledCss}
  position: absolute;
  max-height: ${UNIT * 58}px;
  z-index: 1;

  ${props => props.width && `
    min-width: ${props.width}px;
  `}

  ${({ maxHeight }) => maxHeight && `
    max-height: ${maxHeight}px;
    overflow: auto;
  `}

  ${props => `
    box-shadow: ${(props.theme.shadow || dark.shadow).popup};

    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
    }
  `}

  ${props => props.roundedStyle && `
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).borders.button};
    border-radius: ${BORDER_RADIUS}px;

    div:first-child {
      border-top-left-radius: ${BORDER_RADIUS}px;
      border-top-right-radius: ${BORDER_RADIUS}px;
    }

    div:last-child {
      border-bottom-left-radius: ${BORDER_RADIUS}px;
      border-bottom-right-radius: ${BORDER_RADIUS}px;
    }
  `}
`;

export const TitleContainerStyle = styled.div<{
  roundedStyle?: boolean;
}>`
  padding: ${UNIT}px;
  padding-bottom: 0;

  ${props => `
    background-color: ${(props.theme || dark).background.popup};
  `}

  ${props => props.roundedStyle && `
    background-color: ${(props.theme || dark).interactive.defaultBackground};
    border-bottom: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).borders.medium};
    padding-bottom: ${UNIT}px;
  `}
`;

const SHARED_STYLES = css<LinkProps>`
  justify-content: space-between;
  padding: ${UNIT}px;

  ${props => props.largePadding && `
    padding: ${UNIT * 1.5}px;
    padding-right: ${UNIT * 6}px;
  `}

  ${props => !props.disabled && `
    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
      cursor: pointer;
    }
  `}

  ${props => `
    background-color: ${(props.theme.background || dark.background).popup};
  `}

  ${props => props.alternateBackground && `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBackground};
  `}

  ${props => props.disabled && `
    color: ${(props.theme.content || dark.content).disabled};
    cursor: not-allowed;

    &:hover {
      color: ${(props.theme.content || dark.content).disabled};
    }
  `}

  ${props => props.indent && `
    padding-left: ${UNIT * 2}px;
  `}

  ${props => props.highlighted && `
    background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
  `}
`;

export const LinkStyle = styled.div<LinkProps>`
  ${SHARED_STYLES}
`;

export const LinkAnchorStyle = styled.a<LinkProps>`
  ${SHARED_STYLES}
  display: block;
`;
